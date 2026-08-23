import { useEffect, useState } from 'react'
import ScreenLayout, { EmptyState, FloatingActionButton } from '../components/ScreenLayout.jsx'
import { RoomIcon, TeacherIcon } from '../components/icons.jsx'
import { useNavigation } from '../navigation/NavigationContext.jsx'
import { courseApi, semesterApi, timetableApi } from '../db/index.js'

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

/**
 * 講義リスト画面(spec 4.2)。
 * 表示するのは、現在の学期に登録された講義のみ(spec 4.9: 講義マスタは学期ごとに独立)。
 * 並び順は「曜日・時限順」。未配置の講義は末尾に回す。
 */
export default function CourseListScreen() {
  const { push } = useNavigation()
  const [loading, setLoading] = useState(true)
  const [semester, setSemester] = useState(null)
  const [courses, setCourses] = useState([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      const active = await semesterApi.getActiveSemester()
      if (cancelled) return
      setSemester(active)
      if (!active) {
        setLoading(false)
        return
      }

      const [courseList, slots] = await Promise.all([
        courseApi.listCourses(active.id),
        timetableApi.listSlots(active.id),
      ])
      if (cancelled) return

      // 各講義の「一番早いコマ」を求めて並べ替えに使う
      const firstSlot = new Map()
      for (const slot of slots) {
        const key = `${slot.day}-${String(slot.period).padStart(2, '0')}`
        const current = firstSlot.get(slot.courseId)
        if (!current || key < current.key) {
          firstSlot.set(slot.courseId, { key, day: slot.day, period: slot.period })
        }
      }

      const withSlot = courseList.map((course) => ({
        ...course,
        slot: firstSlot.get(course.id) ?? null,
        slotCount: slots.filter((s) => s.courseId === course.id).length,
      }))

      withSlot.sort((a, b) => {
        // 未配置(slotなし)は末尾へ
        if (!a.slot && !b.slot) return a.name.localeCompare(b.name, 'ja')
        if (!a.slot) return 1
        if (!b.slot) return -1
        return a.slot.day - b.slot.day || a.slot.period - b.slot.period
      })

      setCourses(withSlot)
      setLoading(false)
    }
    load().catch((e) => {
      console.error(e)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <ScreenLayout
      title="講義リスト"
      rightAction={
        courses.length > 0 && (
          <span className="font-digit text-xs text-hud-faint">{courses.length}件</span>
        )
      }
    >
      <div className="p-3">
        {loading && <EmptyState>読み込み中...</EmptyState>}

        {!loading && courses.length === 0 && (
          <div className="py-10 text-center">
            <p className="text-sm text-hud-dim">講義がまだ登録されていません</p>
            <p className="mt-2 text-[11px] text-hud-faint">
              右下の「＋」から追加してください
              {semester && (
                <>
                  <br />
                  現在の学期: {semester.year}年度 {semester.name}
                </>
              )}
            </p>
          </div>
        )}

        <ul className="space-y-2">
          {courses.map((course) => (
            <li key={course.id}>
              <button
                type="button"
                onClick={() => push('courseDetail', { courseId: course.id })}
                className="flex w-full items-stretch gap-3 overflow-hidden rounded-panel border border-line bg-panel/80 text-left active:bg-panel-2"
              >
                {/* 講義カラーの帯。発光させて識別子にする */}
                <span
                  className="w-1 shrink-0"
                  style={{
                    backgroundColor: course.color,
                    boxShadow: `0 0 10px 0 ${course.color}`,
                  }}
                />
                <span className="min-w-0 flex-1 py-3 pr-3">
                  <span className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-hud">
                      {course.name}
                    </span>
                    {course.creditEarned && (
                      <span className="font-hud shrink-0 rounded-sharp border border-line bg-panel-2 px-1.5 py-0.5 text-[10px] text-hud-dim">
                        単位取得済
                      </span>
                    )}
                  </span>

                  <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-hud-dim">
                    {course.slot ? (
                      <span className="font-digit rounded-sharp border border-line bg-panel-2 px-1.5 py-0.5 text-cyan">
                        {DAY_LABELS[course.slot.day]} {course.slot.period}
                        {course.slotCount > 1 && ` +${course.slotCount - 1}`}
                      </span>
                    ) : (
                      <span className="rounded-sharp border border-line bg-panel-2 px-1.5 py-0.5 text-hud-faint">
                        未配置
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <TeacherIcon size={12} strokeWidth={1.5} />
                      {course.teacher || '未登録'}
                    </span>
                    <span className="flex items-center gap-1">
                      <RoomIcon size={12} strokeWidth={1.5} />
                      {course.room || '未登録'}
                    </span>
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <FloatingActionButton onClick={() => push('courseEdit', {})} label="講義を追加" />
    </ScreenLayout>
  )
}
