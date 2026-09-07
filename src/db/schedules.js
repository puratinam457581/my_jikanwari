import { deleteDoc, getDoc, getDocs, orderBy, query, setDoc, where } from 'firebase/firestore'
import { NOTIFY_OPTIONS, STORES } from './constants.js'
import { userCollection, userDoc } from './firestoreBase.js'
import { newId } from '../utils/id.js'

/**
 * 通知タイミングを配列に整える。
 * 想定外の値が入っていても落ちないように、既知の選択肢だけを残す。
 */
function normalizeTimings(value) {
  if (!Array.isArray(value)) return []
  const allowed = NOTIFY_OPTIONS.map((o) => o.value)
  return allowed.filter((v) => value.includes(v))
}

function buildSchedule(input, id) {
  return {
    id,
    courseId: input.courseId ?? null, // 講義に紐づかない予定も登録可(spec 4.10)
    title: input.title ?? '',
    dueAt: input.dueAt, // 'YYYY-MM-DDTHH:mm'
    category: input.category ?? '課題',
    memo: input.memo ?? '',
    done: input.done ?? false,
    // 通知タイミングは複数選択可(spec 4.10)。空配列 = 通知しない
    notifyTimings: normalizeTimings(input.notifyTimings),
    createdAt: new Date().toISOString(),
  }
}

/**
 * スケジュールを締切の早い順で返す。
 * includeDone: false にすると完了済みを除外する(spec 4.10 のフィルタ用)。
 */
export async function listSchedules({ includeDone = true } = {}) {
  const snap = await getDocs(query(userCollection(STORES.schedules), orderBy('dueAt')))
  const all = snap.docs.map((d) => d.data())
  return includeDone ? all : all.filter((s) => !s.done)
}

/** 指定講義に紐づくスケジュールを返す(spec 4.3 のスケジュールカード用) */
export async function listSchedulesByCourse(courseId) {
  const snap = await getDocs(
    query(userCollection(STORES.schedules), where('courseId', '==', courseId)),
  )
  const list = snap.docs.map((d) => d.data())
  return list.sort((a, b) => a.dueAt.localeCompare(b.dueAt))
}

export async function getSchedule(id) {
  const snap = await getDoc(userDoc(STORES.schedules, id))
  return snap.exists() ? snap.data() : undefined
}

export async function createSchedule(input) {
  if (!input.dueAt) throw new Error('dueAt(締切日時)は必須です')
  const id = newId()
  const schedule = buildSchedule(input, id)
  await setDoc(userDoc(STORES.schedules, id), schedule)
  return schedule
}

export async function updateSchedule(id, patch) {
  const current = await getSchedule(id)
  if (!current) throw new Error(`スケジュールが見つかりません: ${id}`)
  const updated = { ...current, ...patch, id: current.id }
  if ('notifyTimings' in patch) {
    updated.notifyTimings = normalizeTimings(patch.notifyTimings)
  }
  await setDoc(userDoc(STORES.schedules, id), updated)
  return updated
}

/** 完了/未完了を切り替える */
export async function toggleScheduleDone(id) {
  const current = await getSchedule(id)
  if (!current) throw new Error(`スケジュールが見つかりません: ${id}`)
  return updateSchedule(id, { done: !current.done })
}

export async function deleteSchedule(id) {
  await deleteDoc(userDoc(STORES.schedules, id))
}
