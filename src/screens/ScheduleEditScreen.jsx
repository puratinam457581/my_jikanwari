import { useEffect, useState } from 'react'
import ScreenLayout, { EmptyState } from '../components/ScreenLayout.jsx'
import {
  ChoiceField,
  Field,
  FormSection,
  MultiChoiceField,
  SelectField,
  TextArea,
  TextField,
} from '../components/form.jsx'
import { TrashIcon } from '../components/icons.jsx'
import { useNavigation } from '../navigation/NavigationContext.jsx'
import {
  NOTIFY_OPTIONS,
  SCHEDULE_CATEGORIES,
  courseApi,
  scheduleApi,
  semesterApi,
} from '../db/index.js'
import { toDateString } from '../utils/date.js'

/** 締切日時は 'YYYY-MM-DDTHH:mm' の1文字列。入力欄は日付と時刻に分かれている */
function splitDueAt(dueAt) {
  if (!dueAt) return { date: toDateString(), time: '23:59' }
  const [date, time = '23:59'] = dueAt.split('T')
  return { date, time }
}

/**
 * スケジュール(課題・締切)の登録・編集フォーム(spec 4.10)。
 * scheduleId があれば編集、なければ新規作成。
 * courseId が渡された場合(授業詳細から開いた場合)は、その講義を初期選択する。
 */
export default function ScheduleEditScreen({ scheduleId = null, courseId = null }) {
  const { goBack, popToTop } = useNavigation()
  const isEdit = Boolean(scheduleId)

  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [courses, setCourses] = useState([])

  const [form, setForm] = useState(() => {
    const { date, time } = splitDueAt(null)
    return {
      title: '',
      courseId: courseId ?? null,
      date,
      time,
      category: SCHEDULE_CATEGORIES[0],
      notifyTimings: [],
      memo: '',
    }
  })

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  useEffect(() => {
    let cancelled = false
    async function load() {
      const semester = await semesterApi.getActiveSemester()
      const courseList = semester ? await courseApi.listCourses(semester.id) : []
      if (cancelled) return
      setCourses(courseList)

      if (isEdit) {
        const schedule = await scheduleApi.getSchedule(scheduleId)
        if (cancelled) return
        if (!schedule) {
          setNotFound(true)
          setLoading(false)
          return
        }
        const { date, time } = splitDueAt(schedule.dueAt)
        setForm({
          title: schedule.title ?? '',
          courseId: schedule.courseId ?? null,
          date,
          time,
          category: schedule.category ?? SCHEDULE_CATEGORIES[0],
          notifyTimings: schedule.notifyTimings ?? [],
          memo: schedule.memo ?? '',
        })
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
  }, [scheduleId, isEdit])

  const handleSave = async () => {
    if (!form.title.trim()) {
      setError('title')
      return
    }
    if (!form.date) {
      setError('締切日を指定してください')
      return
    }

    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        courseId: form.courseId || null,
        dueAt: `${form.date}T${form.time || '23:59'}`,
        category: form.category,
        notifyTimings: form.notifyTimings,
        memo: form.memo.trim(),
      }
      if (isEdit) {
        await scheduleApi.updateSchedule(scheduleId, payload)
      } else {
        await scheduleApi.createSchedule(payload)
      }
      goBack()
    } catch (e) {
      console.error(e)
      setError('保存に失敗しました')
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(`「${form.title}」を削除します。よろしいですか?`)) return
    try {
      await scheduleApi.deleteSchedule(scheduleId)
      popToTop()
    } catch (e) {
      console.error(e)
      setError('削除に失敗しました')
    }
  }

  if (notFound) {
    return (
      <ScreenLayout title="予定を編集" showBack>
        <EmptyState>予定が見つかりませんでした</EmptyState>
      </ScreenLayout>
    )
  }

  return (
    <ScreenLayout
      title={isEdit ? '予定を編集' : '予定を追加'}
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
            {error && error !== 'title' && (
              <p className="mb-3 rounded-sharp border border-alert/60 bg-alert/10 p-2.5 text-xs text-alert">
                {error}
              </p>
            )}

            <FormSection title="内容">
              <TextField
                label="タイトル"
                required
                value={form.title}
                onChange={(v) => {
                  update('title', v)
                  if (error === 'title') setError(null)
                }}
                placeholder="例: レポート提出"
                error={error === 'title' ? 'タイトルを入力してください' : null}
              />

              <ChoiceField
                label="カテゴリー"
                value={form.category}
                onChange={(v) => update('category', v)}
                options={SCHEDULE_CATEGORIES.map((c) => ({ value: c, label: c }))}
              />

              <SelectField
                label="関連する講義"
                value={form.courseId}
                onChange={(v) => update('courseId', v)}
                options={courses.map((c) => ({ value: c.id, label: c.name }))}
                placeholder="講義に紐づけない"
                hint={
                  courses.length === 0
                    ? 'この学期にはまだ講義が登録されていません'
                    : null
                }
              />
            </FormSection>

            <FormSection title="締切">
              <Field label="日付" required>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => update('date', e.target.value)}
                  className="field-input font-digit"
                />
              </Field>
              <Field label="時刻">
                <input
                  type="time"
                  value={form.time}
                  onChange={(e) => update('time', e.target.value)}
                  className="field-input font-digit"
                />
              </Field>
            </FormSection>

            <FormSection title="通知">
              <MultiChoiceField
                label="通知タイミング"
                value={form.notifyTimings}
                onChange={(v) => update('notifyTimings', v)}
                options={NOTIFY_OPTIONS.map((o) => ({ value: o.value, label: o.value }))}
                hint="どちらも選ばなければ通知しません。複数選べます"
              />
              <p className="text-[11px] text-hud-faint">
                通知が実際に届くのはフェーズ9(PWA化)以降です
              </p>
            </FormSection>

            <FormSection title="メモ">
              <TextArea
                label="メモ"
                value={form.memo}
                onChange={(v) => update('memo', v)}
                placeholder="提出方法、範囲など"
                rows={4}
              />
            </FormSection>

            {isEdit && (
              <button
                type="button"
                onClick={handleDelete}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-panel border border-alert/60 bg-alert/10 py-3 text-sm font-semibold text-alert active:opacity-70"
              >
                <TrashIcon size={16} strokeWidth={1.5} />
                この予定を削除
              </button>
            )}
          </>
        )}
      </div>
    </ScreenLayout>
  )
}
