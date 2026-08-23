import { registerSW } from 'virtual:pwa-register'
import { setNeedRefresh, setOfflineReady, setUpdater } from './updateBus.js'

/**
 * Service Worker を登録する(spec 11章 フェーズ9)。
 *
 * これが登録されると、アプリのファイル一式が端末にキャッシュされ、
 * ネットワークが無くても起動できるようになる(絶対制約4「オフラインで完全動作」)。
 *
 * 'virtual:pwa-register' は vite-plugin-pwa がビルド時に用意する仮想モジュールで、
 * 実体のファイルは無い。そのためこのファイルは main.jsx からのみ読み込む。
 */

/** 更新を確認しに行く間隔(1時間) */
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000

export function registerPWA() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      // 勝手に再読み込みせず、画面上で知らせて選んでもらう
      setNeedRefresh(true)
    },
    onOfflineReady() {
      setOfflineReady(true)
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return
      setInterval(() => {
        registration.update().catch(() => {
          // オフライン時は確認できないが、それは正常な動作なので何もしない
        })
      }, UPDATE_CHECK_INTERVAL_MS)
    },
    onRegisterError(error) {
      console.error('Service Worker の登録に失敗しました', error)
    },
  })

  setUpdater(updateSW)
}
