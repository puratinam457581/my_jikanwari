import { useCallback, useEffect, useState } from 'react'
import { BellIcon, CloseIcon } from '../components/icons.jsx'
import { useNavigation } from '../navigation/NavigationContext.jsx'
import { runNotifications } from './runner.js'

/** 通知を確認する間隔(1分)。時限や締切は分単位なのでこれで足りる */
const CHECK_INTERVAL_MS = 60 * 1000

/** アプリ内バナーを自動で閉じるまでの時間 */
const TOAST_TIMEOUT_MS = 12 * 1000

/**
 * 通知の常駐処理と、アプリを開いている間に出るバナー(spec 5章)。
 *
 * 【いつ通知を確認するか】
 *   - アプリを開いた直後 … 閉じている間に出せなかった通知をまとめて出す
 *   - 1分ごと … 開いたまま時刻をまたいだときのため
 *   - 画面に戻ってきたとき … 他のアプリから切り替えて戻ってきた場合
 *
 * OS通知が許可されていない(または端末が非対応の)場合でも、
 * このバナーとお知らせ一覧には残るので、通知の内容は必ず確認できる。
 */
export default function NotificationCenter() {
  const { push } = useNavigation()
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((key) => {
    setToasts((prev) => prev.filter((t) => t.key !== key))
  }, [])

  useEffect(() => {
    let alive = true

    const check = () => {
      runNotifications()
        .then((notices) => {
          if (!alive || notices.length === 0) return
          setToasts((prev) => [...notices, ...prev].slice(0, 3))
        })
        .catch((error) => console.error('通知の確認に失敗しました', error))
    }

    check()
    const timer = setInterval(check, CHECK_INTERVAL_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') check()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      alive = false
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  // 表示中のバナーを順に自動で閉じる
  useEffect(() => {
    if (toasts.length === 0) return undefined
    const timer = setTimeout(() => {
      setToasts((prev) => prev.slice(0, -1))
    }, TOAST_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [toasts])

  if (toasts.length === 0) return null

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-40 flex flex-col gap-2 p-3"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
    >
      {toasts.map((notice) => (
        <div
          key={notice.key}
          role="status"
          className="glow-sm pointer-events-auto flex items-start gap-2 rounded-panel border border-cyan bg-panel px-3 py-2.5 shadow-lg"
        >
          <BellIcon size={16} strokeWidth={1.6} className="mt-0.5 shrink-0 text-cyan" />
          <button
            type="button"
            onClick={() => {
              dismiss(notice.key)
              push('notificationSettings')
            }}
            className="min-w-0 flex-1 text-left"
          >
            <p className="font-hud truncate text-xs font-semibold text-hud">{notice.title}</p>
            <p className="mt-0.5 line-clamp-3 text-[11px] leading-relaxed whitespace-pre-line text-hud-dim">
              {notice.body}
            </p>
          </button>
          <button
            type="button"
            onClick={() => dismiss(notice.key)}
            aria-label="閉じる"
            className="-mr-1 shrink-0 p-1 text-hud-faint active:opacity-60"
          >
            <CloseIcon size={14} strokeWidth={1.8} />
          </button>
        </div>
      ))}
    </div>
  )
}
