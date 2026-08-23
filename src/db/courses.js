import { getDB } from './database.js'
import { STORES, DEFAULT_COLOR } from './constants.js'
import { newId } from '../utils/id.js'

/** 講義1件の初期値。フォーム未入力の項目をここで埋める */
function buildCourse(input) {
  return {
    id: newId(),
    semesterId: input.semesterId,
    name: input.name ?? '',
    teacher: input.teacher ?? '',
    room: input.room ?? '',
    credits: input.credits ?? 0,
    category: input.category ?? '', // 科目区分(必修/選択 など)
    syllabusUrl: input.syllabusUrl ?? '',
    color: input.color ?? DEFAULT_COLOR,
    attendanceEnabled: input.attendanceEnabled ?? true, // 出席管理の対象か
    absenceLimit: input.absenceLimit ?? 0, // 欠席上限回数
    creditEarned: input.creditEarned ?? false, // 単位取得済みか
    memo: input.memo ?? '',
    createdAt: new Date().toISOString(),
  }
}

/** 指定学期の講義を名前順で返す */
export async function listCourses(semesterId) {
  const db = await getDB()
  const list = await db.getAllFromIndex(STORES.courses, 'by-semester', semesterId)
  return list.sort((a, b) => a.name.localeCompare(b.name, 'ja'))
}

export async function getCourse(id) {
  const db = await getDB()
  return db.get(STORES.courses, id)
}

export async function createCourse(input) {
  if (!input.semesterId) throw new Error('semesterId は必須です')
  const db = await getDB()
  const course = buildCourse(input)
  await db.put(STORES.courses, course)
  return course
}

export async function updateCourse(id, patch) {
  const db = await getDB()
  const current = await db.get(STORES.courses, id)
  if (!current) throw new Error(`講義が見つかりません: ${id}`)
  const updated = { ...current, ...patch, id: current.id }
  await db.put(STORES.courses, updated)
  return updated
}

/**
 * 講義を削除する。関連データもまとめて整理する:
 *   - 時間割の配置        → 削除(コマが空になる)
 *   - 出欠記録            → 削除(講義がないと意味を持たないため)
 *   - 紐づくスケジュール  → 削除せず、講義との紐付けだけ外す(データ消失を避ける)
 */
export async function deleteCourse(id) {
  const db = await getDB()
  const tx = db.transaction(
    [STORES.courses, STORES.timetableSlots, STORES.attendanceRecords, STORES.schedules],
    'readwrite',
  )

  const slots = tx.objectStore(STORES.timetableSlots)
  const records = tx.objectStore(STORES.attendanceRecords)
  const schedules = tx.objectStore(STORES.schedules)

  const [relatedSlots, relatedRecords, relatedSchedules] = await Promise.all([
    slots.index('by-course').getAll(id),
    records.index('by-course').getAll(id),
    schedules.index('by-course').getAll(id),
  ])

  await Promise.all([
    tx.objectStore(STORES.courses).delete(id),
    ...relatedSlots.map((s) => slots.delete(s.id)),
    ...relatedRecords.map((r) => records.delete(r.id)),
    ...relatedSchedules.map((s) => schedules.put({ ...s, courseId: null })),
    tx.done,
  ])
}
