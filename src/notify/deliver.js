/**
 * 通知を実際に鳴らす部分。
 *
 * 【iPhoneでの制約(重要)】
 * iOS Safari には「アプリが閉じている間に、決まった時刻で通知を鳴らす」仕組みが無い。
 *   - Web Push は通知を送るサーバーが必要 → バックエンドを立てない方針のため使えない
 *   - 通知の予約(Notification Triggers)や定期バックグラウンド同期は Safari 非対応
 *   - Service Worker はアプリを閉じるとすぐ停止し、タイマーを持ち続けられない
 * そのため通知は「アプリを開いている間」と「アプリを開いた瞬間(見逃した分をまとめて)」
 * の2つのタイミングで鳴る。この前提は README とアプリ内の通知設定画面にも明記している。
 *
 * また、通知はホーム画面に追加したPWAかつHTTPS(またはlocalhost)でのみ許可される。
 */

const ICON = 'icons/icon-192.png'

/** この端末・この開き方で通知が使えるか */
export function isNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window
}

/** 'granted' | 'denied' | 'default' | 'unsupported' */
export function getPermission() {
  if (!isNotificationSupported()) return 'unsupported'
  return Notification.permission
}

/**
 * 通知の許可を求める。
 * iOS ではボタンのタップなど、ユーザー操作の中から呼ばないと失敗する。
 */
export async function requestPermission() {
  if (!isNotificationSupported()) return 'unsupported'
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

/** ホーム画面から起動したPWAとして開かれているか */
export function isStandalone() {
  if (typeof window === 'undefined') return false
  if (window.navigator?.standalone === true) return true // iOS 独自の判定
  return window.matchMedia?.('(display-mode: standalone)').matches === true
}

/** iPhone / iPad か */
export function isIOS() {
  if (typeof navigator === 'undefined') return false
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPadOS はデスクトップ版Safariを名乗るため、タッチ対応のMacとして判定する
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

/**
 * OSの通知を1件出す。出せたら true。
 * iOS では Service Worker 経由でしか通知を出せないため、そちらを優先する。
 */
export async function showSystemNotification({ title, body, key }) {
  if (getPermission() !== 'granted') return false
  try {
    const registration = await navigator.serviceWorker?.getRegistration()
    if (registration?.showNotification) {
      await registration.showNotification(title, {
        body,
        tag: key,
        icon: ICON,
        badge: ICON,
      })
      return true
    }
    // Service Worker が使えない環境(PCのブラウザなど)向けの控え
    // eslint-disable-next-line no-new
    new Notification(title, { body, tag: key, icon: ICON })
    return true
  } catch (error) {
    console.error('通知を出せませんでした', error)
    return false
  }
}
