import ScreenLayout, { Button, Card, EmptyState } from '../components/ScreenLayout.jsx'
import { AlertIcon, CheckIcon } from '../components/icons.jsx'
import { useAuth } from '../firebase/AuthProvider.jsx'

/**
 * 【フェーズ12限定の動作確認用画面】
 * Firebase Authentication(Googleログイン)が正しく動くかを
 * 目で確かめるための仮UI。データ層のFirestore移行(フェーズ13)が終わり、
 * 本来のログイン導線ができたら削除する。
 */
export default function FirebaseAuthTestScreen() {
  const { user, loading, error, signIn, signOut, configured } = useAuth()

  return (
    <ScreenLayout title="Firebase連携(テスト)" showBack>
      <div className="p-3 pb-10">
        <Card title="設定の状態">
          {configured ? (
            <p className="flex items-center gap-2 text-sm text-hud">
              <CheckIcon size={16} strokeWidth={2} className="text-cyan" />
              Firebaseの設定値が読み込まれています
            </p>
          ) : (
            <div className="flex gap-2">
              <AlertIcon size={16} strokeWidth={1.7} className="mt-0.5 shrink-0 text-alert" />
              <p className="text-sm text-hud-dim">
                Firebaseの設定値が入っていません。
                <br />
                プロジェクト直下に <code className="text-hud">.env.local</code> を作り、
                <code className="text-hud">.env.example</code> を参考に値を埋めてから、
                開発サーバーを再起動してください。
              </p>
            </div>
          )}
        </Card>

        {configured && (
          <Card title="サインインの状態">
            {loading ? (
              <EmptyState>確認中...</EmptyState>
            ) : user ? (
              <div className="space-y-2">
                <p className="flex items-center gap-2 text-sm text-hud">
                  <CheckIcon size={16} strokeWidth={2} className="text-cyan" />
                  サインイン済みです
                </p>
                <div className="rounded-sharp border border-line bg-panel-2 p-2.5 text-xs">
                  <p className="text-hud">{user.displayName ?? '(名前なし)'}</p>
                  <p className="mt-0.5 text-hud-dim">{user.email}</p>
                  <p className="font-digit mt-1 break-all text-[10px] text-hud-faint">
                    UID: {user.uid}
                  </p>
                </div>
                <Button variant="danger" onClick={signOut}>
                  サインアウト
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-hud-dim">まだサインインしていません</p>
                <Button variant="primary" onClick={() => signIn('firebaseAuthTest')}>
                  Googleでサインイン
                </Button>
                <p className="text-[11px] text-hud-faint">
                  通常のブラウザではポップアップが開きます。
                  iPhoneのPWA(ホーム画面起動)では、Googleのページに移動する形になります。
                </p>
              </div>
            )}

            {error && <p className="mt-2 text-[11px] text-alert">{error}</p>}
          </Card>
        )}
      </div>
    </ScreenLayout>
  )
}
