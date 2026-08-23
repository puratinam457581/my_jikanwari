import { useId } from 'react'
import {
  COURSE_CATEGORIES,
  COURSE_CATEGORY_NONE,
  COURSE_CATEGORY_TYPES,
  COURSE_GROUPS,
  PRESET_COLORS,
} from '../db/index.js'
import { normalizeHex, readableTextOn } from '../utils/color.js'
import { CheckIcon } from './icons.jsx'

/**
 * 入力フォームで使う共通部品。
 * 見た目(色・角丸)は index.css の .field-* / .switch が持つので、
 * ここではテーマを意識しなくてよい。
 */

/** ラベル + 入力欄の組。1項目ぶんの枠 */
export function Field({ label, required = false, hint = null, error = null, children }) {
  return (
    <div className="mb-4 last:mb-0">
      <label className="field-label mb-1.5 flex items-center gap-1">
        {label}
        {required && <span className="text-alert">*</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-[11px] text-hud-faint">{hint}</p>}
      {error && <p className="mt-1 text-[11px] text-alert">{error}</p>}
    </div>
  )
}

/** 1行のテキスト入力 */
export function TextField({
  label,
  value,
  onChange,
  required = false,
  placeholder = '',
  hint = null,
  error = null,
  type = 'text',
  inputMode,
}) {
  return (
    <Field label={label} required={required} hint={hint} error={error}>
      <input
        type={type}
        inputMode={inputMode}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="field-input"
      />
    </Field>
  )
}

/** 数値入力。空欄を許すため、値は文字列のまま扱い、保存時に数値へ変換する */
export function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max,
  unit = null,
  hint = null,
  disabled = false,
}) {
  return (
    <Field label={label} hint={hint}>
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          value={value ?? ''}
          min={min}
          max={max}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="field-input font-digit"
        />
        {unit && <span className="shrink-0 text-sm text-hud-dim">{unit}</span>}
      </div>
    </Field>
  )
}

/** 複数行のテキスト入力 */
export function TextArea({ label, value, onChange, placeholder = '', rows = 4, hint = null }) {
  return (
    <Field label={label} hint={hint}>
      <textarea
        value={value ?? ''}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="field-input resize-none leading-relaxed"
      />
    </Field>
  )
}

/** ON/OFFスイッチ。ラベルと説明を左、スイッチを右に置く */
export function SwitchField({ label, checked, onChange, hint = null }) {
  const id = useId()
  return (
    <div className="mb-4 flex items-start justify-between gap-4 last:mb-0">
      <div className="min-w-0">
        <label htmlFor={id} className="field-label">
          {label}
        </label>
        {hint && <p className="mt-1 text-[11px] text-hud-faint">{hint}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        data-on={checked}
        onClick={() => onChange(!checked)}
        className="switch mt-0.5"
      >
        <span className="switch-knob" />
      </button>
    </div>
  )
}

/**
 * 講義カラーの選択(spec 4.6)。
 * プリセットから選ぶか、「カスタム」で任意のHEX値を選べる。
 */
export function ColorField({ label = 'カラー', value, onChange }) {
  const current = normalizeHex(value)
  const isPreset = PRESET_COLORS.some((c) => c.toLowerCase() === current.toLowerCase())

  return (
    <Field label={label}>
      <div className="flex flex-wrap gap-2">
        {PRESET_COLORS.map((color) => {
          const selected = color.toLowerCase() === current.toLowerCase()
          return (
            <button
              key={color}
              type="button"
              onClick={() => onChange(color)}
              aria-label={`カラー ${color}`}
              aria-pressed={selected}
              className="flex h-9 w-9 items-center justify-center rounded-sharp transition-transform active:scale-95"
              style={{
                backgroundColor: color,
                // 選択中は同じ色で発光させ、暗い背景でも分かるようにする
                boxShadow: selected ? `0 0 0 2px var(--color-hud), 0 0 10px -1px ${color}` : 'none',
              }}
            >
              {selected && (
                // 背景色の明るさに応じて、チェックを黒か白に切り替える
                <CheckIcon size={18} strokeWidth={2.5} color={readableTextOn(color)} />
              )}
            </button>
          )
        })}

        {/* カスタム。HTML標準のカラーピッカーを開く */}
        <label
          className="flex h-9 cursor-pointer items-center gap-1.5 rounded-sharp border border-line bg-panel-2 px-2.5"
          style={
            isPreset
              ? undefined
              : { boxShadow: `0 0 0 2px var(--color-hud), 0 0 10px -1px ${current}` }
          }
        >
          <span
            className="h-4 w-4 rounded-sharp border border-line"
            style={{ backgroundColor: current }}
          />
          <span className="font-hud text-[11px] font-semibold text-hud-dim">カスタム</span>
          <input
            type="color"
            value={current}
            onChange={(e) => onChange(e.target.value)}
            className="sr-only"
          />
        </label>
      </div>

      <p className="font-digit mt-2 text-[11px] text-hud-faint">{current.toUpperCase()}</p>
    </Field>
  )
}

/**
 * 科目区分の選択(spec 7.2)。
 * 「1〜3群 × 必修/選択」の6種類 + 未選択。
 * 群ごとに行を分けて並べ、シラバスの見え方に近い形にしている。
 */
export function CategoryField({ label = '科目区分', value, onChange }) {
  const current = value ?? COURSE_CATEGORY_NONE

  return (
    <Field label={label}>
      <button
        type="button"
        onClick={() => onChange(COURSE_CATEGORY_NONE)}
        aria-pressed={current === COURSE_CATEGORY_NONE}
        className={`font-hud mb-2 rounded-sharp border px-3 py-1.5 text-xs font-semibold ${
          current === COURSE_CATEGORY_NONE
            ? 'border-cyan bg-cyan/10 text-cyan'
            : 'border-line bg-panel-2 text-hud-dim'
        }`}
      >
        指定なし
      </button>

      <div className="space-y-1.5">
        {COURSE_GROUPS.map((group) => (
          <div key={group} className="flex items-center gap-2">
            <span className="font-digit w-8 shrink-0 text-xs text-hud-dim">{group}群</span>
            {COURSE_CATEGORY_TYPES.map((type) => {
              const option = COURSE_CATEGORIES.find(
                (c) => c.group === group && c.type === type,
              )
              const selected = current === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onChange(option.value)}
                  aria-pressed={selected}
                  className={`font-hud flex-1 rounded-sharp border py-1.5 text-xs font-semibold ${
                    selected
                      ? 'glow-sm border-cyan bg-cyan/10 text-cyan'
                      : 'border-line bg-panel-2 text-hud-dim'
                  }`}
                >
                  {type}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </Field>
  )
}

/** フォーム内の見出し付きのまとまり */
export function FormSection({ title, children }) {
  return (
    <section className="mb-3 rounded-panel border border-line bg-panel/80 p-4">
      {title && (
        <h2 className="font-hud mb-3 border-b border-line pb-2 text-sm font-semibold tracking-wide text-hud">
          {title}
        </h2>
      )}
      {children}
    </section>
  )
}
