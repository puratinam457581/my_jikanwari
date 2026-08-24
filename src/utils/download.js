/**
 * 作ったファイルを端末に渡す処理。
 *
 * 【iPhoneとPCで事情が違う】
 *   PC     … <a download> でそのまま保存できる
 *   iPhone … ホーム画面から起動したPWAでは <a download> がほぼ効かない。
 *            代わりに共有シート(navigator.share)から「"ファイル"に保存」
 *            「"写真"に保存」を選んでもらうのが確実。
 * そこで、共有が使えるならそちらを優先し、駄目ならダウンロードに切り替える。
 */

/** その端末で、ファイルの共有シートを開けるか */
export function canShareFile(file) {
  if (typeof navigator === 'undefined' || !navigator.canShare || !navigator.share) return false
  try {
    return navigator.canShare({ files: [file] })
  } catch {
    return false
  }
}

/**
 * Blob をファイルとして保存させる。
 * 戻り値は 'shared'(共有シートを開いた) / 'downloaded'(保存した) / 'canceled'。
 *
 * 【注意】iOS では、ボタンを押してから時間が経つと共有シートを開けなくなる。
 * Blob はあらかじめ作っておき、押された直後にこの関数を呼ぶこと。
 */
export async function saveFile(blob, filename, { title, text } = {}) {
  const file = new File([blob], filename, { type: blob.type })

  if (canShareFile(file)) {
    try {
      await navigator.share({ files: [file], title, text })
      return 'shared'
    } catch (error) {
      // ユーザーが共有シートを閉じた場合はエラーではない
      if (error?.name === 'AbortError') return 'canceled'
      console.warn('共有できなかったので保存に切り替えます', error)
    }
  }

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  // すぐ解放するとダウンロードが始まらない端末があるので少し待つ
  setTimeout(() => URL.revokeObjectURL(url), 10000)
  return 'downloaded'
}

/** ファイル名に使う日付(2026-08-24) */
export function fileDateStamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
