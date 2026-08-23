import { getDB } from './database.js'
import { STORES, ATTENDANCE_TYPES } from './constants.js'
import { newId } from '../utils/id.js'

/** 指定講義の出欠記録を、日付の新しい順で返す */
export async function listRecordsByCourse(courseId) {
  const db = await getDB()
  const list = await db.getAllFromIndex(STORES.attendanceRecords, 'by-course', courseId)
  return list.sort((a, b) => b.date.localeCompare(a.date))
}

/** 指定講義の出席数・欠席数を数える(spec 4.3 の出欠管理カード用) */
export async function countAttendance(courseId) {
  const records = await listRecordsByCourse(courseId)
  return {
    present: records.filter((r) => r.type === ATTENDANCE_TYPES.PRESENT).length,
    absent: records.filter((r) => r.type === ATTENDANCE_TYPES.ABSENT).length,
    total: records.length,
  }
}

/**
 * 複数の講義の欠席数をまとめて数える。
 * 時間割画面で、上限に到達した講義に警告を出すために使う(spec 4.5)。
 * 1講義ずつ問い合わせると遅くなるため、1つのトランザクションでまとめて読む。
 */
export async function countAbsencesByCourse(courseIds) {
  const result = new Map()
  if (courseIds.length === 0) return result

  const db = await getDB()
  const tx = db.transaction(STORES.attendanceRecords, 'readonly')
  const index = tx.store.index('by-course')

  const entries = await Promise.all(
    courseIds.map(async (id) => {
      const records = await index.getAll(id)
      return [id, records.filter((r) => r.type === ATTENDANCE_TYPES.ABSENT).length]
    }),
  )
  await tx.done

  for (const [id, count] of entries) result.set(id, count)
  return result
}

/** 同じ講義・同じ日付の記録を探す(重複登録の確認用、spec 4.4) */
export async function findRecordByDate(courseId, date) {
  const db = await getDB()
  return db.getFromIndex(STORES.attendanceRecords, 'by-course-date', [courseId, date])
}

/**
 * 出欠を1件記録する。
 * 同じ日付の記録が既にある場合の扱いは呼び出し側で決める:
 *   overwrite: true  → 上書き(既存レコードを書き換える)
 *   overwrite: false → 何もせず { duplicated: true } を返す
 */
export async function addRecord({ courseId, date, type }, { overwrite = false } = {}) {
  const db = await getDB()
  const existing = await findRecordByDate(courseId, date)

  if (existing && !overwrite) {
    return { duplicated: true, record: existing }
  }

  const record = existing
    ? { ...existing, type }
    : { id: newId(), courseId, date, type, createdAt: new Date().toISOString() }

  await db.put(STORES.attendanceRecords, record)
  return { duplicated: false, record }
}

export async function deleteRecord(id) {
  const db = await getDB()
  await db.delete(STORES.attendanceRecords, id)
}

/**
 * 欠席数が上限に到達しているか(spec 4.5)。
 * 「到達した時点」でのみ true を返す。事前警告(80%など)は実装しない。
 */
export function isAbsenceLimitReached(course, absentCount) {
  if (!course?.attendanceEnabled) return false
  if (!course.absenceLimit || course.absenceLimit <= 0) return false
  return absentCount >= course.absenceLimit
}
