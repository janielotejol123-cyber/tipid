interface Props {
  value: number | ''
  onChange: (v: number | '') => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
}

/** ₱-prefixed numeric input with a numeric keyboard on phones */
export default function MoneyInput({ value, onChange, placeholder = '0', className = '', autoFocus }: Props) {
  return (
    <label className={`field flex items-center gap-2 focus-within:border-lime ${className}`}>
      <span className="text-muted font-semibold">₱</span>
      <input
        className="bg-transparent flex-1 min-w-0 h-full font-semibold"
        type="number" inputMode="decimal" min={0} step="0.01" placeholder={placeholder} autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
      />
    </label>
  )
}

export const n = (v: number | '') => (v === '' ? 0 : v)
