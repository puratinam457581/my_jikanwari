import TabBar from './components/TabBar.jsx'
import { NavigationProvider, useNavigation } from './navigation/NavigationContext.jsx'
import { MODAL_SCREENS, STACK_SCREENS, TAB_SCREENS } from './screens/index.js'

/**
 * アプリのルート。
 * 画面遷移の状態を NavigationProvider が持ち、AppShell がそれを見て
 * 「今どの画面を描くか」を決める。
 */
export default function App() {
  return (
    <NavigationProvider>
      <AppShell />
    </NavigationProvider>
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
    <div className="flex h-full flex-col">
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
  )
}
