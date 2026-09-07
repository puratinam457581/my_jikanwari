import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { auth, isFirebaseConfigured } from './config.js'
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
 * 【popupで統一する理由(2026-09-07)】
 * 以前はPWA(ホーム画面から起動、standalone表示)ではポップアップが
 * 開けないと考え、standalone時だけsignInWithRedirectに切り替えていた。
 * しかし実機検証の結果、redirect方式はiOSでは「ホーム画面アプリと
 * Safariの保存領域が別」という制約により、Googleの認証画面から
 * 正しく戻ってこられずサインインが完了しないことが判明した。
 * 一方popup方式はstandaloneでも問題なく動作する(勉強管理アプリ
 * 「benkyoujikan」で実績あり)ため、redirectへの切り替えをやめ、
 * 常にpopup方式に統一する。
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
      await signInWithPopup(auth, provider)
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
