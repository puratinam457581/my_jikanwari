import {
  DEFAULT_NOTIFICATION_SETTINGS,
  NOTICE_LOG_LIMIT,
  NOTICE_SENT_LIMIT,
} from './constants.js'
import { getDisplaySettings, updateDisplaySettings } from './settings.js'

/**
 * 通知まわりの保存データ(spec 5章)。
 *
 * 通知は「設定(どれを出すか)」と「実績(どれを出したか)」の2つを覚えておく必要がある。
 * 実績を残さないと、アプリを開くたびに同じ通知が何度も出てしまうため。
 *
 * どちらも displaySettings の1レコードに同居させている。専用のストアを足すと
 * IndexedDB のバージョンを上げることになり、既存データの移行が必要になるため、
 * 件数の少ないこのデータは既存レコードに入れる方が安全だと判断した。
 */

const EMPTY_STATE = { sentKeys: [], log: [] }

/** どの通知をONにしているか */
export async function getNotificationSettings() {
  const settings = await getDisplaySettings()
  return { ...DEFAULT_NOTIFICATION_SETTINGS, ...(settings.notifications ?? {}) }
}

/** 通知の種類ごとにON/OFFを切り替える */
export async function setNotificationEnabled(kind, enabled) {
  const current = await getNotificationSettings()
  await updateDisplaySettings({ notifications: { ...current, [kind]: enabled } })
  return { ...current, [kind]: enabled }
}

/** 送信済みキーとアプリ内お知らせの履歴 */
export async function getNoticeState() {
  const settings = await getDisplaySettings()
  const state = settings.notifyState ?? EMPTY_STATE
  return {
    sentKeys: Array.isArray(state.sentKeys) ? state.sentKeys : [],
    log: Array.isArray(state.log) ? state.log : [],
  }
}

/**
 * 通知を出したことを記録する。
 * OS通知が出せたかどうかに関わらず記録する。出せなかった場合も
 * アプリ内のお知らせ一覧には残っており、そちらが控えの役割を果たすため。
 */
export async function recordDelivered(notices) {
  if (notices.length === 0) return getNoticeState()
  const state = await getNoticeState()

  // 新しいものを先頭に積み、上限を超えた古いものから捨てる
  const sentKeys = [...notices.map((n) => n.key), ...state.sentKeys].slice(0, NOTICE_SENT_LIMIT)
  const log = [
    ...notices.map((n) => ({
      key: n.key,
      kind: n.kind,
      title: n.title,
      body: n.body,
      at: n.at,
    })),
    ...state.log,
  ].slice(0, NOTICE_LOG_LIMIT)

  await updateDisplaySettings({ notifyState: { sentKeys, log } })
  return { sentKeys, log }
}

/** アプリ内お知らせの一覧(新しい順) */
export async function listNotices() {
  const state = await getNoticeState()
  return state.log
}

/**
 * お知らせの履歴を消す。
 * 送信済みキーは残す。消してしまうと、同じ通知がもう一度出てしまうため。
 */
export async function clearNotices() {
  const state = await getNoticeState()
  await updateDisplaySettings({ notifyState: { ...state, log: [] } })
}

/**
 * 通知の実績をすべて消す(開発・確認用)。
 * これを実行すると、条件を満たしている通知がもう一度出る。
 */
export async function resetNoticeState() {
  await updateDisplaySettings({ notifyState: { ...EMPTY_STATE } })
}
