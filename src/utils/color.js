/**
 * 色に関する計算。
 *
 * 主な用途は「ある背景色の上に置く文字を、白と黒どちらにすべきか」の判定
 * (ui-design-spec.md 6.6)。カラー選択UIのように、ユーザーが選んだ色を
 * そのまま背景に使う場面で必要になる。
 */

/** '#RRGGBB' → { r, g, b }(各0〜255)。不正な値なら null */
export function hexToRgb(hex) {
  if (typeof hex !== 'string') return null
  const value = hex.trim().replace(/^#/, '')
  const full =
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  }
}

/**
 * 相対輝度(0〜1)を求める。0が真っ黒、1が真っ白。
 * 単純な平均ではなく、人間の目が緑を明るく感じることを踏まえた
 * WCAG の計算式を使っている。
 */
export function relativeLuminance(hex) {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0

  const channel = (value) => {
    const v = value / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }

  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b)
}

/**
 * 白と黒のコントラスト比が入れ替わる輝度。
 * この値より明るい背景なら黒文字、暗い背景なら白文字のほうが読みやすい。
 * (WCAGのコントラスト比の式を白文字・黒文字で等しいと置いて解いた値)
 */
const CONTRAST_PIVOT = 0.179

/**
 * その色を背景にしたとき、読みやすい文字色を返す。
 * 明るい背景には濃色、暗い背景には白。
 */
export function readableTextOn(hex) {
  return relativeLuminance(hex) > CONTRAST_PIVOT ? '#0f172a' : '#ffffff'
}

/** '#RRGGBB' 形式として妥当か */
export function isValidHex(hex) {
  return hexToRgb(hex) !== null
}

/** 入力値を '#rrggbb' に整える。不正なら fallback を返す */
export function normalizeHex(hex, fallback = '#38BDF8') {
  const rgb = hexToRgb(hex)
  if (!rgb) return fallback
  const to2 = (n) => n.toString(16).padStart(2, '0')
  return `#${to2(rgb.r)}${to2(rgb.g)}${to2(rgb.b)}`
}

/**
 * 2色を混ぜる。ratio は base をどれだけ残すか(0〜1)。
 * 例: mixHex('#38BDF8', '#ffffff', 0.45) → 45%の水色を白で薄めた色
 *
 * CSS の color-mix() と同じことを JavaScript で行うためのもの。
 * canvas には color-mix() が使えないため、画像の書き出しで必要になる。
 */
export function mixHex(base, other, ratio) {
  const a = hexToRgb(base)
  const b = hexToRgb(other)
  if (!a || !b) return base
  const to2 = (n) => Math.round(n).toString(16).padStart(2, '0')
  const blend = (x, y) => to2(x * ratio + y * (1 - ratio))
  return `#${blend(a.r, b.r)}${blend(a.g, b.g)}${blend(a.b, b.b)}`
}
