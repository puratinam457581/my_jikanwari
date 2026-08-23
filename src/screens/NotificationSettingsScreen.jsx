import { useCallback, useEffect, useState } from 'react'
import ScreenLayout, { Button, Card, EmptyState } from '../components/ScreenLayout.jsx'
import { FormSection, SwitchField } from '../components/form.jsx'
import {
  AddToHomeIcon,
  AlertIcon,
  BellIcon,
  CheckIcon,
  InfoIcon,
  ShareIcon,
} from '../components/icons.jsx'
import { NOTICE_KINDS, notifyApi } from '../db/index.js'
import {
  getPermission,
  isIOS,
  isStandalone,
  requestPermission,
} from '../notify/deliver.js'
import { runNotifications, sendTestNotification } from '../notify/runner.js'

/**
 * 通知の設定と、通知が届く条件の説明(spec 5章)。
 *
 * iPhone では通知が届く条件が細かいので、「今どの状態か」を最初に見せて、
 * 足りないものだけを案内するようにしている。
 */
export default function NotificationSettingsScreen() {
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState(null)
  const [notices, setNotices] = useState([])
  const [permission, setPermission] = useState('default')
  const [message, setMessage] = useState(null)

  const standalone = isStandalone()
  const ios = isIOS()

  const load = useCallback(async () => {
    const [current, log] = await Promise.all([
      notifyApi.getNotificationSettings(),
      notifyApi.listNotices(),
    ])
    setSettings(current)
    setNotices(log)
    setPermission(getPermission())
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
    setTimeout(() => setMessage(null), 2500)
  }

  const toggle = async (kind, value) => {
    setSettings((prev) => ({ ...prev, [kind]: value }))
    await notifyApi.setNotificationEnabled(kind, value)
  }

  const handleRequest = async () => {
    const result = await requestPermission()
    setPermission(result)
    if (result === 'granted') notify('通知を許可しました')
    else if (result === 'denied') notify('通知が拒否されました')
  }

  const handleTest = async () => {
    const ok = await sendTestNotification()
    notify(ok ? 'テスト通知を送りました' : '通知を出せませんでした')
  }

  const handleCheckNow = async () => {
    const fired = await runNotifications()
    await load()
    notify(fired.length > 0 ? `${fired.length}件の通知を出しました` : '今出す通知はありません')
  }

  const handleClearLog = async () => {
    await notifyApi.clearNotices()
    await load()
  }

  const handleResetState = async () => {
    if (!window.confirm('「送信済み」の記録を消します。\n条件を満たしている通知がもう一度出ます。'))
      return
    await notifyApi.resetNoticeState()
    await load()
    notify('通知の記録をリセットしました')
  }

  if (loading || !settings) {
    return (
      <ScreenLayout title="通知の設定" showBack>
        <EmptyState>読み込み中...</EmptyState>
      </ScreenLayout>
    )
  }

  return (
    <ScreenLayout title="通知の設定" showBack>
      <div className="p-3 pb-10">
        {/* --- 今の状態 --- */}
        <Card title="通知の状態">
          <StatusRow
            ok={standalone}
            label="ホーム画面から起動している"
            detail={
              standalone
                ? 'PWAとして起動しています'
                : 'iPhoneでは、ホーム画面に追加したアイコンから開いたときだけ通知が使えます'
            }
          />
          <StatusRow
            ok={permission === 'granted'}
            label="通知が許可されている"
            detail={
              {
                granted: '通知を出せます',
                denied: '拒否されています。iPhoneの「設定 > 通知」から許可し直してください',
                default: 'まだ許可を求めていません',
                unsupported: 'この環境では通知に対応していません',
              }[permission]
            }
          />

          <div className="mt-3 flex flex-wrap gap-2">
            {permission === 'default' && (
              <Button variant="primary" onClick={handleRequest}>
                通知を許可する
              </Button>
            )}
            {permission === 'granted' && (
              <Button onClick={handleTest}>テスト通知を送る</Button>
            )}
            <Button onClick={handleCheckNow}>今すぐ確認する</Button>
          </div>

          {message && <p className="mt-2 text-[11px] text-cyan">{message}</p>}
        </Card>

        {/* --- iPhoneでの追加手順 --- */}
        {ios && !standalone && (
          <Card title="ホーム画面に追加する">
            <ol className="space-y-2 text-xs leading-relaxed text-hud-dim">
              <li className="flex gap-2">
                <span className="font-digit shrink-0 text-cyan">1</span>
                <span className="flex items-center gap-1.5">
                  Safariの下部にある共有ボタン
                  <ShareIcon size={14} strokeWidth={1.6} className="text-cyan" />
                  を押す
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-digit shrink-0 text-cyan">2</span>
                <span className="flex items-center gap-1.5">
                  <AddToHomeIcon size={14} strokeWidth={1.6} className="text-cyan" />
                  「ホーム画面に追加」を選ぶ
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-digit shrink-0 text-cyan">3</span>
                <span>追加されたアイコンから開き直し、この画面で通知を許可する</span>
              </li>
            </ol>
          </Card>
        )}

        {/* --- 通知が届くタイミングの説明 --- */}
        <Card title="通知が届くタイミング">
          <div className="flex gap-2">
            <InfoIcon size={16} strokeWidth={1.6} className="mt-0.5 shrink-0 text-hud-faint" />
            <div className="space-y-2 text-[11px] leading-relaxed text-hud-dim">
              <p>
                iPhoneには「アプリを閉じている間に、決まった時刻で通知を鳴らす」仕組みがありません
                (それには通知を配信するサーバーが必要で、このアプリは無料・サーバーなしの方針のため用意していません)。
              </p>
              <p className="text-hud">そのため、通知はこの2つのタイミングで出ます。</p>
              <ul className="ml-4 list-disc space-y-1">
                <li>アプリを開いている間に、その時刻になったとき</li>
                <li>アプリを開いた瞬間に、開いていない間に出るはずだった分をまとめて</li>
              </ul>
              <p>
                見逃した通知が消えることはありません。下の「最近のお知らせ」に必ず残ります。
              </p>
            </div>
          </div>
        </Card>

        {/* --- 種類ごとのON/OFF --- */}
        <FormSection title="通知する内容">
          {NOTICE_KINDS.map((kind) => (
            <SwitchField
              key={kind.value}
              label={kind.label}
              hint={kind.hint}
              checked={settings[kind.value] !== false}
              onChange={(value) => toggle(kind.value, value)}
            />
          ))}
        </FormSection>

        {/* --- お知らせ履歴 --- */}
        <Card
          title="最近のお知らせ"
          action={
            notices.length > 0 ? (
              <button
                type="button"
                onClick={handleClearLog}
                className="text-[11px] text-hud-faint active:opacity-60"
              >
                履歴を消す
              </button>
            ) : null
          }
        >
          {notices.length === 0 ? (
            <EmptyState>まだお知らせはありません</EmptyState>
          ) : (
            <ul className="space-y-2">
              {notices.map((notice) => (
                <li
                  key={notice.key}
                  className="rounded-sharp border border-line bg-panel-2 px-2.5 py-2"
                >
                  <div className="flex items-start gap-2">
                    <BellIcon
                      size={13}
                      strokeWidth={1.6}
                      className="mt-0.5 shrink-0 text-hud-faint"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-hud text-xs font-semibold text-hud">{notice.title}</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed whitespace-pre-line text-hud-dim">
                        {notice.body}
                      </p>
                    </div>
                    <span className="font-digit shrink-0 text-[10px] text-hud-faint">
                      {formatAt(notice.at)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="開発用">
          <p className="mb-2 text-[11px] leading-relaxed text-hud-faint">
            同じ通知は一度しか出ません。動作確認で繰り返し試したいときはここでリセットします。
          </p>
          <Button variant="danger" onClick={handleResetState}>
            通知の記録をリセット
          </Button>
        </Card>
      </div>
    </ScreenLayout>
  )
}

/** 条件を満たしているかどうかを○×で示す1行 */
function StatusRow({ ok, label, detail }) {
  return (
    <div className="mb-3 flex items-start gap-2 last:mb-0">
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sharp border ${
          ok ? 'border-cyan bg-cyan/10 text-cyan' : 'border-alert bg-alert/10 text-alert'
        }`}
      >
        {ok ? (
          <CheckIcon size={12} strokeWidth={3} />
        ) : (
          <AlertIcon size={12} strokeWidth={2.2} />
        )}
      </span>
      <div className="min-w-0">
        <p className="font-hud text-xs font-semibold text-hud">{label}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-hud-dim">{detail}</p>
      </div>
    </div>
  )
}

/** ISO文字列 → 8/24 07:00 */
function formatAt(iso) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  return `${date.getMonth() + 1}/${date.getDate()} ${time}`
}
