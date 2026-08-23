import { useCallback, useEffect, useState } from 'react'
import ScreenLayout, { Card, EmptyState } from '../components/ScreenLayout.jsx'
import { Field, FormSection } from '../components/form.jsx'
import { AlertIcon } from '../components/icons.jsx'
import { useNavigation } from '../navigation/NavigationContext.jsx'
import { DAYS, courseApi, semesterApi, settingsApi, timetableApi } from '../db/index.js'
import { MAX_PERIODS } from '../db/settings.js'
import { timeToMinutes } from '../utils/date.js'

/**
 * 時限・曜日の設定(spec 4.8)。
 *
 * 【重要】この画面の操作で、登録済みの講義データを消してはならない。
 * 時限数を減らす・曜日を非表示にすると、そこに配置された講義は
 * 「非表示になるだけで保持」され、下部に警告として一覧表示する。
 */
export default function PeriodSettingsScreen() {
  const { push } = useNavigation()
  const [loading, setLoading] = useState(true)
  const [periods, setPeriods] = useState([])
  const [periodCount, setPeriodCount] = useState(0)
  const [visibleDays, setVisibleDays] = useState([])
  const [hidden, setHidden] = useState([])

  const load = useCallback(async () => {
    const [periodSettings, display] = await Promise.all([
      settingsApi.getPeriodSettings(),
      settingsApi.getDisplaySettings(),
    ])
    setPeriods(periodSettings)
    setPeriodCount(periodSettings.length)
    setVisibleDays(display.visibleDays)

    // 今の設定では画面に出てこなくなる配置を、全学期から探す
    const [slots, semesters] = await Promise.all([
      timetableApi.listAllSlots(),
      semesterApi.listSemesters(),
    ])
    const maxPeriod = periodSettings.length
    const hiddenSlots = slots.filter(
      (slot) => slot.period > maxPeriod || display.visibleDays[slot.day] === false,
    )

    const semesterById = new Map(semesters.map((s) => [s.id, s]))
    const enriched = await Promise.all(
      hiddenSlots.map(async (slot) => ({
        ...slot,
        course: await courseApi.getCourse(slot.courseId),
        semester: semesterById.get(slot.semesterId) ?? null,
      })),
    )
    setHidden(
      enriched
        .filter((s) => s.course)
        .sort((a, b) => a.period - b.period || a.day - b.day),
    )
    setLoading(false)
  }, [])

  useEffect(() => {
    load().catch((e) => {
      console.error(e)
      setLoading(false)
    })
  }, [load])

  const changeCount = async (next) => {
    if (next < 1 || next > MAX_PERIODS) return
    await settingsApi.setPeriodCount(next)
    load()
  }

  const changeTime = async (period, key, value) => {
    // 入力中の見た目を先に更新してから保存する
    setPeriods((prev) => prev.map((p) => (p.period === period ? { ...p, [key]: value } : p)))
    await settingsApi.updatePeriodTime(period, { [key]: value })
  }

  const toggleDay = async (day) => {
    const next = [...visibleDays]
    next[day] = !next[day]
    // 全部OFFにすると時間割が真っ白になってしまうので、最低1日は残す
    if (next.every((v) => !v)) return
    setVisibleDays(next)
    await settingsApi.setDayVisible(day, next[day])
    load()
  }

  if (loading) {
    return (
      <ScreenLayout title="時限・曜日の設定" showBack>
        <EmptyState>読み込み中...</EmptyState>
      </ScreenLayout>
    )
  }

  return (
    <ScreenLayout title="時限・曜日の設定" showBack>
      <div className="p-3 pb-10">
        {/* --- 隠れているデータの警告(spec 4.8) --- */}
        {hidden.length > 0 && (
          <div className="mb-3 rounded-panel border border-alert bg-alert/10 p-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-alert">
              <AlertIcon size={16} strokeWidth={1.8} className="shrink-0" />
              表示されていない講義が{hidden.length}件あります
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-hud-dim">
              下の設定では時間割に出てきませんが、データは削除されていません。
              時限数を戻すか曜日を表示にすると、また現れます。
            </p>
            <ul className="mt-2 space-y-1">
              {hidden.map((slot) => (
                <li key={slot.id}>
                  <button
                    type="button"
                    onClick={() =>
                      push('courseDetail', {
                        courseId: slot.course.id,
                        day: slot.day,
                        period: slot.period,
                      })
                    }
                    className="flex w-full items-center gap-2 rounded-sharp bg-panel-2 px-2 py-1.5 text-left active:opacity-70"
                  >
                    <span
                      className="h-3 w-3 shrink-0 rounded-sharp"
                      style={{ backgroundColor: slot.course.color }}
                    />
                    <span className="font-digit shrink-0 text-[11px] text-alert">
                      {DAYS[slot.day].label} {slot.period}限
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs text-hud">
                      {slot.course.name}
                    </span>
                    {slot.semester && (
                      <span className="shrink-0 text-[10px] text-hud-faint">
                        {slot.semester.year}年度 {slot.semester.name}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* --- 時限数 --- */}
        <FormSection title="時限数">
          <Field label="表示する時限の数" hint={`1〜${MAX_PERIODS}まで設定できます`}>
            <div className="flex items-center gap-3">
              <Stepper
                label="減らす"
                onClick={() => changeCount(periodCount - 1)}
                disabled={periodCount <= 1}
              >
                −
              </Stepper>
              <span className="font-digit w-10 text-center text-2xl font-bold text-cyan">
                {periodCount}
              </span>
              <Stepper
                label="増やす"
                onClick={() => changeCount(periodCount + 1)}
                disabled={periodCount >= MAX_PERIODS}
              >
                ＋
              </Stepper>
            </div>
          </Field>
          <p className="text-[11px] text-hud-faint">
            減らしても、その時限に設定した時刻や配置済みの講義は消えません
          </p>
        </FormSection>

        {/* --- 各時限の時刻 --- */}
        <FormSection title="各時限の時刻">
          <ul className="space-y-2">
            {periods.map((p) => {
              const invalid =
                p.startTime &&
                p.endTime &&
                timeToMinutes(p.startTime) >= timeToMinutes(p.endTime)
              return (
                <li key={p.period}>
                  <div className="flex items-center gap-2">
                    <span className="font-digit w-8 shrink-0 text-sm font-bold text-cyan">
                      {p.period}
                    </span>
                    <input
                      type="time"
                      value={p.startTime ?? ''}
                      onChange={(e) => changeTime(p.period, 'startTime', e.target.value)}
                      aria-label={`${p.period}限の開始時刻`}
                      className="field-input"
                    />
                    <span className="shrink-0 text-hud-faint">〜</span>
                    <input
                      type="time"
                      value={p.endTime ?? ''}
                      onChange={(e) => changeTime(p.period, 'endTime', e.target.value)}
                      aria-label={`${p.period}限の終了時刻`}
                      className="field-input"
                    />
                  </div>
                  {invalid && (
                    <p className="mt-1 pl-10 text-[11px] text-alert">
                      終了時刻が開始時刻より前になっています
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
          <p className="mt-3 text-[11px] text-hud-faint">
            時刻は「現在の時限」のハイライトと、朝の時間割通知に使われます
          </p>
        </FormSection>

        {/* --- 表示曜日 --- */}
        <FormSection title="表示する曜日">
          <div className="flex flex-wrap gap-2">
            {DAYS.map((day) => {
              const on = visibleDays[day.value]
              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  aria-pressed={on}
                  className={`font-hud h-11 w-11 rounded-sharp border text-sm font-bold ${
                    on
                      ? 'glow-sm border-cyan bg-cyan/10 text-cyan'
                      : 'border-line bg-panel-2 text-hud-faint'
                  }`}
                >
                  {day.label}
                </button>
              )
            })}
          </div>
          <p className="mt-3 text-[11px] text-hud-faint">
            非表示にしても、その曜日に配置した講義は削除されません
          </p>
        </FormSection>

        <Card>
          <p className="text-xs leading-relaxed text-hud-dim">
            この画面の変更で、登録済みの講義・出欠・課題が消えることはありません。
            表示する範囲が変わるだけです。
          </p>
        </Card>
      </div>
    </ScreenLayout>
  )
}

function Stepper({ children, onClick, disabled, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="font-hud h-11 w-11 rounded-sharp border border-line bg-panel-2 text-lg font-bold text-hud active:opacity-70 disabled:opacity-30"
    >
      {children}
    </button>
  )
}
