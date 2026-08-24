import { getDB, seedDefaults } from './database.js'
import { STORES, DB_VERSION, DISPLAY_SETTINGS_KEY } from './constants.js'

/**
 * バックアップの書き出しと読み込み(spec 7.8)。
 *
 * IndexedDB のデータは、ブラウザの都合(容量不足・長期間未使用など)で
 * 消えることがある。クラウド同期を持たないこのアプリでは、
 * このJSONファイルだけが唯一のデータの控えになる。
 */

/** ストアごとの「主キー」の場所。マージ時に既存データを探すのに使う */
const KEY_PATH = {
  [STORES.semesters]: 'id',
  [STORES.courses]: 'id',
  [STORES.timetableSlots]: 'id',
  [STORES.attendanceRecords]: 'id',
  [STORES.schedules]: 'id',
  [STORES.periodSettings]: 'period',
  [STORES.displaySettings]: 'key',
}

/** 画面に出すときのストアの呼び名 */
export const STORE_LABELS = {
  [STORES.semesters]: '学期',
  [STORES.courses]: '講義',
  [STORES.timetableSlots]: '時間割の配置',
  [STORES.attendanceRecords]: '出欠記録',
  [STORES.schedules]: 'スケジュール',
  [STORES.periodSettings]: '時限設定',
  [STORES.displaySettings]: '表示設定',
}

/** 全ストアの中身を1つのオブジェクトにまとめて返す(spec 7.8) */
export async function exportAll() {
  const db = await getDB()
  const names = Object.values(STORES)
  const entries = await Promise.all(names.map(async (name) => [name, await db.getAll(name)]))
  return {
    app: 'jikanwari',
    exportedAt: new Date().toISOString(),
    dbVersion: DB_VERSION,
    data: Object.fromEntries(entries),
  }
}

/** バックアップの中身の件数を数える(取り込む前の確認用) */
export function summarize(payload) {
  const data = payload?.data ?? {}
  return Object.values(STORES).map((name) => ({
    store: name,
    label: STORE_LABELS[name],
    count: Array.isArray(data[name]) ? data[name].length : 0,
  }))
}

/**
 * 読み込んだJSONがバックアップとして扱える形か調べる。
 * 問題があれば、何が駄目なのかを日本語で投げる。
 */
export function validatePayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('バックアップの形式ではありません(中身がオブジェクトではありません)')
  }
  if (!payload.data || typeof payload.data !== 'object') {
    throw new Error('バックアップの形式ではありません(data が見つかりません)')
  }

  const known = Object.values(STORES)
  const found = known.filter((name) => Array.isArray(payload.data[name]))
  if (found.length === 0) {
    throw new Error('このアプリのバックアップではないようです(既知のデータが1つもありません)')
  }

  for (const name of known) {
    const rows = payload.data[name]
    if (rows !== undefined && !Array.isArray(rows)) {
      throw new Error(`${STORE_LABELS[name]}のデータが配列ではありません`)
    }
  }
  return true
}

/** 1件のデータから主キーを取り出す */
function keyOf(store, row) {
  const value = row?.[KEY_PATH[store]]
  return value === undefined || value === null ? null : value
}

/**
 * バックアップを取り込む(spec 7.8)。
 *
 * mode:
 *   'replace' … 既存データをすべて消してから入れ替える(バックアップからの復元)
 *   'merge'   … 既存データはそのまま残し、無いものだけ足す
 *
 * 【仕様に無い判断】マージで同じIDのデータがぶつかった場合は「既存を残す」。
 * マージは"足す"操作であって、今使っているデータを古い控えで上書きしてしまうと
 * 取り返しがつかないため、安全側に倒している。
 */
export async function importAll(payload, { mode = 'replace' } = {}) {
  validatePayload(payload)

  const db = await getDB()
  const names = Object.values(STORES)
  const result = { added: 0, replaced: 0, skipped: 0 }

  const tx = db.transaction(names, 'readwrite')

  for (const name of names) {
    const store = tx.objectStore(name)
    const rows = Array.isArray(payload.data[name]) ? payload.data[name] : []

    if (mode === 'replace') {
      await store.clear()
      for (const row of rows) {
        if (keyOf(name, row) === null) {
          result.skipped += 1
          continue
        }
        await store.put(row)
        result.replaced += 1
      }
      continue
    }

    // --- マージ ---
    for (const row of rows) {
      const key = keyOf(name, row)
      if (key === null) {
        result.skipped += 1
        continue
      }
      if (await store.get(key)) {
        result.skipped += 1
        continue
      }
      // 「同じ学期・曜日・時限」は1コマ1講義(spec 4.7)。
      // IDは違うが同じコマを指す配置は、既存を優先して取り込まない。
      if (name === STORES.timetableSlots) {
        const occupied = await store
          .index('by-slot')
          .get([row.semesterId, row.day, row.period])
        if (occupied) {
          result.skipped += 1
          continue
        }
      }
      await store.put(row)
      result.added += 1
    }
  }

  await tx.done

  // 全置換で設定が空になった場合に備え、初期値を入れ直す(既にあれば何もしない)
  await seedDefaults(db)

  return result
}

/** 最後にバックアップを書き出した日時を覚えておく(spec 8-4 のバックアップ促し用) */
export async function markBackedUp(at = new Date()) {
  const db = await getDB()
  const settings = await db.get(STORES.displaySettings, DISPLAY_SETTINGS_KEY)
  await db.put(STORES.displaySettings, {
    ...settings,
    key: DISPLAY_SETTINGS_KEY,
    lastBackupAt: at.toISOString(),
  })
}
