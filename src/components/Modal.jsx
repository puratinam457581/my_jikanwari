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
        className="absolute inset-0 bg-void/75 backdrop-blur-[2px]"
      />

      <div
        className="relative max-h-[85%] overflow-y-auto border-t border-cyan/40 bg-deep"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
          boxShadow: '0 -12px 40px -12px rgba(0, 240, 255, 0.35)',
        }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-deep px-4 py-3">
          <button
            type="button"
            onClick={closeModal}
            className="font-hud text-sm text-hud-dim active:opacity-60"
          >
            キャンセル
          </button>
          <h2 className="font-hud text-sm font-semibold tracking-wide text-hud">
            {title}
          </h2>
          <div className="min-w-[4.5rem] text-right">{footer}</div>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}
