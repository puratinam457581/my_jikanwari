import { useCallback, useEffect, useState } from 'react'
import ScreenLayout, {
  Button,
  EmptyState,
  FloatingActionButton,
} from '../components/ScreenLayout.jsx'
import { CheckIcon, TagIcon } from '../components/icons.jsx'
import { useNavigation } from '../navigation/NavigationContext.jsx'
import { courseApi, scheduleApi, semesterApi } from '../db/index.js'
import { parseDateString, toDateString } from '../utils/date.js'

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

/**
 * スケジュール(課題管理)画面(spec 4.10)。
 * 締切の早い順に、月ごとの見出しを付けて並べる。
 */
export default function ScheduleScreen() {
  const { push } = useNavigation()
  const [loading, setLoading] = useState(true)
  const [showDone, setShowDone] = useState(false)
  const [schedules, setSchedules] = useState([])
  const [courseById, setCourseById] = useState(new Map())
  const [doneCount, setDoneCount] = useState(0)

  const load = useCallback(async () => {
    const all = await scheduleApi.listSchedules()
    setSchedules(all)
    setDoneCount(all.filter((s) => s.done).length)

    // 予定に紐づく講義名を出すため、現在の学期の講義を引いておく
    const semester = await semesterApi.getActiveSemester()
    const courses = semester ? await courseApi.listCourses(semester.id) : []
    setCourseById(new Map(courses.map((c) => [c.id, c])))
    setLoading(false)
  }, [])

  useEffect(() => {
    load().catch((e) => {
      console.error(e)
      setLoading(false)
    })
  }, [load])

  const toggleDone = async (schedule) => {
    await scheduleApi.toggleScheduleDone(schedule.id)
    load().catch((e) => console.error(e))
  }

  const visible = showDone ? schedules : schedules.filter((s) => !s.done)
  const groups = groupByMonth(visible)
  const todayString = toDateString()

  return (
    <ScreenLayout
      title="スケジュール"
      rightAction={
        <Button onClick={() => setShowDone((v) => !v)}>
          {showDone ? 'すべて' : '未完了'}
        </Button>
      }
    >
      <div className="p-3">
        {loading && <EmptyState>読み込み中...</EmptyState>}

        {!loading && visible.length === 0 && (
          <div className="py-10 text-center">
            <p className="text-sm text-hud-dim">
              {showDone ? '予定がありません' : '未完了の予定はありません'}
            </p>
            <p className="mt-2 text-[11px] text-hud-faint">
              {!showDone && doneCount > 0
                ? `完了済みが${doneCount}件あります(右上のボタンで表示)`
                : '右下の「＋」から追加してください'}
            </p>
          </div>
        )}

        {groups.map(({ label, entries }) => (
          <div key={label} className="mb-4">
            <h2 className="font-hud mb-2 flex items-center gap-2 px-1 text-xs font-semibold tracking-widest text-cyan">
              {label}
              <span className="h-px flex-1 bg-line-glow" />
            </h2>

            <ul className="space-y-2">
              {entries.map((item) => {
                const course = item.courseId ? courseById.get(item.courseId) : null
                const due = parseDateString(item.dueAt)
                // 締切を過ぎた未完了の予定は赤で示す
                const overdue = !item.done && item.dueAt.slice(0, 10) < todayString

                return (
                  <li
                    key={item.id}
                    className="flex items-center gap-2 rounded-panel border border-line bg-panel/80 p-2.5"
                  >
                    {/* 日付バッジ(spec 4.10: 日付 + 曜日) */}
                    <span
                      className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-sharp border leading-none ${
                        overdue
                          ? 'border-alert/50 bg-alert/10'
                          : 'border-cyan/40 bg-cyan/5'
                      }`}
                    >
                      <span
                        className={`font-digit text-sm font-bold ${
                          overdue ? 'text-alert' : 'text-cyan'
                        }`}
                      >
                        {due.getDate()}
                      </span>
                      <span className="font-hud mt-0.5 text-[9px] text-hud-dim">
                        {DAY_LABELS[due.getDay()]}
                      </span>
                    </span>

                    {/* 本文。タップで編集画面へ */}
                    <button
                      type="button"
                      onClick={() => push('scheduleEdit', { scheduleId: item.id })}
                      className="min-w-0 flex-1 text-left active:opacity-60"
                    >
                      <span
                        className={`block truncate text-sm font-medium ${
                          item.done ? 'text-hud-faint line-through' : 'text-hud'
                        }`}
                      >
                        {item.title}
                      </span>
                      <span className="mt-1 flex items-center gap-2 text-[11px] text-hud-dim">
                        <span className="font-digit shrink-0">
                          {item.dueAt.slice(11)}
                        </span>
                        <span className="font-hud shrink-0 rounded-sharp border border-line bg-panel-2 px-1.5 text-[10px]">
                          {item.category}
                        </span>
                        {course && (
                          <span className="flex min-w-0 items-center gap-1">
                            <TagIcon size={11} strokeWidth={1.5} className="shrink-0" />
                            <span className="truncate">{course.name}</span>
                          </span>
                        )}
                      </span>
                    </button>

                    {/* 完了チェック */}
                    <button
                      type="button"
                      onClick={() => toggleDone(item)}
                      role="checkbox"
                      aria-checked={item.done}
                      aria-label={`${item.title} を${item.done ? '未完了に戻す' : '完了にする'}`}
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors ${
                        item.done
                          ? 'glow-sm border-cyan bg-cyan/15 text-cyan'
                          : 'border-line bg-panel-2 text-hud-faint'
                      }`}
                    >
                      <CheckIcon size={16} strokeWidth={2.5} />
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>

      <FloatingActionButton onClick={() => push('scheduleEdit', {})} label="予定を追加" />
    </ScreenLayout>
  )
}

/** 締切日の「年月」ごとにまとめる(spec 4.10: 見出しは月単位) */
function groupByMonth(items) {
  const map = new Map()
  for (const item of items) {
    const due = parseDateString(item.dueAt)
    const label = `${due.getFullYear()}年${due.getMonth() + 1}月`
    if (!map.has(label)) map.set(label, [])
    map.get(label).push(item)
  }
  return [...map.entries()].map(([label, entries]) => ({ label, entries }))
}
