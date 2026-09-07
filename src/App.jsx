import { useEffect, useSyncExternalStore } from 'react'
import Sidebar from './components/Sidebar.jsx'
import TabBar from './components/TabBar.jsx'
import { NavigationProvider, useNavigation } from './navigation/NavigationContext.jsx'
import { ThemeProvider } from './theme/ThemeProvider.jsx'
import { AuthProvider, takeReturnScreen } from './firebase/AuthProvider.jsx'
import NotificationCenter from './notify/NotificationCenter.jsx'
import PwaBanner from './pwa/PwaBanner.jsx'
import { getState as getPwaState, subscribe as subscribePwa } from './pwa/updateBus.js'
import { MODAL_SCREENS, STACK_SCREENS, TAB_SCREENS } from './screens/index.js'

/**
 * アプリのルート。
 * 画面遷移の状態を NavigationProvider が、表示テーマを ThemeProvider が持ち、
 * AppShell がそれを見て「今どの画面を描くか」を決める。
 */
export default function App() {
  return (
    <ThemeProvider>
      {/* フェーズ12: 認証状態はここでアプリ全体に配る。
          データ層のFirestore移行(フェーズ13)までは、画面遷移は
          サインイン状態に関わらず今までどおり動く(ログイン必須にはまだしない)。 */}
      <AuthProvider>
        <NavigationProvider>
          <AppShell />
        </NavigationProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

function AppShell() {
  const { tab, current, modal, push } = useNavigation()
  // 更新の帯が出ているかどうか。追加ボタン(+)の位置を逃がすのに使う
  const { needRefresh, offlineReady } = useSyncExternalStore(subscribePwa, getPwaState, getPwaState)

  // Googleサインインからのリダイレクトで戻ってきた直後なら、
  // 元々開いていた画面に戻す(フェーズ12: 詳しくは firebase/AuthProvider.jsx 参照)
  useEffect(() => {
    const returnTo = takeReturnScreen()
    if (returnTo) push(returnTo)
  }, [push])

  const TabScreen = TAB_SCREENS[tab]
  const stackEntry = current ? STACK_SCREENS[current.name] : null
  const StackScreen = stackEntry?.component ?? null
  const ModalScreen = modal ? MODAL_SCREENS[modal.name] : null

  // 入力フォームなど、タブバーを隠したい画面かどうか
  const hideTabBar = stackEntry?.hideTabBar === true

  return (
    // app-viewport / app-frame がレイアウトの切り替えを担う(index.css)
    //   スマホ: スマホ幅で中央寄せ + 下部タブバー
    //   PC    : 左にサイドバー + 横幅いっぱいのコンテンツ
    <div className="app-viewport">
      <Sidebar />
      <div
        className="app-frame relative flex flex-col"
        data-banner={needRefresh || offlineReady ? 'true' : undefined}
      >
        <div className="min-h-0 flex-1">
          {StackScreen ? (
            // key を渡すことで、別の画面に移ったとき状態がリセットされる
            <StackScreen key={current.key} {...current.params} />
          ) : (
            <TabScreen />
          )}
        </div>

        {/* アプリを開いている間に届く通知のバナー(spec 5章) */}
        <NotificationCenter />

        {/* アプリ更新・オフライン準備完了の知らせ(フェーズ9) */}
        <PwaBanner />

        {!hideTabBar && <TabBar />}

        {ModalScreen && <ModalScreen {...modal.params} />}
      </div>
    </div>
  )
}
