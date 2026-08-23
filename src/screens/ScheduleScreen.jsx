import { useState } from 'react'
import ScreenLayout, { EmptyState, FloatingActionButton } from '../components/ScreenLayout.jsx'
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
        <button
          type="button"
          onClick={() => setShowDone((v) => !v)}
          className="rounded-full border border-neutral-300 px-2.5 py-1 text-[11px] font-medium text-neutral-600 active:bg-neutral-100"
        >
          {showDone ? '未完了' : 'すべて'}
        </button>
      }
    >
      <div className="p-3">
        {groups.length === 0 && <EmptyState>予定はありません</EmptyState>}

        {groups.map(({ label, entries }) => (
          <div key={label} className="mb-4">
            <h2 className="mb-2 px-1 text-xs font-bold text-neutral-500">{label}</h2>
            <ul className="space-y-2">
              {entries.map((item) => {
                const course = findDummyCourse(item.courseId)
                const due = parseDateString(item.dueAt)
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => push('scheduleEdit', { scheduleId: item.id })}
                      className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-sm active:bg-neutral-50"
                    >
                      <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-full bg-sky-50 leading-none">
                        <span className="text-sm font-bold text-sky-600">
                          {due.getDate()}
                        </span>
                        <span className="mt-0.5 text-[9px] text-sky-500">
                          {DAY_LABELS[due.getDay()]}
                        </span>
                      </span>

                      <span className="min-w-0 flex-1">
                        <span
                          className={`block truncate text-sm font-medium ${
                            item.done
                              ? 'text-neutral-400 line-through'
                              : 'text-neutral-800'
                          }`}
                        >
                          {item.title}
                        </span>
                        <span className="mt-0.5 flex items-center gap-2 text-[11px] text-neutral-500">
                          <span>
                            {String(due.getHours()).padStart(2, '0')}:
                            {String(due.getMinutes()).padStart(2, '0')}
                          </span>
                          {course && (
                            <span className="flex min-w-0 items-center gap-0.5">
                              <TagIcon width={12} height={12} />
                              <span className="truncate">{course.name}</span>
                            </span>
                          )}
                        </span>
                      </span>

                      <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-600">
                        {item.category}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}

        <p className="px-2 text-center text-[11px] text-neutral-400">
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
