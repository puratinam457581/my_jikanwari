import { notifyApi } from '../db/index.js'
import { collectDueNotices } from './engine.js'
import { showSystemNotification } from './deliver.js'

/**
 * 通知の実行係。
 * 「出すべき通知を集める → OS通知を鳴らす → 出したことを記録する」をまとめる。
 */

// 同時に2回走ると同じ通知が二重に出てしまうので、実行中は後発を捨てる
let running = false

/**
 * 通知を1回ぶん処理し、実際に出した通知の配列を返す。
 * OS通知が許可されていない場合でも記録は残す(アプリ内のお知らせ一覧に出る)。
 */
export async function runNotifications(now = new Date()) {
  if (running) return []
  running = true
  try {
    const notices = await collectDueNotices(now)
    if (notices.length === 0) return []

    for (const notice of notices) {
      // 1件失敗しても残りは出したいので、ここでは待つだけで結果は見ない
      await showSystemNotification(notice)
    }

    await notifyApi.recordDelivered(notices)
    return notices
  } finally {
    running = false
  }
}

/** 通知設定画面の「テスト通知」用。記録には残さない */
export async function sendTestNotification() {
  return showSystemNotification({
    key: 'test',
    title: 'テスト通知',
    body: 'この通知が表示されていれば、端末の設定は問題ありません。',
  })
}
