/**
 * NumberInput — numeric input that strips non-digit characters on change.
 * Replaces the document-level input listener previously in main.jsx.
 *
 * Usage:
 *   <NumberInput value={amount} onChange={setAmount} min={0} />
 */
export function NumberInput({ value, onChange, ...props }) {
  return (
    <input
      type="number"
      value={value}
      onChange={e => onChange(e.target.value.replace(/[^0-9]/g, ''))}
      {...props}
    />
  )
}
