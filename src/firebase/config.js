import { getApps, initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'

/**
 * Firebaseへの接続設定(CLAUDE.md 絶対制約3: Sparkプラン限定)。
 *
 * 【この値は秘密情報ではない】
 * apiKey等はクライアントに公開される前提の値で、隠す必要はない。
 * 安全性は Firestore のセキュリティルール(フェーズ14)と
 * Authentication(このフェーズ)で担保する。
 *
 * .env.local に値を入れていない間は isFirebaseConfigured が false になり、
 * auth / db は null のままになる。まだFirebaseに繋いでいない開発中でも
 * アプリ全体が落ちないようにするための保険。
 */

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId)

let app = null
let auth = null
let db = null

if (isFirebaseConfigured) {
  app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig)
  auth = getAuth(app)
  // オフラインでも読み書きできるよう、端末内キャッシュを有効化する(絶対制約4)。
  // 複数タブ/ウィンドウで開いても片方だけがキャッシュを持つ状態にならないよう
  // persistentMultipleTabManager を使う。
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  })
}

export { app, auth, db }
