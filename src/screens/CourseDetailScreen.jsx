import ScreenLayout, { Card, EmptyState } from '../components/ScreenLayout.jsx'
import { PencilIcon, RoomIcon, TeacherIcon } from '../components/icons.jsx'
import { useNavigation } from '../navigation/NavigationContext.jsx'
import { findDummyCourse } from '../data/dummy.js'

/**
 * 授業詳細画面(spec 4.3)。
 * フェーズ2では各カードの枠と、編集/追加ボタンの遷移までを作る。
 * 出欠のカウントや警告はフェーズ5で実装する。
 */
export default function CourseDetailScreen({ courseId }) {
  const { push, openModal, goBack } = useNavigation()
  const course = findDummyCourse(courseId)

  if (!course) {
    return (
      <ScreenLayout title="授業詳細" showBack>
        <EmptyState>講義が見つかりませんでした</EmptyState>
      </ScreenLayout>
    )
  }

  return (
    <ScreenLayout
      title={course.name}
      showBack
      rightAction={
        <button
          type="button"
          onClick={goBack}
          className="text-[11px] font-medium text-red-500 active:opacity-60"
        >
          コマから外す
        </button>
      }
    >
      <div className="p-3">
        {/* --- 基本情報 --- */}
        <section className="mb-3 flex items-stretch overflow-hidden rounded-2xl bg-white shadow-sm">
          <span className="w-1.5 shrink-0" style={{ backgroundColor: course.color }} />
          <div className="flex flex-1 items-center justify-between p-4">
            <div className="min-w-0 space-y-1.5">
              <p className="flex items-center gap-1.5 text-sm text-neutral-700">
                <TeacherIcon width={15} height={15} className="text-neutral-400" />
                {course.teacher || '未登録'}
              </p>
              <p className="flex items-center gap-1.5 text-sm text-neutral-700">
                <RoomIcon width={15} height={15} className="text-neutral-400" />
                {course.room || '未登録'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => push('courseEdit', { courseId: course.id })}
              aria-label="この講義を編集"
              className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 active:bg-neutral-100"
            >
              <PencilIcon width={18} height={18} />
            </button>
          </div>
        </section>

        {/* --- 出欠管理 --- */}
        <Card
          title="出欠管理"
          action={
            course.attendanceEnabled && (
              <AddButton onClick={() => openModal('attendanceEntry', { courseId: course.id })} />
            )
          }
        >
          {course.attendanceEnabled ? (
            <div className="flex">
              <CountBlock label="出席" value={0} />
              <CountBlock label="欠席" value={0} />
            </div>
          ) : (
            <p className="py-2 text-center text-sm text-neutral-400">
              この授業は出席管理の対象外です
            </p>
          )}
        </Card>

        {/* --- スケジュール --- */}
        <Card
          title="スケジュール"
          action={
            <AddButton onClick={() => push('scheduleEdit', { courseId: course.id })} />
          }
        >
          <EmptyState>関連する予定はありません</EmptyState>
        </Card>

        {/* --- メモ --- */}
        <Card title="メモ" action={<AddButton onClick={() => {}} />}>
          <EmptyState>メモはまだありません</EmptyState>
        </Card>

        <p className="px-2 text-center text-[11px] text-neutral-400">
          フェーズ2: 表示内容はダミーです
        </p>
      </div>
    </ScreenLayout>
  )
}

function AddButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-600 active:bg-sky-100"
    >
      追加
    </button>
  )
}

function CountBlock({ label, value }) {
  return (
    <div className="flex-1 text-center">
      <p className="text-3xl font-bold text-neutral-800">{value}</p>
      <p className="mt-0.5 text-xs text-neutral-500">{label}</p>
    </div>
  )
}
