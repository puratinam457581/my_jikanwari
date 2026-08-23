/**
 * Service Worker の状態を、画面側に伝えるための小さな入れ物。
 *
 * 登録処理(register.js)は Vite が用意する仮想モジュールを読み込むため、
 * 画面のコンポーネントから直接触ると通常の JavaScript として実行できなくなる。
 * そこで、状態だけをこのファイルに置き、両者を切り離している。
 */

let state = {
  /** 新しいバージョンが用意できている */
  needRefresh: false,
  /** オフラインで動く準備ができた(初回のキャッシュ完了) */
  offlineReady: false,
}

const listeners = new Set()
let updater = null

function emit(patch) {
  state = { ...state, ...patch }
  for (const listener of listeners) listener()
}

export function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** useSyncExternalStore から呼ばれる。中身が変わらない限り同じ参照を返す */
export function getState() {
  return state
}

export function setNeedRefresh(value) {
  emit({ needRefresh: value })
}

export function setOfflineReady(value) {
  emit({ offlineReady: value })
}

/** 更新を適用する関数(registerSW が返すもの)を預かる */
export function setUpdater(fn) {
  updater = fn
}

/** 新しいバージョンに切り替えて再読み込みする */
export async function applyUpdate() {
  if (!updater) return
  await updater(true)
}

/** 更新の知らせを閉じる(次回起動時にまた知らせる) */
export function dismissUpdate() {
  emit({ needRefresh: false })
}

export function dismissOfflineReady() {
  emit({ offlineReady: false })
}
