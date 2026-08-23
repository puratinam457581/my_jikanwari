import ScreenLayout, { EmptyState, FloatingActionButton } from '../components/ScreenLayout.jsx'
import { RoomIcon, TeacherIcon } from '../components/icons.jsx'
import { useNavigation } from '../navigation/NavigationContext.jsx'
import { DUMMY_COURSES } from '../data/dummy.js'

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

/**
 * 講義リスト画面(spec 4.2)。
 * 並び順は「曜日・時限順」がデフォルト。
 * 項目タップで授業詳細へ遷移する。
 */
export default function CourseListScreen() {
  const { push } = useNavigation()

  const courses = [...DUMMY_COURSES].sort(
    (a, b) => a.day - b.day || a.period - b.period,
  )

  return (
    <ScreenLayout title="講義リスト">
      <div className="p-3">
        {courses.length === 0 && <EmptyState>講義が登録されていません</EmptyState>}

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
                  <span className="block truncate text-sm font-semibold text-hud">
                    {course.name}
                  </span>
                  <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-hud-dim">
                    <span className="font-digit rounded-sharp border border-line bg-panel-2 px-1.5 py-0.5 text-cyan">
                      {DAY_LABELS[course.day]} {course.period}
                    </span>
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

        <p className="mt-3 px-2 text-center text-[11px] text-hud-faint">
          フェーズ2: 表示中の講義はダミーです
        </p>
      </div>

      <FloatingActionButton onClick={() => push('courseEdit', {})} label="講義を追加" />
    </ScreenLayout>
  )
}
