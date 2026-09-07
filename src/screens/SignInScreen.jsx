import { Button } from '../components/ScreenLayout.jsx'
import { AlertIcon, GridIcon } from '../components/icons.jsx'
import { useAuth } from '../firebase/AuthProvider.jsx'

/**
 * サインインが必須になったため(フェーズ13)、未サインイン時はこの画面だけを表示する。
 * サインインが終わると App.jsx が自動で通常のアプリに切り替える。
 */
export default function SignInScreen() {
  const { signIn, error, configured } = useAuth()

  return (
    <div className="app-viewport">
      <div className="app-frame flex flex-col items-center justify-center gap-6 p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="glow-sm flex h-16 w-16 items-center justify-center rounded-panel border border-cyan bg-cyan/10 text-cyan [--glow-color:var(--color-cyan)]">
            <GridIcon size={30} strokeWidth={1.5} />
          </span>
          <h1 className="font-hud text-xl font-bold text-hud">時間割管理</h1>
          <p className="max-w-xs text-sm leading-relaxed text-hud-dim">
            Googleアカウントでサインインすると、iPhoneとPCで同じ時間割・出欠・課題のデータを
            見られるようになります。
          </p>
        </div>

        {configured ? (
          <Button variant="primary" onClick={signIn} className="w-full max-w-xs py-3 text-base">
            Googleでサインイン
          </Button>
        ) : (
          <div className="flex max-w-xs gap-2 rounded-panel border border-alert bg-alert/10 p-3 text-left">
            <AlertIcon size={16} strokeWidth={1.7} className="mt-0.5 shrink-0 text-alert" />
            <p className="text-xs text-hud-dim">
              Firebaseの設定値が読み込まれていません。開発者向けの設定が必要です。
            </p>
          </div>
        )}

        {error && <p className="max-w-xs text-center text-xs text-alert">{error}</p>}

        <p className="max-w-xs text-center text-[11px] leading-relaxed text-hud-faint">
          このアプリはあなたのGoogleアカウントに紐づく形でデータを保存します。
          他の人とデータが共有されることはありません。
        </p>
      </div>
    </div>
  )
}
