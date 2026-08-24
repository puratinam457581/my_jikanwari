import { useCallback, useEffect, useRef, useState } from 'react'
import ScreenLayout, { Button, Card, EmptyState } from '../components/ScreenLayout.jsx'
import { ChoiceField } from '../components/form.jsx'
import { InfoIcon } from '../components/icons.jsx'
import { DAYS, courseApi, semesterApi, settingsApi, timetableApi } from '../db/index.js'
import { canvasToBlob, renderTimetableCanvas } from '../utils/timetableImage.js'
import { fileDateStamp, saveFile } from '../utils/download.js'
import { useTheme } from '../theme/ThemeProvider.jsx'

/**
 * 週間時間割を1枚のPNG画像として書き出す(spec 6章)。
 *
 * 画像は画面を開いた時点で作っておく。iPhoneの共有シートは
 * 「ボタンを押した直後」でないと開けないため、押してから作り始めると
 * 間に合わないことがあるため。
 */
export default function TimetableImageScreen() {
  const { theme } = useTheme()
  const [imageTheme, setImageTheme] = useState(theme)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [preview, setPreview] = useState(null)
  const [message, setMessage] = useState(null)
  const blobRef = useRef(null)
  const previewUrlRef = useRef(null)
  const fileNameRef = useRef('timetable.png')

  const build = useCallback(async (selectedTheme) => {
    setLoading(true)
    setError(null)

    const [semester, periods, display] = await Promise.all([
      semesterApi.getActiveSemester(),
      settingsApi.getPeriodSettings(),
      settingsApi.getDisplaySettings(),
    ])
    if (!semester) {
      setError('学期が登録されていません')
      setLoading(false)
      return
    }

    const [slots, courses] = await Promise.all([
      timetableApi.listSlots(semester.id),
      courseApi.listCourses(semester.id),
    ])
    const courseById = new Map(courses.map((c) => [c.id, c]))
    const map = new Map()
    for (const slot of slots) {
      const course = courseById.get(slot.courseId)
      if (course) map.set(`${slot.day}-${slot.period}`, course)
    }

    const canvas = renderTimetableCanvas({
      title: `${semester.year}年度 ${semester.name}`,
      days: DAYS.filter((d) => display.visibleDays[d.value]),
      periods,
      courseAt: (day, period) => map.get(`${day}-${period}`) ?? null,
      theme: selectedTheme,
    })

    const blob = await canvasToBlob(canvas)
    blobRef.current = blob
    fileNameRef.current = `時間割_${semester.year}_${semester.name}_${fileDateStamp()}.png`

    // 直前のプレビューのURLを解放してから差し替える
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    previewUrlRef.current = URL.createObjectURL(blob)
    setPreview(previewUrlRef.current)
    setLoading(false)
  }, [])

  useEffect(() => {
    build(imageTheme).catch((e) => {
      console.error(e)
      setError('画像を作れませんでした')
      setLoading(false)
    })
  }, [build, imageTheme])

  // 画面を離れるときにURLを解放する
  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    },
    [],
  )

  const handleSave = async () => {
    if (!blobRef.current) return
    try {
      const result = await saveFile(blobRef.current, fileNameRef.current, {
        title: '時間割',
      })
      if (result === 'shared') setMessage('共有シートから保存できます')
      else if (result === 'downloaded') setMessage('画像を保存しました')
      else setMessage(null)
    } catch (e) {
      console.error(e)
      setMessage('保存できませんでした。画像を長押しして保存してください')
    }
  }

  return (
    <ScreenLayout title="時間割を画像で保存" showBack>
      <div className="p-3 pb-10">
        <Card title="書き出す見た目">
          <ChoiceField
            label="配色"
            value={imageTheme}
            onChange={setImageTheme}
            options={[
              { value: 'dark', label: 'ダーク' },
              { value: 'light', label: 'ライト' },
            ]}
            hint="アプリの表示テーマとは別に選べます"
          />
        </Card>

        <Card title="プレビュー">
          {error ? (
            <EmptyState>{error}</EmptyState>
          ) : loading ? (
            <EmptyState>作成中...</EmptyState>
          ) : (
            <>
              <img
                src={preview}
                alt="書き出す時間割の画像"
                className="w-full rounded-sharp border border-line"
              />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button variant="primary" onClick={handleSave}>
                  画像を保存
                </Button>
                {message && <span className="text-[11px] text-cyan">{message}</span>}
              </div>
            </>
          )}
        </Card>

        <Card title="保存のしかた">
          <div className="flex gap-2">
            <InfoIcon size={16} strokeWidth={1.6} className="mt-0.5 shrink-0 text-hud-faint" />
            <div className="space-y-1.5 text-[11px] leading-relaxed text-hud-dim">
              <p>
                <span className="text-hud">iPhone</span>:
                「画像を保存」を押すと共有シートが開きます。
                「"写真"に保存」を選ぶと写真アプリに入ります。
              </p>
              <p>
                <span className="text-hud">うまくいかないとき</span>:
                上のプレビュー画像を長押しして「"写真"に保存」でも保存できます。
              </p>
              <p>
                書き出されるのは、いま表示している学期の時間割です。
                表示していない曜日・時限は含まれません。
              </p>
            </div>
          </div>
        </Card>
      </div>
    </ScreenLayout>
  )
}
