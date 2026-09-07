import { createContext, useCallback, useContext, useMemo, useState } from 'react'

/**
 * 表示テーマ(ダーク/ライト)の管理(デザイン仕様6.5)。
 *
 * 【フェーズ13で方針変更】以前はIndexedDBにも保存し、起動時にそちらの値へ
 * 「追いつく」二段構えにしていた。しかしFirestore移行後、データの読み書きには
 * サインインが必須になった一方、ThemeProviderは(サインイン前の画面にも
 * 色を付けたいので)AuthProviderより外側にいる。サインイン前に読み書きしようと
 * するとエラーになるため、テーマは「その端末での見た目の好み」と割り切り、
 * localStorageだけで完結させることにした。これによりPCとiPhoneで
 * それぞれ別のテーマを選べる、という副次的な利点もある。
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

  const setTheme = useCallback((next) => {
    setThemeState(next)
    applyTheme(next)
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
