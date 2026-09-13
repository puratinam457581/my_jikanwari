import { getDoc, getDocFromCache, getDocs, getDocsFromCache } from 'firebase/firestore'

/**
 * 電波が弱い/不安定なときの「読み込み中」を短くするための読み込みラッパー
 * (2026-09-14、複数日使ってみての指摘を受けて追加)。
 *
 * 【問題】Firestoreの getDoc/getDocs は、既定では「まずサーバーに問い合わせ、
 * オフラインだと判定できたらキャッシュに切り替える」という動きをする。
 * 完全な圏外ならすぐオフライン判定できるが、「繋がってはいるが遅い/不安定」な
 * ときは、サーバー問い合わせがタイムアウトするまで律儀に待ってしまい、
 * これが「読み込み中」が長く続く原因になっていた。
 *
 * 【方針】オンライン/オフラインを厳密に判定しようとせず、一定時間
 * (TIMEOUT_MS)経ってもサーバーから返事が無ければ、待たずに端末内キャッシュの
 * 内容を先に返してしまう。電波が良く速いときは今まで通りサーバーの結果を
 * そのまま返すので、体感速度が犠牲になるのは電波が悪いときだけ。
 * 取りこぼした最新データは、画面がアクティブに戻ったときの再取得
 * (useRefreshOnFocus, フェーズ14)で追いつく。
 */
const TIMEOUT_MS = 2500

function withCacheFallback(serverPromise, readFromCache) {
  let settled = false
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (settled) return
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
        resolve(result)
      })
      .catch((error) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        // サーバー問い合わせ自体がエラーになった場合も、キャッシュがあれば試す
        readFromCache()
          .then(resolve)
          .catch(() => reject(error))
      })
  })
}

/** getDoc の代わりに使う。使い方はgetDocと同じ */
export function fastGetDoc(ref) {
  return withCacheFallback(getDoc(ref), () => getDocFromCache(ref))
}

/** getDocs の代わりに使う。使い方はgetDocsと同じ */
export function fastGetDocs(query) {
  return withCacheFallback(getDocs(query), () => getDocsFromCache(query))
}
