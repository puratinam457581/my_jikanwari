/**
 * 【フェーズ2限定】画面遷移の確認用ダミーデータ。
 *
 * この段階ではまだIndexedDBとつながず、見た目と遷移だけを確かめる。
 * フェーズ3以降で本物のデータに差し替え、このファイルは不要になる。
 */

export const DUMMY_COURSES = [
  {
    id: 'dummy-1',
    name: '基礎生物学',
    teacher: '山田 太郎',
    room: 'A101',
    credits: 2,
    color: '#38BDF8',
    day: 1,
    period: 1,
    attendanceEnabled: true,
    absenceLimit: 5,
  },
  {
    id: 'dummy-2',
    name: '英語I',
    teacher: '佐藤 花子',
    room: 'B203',
    credits: 1,
    color: '#FF9F45',
    day: 2,
    period: 2,
    attendanceEnabled: true,
    absenceLimit: 4,
  },
  {
    id: 'dummy-3',
    name: '化学実験',
    teacher: '鈴木 一郎',
    room: '実験棟1',
    credits: 2,
    color: '#4ADE80',
    day: 3,
    period: 3,
    attendanceEnabled: false,
    absenceLimit: 0,
  },
  {
    id: 'dummy-4',
    name: '情報科学',
    teacher: '田中 次郎',
    room: '',
    credits: 2,
    color: '#A78BFA',
    day: 5,
    period: 1,
    attendanceEnabled: true,
    absenceLimit: 3,
  },
]

export const DUMMY_SCHEDULES = [
  {
    id: 'dummy-s1',
    title: 'レポート提出',
    courseId: 'dummy-1',
    dueAt: '2026-08-27T13:00',
    category: '課題',
    done: false,
  },
  {
    id: 'dummy-s2',
    title: '小テスト',
    courseId: 'dummy-2',
    dueAt: '2026-08-31T09:00',
    category: 'テスト',
    done: false,
  },
  {
    id: 'dummy-s3',
    title: '事前課題の提出',
    courseId: null,
    dueAt: '2026-09-03T23:59',
    category: 'レポート',
    done: true,
  },
]

export function findDummyCourse(id) {
  return DUMMY_COURSES.find((c) => c.id === id) ?? null
}
