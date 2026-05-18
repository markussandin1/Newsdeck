# GridView v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bygga om Grid-vyn till en redaktörsöversikt med Hero (score-baserad), 2 secondary heroes, tidsband (15 min / 1h / Tidigare idag) och statisk karta i Hero.

**Architecture:** Ny pure score-funktion (`score = newsValue × exp(-ageMinutes/60)`) i `lib/grid-score.ts`. `GridView.tsx` skrivs om för att gruppera items i hero/secondary/band. Ny `StaticMapThumb`-komponent återanvänder Leaflet med interaktioner avstängda för Hero-kartan. Nya CSS-klasser `nd-gv-*` ersätter de gamla `nd-tile*`-klasserna (som bara används av GridView).

**Tech Stack:** Next.js 15, React 19, TypeScript, TailwindCSS-utility + global CSS, Leaflet (befintligt beroende), node:test för enhetstester.

**Spec:** `docs/superpowers/specs/2026-05-18-gridview-redesign-design.md`

---

## File Structure

| Fil | Roll |
|---|---|
| `lib/grid-score.ts` | **Ny.** Pure score-funktion + `groupItemsForGrid()` som returnerar `{ hero, secondary, bands }`. |
| `tests/grid-score.test.ts` | **Ny.** Enhetstester för score + grupperingen. |
| `components/StaticMapThumb.tsx` | **Ny.** Statisk Leaflet-thumbnail med prio-färgad marker och plats-chip. |
| `components/views/GridView.tsx` | **Skrivs om.** Ny JSX-struktur (Hero-rad + tidsband). |
| `app/globals.css` | **Modifiera.** Lägg till `nd-gv-*`-klasser, ta bort gamla `nd-tile*`/`nd-grid-bar`/`nd-grid-wrap`/`nd-tiles`/`nd-tile-big`/`nd-tile-mid`/`nd-stat*`/`nd-cat*` om de inte används någon annanstans. |

---

## Task 1: Score-funktion + tidsbucketing

**Files:**
- Create: `lib/grid-score.ts`
- Test: `tests/grid-score.test.ts`

- [ ] **Step 1: Skriv det fallande testet**

```typescript
// tests/grid-score.test.ts
import { strict as assert } from 'node:assert'
import { test, describe } from 'node:test'
import { scoreItem, groupItemsForGrid } from '../lib/grid-score'
import type { NewsItem } from '../lib/types'

function mkItem(overrides: Partial<NewsItem> & { ageMinutes: number; newsValue: number }): NewsItem & { columnId: string } {
  const ts = new Date(Date.now() - overrides.ageMinutes * 60_000).toISOString()
  return {
    dbId: `db-${Math.random().toString(36).slice(2)}`,
    workflowId: 'col-1',
    source: 'Test',
    title: 'Test item',
    timestamp: ts,
    newsValue: overrides.newsValue,
    columnId: 'col-1',
    ...overrides,
  } as NewsItem & { columnId: string }
}

describe('scoreItem', () => {
  test('newsValue 5 färsk (0 min) ger score 5', () => {
    const item = mkItem({ ageMinutes: 0, newsValue: 5 })
    assert.ok(Math.abs(scoreItem(item) - 5) < 0.01)
  })

  test('newsValue 5 60 min gammal ger score ~1.84 (5 × 1/e)', () => {
    const item = mkItem({ ageMinutes: 60, newsValue: 5 })
    const s = scoreItem(item)
    assert.ok(s > 1.7 && s < 2.0, `förväntade ~1.84, fick ${s}`)
  })

  test('färsk 4:a (5 min) slår gammal 5:a (90 min)', () => {
    const fresh4 = mkItem({ ageMinutes: 5, newsValue: 4 })
    const old5 = mkItem({ ageMinutes: 90, newsValue: 5 })
    assert.ok(scoreItem(fresh4) > scoreItem(old5))
  })

  test('använder createdInDb om det finns före timestamp', () => {
    const item = mkItem({ ageMinutes: 120, newsValue: 5 })
    item.createdInDb = new Date(Date.now() - 1 * 60_000).toISOString()
    // createdInDb är 1 min, timestamp är 120 min — score ska basera på createdInDb
    const s = scoreItem(item)
    assert.ok(s > 4.9, `förväntade ~5 (färsk via createdInDb), fick ${s}`)
  })
})

describe('groupItemsForGrid', () => {
  test('tom lista ger tomt resultat', () => {
    const r = groupItemsForGrid([])
    assert.equal(r.hero, null)
    assert.deepEqual(r.secondary, [])
    assert.equal(r.bands.last15.length, 0)
    assert.equal(r.bands.lastHour.length, 0)
    assert.equal(r.bands.earlierToday.length, 0)
  })

  test('1 item → bara Hero', () => {
    const items = [mkItem({ ageMinutes: 5, newsValue: 5 })]
    const r = groupItemsForGrid(items)
    assert.ok(r.hero)
    assert.equal(r.secondary.length, 0)
    assert.equal(r.bands.last15.length, 0)
  })

  test('5 items → Hero + 2 secondary + 2 i band', () => {
    const items = [
      mkItem({ ageMinutes: 5, newsValue: 5 }),   // hero
      mkItem({ ageMinutes: 10, newsValue: 5 }),  // secondary
      mkItem({ ageMinutes: 8, newsValue: 4 }),   // secondary
      mkItem({ ageMinutes: 12, newsValue: 3 }),  // last15
      mkItem({ ageMinutes: 30, newsValue: 3 }),  // lastHour
    ]
    const r = groupItemsForGrid(items)
    assert.ok(r.hero)
    assert.equal(r.secondary.length, 2)
    assert.equal(r.bands.last15.length, 1)
    assert.equal(r.bands.lastHour.length, 1)
    assert.equal(r.bands.earlierToday.length, 0)
  })

  test('items i topp-3 dyker inte upp i banden', () => {
    const items = [
      mkItem({ ageMinutes: 5, newsValue: 5 }),
      mkItem({ ageMinutes: 6, newsValue: 5 }),
      mkItem({ ageMinutes: 7, newsValue: 5 }),
    ]
    const r = groupItemsForGrid(items)
    assert.ok(r.hero)
    assert.equal(r.secondary.length, 2)
    assert.equal(r.bands.last15.length, 0)
  })

  test('item äldre än 24h hamnar inte i något band', () => {
    const items = [
      mkItem({ ageMinutes: 5, newsValue: 5 }),
      mkItem({ ageMinutes: 25 * 60, newsValue: 5 }), // 25h gammal
    ]
    const r = groupItemsForGrid(items)
    assert.ok(r.hero)
    assert.equal(r.secondary.length, 0) // den gamla 5:an exkluderas
    assert.equal(r.bands.earlierToday.length, 0)
  })

  test('banden sorteras på score fallande', () => {
    const items = [
      mkItem({ ageMinutes: 1, newsValue: 5 }),  // hero
      mkItem({ ageMinutes: 2, newsValue: 5 }),  // secondary
      mkItem({ ageMinutes: 3, newsValue: 5 }),  // secondary
      mkItem({ ageMinutes: 14, newsValue: 2 }), // last15, score ~1.6
      mkItem({ ageMinutes: 4, newsValue: 4 }),  // last15, score ~3.7
    ]
    const r = groupItemsForGrid(items)
    assert.equal(r.bands.last15.length, 2)
    assert.equal(r.bands.last15[0].newsValue, 4) // högsta score först
    assert.equal(r.bands.last15[1].newsValue, 2)
  })
})
```

- [ ] **Step 2: Kör testet, verifiera att det failar**

Run: `npm test -- tests/grid-score.test.ts`
Expected: FAIL — `Cannot find module '../lib/grid-score'`

- [ ] **Step 3: Implementera `lib/grid-score.ts`**

```typescript
// lib/grid-score.ts
import type { NewsItem } from './types'

export type ItemWithColumn = NewsItem & { columnId: string }

function ageMinutes(item: NewsItem): number {
  const ts = item.createdInDb || item.timestamp
  if (!ts) return Infinity
  const diffMs = Date.now() - new Date(ts).getTime()
  return diffMs / 60_000
}

export function scoreItem(item: NewsItem): number {
  const age = ageMinutes(item)
  return item.newsValue * Math.exp(-age / 60)
}

export interface GridGrouping {
  hero: ItemWithColumn | null
  secondary: ItemWithColumn[]
  bands: {
    last15: ItemWithColumn[]
    lastHour: ItemWithColumn[]
    earlierToday: ItemWithColumn[]
  }
}

export function groupItemsForGrid(items: ItemWithColumn[]): GridGrouping {
  const withScore = items
    .filter(i => ageMinutes(i) < 24 * 60) // 24h cutoff
    .map(i => ({ item: i, score: scoreItem(i), age: ageMinutes(i) }))
    .sort((a, b) => b.score - a.score)

  const hero = withScore[0]?.item ?? null
  const secondary = withScore.slice(1, 3).map(x => x.item)
  const restIds = new Set(withScore.slice(0, 3).map(x => x.item.dbId))

  const rest = withScore.filter(x => !restIds.has(x.item.dbId))
  const last15: ItemWithColumn[] = []
  const lastHour: ItemWithColumn[] = []
  const earlierToday: ItemWithColumn[] = []

  for (const { item, age } of rest) {
    if (age < 15) last15.push(item)
    else if (age < 60) lastHour.push(item)
    else earlierToday.push(item)
  }

  return { hero, secondary, bands: { last15, lastHour, earlierToday } }
}
```

- [ ] **Step 4: Kör testet, verifiera att det passar**

Run: `npm test -- tests/grid-score.test.ts`
Expected: PASS, alla beskrivna tester gröna.

- [ ] **Step 5: Type-check**

Run: `npm run type-check`
Expected: PASS, inga fel.

- [ ] **Step 6: Commit**

```bash
git add lib/grid-score.ts tests/grid-score.test.ts
git commit -m "feat(grid): score-funktion och gruppering för GridView v2"
```

---

## Task 2: StaticMapThumb-komponent

**Files:**
- Create: `components/StaticMapThumb.tsx`

- [ ] **Step 1: Skapa komponenten**

```tsx
// components/StaticMapThumb.tsx
'use client'

import { useEffect, useRef } from 'react'
import type { Map as LeafletMapInstance, Marker as LeafletMarker } from 'leaflet'

interface StaticMapThumbProps {
  lat: number
  lng: number
  zoom?: number
  markerColor?: string
  placeLabel?: string
}

export default function StaticMapThumb({
  lat,
  lng,
  zoom = 11,
  markerColor = '#dc2626',
  placeLabel,
}: StaticMapThumbProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<LeafletMapInstance | null>(null)
  const markerRef = useRef<LeafletMarker | null>(null)
  const initRef = useRef(false)

  useEffect(() => {
    const container = mapRef.current
    if (!container || initRef.current) return

    const init = async () => {
      initRef.current = true

      if (!document.querySelector('link[href*="leaflet.css"]')) {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='
        link.crossOrigin = ''
        document.head.appendChild(link)
      }

      const { default: L } = await import('leaflet')

      const map = L.map(container, {
        center: [lat, lng],
        zoom,
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
        boxZoom: false,
        keyboard: false,
      })

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(map)

      const icon = L.divIcon({
        className: 'static-map-marker',
        html: `<span style="
          display:block;width:22px;height:22px;border-radius:50%;
          background:${markerColor};border:3px solid #0b0d10;
          box-shadow:0 0 0 0 ${markerColor}99;
          animation:nd-marker-pulse 2s infinite;
        "></span>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      })

      markerRef.current = L.marker([lat, lng], { icon, interactive: false }).addTo(map)
      mapInstanceRef.current = map
    }

    init()

    return () => {
      mapInstanceRef.current?.remove()
      mapInstanceRef.current = null
      markerRef.current = null
      initRef.current = false
    }
  }, [lat, lng, zoom, markerColor])

  return (
    <div className="nd-gv-hero-map">
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      {placeLabel && <div className="nd-gv-hero-loc">{placeLabel}</div>}
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/StaticMapThumb.tsx
git commit -m "feat(grid): StaticMapThumb-komponent för Hero-karta"
```

---

## Task 3: CSS för GridView v2

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Lägg till nya `nd-gv-*`-klasser längst ner i `app/globals.css`**

Lokalisera slutet av filen och lägg till följande block (efter sista existerande regel, före eventuella stängande media queries — kolla med `tail -30 app/globals.css` först):

```css
/* ===== GridView v2 ===== */

.nd-gv-wrap {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 16px 16px 24px;
}

.nd-gv-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 4px 14px;
  border-bottom: 1px solid var(--nd-line);
  margin-bottom: 16px;
  font-size: 12px;
  color: var(--nd-ink-dim);
}
.nd-gv-bar-label { font-weight: 600; color: var(--nd-ink); }
.nd-gv-stats { display: flex; gap: 14px; flex-wrap: wrap; }
.nd-gv-stat { display: inline-flex; align-items: center; gap: 6px; font-family: var(--nd-mono); }
.nd-gv-stat-dot { width: 8px; height: 8px; border-radius: 50%; }

.nd-gv-hero-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 14px;
  margin-bottom: 22px;
}
.nd-gv-hero-row.cols-2 { grid-template-columns: 2fr 1fr; }
.nd-gv-hero-row.cols-1 { grid-template-columns: 1fr; }

.nd-gv-hero {
  position: relative;
  background: linear-gradient(180deg, color-mix(in oklch, var(--nd-pc) 18%, transparent), color-mix(in oklch, var(--nd-pc) 4%, transparent) 70%, transparent);
  border: 1px solid color-mix(in oklch, var(--nd-pc) 50%, var(--nd-line));
  border-radius: 12px;
  overflow: hidden;
  min-height: 280px;
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease;
}
.nd-gv-hero:hover { border-color: color-mix(in oklch, var(--nd-pc) 70%, var(--nd-line)); }
.nd-gv-hero::before {
  content: '';
  position: absolute; left: 0; top: 0; bottom: 0; width: 4px;
  background: var(--nd-pc);
  z-index: 2;
}
.nd-gv-hero.has-map { display: grid; grid-template-columns: 1.4fr 1fr; }
.nd-gv-hero-body { padding: 22px 24px; display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.nd-gv-hero-label {
  font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--nd-pc); display: inline-flex; align-items: center; gap: 8px;
}
.nd-gv-hero-pulse {
  width: 8px; height: 8px; background: var(--nd-pc); border-radius: 50%;
  box-shadow: 0 0 0 0 color-mix(in oklch, var(--nd-pc) 60%, transparent);
  animation: nd-pulse 2s infinite;
}
.nd-gv-hero h2 { font-size: 30px; line-height: 1.15; margin: 0; font-weight: 600; letter-spacing: -0.01em; text-wrap: pretty; }
.nd-gv-hero p { font-size: 14px; line-height: 1.55; color: var(--nd-ink-dim); margin: 0; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.nd-gv-hero-meta { font-size: 11px; color: var(--nd-ink-dim); margin-top: auto; display: flex; gap: 10px; font-family: var(--nd-mono); flex-wrap: wrap; }
.nd-gv-hero-meta .accent { color: var(--nd-pc); }

.nd-gv-hero-map { position: relative; min-height: 100%; border-left: 1px solid var(--nd-line); }
.nd-gv-hero-loc {
  position: absolute; left: 12px; bottom: 12px; z-index: 500;
  background: color-mix(in oklch, var(--nd-bg) 85%, transparent);
  backdrop-filter: blur(4px);
  padding: 6px 10px; border-radius: 6px; font-size: 11px;
  font-family: var(--nd-mono); color: var(--nd-ink);
  border: 1px solid color-mix(in oklch, var(--nd-ink) 8%, transparent);
}

@keyframes nd-pulse {
  0% { box-shadow: 0 0 0 0 color-mix(in oklch, var(--nd-pc) 70%, transparent); }
  70% { box-shadow: 0 0 0 10px color-mix(in oklch, var(--nd-pc) 0%, transparent); }
  100% { box-shadow: 0 0 0 0 color-mix(in oklch, var(--nd-pc) 0%, transparent); }
}
@keyframes nd-marker-pulse {
  0% { box-shadow: 0 0 0 0 rgba(220,38,38,0.6); }
  70% { box-shadow: 0 0 0 10px rgba(220,38,38,0); }
  100% { box-shadow: 0 0 0 0 rgba(220,38,38,0); }
}

.nd-gv-sec {
  background: rgba(255,255,255,0.03);
  border: 1px solid var(--nd-line);
  border-left: 3px solid var(--nd-pc);
  border-radius: 10px;
  padding: 16px 18px;
  min-height: 280px;
  display: flex; flex-direction: column; gap: 10px;
  cursor: pointer;
  transition: border-color 0.15s ease;
}
.nd-gv-sec.is-critical { background: linear-gradient(180deg, color-mix(in oklch, var(--nd-pc) 8%, transparent), rgba(255,255,255,0.025) 60%); }
.nd-gv-sec:hover { border-color: color-mix(in oklch, var(--nd-pc) 50%, var(--nd-line)); }
.nd-gv-sec-label { font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--nd-ink-dim); font-weight: 600; }
.nd-gv-sec-label.is-critical { color: var(--nd-pc); }
.nd-gv-sec h3 { font-size: 19px; line-height: 1.25; margin: 0; font-weight: 600; letter-spacing: -0.005em; text-wrap: pretty; }
.nd-gv-sec p { font-size: 12.5px; line-height: 1.5; color: var(--nd-ink-dim); margin: 0; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.nd-gv-sec-meta { font-size: 11px; color: var(--nd-ink-dim); margin-top: auto; font-family: var(--nd-mono); }

.nd-gv-band-head {
  font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--nd-ink-dim);
  margin: 22px 0 12px; padding-bottom: 8px; border-bottom: 1px solid var(--nd-line);
  display: flex; justify-content: space-between; align-items: baseline; font-weight: 600;
}
.nd-gv-band-head .count { color: color-mix(in oklch, var(--nd-ink-dim) 60%, transparent); font-weight: 400; }
.nd-gv-band.is-older .nd-gv-tile { opacity: 0.6; }

.nd-gv-tiles { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.nd-gv-tile {
  background: rgba(255,255,255,0.025);
  border: 1px solid var(--nd-line);
  border-left: 3px solid var(--nd-pc, var(--nd-line));
  border-radius: 8px;
  padding: 12px 14px;
  min-height: 110px;
  display: flex; flex-direction: column; gap: 6px;
  cursor: pointer;
  transition: border-color 0.15s ease;
}
.nd-gv-tile:hover { border-color: color-mix(in oklch, var(--nd-pc) 40%, var(--nd-line)); }
.nd-gv-tile h4 { font-size: 15px; line-height: 1.3; margin: 0; font-weight: 500; letter-spacing: -0.005em; text-wrap: pretty; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.nd-gv-tile-meta { font-size: 10px; color: var(--nd-ink-dim); margin-top: auto; font-family: var(--nd-mono); display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.nd-gv-prio { display: inline-block; font-size: 10px; padding: 1px 5px; border-radius: 3px; font-family: var(--nd-mono); color: #0b0d10; font-weight: 700; background: var(--nd-pc); }

.nd-gv-empty { padding: 60px 20px; text-align: center; color: var(--nd-ink-dim); font-size: 14px; }

@media (max-width: 1279px) {
  .nd-gv-hero-row { grid-template-columns: 1fr 1fr; }
  .nd-gv-hero-row.cols-2 { grid-template-columns: 1fr 1fr; }
  .nd-gv-hero-row > :nth-child(3) { display: none; }
  .nd-gv-tiles { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 767px) {
  .nd-gv-hero-row { grid-template-columns: 1fr; }
  .nd-gv-hero-row.cols-2 { grid-template-columns: 1fr; }
  .nd-gv-hero-row > :nth-child(3) { display: flex; }
  .nd-gv-hero.has-map { grid-template-columns: 1fr; }
  .nd-gv-hero-map { min-height: 180px; border-left: none; border-top: 1px solid var(--nd-line); }
  .nd-gv-tiles { grid-template-columns: repeat(2, 1fr); }
}
```

- [ ] **Step 2: Ta bort gamla `nd-tile*`, `nd-grid-wrap`, `nd-grid-bar`, `nd-tiles`, `nd-stat*` om de inte används av andra filer**

Verifiera först:
```bash
grep -rn "nd-tile\|nd-grid-wrap\|nd-grid-bar\|nd-tiles\|nd-stat\b\|nd-cat\b" --include="*.tsx" --include="*.ts" | grep -v GridView.tsx
```
Expected: tom output (eller bara träffar i `lib/design-system.ts` om de finns där — kolla manuellt).

Om inga andra användare finns, ta bort raderna i `app/globals.css` som matchar dessa selektorer (ligger runt rad 1031–1120 enligt nuläget). Behåll `.nd-sep` om den är generisk separator.

- [ ] **Step 3: Verifiera att CSS:en bygger**

Run: `npm run build`
Expected: PASS (eller om bygg är långsamt: `npm run lint` räcker för CSS-syntax via Next.js).

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "style(grid): CSS-klasser för GridView v2 (Hero/secondary/band)"
```

---

## Task 4: Skriv om GridView.tsx

**Files:**
- Modify: `components/views/GridView.tsx` (full rewrite)

- [ ] **Step 1: Ersätt hela filinnehållet**

```tsx
// components/views/GridView.tsx
'use client'

import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import { NewsItem as NewsItemType, DashboardColumn } from '@/lib/types'
import { getPriority, getColumnColor, timeAgo, PRIORITY_COLORS } from '@/lib/design-system'
import { groupItemsForGrid, type ItemWithColumn } from '@/lib/grid-score'
import { MapPin } from 'lucide-react'

const StaticMapThumb = dynamic(() => import('@/components/StaticMapThumb'), { ssr: false })

interface GridViewProps {
  columns: DashboardColumn[]
  columnData: Record<string, NewsItemType[]>
  onSelectItem: (item: NewsItemType) => void
}

function getCoordinates(item: NewsItemType): { lat: number; lng: number } | null {
  const c = item.location?.coordinates
  if (!c || c.length < 2) return null
  const [lat, lng] = c
  if (typeof lat !== 'number' || typeof lng !== 'number') return null
  return { lat, lng }
}

function getLocationSummary(item: NewsItemType): string | null {
  if (!item.location) return null
  const parts = [
    item.location.area || item.location.street || item.location.name,
    item.location.municipality,
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : null
}

function ageMinutesLabel(item: NewsItemType): string {
  return timeAgo(item.createdInDb || item.timestamp)
}

function isFresh(item: NewsItemType): boolean {
  const ts = item.createdInDb || item.timestamp
  if (!ts) return false
  return (Date.now() - new Date(ts).getTime()) / 60_000 < 30
}

export function GridView({ columns, columnData, onSelectItem }: GridViewProps) {
  const allItems = useMemo<ItemWithColumn[]>(() => {
    const items: ItemWithColumn[] = []
    Object.entries(columnData).forEach(([columnId, colItems]) => {
      colItems.forEach(item => items.push({ ...item, columnId }))
    })
    return items
  }, [columnData])

  const grouping = useMemo(() => groupItemsForGrid(allItems), [allItems])

  const criticalCount = allItems.filter(i => i.newsValue === 5).length
  const highCount = allItems.filter(i => i.newsValue === 4).length
  const mediumCount = allItems.filter(i => i.newsValue === 3).length

  const heroCols =
    grouping.hero && grouping.secondary.length >= 2 ? '' :
    grouping.hero && grouping.secondary.length === 1 ? 'cols-2' :
    grouping.hero ? 'cols-1' : ''

  if (!grouping.hero) {
    return (
      <div className="nd-gv-wrap">
        <div className="nd-gv-empty">Inga händelser senaste 24 timmarna.</div>
      </div>
    )
  }

  return (
    <div className="nd-gv-wrap">
      <div className="nd-gv-bar">
        <span className="nd-gv-bar-label">Översikt · Sverige senaste timmen</span>
        <div className="nd-gv-stats">
          <Stat label="Totalt" value={allItems.length} />
          <Stat label={PRIORITY_COLORS[5].name} value={criticalCount} dotColor={PRIORITY_COLORS[5].color} />
          <Stat label={PRIORITY_COLORS[4].name} value={highCount} dotColor={PRIORITY_COLORS[4].color} />
          <Stat label={PRIORITY_COLORS[3].name} value={mediumCount} dotColor={PRIORITY_COLORS[3].color} />
          <Stat label="Kolumner" value={columns.length} />
        </div>
      </div>

      <div className={`nd-gv-hero-row ${heroCols}`}>
        <HeroCard item={grouping.hero} columns={columns} onSelect={onSelectItem} />
        {grouping.secondary.map(item => (
          <SecondaryCard key={item.dbId} item={item} columns={columns} onSelect={onSelectItem} />
        ))}
      </div>

      <Band title="Senaste 15 minuter" items={grouping.bands.last15} columns={columns} onSelect={onSelectItem} />
      <Band title="Senaste timmen" items={grouping.bands.lastHour} columns={columns} onSelect={onSelectItem} />
      <Band title="Tidigare idag" items={grouping.bands.earlierToday} columns={columns} onSelect={onSelectItem} older />
    </div>
  )
}

function Stat({ label, value, dotColor }: { label: string; value: number; dotColor?: string }) {
  return (
    <span className="nd-gv-stat">
      {dotColor && <span className="nd-gv-stat-dot" style={{ background: dotColor }} />}
      <span>{label}</span>
      <span style={{ fontWeight: 700 }}>{value}</span>
    </span>
  )
}

function HeroCard({
  item,
  columns,
  onSelect,
}: {
  item: ItemWithColumn
  columns: DashboardColumn[]
  onSelect: (i: NewsItemType) => void
}) {
  const p = getPriority(item.newsValue)
  const coords = getCoordinates(item)
  const place = getLocationSummary(item)
  const col = columns.find(c => c.id === item.columnId)
  const labelText = p.name
  const fresh = isFresh(item)

  return (
    <article
      className={`nd-gv-hero ${coords ? 'has-map' : ''}`}
      style={{ ['--nd-pc' as string]: p.color }}
      onClick={() => onSelect(item)}
    >
      <div className="nd-gv-hero-body">
        <span className="nd-gv-hero-label">
          {fresh && <span className="nd-gv-hero-pulse" aria-hidden />}
          Topphändelse · {labelText}
        </span>
        <h2>{item.title}</h2>
        {item.description && <p>{item.description}</p>}
        <div className="nd-gv-hero-meta">
          <span>{item.source.toUpperCase()}</span>
          {place && <><span>·</span><span>{place.toUpperCase()}</span></>}
          {col && <><span>·</span><span>{col.title.toUpperCase()}</span></>}
          <span>·</span>
          <span>{ageMinutesLabel(item).toUpperCase()}</span>
          <span>·</span>
          <span className="accent">NEWSVALUE {item.newsValue}</span>
        </div>
      </div>
      {coords && (
        <StaticMapThumb
          lat={coords.lat}
          lng={coords.lng}
          markerColor={p.color}
          placeLabel={place || `${coords.lat.toFixed(4)}° N, ${coords.lng.toFixed(4)}° E`}
        />
      )}
    </article>
  )
}

function SecondaryCard({
  item,
  columns,
  onSelect,
}: {
  item: ItemWithColumn
  columns: DashboardColumn[]
  onSelect: (i: NewsItemType) => void
}) {
  const p = getPriority(item.newsValue)
  const col = columns.find(c => c.id === item.columnId)
  const place = getLocationSummary(item)
  const critical = item.newsValue === 5

  return (
    <article
      className={`nd-gv-sec ${critical ? 'is-critical' : ''}`}
      style={{ ['--nd-pc' as string]: p.color }}
      onClick={() => onSelect(item)}
    >
      <span className={`nd-gv-sec-label ${critical ? 'is-critical' : ''}`}>
        {p.name} · {ageMinutesLabel(item)}
      </span>
      <h3>{item.title}</h3>
      {item.description && <p>{item.description}</p>}
      <div className="nd-gv-sec-meta">
        {item.source.toUpperCase()}
        {place && <> · {place.toUpperCase()}</>}
        {col && <> · {col.title.toUpperCase()}</>}
        {' · '}NEWSVALUE {item.newsValue}
      </div>
    </article>
  )
}

function Band({
  title,
  items,
  columns,
  onSelect,
  older = false,
}: {
  title: string
  items: ItemWithColumn[]
  columns: DashboardColumn[]
  onSelect: (i: NewsItemType) => void
  older?: boolean
}) {
  if (items.length === 0) return null
  return (
    <div className={`nd-gv-band ${older ? 'is-older' : ''}`}>
      <div className="nd-gv-band-head">
        <span>{title}</span>
        <span className="count">{items.length} händelser</span>
      </div>
      <div className="nd-gv-tiles">
        {items.map(item => (
          <Tile key={item.dbId} item={item} columns={columns} onSelect={onSelect} />
        ))}
      </div>
    </div>
  )
}

function Tile({
  item,
  columns,
  onSelect,
}: {
  item: ItemWithColumn
  columns: DashboardColumn[]
  onSelect: (i: NewsItemType) => void
}) {
  const p = getPriority(item.newsValue)
  const col = columns.find(c => c.id === item.columnId)
  const place = getLocationSummary(item)

  return (
    <article
      className="nd-gv-tile"
      style={{ ['--nd-pc' as string]: item.newsValue >= 3 ? p.color : 'var(--nd-line)' }}
      onClick={() => onSelect(item)}
    >
      <h4>{item.title}</h4>
      <div className="nd-gv-tile-meta">
        <span className="nd-gv-prio">{item.newsValue}</span>
        <span>{ageMinutesLabel(item).toUpperCase()}</span>
        <span>·</span>
        <span>{item.source.toUpperCase()}</span>
        {place && (
          <>
            <span>·</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <MapPin size={10} />
              {place}
            </span>
          </>
        )}
        {col && (
          <>
            <span>·</span>
            <span style={{ color: getColumnColor(item.columnId) }}>{col.title.toUpperCase()}</span>
          </>
        )}
      </div>
    </article>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: PASS.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: PASS (eller varningar utan errors).

- [ ] **Step 4: Commit**

```bash
git add components/views/GridView.tsx
git commit -m "feat(grid): GridView v2 med Hero + secondary + tidsband"
```

---

## Task 5: Manuell verifiering i webbläsare

**Files:** (ingen kodändring — bara verifiering)

- [ ] **Step 1: Starta dev-server mot prod-DB**

Följ instruktionerna i `CLAUDE.md`:
```bash
npm run proxy:status   # bekräfta proxy igång
npm run dev
```
Öppna porten Next.js skriver ut (oftast 3000–3002).

- [ ] **Step 2: Verifiera Grid-vyn**

1. Navigera till valfri dashboard med data.
2. Växla till Grid-vy via vy-switchern i headern.
3. Verifiera följande:
   - Hero är överst med stor rubrik och röd/amber border + gradient
   - Om Hero har koordinater: karta syns till höger med marker + plats-chip
   - Två secondary heroes till höger om Hero
   - Tidsbanden ("Senaste 15 minuter", "Senaste timmen", "Tidigare idag") visas under, med korrekta antal
   - Inga items dupliceras mellan topp-3 och banden
   - "Tidigare idag" är tonad (60% opacity)
   - Klick på Hero/secondary/tile öppnar item-detalj som tidigare

- [ ] **Step 3: Edge cases — testa minst två av följande genom att tillfälligt filtrera i devtools console**

- Dashboard som saknar items helt → "Inga händelser senaste 24 timmarna."-text.
- Dashboard med items utan koordinater → Hero faller tillbaka till full-bredd text (ingen karta).
- Resize webbläsare till mobil (< 768px) → Hero staplas, karta hamnar under text, tiles blir 2 per rad.

- [ ] **Step 4: Rapportera resultat och commit av eventuella justeringar**

Om något ser fel ut (t.ex. CSS-konflikt med globals), gör en fix-commit. Annars: klart.

---

## Self-Review checklista (slutligen)

- ✅ Spec-täckning: Score-funktion (Task 1), Hero+secondary urval (Task 1+4), tidsband (Task 1+4), karta i Hero (Task 2+4), CSS för layout/responsivitet (Task 3), edge cases (Task 1+4+5).
- ✅ Inga placeholders, alla kodblock fullständiga.
- ✅ Typer konsekventa: `ItemWithColumn` definieras i `lib/grid-score.ts` och importeras i `GridView.tsx`. `GridGrouping`/`bands.last15`/`lastHour`/`earlierToday` matchar i båda filerna.
- ✅ Test-commands matchar projektets `npm test`-script (node:test via `tsconfig.test.json`).
