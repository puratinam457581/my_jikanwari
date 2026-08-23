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
