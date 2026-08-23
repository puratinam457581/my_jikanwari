import { createContext, useCallback, useContext, useMemo, useState } from 'react'

/**
 * アプリ内の画面遷移を管理する仕組み。
 *
 * 【考え方】
 *  - tab   : 下部タブバーで選んでいる4画面のうちどれか
 *  - stack : タブ画面の上に「重ねて」開いた画面の履歴(授業詳細、編集フォームなど)
 *  - modal : 画面の上にさらに重ねる小さな入力画面(出欠登録など)
 *
 * ライブラリを使わず状態(useState)だけで管理している。理由は、
 * ホーム画面から起動したPWAにはブラウザの「戻る」ボタンが無く、
 * どのみち戻る操作を画面内に自前で用意する必要があるため。
 */

const NavigationContext = createContext(null)

export const TABS = [
  { key: 'timetable', label: '時間割' },
  { key: 'schedule', label: 'スケジュール' },
  { key: 'courseList', label: '講義リスト' },
  { key: 'myPage', label: 'マイページ' },
]

export function NavigationProvider({ children }) {
  const [tab, setTabState] = useState('timetable')
  const [stack, setStack] = useState([])
  const [modal, setModal] = useState(null)

  /** タブを切り替える。重ねて開いていた画面は閉じる */
  const setTab = useCallback((key) => {
    setTabState(key)
    setStack([])
    setModal(null)
  }, [])

  /** 画面を1枚重ねて開く */
  const push = useCallback((name, params = {}) => {
    setStack((prev) => [...prev, { name, params, key: `${name}-${prev.length}-${Date.now()}` }])
  }, [])

  /** 1枚戻る */
  const goBack = useCallback(() => {
    setStack((prev) => prev.slice(0, -1))
  }, [])

  /** 重ねた画面をすべて閉じてタブ画面に戻る */
  const popToTop = useCallback(() => setStack([]), [])

  /**
   * 現在の画面を、別の画面に置き換える。
   * 例: 「新規作成フォーム」で保存 →「作成した講義の詳細」に差し替える
   */
  const replace = useCallback((name, params = {}) => {
    setStack((prev) => [
      ...prev.slice(0, -1),
      { name, params, key: `${name}-${prev.length}-${Date.now()}` },
    ])
  }, [])

  const openModal = useCallback((name, params = {}) => setModal({ name, params }), [])
  const closeModal = useCallback(() => setModal(null), [])

  const value = useMemo(
    () => ({
      tab,
      setTab,
      stack,
      current: stack[stack.length - 1] ?? null,
      push,
      goBack,
      popToTop,
      replace,
      modal,
      openModal,
      closeModal,
    }),
    [tab, setTab, stack, push, goBack, popToTop, replace, modal, openModal, closeModal],
  )

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>
}

export function useNavigation() {
  const context = useContext(NavigationContext)
  if (!context) {
    throw new Error('useNavigation は NavigationProvider の内側で使ってください')
  }
  return context
}
