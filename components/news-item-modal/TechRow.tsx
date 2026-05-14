interface TechRowProps {
  label: string
  value: string
  field: string
  copiedField: string | null
  onCopy: (value: string, field: string) => void
}

/**
 * Etikett + monospace-värde + kopiera-knapp.
 * Används i NewsItemModal:s "Teknisk information"-sektion. Extraherad
 * som egen fil (P2-5) så NewsItemModal blir mindre tung att läsa.
 */
export function TechRow({ label, value, field, copiedField, onCopy }: TechRowProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{
        fontFamily: 'var(--nd-font-mono)', fontSize: 10,
        textTransform: 'uppercase', letterSpacing: '0.04em',
        color: 'var(--nd-ink-mute)', minWidth: 96,
      }}>{label}</span>
      <code style={{
        flex: 1, fontFamily: 'var(--nd-font-mono)', fontSize: 11.5,
        color: 'var(--nd-ink)', background: 'var(--nd-surface)',
        padding: '4px 8px', borderRadius: 4,
        border: '1px solid var(--nd-line-soft)',
        wordBreak: 'break-all',
      }}>{value}</code>
      <button
        onClick={() => onCopy(value, field)}
        className="nd-btn nd-btn-ghost"
        style={{ padding: '4px 10px', fontSize: 11 }}
      >
        {copiedField === field ? 'Kopierad' : 'Kopiera'}
      </button>
    </div>
  )
}
