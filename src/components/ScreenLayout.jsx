import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from './icons.jsx'
import { useNavigation } from '../navigation/NavigationContext.jsx'

/**
 * 全画面で共通のレイアウト。
 * 上部にヘッダーを固定し、その下を縦スクロール領域にする。
 *
 * props:
 *   title      : ヘッダー中央の見出し
 *   showBack   : 左上に戻る矢印を出すか
 *   rightAction: ヘッダー右側に置く要素(ボタンなど)
 *   headerExtra: ヘッダー下に固定表示したい要素
 */
export default function ScreenLayout({
  title,
  showBack = false,
  rightAction = null,
  headerExtra = null,
  children,
}) {
  const { goBack } = useNavigation()

  return (
    <div className="flex h-full flex-col">
      {/* ヘッダー上端に safe-area を足して、iPhoneのノッチと重ならないようにする */}
      <header
        className="relative shrink-0 border-b border-line bg-void/85 backdrop-blur-sm"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex h-12 items-center px-2">
          <div className="flex w-16 justify-start">
            {showBack && (
              <button
                type="button"
                onClick={goBack}
                aria-label="戻る"
                className="-ml-1 flex h-9 w-9 items-center justify-center text-cyan active:opacity-60"
              >
                <ChevronLeftIcon size={22} strokeWidth={1.5} />
              </button>
            )}
          </div>

          <h1 className="font-hud flex-1 truncate text-center text-base font-semibold text-hud">
            {title}
          </h1>

          <div className="flex w-16 justify-end">{rightAction}</div>
        </div>
        {headerExtra}

        {/* ヘッダー下端の発光ライン。計器パネルの縁のような表現 */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(0,240,255,0.55), transparent)',
          }}
        />
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</main>
    </div>
  )
}

/** 画面内のセクションをまとめるパネル */
export function Card({ title, action = null, children, className = '' }) {
  return (
    <section
      className={`mb-3 rounded-panel border border-line bg-panel/80 p-4 ${className}`}
    >
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between border-b border-line pb-2">
          <h2 className="font-hud text-sm font-semibold tracking-wide text-hud">
            {title}
          </h2>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

/** 「まだ何もない」ことを伝えるプレースホルダー */
export function EmptyState({ children }) {
  return <p className="py-6 text-center text-sm text-hud-faint">{children}</p>
}

/** タップで次の画面へ進む、設定画面などで使う行 */
export function LinkRow({ label, value = null, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between border-b border-line py-3 text-left last:border-b-0 active:bg-panel-2"
    >
      <span className="text-sm text-hud">{label}</span>
      <span className="flex items-center gap-1 text-sm text-hud-faint">
        {value}
        <ChevronRightIcon size={16} strokeWidth={1.5} />
      </span>
    </button>
  )
}

/** 画面右下に浮かせる追加ボタン(spec 4.2 / 4.10) */
export function FloatingActionButton({ onClick, label = '追加' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="glow fixed right-5 z-20 flex h-13 w-13 items-center justify-center rounded-panel border border-cyan/70 bg-panel text-cyan active:bg-panel-2"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom) + 5rem)',
        height: '3.25rem',
        width: '3.25rem',
      }}
    >
      <PlusIcon size={24} strokeWidth={1.5} />
    </button>
  )
}

/**
 * 汎用ボタン。
 * variant: 'primary'(主要操作) | 'ghost'(控えめ) | 'danger'(破壊的操作)
 */
export function Button({
  children,
  onClick,
  variant = 'ghost',
  type = 'button',
  disabled = false,
  className = '',
}) {
  const styles = {
    primary:
      'border-electric/80 bg-electric/15 text-hud glow-sm [--glow-color:var(--color-electric)]',
    ghost: 'border-line bg-panel-2 text-hud-dim',
    danger: 'border-alert/70 bg-alert/10 text-alert',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`font-hud rounded-sharp border px-3 py-1.5 text-xs font-semibold tracking-wide transition-opacity active:opacity-70 disabled:opacity-40 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  )
}
