import { getDocs, limit, query, setDoc } from 'firebase/firestore'
import {
  DEFAULT_PERIOD_SETTINGS,
  DEFAULT_VISIBLE_DAYS,
  DISPLAY_SETTINGS_KEY,
  STORES,
} from './constants.js'
import { userCollection, userDoc } from './firestoreBase.js'
import { newId } from '../utils/id.js'
import { getAcademicYear, guessSemesterName } from '../utils/date.js'

/**
 * 初めてサインインしたときのデフォルトデータを入れる(フェーズ13)。
 *
 * IndexedDB版(database.js の seedDefaults)と同じ内容を、
 * サインインしている本人の users/{uid}/... 配下に作る。
 * 既にデータがある場合は何もしない(何度呼んでも安全)。
 */
export async function seedDefaultsIfNeeded() {
  const [periodsEmpty, displayEmpty, semestersEmpty] = await Promise.all([
    isCollectionEmpty(STORES.periodSettings),
    isCollectionEmpty(STORES.displaySettings),
    isCollectionEmpty(STORES.semesters),
  ])

  if (periodsEmpty) {
    await Promise.all(
      DEFAULT_PERIOD_SETTINGS.map((p) => setDoc(userDoc(STORES.periodSettings, p.period), p)),
    )
  }

  if (displayEmpty) {
    await setDoc(userDoc(STORES.displaySettings, DISPLAY_SETTINGS_KEY), {
      key: DISPLAY_SETTINGS_KEY,
      visibleDays: [...DEFAULT_VISIBLE_DAYS],
      requiredCredits: null,
      promotionCreditsByGrade: {},
      grade: null,
      periodCount: DEFAULT_PERIOD_SETTINGS.length,
      theme: 'dark',
    })
  }

  if (semestersEmpty) {
    const today = new Date()
    const year = getAcademicYear(today)
    const name = guessSemesterName(today)
    const isFirst = name === '前期'
    const id = newId()
    await setDoc(userDoc(STORES.semesters, id), {
      id,
      name,
      year,
      startDate: isFirst ? `${year}-04-01` : `${year}-10-01`,
      endDate: isFirst ? `${year}-09-30` : `${year + 1}-03-31`,
      isActive: true,
      createdAt: new Date().toISOString(),
    })
  }
}

async function isCollectionEmpty(name) {
  const snap = await getDocs(query(userCollection(name), limit(1)))
  return snap.empty
}
