import { useEffect, useState } from 'react'
import Modal from '../components/Modal.jsx'
import { Field } from '../components/form.jsx'
import { useNavigation } from '../navigation/NavigationContext.jsx'
import {
  ATTENDANCE_TYPES,
  attendanceApi,
  courseApi,
  semesterApi,
  timetableApi,
} from '../db/index.js'
import { getAcademicYear, toDateString } from '../utils/date.js'

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

/** モーダルとして開く画面をまとめたファイル */

/**
 * 出欠登録モーダル(spec 4.4)。
 * 種別は 出席/欠席 の2択のみ(spec 4.5: 遅刻・早退はカウントしない)。
 */
export function AttendanceEntryModal({ courseId, onSaved }) {
  const { closeModal } = useNavigation()
  const [type, setType] = useState(ATTENDANCE_TYPES.PRESENT)
  const [date, setDate] = useState(() => toDateString())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async () => {
    if (!date || saving) return
    setSaving(true)
    try {
      // まずは上書きせずに試し、同じ日付の記録があれば確認を挟む(spec 4.4)
      const first = await attendanceApi.addRecord({ courseId, date, type })

      if (first.duplicated) {
        const ok = window.confirm(
          [
            `${date} には既に「${first.record.type}」の記録があります。`,
            `「${type}」で上書きしますか?`,
          ].join('\n'),
        )
        if (!ok) {
          setSaving(false)
          return
        }
        await attendanceApi.addRecord({ courseId, date, type }, { overwrite: true })
      }

      closeModal()
      onSaved?.()
    } catch (e) {
      console.error(e)
      setError('登録に失敗しました')
      setSaving(false)
    }
  }

  const options = [
    { value: ATTENDANCE_TYPES.PRESENT, tone: 'cyan' },
    { value: ATTENDANCE_TYPES.ABSENT, tone: 'alert' },
  ]

  return (
    <Modal
      title="出欠を登録"
      footer={
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="font-hud text-sm font-semibold text-cyan active:opacity-60 disabled:opacity-40"
        >
          登録
        </button>
      }
    >
      {error && (
        <p className="mb-3 rounded-sharp border border-alert/60 bg-alert/10 p-2.5 text-xs text-alert">
          {error}
        </p>
      )}

      <Field label="種別">
        <div className="flex gap-2">
          {options.map(({ value, tone }) => {
            const selected = type === value
            const selectedClass =
              tone === 'alert'
                ? 'border-alert bg-alert/15 text-alert [--glow-color:var(--color-alert)]'
                : 'border-cyan bg-cyan/15 text-cyan'
            return (
              <button
                key={value}
                type="button"
                onClick={() => setType(value)}
                aria-pressed={selected}
                className={`font-hud flex-1 rounded-sharp border py-3 text-sm font-semibold ${
                  selected
                    ? `glow-sm ${selectedClass}`
                    : 'border-line bg-panel-2 text-hud-dim'
                }`}
              >
                {value}
              </button>
            )
          })}
        </div>
      </Field>

      <Field label="対象日付">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="field-input"
        />
      </Field>
    </Modal>
  )
}

/** メモの編集(spec 4.3 のメモカード) */
export function MemoEditModal({ courseId, initialMemo = '', onSaved }) {
  const { closeModal } = useNavigation()
  const [memo, setMemo] = useState(initialMemo)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (saving) return
    setSaving(true)
    try {
      await courseApi.updateCourse(courseId, { memo })
      closeModal()
      onSaved?.()
    } catch (e) {
      console.error(e)
      setSaving(false)
    }
  }

  return (
    <Modal
      title="メモ"
      footer={
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="font-hud text-sm font-semibold text-cyan active:opacity-60 disabled:opacity-40"
        >
          保存
        </button>
      }
    >
      <textarea
        value={memo}
        rows={8}
        placeholder="持ち物、課題の傾向、教員の連絡先など"
        onChange={(e) => setMemo(e.target.value)}
        className="field-input resize-none leading-relaxed"
      />
      <p className="mt-2 text-[11px] text-hud-faint">
        空にして保存すると、メモを削除できます
      </p>
    </Modal>
  )
}

/**
 * 学期の作成・編集(spec 4.9: 前期・後期の2学期制)。
 * semesterId があれば編集、なければ新規作成。
 * 最初から入っている学期も、ここで年度・学期を直せる。
 */
export function SemesterEditModal({ semesterId = null, onSaved }) {
  const { closeModal } = useNavigation()
  const isEdit = Boolean(semesterId)

  const [year, setYear] = useState(() => String(getAcademicYear()))
  const [name, setName] = useState('前期')
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isEdit) return
    let cancelled = false
    semesterApi
      .getSemester(semesterId)
      .then((semester) => {
        if (cancelled || !semester) return
        setYear(String(semester.year))
        setName(semester.name)
        setLoading(false)
      })
      .catch((e) => {
        console.error(e)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [semesterId, isEdit])

  const handleSubmit = async () => {
    const yearNumber = Number(year)
    if (!Number.isInteger(yearNumber) || yearNumber < 1900 || yearNumber > 2999) {
      setError('年度を正しく入力してください')
      return
    }
    setSaving(true)
    try {
      if (await semesterApi.semesterExists(yearNumber, name, semesterId)) {
        setError(`${yearNumber}年度 ${name} は既に登録されています`)
        setSaving(false)
        return
      }
      if (isEdit) {
        await semesterApi.updateSemester(semesterId, { year: yearNumber, name })
      } else {
        await semesterApi.createSemester({ year: yearNumber, name })
      }
      closeModal()
      onSaved?.()
    } catch (e) {
      console.error(e)
      setError('保存に失敗しました')
      setSaving(false)
    }
  }

  const dates = semesterApi.defaultSemesterDates(Number(year) || 0, name)

  return (
    <Modal
      title={isEdit ? '学期を編集' : '学期を追加'}
      footer={
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving || loading}
          className="font-hud text-sm font-semibold text-cyan active:opacity-60 disabled:opacity-40"
        >
          {isEdit ? '保存' : '作成'}
        </button>
      }
    >
      {error && (
        <p className="mb-3 rounded-sharp border border-alert/60 bg-alert/10 p-2.5 text-xs text-alert">
          {error}
        </p>
      )}

      <Field label="年度">
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            value={year}
            onChange={(e) => {
              setYear(e.target.value)
              setError(null)
            }}
            className="field-input font-digit"
          />
          <span className="shrink-0 text-sm text-hud-dim">年度</span>
        </div>
      </Field>

      <Field label="学期">
        <div className="flex gap-2">
          {['前期', '後期'].map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setName(option)
                setError(null)
              }}
              aria-pressed={name === option}
              className={`font-hud flex-1 rounded-sharp border py-3 text-sm font-semibold ${
                name === option
                  ? 'glow-sm border-cyan bg-cyan/15 text-cyan'
                  : 'border-line bg-panel-2 text-hud-dim'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </Field>

      <p className="font-digit text-[11px] text-hud-faint">
        期間: {dates.startDate} 〜 {dates.endDate}
      </p>
      {isEdit && (
        <p className="mt-2 text-[11px] text-hud-faint">
          この学期に登録済みの講義・出欠・時間割はそのまま残ります
        </p>
      )}
    </Modal>
  )
}

/**
 * 空きコマをタップしたときの講義選択モーダル(spec 4.1)。
 * 既存の講義から選ぶか、新規作成して配置するかを選べるようにする。
 */
export function CoursePickerModal({ day, period, onPlaced }) {
  const { closeModal, push } = useNavigation()
  const [courses, setCourses] = useState([])
  const [semesterId, setSemesterId] = useState(null)
  const [placing, setPlacing] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const semester = await semesterApi.getActiveSemester()
      if (cancelled || !semester) return
      setSemesterId(semester.id)
      const list = await courseApi.listCourses(semester.id)
      if (!cancelled) setCourses(list)
    }
    load().catch((e) => console.error(e))
    return () => {
      cancelled = true
    }
  }, [])

  /** 選んだ講義をこのコマに配置する(spec 4.7: 1コマ1講義) */
  const place = async (courseId) => {
    if (!semesterId || placing) return
    setPlacing(true)
    try {
      await timetableApi.assignCourse(semesterId, day, period, courseId)
      closeModal()
      // 時間割側に配置されたことを伝えて再読み込みしてもらう
      onPlaced?.()
    } catch (e) {
      console.error(e)
      setPlacing(false)
    }
  }

  return (
    <Modal title={`${DAY_LABELS[day]}曜 ${period}限 に配置`}>
      <button
        type="button"
        onClick={() => {
          closeModal()
          push('courseEdit', { day, period })
        }}
        className="font-hud glow-sm mb-4 w-full rounded-sharp border border-electric bg-electric/20 py-2.5 text-sm font-semibold tracking-wide text-hud active:opacity-70 [--glow-color:var(--color-electric)]"
      >
        新しい講義を作成して配置
      </button>

      <p className="font-hud mb-2 text-xs font-semibold tracking-widest text-cyan">
        登録済みの講義から選ぶ
      </p>
      {courses.length === 0 && (
        <p className="py-3 text-center text-[11px] text-hud-faint">
          この学期にはまだ講義が登録されていません
        </p>
      )}
      <ul className="space-y-1.5">
        {courses.map((course) => (
          <li key={course.id}>
            <button
              type="button"
              onClick={() => place(course.id)}
              disabled={placing}
              className="flex w-full items-center gap-2.5 rounded-sharp border border-line bg-panel/80 p-2.5 text-left active:bg-panel-2 disabled:opacity-50"
            >
              <span
                className="h-4 w-4 shrink-0 rounded-sharp"
                style={{
                  backgroundColor: course.color,
                  boxShadow: `0 0 8px -1px ${course.color}`,
                }}
              />
              <span className="min-w-0 flex-1 truncate text-sm text-hud">
                {course.name}
              </span>
              <span className="shrink-0 text-[11px] text-hud-faint">
                {course.room || '未登録'}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-center text-[11px] text-hud-faint">
        1つのコマに配置できる講義は1件です
      </p>
    </Modal>
  )
}
