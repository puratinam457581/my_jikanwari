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
          className="font-hud text-[11px] font-semibold text-alert active:opacity-60"
        >
          コマから外す
        </button>
      }
    >
      <div className="p-3">
        {/* --- 基本情報 --- */}
        <section
          className="mb-3 flex items-stretch overflow-hidden rounded-panel border bg-panel/80"
          style={{
            borderColor: `color-mix(in srgb, ${course.color} 45%, transparent)`,
          }}
        >
          <span
            className="w-1 shrink-0"
            style={{
              backgroundColor: course.color,
              boxShadow: `0 0 12px 0 ${course.color}`,
            }}
          />
          <div className="flex flex-1 items-center justify-between p-4">
            <div className="min-w-0 space-y-2">
              <p className="flex items-center gap-2 text-sm text-hud">
                <TeacherIcon size={15} strokeWidth={1.5} className="text-hud-faint" />
                {course.teacher || '未登録'}
              </p>
              <p className="flex items-center gap-2 text-sm text-hud">
                <RoomIcon size={15} strokeWidth={1.5} className="text-hud-faint" />
                {course.room || '未登録'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => push('courseEdit', { courseId: course.id })}
              aria-label="この講義を編集"
              className="flex h-9 w-9 items-center justify-center rounded-sharp border border-line text-cyan active:bg-panel-2"
            >
              <PencilIcon size={16} strokeWidth={1.5} />
            </button>
          </div>
        </section>

        {/* --- 出欠管理 --- */}
        <Card
          title="出欠管理"
          action={
            course.attendanceEnabled && (
              <AddButton
                onClick={() => openModal('attendanceEntry', { courseId: course.id })}
              />
            )
          }
        >
          {course.attendanceEnabled ? (
            <div className="flex divide-x divide-line">
              <CountBlock label="出席" value={0} />
              <CountBlock label="欠席" value={0} />
            </div>
          ) : (
            <p className="py-2 text-center text-sm text-hud-faint">
              この授業は出席管理の対象外です
            </p>
          )}
        </Card>

        {/* --- スケジュール --- */}
        <Card
          title="スケジュール"
          action={<AddButton onClick={() => push('scheduleEdit', { courseId: course.id })} />}
        >
          <EmptyState>関連する予定はありません</EmptyState>
        </Card>

        {/* --- メモ --- */}
        <Card title="メモ" action={<AddButton onClick={() => {}} />}>
          <EmptyState>メモはまだありません</EmptyState>
        </Card>

        <p className="px-2 text-center text-[11px] text-hud-faint">
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
      className="font-hud rounded-sharp border border-electric/70 bg-electric/15 px-2.5 py-1 text-xs font-semibold text-hud active:opacity-70"
    >
      追加
    </button>
  )
}

/** 計器盤らしく、大きな数値と細いラベルで見せる(デザイン仕様3.3) */
function CountBlock({ label, value }) {
  return (
    <div className="flex-1 py-1 text-center">
      <p className="font-digit text-4xl leading-none font-bold text-hud">
        {String(value).padStart(2, '0')}
      </p>
      <p className="font-hud mt-2 text-xs tracking-widest text-hud-dim">{label}</p>
    </div>
  )
}
