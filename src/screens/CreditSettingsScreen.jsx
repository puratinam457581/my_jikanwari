import { useCallback, useEffect, useState } from 'react'
import ScreenLayout, { Card, EmptyState } from '../components/ScreenLayout.jsx'
import { CheckIcon } from '../components/icons.jsx'
import { ChoiceField, Field, FormSection } from '../components/form.jsx'
import { useNavigation } from '../navigation/NavigationContext.jsx'
import { getCreditSummary, settingsApi } from '../db/index.js'

/** 学年の選択肢。医療系など6年制も想定して6年まで用意する */
const GRADES = [1, 2, 3, 4, 5, 6]

/**
 * 進級要件を設定できる学年。
 * 最終学年からの進級は存在しない(そこは卒業要件で見る)ので、
 * 6年を除いた 1〜5年ぶんを用意する。使わない学年は空欄のままでよい。
 */
const PROMOTION_GRADES = GRADES.slice(0, -1)

/**
 * 必要単位数の設定と、取得状況の表示(spec 4.11)。
 *
 * 単位を確認したいタイミングには「進級」と「卒業」の2つがあるため、
 * 目標をそれぞれ設定でき、別々に進捗を見られるようにしている。
 * 集計はどちらも「学期をまたいだ取得単位の累計」と比べる。
 */
export default function CreditSettingsScreen() {
  const { push } = useNavigation()
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState(null)
  const [grade, setGrade] = useState(null)
  // 学年ごとの進級要件。入力途中は文字列で持つ
  const [promotionByGrade, setPromotionByGrade] = useState({})
  const [graduation, setGraduation] = useState('')
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    const [result, settings] = await Promise.all([
      getCreditSummary(),
      settingsApi.getDisplaySettings(),
    ])
    setSummary(result)
    setGrade(settings.grade ?? null)
    setPromotionByGrade(
      Object.fromEntries(
        PROMOTION_GRADES.map((g) => [
          g,
          settings.promotionCreditsByGrade[g] == null
            ? ''
            : String(settings.promotionCreditsByGrade[g]),
        ]),
      ),
    )
    setGraduation(settings.requiredCredits == null ? '' : String(settings.requiredCredits))
    setLoading(false)
  }, [])

  useEffect(() => {
    load().catch((e) => {
      console.error(e)
      setLoading(false)
    })
  }, [load])

  const notifySaved = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const saveNumber = async (key, raw) => {
    const value = raw.trim() === '' ? null : Number(raw)
    if (value !== null && (!Number.isFinite(value) || value < 0)) return
    await settingsApi.updateDisplaySettings({ [key]: value })
    notifySaved()
    load()
  }

  const saveGrade = async (value) => {
    setGrade(value)
    await settingsApi.updateDisplaySettings({ grade: value })
    notifySaved()
    load()
  }

  const savePromotion = async (targetGrade) => {
    const raw = promotionByGrade[targetGrade] ?? ''
    const value = raw.trim() === '' ? null : Number(raw)
    if (value !== null && (!Number.isFinite(value) || value < 0)) return
    await settingsApi.setPromotionCredits(targetGrade, value)
    notifySaved()
    load()
  }

  if (loading || !summary) {
    return (
      <ScreenLayout title="必要単位数・進捗" showBack>
        <EmptyState>読み込み中...</EmptyState>
      </ScreenLayout>
    )
  }

  return (
    <ScreenLayout title="必要単位数・進捗" showBack>
      <div className="p-3 pb-10">
        {/* --- 現在の取得単位 --- */}
        <Card title="取得単位(全学期の累計)">
          <p className="font-digit text-3xl font-bold text-hud">
            {summary.earned}
            <span className="font-hud ml-1 text-xs text-hud-faint">単位</span>
          </p>
          <p className="mt-2 text-[11px] text-hud-faint">
            取得済み {summary.earnedCount}件 / 登録済み {summary.totalCount}件 ・
            未取得の登録済み講義は {summary.pending}単位
          </p>
        </Card>

        {/* --- 進級 / 卒業 の進捗 --- */}
        <ProgressCard
          title={grade ? `${grade + 1}年次への進級` : '進級'}
          progress={summary.promotion}
          earned={summary.earned}
          emptyHint={
            grade == null
              ? '下で学年を選ぶと、その学年の進級要件を表示します'
              : `下の「進級に必要な単位数」で ${grade}年 → ${grade + 1}年 の欄を入力すると表示されます`
          }
        />
        <ProgressCard
          title="卒業"
          progress={summary.graduation}
          earned={summary.earned}
          emptyHint="下の「卒業に必要な単位数」を入力すると表示されます"
        />

        {/* --- 設定 --- */}
        <FormSection title="目標の設定">
          <ChoiceField
            label="学年"
            value={grade}
            onChange={saveGrade}
            options={GRADES.map((g) => ({ value: g, label: `${g}年` }))}
            hint="進級先の表示に使います"
          />

          <Field
            label="進級に必要な単位数"
            hint="学年ごとに入力してください。今の学年の値が上の進捗に使われます。分からない学年は空欄で構いません"
          >
            <ul className="space-y-2">
              {PROMOTION_GRADES.map((g) => {
                const isCurrent = grade === g
                return (
                  <li key={g} className="flex items-center gap-2">
                    <span
                      className={`font-hud w-20 shrink-0 text-xs font-semibold ${
                        isCurrent ? 'text-cyan' : 'text-hud-dim'
                      }`}
                    >
                      {g}年 → {g + 1}年
                    </span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={999}
                      value={promotionByGrade[g] ?? ''}
                      onChange={(e) =>
                        setPromotionByGrade((prev) => ({ ...prev, [g]: e.target.value }))
                      }
                      onBlur={() => savePromotion(g)}
                      aria-label={`${g}年から${g + 1}年への進級に必要な単位数`}
                      className={`field-input font-digit ${
                        isCurrent ? 'border-cyan' : ''
                      }`}
                    />
                    <span className="shrink-0 text-sm text-hud-dim">単位</span>
                  </li>
                )
              })}
            </ul>
          </Field>

          <CreditInput
            label="卒業に必要な単位数"
            value={graduation}
            onChange={setGraduation}
            onSave={() => saveNumber('requiredCredits', graduation)}
            hint="学部・学科の卒業要件に合わせて入力してください"
          />

          {saved && <p className="text-[11px] text-cyan">保存しました</p>}
        </FormSection>

        {/* --- 群ごとの内訳 --- */}
        <Card title="科目区分(群)ごとの取得単位">
          <ul className="space-y-2">
            {summary.byGroup.rows.map((row) => (
              <li key={row.group} className="flex items-center justify-between text-sm">
                <span className="text-hud-dim">{row.group}群</span>
                <span className="font-digit text-hud">
                  {row.earned}
                  <span className="ml-1 text-[11px] text-hud-faint">単位</span>
                  {row.required > 0 && (
                    <span className="ml-2 text-[11px] text-hud-faint">
                      (必修 {row.earnedRequired}/{row.required})
                    </span>
                  )}
                </span>
              </li>
            ))}
            {summary.byGroup.uncategorized > 0 && (
              <li className="flex items-center justify-between border-t border-line pt-2 text-sm">
                <span className="text-hud-faint">区分なし</span>
                <span className="font-digit text-hud-dim">
                  {summary.byGroup.uncategorized}
                  <span className="ml-1 text-[11px]">単位</span>
                </span>
              </li>
            )}
          </ul>
        </Card>

        {/* --- 学期ごとの内訳 --- */}
        <Card title="学期ごとの内訳">
          {summary.bySemester.length === 0 ? (
            <EmptyState>学期が登録されていません</EmptyState>
          ) : (
            <ul className="space-y-3">
              {summary.bySemester.map(({ semester, earned, total, earnedCourses }) => (
                <li key={semester.id}>
                  <div className="flex items-center justify-between">
                    <span className="font-hud text-sm font-semibold text-hud">
                      {semester.year}年度 {semester.name}
                      {semester.isActive && (
                        <span className="ml-2 text-[10px] text-cyan">表示中</span>
                      )}
                    </span>
                    <span className="font-digit text-sm text-cyan">
                      {earned}
                      <span className="text-hud-faint">/{total}</span>
                    </span>
                  </div>

                  {earnedCourses.length > 0 && (
                    <ul className="mt-1.5 space-y-1">
                      {earnedCourses.map((course) => (
                        <li key={course.id}>
                          <button
                            type="button"
                            onClick={() => push('courseDetail', { courseId: course.id })}
                            className="flex w-full items-center gap-2 rounded-sharp bg-panel-2 px-2 py-1.5 text-left active:opacity-70"
                          >
                            <span
                              className="h-3 w-3 shrink-0 rounded-sharp"
                              style={{ backgroundColor: course.color }}
                            />
                            <span className="min-w-0 flex-1 truncate text-xs text-hud">
                              {course.name}
                            </span>
                            {course.category && (
                              <span className="shrink-0 text-[10px] text-hud-faint">
                                {course.category}
                              </span>
                            )}
                            <span className="font-digit shrink-0 text-[11px] text-hud-dim">
                              {course.credits}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 border-t border-line pt-2 text-[11px] text-hud-faint">
            単位の取得済みは、各講義の編集画面で切り替えられます
          </p>
        </Card>
      </div>
    </ScreenLayout>
  )
}

/** 目標1つぶんの進捗カード */
function ProgressCard({ title, progress, earned, emptyHint }) {
  return (
    <Card title={title}>
      {progress.required == null ? (
        <p className="text-[11px] text-hud-faint">{emptyHint}</p>
      ) : (
        <>
          <div className="mb-3 flex items-end justify-between">
            <span className="font-digit text-2xl font-bold text-hud">
              {earned}
              <span className="ml-1.5 text-sm font-normal text-hud-dim">
                / {progress.required}
              </span>
              <span className="font-hud ml-1 text-xs text-hud-faint">単位</span>
            </span>
            {progress.achieved ? (
              <span className="font-hud flex items-center gap-1 rounded-sharp border border-cyan bg-cyan/10 px-2 py-0.5 text-xs font-semibold text-cyan">
                <CheckIcon size={13} strokeWidth={3} />
                達成
              </span>
            ) : (
              <span
                className="font-digit text-glow text-xl font-bold text-cyan"
                style={{ '--glow-color': 'var(--color-cyan)' }}
              >
                {Math.round(progress.ratio)}%
              </span>
            )}
          </div>

          <ProgressBar ratio={progress.ratio} />

          <p className="mt-2 text-[11px] text-hud-dim">
            {progress.achieved ? (
              '必要な単位数に達しています'
            ) : (
              <>
                あと <span className="font-digit text-cyan">{progress.remaining}</span> 単位
              </>
            )}
          </p>
        </>
      )}
    </Card>
  )
}

/** 単位数の入力欄。入力欄から離れたタイミングで保存する */
function CreditInput({ label, value, onChange, onSave, hint }) {
  return (
    <Field label={label} hint={hint}>
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={999}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onSave}
          className="field-input font-digit"
        />
        <span className="shrink-0 text-sm text-hud-dim">単位</span>
      </div>
    </Field>
  )
}

/** 計器のゲージらしく目盛りを刻んだ進捗バー */
export function ProgressBar({ ratio }) {
  return (
    <div className="relative h-2.5 w-full overflow-hidden rounded-sharp border border-line bg-void">
      <div
        className="glow-sm h-full bg-cyan"
        style={{ width: `${ratio}%`, '--glow-color': 'var(--color-cyan)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'repeating-linear-gradient(90deg, transparent 0 9px, var(--color-void) 9px 10px)',
        }}
      />
    </div>
  )
}
