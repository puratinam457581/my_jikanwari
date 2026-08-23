import { useEffect, useState } from 'react'
import ScreenLayout from '../components/ScreenLayout.jsx'
import { useNavigation } from '../navigation/NavigationContext.jsx'
import { DAYS, semesterApi, settingsApi } from '../db/index.js'
import { DUMMY_COURSES } from '../data/dummy.js'

/**
 * 時間割画面(spec 4.1)。
 * フェーズ2では「グリッドの骨組みと遷移」までを作る。
 * 実データとの接続・今日/現在時限のハイライトはフェーズ4で仕上げる。
 */
export default function TimetableScreen() {
  const { push, openModal } = useNavigation()
  const [semester, setSemester] = useState(null)
  const [periods, setPeriods] = useState([])
  const [visibleDays, setVisibleDays] = useState([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [activeSemester, periodSettings, display] = await Promise.all([
        semesterApi.getActiveSemester(),
        settingsApi.getPeriodSettings(),
        settingsApi.getDisplaySettings(),
      ])
      if (cancelled) return
      setSemester(activeSemester)
      setPeriods(periodSettings)
      setVisibleDays(DAYS.filter((d) => display.visibleDays[d.value]))
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const today = new Date().getDay()

  // フェーズ2ではダミー講義を曜日・時限で引けるようにしておく
  const courseAt = (day, period) =>
    DUMMY_COURSES.find((c) => c.day === day && c.period === period) ?? null

  return (
    <ScreenLayout
      title={semester ? `${semester.year}年 ${semester.name}` : '時間割'}
      rightAction={
        <button
          type="button"
          onClick={() => push('semesterSwitch')}
          className="rounded-full border border-neutral-300 px-2.5 py-1 text-[11px] font-medium text-neutral-600 active:bg-neutral-100"
        >
          学期切替
        </button>
      }
    >
      <div className="p-2">
        <table className="w-full table-fixed border-separate border-spacing-1">
          <thead>
            <tr>
              <th className="w-9" />
              {visibleDays.map((day) => (
                <th key={day.value} className="pb-1">
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      day.value === today
                        ? 'bg-sky-500 text-white'
                        : 'text-neutral-500'
                    }`}
                  >
                    {day.label}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periods.map((p) => (
              <tr key={p.period}>
                <th className="align-top">
                  <div className="pt-1 text-center leading-tight">
                    <div className="text-sm font-bold text-neutral-700">{p.period}</div>
                    <div className="text-[8px] text-neutral-400">{p.startTime}</div>
                    <div className="text-[8px] text-neutral-400">{p.endTime}</div>
                  </div>
                </th>
                {visibleDays.map((day) => {
                  const course = courseAt(day.value, p.period)
                  return (
                    <td key={day.value} className="h-20 p-0 align-top">
                      {course ? (
                        <button
                          type="button"
                          onClick={() => push('courseDetail', { courseId: course.id })}
                          className="flex h-full w-full flex-col items-center justify-between rounded-lg p-1 text-center"
                          style={{ backgroundColor: course.color }}
                        >
                          <span className="line-clamp-3 break-all text-[10px] font-bold leading-tight text-neutral-800">
                            {course.name}
                          </span>
                          <span className="w-full truncate rounded-full bg-white/70 px-1 py-0.5 text-[9px] text-neutral-600">
                            {course.room || '未登録'}
                          </span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            openModal('coursePicker', { day: day.value, period: p.period })
                          }
                          className="h-full w-full rounded-lg bg-white active:bg-neutral-100"
                          aria-label={`${day.label}曜${p.period}限 空きコマ`}
                        />
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>

        <p className="mt-3 px-2 text-center text-[11px] text-neutral-400">
          フェーズ2: 表示中の講義はダミーです。
          <br />
          空きコマ・講義コマの両方をタップして遷移を確認してください。
        </p>
      </div>
    </ScreenLayout>
  )
}
