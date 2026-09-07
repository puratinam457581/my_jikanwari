import { useCallback, useEffect, useState } from 'react'
import ScreenLayout, { Card, EmptyState } from '../components/ScreenLayout.jsx'
import {
  AlertIcon,
  CloseIcon,
  PencilIcon,
  RoomIcon,
  TeacherIcon,
  TrashIcon,
} from '../components/icons.jsx'
import { useNavigation } from '../navigation/NavigationContext.jsx'
import {
  ATTENDANCE_TYPES,
  attendanceApi,
  courseApi,
  scheduleApi,
  timetableApi,
} from '../db/index.js'
import { parseDateString } from '../utils/date.js'
import { useRefreshOnFocus } from '../hooks/useRefreshOnFocus.js'

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

/**
 * 授業詳細画面(spec 4.3)。
 * 講義の基本情報・出欠管理・関連スケジュール・メモを扱う。
 */
export default function CourseDetailScreen({ courseId, day = null, period = null }) {
  const { push, openModal } = useNavigation()
  const [loading, setLoading] = useState(true)
  const [course, setCourse] = useState(null)
  const [slots, setSlots] = useState([])
  const [counts, setCounts] = useState({ present: 0, absent: 0, total: 0 })
  const [records, setRecords] = useState([])
  // 記録の削除ボタンをすぐ見つけられるよう、デフォルトで開いておく
  // (以前は折りたたみ式で、削除に気づきにくいという指摘があった)
  const [showRecords, setShowRecords] = useState(true)
  const [schedules, setSchedules] = useState([])

  const load = useCallback(async () => {
    const [found, placed, count, list, relatedSchedules] = await Promise.all([
      courseApi.getCourse(courseId),
      timetableApi.listSlotsByCourse(courseId),
      attendanceApi.countAttendance(courseId),
      attendanceApi.listRecordsByCourse(courseId),
      scheduleApi.listSchedulesByCourse(courseId),
    ])
    setCourse(found ?? null)
    setSlots(placed.sort((a, b) => a.day - b.day || a.period - b.period))
    setCounts(count)
    setRecords(list)
    setSchedules(relatedSchedules)
    setLoading(false)
  }, [courseId])

  useEffect(() => {
    load().catch((e) => {
      console.error(e)
      setLoading(false)
    })
  }, [load])

  const reload = () => load().catch((e) => console.error(e))

  // 他の端末で編集した内容を、次にこの画面を見たときには反映させる
  useRefreshOnFocus(reload)

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

  // 欠席が上限に到達しているか(spec 4.5: 到達した時点でのみ警告する)
  const limitReached = attendanceApi.isAbsenceLimitReached(course, counts.absent)

  /** 誤って登録した記録を取り消せるようにする */
  const handleDeleteRecord = async (record) => {
    if (!window.confirm(`${record.date} の「${record.type}」を削除しますか?`)) return
    await attendanceApi.deleteRecord(record.id)
    reload()
  }

  /**
   * 外す対象のコマを1つに絞る。
   * 時間割のコマから来た場合はその曜日・時限、
   * 講義リストなどから来た場合は、配置が1つだけならそれを対象にする。
   * 複数配置があって対象を特定できない場合は null(コマごとの×で外してもらう)。
   */
  const targetSlot =
    slots.find((s) => s.day === day && s.period === period) ??
    (slots.length === 1 ? slots[0] : null)

  /** 指定した1コマから外す。配置だけ消し、講義データ自体は残す(spec 4.3) */
  const handleUnplace = async (slot) => {
    if (!slot) return
    if (
      !window.confirm(
        `${DAY_LABELS[slot.day]}曜${slot.period}限 からこの講義を外します。\n` +
          '講義データ自体は講義リストに残ります。\nよろしいですか?',
      )
    ) {
      return
    }
    await timetableApi.clearSlot(slot.semesterId, slot.day, slot.period)
    reload()
  }

  return (
    <ScreenLayout
      title={course.name}
      showBack
      rightAction={
        targetSlot && (
          <button
            type="button"
            onClick={() => handleUnplace(targetSlot)}
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
                  // 配置ごとに個別に外せるようにする(複数コマある講義でも
                  // 意図しないコマまで消えないように)
                  slots.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleUnplace(s)}
                      aria-label={`${DAY_LABELS[s.day]}曜${s.period}限 から外す`}
                      className={`font-digit flex items-center gap-1 rounded-sharp border bg-panel-2 px-1.5 py-0.5 text-cyan active:opacity-60 ${
                        s.id === targetSlot?.id ? 'border-cyan/60' : 'border-line'
                      }`}
                    >
                      {DAY_LABELS[s.day]} {s.period}限
                      <CloseIcon size={11} strokeWidth={2} className="text-hud-faint" />
                    </button>
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

        {/* --- 出欠管理 --- */}
        <Card
          title="出欠管理"
          action={
            course.attendanceEnabled && (
              <AddButton
                onClick={() =>
                  openModal('attendanceEntry', { courseId: course.id, onSaved: reload })
                }
              />
            )
          }
        >
          {course.attendanceEnabled ? (
            <>
              {limitReached && (
                <p className="glow-sm mb-3 flex items-center gap-2 rounded-sharp border border-alert bg-alert/10 p-2.5 text-xs font-semibold text-alert [--glow-color:var(--color-alert)]">
                  <AlertIcon size={16} strokeWidth={1.8} className="shrink-0" />
                  欠席が上限({course.absenceLimit}回)に達しています
                </p>
              )}

              <div className="flex divide-x divide-line">
                <CountBlock label="出席" value={counts.present} />
                <CountBlock
                  label="欠席"
                  value={counts.absent}
                  limit={course.absenceLimit}
                  alert={limitReached}
                />
              </div>

              {records.length > 0 && (
                <div className="mt-3 border-t border-line pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRecords((v) => !v)}
                    className="font-hud w-full text-center text-[11px] font-semibold text-hud-dim active:opacity-60"
                  >
                    {showRecords ? '記録を隠す' : `記録を表示 (${records.length}件)`}
                  </button>

                  {showRecords && (
                    <ul className="mt-2 space-y-1">
                      {records.map((record) => (
                        <li
                          key={record.id}
                          className="flex items-center justify-between rounded-sharp bg-panel-2 px-2.5 py-1.5"
                        >
                          <span className="font-digit text-xs text-hud">
                            {formatRecordDate(record.date)}
                          </span>
                          <span className="flex items-center gap-2">
                            <span
                              className={`font-hud text-xs font-semibold ${
                                record.type === ATTENDANCE_TYPES.ABSENT
                                  ? 'text-alert'
                                  : 'text-cyan'
                              }`}
                            >
                              {record.type}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteRecord(record)}
                              aria-label={`${record.date} の記録を削除`}
                              className="-m-1.5 p-1.5 text-hud-faint active:opacity-60"
                            >
                              <TrashIcon size={16} strokeWidth={1.5} />
                            </button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="py-2 text-center text-sm text-hud-faint">
              この授業は出席管理の対象外です
            </p>
          )}
        </Card>

        {/* --- この講義に紐づく予定(spec 4.3) --- */}
        <Card
          title="スケジュール"
          action={
            <AddButton
              onClick={() => push('scheduleEdit', { courseId: course.id })}
            />
          }
        >
          {schedules.length === 0 ? (
            <EmptyState>関連する予定はありません</EmptyState>
          ) : (
            <ul className="space-y-1.5">
              {schedules.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => push('scheduleEdit', { scheduleId: item.id })}
                    className="flex w-full items-center gap-2 rounded-sharp bg-panel-2 px-2.5 py-2 text-left active:opacity-70"
                  >
                    <span className="font-digit shrink-0 text-xs text-cyan">
                      {formatRecordDate(item.dueAt.slice(0, 10))}
                    </span>
                    <span
                      className={`min-w-0 flex-1 truncate text-sm ${
                        item.done ? 'text-hud-faint line-through' : 'text-hud'
                      }`}
                    >
                      {item.title}
                    </span>
                    <span className="font-hud shrink-0 rounded-sharp border border-line px-1.5 text-[10px] text-hud-dim">
                      {item.category}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* --- メモ --- */}
        <Card
          title="メモ"
          action={
            <AddButton
              label={course.memo ? '編集' : '追加'}
              onClick={() =>
                openModal('memoEdit', {
                  courseId: course.id,
                  initialMemo: course.memo ?? '',
                  onSaved: reload,
                })
              }
            />
          }
        >
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

function AddButton({ onClick, label = '追加' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-hud rounded-sharp border border-electric/70 bg-electric/15 px-2.5 py-1 text-xs font-semibold text-hud active:opacity-70"
    >
      {label}
    </button>
  )
}

/** 計器盤らしく、大きな数値と細いラベルで見せる(デザイン仕様3.3) */
function CountBlock({ label, value, limit = 0, alert = false }) {
  return (
    <div className="flex-1 py-1 text-center">
      <p
        className={`font-digit text-4xl leading-none font-bold ${
          alert ? 'text-glow text-alert [--glow-color:var(--color-alert)]' : 'text-hud'
        }`}
      >
        {String(value).padStart(2, '0')}
        {limit > 0 && (
          <span className="ml-1 text-base font-normal text-hud-faint">/{limit}</span>
        )}
      </p>
      <p className="font-hud mt-2 text-xs tracking-widest text-hud-dim">{label}</p>
    </div>
  )
}

/** 'YYYY-MM-DD' を「8/24(月)」の形にする */
function formatRecordDate(value) {
  const date = parseDateString(value)
  if (!date) return value
  return `${date.getMonth() + 1}/${date.getDate()}(${DAY_LABELS[date.getDay()]})`
}
