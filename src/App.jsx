import TabBar from './components/TabBar.jsx'
import { NavigationProvider, useNavigation } from './navigation/NavigationContext.jsx'
import { ThemeProvider } from './theme/ThemeProvider.jsx'
import { MODAL_SCREENS, STACK_SCREENS, TAB_SCREENS } from './screens/index.js'

/**
 * アプリのルート。
 * 画面遷移の状態を NavigationProvider が、表示テーマを ThemeProvider が持ち、
 * AppShell がそれを見て「今どの画面を描くか」を決める。
 */
export default function App() {
  return (
    <ThemeProvider>
      <NavigationProvider>
        <AppShell />
      </NavigationProvider>
    </ThemeProvider>
  )
}

function AppShell() {
  const { tab, current, modal } = useNavigation()

  const TabScreen = TAB_SCREENS[tab]
  const stackEntry = current ? STACK_SCREENS[current.name] : null
  const StackScreen = stackEntry?.component ?? null
  const ModalScreen = modal ? MODAL_SCREENS[modal.name] : null

  // 入力フォームなど、タブバーを隠したい画面かどうか
  const hideTabBar = stackEntry?.hideTabBar === true

  return (
    // app-viewport / app-frame は、PCなど横に広い画面でも
    // スマホ幅を保って中央に表示するための枠(index.css)
    <div className="app-viewport">
      <div className="app-frame flex flex-col">
        <div className="min-h-0 flex-1">
          {StackScreen ? (
            // key を渡すことで、別の画面に移ったとき状態がリセットされる
            <StackScreen key={current.key} {...current.params} />
          ) : (
            <TabScreen />
          )}
        </div>

        {!hideTabBar && <TabBar />}

        {ModalScreen && <ModalScreen {...modal.params} />}
      </div>
    </div>
  )
}
