import { deleteDoc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore'
import { STORES, ATTENDANCE_TYPES } from './constants.js'
import { userCollection, userDoc } from './firestoreBase.js'

/**
 * 出欠記録のドキュメントIDを「講義・日付」から組み立てる。
 * 「同じ講義・同じ日付は1件だけ」(spec 4.4)を、timetable.js の
 * コマ配置と同じ考え方でドキュメントIDに埋め込み、自動的に保証する。
 */
export function recordId(courseId, date) {
  return `${courseId}_${date}`
}

/** 指定講義の出欠記録を、日付の新しい順で返す */
export async function listRecordsByCourse(courseId) {
  const snap = await getDocs(
    query(userCollection(STORES.attendanceRecords), where('courseId', '==', courseId)),
  )
  const list = snap.docs.map((d) => d.data())
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

/** Firestoreの where-in は一度に渡せる件数に上限があるため、安全に分割する */
const IN_QUERY_CHUNK = 30

function chunk(array, size) {
  const chunks = []
  for (let i = 0; i < array.length; i += size) chunks.push(array.slice(i, i + size))
  return chunks
}

/**
 * 複数の講義の欠席数をまとめて数える。
 * 時間割画面で、上限に到達した講義に警告を出すために使う(spec 4.5)。
 */
export async function countAbsencesByCourse(courseIds) {
  const result = new Map()
  if (courseIds.length === 0) return result
  for (const id of courseIds) result.set(id, 0)

  const chunks = chunk(courseIds, IN_QUERY_CHUNK)
  await Promise.all(
    chunks.map(async (ids) => {
      const snap = await getDocs(
        query(userCollection(STORES.attendanceRecords), where('courseId', 'in', ids)),
      )
      for (const d of snap.docs) {
        const record = d.data()
        if (record.type === ATTENDANCE_TYPES.ABSENT) {
          result.set(record.courseId, (result.get(record.courseId) ?? 0) + 1)
        }
      }
    }),
  )
  return result
}

/** 同じ講義・同じ日付の記録を探す(重複登録の確認用、spec 4.4) */
export async function findRecordByDate(courseId, date) {
  const snap = await getDoc(userDoc(STORES.attendanceRecords, recordId(courseId, date)))
  return snap.exists() ? snap.data() : undefined
}

/**
 * 出欠を1件記録する。
 * 同じ日付の記録が既にある場合の扱いは呼び出し側で決める:
 *   overwrite: true  → 上書き(既存レコードを書き換える)
 *   overwrite: false → 何もせず { duplicated: true } を返す
 */
export async function addRecord({ courseId, date, type }, { overwrite = false } = {}) {
  const existing = await findRecordByDate(courseId, date)

  if (existing && !overwrite) {
    return { duplicated: true, record: existing }
  }

  const id = recordId(courseId, date)
  const record = existing
    ? { ...existing, type }
    : { id, courseId, date, type, createdAt: new Date().toISOString() }

  await setDoc(userDoc(STORES.attendanceRecords, id), record)
  return { duplicated: false, record }
}

export async function deleteRecord(id) {
  await deleteDoc(userDoc(STORES.attendanceRecords, id))
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
