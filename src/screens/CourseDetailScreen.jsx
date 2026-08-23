import { useEffect, useState } from 'react'
import ScreenLayout, { Card, EmptyState } from '../components/ScreenLayout.jsx'
import { PencilIcon, RoomIcon, TeacherIcon } from '../components/icons.jsx'
import { useNavigation } from '../navigation/NavigationContext.jsx'
import { courseApi, timetableApi } from '../db/index.js'

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

/**
 * 授業詳細画面(spec 4.3)。
 * フェーズ3では講義の基本情報を実データで表示するところまで。
 * 出欠のカウント・警告はフェーズ5、関連スケジュールはフェーズ6で実装する。
 */
export default function CourseDetailScreen({ courseId }) {
  const { push, popToTop } = useNavigation()
  const [loading, setLoading] = useState(true)
  const [course, setCourse] = useState(null)
  const [slots, setSlots] = useState([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [found, placed] = await Promise.all([
        courseApi.getCourse(courseId),
        timetableApi.listSlotsByCourse(courseId),
      ])
      if (cancelled) return
      setCourse(found ?? null)
      setSlots(placed.sort((a, b) => a.day - b.day || a.period - b.period))
      setLoading(false)
    }
    load().catch((e) => {
      console.error(e)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [courseId])

  if (loading) {
    return (
      <ScreenLayout title="授業詳細" showBack>
        <EmptyState>読み込み中...</EmptyState>
      </ScreenLayout>
    )
  }

  if (!course) {
    return (
      <ScreenLayout title="授業詳細" showBack>
        <EmptyState>講義が見つかりませんでした</EmptyState>
      </ScreenLayout>
    )
  }

  /** 「コマから外す」。配置だけ消し、講義データ自体は残す(spec 4.3) */
  const handleUnplace = async () => {
    if (slots.length === 0) return
    const target = slots
      .map((s) => `${DAY_LABELS[s.day]}曜${s.period}限`)
      .join('、')
    if (
      !window.confirm(
        `${target} からこの講義を外します。\n講義データ自体は講義リストに残ります。\nよろしいですか?`,
      )
    ) {
      return
    }
    await Promise.all(
      slots.map((s) => timetableApi.clearSlot(s.semesterId, s.day, s.period)),
    )
    popToTop()
  }

  return (
    <ScreenLayout
      title={course.name}
      showBack
      rightAction={
        slots.length > 0 && (
          <button
            type="button"
            onClick={handleUnplace}
            className="font-hud text-[11px] font-semibold text-alert active:opacity-60"
          >
            コマから外す
          </button>
        )
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
              <p className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-hud-dim">
                {slots.length > 0 ? (
                  slots.map((s) => (
                    <span
                      key={s.id}
                      className="font-digit rounded-sharp border border-line bg-panel-2 px-1.5 py-0.5 text-cyan"
                    >
                      {DAY_LABELS[s.day]} {s.period}限
                    </span>
                  ))
                ) : (
                  <span className="rounded-sharp border border-line bg-panel-2 px-1.5 py-0.5 text-hud-faint">
                    未配置
                  </span>
                )}
                {course.category && (
                  <span className="rounded-sharp border border-line bg-panel-2 px-1.5 py-0.5">
                    {course.category}
                  </span>
                )}
                {course.credits > 0 && (
                  <span className="font-digit">{course.credits}単位</span>
                )}
                {course.creditEarned && <span className="text-cyan">取得済</span>}
              </p>
            </div>
            <button
              type="button"
              onClick={() => push('courseEdit', { courseId: course.id })}
              aria-label="この講義を編集"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sharp border border-line text-cyan active:bg-panel-2"
            >
              <PencilIcon size={16} strokeWidth={1.5} />
            </button>
          </div>
        </section>

        {course.syllabusUrl && (
          <a
            href={course.syllabusUrl}
            target="_blank"
            rel="noreferrer"
            className="mb-3 block truncate rounded-panel border border-line bg-panel/80 p-3 text-sm text-cyan active:bg-panel-2"
          >
            シラバスを開く
          </a>
        )}

        {/* --- 出欠管理(フェーズ5で中身を実装) --- */}
        <Card title="出欠管理" action={<PhaseTag phase="フェーズ5" />}>
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

        {/* --- スケジュール(フェーズ6で中身を実装) --- */}
        <Card title="スケジュール" action={<PhaseTag phase="フェーズ6" />}>
          <EmptyState>関連する予定はありません</EmptyState>
        </Card>

        {/* --- メモ(フェーズ5で中身を実装) --- */}
        <Card title="メモ" action={<PhaseTag phase="フェーズ5" />}>
          {course.memo ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-hud">
              {course.memo}
            </p>
          ) : (
            <EmptyState>メモはまだありません</EmptyState>
          )}
        </Card>
      </div>
    </ScreenLayout>
  )
}

function PhaseTag({ phase }) {
  return (
    <span className="font-hud rounded-sharp border border-line bg-panel-2 px-2 py-0.5 text-[10px] text-hud-faint">
      {phase}
    </span>
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
