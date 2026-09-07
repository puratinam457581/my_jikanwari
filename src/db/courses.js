import { getDoc, getDocs, query, setDoc, where, writeBatch } from 'firebase/firestore'
import { db } from '../firebase/config.js'
import { STORES, DEFAULT_COLOR } from './constants.js'
import { userCollection, userDoc } from './firestoreBase.js'
import { newId } from '../utils/id.js'

/** 講義1件の初期値。フォーム未入力の項目をここで埋める */
function buildCourse(input, id) {
  return {
    id,
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
  const snap = await getDocs(
    query(userCollection(STORES.courses), where('semesterId', '==', semesterId)),
  )
  const list = snap.docs.map((d) => d.data())
  return list.sort((a, b) => a.name.localeCompare(b.name, 'ja'))
}

/**
 * 全学期の講義を返す。
 * 単位の集計は学期をまたいだ累計で行うため(spec 4.11)、ここでは絞り込まない。
 */
export async function listAllCourses() {
  const snap = await getDocs(userCollection(STORES.courses))
  return snap.docs.map((d) => d.data())
}

export async function getCourse(id) {
  const snap = await getDoc(userDoc(STORES.courses, id))
  return snap.exists() ? snap.data() : undefined
}

export async function createCourse(input) {
  if (!input.semesterId) throw new Error('semesterId は必須です')
  const id = newId()
  const course = buildCourse(input, id)
  await setDoc(userDoc(STORES.courses, id), course)
  return course
}

export async function updateCourse(id, patch) {
  const current = await getCourse(id)
  if (!current) throw new Error(`講義が見つかりません: ${id}`)
  const updated = { ...current, ...patch, id: current.id }
  await setDoc(userDoc(STORES.courses, id), updated)
  return updated
}

/**
 * 講義を削除する。関連データもまとめて整理する:
 *   - 時間割の配置        → 削除(コマが空になる)
 *   - 出欠記録            → 削除(講義がないと意味を持たないため)
 *   - 紐づくスケジュール  → 削除せず、講義との紐付けだけ外す(データ消失を避ける)
 */
export async function deleteCourse(id) {
  const [slotsSnap, recordsSnap, schedulesSnap] = await Promise.all([
    getDocs(query(userCollection(STORES.timetableSlots), where('courseId', '==', id))),
    getDocs(query(userCollection(STORES.attendanceRecords), where('courseId', '==', id))),
    getDocs(query(userCollection(STORES.schedules), where('courseId', '==', id))),
  ])

  const batch = writeBatch(db)
  batch.delete(userDoc(STORES.courses, id))
  slotsSnap.docs.forEach((d) => batch.delete(d.ref))
  recordsSnap.docs.forEach((d) => batch.delete(d.ref))
  schedulesSnap.docs.forEach((d) => batch.update(d.ref, { courseId: null }))
  await batch.commit()
}
