import { deleteDoc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore'
import { STORES } from './constants.js'
import { userCollection, userDoc } from './firestoreBase.js'

/**
 * コマ配置のドキュメントIDを「学期・曜日・時限」から組み立てる。
 *
 * 【フェーズ13の工夫】IndexedDB版は「同じ学期・曜日・時限は1件だけ」という
 * 制約をunique indexに任せていたが、Firestoreに同じ機能はない。
 * 代わりに、この組み合わせをそのままドキュメントIDにしてしまえば、
 * 「同じコマ = 同じドキュメント」になり、1コマ1講義(spec 4.7)が
 * 自動的に保証される。読み書きも複雑な排他制御なしで書ける。
 */
export function slotId(semesterId, day, period) {
  return `${semesterId}_${day}_${period}`
}

/** 指定学期の全コマ配置を返す */
export async function listSlots(semesterId) {
  const snap = await getDocs(
    query(userCollection(STORES.timetableSlots), where('semesterId', '==', semesterId)),
  )
  return snap.docs.map((d) => d.data())
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
  const snap = await getDocs(userCollection(STORES.timetableSlots))
  return snap.docs.map((d) => d.data())
}

/** 曜日・時限を指定して1コマぶんの配置を取得する */
export async function getSlot(semesterId, day, period) {
  const snap = await getDoc(userDoc(STORES.timetableSlots, slotId(semesterId, day, period)))
  return snap.exists() ? snap.data() : undefined
}

/**
 * コマに講義を配置する(spec 4.7: 1コマ1講義)。
 * 既に別の講義が入っている場合は上書きする。
 */
export async function assignCourse(semesterId, day, period, courseId) {
  const id = slotId(semesterId, day, period)
  const slot = { id, semesterId, day, period, courseId }
  await setDoc(userDoc(STORES.timetableSlots, id), slot)
  return slot
}

/**
 * コマから講義を外す(spec 4.3「コマから外す」)。
 * 配置だけを消し、講義マスタ自体は残す。
 */
export async function clearSlot(semesterId, day, period) {
  await deleteDoc(userDoc(STORES.timetableSlots, slotId(semesterId, day, period)))
}

/** 講義IDから、その講義が配置されている全コマを返す */
export async function listSlotsByCourse(courseId) {
  const snap = await getDocs(
    query(userCollection(STORES.timetableSlots), where('courseId', '==', courseId)),
  )
  return snap.docs.map((d) => d.data())
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
