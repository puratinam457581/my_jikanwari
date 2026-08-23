import {
  DAYS,
  MORNING_NOTIFY_TIME,
  NOTIFY_OPTIONS,
  attendanceApi,
  courseApi,
  notifyApi,
  scheduleApi,
  semesterApi,
  settingsApi,
  timetableApi,
} from '../db/index.js'
import { parseDateString, timeToMinutes, toDateString } from '../utils/date.js'

/**
 * 「今、出すべき通知」を組み立てる部分(spec 5章)。
 *
 * ここは画面にもブラウザのAPIにも依存しない純粋なデータ処理にしてある。
 * そうしておくと、時刻を渡すだけで「その時刻ならどんな通知が出るか」を
 * テストできるため。実際に通知を鳴らすのは deliver.js の役割。
 *
 * 通知1件は次の形:
 *   { key, kind, title, body, at }
 *   key … 同じ通知を二度出さないための目印(例 'morning:2026-08-24')
 */

const DAY_LABEL = (day) => DAYS[day]?.label ?? ''

/** 現在時刻が「その日の指定時刻」を過ぎているか */
function isAfterTimeOfDay(now, time) {
  return now.getHours() * 60 + now.getMinutes() >= timeToMinutes(time)
}

/** 学期の期間内の日付か。期間が未設定なら常に true */
function isWithinSemester(semester, dateString) {
  if (!semester) return false
  if (semester.startDate && dateString < semester.startDate) return false
  if (semester.endDate && dateString > semester.endDate) return false
  return true
}

/** 8/26(水) 13:00 のような表記 */
function formatDueAt(date) {
  const md = `${date.getMonth() + 1}/${date.getDate()}`
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  return `${md}(${DAY_LABEL(date.getDay())}) ${time}`
}

// ---------------- 朝の時間割通知 ----------------

/**
 * 毎朝 MORNING_NOTIFY_TIME に、その日の講義一覧を知らせる。
 *
 * 【仕様に無い判断】次の2つの場合は通知しない。理由も添えて残す。
 *   - その日に講義が1つも無いとき … 毎朝「授業はありません」と鳴るのは煩わしいため
 *   - 今日が現在の学期の期間外のとき … 長期休暇中に鳴らさないため
 * どちらも不要であれば外せる。
 */
async function buildMorningNotices(now) {
  if (!isAfterTimeOfDay(now, MORNING_NOTIFY_TIME)) return []

  const today = toDateString(now)
  const semester = await semesterApi.getActiveSemester()
  if (!isWithinSemester(semester, today)) return []

  const slots = await timetableApi.listSlots(semester.id)
  const todaySlots = slots
    .filter((slot) => slot.day === now.getDay())
    .sort((a, b) => a.period - b.period)
  if (todaySlots.length === 0) return []

  const periods = await settingsApi.getAllPeriodSettings()
  const startTimeOf = new Map(periods.map((p) => [p.period, p.startTime]))

  const lines = []
  for (const slot of todaySlots) {
    const course = await courseApi.getCourse(slot.courseId)
    if (!course) continue
    const start = startTimeOf.get(slot.period)
    const room = course.room ? ` @${course.room}` : ''
    lines.push(`${slot.period}限 ${start ? `${start} ` : ''}${course.name}${room}`)
  }
  if (lines.length === 0) return []

  return [
    {
      key: `morning:${today}`,
      kind: 'morning',
      title: `本日の時間割(${now.getMonth() + 1}/${now.getDate()} ${DAY_LABEL(now.getDay())})`,
      body: lines.join('\n'),
      at: now.toISOString(),
    },
  ]
}

// ---------------- 課題の締切通知 ----------------

/**
 * 締切の「1日前 / 3日前」に知らせる(spec 4.10 / 5章)。
 * 通知する時刻は、締切の時刻から日数を引いた時刻にしている
 * (例: 8/26 13:00 締切の1日前通知 → 8/25 13:00)。
 *
 * 【仕様に無い判断】締切を過ぎたものは通知しない。過ぎてから知らせても
 * 手遅れで、アプリを久しぶりに開いたときに古い通知が大量に出てしまうため。
 */
async function buildDeadlineNotices(now) {
  const schedules = await scheduleApi.listSchedules({ includeDone: false })
  const notices = []

  for (const schedule of schedules) {
    if (!schedule.notifyTimings || schedule.notifyTimings.length === 0) continue
    const due = parseDateString(schedule.dueAt)
    if (!due) continue
    if (now >= due) continue

    for (const timing of schedule.notifyTimings) {
      const option = NOTIFY_OPTIONS.find((o) => o.value === timing)
      if (!option) continue
      const notifyAt = new Date(due.getTime() - option.days * 24 * 60 * 60 * 1000)
      if (now < notifyAt) continue

      const course = schedule.courseId ? await courseApi.getCourse(schedule.courseId) : null
      notices.push({
        key: `deadline:${schedule.id}:${timing}`,
        kind: 'deadline',
        title: `【${schedule.category}】${schedule.title || '(無題)'}`,
        body: `締切 ${formatDueAt(due)}(${timing})${course ? `\n${course.name}` : ''}`,
        at: now.toISOString(),
      })
    }
  }

  return notices
}

// ---------------- 欠席の上限警告 ----------------

/**
 * 欠席数が上限に達した講義を知らせる(spec 4.5 / 5章)。
 * キーに欠席数を含めているので、さらに休んで数が増えたときは改めて通知される。
 */
async function buildAbsenceNotices(now) {
  const semester = await semesterApi.getActiveSemester()
  if (!semester) return []

  const courses = await courseApi.listCourses(semester.id)
  const targets = courses.filter((c) => c.attendanceEnabled && c.absenceLimit > 0)
  if (targets.length === 0) return []

  const counts = await attendanceApi.countAbsencesByCourse(targets.map((c) => c.id))

  return targets
    .map((course) => {
      const absent = counts.get(course.id) ?? 0
      if (!attendanceApi.isAbsenceLimitReached(course, absent)) return null
      return {
        key: `absence:${course.id}:${absent}`,
        kind: 'absence',
        title: '欠席の上限に達しました',
        body: `${course.name}\n欠席 ${absent} / ${course.absenceLimit} 回`,
        at: now.toISOString(),
      }
    })
    .filter(Boolean)
}

// ---------------- まとめ ----------------

/**
 * 今出すべき通知のうち、まだ出していないものだけを返す。
 * OFFにしている種類は最初から作らない。
 */
export async function collectDueNotices(now = new Date()) {
  const [settings, state] = await Promise.all([
    notifyApi.getNotificationSettings(),
    notifyApi.getNoticeState(),
  ])

  const groups = await Promise.all([
    settings.morning ? buildMorningNotices(now) : [],
    settings.deadline ? buildDeadlineNotices(now) : [],
    settings.absence ? buildAbsenceNotices(now) : [],
  ])

  const sent = new Set(state.sentKeys)
  // 同じキーが1回の実行で重複しないようにもしておく
  const seen = new Set()
  return groups.flat().filter((notice) => {
    if (sent.has(notice.key) || seen.has(notice.key)) return false
    seen.add(notice.key)
    return true
  })
}
