import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { settingsApi } from '../db/index.js'

/**
 * 表示テーマ(ダーク/ライト)の管理(デザイン仕様6.5)。
 *
 * 【保存先が2か所ある理由】
 *  - IndexedDB : 正式な保存先(spec 7.7 display_settings と同じ扱い)
 *  - localStorage : 起動直後に即座に読める控え
 *
 * IndexedDBの読み出しは非同期なので、それを待ってから色を決めると
 * 一瞬だけ前のテーマが見えてしまう(画面のちらつき)。
 * そこで index.html の小さなスクリプトが localStorage を見て
 * 起動時点で <html data-theme> を確定させ、あとからIndexedDBの値で
 * 追いつく、という二段構えにしている。
 */

export const THEMES = {
  dark: 'dark',
  light: 'light',
}

export const DEFAULT_THEME = THEMES.dark

/** アドレスバー等の色。テーマに合わせて変える */
const THEME_COLORS = {
  dark: '#070b14',
  light: '#ffffff',
}

const STORAGE_KEY = 'jikanwari-theme'

const ThemeContext = createContext(null)

/** <html> に反映する。ここが実際に見た目を切り替えている唯一の場所 */
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', THEME_COLORS[theme] ?? THEME_COLORS.dark)

  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // プライベートモード等で保存できなくても動作に支障はないため無視する
  }
}

function readStoredTheme() {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === THEMES.light || value === THEMES.dark ? value : DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readStoredTheme)

  // 起動時、IndexedDBに保存されている値で追いつく
  useEffect(() => {
    let cancelled = false
    settingsApi.getDisplaySettings().then((settings) => {
      if (cancelled) return
      const saved = settings.theme ?? DEFAULT_THEME
      setThemeState(saved)
      applyTheme(saved)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const setTheme = useCallback((next) => {
    setThemeState(next)
    applyTheme(next)
    // 保存の失敗で画面が戻ってしまわないよう、表示の切り替えとは切り離しておく
    settingsApi.updateDisplaySettings({ theme: next }).catch((e) => {
      console.error('テーマの保存に失敗しました', e)
    })
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === THEMES.dark ? THEMES.light : THEMES.dark)
  }, [theme, setTheme])

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme, isDark: theme === THEMES.dark }),
    [theme, setTheme, toggleTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme は ThemeProvider の内側で使ってください')
  return context
}
