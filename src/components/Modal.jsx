import { useNavigation } from '../navigation/NavigationContext.jsx'

/**
 * spec 4.4 の出欠登録などで使うモーダル。
 * スマホでは画面下からせり上がるシート、PCでは中央のダイアログとして出す。
 * 背景の暗い部分をタップすると閉じる。
 */
export default function Modal({ title, children, footer = null }) {
  const { closeModal } = useNavigation()

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end md:fixed md:items-center md:justify-center">
      {/* 背景の覆い */}
      <button
        type="button"
        aria-label="閉じる"
        onClick={closeModal}
        className="scrim absolute inset-0 backdrop-blur-[2px]"
      />

      <div
        className="glow-lg relative max-h-[85%] w-full overflow-y-auto rounded-t-panel border-t border-cyan/40 bg-deep md:max-h-[80%] md:max-w-md md:rounded-panel md:border"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
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
