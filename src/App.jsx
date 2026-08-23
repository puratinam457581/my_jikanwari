/**
 * アプリのルートコンポーネント。
 * フェーズ0では初期化確認用の最小画面のみ。
 * 画面構成(4タブ)はフェーズ2で構築する。
 */
export default function App() {
  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <div className="text-center">
        <h1 className="text-xl font-bold text-neutral-800">時間割管理アプリ</h1>
        <p className="mt-2 text-sm text-neutral-500">
          セットアップ完了(フェーズ0)
        </p>
      </div>
    </div>
  )
}
