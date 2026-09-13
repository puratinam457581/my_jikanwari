import { getDoc, getDocFromCache, getDocs, getDocsFromCache } from 'firebase/firestore'

/**
 * 電波が弱い/不安定なときの「読み込み中」を短くするための読み込みラッパー
 * (2026-09-14、複数日使ってみての指摘を受けて追加)。
 *
 * 【問題1】Firestoreの getDoc/getDocs は、既定では「まずサーバーに問い合わせ、
 * オフラインだと判定できたらキャッシュに切り替える」という動きをする。
 * 完全な圏外ならすぐオフライン判定できるが、「繋がってはいるが遅い/不安定」な
 * ときは、サーバー問い合わせがタイムアウトするまで律儀に待ってしまい、
 * これが「読み込み中」が長く続く原因になっていた。
 *
 * 【対策1】オンライン/オフラインを厳密に判定しようとせず、一定時間
 * (TIMEOUT_MS)経ってもサーバーから返事が無ければ、待たずに端末内キャッシュの
 * 内容を先に返してしまう。
 *
 * 【問題2(2026-09-14 追加で判明)】対策1だけだと、画面を移動するたびに
 * (その画面が読み込むデータの数だけ)毎回2.5秒の判定をやり直してしまい、
 * 「ページ移動のたびに少し待たされる」「1画面内で複数回読み込むと
 * 2.5秒×回数ぶん待つ」という体感の悪さが残った。
 *
 * 【対策2】一度でも「電波が悪くてキャッシュに切り替えた」ことがあったら、
 * その事実をしばらく(OFFLINE_COOLDOWN_MS)覚えておき、その間は最初から
 * 判定を待たずに即キャッシュを返す。サーバーへの問い合わせ自体は裏で
 * 続けておき、どれか1つでも成功したら「電波が戻った」とみなして
 * 通常の動き(サーバー優先)に戻る。
 *
 * 【この方式でよいと判断した理由】ユーザーから「電波が悪いときは
 * 編集などができなくてもよいので、閲覧さえサクサクできればよい」との
 * 方針を確認済み。閲覧を最優先にする設計として、多少データが古い
 * (直近のキャッシュ)状態を許容する。取りこぼした最新データは、
 * 画面がアクティブに戻ったときの再取得(useRefreshOnFocus, フェーズ14)や、
 * 電波が戻った後の次の読み込みで追いつく。
 */
const TIMEOUT_MS = 2500

/** 一度「電波が悪い」と判定したら、この時間はキャッシュ優先を続ける */
const OFFLINE_COOLDOWN_MS = 15000

let offlineUntil = 0

function isProbablyOffline() {
  return Date.now() < offlineUntil
}

function markMaybeOffline() {
  offlineUntil = Date.now() + OFFLINE_COOLDOWN_MS
}

function markOnline() {
  offlineUntil = 0
}

/**
 * startServer: 引数なしでサーバーへの問い合わせを開始する関数
 * readFromCache: 引数なしでキャッシュから読む関数
 */
function withCacheFallback(startServer, readFromCache) {
  // 直近で「電波が悪い」と分かっているときは、判定を待たずに即キャッシュを返す。
  // サーバーへの問い合わせは裏で試しておき、複帰したら次回から通常運転に戻す。
  if (isProbablyOffline()) {
    startServer()
      .then(() => markOnline())
      .catch(() => {
        // まだ悪いままなので、クールダウンをそのまま延長しておく
        markMaybeOffline()
      })
    return readFromCache().catch(() => startServer())
  }

  let settled = false
  return new Promise((resolve, reject) => {
    const serverPromise = startServer()

    const timer = setTimeout(() => {
      if (settled) return
      markMaybeOffline()
      readFromCache()
        .then((cached) => {
          if (!settled) {
            settled = true
            resolve(cached)
          }
        })
        .catch(() => {
          // キャッシュに何も無ければ(この端末で一度も読んだことが無い等)、
          // サーバーの結果を待つしかないので何もしない
        })
    }, TIMEOUT_MS)

    serverPromise
      .then((result) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        markOnline()
        resolve(result)
      })
      .catch((error) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        markMaybeOffline()
        // サーバー問い合わせ自体がエラーになった場合も、キャッシュがあれば試す
        readFromCache()
          .then(resolve)
          .catch(() => reject(error))
      })
  })
}

/** getDoc の代わりに使う。使い方はgetDocと同じ */
export function fastGetDoc(ref) {
  return withCacheFallback(
    () => getDoc(ref),
    () => getDocFromCache(ref),
  )
}

/** getDocs の代わりに使う。使い方はgetDocsと同じ */
export function fastGetDocs(query) {
  return withCacheFallback(
    () => getDocs(query),
    () => getDocsFromCache(query),
  )
}
