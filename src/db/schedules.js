import { getDB } from './database.js'
import { STORES, NOTIFY_TIMINGS } from './constants.js'
import { newId } from '../utils/id.js'

function buildSchedule(input) {
  return {
    id: newId(),
    courseId: input.courseId ?? null, // 講義に紐づかない予定も登録可(spec 4.10)
    title: input.title ?? '',
    dueAt: input.dueAt, // 'YYYY-MM-DDTHH:mm'
    category: input.category ?? '課題',
    memo: input.memo ?? '',
    done: input.done ?? false,
    notifyTiming: input.notifyTiming ?? NOTIFY_TIMINGS.NONE,
    createdAt: new Date().toISOString(),
  }
}

/**
 * スケジュールを締切の早い順で返す。
 * includeDone: false にすると完了済みを除外する(spec 4.10 のフィルタ用)。
 */
export async function listSchedules({ includeDone = true } = {}) {
  const db = await getDB()
  const all = await db.getAllFromIndex(STORES.schedules, 'by-due')
  return includeDone ? all : all.filter((s) => !s.done)
}

/** 指定講義に紐づくスケジュールを返す(spec 4.3 のスケジュールカード用) */
export async function listSchedulesByCourse(courseId) {
  const db = await getDB()
  const list = await db.getAllFromIndex(STORES.schedules, 'by-course', courseId)
  return list.sort((a, b) => a.dueAt.localeCompare(b.dueAt))
}

export async function getSchedule(id) {
  const db = await getDB()
  return db.get(STORES.schedules, id)
}

export async function createSchedule(input) {
  if (!input.dueAt) throw new Error('dueAt(締切日時)は必須です')
  const db = await getDB()
  const schedule = buildSchedule(input)
  await db.put(STORES.schedules, schedule)
  return schedule
}

export async function updateSchedule(id, patch) {
  const db = await getDB()
  const current = await db.get(STORES.schedules, id)
  if (!current) throw new Error(`スケジュールが見つかりません: ${id}`)
  const updated = { ...current, ...patch, id: current.id }
  await db.put(STORES.schedules, updated)
  return updated
}

/** 完了/未完了を切り替える */
export async function toggleScheduleDone(id) {
  const current = await getSchedule(id)
  if (!current) throw new Error(`スケジュールが見つかりません: ${id}`)
  return updateSchedule(id, { done: !current.done })
}

export async function deleteSchedule(id) {
  const db = await getDB()
  await db.delete(STORES.schedules, id)
}
