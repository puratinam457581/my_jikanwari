import { useEffect, useState } from 'react'
import Modal from '../components/Modal.jsx'
import { useNavigation } from '../navigation/NavigationContext.jsx'
import { courseApi, semesterApi, timetableApi } from '../db/index.js'

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

/** モーダルとして開く画面をまとめたファイル */

/** 出欠登録モーダル(spec 4.4) — 中身はフェーズ5 */
export function AttendanceEntryModal() {
  return (
    <Modal
      title="出欠を登録"
      footer={<span className="font-hud text-sm font-semibold text-hud-faint">登録</span>}
    >
      <p className="text-sm text-hud-dim">出席/欠席の選択と、対象日付の指定を行います。</p>
      <p className="font-hud mt-3 inline-block rounded-sharp border border-cyan/40 bg-cyan/5 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-cyan">
        フェーズ5 で実装
      </p>
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
