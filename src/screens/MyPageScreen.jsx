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
          <div className="mb-3 flex items-end justify-between">
            <span className="font-digit text-3xl font-bold text-hud">
              {earned}
              <span className="ml-1.5 text-sm font-normal text-hud-dim">
                / {required}
              </span>
              <span className="font-hud ml-1 text-xs text-hud-faint">単位</span>
            </span>
            <span
              className="font-digit text-glow text-xl font-bold text-cyan"
              style={{ '--glow-color': 'var(--color-cyan)' }}
            >
              {ratio}%
            </span>
          </div>

          {/* 進捗バー。計器のゲージらしく目盛りを刻む */}
          <div className="relative h-2.5 w-full overflow-hidden rounded-sharp border border-line bg-void">
            <div
              className="glow-sm h-full bg-cyan"
              style={{ width: `${ratio}%`, '--glow-color': 'var(--color-cyan)' }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(90deg, transparent 0 9px, rgba(7,11,20,0.85) 9px 10px)',
              }}
            />
          </div>

          <p className="mt-2 text-[11px] text-hud-faint">フェーズ2: 数値はダミーです</p>
        </Card>

        <Card title="設定">
          <LinkRow label="必要単位数・単位進捗" onClick={() => push('creditSettings')} />
          <LinkRow label="時限・曜日の設定" onClick={() => push('periodSettings')} />
          <LinkRow label="学期の管理" onClick={() => push('semesterSwitch')} />
        </Card>

        <Card title="データ">
          <LinkRow
            label="バックアップ(エクスポート/インポート)"
            value="フェーズ10"
            onClick={() => {}}
          />
          <LinkRow label="時間割を画像で保存" value="フェーズ10" onClick={() => {}} />
        </Card>

        <Card title="開発用">
          <LinkRow label="データ層の動作確認画面" onClick={() => push('devData')} />
        </Card>
      </div>
    </ScreenLayout>
  )
}
