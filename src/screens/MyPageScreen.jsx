import ScreenLayout, { Card, LinkRow } from '../components/ScreenLayout.jsx'
import { useNavigation } from '../navigation/NavigationContext.jsx'

/**
 * マイページ(spec 3章 / 4.11)。
 * 単位の進捗表示と、各設定画面への入り口をまとめる。
 * 数値の集計はフェーズ7で実装する。
 */
export default function MyPageScreen() {
  const { push } = useNavigation()

  // フェーズ2ではダミーの進捗
  const earned = 8
  const required = 124
  const ratio = Math.min(100, Math.round((earned / required) * 100))

  return (
    <ScreenLayout title="マイページ">
      <div className="p-3">
        <Card title="単位取得状況">
          <div className="mb-2 flex items-end justify-between">
            <span className="text-2xl font-bold text-neutral-800">
              {earned}
              <span className="ml-1 text-sm font-normal text-neutral-500">
                / {required} 単位
              </span>
            </span>
            <span className="text-sm font-bold text-sky-600">{ratio}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full rounded-full bg-sky-500"
              style={{ width: `${ratio}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-neutral-400">
            フェーズ2: 数値はダミーです
          </p>
        </Card>

        <Card title="設定">
          <LinkRow label="必要単位数・単位進捗" onClick={() => push('creditSettings')} />
          <LinkRow label="時限・曜日の設定" onClick={() => push('periodSettings')} />
          <LinkRow label="学期の管理" onClick={() => push('semesterSwitch')} />
        </Card>

        <Card title="データ">
          <LinkRow label="バックアップ(エクスポート/インポート)" value="フェーズ10" onClick={() => {}} />
          <LinkRow label="時間割を画像で保存" value="フェーズ10" onClick={() => {}} />
        </Card>

        <Card title="開発用">
          <LinkRow label="データ層の動作確認画面" onClick={() => push('devData')} />
        </Card>
      </div>
    </ScreenLayout>
  )
}
