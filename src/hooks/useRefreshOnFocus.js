import { useEffect, useRef } from 'react'

/**
 * 画面が再びアクティブになったとき(他のタブ/アプリから戻ってきた、
 * 画面ロックが解除された等)、渡した関数を呼び直す。
 *
 * 【フェーズ14: 複数端末間の同期】このアプリはonSnapshot(常時接続の
 * リアルタイム購読)までは使わず、「画面を見るタイミングで最新化する」
 * という軽量な方式にした。理由:
 *   - 個人利用のアプリで、2台の画面を同時に見比べ続ける使い方は想定しにくく、
 *     「次に見たときには最新になっている」で「速やかに反映」という要件は満たせる
 *   - 全画面をonSnapshot購読に置き換えるのは変更範囲が大きく、
 *     不具合が入り込む余地も増える
 * 常時のリアルタイム購読が必要になったら、この仕組みを差し替える。
 */
export function useRefreshOnFocus(reload) {
  const reloadRef = useRef(reload)
  reloadRef.current = reload

  useEffect(() => {
    const handleVisible = () => {
      if (document.visibilityState === 'visible') {
        reloadRef.current()
      }
    }
    document.addEventListener('visibilitychange', handleVisible)
    window.addEventListener('focus', handleVisible)
    return () => {
      document.removeEventListener('visibilitychange', handleVisible)
      window.removeEventListener('focus', handleVisible)
    }
  }, [])
}
