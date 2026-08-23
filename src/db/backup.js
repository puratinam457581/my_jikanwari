import { getDB } from './database.js'
import { STORES, DB_VERSION } from './constants.js'

/**
 * 全ストアの中身を1つのオブジェクトにまとめて返す(spec 7.8)。
 * フェーズ1では中身確認用。JSONファイルとして書き出すUIはフェーズ10で作る。
 */
export async function exportAll() {
  const db = await getDB()
  const names = Object.values(STORES)
  const entries = await Promise.all(
    names.map(async (name) => [name, await db.getAll(name)]),
  )
  return {
    exportedAt: new Date().toISOString(),
    dbVersion: DB_VERSION,
    data: Object.fromEntries(entries),
  }
}
