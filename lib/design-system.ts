// Newsdeck Design System v2 — design tokens as TypeScript constants.
// These mirror the --nd-* CSS variables in globals.css.
// Use for JS-side computations (priority colors, column color mapping).

export const PRIORITY_COLORS = {
  5: { color: 'oklch(0.66 0.22 25)',  soft: 'oklch(0.66 0.22 25 / 0.12)',  label: 'P1', name: 'Kritisk' },
  4: { color: 'oklch(0.78 0.17 65)',  soft: 'oklch(0.78 0.17 65 / 0.12)',  label: 'P2', name: 'Hög' },
  3: { color: 'oklch(0.76 0.13 220)', soft: 'oklch(0.76 0.13 220 / 0.12)', label: 'P3', name: 'Medel' },
  2: { color: 'oklch(0.60 0.02 250)', soft: 'oklch(0.60 0.02 250 / 0.12)', label: 'P4', name: 'Låg' },
  1: { color: 'oklch(0.55 0.01 250)', soft: 'oklch(0.55 0.01 250 / 0.10)', label: 'P5', name: 'Låg' },
} as const

export type PriorityLevel = keyof typeof PRIORITY_COLORS

export function getPriority(newsValue: number) {
  const v = Math.max(1, Math.min(5, Math.round(newsValue || 2))) as PriorityLevel
  return PRIORITY_COLORS[v]
}

// Deterministic column colors — same palette as the prototype
const COLUMN_COLORS: Record<string, string> = {
  breaking: 'oklch(0.64 0.22 25)',
  sthlm:    'oklch(0.72 0.14 220)',
  traffic:  'oklch(0.75 0.17 65)',
  police:   'oklch(0.70 0.14 280)',
  weather:  'oklch(0.76 0.15 180)',
  sport:    'oklch(0.78 0.16 140)',
  world:    'oklch(0.72 0.10 320)',
}

const FALLBACK_COLORS = [
  'oklch(0.72 0.14 220)',
  'oklch(0.75 0.17 65)',
  'oklch(0.70 0.14 280)',
  'oklch(0.76 0.15 180)',
  'oklch(0.78 0.16 140)',
  'oklch(0.72 0.10 320)',
  'oklch(0.74 0.12 260)',
]

export function getColumnColor(columnId: string): string {
  if (COLUMN_COLORS[columnId]) return COLUMN_COLORS[columnId]
  // Simple deterministic hash for unknown column IDs
  let h = 0
  for (let i = 0; i < columnId.length; i++) h = (h * 31 + columnId.charCodeAt(i)) >>> 0
  return FALLBACK_COLORS[h % FALLBACK_COLORS.length]
}

export function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60)    return 'nu'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

export function timeExact(iso: string): string {
  return new Date(iso).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
}

export function timeBucket(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 60000
  if (diff < 15)  return 'Senaste 15 min'
  if (diff < 60)  return 'Senaste timmen'
  if (diff < 180) return 'Senaste 3 timmarna'
  return 'Tidigare idag'
}
