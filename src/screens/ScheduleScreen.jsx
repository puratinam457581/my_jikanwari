import { useState } from 'react'
import ScreenLayout, {
  Button,
  EmptyState,
  FloatingActionButton,
} from '../components/ScreenLayout.jsx'
import { TagIcon } from '../components/icons.jsx'
import { useNavigation } from '../navigation/NavigationContext.jsx'
import { DUMMY_SCHEDULES, findDummyCourse } from '../data/dummy.js'
import { parseDateString } from '../utils/date.js'

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

/**
 * スケジュール(課題管理)画面(spec 4.10)。
 * フェーズ2では月ごとの見出し付きリストと、登録フォームへの遷移までを作る。
 */
export default function ScheduleScreen() {
  const { push } = useNavigation()
  const [showDone, setShowDone] = useState(false)

  const items = DUMMY_SCHEDULES.filter((s) => showDone || !s.done)
  const groups = groupByMonth(items)

  return (
    <ScreenLayout
      title="スケジュール"
      rightAction={
        <Button onClick={() => setShowDone((v) => !v)}>
          {showDone ? '未完了' : 'すべて'}
        </Button>
      }
    >
      <div className="p-3">
        {groups.length === 0 && <EmptyState>予定はありません</EmptyState>}

        {groups.map(({ label, entries }) => (
          <div key={label} className="mb-4">
            <h2 className="font-hud mb-2 flex items-center gap-2 px-1 text-xs font-semibold tracking-widest text-cyan">
              {label}
              <span className="h-px flex-1 bg-line-glow" />
            </h2>

            <ul className="space-y-2">
              {entries.map((item) => {
                const course = findDummyCourse(item.courseId)
                const due = parseDateString(item.dueAt)
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => push('scheduleEdit', { scheduleId: item.id })}
                      className="flex w-full items-center gap-3 rounded-panel border border-line bg-panel/80 p-3 text-left active:bg-panel-2"
                    >
                      {/* 日付バッジ(spec 4.10: 円形+日付+曜日) */}
                      <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-sharp border border-cyan/40 bg-cyan/5 leading-none">
                        <span className="font-digit text-sm font-bold text-cyan">
                          {due.getDate()}
                        </span>
                        <span className="font-hud mt-0.5 text-[9px] text-hud-dim">
                          {DAY_LABELS[due.getDay()]}
                        </span>
                      </span>

                      <span className="min-w-0 flex-1">
                        <span
                          className={`block truncate text-sm font-medium ${
                            item.done ? 'text-hud-faint line-through' : 'text-hud'
                          }`}
                        >
                          {item.title}
                        </span>
                        <span className="mt-1 flex items-center gap-2 text-[11px] text-hud-dim">
                          <span className="font-digit">
                            {String(due.getHours()).padStart(2, '0')}:
                            {String(due.getMinutes()).padStart(2, '0')}
                          </span>
                          {course && (
                            <span className="flex min-w-0 items-center gap-1">
                              <TagIcon size={11} strokeWidth={1.5} />
                              <span className="truncate">{course.name}</span>
                            </span>
                          )}
                        </span>
                      </span>

                      <span className="font-hud shrink-0 rounded-sharp border border-line bg-panel-2 px-2 py-0.5 text-[10px] text-hud-dim">
                        {item.category}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}

        <p className="px-2 text-center text-[11px] text-hud-faint">
          フェーズ2: 表示中の予定はダミーです
        </p>
      </div>

      <FloatingActionButton onClick={() => push('scheduleEdit', {})} label="予定を追加" />
    </ScreenLayout>
  )
}

/** 締切日の「年月」ごとにまとめる(spec 4.10: 見出しは月単位) */
function groupByMonth(items) {
  const map = new Map()
  for (const item of [...items].sort((a, b) => a.dueAt.localeCompare(b.dueAt))) {
    const due = parseDateString(item.dueAt)
    const label = `${due.getFullYear()}年${due.getMonth() + 1}月`
    if (!map.has(label)) map.set(label, [])
    map.get(label).push(item)
  }
  return [...map.entries()].map(([label, entries]) => ({ label, entries }))
}
