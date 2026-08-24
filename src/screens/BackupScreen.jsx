import { useCallback, useEffect, useRef, useState } from 'react'
import ScreenLayout, { Button, Card, EmptyState } from '../components/ScreenLayout.jsx'
import { AlertIcon, DownloadIcon, InfoIcon, UploadIcon } from '../components/icons.jsx'
import { backupApi, settingsApi } from '../db/index.js'
import { fileDateStamp, saveFile } from '../utils/download.js'

/**
 * バックアップの書き出しと取り込み(spec 7.8 / 8-4)。
 *
 * このアプリはクラウド同期を持たないため、ブラウザがデータを消したら
 * 復旧手段はこのJSONファイルしかない。だからこの画面は
 * 「書き出しを促すこと」と「取り込みで事故を起こさないこと」を優先している。
 */
export default function BackupScreen() {
  const [loading, setLoading] = useState(true)
  const [lastBackupAt, setLastBackupAt] = useState(null)
  const [current, setCurrent] = useState([])
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  // 読み込んだファイルの中身。取り込み方を選ぶまでここで待たせる
  const [pending, setPending] = useState(null)
  const [busy, setBusy] = useState(false)
  const fileInputRef = useRef(null)

  const load = useCallback(async () => {
    const [settings, payload] = await Promise.all([
      settingsApi.getDisplaySettings(),
      backupApi.exportAll(),
    ])
    setLastBackupAt(settings.lastBackupAt ?? null)
    setCurrent(backupApi.summarize(payload))
    setLoading(false)
  }, [])

  useEffect(() => {
    load().catch((e) => {
      console.error(e)
      setLoading(false)
    })
  }, [load])

  const notify = (text) => {
    setMessage(text)
    setError(null)
    setTimeout(() => setMessage(null), 4000)
  }

  // ---------------- 書き出し ----------------

  const handleExport = async () => {
    setBusy(true)
    try {
      const payload = await backupApi.exportAll()
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      })
      const filename = `時間割バックアップ_${fileDateStamp()}.json`
      const result = await saveFile(blob, filename, { title: '時間割のバックアップ' })
      if (result !== 'canceled') {
        await backupApi.markBackedUp()
        await load()
        notify(
          result === 'shared'
            ? '共有シートから「"ファイル"に保存」を選んでください'
            : 'バックアップを保存しました',
        )
      }
    } catch (e) {
      console.error(e)
      setError('書き出しに失敗しました')
    } finally {
      setBusy(false)
    }
  }

  // ---------------- 取り込み ----------------

  const handleFile = async (event) => {
    const file = event.target.files?.[0]
    // 同じファイルを続けて選べるように、入力欄は毎回空にする
    event.target.value = ''
    if (!file) return

    setError(null)
    try {
      const payload = JSON.parse(await file.text())
      backupApi.validatePayload(payload)
      setPending({
        fileName: file.name,
        payload,
        summary: backupApi.summarize(payload),
        exportedAt: payload.exportedAt ?? null,
      })
    } catch (e) {
      console.error(e)
      setPending(null)
      setError(
        e instanceof SyntaxError
          ? 'JSONとして読めませんでした。ファイルが壊れていないか確認してください'
          : e.message,
      )
    }
  }

  const runImport = async (mode) => {
    if (!pending) return
    const confirmText =
      mode === 'replace'
        ? '今このアプリに入っているデータをすべて消して、バックアップの内容に置き換えます。\n\nこの操作は取り消せません。よろしいですか?'
        : '今のデータは残したまま、バックアップにしか無いデータを足します。\n\nよろしいですか?'
    if (!window.confirm(confirmText)) return

    setBusy(true)
    try {
      const result = await backupApi.importAll(pending.payload, { mode })
      setPending(null)
      const detail =
        mode === 'replace'
          ? `${result.replaced}件を復元しました`
          : `${result.added}件を追加、${result.skipped}件は既にあるため見送りました`
      // 画面全体が古いデータを表示したままにならないよう、読み込み直す
      window.alert(`取り込みが完了しました。\n${detail}\n\n画面を読み込み直します。`)
      window.location.reload()
    } catch (e) {
      console.error(e)
      setError(`取り込みに失敗しました: ${e.message}`)
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <ScreenLayout title="バックアップ" showBack>
        <EmptyState>読み込み中...</EmptyState>
      </ScreenLayout>
    )
  }

  const total = current.reduce((sum, row) => sum + row.count, 0)

  return (
    <ScreenLayout title="バックアップ" showBack>
      <div className="p-3 pb-10">
        {/* --- なぜ必要か --- */}
        <Card title="データはこの端末の中だけにあります">
          <div className="flex gap-2">
            <AlertIcon size={16} strokeWidth={1.7} className="mt-0.5 shrink-0 text-alert" />
            <div className="space-y-1.5 text-[11px] leading-relaxed text-hud-dim">
              <p>
                このアプリはサーバーを使わないため、入力したデータは
                <span className="text-hud">iPhoneのブラウザの中だけ</span>に保存されています。
              </p>
              <p>
                ブラウザは、空き容量が減ったときや長く使われなかったときに、
                このデータを消すことがあります。
                機種変更でも引き継がれません。
              </p>
              <p className="text-hud">
                定期的に書き出して、iCloud Driveなどに置いておいてください。
              </p>
            </div>
          </div>
          <p className="mt-3 border-t border-line pt-2 text-[11px] text-hud-faint">
            {lastBackupAt ? (
              <>
                前回の書き出し:{' '}
                <span className="font-digit text-hud-dim">{formatDate(lastBackupAt)}</span>
                {daysSince(lastBackupAt) >= 30 && (
                  <span className="ml-2 text-alert">
                    {daysSince(lastBackupAt)}日経過しています
                  </span>
                )}
              </>
            ) : (
              'まだ一度も書き出していません'
            )}
          </p>
        </Card>

        {/* --- 書き出し --- */}
        <Card title="書き出す(エクスポート)">
          <ul className="mb-3 space-y-1">
            {current.map((row) => (
              <li key={row.store} className="flex items-center justify-between text-xs">
                <span className="text-hud-dim">{row.label}</span>
                <span className="font-digit text-hud">
                  {row.count}
                  <span className="ml-1 text-[10px] text-hud-faint">件</span>
                </span>
              </li>
            ))}
          </ul>
          <Button variant="primary" onClick={handleExport} disabled={busy}>
            <span className="flex items-center gap-1.5">
              <DownloadIcon size={14} strokeWidth={1.8} />
              {total}件をJSONで書き出す
            </span>
          </Button>
        </Card>

        {/* --- 取り込み --- */}
        <Card title="取り込む(インポート)">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleFile}
            className="sr-only"
          />
          <Button onClick={() => fileInputRef.current?.click()} disabled={busy}>
            <span className="flex items-center gap-1.5">
              <UploadIcon size={14} strokeWidth={1.8} />
              バックアップファイルを選ぶ
            </span>
          </Button>

          {pending && (
            <div className="mt-3 rounded-sharp border border-cyan bg-cyan/5 p-3">
              <p className="font-hud text-xs font-semibold text-hud">{pending.fileName}</p>
              {pending.exportedAt && (
                <p className="font-digit mt-0.5 text-[10px] text-hud-faint">
                  書き出し日時: {formatDate(pending.exportedAt)}
                </p>
              )}
              <ul className="mt-2 space-y-1">
                {pending.summary.map((row) => (
                  <li key={row.store} className="flex items-center justify-between text-xs">
                    <span className="text-hud-dim">{row.label}</span>
                    <span className="font-digit text-hud">{row.count}</span>
                  </li>
                ))}
              </ul>

              <p className="mt-3 border-t border-line pt-2 text-[11px] text-hud-dim">
                取り込み方を選んでください。
              </p>
              <div className="mt-2 space-y-2">
                <ImportChoice
                  label="全置換して復元する"
                  hint="今のデータをすべて消し、このファイルの内容に置き換えます。機種変更やデータが消えたときの復元用。"
                  variant="danger"
                  onClick={() => runImport('replace')}
                  disabled={busy}
                />
                <ImportChoice
                  label="マージして追加する"
                  hint="今のデータは残したまま、このファイルにしか無いものだけを足します。同じデータがあれば、今あるほうを残します。"
                  onClick={() => runImport('merge')}
                  disabled={busy}
                />
              </div>

              <button
                type="button"
                onClick={() => setPending(null)}
                className="mt-3 text-[11px] text-hud-faint active:opacity-60"
              >
                やめる
              </button>
            </div>
          )}

          {error && <p className="mt-2 text-[11px] text-alert">{error}</p>}
          {message && <p className="mt-2 text-[11px] text-cyan">{message}</p>}
        </Card>

        <Card title="保存先の目安">
          <div className="flex gap-2">
            <InfoIcon size={16} strokeWidth={1.6} className="mt-0.5 shrink-0 text-hud-faint" />
            <div className="space-y-1.5 text-[11px] leading-relaxed text-hud-dim">
              <p>
                iPhoneでは共有シートから「"ファイル"に保存」→ iCloud Drive
                を選ぶと、機種変更しても引き継げます。
              </p>
              <p>
                取り込むときは、同じ共有シートやファイルアプリから
                このアプリに読み込ませてください。
              </p>
            </div>
          </div>
        </Card>
      </div>
    </ScreenLayout>
  )
}

/** 取り込み方の選択肢。押すと確認ダイアログが出る */
function ImportChoice({ label, hint, onClick, variant = 'ghost', disabled }) {
  return (
    <div>
      <Button variant={variant} onClick={onClick} disabled={disabled} className="w-full">
        {label}
      </Button>
      <p className="mt-1 text-[10px] leading-relaxed text-hud-faint">{hint}</p>
    </div>
  )
}

/** ISO文字列 → 2026/8/24 13:05 */
function formatDate(iso) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '不明'
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** 書き出しから何日経ったか */
function daysSince(iso) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 0
  return Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000))
}
