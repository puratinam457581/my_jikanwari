import { getDoc, getDocs, setDoc, writeBatch } from 'firebase/firestore'
import { db } from '../firebase/config.js'
import { STORES, DISPLAY_SETTINGS_KEY } from './constants.js'
import { userCollection, userDoc } from './firestoreBase.js'
import { seedDefaultsIfNeeded } from './seed.js'
import { slotId } from './timetable.js'
import { recordId } from './attendance.js'

/**
 * バックアップの書き出しと読み込み(spec 7.8)。
 *
 * FirestoreにもSDKの端末内キャッシュはあるが、それは「同期待ちのローカル控え」
 * であって長期保管用ではない。機種変更やアカウントの作り直しに備え、
 * IndexedDB時代と同じJSONバックアップの仕組みをそのまま残す。
 */

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

/**
 * ストアごとの「正しいドキュメントID」を、データの中身から組み立てる。
 *
 * 【重要】timetableSlots / attendanceRecords は、IndexedDB時代の
 * バックアップファイルでは「ランダムなid」を持っている。Firestore版では
 * 「学期・曜日・時限」「講義・日付」からIDを組み立てる方式(spec 4.7 /
 * 4.4の重複防止)に変えたため、バックアップのidをそのまま使わず、
 * 中身から正しいIDを毎回計算し直す。こうしておくと、
 * 同じコマ・同じ日付を指す行は自然に1つのドキュメントへ収束し、
 * 重複防止のための特別な分岐が要らなくなる。
 */
function computeDocId(storeName, row) {
  if (storeName === STORES.timetableSlots) return slotId(row.semesterId, row.day, row.period)
  if (storeName === STORES.attendanceRecords) return recordId(row.courseId, row.date)
  if (storeName === STORES.periodSettings) return String(row.period)
  if (storeName === STORES.displaySettings) return row.key ?? DISPLAY_SETTINGS_KEY
  return row.id
}

function hasValidKey(storeName, row) {
  const id = computeDocId(storeName, row)
  return id !== undefined && id !== null && id !== 'undefined' && id !== 'null'
}

/** `id` フィールドを持つストアの一覧(periodSettingsは`period`、displaySettingsは`key`が識別子) */
const STORES_WITH_ID_FIELD = new Set([
  STORES.semesters,
  STORES.courses,
  STORES.timetableSlots,
  STORES.attendanceRecords,
  STORES.schedules,
])

/**
 * 書き込む内容の `id` フィールドを、実際のドキュメントIDと必ず一致させる。
 *
 * 【なぜ必要か】旧IndexedDB版のバックアップは、timetableSlots/attendanceRecordsに
 * ランダムな`id`を持っている。そのまま書き込むと、ドキュメントIDは新方式
 * (`学期ID_曜日_時限` 等)なのに中身の`id`フィールドだけ古いランダム値が残り、
 * 両者が食い違ってしまう。書き込み直前に必ずここで揃える。
 */
function withCorrectId(storeName, row, id) {
  if (!STORES_WITH_ID_FIELD.has(storeName)) return row
  return { ...row, id }
}

/** Firestoreの書き込みバッチは1回500件までのため、安全に分割して実行する */
const BATCH_LIMIT = 500

async function commitInChunks(operations) {
  for (let i = 0; i < operations.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db)
    for (const op of operations.slice(i, i + BATCH_LIMIT)) {
      if (op.type === 'set') batch.set(op.ref, op.data)
      else batch.delete(op.ref)
    }
    await batch.commit()
  }
}

/** 全ストアの中身を1つのオブジェクトにまとめて返す(spec 7.8) */
export async function exportAll() {
  const names = Object.values(STORES)
  const entries = await Promise.all(
    names.map(async (name) => {
      const snap = await getDocs(userCollection(name))
      return [name, snap.docs.map((d) => d.data())]
    }),
  )
  return {
    app: 'jikanwari',
    exportedAt: new Date().toISOString(),
    dbVersion: 2, // Firestore移行後のバックアップ形式(フェーズ13)
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

/**
 * バックアップを取り込む(spec 7.8)。
 *
 * mode:
 *   'replace' … 既存データをすべて消してから入れ替える(バックアップからの復元)
 *   'merge'   … 既存データはそのまま残し、無いものだけ足す
 *
 * 【仕様に無い判断】マージで同じドキュメントがぶつかった場合は「既存を残す」。
 * マージは"足す"操作であって、今使っているデータを古い控えで上書きしてしまうと
 * 取り返しがつかないため、安全側に倒している。
 */
export async function importAll(payload, { mode = 'replace' } = {}) {
  validatePayload(payload)

  const names = Object.values(STORES)
  const result = { added: 0, replaced: 0, skipped: 0 }

  if (mode === 'replace') {
    // 先に既存ドキュメントを全部消してから、バックアップの中身を書き込む
    const existingSnaps = await Promise.all(names.map((name) => getDocs(userCollection(name))))
    const deletions = existingSnaps.flatMap((snap) =>
      snap.docs.map((d) => ({ type: 'delete', ref: d.ref })),
    )
    await commitInChunks(deletions)

    const writes = []
    for (const name of names) {
      const rows = Array.isArray(payload.data[name]) ? payload.data[name] : []
      for (const row of rows) {
        if (!hasValidKey(name, row)) {
          result.skipped += 1
          continue
        }
        const id = computeDocId(name, row)
        writes.push({ type: 'set', ref: userDoc(name, id), data: withCorrectId(name, row, id) })
        result.replaced += 1
      }
    }
    await commitInChunks(writes)
  } else {
    // --- マージ ---
    const writes = []
    for (const name of names) {
      const rows = Array.isArray(payload.data[name]) ? payload.data[name] : []
      for (const row of rows) {
        if (!hasValidKey(name, row)) {
          result.skipped += 1
          continue
        }
        const id = computeDocId(name, row)
        // eslint-disable-next-line no-await-in-loop
        const existing = await getDoc(userDoc(name, id))
        if (existing.exists()) {
          result.skipped += 1
          continue
        }
        writes.push({ type: 'set', ref: userDoc(name, id), data: withCorrectId(name, row, id) })
        result.added += 1
      }
    }
    await commitInChunks(writes)
  }

  // 全置換で設定が空になった場合に備え、初期値を入れ直す(既にあれば何もしない)
  await seedDefaultsIfNeeded()

  return result
}

/** 最後にバックアップを書き出した日時を覚えておく(spec 8-4 のバックアップ促し用) */
export async function markBackedUp(at = new Date()) {
  const snap = await getDoc(userDoc(STORES.displaySettings, DISPLAY_SETTINGS_KEY))
  const settings = snap.exists() ? snap.data() : {}
  await setDoc(userDoc(STORES.displaySettings, DISPLAY_SETTINGS_KEY), {
    ...settings,
    key: DISPLAY_SETTINGS_KEY,
    lastBackupAt: at.toISOString(),
  })
}
