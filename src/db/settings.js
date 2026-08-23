import { getDB } from './database.js'
import {
  STORES,
  DISPLAY_SETTINGS_KEY,
  DEFAULT_VISIBLE_DAYS,
  DEFAULT_PERIOD_SETTINGS,
} from './constants.js'

// ---------------- 時限設定 (spec 7.6 / 4.8) ----------------

/** 時限設定を1限から順に返す */
export async function getPeriodSettings() {
  const db = await getDB()
  const all = await db.getAll(STORES.periodSettings)
  return all.sort((a, b) => a.period - b.period)
}

/** 表示する時限数(=最大時限番号) */
export async function getPeriodCount() {
  const periods = await getPeriodSettings()
  return periods.length
}

/** 1つの時限の開始・終了時刻を変更する */
export async function updatePeriodTime(period, { startTime, endTime }) {
  const db = await getDB()
  const current = await db.get(STORES.periodSettings, period)
  const updated = {
    period,
    startTime: startTime ?? current?.startTime ?? '09:00',
    endTime: endTime ?? current?.endTime ?? '10:40',
  }
  await db.put(STORES.periodSettings, updated)
  return updated
}

/**
 * 時限数を変更する(spec 4.8)。
 * 減らした場合、その時限の「設定行」だけを消し、
 * 時間割に配置済みの講義データ(timetableSlots)は削除しない。
 * → 非表示になるだけで保持される。警告表示は画面側で行う。
 */
export async function setPeriodCount(count) {
  const db = await getDB()
  const current = await getPeriodSettings()
  const tx = db.transaction(STORES.periodSettings, 'readwrite')
  const jobs = []

  for (let period = 1; period <= count; period += 1) {
    if (!current.some((p) => p.period === period)) {
      // 既定値が用意されていればそれを、なければ空の時刻で追加する
      const preset = DEFAULT_PERIOD_SETTINGS.find((p) => p.period === period)
      jobs.push(tx.store.put(preset ? { ...preset } : { period, startTime: '', endTime: '' }))
    }
  }
  for (const p of current) {
    if (p.period > count) jobs.push(tx.store.delete(p.period))
  }

  await Promise.all([...jobs, tx.done])
  return getPeriodSettings()
}

/** 現在時刻がどの時限に該当するか(spec 4.1 の現在時限ハイライト用)。なければ null */
export function findCurrentPeriod(periodSettings, now = new Date()) {
  const minutes = now.getHours() * 60 + now.getMinutes()
  const toMinutes = (t) => {
    if (!t) return null
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }
  const hit = periodSettings.find((p) => {
    const start = toMinutes(p.startTime)
    const end = toMinutes(p.endTime)
    return start !== null && end !== null && minutes >= start && minutes <= end
  })
  return hit ? hit.period : null
}

// ---------------- 表示設定 (spec 7.7) ----------------

/** 表示曜日・必要単位数などの設定を返す */
export async function getDisplaySettings() {
  const db = await getDB()
  const settings = await db.get(STORES.displaySettings, DISPLAY_SETTINGS_KEY)
  // 既存データに項目が無い場合(アプリ更新後など)も既定値で埋める
  return {
    key: DISPLAY_SETTINGS_KEY,
    visibleDays: [...DEFAULT_VISIBLE_DAYS],
    // 卒業に必要な単位数
    requiredCredits: null,
    // 進級に必要な単位数。卒業とは別に見たいことがあるため分けて持つ
    promotionCredits: null,
    // 学年(1〜。進級先の表示に使う)
    grade: null,
    theme: 'dark', // 表示テーマ(デザイン仕様6.5)
    ...settings,
  }
}

export async function updateDisplaySettings(patch) {
  const db = await getDB()
  const current = await getDisplaySettings()
  const updated = { ...current, ...patch, key: DISPLAY_SETTINGS_KEY }
  await db.put(STORES.displaySettings, updated)
  return updated
}

/** 1曜日ぶんの表示ON/OFFを切り替える */
export async function setDayVisible(day, visible) {
  const current = await getDisplaySettings()
  const visibleDays = [...current.visibleDays]
  visibleDays[day] = visible
  return updateDisplaySettings({ visibleDays })
}
