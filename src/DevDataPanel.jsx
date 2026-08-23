import { useCallback, useEffect, useState } from 'react'
import {
  ATTENDANCE_TYPES,
  PRESET_COLORS,
  attendanceApi,
  courseApi,
  exportAll,
  resetDatabase,
  scheduleApi,
  semesterApi,
  settingsApi,
  timetableApi,
} from './db/index.js'
import { toDateString, toDateTimeString } from './utils/date.js'

/**
 * 【フェーズ1限定の動作確認用画面】
 * データ層(IndexedDB)が正しく動くかを目で確かめるための仮UI。
 * 本来の画面を作るフェーズ2以降で削除する。
 */

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

const SAMPLE_NAMES = ['基礎生物学', '英語I', '情報科学', '化学実験', '統計学', '体育']

export default function DevDataPanel() {
  const [semester, setSemester] = useState(null)
  const [courses, setCourses] = useState([])
  const [slots, setSlots] = useState([])
  const [schedules, setSchedules] = useState([])
  const [periods, setPeriods] = useState([])
  const [display, setDisplay] = useState(null)
  const [counts, setCounts] = useState({})
  const [dump, setDump] = useState(null)
  const [error, setError] = useState(null)

  /** 画面に出している内容をすべてDBから読み直す */
  const reload = useCallback(async () => {
    try {
      const active = await semesterApi.getActiveSemester()
      setSemester(active)
      if (!active) return

      const [courseList, slotList, scheduleList, periodList, displaySettings] =
        await Promise.all([
          courseApi.listCourses(active.id),
          timetableApi.listSlots(active.id),
          scheduleApi.listSchedules(),
          settingsApi.getPeriodSettings(),
          settingsApi.getDisplaySettings(),
        ])

      setCourses(courseList)
      setSlots(slotList)
      setSchedules(scheduleList)
      setPeriods(periodList)
      setDisplay(displaySettings)

      const countEntries = await Promise.all(
        courseList.map(async (c) => [c.id, await attendanceApi.countAttendance(c.id)]),
      )
      setCounts(Object.fromEntries(countEntries))
      setError(null)
    } catch (e) {
      console.error(e)
      setError(String(e))
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  /** 操作を実行してから画面を読み直すための共通ラッパー */
  const run = async (fn) => {
    try {
      await fn()
      await reload()
    } catch (e) {
      console.error(e)
      setError(String(e))
    }
  }

  const addSampleCourse = () =>
    run(async () => {
      const index = courses.length
      const suffix = index >= SAMPLE_NAMES.length ? ` ${index}` : ''
      await courseApi.createCourse({
        semesterId: semester.id,
        name: SAMPLE_NAMES[index % SAMPLE_NAMES.length] + suffix,
        teacher: '山田 太郎',
        room: `A${101 + index}`,
        credits: 2,
        color: PRESET_COLORS[index % PRESET_COLORS.length],
        absenceLimit: 5,
      })
    })

  const placeOnTimetable = (course) =>
    run(async () => {
      // 空いているコマ(1限の月曜から順)を探して配置する
      for (let period = 1; period <= periods.length; period += 1) {
        for (let day = 1; day <= 6; day += 1) {
          const taken = slots.some((s) => s.day === day && s.period === period)
          if (!taken) {
            await timetableApi.assignCourse(semester.id, day, period, course.id)
            return
          }
        }
      }
      setError('空きコマがありません')
    })

  const addAttendance = (course, type) =>
    run(async () => {
      // 同じ日付だと上書きになるので、記録数に応じて日付を1日ずつ過去にずらす
      const base = new Date()
      base.setDate(base.getDate() - (counts[course.id]?.total ?? 0))
      await attendanceApi.addRecord(
        { courseId: course.id, date: toDateString(base), type },
        { overwrite: true },
      )
    })

  const addSchedule = () =>
    run(async () => {
      const due = new Date()
      due.setDate(due.getDate() + 3)
      await scheduleApi.createSchedule({
        courseId: courses[0]?.id ?? null,
        title: `レポート提出 ${schedules.length + 1}`,
        dueAt: toDateTimeString(due),
        category: '課題',
        notifyTiming: '1日前',
      })
    })

  const showDump = () => run(async () => setDump(await exportAll()))

  const doReset = () =>
    run(async () => {
      if (!window.confirm('DBを削除して初期状態に戻します。よろしいですか?')) return
      await resetDatabase()
      setDump(null)
      window.location.reload()
    })

  const visibleDayLabels = (display?.visibleDays ?? [])
    .map((visible, index) => (visible ? DAY_LABELS[index] : null))
    .filter(Boolean)
    .join(' ')

  return (
    <div className="mx-auto max-w-md p-4 pb-24 text-sm">
      <header className="mb-4">
        <h1 className="text-lg font-bold">データ層 動作確認</h1>
        <p className="text-xs text-neutral-500">
          フェーズ1の確認用。フェーズ2で本来の画面に置き換えます
        </p>
      </header>

      {error && (
        <p className="mb-3 rounded-lg bg-red-100 p-2 text-xs text-red-700">{error}</p>
      )}

      <Card title="学期 (semesters)">
        {semester ? (
          <p>
            <strong>
              {semester.year}年度 {semester.name}
            </strong>
            <span className="ml-2 text-xs text-neutral-500">
              {semester.startDate} 〜 {semester.endDate}
            </span>
          </p>
        ) : (
          <p className="text-neutral-500">未作成</p>
        )}
      </Card>

      <Card title="設定 (periodSettings / displaySettings)">
        <p>時限数: {periods.length}</p>
        <ul className="mt-1 text-xs text-neutral-600">
          {periods.map((p) => (
            <li key={p.period}>
              {p.period}限 {p.startTime} - {p.endTime}
            </li>
          ))}
        </ul>
        <p className="mt-2">表示曜日: {visibleDayLabels}</p>
        <div className="mt-2 flex gap-2">
          <Button onClick={() => run(() => settingsApi.setPeriodCount(periods.length + 1))}>
            時限を増やす
          </Button>
          <Button
            onClick={() =>
              run(() => settingsApi.setPeriodCount(Math.max(1, periods.length - 1)))
            }
          >
            時限を減らす
          </Button>
        </div>
      </Card>

      <Card title={`講義 (courses) — ${courses.length}件`}>
        <Button onClick={addSampleCourse}>サンプル講義を追加</Button>
        <ul className="mt-2 space-y-2">
          {courses.map((course) => {
            const count = counts[course.id]
            const limitReached = attendanceApi.isAbsenceLimitReached(
              course,
              count?.absent ?? 0,
            )
            return (
              <li key={course.id} className="rounded-lg border border-neutral-200 p-2">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-4 w-4 shrink-0 rounded"
                    style={{ backgroundColor: course.color }}
                  />
                  <span className="font-medium">{course.name}</span>
                  <span className="text-xs text-neutral-500">{course.room}</span>
                </div>
                <p className="mt-1 text-xs text-neutral-600">
                  出席 {count?.present ?? 0} / 欠席 {count?.absent ?? 0}(上限{' '}
                  {course.absenceLimit})
                  {limitReached && (
                    <span className="ml-1 font-bold text-red-600">上限到達</span>
                  )}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Button onClick={() => placeOnTimetable(course)}>コマに配置</Button>
                  <Button onClick={() => addAttendance(course, ATTENDANCE_TYPES.PRESENT)}>
                    出席+1
                  </Button>
                  <Button onClick={() => addAttendance(course, ATTENDANCE_TYPES.ABSENT)}>
                    欠席+1
                  </Button>
                  <Button
                    onClick={() =>
                      run(() =>
                        courseApi.updateCourse(course.id, {
                          creditEarned: !course.creditEarned,
                        }),
                      )
                    }
                  >
                    単位{course.creditEarned ? '済' : '未'}
                  </Button>
                  <Button danger onClick={() => run(() => courseApi.deleteCourse(course.id))}>
                    削除
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      </Card>

      <Card title={`時間割配置 (timetableSlots) — ${slots.length}件`}>
        {slots.length === 0 && <p className="text-neutral-500">未配置</p>}
        <ul className="text-xs">
          {slots.map((slot) => {
            const course = courses.find((c) => c.id === slot.courseId)
            return (
              <li key={slot.id} className="flex items-center justify-between py-0.5">
                <span>
                  {DAY_LABELS[slot.day]}曜 {slot.period}限 : {course?.name ?? '(不明)'}
                </span>
                <Button
                  onClick={() =>
                    run(() => timetableApi.clearSlot(semester.id, slot.day, slot.period))
                  }
                >
                  外す
                </Button>
              </li>
            )
          })}
        </ul>
      </Card>

      <Card title={`スケジュール (schedules) — ${schedules.length}件`}>
        <Button onClick={addSchedule}>サンプル課題を追加</Button>
        <ul className="mt-2 text-xs">
          {schedules.map((s) => (
            <li key={s.id} className="flex items-center justify-between py-0.5">
              <span className={s.done ? 'text-neutral-400 line-through' : ''}>
                [{s.category}] {s.title} — {s.dueAt}
              </span>
              <span className="flex gap-1">
                <Button onClick={() => run(() => scheduleApi.toggleScheduleDone(s.id))}>
                  {s.done ? '戻す' : '完了'}
                </Button>
                <Button danger onClick={() => run(() => scheduleApi.deleteSchedule(s.id))}>
                  削除
                </Button>
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="全データ (JSONエクスポート相当)">
        <div className="flex gap-2">
          <Button onClick={showDump}>中身を表示</Button>
          <Button danger onClick={doReset}>
            DBを初期化
          </Button>
        </div>
        {dump && (
          <pre className="mt-2 max-h-64 overflow-auto rounded bg-neutral-900 p-2 text-[10px] leading-tight text-neutral-100">
            {JSON.stringify(dump, null, 2)}
          </pre>
        )}
      </Card>
    </div>
  )
}

function Card({ title, children }) {
  return (
    <section className="mb-3 rounded-xl bg-white p-3 shadow-sm">
      <h2 className="mb-2 text-xs font-bold text-neutral-500">{title}</h2>
      {children}
    </section>
  )
}

function Button({ children, onClick, danger = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium ${
        danger ? 'bg-red-100 text-red-700' : 'bg-neutral-200 text-neutral-700'
      }`}
    >
      {children}
    </button>
  )
}
