import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { auth, isFirebaseConfigured } from './config.js'
import { isStandalone } from '../notify/deliver.js'

/**
 * Googleログインの状態を、アプリ全体で使えるようにする(フェーズ12)。
 *
 * 【popupとredirectを使い分ける理由】
 * - PWA(ホーム画面から起動、standalone表示)ではポップアップウィンドウが
 *   開けないことがあるため、redirect方式が必要
 * - 一方で redirect方式は、Google → Firebaseの認証ドメイン → アプリ、と
 *   何度も画面を跨ぐため、Chromeの「バウンストラッキング対策」機能に
 *   中継地点(Firebaseの認証ドメイン)を怪しい中継サイトと誤認され、
 *   そこに保存された情報を消されてサインインが完了しないことがある
 *   (実機で確認済みの不具合)
 * 通常のブラウザタブではこの問題が起きないpopup方式を使い、
 * PWAとして起動しているときだけredirect方式に切り替える。
 */

const AuthContext = createContext(null)

/**
 * サインイン後にどの画面へ戻るかを覚えておく仕組み(redirect方式でのみ使う)。
 *
 * このアプリは「今開いている画面」をURLではなくメモリ上だけで持っている。
 * redirectでのサインインは本物のページ遷移を挟むため、何もしないと
 * 戻ってきた瞬間にアプリが起動し直され、常にトップ画面(時間割)に
 * 戻ってしまう。sessionStorageはページ遷移をまたいでも残るので、
 * ここに「戻りたい画面の名前」を一時的に置いておく。
 * popup方式ではページ遷移が起きないため、この仕組みは不要。
 *
 * 【フェーズ13で見直す】本実装のログイン画面では、そもそも
 * サインインしていない間はログイン画面自体がトップになる設計にする想定で、
 * その場合「戻る場所を覚える」必要が無くなる。この仕組みは
 * フェーズ12のテスト画面限定の一時的な対処。
 */
const RETURN_SCREEN_KEY = 'jikanwari:returnScreenAfterSignIn'

function rememberReturnScreen(screenName) {
  try {
    sessionStorage.setItem(RETURN_SCREEN_KEY, screenName)
  } catch {
    // プライベートブラウズ等でsessionStorageが使えない場合は諦める
  }
}

/** 覚えていた画面名を取り出し、記録は消す(1回きりなので) */
export function takeReturnScreen() {
  try {
    const value = sessionStorage.getItem(RETURN_SCREEN_KEY)
    if (value) sessionStorage.removeItem(RETURN_SCREEN_KEY)
    return value
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // 設定が無い場合は「確認中」を経由せず、最初から「未サインイン」扱いにする
  const [loading, setLoading] = useState(isFirebaseConfigured)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isFirebaseConfigured) return undefined

    // redirectでサインインして戻ってきた直後、その結果を受け取る。
    // ここで拾わなくても onAuthStateChanged 側で最終的にはuserが入るが、
    // エラー(ドメイン未許可など)はここでしか拾えない。
    getRedirectResult(auth).catch((e) => {
      console.error('サインインのリダイレクト処理に失敗しました', e)
      setError(e.message)
    })

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  /**
   * @param {string} [returnScreen] redirect方式になった場合、戻ってきたときに
   *   開いておきたい画面の名前(STACK_SCREENSのキー)
   */
  const signIn = useCallback(async (returnScreen) => {
    if (!isFirebaseConfigured) return
    setError(null)
    const provider = new GoogleAuthProvider()
    try {
      if (isStandalone()) {
        if (returnScreen) rememberReturnScreen(returnScreen)
        await signInWithRedirect(auth, provider)
      } else {
        await signInWithPopup(auth, provider)
      }
    } catch (e) {
      // ユーザーがポップアップを閉じただけの場合はエラー表示しない
      if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') {
        return
      }
      console.error('サインインできませんでした', e)
      setError(e.message)
    }
  }, [])

  const signOut = useCallback(async () => {
    if (!isFirebaseConfigured) return
    await firebaseSignOut(auth)
  }, [])

  const value = {
    user,
    loading,
    error,
    signIn,
    signOut,
    configured: isFirebaseConfigured,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth は AuthProvider の内側で使ってください')
  }
  return context
}
