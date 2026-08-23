import { ChevronLeftIcon } from './icons.jsx'
import { useNavigation } from '../navigation/NavigationContext.jsx'

/**
 * 全画面で共通のレイアウト。
 * 上部にヘッダーを固定し、その下を縦スクロール領域にする。
 *
 * props:
 *   title      : ヘッダー中央の見出し
 *   showBack   : 左上に戻る矢印を出すか
 *   rightAction: ヘッダー右側に置く要素(ボタンなど)
 *   headerExtra: ヘッダー下に固定表示したい要素(曜日ヘッダー行など)
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
      {/* ヘッダー上端に safe-area を足して、iPhoneのノッチ/ステータスバーと重ならないようにする */}
      <header
        className="shrink-0 border-b border-neutral-200 bg-white"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex h-12 items-center px-2">
          <div className="flex w-16 justify-start">
            {showBack && (
              <button
                type="button"
                onClick={goBack}
                aria-label="戻る"
                className="-ml-1 flex h-9 w-9 items-center justify-center rounded-full text-neutral-700 active:bg-neutral-100"
              >
                <ChevronLeftIcon width={22} height={22} />
              </button>
            )}
          </div>

          <h1 className="flex-1 truncate text-center text-base font-bold text-neutral-800">
            {title}
          </h1>

          <div className="flex w-16 justify-end">{rightAction}</div>
        </div>
        {headerExtra}
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</main>
    </div>
  )
}

/** 画面内のセクションをまとめるカード */
export function Card({ title, action = null, children, className = '' }) {
  return (
    <section className={`mb-3 rounded-2xl bg-white p-4 shadow-sm ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-neutral-800">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

/** 「まだ何もない」ことを伝えるプレースホルダー */
export function EmptyState({ children }) {
  return (
    <p className="py-6 text-center text-sm text-neutral-400">{children}</p>
  )
}

/** タップで次の画面へ進む、設定画面などで使う行 */
export function LinkRow({ label, value = null, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between border-b border-neutral-100 py-3 text-left last:border-b-0 active:bg-neutral-50"
    >
      <span className="text-sm text-neutral-800">{label}</span>
      <span className="flex items-center gap-1 text-sm text-neutral-400">
        {value}
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 5l7 7-7 7" />
        </svg>
      </span>
    </button>
  )
}

/** 画面右下に浮かせる丸い追加ボタン(spec 4.2 / 4.10) */
export function FloatingActionButton({ onClick, label = '追加' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="fixed right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-sky-500 text-white shadow-lg active:bg-sky-600"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5rem)' }}
    >
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>
  )
}
