import { useEffect, useState, useSyncExternalStore } from 'react'
import { CloseIcon, OfflineIcon, RefreshIcon } from '../components/icons.jsx'
import {
  applyUpdate,
  dismissOfflineReady,
  dismissUpdate,
  getState,
  subscribe,
} from './updateBus.js'

/** 「オフラインで使えるようになりました」を自動で閉じるまでの時間 */
const OFFLINE_TOAST_MS = 5000

/**
 * Service Worker の状態を画面下部に知らせる帯(spec 11章 フェーズ9)。
 *   - 新しいバージョンがある → 「更新する」を押すと再読み込みして切り替わる
 *   - 初回のキャッシュが済んだ → オフラインでも使えることを一度だけ知らせる
 */
export default function PwaBanner() {
  const { needRefresh, offlineReady } = useSyncExternalStore(subscribe, getState, getState)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (!offlineReady) return undefined
    const timer = setTimeout(dismissOfflineReady, OFFLINE_TOAST_MS)
    return () => clearTimeout(timer)
  }, [offlineReady])

  if (needRefresh) {
    return (
      <Banner>
        <RefreshIcon size={16} strokeWidth={1.6} className="shrink-0 text-cyan" />
        <span className="min-w-0 flex-1 text-[11px] leading-relaxed text-hud">
          新しいバージョンがあります。
          <span className="text-hud-faint">更新すると画面が読み込み直されます。</span>
        </span>
        <button
          type="button"
          disabled={updating}
          onClick={() => {
            setUpdating(true)
            applyUpdate().catch((error) => {
              console.error(error)
              setUpdating(false)
            })
          }}
          className="btn btn-primary shrink-0"
        >
          {updating ? '更新中...' : '更新する'}
        </button>
        <button
          type="button"
          onClick={dismissUpdate}
          aria-label="あとで"
          className="shrink-0 p-1 text-hud-faint active:opacity-60"
        >
          <CloseIcon size={14} strokeWidth={1.8} />
        </button>
      </Banner>
    )
  }

  if (offlineReady) {
    return (
      <Banner>
        <OfflineIcon size={16} strokeWidth={1.6} className="shrink-0 text-cyan" />
        <span className="flex-1 text-[11px] text-hud">
          オフラインでも使えるようになりました
        </span>
      </Banner>
    )
  }

  return null
}

function Banner({ children }) {
  return (
    <div
      role="status"
      className="shrink-0 border-t border-cyan/40 bg-panel px-3 py-2"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)' }}
    >
      <div className="flex items-center gap-2">{children}</div>
    </div>
  )
}
