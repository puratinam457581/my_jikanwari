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

/** スケジュール登録フォーム(spec 4.10) */
export function ScheduleEditScreen({ scheduleId, courseId }) {
  return (
    <ScreenLayout
      title={scheduleId ? '予定を編集' : '予定を追加'}
      showBack
      rightAction={
        <span className="font-hud text-[11px] font-semibold text-hud-faint">保存</span>
      }
    >
      <div className="p-3">
        <Placeholder
          phase="フェーズ6"
          description={`関連する講義・締切日時・カテゴリー・メモ・通知タイミングを入力するフォーム。${
            courseId ? '(授業詳細から開いたため、講義が初期選択されます)' : ''
          }`}
        />
      </div>
    </ScreenLayout>
  )
}

/** 学期切替画面(spec 4.9) */
export function SemesterSwitchScreen() {
  return (
    <ScreenLayout title="学期の管理" showBack>
      <div className="p-3">
        <Placeholder
          phase="フェーズ7"
          description="前期/後期の切り替えと、過去の学期の閲覧。過去のデータは削除せず残します。"
        />
      </div>
    </ScreenLayout>
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

/** 単位設定・進捗画面(spec 4.11) */
export function CreditSettingsScreen() {
  return (
    <ScreenLayout title="必要単位数・進捗" showBack>
      <div className="p-3">
        <Placeholder
          phase="フェーズ7"
          description="卒業/進級に必要な単位数の設定と、取得済み単位との比較表示。学期をまたいで累計します。"
        />
      </div>
    </ScreenLayout>
  )
}
