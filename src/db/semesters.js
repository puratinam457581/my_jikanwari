import { getDoc, getDocs, query, setDoc, where, writeBatch } from 'firebase/firestore'
import { db } from '../firebase/config.js'
import { STORES } from './constants.js'
import { userCollection, userDoc } from './firestoreBase.js'
import { newId } from '../utils/id.js'

/** 全学期を「年度→前期/後期」の順で返す */
export async function listSemesters() {
  const snap = await getDocs(userCollection(STORES.semesters))
  const all = snap.docs.map((d) => d.data())
  return all.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year
    return a.name === b.name ? 0 : a.name === '前期' ? -1 : 1
  })
}

export async function getSemester(id) {
  const snap = await getDoc(userDoc(STORES.semesters, id))
  return snap.exists() ? snap.data() : undefined
}

/** 現在アクティブな(時間割画面に表示中の)学期を返す */
export async function getActiveSemester() {
  const all = await listSemesters()
  return all.find((s) => s.isActive) ?? all[0] ?? null
}

/**
 * 年度と学期名から、開始日・終了日を決める。
 * 前期は4/1〜9/30、後期は10/1〜翌3/31を既定とする。
 */
export function defaultSemesterDates(year, name) {
  const isFirst = name === '前期'
  return {
    startDate: isFirst ? `${year}-04-01` : `${year}-10-01`,
    endDate: isFirst ? `${year}-09-30` : `${year + 1}-03-31`,
  }
}

/**
 * 同じ年度・同じ学期名が既に登録されているか。
 * exceptId を渡すと、その学期自身は重複とみなさない(編集時に使う)。
 */
export async function semesterExists(year, name, exceptId = null) {
  const all = await listSemesters()
  return all.some((s) => s.year === year && s.name === name && s.id !== exceptId)
}

export async function createSemester({ name, year, startDate, endDate }) {
  const id = newId()
  const semester = {
    id,
    name,
    year,
    ...defaultSemesterDates(year, name),
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
    isActive: false,
    createdAt: new Date().toISOString(),
  }
  await setDoc(userDoc(STORES.semesters, id), semester)
  return semester
}

export async function updateSemester(id, patch) {
  const current = await getSemester(id)
  if (!current) throw new Error(`学期が見つかりません: ${id}`)

  const updated = { ...current, ...patch, id: current.id }

  // 年度や学期名を変えたときは、期間も既定値に合わせ直す
  // (ユーザーが期間を直接指定した場合はそちらを尊重する)
  const yearChanged = patch.year != null && patch.year !== current.year
  const nameChanged = patch.name != null && patch.name !== current.name
  if ((yearChanged || nameChanged) && !patch.startDate && !patch.endDate) {
    Object.assign(updated, defaultSemesterDates(updated.year, updated.name))
  }

  await setDoc(userDoc(STORES.semesters, id), updated)
  return updated
}

/**
 * 学期を削除する。
 * spec 4.9 で過去のデータは保持すると定めているため、
 * 講義が1件も登録されていない学期(誤って作った場合)だけ削除を許す。
 */
export async function deleteEmptySemester(id) {
  const coursesSnap = await getDocs(
    query(userCollection(STORES.courses), where('semesterId', '==', id)),
  )
  if (!coursesSnap.empty) {
    throw new Error('この学期には講義が登録されているため削除できません')
  }

  const slotsSnap = await getDocs(
    query(userCollection(STORES.timetableSlots), where('semesterId', '==', id)),
  )

  const batch = writeBatch(db)
  batch.delete(userDoc(STORES.semesters, id))
  slotsSnap.docs.forEach((d) => batch.delete(d.ref))
  await batch.commit()
}

/**
 * 表示する学期を切り替える(spec 4.9)。
 * 他の学期の isActive をすべて false にしてから、対象を true にする。
 * 過去学期のデータは削除しない。
 */
export async function setActiveSemester(id) {
  const all = await listSemesters()
  const batch = writeBatch(db)
  all.forEach((s) => {
    batch.set(userDoc(STORES.semesters, s.id), { ...s, isActive: s.id === id })
  })
  await batch.commit()
}
