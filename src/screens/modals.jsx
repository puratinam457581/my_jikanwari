import Modal from '../components/Modal.jsx'
import { useNavigation } from '../navigation/NavigationContext.jsx'
import { DUMMY_COURSES } from '../data/dummy.js'

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

/**
 * 【フェーズ2】モーダルの枠と遷移の確認用。
 * 中身の実装はそれぞれ担当フェーズで行う。
 */

/** 出欠登録モーダル(spec 4.4) — 中身はフェーズ5 */
export function AttendanceEntryModal() {
  return (
    <Modal
      title="出欠を登録"
      footer={<span className="text-sm font-medium text-neutral-300">登録</span>}
    >
      <p className="text-sm text-neutral-700">
        出席/欠席の選択と、対象日付の指定を行います。
      </p>
      <p className="mt-2 inline-block rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-medium text-neutral-500">
        フェーズ5 で実装
      </p>
    </Modal>
  )
}

/**
 * 空きコマをタップしたときの講義選択モーダル(spec 4.1)。
 * 既存の講義から選ぶか、新規作成して配置するかを選べるようにする。
 */
export function CoursePickerModal({ day, period }) {
  const { closeModal, push } = useNavigation()

  return (
    <Modal title={`${DAY_LABELS[day]}曜 ${period}限 に配置`}>
      <button
        type="button"
        onClick={() => {
          closeModal()
          push('courseEdit', { day, period })
        }}
        className="mb-3 w-full rounded-xl bg-sky-500 py-2.5 text-sm font-medium text-white active:bg-sky-600"
      >
        新しい講義を作成して配置
      </button>

      <p className="mb-2 text-xs font-bold text-neutral-500">登録済みの講義から選ぶ</p>
      <ul className="space-y-1.5">
        {DUMMY_COURSES.map((course) => (
          <li key={course.id}>
            <button
              type="button"
              onClick={closeModal}
              className="flex w-full items-center gap-2 rounded-xl border border-neutral-200 p-2.5 text-left active:bg-neutral-50"
            >
              <span
                className="h-4 w-4 shrink-0 rounded"
                style={{ backgroundColor: course.color }}
              />
              <span className="min-w-0 flex-1 truncate text-sm text-neutral-800">
                {course.name}
              </span>
              <span className="shrink-0 text-[11px] text-neutral-400">
                {course.room || '未登録'}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-center text-[11px] text-neutral-400">
        フェーズ2: 選択しても配置はされません(フェーズ4で実装)
      </p>
    </Modal>
  )
}
