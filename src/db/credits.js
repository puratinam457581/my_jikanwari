import { COURSE_CATEGORIES } from './constants.js'
import { listAllCourses } from './courses.js'
import { listSemesters } from './semesters.js'
import { getDisplaySettings } from './settings.js'

/**
 * 単位の取得状況をまとめる(spec 4.11)。
 *
 * 集計は「学期をまたいだ累計」で行う。過去の学期で取った単位も
 * すべて合算するのが仕様のため、現在の学期では絞り込まない。
 */
export async function getCreditSummary() {
  const [courses, semesters, settings] = await Promise.all([
    listAllCourses(),
    listSemesters(),
    getDisplaySettings(),
  ])

  const earnedCourses = courses.filter((c) => c.creditEarned)
  const earned = sumCredits(earnedCourses)

  // 「取得済みではないが登録済み」の単位数。今学期ぶんの見込みを見るのに使う
  const pending = sumCredits(courses.filter((c) => !c.creditEarned))

  return {
    earned,
    pending,
    grade: settings.grade ?? null,
    // 卒業と進級は見たいタイミングが違うので、目標を分けて持つ。
    // どちらも「これまでに取得した単位の累計」と比べる点は同じ。
    graduation: buildProgress(earned, settings.requiredCredits),
    // 進級要件は学年ごとに違うため、今の学年に対応する値を使う
    promotion: buildProgress(
      earned,
      settings.grade == null
        ? null
        : settings.promotionCreditsByGrade[settings.grade],
    ),
    promotionByGrade: settings.promotionCreditsByGrade,
    byGroup: summarizeByGroup(courses),
    bySemester: summarizeBySemester(courses, semesters),
    earnedCount: earnedCourses.length,
    totalCount: courses.length,
  }
}

/**
 * 目標単位数に対する進み具合。
 * 目標が未設定(null)のときは、比率も残りも出さない。
 */
function buildProgress(earned, required) {
  const target = Number(required)
  if (!Number.isFinite(target) || target <= 0) {
    return { required: null, ratio: null, remaining: null, achieved: false }
  }
  return {
    required: target,
    ratio: Math.min(100, (earned / target) * 100),
    remaining: Math.max(0, target - earned),
    achieved: earned >= target,
  }
}

function sumCredits(courses) {
  return courses.reduce((total, c) => total + (Number(c.credits) || 0), 0)
}

/**
 * 科目区分の「群」ごとの内訳。
 * 卒業要件は群ごとに定められていることが多いため、参考として出す。
 */
function summarizeByGroup(courses) {
  const groups = [...new Set(COURSE_CATEGORIES.map((c) => c.group))]
  const categoryOf = (value) => COURSE_CATEGORIES.find((c) => c.value === value) ?? null

  const rows = groups.map((group) => {
    const inGroup = courses.filter((c) => categoryOf(c.category)?.group === group)
    return {
      group,
      earned: sumCredits(inGroup.filter((c) => c.creditEarned)),
      required: sumCredits(inGroup.filter((c) => categoryOf(c.category)?.type === '必修')),
      earnedRequired: sumCredits(
        inGroup.filter((c) => c.creditEarned && categoryOf(c.category)?.type === '必修'),
      ),
    }
  })

  // 区分を設定していない講義の取得単位
  const uncategorized = sumCredits(
    courses.filter((c) => c.creditEarned && !categoryOf(c.category)),
  )

  return { rows, uncategorized }
}

/** 学期ごとの取得単位。過去の学期も含めて並べる */
function summarizeBySemester(courses, semesters) {
  return semesters.map((semester) => {
    const inSemester = courses.filter((c) => c.semesterId === semester.id)
    return {
      semester,
      earned: sumCredits(inSemester.filter((c) => c.creditEarned)),
      total: sumCredits(inSemester),
      courseCount: inSemester.length,
      earnedCourses: inSemester
        .filter((c) => c.creditEarned)
        .sort((a, b) => a.name.localeCompare(b.name, 'ja')),
    }
  })
}
