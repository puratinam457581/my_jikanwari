/**
 * レコードのID(重複しない文字列)を生成する。
 *
 * crypto.randomUUID() は「安全なコンテキスト(https または localhost)」でしか
 * 使えない。iPhone実機から http://192.168.x.x:5173 で開く場合はこれに当たらず
 * undefined になるため、その場合用のフォールバックを用意している。
 */
export function newId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // 時刻(36進数) + 乱数。単一端末での利用なら衝突はまず起きない
  const time = Date.now().toString(36)
  const random = Math.random().toString(36).slice(2, 10)
  return `${time}-${random}`
}
