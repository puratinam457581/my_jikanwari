import { useEffect, useState } from 'react'
import ScreenLayout, { EmptyState } from '../components/ScreenLayout.jsx'
import {
  CategoryField,
  ColorField,
  FormSection,
  NumberField,
  SwitchField,
  TextField,
} from '../components/form.jsx'
import { TrashIcon } from '../components/icons.jsx'
import { useNavigation } from '../navigation/NavigationContext.jsx'
import {
  COURSE_CATEGORY_NONE,
  DEFAULT_COLOR,
  courseApi,
  semesterApi,
  timetableApi,
} from '../db/index.js'

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

/** 数値入力は文字列で持っているので、保存時に数値へ直す */
const toNumber = (value, fallback = 0) => {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

/**
 * 講義編集フォーム(spec 4.2 / 4.5 / 4.6)。
 * courseId があれば編集、なければ新規作成。
 *
 * 時間割の空きコマから開かれた場合は day / period が渡され、
 * 新規作成した講義をそのままそのコマに配置する(spec 4.1)。
 */
export default function CourseEditScreen({ courseId = null, day = null, period = null }) {
  const { goBack, popToTop } = useNavigation()
  const isEdit = Boolean(courseId)

  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [semesterId, setSemesterId] = useState(null)
  const [placements, setPlacements] = useState([])

  const [form, setForm] = useState({
    name: '',
    teacher: '',
    room: '',
    credits: '',
    category: COURSE_CATEGORY_NONE,
    syllabusUrl: '',
    color: DEFAULT_COLOR,
    attendanceEnabled: true,
    absenceLimit: '',
    creditEarned: false,
  })

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  // 新規作成かつ、配置先のコマが指定されているか
  const placeTarget =
    !isEdit && Number.isInteger(day) && Number.isInteger(period)
      ? { day, period }
      : null

  useEffect(() => {
    let cancelled = false
    async function load() {
      const semester = await semesterApi.getActiveSemester()
      if (cancelled) return
      setSemesterId(semester?.id ?? null)

      if (isEdit) {
        const [course, slots] = await Promise.all([
          courseApi.getCourse(courseId),
          timetableApi.listSlotsByCourse(courseId),
        ])
        if (cancelled) return
        if (!course) {
          setNotFound(true)
          setLoading(false)
          return
        }
        setForm({
          name: course.name ?? '',
          teacher: course.teacher ?? '',
          room: course.room ?? '',
          credits: course.credits === 0 ? '' : String(course.credits ?? ''),
          category: course.category ?? COURSE_CATEGORY_NONE,
          syllabusUrl: course.syllabusUrl ?? '',
          color: course.color ?? DEFAULT_COLOR,
          attendanceEnabled: course.attendanceEnabled ?? true,
          absenceLimit: course.absenceLimit === 0 ? '' : String(course.absenceLimit ?? ''),
          creditEarned: course.creditEarned ?? false,
        })
        setPlacements(slots.sort((a, b) => a.day - b.day || a.period - b.period))
      }
      setLoading(false)
    }
    load().catch((e) => {
      console.error(e)
      setError('読み込みに失敗しました')
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [courseId, isEdit])

  const nameError = error === 'name' ? '講義名を入力してください' : null

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('name')
      return
    }
    if (!semesterId) {
      setError('学期が読み込めていません')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        teacher: form.teacher.trim(),
        room: form.room.trim(),
        credits: toNumber(form.credits),
        category: form.category,
        syllabusUrl: form.syllabusUrl.trim(),
        color: form.color,
        attendanceEnabled: form.attendanceEnabled,
        absenceLimit: toNumber(form.absenceLimit),
        creditEarned: form.creditEarned,
      }
      if (isEdit) {
        await courseApi.updateCourse(courseId, payload)
      } else {
        const created = await courseApi.createCourse({ ...payload, semesterId })
        // 空きコマから作成した場合は、そのままコマに配置する
        if (placeTarget) {
          await timetableApi.assignCourse(semesterId, day, period, created.id)
        }
      }
      goBack()
    } catch (e) {
      console.error(e)
      setError('保存に失敗しました')
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    const message = [
      `「${form.name}」を削除します。`,
      '',
      '・時間割の配置と出欠記録も一緒に削除されます',
      '・関連する予定は削除されず、講義との紐付けだけ外れます',
      '',
      'この操作は取り消せません。よろしいですか?',
    ].join('\n')
    if (!window.confirm(message)) return

    try {
      await courseApi.deleteCourse(courseId)
      // 削除した講義の詳細画面に戻ってしまわないよう、一覧まで戻す
      popToTop()
    } catch (e) {
      console.error(e)
      setError('削除に失敗しました')
    }
  }

  if (notFound) {
    return (
      <ScreenLayout title="講義を編集" showBack>
        <EmptyState>講義が見つかりませんでした</EmptyState>
      </ScreenLayout>
    )
  }

  return (
    <ScreenLayout
      title={isEdit ? '講義を編集' : '講義を追加'}
      showBack
      rightAction={
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || loading}
          className="font-hud text-sm font-semibold text-cyan active:opacity-60 disabled:opacity-40"
        >
          保存
        </button>
      }
    >
      <div className="p-3 pb-10">
        {loading ? (
          <EmptyState>読み込み中...</EmptyState>
        ) : (
          <>
            {error && error !== 'name' && (
              <p className="mb-3 rounded-sharp border border-alert/60 bg-alert/10 p-2.5 text-xs text-alert">
                {error}
              </p>
            )}

            {placeTarget && (
              <p className="mb-3 rounded-sharp border border-cyan/40 bg-cyan/5 p-2.5 text-xs text-cyan">
                保存すると、この講義を {DAY_LABELS[placeTarget.day]}曜{' '}
                {placeTarget.period}限 に配置します
              </p>
            )}

            <FormSection title="基本情報">
              <TextField
                label="講義名"
                required
                value={form.name}
                onChange={(v) => {
                  update('name', v)
                  if (error === 'name') setError(null)
                }}
                placeholder="例: 基礎生物学"
                error={nameError}
              />
              <TextField
                label="担当教員"
                value={form.teacher}
                onChange={(v) => update('teacher', v)}
                placeholder="例: 山田 太郎"
              />
              <TextField
                label="教室"
                value={form.room}
                onChange={(v) => update('room', v)}
                placeholder="例: A101"
                hint="未入力の場合、時間割には「未登録」と表示されます"
              />
            </FormSection>

            <FormSection title="カラー">
              <ColorField value={form.color} onChange={(v) => update('color', v)} />
            </FormSection>

            <FormSection title="単位・科目区分">
              <CategoryField
                value={form.category}
                onChange={(v) => update('category', v)}
              />
              <NumberField
                label="単位数"
                value={form.credits}
                onChange={(v) => update('credits', v)}
                unit="単位"
                max={20}
              />
              <SwitchField
                label="単位取得済み"
                checked={form.creditEarned}
                onChange={(v) => update('creditEarned', v)}
                hint="ONにすると、マイページの取得単位数に合算されます"
              />
            </FormSection>

            <FormSection title="出欠管理">
              <SwitchField
                label="出席管理の対象とする"
                checked={form.attendanceEnabled}
                onChange={(v) => update('attendanceEnabled', v)}
                hint="OFFにすると、授業詳細では出欠を記録できなくなります"
              />
              <NumberField
                label="欠席上限回数"
                value={form.absenceLimit}
                onChange={(v) => update('absenceLimit', v)}
                unit="回"
                max={99}
                disabled={!form.attendanceEnabled}
                hint="この回数に達したときだけ警告を表示します(0なら警告しません)"
              />
            </FormSection>

            <FormSection title="その他">
              <TextField
                label="シラバスURL"
                type="url"
                inputMode="url"
                value={form.syllabusUrl}
                onChange={(v) => update('syllabusUrl', v)}
                placeholder="https://..."
              />
            </FormSection>

            {isEdit && (
              <>
                <FormSection title="時間割への配置">
                  {placements.length === 0 ? (
                    <p className="text-sm text-hud-faint">
                      まだどのコマにも配置されていません
                    </p>
                  ) : (
                    <ul className="flex flex-wrap gap-2">
                      {placements.map((slot) => (
                        <li
                          key={slot.id}
                          className="font-digit rounded-sharp border border-line bg-panel-2 px-2.5 py-1 text-xs text-cyan"
                        >
                          {DAY_LABELS[slot.day]} {slot.period}限
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-2 text-[11px] text-hud-faint">
                    コマへの配置・解除は時間割画面から行います
                  </p>
                </FormSection>

                <button
                  type="button"
                  onClick={handleDelete}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-panel border border-alert/60 bg-alert/10 py-3 text-sm font-semibold text-alert active:opacity-70"
                >
                  <TrashIcon size={16} strokeWidth={1.5} />
                  この講義を削除
                </button>
              </>
            )}
          </>
        )}
      </div>
    </ScreenLayout>
  )
}
