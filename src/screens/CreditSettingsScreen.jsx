import { useCallback, useEffect, useState } from 'react'
import ScreenLayout, { Card, EmptyState } from '../components/ScreenLayout.jsx'
import { Field, FormSection } from '../components/form.jsx'
import { useNavigation } from '../navigation/NavigationContext.jsx'
import { getCreditSummary, settingsApi } from '../db/index.js'

/**
 * 必要単位数の設定と、取得状況の表示(spec 4.11)。
 * 集計は学期をまたいだ累計で行う。
 */
export default function CreditSettingsScreen() {
  const { push } = useNavigation()
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState(null)
  const [required, setRequired] = useState('')
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    const result = await getCreditSummary()
    setSummary(result)
    setRequired(result.required == null ? '' : String(result.required))
    setLoading(false)
  }, [])

  useEffect(() => {
    load().catch((e) => {
      console.error(e)
      setLoading(false)
    })
  }, [load])

  /** 入力欄から離れたタイミングで保存する */
  const handleSaveRequired = async () => {
    const value = required.trim() === '' ? null : Number(required)
    if (value !== null && (!Number.isFinite(value) || value < 0)) return
    await settingsApi.updateDisplaySettings({ requiredCredits: value })
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
    load()
  }

  if (loading || !summary) {
    return (
      <ScreenLayout title="必要単位数・進捗" showBack>
        <EmptyState>読み込み中...</EmptyState>
      </ScreenLayout>
    )
  }

  const ratio = summary.ratio ?? 0

  return (
    <ScreenLayout title="必要単位数・進捗" showBack>
      <div className="p-3 pb-10">
        <FormSection title="卒業/進級に必要な単位数">
          <Field
            label="必要単位数"
            hint="学部・学科の要件に合わせて入力してください。空欄にすると進捗バーは表示されません"
          >
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={999}
                value={required}
                onChange={(e) => setRequired(e.target.value)}
                onBlur={handleSaveRequired}
                className="field-input font-digit"
              />
              <span className="shrink-0 text-sm text-hud-dim">単位</span>
            </div>
          </Field>
          {saved && <p className="text-[11px] text-cyan">保存しました</p>}
        </FormSection>

        <Card title="取得状況(全学期の累計)">
          <div className="mb-3 flex items-end justify-between">
            <span className="font-digit text-3xl font-bold text-hud">
              {summary.earned}
              {summary.required != null && (
                <span className="ml-1.5 text-sm font-normal text-hud-dim">
                  / {summary.required}
                </span>
              )}
              <span className="font-hud ml-1 text-xs text-hud-faint">単位</span>
            </span>
            {summary.ratio != null && (
              <span
                className="font-digit text-glow text-xl font-bold text-cyan"
                style={{ '--glow-color': 'var(--color-cyan)' }}
              >
                {Math.round(ratio)}%
              </span>
            )}
          </div>

          {summary.required != null ? (
            <>
              <ProgressBar ratio={ratio} />
              <p className="mt-2 text-[11px] text-hud-dim">
                あと <span className="font-digit text-cyan">{summary.remaining}</span>{' '}
                単位で要件を満たします
              </p>
            </>
          ) : (
            <p className="text-[11px] text-hud-faint">
              必要単位数を入力すると、進捗バーが表示されます
            </p>
          )}

          <p className="mt-3 border-t border-line pt-2 text-[11px] text-hud-faint">
            取得済み {summary.earnedCount}件 / 登録済み {summary.totalCount}件
            ・未取得の登録済み講義は {summary.pending}単位
          </p>
        </Card>

        {/* 群ごとの内訳。卒業要件は群ごとに定められていることが多いため参考として出す */}
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
