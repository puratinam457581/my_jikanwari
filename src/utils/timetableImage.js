import { mixHex, normalizeHex } from './color.js'

/**
 * 週間時間割を1枚のPNG画像として描く(spec 6章)。
 *
 * 【html2canvas を使わなかった理由】
 * Tailwind CSS 4 は色を oklch() や color-mix() で出力するが、
 * html2canvas はこれらを解釈できず、色が黒く潰れてしまう。
 * 時間割は「格子に文字を並べる」だけの単純な図なので、
 * canvas に直接描いたほうが確実で、npmパッケージも増えない。
 */

/** 画像の色。アプリのダーク/ライトテーマに対応させる */
const PALETTE = {
  dark: {
    bg: '#0a0e1a',
    emptyCell: '#0d1220',
    line: '#1f2937',
    text: '#e5e7eb',
    dim: '#94a3b8',
    faint: '#64748b',
    accent: '#00f0ff',
    /** 講義カラーからコマの塗りを作る */
    cellFill: (color) => mixHex(color, '#111827', 0.16),
    cellBorder: (color) => color,
    cellText: '#e5e7eb',
    cellSub: '#cbd5e1',
  },
  light: {
    bg: '#ffffff',
    emptyCell: '#f8fafc',
    line: '#e2e8f0',
    text: '#1e293b',
    dim: '#64748b',
    faint: '#94a3b8',
    accent: '#3b82f6',
    cellFill: (color) => mixHex(color, '#ffffff', 0.45),
    cellBorder: (color) => mixHex(color, '#ffffff', 0.55),
    cellText: '#1e293b',
    cellSub: '#475569',
  },
}

/** 配置(論理ピクセル)。実際の出力はこれを SCALE 倍する */
const PAD = 20
const TITLE_H = 46
const HEAD_H = 30
const TIME_W = 54
const COL_W = 104
const ROW_H = 82
const GAP = 4
const FOOT_H = 26

/** 出力の倍率。2倍にして、スマホで見ても粗くならないようにする */
const SCALE = 2

const SANS = "'Hiragino Sans', 'Noto Sans JP', 'Yu Gothic', sans-serif"
const HUD = `'Rajdhani', ${SANS}`
const MONO = `'Share Tech Mono', ui-monospace, ${SANS}`

/** 角丸の四角。roundRect が無い環境でも落ちないようにしておく */
function roundRect(ctx, x, y, w, h, r) {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, r)
    return
  }
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/**
 * 行の先頭に来ると読みにくい文字(禁則処理)。
 * 「情報リテラシ / ー」のように伸ばし棒だけが次の行に落ちるのを防ぐ。
 */
const NO_LINE_START = 'ー、。,.!?」』）】〉》”’ぁぃぅぇぉっゃゅょゎヵヶァィゥェォッャュョヮ々〜:;'

/**
 * 文字を幅に収まるように折り返す。
 * 日本語には単語の区切りが無いので、1文字ずつ入るか試す。
 */
function wrapText(ctx, text, maxWidth, maxLines) {
  const lines = []
  let current = ''

  for (const char of text) {
    const candidate = current + char
    if (ctx.measureText(candidate).width <= maxWidth || current === '') {
      current = candidate
    } else if (NO_LINE_START.includes(char) && current !== '') {
      // 行頭に置けない文字は、多少はみ出しても前の行にぶら下げる
      current = candidate
    } else {
      lines.push(current)
      current = char
      if (lines.length === maxLines) break
    }
  }
  if (lines.length < maxLines && current !== '') lines.push(current)

  // 入りきらなかった場合は最後の行の末尾を「…」にする
  if (lines.length === maxLines) {
    const rest = text.slice(lines.join('').length)
    if (rest.length > 0) {
      let last = lines[maxLines - 1]
      while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) {
        last = last.slice(0, -1)
      }
      lines[maxLines - 1] = `${last}…`
    }
  }
  return lines
}

/**
 * 時間割を描いた canvas を返す。
 *
 * @param {object}   options
 * @param {string}   options.title    見出し(例 '2026年度 前期')
 * @param {Array}    options.days     [{ value, label }]
 * @param {Array}    options.periods  [{ period, startTime, endTime }]
 * @param {Function} options.courseAt (day, period) => 講義 または null
 * @param {'dark'|'light'} options.theme
 */
export function renderTimetableCanvas({ title, days, periods, courseAt, theme = 'dark' }) {
  const palette = PALETTE[theme] ?? PALETTE.dark

  const width = PAD * 2 + TIME_W + days.length * (COL_W + GAP) - GAP
  const height =
    PAD * 2 + TITLE_H + HEAD_H + periods.length * (ROW_H + GAP) - GAP + FOOT_H

  const canvas = document.createElement('canvas')
  canvas.width = width * SCALE
  canvas.height = height * SCALE
  const ctx = canvas.getContext('2d')
  ctx.scale(SCALE, SCALE)
  ctx.textBaseline = 'top'

  // --- 背景 ---
  ctx.fillStyle = palette.bg
  ctx.fillRect(0, 0, width, height)

  // --- 見出し ---
  ctx.fillStyle = palette.text
  ctx.font = `700 24px ${theme === 'dark' ? HUD : SANS}`
  ctx.textAlign = 'left'
  ctx.fillText(title, PAD, PAD + 4)

  ctx.strokeStyle = palette.accent
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(PAD, PAD + TITLE_H - 10)
  ctx.lineTo(width - PAD, PAD + TITLE_H - 10)
  ctx.stroke()

  const gridTop = PAD + TITLE_H
  const colX = (index) => PAD + TIME_W + index * (COL_W + GAP)
  const rowY = (index) => gridTop + HEAD_H + index * (ROW_H + GAP)

  // --- 曜日の見出し ---
  ctx.textAlign = 'center'
  ctx.font = `700 16px ${theme === 'dark' ? HUD : SANS}`
  days.forEach((day, index) => {
    ctx.fillStyle = palette.dim
    ctx.fillText(day.label, colX(index) + COL_W / 2, gridTop + 4)
  })

  // --- 時限の列 ---
  periods.forEach((period, index) => {
    const y = rowY(index)
    ctx.textAlign = 'right'
    ctx.fillStyle = palette.accent
    ctx.font = `700 18px ${theme === 'dark' ? HUD : SANS}`
    ctx.fillText(String(period.period), PAD + TIME_W - 12, y + 8)

    ctx.fillStyle = palette.faint
    ctx.font = `400 10px ${theme === 'dark' ? MONO : SANS}`
    if (period.startTime) ctx.fillText(period.startTime, PAD + TIME_W - 12, y + 30)
    if (period.endTime) ctx.fillText(period.endTime, PAD + TIME_W - 12, y + 44)
  })

  // --- コマ ---
  periods.forEach((period, rowIndex) => {
    days.forEach((day, colIndex) => {
      const x = colX(colIndex)
      const y = rowY(rowIndex)
      const course = courseAt(day.value, period.period)

      if (!course) {
        ctx.fillStyle = palette.emptyCell
        roundRect(ctx, x, y, COL_W, ROW_H, 6)
        ctx.fill()
        ctx.strokeStyle = palette.line
        ctx.lineWidth = 1
        ctx.stroke()
        return
      }

      const color = normalizeHex(course.color)
      ctx.fillStyle = palette.cellFill(color)
      roundRect(ctx, x, y, COL_W, ROW_H, 6)
      ctx.fill()
      ctx.strokeStyle = palette.cellBorder(color)
      ctx.lineWidth = 1.5
      ctx.stroke()

      // 講義名(最大3行)
      ctx.textAlign = 'left'
      ctx.fillStyle = palette.cellText
      ctx.font = `600 13px ${SANS}`
      const nameLines = wrapText(ctx, course.name ?? '', COL_W - 16, 3)
      nameLines.forEach((line, i) => {
        ctx.fillText(line, x + 8, y + 9 + i * 17)
      })

      // 教室名は下に寄せる
      if (course.room) {
        ctx.fillStyle = palette.cellSub
        ctx.font = `400 11px ${theme === 'dark' ? MONO : SANS}`
        const roomLines = wrapText(ctx, course.room, COL_W - 16, 1)
        ctx.fillText(roomLines[0] ?? '', x + 8, y + ROW_H - 20)
      }
    })
  })

  // --- 書き出した日付 ---
  const now = new Date()
  ctx.textAlign = 'right'
  ctx.fillStyle = palette.faint
  ctx.font = `400 10px ${theme === 'dark' ? MONO : SANS}`
  ctx.fillText(
    `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()} 時点`,
    width - PAD,
    height - PAD - 6,
  )

  return canvas
}

/** canvas を PNG の Blob にする */
export function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('画像を作れませんでした'))
    }, 'image/png')
  })
}
