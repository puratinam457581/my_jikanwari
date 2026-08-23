import { useCallback, useEffect, useState } from 'react'
import ScreenLayout, { Card, EmptyState, LinkRow } from '../components/ScreenLayout.jsx'
import { MoonIcon, SunIcon } from '../components/icons.jsx'
import { useNavigation } from '../navigation/NavigationContext.jsx'
import { THEMES, useTheme } from '../theme/ThemeProvider.jsx'
import { getCreditSummary, semesterApi } from '../db/index.js'
import { ProgressBar } from './CreditSettingsScreen.jsx'

/**
 * マイページ(spec 3章 / 4.11)。
 * 単位の進捗の概要と、各設定画面への入り口をまとめる。
 */
export default function MyPageScreen() {
  const { push } = useNavigation()
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState(null)
  const [semester, setSemester] = useState(null)

  const load = useCallback(async () => {
    const [result, active] = await Promise.all([
      getCreditSummary(),
      semesterApi.getActiveSemester(),
    ])
    setSummary(result)
    setSemester(active)
    setLoading(false)
  }, [])

  useEffect(() => {
    load().catch((e) => {
      console.error(e)
      setLoading(false)
    })
  }, [load])

  return (
    <ScreenLayout title="マイページ">
      <div className="p-3">
        <Card title="単位取得状況">
          {loading || !summary ? (
            <EmptyState>読み込み中...</EmptyState>
          ) : (
            <>
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
                    {Math.round(summary.ratio)}%
                  </span>
                )}
              </div>

              {summary.required != null ? (
                <ProgressBar ratio={summary.ratio} />
              ) : (
                <button
                  type="button"
                  onClick={() => push('creditSettings')}
                  className="w-full rounded-sharp border border-line bg-panel-2 py-2 text-[11px] text-hud-dim active:opacity-70"
                >
                  必要単位数を設定すると進捗が表示されます
                </button>
              )}

              <p className="mt-2 text-[11px] text-hud-faint">
                全学期の累計 ・ 取得済み {summary.earnedCount}件
              </p>
            </>
          )}
        </Card>

        <Card title="表示テーマ">
          <ThemeSwitch />
        </Card>

        <Card title="設定">
          <LinkRow label="必要単位数・単位進捗" onClick={() => push('creditSettings')} />
          <LinkRow label="時限・曜日の設定" value="フェーズ8" onClick={() => push('periodSettings')} />
          <LinkRow
            label="学期の管理"
            value={semester ? `${semester.year}年度 ${semester.name}` : null}
            onClick={() => push('semesterSwitch')}
          />
        </Card>

        <Card title="データ">
          <LinkRow
            label="バックアップ(エクスポート/インポート)"
            value="フェーズ10"
            onClick={() => {}}
          />
          <LinkRow label="時間割を画像で保存" value="フェーズ10" onClick={() => {}} />
        </Card>

        <Card title="開発用">
          <LinkRow label="データ層の動作確認画面" onClick={() => push('devData')} />
        </Card>
      </div>
    </ScreenLayout>
  )
}

/**
 * ダーク/ライトの切り替え(デザイン仕様6.5)。
 * 選択はIndexedDBに保存され、次回起動時も保たれる。
 */
function ThemeSwitch() {
  const { theme, setTheme } = useTheme()

  const options = [
    { value: THEMES.dark, label: 'ダーク', Icon: MoonIcon },
    { value: THEMES.light, label: 'ライト', Icon: SunIcon },
  ]

  return (
    <div className="flex gap-2">
      {options.map(({ value, label, Icon }) => {
        const active = theme === value
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-pressed={active}
            className={`flex flex-1 items-center justify-center gap-2 rounded-sharp border py-2.5 text-sm font-semibold transition-colors ${
              active
                ? 'glow-sm border-cyan bg-cyan/10 text-cyan'
                : 'border-line bg-panel-2 text-hud-dim'
            }`}
          >
            <Icon size={16} strokeWidth={1.5} />
            <span className="font-hud">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
