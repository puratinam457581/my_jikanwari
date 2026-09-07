import { useCallback, useEffect, useState } from 'react'
import ScreenLayout, { Card, EmptyState } from '../components/ScreenLayout.jsx'
import { CheckIcon, PencilIcon, TrashIcon } from '../components/icons.jsx'
import { useNavigation } from '../navigation/NavigationContext.jsx'
import { courseApi, semesterApi } from '../db/index.js'
import { useRefreshOnFocus } from '../hooks/useRefreshOnFocus.js'

/**
 * 学期の管理(spec 4.9)。
 * 前期/後期の切り替えと、過去の学期の閲覧を行う。
 * 学期を切り替えても過去のデータは削除されず、いつでも戻って参照できる。
 */
export default function SemesterSwitchScreen() {
  const { openModal, popToTop } = useNavigation()
  const [loading, setLoading] = useState(true)
  const [semesters, setSemesters] = useState([])
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    const list = await semesterApi.listSemesters()
    // 各学期の講義数を出して、中身のある学期が分かるようにする
    const withCounts = await Promise.all(
      list.map(async (semester) => ({
        ...semester,
        courseCount: (await courseApi.listCourses(semester.id)).length,
      })),
    )
    // 新しい学期を上に並べる
    setSemesters(withCounts.reverse())
    setLoading(false)
  }, [])

  useEffect(() => {
    load().catch((e) => {
      console.error(e)
      setLoading(false)
    })
  }, [load])

  // 他の端末で編集した内容を、次にこの画面を見たときには反映させる
  useRefreshOnFocus(() => load().catch((e) => console.error(e)))

  const handleSwitch = async (semester) => {
    if (semester.isActive) return
    await semesterApi.setActiveSemester(semester.id)
    // 時間割まで戻すことで、切り替えた学期が反映された状態で表示される
    popToTop()
  }

  const handleDelete = async (semester) => {
    if (
      !window.confirm(
        `「${semester.year}年度 ${semester.name}」を削除します。\nよろしいですか?`,
      )
    ) {
      return
    }
    try {
      await semesterApi.deleteEmptySemester(semester.id)
      setError(null)
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <ScreenLayout
      title="学期の管理"
      showBack
      rightAction={
        <button
          type="button"
          onClick={() => openModal('semesterEdit', { onSaved: load })}
          className="font-hud text-sm font-semibold text-cyan active:opacity-60"
        >
          追加
        </button>
      }
    >
      <div className="p-3">
        {error && (
          <p className="mb-3 rounded-sharp border border-alert/60 bg-alert/10 p-2.5 text-xs text-alert">
            {error}
          </p>
        )}

        {loading && <EmptyState>読み込み中...</EmptyState>}

        {!loading && semesters.length === 0 && (
          <EmptyState>学期が登録されていません</EmptyState>
        )}

        <ul className="space-y-2">
          {semesters.map((semester) => (
            <li
              key={semester.id}
              className={`flex items-center gap-3 rounded-panel border p-3 ${
                semester.isActive
                  ? 'glow-sm border-cyan bg-cyan/5'
                  : 'border-line bg-panel/80'
              }`}
            >
              <button
                type="button"
                onClick={() => handleSwitch(semester)}
                className="min-w-0 flex-1 text-left active:opacity-60"
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`font-hud text-sm font-bold ${
                      semester.isActive ? 'text-cyan' : 'text-hud'
                    }`}
                  >
                    {semester.year}年度 {semester.name}
                  </span>
                  {semester.isActive && (
                    <span className="font-hud flex items-center gap-0.5 rounded-sharp border border-cyan px-1.5 text-[10px] text-cyan">
                      <CheckIcon size={10} strokeWidth={3} />
                      表示中
                    </span>
                  )}
                </span>
                <span className="font-digit mt-1 block text-[11px] text-hud-dim">
                  {semester.startDate} 〜 {semester.endDate} ・ 講義
                  {semester.courseCount}件
                </span>
              </button>

              {/* 年度・学期名の修正。最初から入っている学期もここで直せる */}
              <button
                type="button"
                onClick={() =>
                  openModal('semesterEdit', { semesterId: semester.id, onSaved: load })
                }
                aria-label={`${semester.year}年度 ${semester.name} を編集`}
                className="shrink-0 text-cyan active:opacity-60"
              >
                <PencilIcon size={16} strokeWidth={1.5} />
              </button>

              {/* 誤って作った学期を消せるよう、講義が0件のときだけ削除を出す */}
              {!semester.isActive && semester.courseCount === 0 && (
                <button
                  type="button"
                  onClick={() => handleDelete(semester)}
                  aria-label={`${semester.year}年度 ${semester.name} を削除`}
                  className="shrink-0 text-hud-faint active:opacity-60"
                >
                  <TrashIcon size={16} strokeWidth={1.5} />
                </button>
              )}
            </li>
          ))}
        </ul>

        <Card className="mt-4">
          <p className="text-xs leading-relaxed text-hud-dim">
            学期を切り替えても、過去の学期の時間割・出欠記録は削除されません。
            いつでもここから戻って参照できます。年度や学期は鉛筆アイコンから直せます。
          </p>
          <p className="mt-2 text-xs leading-relaxed text-hud-faint">
            講義リストは学期ごとに独立しています。新しい学期では、同じ名前の講義でも
            改めて登録が必要です。
          </p>
        </Card>
      </div>
    </ScreenLayout>
  )
}
