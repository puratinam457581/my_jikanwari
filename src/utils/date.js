/**
 * 日付まわりの共通処理。
 *
 * 【方針】日付はDate型ではなく文字列でIndexedDBに保存する。
 *   - 日付のみ   : 'YYYY-MM-DD'      (例: '2026-08-24')
 *   - 日付+時刻  : 'YYYY-MM-DDTHH:mm' (例: '2026-08-24T13:00')
 * 文字列にしておくと、辞書順の並べ替えがそのまま時系列順になり、
 * タイムゾーンによるズレも起きないため扱いが楽になる。
 */

const pad = (n) => String(n).padStart(2, '0')

/** Date → 'YYYY-MM-DD' */
export function toDateString(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Date → 'YYYY-MM-DDTHH:mm' */
export function toDateTimeString(date = new Date()) {
  return `${toDateString(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** 'YYYY-MM-DD' または 'YYYY-MM-DDTHH:mm' → Date */
export function parseDateString(value) {
  if (!value) return null
  const [datePart, timePart = '00:00'] = value.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute] = timePart.split(':').map(Number)
  return new Date(year, month - 1, day, hour, minute)
}

/** 'HH:mm' → 0時からの経過分数。時限の判定に使う */
export function timeToMinutes(time) {
  const [hour, minute] = time.split(':').map(Number)
  return hour * 60 + minute
}

/**
 * 年度を返す(日本の学年暦。4月〜翌3月が同じ年度)。
 * 例: 2026年3月 → 2025年度 / 2026年4月 → 2026年度
 */
export function getAcademicYear(date = new Date()) {
  const year = date.getFullYear()
  return date.getMonth() + 1 >= 4 ? year : year - 1
}

/** 日付から前期/後期を推定する(4〜9月=前期、10〜3月=後期) */
export function guessSemesterName(date = new Date()) {
  const month = date.getMonth() + 1
  return month >= 4 && month <= 9 ? '前期' : '後期'
}
