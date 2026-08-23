import { useNavigation } from '../navigation/NavigationContext.jsx'

/**
 * 画面下から せり上がる形のモーダル(spec 4.4 の出欠登録など)。
 * 背景の暗い部分をタップすると閉じる。
 */
export default function Modal({ title, children, footer = null }) {
  const { closeModal } = useNavigation()

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      {/* 背景の覆い */}
      <button
        type="button"
        aria-label="閉じる"
        onClick={closeModal}
        className="absolute inset-0 bg-black/40"
      />

      <div
        className="relative max-h-[85%] overflow-y-auto rounded-t-3xl bg-white"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-neutral-100 bg-white px-4 py-3">
          <button
            type="button"
            onClick={closeModal}
            className="text-sm text-neutral-500 active:opacity-60"
          >
            キャンセル
          </button>
          <h2 className="text-sm font-bold text-neutral-800">{title}</h2>
          <div className="min-w-[4.5rem] text-right">{footer}</div>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}
