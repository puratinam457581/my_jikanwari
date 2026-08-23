import { getDB } from './database.js'
import { STORES } from './constants.js'
import { newId } from '../utils/id.js'

/** 全学期を「年度→前期/後期」の順で返す */
export async function listSemesters() {
  const db = await getDB()
  const all = await db.getAll(STORES.semesters)
  return all.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year
    return a.name === b.name ? 0 : a.name === '前期' ? -1 : 1
  })
}

export async function getSemester(id) {
  const db = await getDB()
  return db.get(STORES.semesters, id)
}

/** 現在アクティブな(時間割画面に表示中の)学期を返す */
export async function getActiveSemester() {
  const all = await listSemesters()
  return all.find((s) => s.isActive) ?? all[0] ?? null
}

export async function createSemester({ name, year, startDate, endDate }) {
  const db = await getDB()
  const semester = {
    id: newId(),
    name,
    year,
    startDate,
    endDate,
    isActive: false,
    createdAt: new Date().toISOString(),
  }
  await db.put(STORES.semesters, semester)
  return semester
}

export async function updateSemester(id, patch) {
  const db = await getDB()
  const current = await db.get(STORES.semesters, id)
  if (!current) throw new Error(`学期が見つかりません: ${id}`)
  const updated = { ...current, ...patch, id: current.id }
  await db.put(STORES.semesters, updated)
  return updated
}

/**
 * 表示する学期を切り替える(spec 4.9)。
 * 他の学期の isActive をすべて false にしてから、対象を true にする。
 * 過去学期のデータは削除しない。
 */
export async function setActiveSemester(id) {
  const db = await getDB()
  const tx = db.transaction(STORES.semesters, 'readwrite')
  const all = await tx.store.getAll()
  await Promise.all([
    ...all.map((s) => tx.store.put({ ...s, isActive: s.id === id })),
    tx.done,
  ])
}
