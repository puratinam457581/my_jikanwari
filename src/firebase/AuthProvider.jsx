import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { auth, isFirebaseConfigured } from './config.js'
import { isStandalone } from '../notify/deliver.js'
import { setCurrentUid } from '../db/firestoreBase.js'
import { seedDefaultsIfNeeded } from '../db/seed.js'

/**
 * Googleログインの状態を、アプリ全体で使えるようにする(フェーズ12/13)。
 *
 * フェーズ13から、このアプリはサインイン必須になった。
 * サインインしていない間は AppShell を描画せず、SignInScreen だけを表示する
 * (App.jsx側の分岐)。そのため「サインイン前にどの画面を見ていたか」を
 * 覚えておく必要が無くなり、フェーズ12にあったsessionStorageの仕組みは
 * 撤去した。
 *
 * 【popupとredirectを使い分ける理由】
 * - PWA(ホーム画面から起動、standalone表示)ではポップアップウィンドウが
 *   開けないことがあるため、redirect方式が必要
 * - 一方でredirect方式は、Google → Firebaseの認証ドメイン → アプリ、と
 *   何度も画面を跨ぐため、Chromeの「バウンストラッキング対策」機能に
 *   中継地点(Firebaseの認証ドメイン)を怪しい中継サイトと誤認され、
 *   そこに保存された情報を消されてサインインが完了しないことがある
 *   (実機で確認済みの不具合)
 * 通常のブラウザタブではこの問題が起きないpopup方式を使い、
 * PWAとして起動しているときだけredirect方式に切り替える。
 */

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // 設定が無い場合は「確認中」を経由せず、最初から「未サインイン」扱いにする
  const [loading, setLoading] = useState(isFirebaseConfigured)
  const [seeding, setSeeding] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isFirebaseConfigured) return undefined

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setCurrentUid(nextUser?.uid ?? null)
      setUser(nextUser)
      setLoading(false)
      setError(null)

      if (nextUser) {
        setSeeding(true)
        seedDefaultsIfNeeded()
          .catch((e) => {
            console.error('初期データの用意に失敗しました', e)
            setError(e.message)
          })
          .finally(() => setSeeding(false))
      }
    })
    return unsubscribe
  }, [])

  const signIn = useCallback(async () => {
    if (!isFirebaseConfigured) return
    setError(null)
    const provider = new GoogleAuthProvider()
    try {
      if (isStandalone()) {
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
    seeding,
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
