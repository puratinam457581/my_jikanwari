import ScreenLayout, { Card } from '../components/ScreenLayout.jsx'
import { findDummyCourse } from '../data/dummy.js'

/**
 * 【フェーズ2限定】中身を作るのが後のフェーズになる画面の仮実装。
 * 遷移が正しくつながっていることだけを確認するための枠。
 * 各画面は担当フェーズで個別のファイルに置き換える。
 */

function Placeholder({ phase, description }) {
  return (
    <Card>
      <p className="text-sm text-neutral-700">{description}</p>
      <p className="mt-2 inline-block rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-medium text-neutral-500">
        {phase} で実装
      </p>
    </Card>
  )
}

/** 講義編集フォーム(spec 4.2 / 4.5 / 4.6) */
export function CourseEditScreen({ courseId }) {
  const course = courseId ? findDummyCourse(courseId) : null
  return (
    <ScreenLayout
      title={course ? '講義を編集' : '講義を追加'}
      showBack
      rightAction={
        <span className="text-[11px] font-medium text-neutral-300">保存</span>
      }
    >
      <div className="p-3">
        <Placeholder
          phase="フェーズ3"
          description={
            course
              ? `「${course.name}」の編集フォーム。講義名・教員・教室・単位数・科目区分・シラバスURL・カラー・出席管理の設定を入力します。`
              : '新規講義の入力フォーム。講義名・教員・教室・単位数・科目区分・シラバスURL・カラー・出席管理の設定を入力します。'
          }
        />
      </div>
    </ScreenLayout>
  )
}

/** スケジュール登録フォーム(spec 4.10) */
export function ScheduleEditScreen({ scheduleId, courseId }) {
  return (
    <ScreenLayout
      title={scheduleId ? '予定を編集' : '予定を追加'}
      showBack
      rightAction={
        <span className="text-[11px] font-medium text-neutral-300">保存</span>
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
