import { useEffect, useState } from 'react'
import ScreenLayout, { Button } from '../components/ScreenLayout.jsx'
import { useNavigation } from '../navigation/NavigationContext.jsx'
import { DAYS, semesterApi, settingsApi } from '../db/index.js'
import { DUMMY_COURSES } from '../data/dummy.js'

/**
 * 時間割画面(spec 4.1)。
 * フェーズ2では「グリッドの骨組みと遷移」までを作る。
 * 実データとの接続・現在時限のハイライトはフェーズ4で仕上げる。
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
      wide
      title={semester ? `${semester.year}年 ${semester.name}` : '時間割'}
      rightAction={
        <Button onClick={() => push('semesterSwitch')}>学期切替</Button>
      }
    >
      <div className="p-2 md:p-5">
        <table className="w-full table-fixed border-separate border-spacing-1">
          <thead>
            <tr>
              <th className="w-9 md:w-16" />
              {visibleDays.map((day) => {
                const isToday = day.value === today
                return (
                  <th key={day.value} className="pb-1">
                    <span
                      className={`font-hud inline-flex h-6 w-6 items-center justify-center rounded-sharp text-xs font-bold md:h-8 md:w-8 md:text-base ${
                        isToday
                          ? 'glow-sm border border-cyan bg-cyan/15 text-cyan'
                          : 'text-hud-faint'
                      }`}
                    >
                      {day.label}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {periods.map((p) => (
              <tr key={p.period}>
                <th className="align-top">
                  <div className="pt-1 text-center leading-tight">
                    <div className="font-digit text-sm font-bold text-cyan md:text-xl">
                      {p.period}
                    </div>
                    <div className="font-digit mt-0.5 text-[8px] text-hud-faint md:text-[11px]">
                      {p.startTime}
                    </div>
                    <div className="font-digit text-[8px] text-hud-faint md:text-[11px]">
                      {p.endTime}
                    </div>
                  </div>
                </th>

                {visibleDays.map((day) => {
                  const course = courseAt(day.value, p.period)
                  const isToday = day.value === today
                  return (
                    <td key={day.value} className="h-20 p-0 align-top md:h-28">
                      {course ? (
                        <button
                          type="button"
                          onClick={() => push('courseDetail', { courseId: course.id })}
                          // 見た目はテーマごとに index.css の .tt-cell が決める
                          // (ダーク: 枠線を発光 / ライト: 講義カラーを淡く敷く)
                          className="tt-cell flex h-full w-full flex-col items-center justify-between rounded-sharp p-1 text-center active:opacity-70 md:p-2"
                          style={{ '--course-color': course.color }}
                        >
                          <span className="line-clamp-3 break-all text-[10px] leading-tight font-semibold md:text-sm">
                            {course.name}
                          </span>
                          <span className="font-digit w-full truncate rounded-sharp bg-panel-2 px-1 py-0.5 text-[9px] text-hud-dim md:px-2 md:py-1 md:text-xs">
                            {course.room || '未登録'}
                          </span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            openModal('coursePicker', { day: day.value, period: p.period })
                          }
                          className={`tt-empty h-full w-full rounded-sharp active:opacity-70 ${
                            isToday ? 'ring-1 ring-cyan/25' : ''
                          }`}
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

        <p className="mt-4 px-2 text-center text-[11px] text-hud-faint">
          フェーズ2: 表示中の講義はダミーです。
          <br />
          空きコマ・講義コマの両方をタップして遷移を確認してください。
        </p>
      </div>
    </ScreenLayout>
  )
}
