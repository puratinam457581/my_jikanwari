import { getDB } from './database.js'
import {
  STORES,
  DISPLAY_SETTINGS_KEY,
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_VISIBLE_DAYS,
  DEFAULT_PERIOD_SETTINGS,
} from './constants.js'

// ---------------- 時限設定 (spec 7.6 / 4.8) ----------------

/** 設定できる時限数の上限 */
export const MAX_PERIODS = 12

/** 保存されている時限設定を、時限番号順にすべて返す */
export async function getAllPeriodSettings() {
  const db = await getDB()
  const all = await db.getAll(STORES.periodSettings)
  return all.sort((a, b) => a.period - b.period)
}

/**
 * 時間割に表示する時限設定を返す。
 *
 * 時限数を減らしても、その時限の時刻設定は削除せず残しておく
 * (減らして増やし直したときに、設定した時刻が失われないようにするため)。
 * 表示する範囲は displaySettings.periodCount で決める。
 */
export async function getPeriodSettings() {
  const [all, settings] = await Promise.all([getAllPeriodSettings(), getDisplaySettings()])
  // periodCount が未設定の古いデータでは、保存されている行数をそのまま使う
  const count = settings.periodCount ?? all.length
  return all.filter((p) => p.period <= count)
}

/** 表示する時限数 */
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
 *
 * 減らしても何も削除しない。時刻設定も、時間割に配置済みの講義も残り、
 * 表示範囲から外れるだけ。隠れた配置がある場合の警告は画面側で出す。
 */
export async function setPeriodCount(count) {
  const clamped = Math.min(MAX_PERIODS, Math.max(1, Math.floor(count) || 1))
  const db = await getDB()
  const current = await getAllPeriodSettings()

  // 表示範囲に足りない行だけを既定値で補う
  const missing = []
  for (let period = 1; period <= clamped; period += 1) {
    if (!current.some((p) => p.period === period)) {
      const preset = DEFAULT_PERIOD_SETTINGS.find((p) => p.period === period)
      missing.push(preset ? { ...preset } : { period, startTime: '', endTime: '' })
    }
  }

  if (missing.length > 0) {
    const tx = db.transaction(STORES.periodSettings, 'readwrite')
    await Promise.all([...missing.map((row) => tx.store.put(row)), tx.done])
  }

  await updateDisplaySettings({ periodCount: clamped })
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
  const merged = {
    key: DISPLAY_SETTINGS_KEY,
    visibleDays: [...DEFAULT_VISIBLE_DAYS],
    // 卒業に必要な単位数
    requiredCredits: null,
    // 進級に必要な単位数。学年ごとに違うので学年をキーにして持つ
    // 例: { 1: 30, 2: 62 } = 1年→2年に30単位、2年→3年に62単位
    promotionCreditsByGrade: {},
    // 学年(1〜)。どの進級要件を使うかの判断に使う
    grade: null,
    // 時間割に表示する時限数。null は「保存されている時限設定の行数に従う」
    periodCount: null,
    theme: 'dark', // 表示テーマ(デザイン仕様6.5)
    ...settings,
  }

  // 通知の設定(spec 5章)。項目が増えても既存データが壊れないよう個別に埋める
  merged.notifications = { ...DEFAULT_NOTIFICATION_SETTINGS, ...(settings?.notifications ?? {}) }

  // 以前の「進級要件は1つだけ」の形で保存された値を、学年ごとの形へ移す
  if (
    merged.promotionCredits != null &&
    merged.grade != null &&
    Object.keys(merged.promotionCreditsByGrade).length === 0
  ) {
    merged.promotionCreditsByGrade = { [merged.grade]: merged.promotionCredits }
  }
  delete merged.promotionCredits

  return merged
}

export async function updateDisplaySettings(patch) {
  const db = await getDB()
  const current = await getDisplaySettings()
  const updated = { ...current, ...patch, key: DISPLAY_SETTINGS_KEY }
  await db.put(STORES.displaySettings, updated)
  return updated
}

/**
 * ある学年の進級に必要な単位数を設定する。
 * null を渡すとその学年の設定を消す。
 */
export async function setPromotionCredits(grade, credits) {
  const current = await getDisplaySettings()
  const next = { ...current.promotionCreditsByGrade }
  if (credits == null) {
    delete next[grade]
  } else {
    next[grade] = credits
  }
  return updateDisplaySettings({ promotionCreditsByGrade: next })
}

/** 1曜日ぶんの表示ON/OFFを切り替える */
export async function setDayVisible(day, visible) {
  const current = await getDisplaySettings()
  const visibleDays = [...current.visibleDays]
  visibleDays[day] = visible
  return updateDisplaySettings({ visibleDays })
}
