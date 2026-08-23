import ScreenLayout, { Card } from '../components/ScreenLayout.jsx'

/**
 * 【フェーズ2限定】中身を作るのが後のフェーズになる画面の仮実装。
 * 遷移が正しくつながっていることだけを確認するための枠。
 * 各画面は担当フェーズで個別のファイルに置き換える。
 */

function Placeholder({ phase, description }) {
  return (
    <Card>
      <p className="text-sm leading-relaxed text-hud-dim">{description}</p>
      <p className="font-hud mt-3 inline-block rounded-sharp border border-cyan/40 bg-cyan/5 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-cyan">
        {phase} で実装
      </p>
    </Card>
  )
}

/** 時限設定画面(spec 4.8) */
export function PeriodSettingsScreen() {
  return (
    <ScreenLayout title="時限・曜日の設定" showBack>
      <div className="p-3">
        <Placeholder
          phase="フェーズ8"
          description="時限数の増減、各時限の開始/終了時刻、時間割に表示する曜日の設定。"
        />
      </div>
    </ScreenLayout>
  )
}
