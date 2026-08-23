/**
 * アプリアイコン(PNG)を生成するスクリプト。
 *
 *   node scripts/generate-icons.mjs
 *
 * 画像編集ソフトや外部ライブラリを使わず、Node標準の zlib だけで
 * PNGを組み立てている。理由は次の2点。
 *   - 追加のnpmパッケージ(sharp等)を入れずに済む
 *   - アイコンの見た目を変えたくなったら、このコードを直して再実行すればよい
 *
 * 生成物は public/ 配下に置かれ、そのままビルドに含まれる。
 */
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// ---------------- 配色(index.css のダークテーマに合わせる) ----------------

const VOID = [0x0a, 0x0e, 0x1a] // 背景
const PANEL = [0x16, 0x1d, 0x33] // 空きコマ
const LINE = [0x2a, 0x3a, 0x5e] // 枠線
const CYAN = [0x38, 0xbd, 0xf8]

/** 時間割らしさを出すために色を入れるコマ [列, 行, 色] */
const FILLED = [
  [0, 0, [0x38, 0xbd, 0xf8]], // スカイ
  [2, 0, [0xff, 0x9f, 0x45]], // オレンジ
  [1, 1, [0xa7, 0x8b, 0xfa]], // バイオレット
  [0, 2, [0x4a, 0xde, 0x80]], // グリーン
  [3, 2, [0xf4, 0x72, 0xb6]], // ピンク
  [1, 3, [0xff, 0xd9, 0x3d]], // イエロー
  [2, 4, [0x2d, 0xd4, 0xbf]], // ティール
]

const COLS = 4
const ROWS = 5

// ---------------- ごく簡単な描画 ----------------

/** size×size のRGBAバッファを作る(最初は不透明な背景色で塗る) */
function createCanvas(size, background) {
  const pixels = Buffer.alloc(size * size * 4)
  for (let i = 0; i < size * size; i += 1) {
    pixels[i * 4] = background[0]
    pixels[i * 4 + 1] = background[1]
    pixels[i * 4 + 2] = background[2]
    pixels[i * 4 + 3] = 255
  }
  return { size, pixels }
}

/** 矩形を塗る。alpha は 0〜1 で、下の色と混ぜ合わせる */
function fillRect(canvas, x, y, w, h, color, alpha = 1) {
  const { size, pixels } = canvas
  const x0 = Math.max(0, Math.round(x))
  const y0 = Math.max(0, Math.round(y))
  const x1 = Math.min(size, Math.round(x + w))
  const y1 = Math.min(size, Math.round(y + h))

  for (let py = y0; py < y1; py += 1) {
    for (let px = x0; px < x1; px += 1) {
      const i = (py * size + px) * 4
      for (let c = 0; c < 3; c += 1) {
        pixels[i + c] = Math.round(pixels[i + c] * (1 - alpha) + color[c] * alpha)
      }
    }
  }
}

/** 枠線だけの矩形 */
function strokeRect(canvas, x, y, w, h, color, thickness = 1, alpha = 1) {
  fillRect(canvas, x, y, w, thickness, color, alpha)
  fillRect(canvas, x, y + h - thickness, w, thickness, color, alpha)
  fillRect(canvas, x, y, thickness, h, color, alpha)
  fillRect(canvas, x + w - thickness, y, thickness, h, color, alpha)
}

/**
 * アイコン1枚ぶんを描く。
 * inset は「余白の割合」。maskable 用は端が切り取られるので余白を多めに取る。
 */
function drawIcon(size, inset) {
  const canvas = createCanvas(size, VOID)

  const pad = size * inset
  const areaX = pad
  const areaW = size - pad * 2
  // 上部に「見出し行」ぶんの帯を置き、残りをコマの格子にする
  const headerH = areaW * 0.09
  const gap = Math.max(1, areaW * 0.022)
  const gridY = pad + headerH + gap * 1.6
  const gridH = size - pad - gridY

  const cellW = (areaW - gap * (COLS - 1)) / COLS
  const cellH = (gridH - gap * (ROWS - 1)) / ROWS

  // 見出し行(曜日の帯のつもり)
  for (let col = 0; col < COLS; col += 1) {
    fillRect(canvas, areaX + col * (cellW + gap), pad, cellW, headerH, CYAN, 0.55)
  }

  const filledAt = new Map(FILLED.map(([col, row, color]) => [`${col},${row}`, color]))

  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const x = areaX + col * (cellW + gap)
      const y = gridY + row * (cellH + gap)
      const color = filledAt.get(`${col},${row}`)
      if (color) {
        fillRect(canvas, x, y, cellW, cellH, color, 1)
      } else {
        fillRect(canvas, x, y, cellW, cellH, PANEL, 1)
        strokeRect(canvas, x, y, cellW, cellH, LINE, Math.max(1, size / 256), 1)
      }
    }
  }

  return canvas
}

// ---------------- PNGの書き出し ----------------

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buffer) {
  let c = 0xffffffff
  for (let i = 0; i < buffer.length; i += 1) {
    c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8)
  }
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

function encodePng({ size, pixels }) {
  // 各行の先頭に「フィルタ種別 0(なし)」を1バイト付けるのがPNGの決まり
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 4 + 1)] = 0
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // ビット深度
  ihdr[9] = 6 // カラータイプ: RGBA
  ihdr[10] = 0 // 圧縮方式
  ihdr[11] = 0 // フィルタ方式
  ihdr[12] = 0 // インターレースなし

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ---------------- 実行 ----------------

/**
 * inset(余白)の使い分け:
 *   通常アイコン   0.14 … そのまま表示される
 *   maskable      0.20 … Androidで角を丸く切り取られても中身が欠けないように
 *   apple-touch   0.14 … iOSは角丸を自前で付けるので背景いっぱいに描く
 */
const TARGETS = [
  { path: 'public/icons/icon-192.png', size: 192, inset: 0.14 },
  { path: 'public/icons/icon-512.png', size: 512, inset: 0.14 },
  { path: 'public/icons/icon-maskable-512.png', size: 512, inset: 0.2 },
  { path: 'public/apple-touch-icon.png', size: 180, inset: 0.14 },
]

for (const { path, size, inset } of TARGETS) {
  const file = resolve(ROOT, path)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, encodePng(drawIcon(size, inset)))
  console.log(`生成: ${path} (${size}x${size})`)
}
