import { getDB } from './database.js'
import { STORES } from './constants.js'
import { newId } from '../utils/id.js'

/** 指定学期の全コマ配置を返す */
export async function listSlots(semesterId) {
  const db = await getDB()
  return db.getAllFromIndex(STORES.timetableSlots, 'by-semester', semesterId)
}

/**
 * 時間割グリッドを描くための連想配列を返す。
 * キーは 'day-period' 形式(例: '1-3' = 月曜3限)。
 */
export async function getSlotMap(semesterId) {
  const slots = await listSlots(semesterId)
  const map = new Map()
  for (const slot of slots) {
    map.set(`${slot.day}-${slot.period}`, slot)
  }
  return map
}

/** 全学期のコマ配置を返す。設定変更で隠れるデータを探すのに使う */
export async function listAllSlots() {
  const db = await getDB()
  return db.getAll(STORES.timetableSlots)
}

/** 曜日・時限を指定して1コマぶんの配置を取得する */
export async function getSlot(semesterId, day, period) {
  const db = await getDB()
  return db.getFromIndex(STORES.timetableSlots, 'by-slot', [semesterId, day, period])
}

/**
 * コマに講義を配置する(spec 4.7: 1コマ1講義)。
 * 既に別の講義が入っている場合は上書きする。
 */
export async function assignCourse(semesterId, day, period, courseId) {
  const db = await getDB()
  const existing = await getSlot(semesterId, day, period)
  const slot = existing
    ? { ...existing, courseId }
    : { id: newId(), semesterId, day, period, courseId }
  await db.put(STORES.timetableSlots, slot)
  return slot
}

/**
 * コマから講義を外す(spec 4.3「コマから外す」)。
 * 配置だけを消し、講義マスタ自体は残す。
 */
export async function clearSlot(semesterId, day, period) {
  const db = await getDB()
  const existing = await getSlot(semesterId, day, period)
  if (existing) await db.delete(STORES.timetableSlots, existing.id)
}

/** 講義IDから、その講義が配置されている全コマを返す */
export async function listSlotsByCourse(courseId) {
  const db = await getDB()
  return db.getAllFromIndex(STORES.timetableSlots, 'by-course', courseId)
}

/**
 * 現在の設定では画面に出てこないコマ(=隠れているデータ)を返す。
 * spec 4.8「時限数を減らす/曜日を非表示にしてもデータは消さず、警告を出す」
 * ための判定材料として使う。
 */
export async function findHiddenSlots(semesterId, { maxPeriod, visibleDays }) {
  const slots = await listSlots(semesterId)
  return slots.filter(
    (slot) => slot.period > maxPeriod || visibleDays[slot.day] === false,
  )
}
