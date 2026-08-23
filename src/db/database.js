import { deleteDB, openDB } from 'idb'
import {
  DB_NAME,
  DB_VERSION,
  STORES,
  DEFAULT_PERIOD_SETTINGS,
  DEFAULT_VISIBLE_DAYS,
  DISPLAY_SETTINGS_KEY,
} from './constants.js'
import { newId } from '../utils/id.js'
import { getAcademicYear, guessSemesterName } from '../utils/date.js'

/**
 * IndexedDB への接続を1つだけ作って使い回す。
 * getDB() を何度呼んでも、実際に開く処理は最初の1回だけ動く。
 */
let dbPromise = null

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        createStores(db)
      },
      blocked() {
        console.warn('[db] 他のタブが古いバージョンのDBを開いているため更新できません')
      },
      blocking() {
        console.warn('[db] DBのバージョン更新のため、このタブの接続を閉じます')
      },
    }).then(async (db) => {
      await seedDefaults(db)
      return db
    })
  }
  return dbPromise
}

/**
 * ストア(テーブル)とインデックス(検索用の索引)を作る。
 * この関数はDBが新規作成されたとき/バージョンが上がったときにだけ呼ばれる。
 */
function createStores(db) {
  // --- 学期 (spec 7.1) ---
  if (!db.objectStoreNames.contains(STORES.semesters)) {
    const store = db.createObjectStore(STORES.semesters, { keyPath: 'id' })
    store.createIndex('by-year', 'year')
  }

  // --- 講義マスタ (spec 7.2) ---
  if (!db.objectStoreNames.contains(STORES.courses)) {
    const store = db.createObjectStore(STORES.courses, { keyPath: 'id' })
    // 学期ごとに講義を絞り込むため(spec 4.9: 講義マスタも学期ごとに独立)
    store.createIndex('by-semester', 'semesterId')
  }

  // --- 時間割配置 (spec 7.3) ---
  if (!db.objectStoreNames.contains(STORES.timetableSlots)) {
    const store = db.createObjectStore(STORES.timetableSlots, { keyPath: 'id' })
    store.createIndex('by-semester', 'semesterId')
    store.createIndex('by-course', 'courseId')
    // 「同じ学期・曜日・時限」は1件だけ(spec 4.7: 1コマ1講義)。
    // unique: true にしておくと、二重登録をDB側が弾いてくれる。
    store.createIndex('by-slot', ['semesterId', 'day', 'period'], { unique: true })
  }

  // --- 出欠記録 (spec 7.4) ---
  if (!db.objectStoreNames.contains(STORES.attendanceRecords)) {
    const store = db.createObjectStore(STORES.attendanceRecords, { keyPath: 'id' })
    store.createIndex('by-course', 'courseId')
    // 「同じ講義の同じ日付」の記録を探すため(spec 4.4: 重複登録の確認に使う)
    store.createIndex('by-course-date', ['courseId', 'date'])
  }

  // --- 課題・スケジュール (spec 7.5) ---
  if (!db.objectStoreNames.contains(STORES.schedules)) {
    const store = db.createObjectStore(STORES.schedules, { keyPath: 'id' })
    store.createIndex('by-course', 'courseId')
    store.createIndex('by-due', 'dueAt')
  }

  // --- 時限設定 (spec 7.6) ---
  // 時限番号そのものをキーにする(1限、2限…)
  if (!db.objectStoreNames.contains(STORES.periodSettings)) {
    db.createObjectStore(STORES.periodSettings, { keyPath: 'period' })
  }

  // --- 表示設定 (spec 7.7) ---
  // 設定は1件しか存在しないので、固定キー 'default' の1レコードで持つ
  if (!db.objectStoreNames.contains(STORES.displaySettings)) {
    db.createObjectStore(STORES.displaySettings, { keyPath: 'key' })
  }
}

/**
 * 初回起動時のデフォルトデータを入れる。
 * 既にデータがある場合は何もしない(何度呼んでも安全)。
 */
async function seedDefaults(db) {
  // 時限設定: 6時限ぶんの初期時刻
  if ((await db.count(STORES.periodSettings)) === 0) {
    const tx = db.transaction(STORES.periodSettings, 'readwrite')
    await Promise.all([
      ...DEFAULT_PERIOD_SETTINGS.map((p) => tx.store.put({ ...p })),
      tx.done,
    ])
  }

  // 表示設定: 月〜土を表示、必要単位数は未設定(null)
  if ((await db.count(STORES.displaySettings)) === 0) {
    await db.put(STORES.displaySettings, {
      key: DISPLAY_SETTINGS_KEY,
      visibleDays: [...DEFAULT_VISIBLE_DAYS],
      requiredCredits: null,
      theme: 'dark', // 表示テーマ(デザイン仕様6.5)
    })
  }

  // 学期: 今日の日付から「◯年度 前期/後期」を推定して1件作る
  if ((await db.count(STORES.semesters)) === 0) {
    const today = new Date()
    const year = getAcademicYear(today)
    const name = guessSemesterName(today)
    const isFirst = name === '前期'
    await db.put(STORES.semesters, {
      id: newId(),
      name,
      year,
      startDate: isFirst ? `${year}-04-01` : `${year}-10-01`,
      endDate: isFirst ? `${year}-09-30` : `${year + 1}-03-31`,
      isActive: true,
      createdAt: new Date().toISOString(),
    })
  }
}

/**
 * 【開発用】DBを削除して初期状態に戻す。
 * データがすべて消えるため、呼び出す側で必ず確認を取ること。
 */
export async function resetDatabase() {
  const db = await getDB()
  db.close()
  dbPromise = null
  await deleteDB(DB_NAME)
}
