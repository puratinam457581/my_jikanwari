import { useCallback, useEffect, useState } from 'react'
import ScreenLayout, { Button } from '../components/ScreenLayout.jsx'
import { useNavigation } from '../navigation/NavigationContext.jsx'
import {
  DAYS,
  attendanceApi,
  courseApi,
  semesterApi,
  settingsApi,
  timetableApi,
} from '../db/index.js'
import { AlertIcon } from '../components/icons.jsx'
import { findCurrentPeriod } from '../db/settings.js'

/** 時計の表示を更新する間隔(現在時限のハイライト用) */
const CLOCK_INTERVAL_MS = 60 * 1000

/**
 * 時間割画面(spec 4.1)。
 * コマへの配置・表示・タップ遷移・今日と現在時限のハイライトを担う。
 */
export default function TimetableScreen() {
  const { push, openModal } = useNavigation()
  const [semester, setSemester] = useState(null)
  const [periods, setPeriods] = useState([])
  const [visibleDays, setVisibleDays] = useState([])
  const [slotMap, setSlotMap] = useState(new Map())
  const [alertCourseIds, setAlertCourseIds] = useState(new Set())
  const [now, setNow] = useState(() => new Date())

  const load = useCallback(async () => {
    const [activeSemester, periodSettings, display] = await Promise.all([
      semesterApi.getActiveSemester(),
      settingsApi.getPeriodSettings(),
      settingsApi.getDisplaySettings(),
    ])
    setSemester(activeSemester)
    setPeriods(periodSettings)
    setVisibleDays(DAYS.filter((d) => display.visibleDays[d.value]))
    if (!activeSemester) return

    // 配置と講義を突き合わせて、コマごとに引ける形にしておく
    const [slots, courses] = await Promise.all([
      timetableApi.listSlots(activeSemester.id),
      courseApi.listCourses(activeSemester.id),
    ])

    const courseById = new Map(courses.map((c) => [c.id, c]))
    const map = new Map()
    for (const slot of slots) {
      const course = courseById.get(slot.courseId)
      if (course) map.set(`${slot.day}-${slot.period}`, course)
    }
    setSlotMap(map)

    // 配置済みの講義だけ、欠席上限に達しているかを調べる(spec 4.5)
    const placedIds = [...new Set([...map.values()].map((c) => c.id))]
    const absences = await attendanceApi.countAbsencesByCourse(placedIds)
    const reached = new Set(
      placedIds.filter((id) =>
        attendanceApi.isAbsenceLimitReached(courseById.get(id), absences.get(id) ?? 0),
      ),
    )
    setAlertCourseIds(reached)
  }, [])

  useEffect(() => {
    load().catch((e) => console.error(e))
  }, [load])

  // 日付が変わる・時限が進むのに追従するため、1分ごとに現在時刻を更新する
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), CLOCK_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  const today = now.getDay()
  const currentPeriod = findCurrentPeriod(periods, now)
  const isTodayVisible = visibleDays.some((d) => d.value === today)

  const courseAt = (day, period) => slotMap.get(`${day}-${period}`) ?? null

  /** 空きコマをタップ → 配置する講義を選ぶ(spec 4.1) */
  const openPicker = (day, period) =>
    openModal('coursePicker', {
      day,
      period,
      // モーダルは画面を差し替えないため、配置後に自分で読み直す
      onPlaced: () => load().catch((e) => console.error(e)),
    })

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
            {periods.map((p) => {
              // 「今まさに行われている時限」かどうか(今日が表示対象の場合のみ)
              const isNowPeriod = isTodayVisible && p.period === currentPeriod
              return (
                <tr key={p.period}>
                  <th className="align-top">
                    <div className="pt-1 text-center leading-tight">
                      <div
                        className={`font-digit text-sm font-bold md:text-xl ${
                          isNowPeriod ? 'text-glow text-cyan' : 'text-cyan'
                        }`}
                      >
                        {p.period}
                      </div>
                      <div className="font-digit mt-0.5 text-[8px] text-hud-faint md:text-[11px]">
                        {p.startTime}
                      </div>
                      <div className="font-digit text-[8px] text-hud-faint md:text-[11px]">
                        {p.endTime}
                      </div>
                      {isNowPeriod && (
                        <div className="font-hud mt-1 text-[8px] font-bold tracking-wider text-cyan md:text-[10px]">
                          NOW
                        </div>
                      )}
                    </div>
                  </th>

                  {visibleDays.map((day) => {
                    const course = courseAt(day.value, p.period)
                    const isToday = day.value === today
                    // 今日 × 現在時限 = 今の授業。最も強く強調する
                    const isNowCell = isToday && isNowPeriod
                    const isOverLimit = course ? alertCourseIds.has(course.id) : false
                    return (
                      <td key={day.value} className="h-20 p-0 align-top md:h-28">
                        {course ? (
                          <button
                            type="button"
                            onClick={() => push('courseDetail', { courseId: course.id })}
                            // 見た目はテーマごとに index.css の .tt-cell が決める
                            // (ダーク: 枠線を発光 / ライト: 講義カラーを淡く敷く)
                            // 警告(赤)は現在時限の強調(シアン)より優先する
                            className={`tt-cell relative flex h-full w-full flex-col items-center justify-between rounded-sharp p-1 text-center active:opacity-70 md:p-2 ${
                              isOverLimit
                                ? 'ring-2 ring-alert'
                                : isNowCell
                                  ? 'ring-2 ring-cyan'
                                  : ''
                            }`}
                            style={{ '--course-color': course.color }}
                          >
                            {/* 欠席が上限に達した講義は赤で警告する(spec 4.5) */}
                            {isOverLimit && (
                              <span
                                className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-alert text-white"
                                title="欠席が上限に達しています"
                              >
                                <AlertIcon size={11} strokeWidth={2.5} />
                              </span>
                            )}
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
                            onClick={() => openPicker(day.value, p.period)}
                            className={`tt-empty h-full w-full rounded-sharp active:opacity-70 ${
                              isNowCell
                                ? 'ring-2 ring-cyan'
                                : isToday
                                  ? 'ring-1 ring-cyan/25'
                                  : ''
                            }`}
                            aria-label={`${day.label}曜${p.period}限 空きコマ`}
                          />
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>

        {slotMap.size === 0 && periods.length > 0 && (
          <p className="mt-4 px-2 text-center text-[11px] text-hud-faint">
            空いているコマをタップすると、講義を配置できます
          </p>
        )}
      </div>
    </ScreenLayout>
  )
}
