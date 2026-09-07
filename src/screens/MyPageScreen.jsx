import { useCallback, useEffect, useState } from 'react'
import ScreenLayout, { Button, Card, EmptyState, LinkRow } from '../components/ScreenLayout.jsx'
import { MoonIcon, SunIcon } from '../components/icons.jsx'
import { useNavigation } from '../navigation/NavigationContext.jsx'
import { THEMES, useTheme } from '../theme/ThemeProvider.jsx'
import { useAuth } from '../firebase/AuthProvider.jsx'
import { getCreditSummary, semesterApi, settingsApi } from '../db/index.js'
import { getPermission } from '../notify/deliver.js'
import { ProgressBar } from './CreditSettingsScreen.jsx'
import { useRefreshOnFocus } from '../hooks/useRefreshOnFocus.js'

/**
 * マイページ(spec 3章 / 4.11)。
 * 単位の進捗の概要と、各設定画面への入り口をまとめる。
 */
export default function MyPageScreen() {
  const { push } = useNavigation()
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState(null)
  const [semester, setSemester] = useState(null)
  const [lastBackupAt, setLastBackupAt] = useState(null)

  // 通知が使える状態かどうかを一目で分かるようにする
  const permission = getPermission()
  const notifyStatus = { granted: 'オン', denied: '拒否', default: '未設定' }[permission] ?? '非対応'

  const load = useCallback(async () => {
    const [result, active, display] = await Promise.all([
      getCreditSummary(),
      semesterApi.getActiveSemester(),
      settingsApi.getDisplaySettings(),
    ])
    setSummary(result)
    setSemester(active)
    setLastBackupAt(display.lastBackupAt ?? null)
    setLoading(false)
  }, [])

  /**
   * バックアップの状態。データが消えると復旧できないので、
   * 一度も書き出していない場合と、しばらく空いた場合は目立たせる。
   */
  const backupDays = lastBackupAt
    ? Math.floor((Date.now() - new Date(lastBackupAt).getTime()) / 86400000)
    : null
  const backupStatus =
    backupDays === null ? (
      <span className="text-alert">未実施</span>
    ) : backupDays >= 30 ? (
      <span className="text-alert">{backupDays}日前</span>
    ) : (
      `${backupDays}日前`
    )

  useEffect(() => {
    load().catch((e) => {
      console.error(e)
      setLoading(false)
    })
  }, [load])

  // 他の端末で編集した内容を、次にこの画面を見たときには反映させる
  useRefreshOnFocus(() => load().catch((e) => console.error(e)))

  return (
    <ScreenLayout title="マイページ">
      <div className="p-3">
        <Card title="アカウント">
          <AccountRow />
        </Card>

        <Card title="単位取得状況">
          {loading || !summary ? (
            <EmptyState>読み込み中...</EmptyState>
          ) : (
            <>
              <p className="font-digit text-3xl font-bold text-hud">
                {summary.earned}
                <span className="font-hud ml-1 text-xs text-hud-faint">単位</span>
                <span className="font-hud ml-2 text-[11px] text-hud-faint">
                  全学期の累計
                </span>
              </p>

              {/* 進級と卒業は見たいタイミングが違うので、分けて並べる */}
              {summary.promotion.required == null && summary.graduation.required == null ? (
                <button
                  type="button"
                  onClick={() => push('creditSettings')}
                  className="mt-3 w-full rounded-sharp border border-line bg-panel-2 py-2 text-[11px] text-hud-dim active:opacity-70"
                >
                  進級・卒業に必要な単位数を設定すると進捗が表示されます
                </button>
              ) : (
                <div className="mt-3 space-y-3">
                  <MiniProgress
                    label={summary.grade ? `${summary.grade + 1}年次への進級` : '進級'}
                    progress={summary.promotion}
                    earned={summary.earned}
                  />
                  <MiniProgress
                    label="卒業"
                    progress={summary.graduation}
                    earned={summary.earned}
                  />
                </div>
              )}
            </>
          )}
        </Card>

        <Card title="表示テーマ">
          <ThemeSwitch />
        </Card>

        <Card title="設定">
          <LinkRow label="必要単位数・単位進捗" onClick={() => push('creditSettings')} />
          <LinkRow label="時限・曜日の設定" onClick={() => push('periodSettings')} />
          <LinkRow
            label="通知の設定"
            value={notifyStatus}
            onClick={() => push('notificationSettings')}
          />
          <LinkRow
            label="学期の管理"
            value={semester ? `${semester.year}年度 ${semester.name}` : null}
            onClick={() => push('semesterSwitch')}
          />
        </Card>

        <Card title="データ">
          <LinkRow
            label="バックアップ(エクスポート/インポート)"
            value={backupStatus}
            onClick={() => push('backup')}
          />
          <LinkRow label="時間割を画像で保存" onClick={() => push('timetableImage')} />
        </Card>

        <Card title="開発用">
          <LinkRow label="データ層の動作確認画面" onClick={() => push('devData')} />
        </Card>
      </div>
    </ScreenLayout>
  )
}

/** サインイン中のアカウント表示とサインアウト(フェーズ13) */
function AccountRow() {
  const { user, signOut } = useAuth()

  const handleSignOut = () => {
    if (!window.confirm('サインアウトしますか?\nこの端末でのデータ表示ができなくなります。')) return
    signOut()
  }

  if (!user) return null

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-sm text-hud">{user.displayName ?? '(名前なし)'}</p>
        <p className="truncate text-[11px] text-hud-faint">{user.email}</p>
      </div>
      <Button variant="ghost" onClick={handleSignOut} className="shrink-0">
        サインアウト
      </Button>
    </div>
  )
}

/** 目標1つぶんの、細い進捗表示 */
function MiniProgress({ label, progress, earned }) {
  if (progress.required == null) return null
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="font-hud text-xs font-semibold text-hud-dim">{label}</span>
        <span className="font-digit text-xs text-hud">
          {earned}
          <span className="text-hud-faint">/{progress.required}</span>
          {progress.achieved ? (
            <span className="ml-2 text-cyan">達成</span>
          ) : (
            <span className="ml-2 text-hud-faint">あと{progress.remaining}</span>
          )}
        </span>
      </div>
      <ProgressBar ratio={progress.ratio} />
    </div>
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
