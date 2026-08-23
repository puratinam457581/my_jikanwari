/**
 * データ層で共通して使う定数の定義。
 * 「選択肢」の類はすべてここに集約し、後から増やしやすい形にしておく。
 */

export const DB_NAME = 'jikanwari-db'
export const DB_VERSION = 1

/** ストア(テーブル相当)の名前。文字列の打ち間違いを防ぐため定数化する */
export const STORES = {
  semesters: 'semesters',
  courses: 'courses',
  timetableSlots: 'timetableSlots',
  attendanceRecords: 'attendanceRecords',
  schedules: 'schedules',
  periodSettings: 'periodSettings',
  displaySettings: 'displaySettings',
}

/**
 * 曜日の定義。value は JavaScript の Date.getDay() と同じ番号にしてある
 * (0=日曜 〜 6=土曜)。こうしておくと「今日の曜日」の判定がそのまま書ける。
 */
export const DAYS = [
  { value: 0, label: '日' },
  { value: 1, label: '月' },
  { value: 2, label: '火' },
  { value: 3, label: '水' },
  { value: 4, label: '木' },
  { value: 5, label: '金' },
  { value: 6, label: '土' },
]

/** 学期名(spec 4.9: 前期・後期の2学期制のみ) */
export const SEMESTER_NAMES = {
  FIRST: '前期',
  SECOND: '後期',
}

/** 出欠の種別(spec 4.5: 出席・欠席の2種のみ。遅刻・早退はカウントしない) */
export const ATTENDANCE_TYPES = {
  PRESENT: '出席',
  ABSENT: '欠席',
}

/** スケジュールのカテゴリー(spec 4.10。今後の追加を想定して配列で持つ) */
export const SCHEDULE_CATEGORIES = [
  '課題',
  'レポート',
  'テスト',
  '休講',
  '補講',
]

/** スケジュールの通知タイミング(spec 4.10) */
export const NOTIFY_TIMINGS = {
  NONE: 'なし',
  ONE_DAY: '1日前',
  THREE_DAYS: '3日前',
}

/**
 * 講義カラーのプリセット(spec 4.6)。
 * ダーク背景で発光させて使うため、彩度の高いビビッド系を採用している
 * (spec 4.6 の「パステル調」からの変更はユーザー承認済み)。
 * UIのアクセント色(シアン/アラート赤)とは紛らわしくならない色域を選んでいる。
 */
export const PRESET_COLORS = [
  '#FF6B6B', // レッド
  '#FF9F45', // オレンジ
  '#FFD93D', // イエロー
  '#4ADE80', // グリーン
  '#2DD4BF', // ティール
  '#38BDF8', // スカイ
  '#A78BFA', // バイオレット
  '#F472B6', // ピンク
]

export const DEFAULT_COLOR = PRESET_COLORS[5]

/** 時限設定の初期値(spec 4.1 の例「1限 09:00-10:40」に合わせた仮の時刻) */
export const DEFAULT_PERIOD_SETTINGS = [
  { period: 1, startTime: '09:00', endTime: '10:40' },
  { period: 2, startTime: '10:50', endTime: '12:30' },
  { period: 3, startTime: '13:20', endTime: '15:00' },
  { period: 4, startTime: '15:10', endTime: '16:50' },
  { period: 5, startTime: '17:00', endTime: '18:40' },
  { period: 6, startTime: '18:50', endTime: '20:30' },
]

/** 表示曜日の初期値(spec 4.8: デフォルトは月〜土がON、日曜がOFF) */
export const DEFAULT_VISIBLE_DAYS = [false, true, true, true, true, true, true]

/** 表示設定は1件しか持たないので、固定のキーで出し入れする */
export const DISPLAY_SETTINGS_KEY = 'default'
