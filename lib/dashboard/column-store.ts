/**
 * Ren state-kärna för dashboardets kolumndata.
 *
 * All mutation går genom dessa tre funktioner — dbId är enda identitet och
 * dedup sker här, ingen annanstans. Funktionerna är rena (inga sidoeffekter,
 * ingen Date.now()) så de kan enhetstestas och köras säkert i React-updaters.
 *
 *  - applyLive:     SSE-levererade items. Dedup mot state OCH inom batchen.
 *                   Ompostade events (samma source-id) ersätter sin föregångare —
 *                   speglar serverns source-dedup i ingestion.
 *  - applySnapshot: Fullt API-svar. Servern är sanningen; det enda klient-items
 *                   som överlever är sådana som skapats EFTER att snapshotten
 *                   begärdes (SSE-race-fönstret). Borttagna/ersatta items kan
 *                   därmed aldrig återuppstå.
 *  - applyPatch:    Punktuppdatering av ett item (t.ex. trafikkamerabild klar).
 */
import type { NewsItem } from '../types'

export type ColumnStoreState = Record<string, NewsItem[]>

/** Hämtar unix-tid för ett item baserat på createdInDb eller timestamp som fallback. */
const itemTime = (item: NewsItem): number => {
  const t = Date.parse(item.createdInDb ?? item.timestamp)
  return Number.isNaN(t) ? 0 : t
}

/** Sorterar items nyast först på createdInDb (fallback: timestamp). */
const sortNewestFirst = (items: NewsItem[]): NewsItem[] =>
  [...items].sort((a, b) => itemTime(b) - itemTime(a))

/**
 * Applicerar SSE-levererade items på en kolumns state.
 *
 * Dedup sker på dbId (mot befintligt state och inom batchen).
 * Om ett inkommande item har ett source-id (item.id) som redan finns i state
 * ersätts det gamla itemet — speglar serverns source-dedup vid reingest.
 * Items utan source-id ersätter aldrig befintliga items.
 *
 * Returnerar samma state-referens om inga nya items tillförs.
 */
export function applyLive(
  state: ColumnStoreState,
  columnId: string,
  incoming: NewsItem[],
): ColumnStoreState {
  const existing = state[columnId] ?? []
  // Map från dbId → item för snabb uppslagning och dedup
  const byDbId = new Map<string, NewsItem>(existing.map(i => [i.dbId, i]))

  const added: NewsItem[] = []
  const replacedSourceIds = new Set<string>()

  for (const incomingItem of incoming) {
    // Skippa om dbId redan finns i state eller om vi redan sett detta dbId i batchen
    if (byDbId.has(incomingItem.dbId)) continue
    byDbId.set(incomingItem.dbId, incomingItem)
    added.push(incomingItem)
    // Registrera source-id för att kunna ta bort gamla items med samma käll-id
    if (incomingItem.id) replacedSourceIds.add(incomingItem.id)
  }

  // Inga nya items — returnera oförändrad referens för att undvika re-renders
  if (added.length === 0) return state

  const addedDbIds = new Set(added.map(i => i.dbId))
  // Behåll befintliga items UTOM de som ersatts av ett ompostat event (samma source-id)
  const filtered = Array.from(byDbId.values()).filter(i =>
    addedDbIds.has(i.dbId) || !i.id || !replacedSourceIds.has(i.id),
  )

  // Ny-inkomna items sorteras före befintliga vid lika timestamp (sekundär stabilitet)
  const sorted = [...filtered].sort((a, b) => {
    const timeDiff = itemTime(b) - itemTime(a)
    if (timeDiff !== 0) return timeDiff
    // Vid tidslika: nya items (från batchen) sorteras före befintliga
    const aIsNew = addedDbIds.has(a.dbId) ? 1 : 0
    const bIsNew = addedDbIds.has(b.dbId) ? 1 : 0
    return bIsNew - aIsNew
  })

  return { ...state, [columnId]: sorted }
}

/**
 * Applicerar ett fullt API-svar (snapshot) på hela state.
 *
 * Servern är sanningen — items som inte finns i svaret tas bort, med ett undantag:
 * klient-items skapade EFTER requestedAt (SSE-race-fönstret) överlever.
 * Befintlig objektidentitet bevaras för oförändrade items för att minimera re-renders.
 * Kolumner sorteras nyast först.
 */
export function applySnapshot(
  state: ColumnStoreState,
  snapshot: Record<string, NewsItem[]>,
  requestedAt: number,
): ColumnStoreState {
  const next: ColumnStoreState = {}

  for (const [columnId, snapshotItems] of Object.entries(snapshot)) {
    // Map från dbId → befintligt item för identitetsbevarande
    const previousByDbId = new Map<string, NewsItem>(
      (state[columnId] ?? []).map(i => [i.dbId, i]),
    )
    const merged = new Map<string, NewsItem>()

    // Lägg in snapshot-items — behåll befintlig objektidentitet om möjligt
    for (const snapshotItem of snapshotItems) {
      merged.set(snapshotItem.dbId, previousByDbId.get(snapshotItem.dbId) ?? snapshotItem)
    }

    // SSE-race-skyddet: klient-items skapade efter snapshot-requesten överlever
    for (const existing of state[columnId] ?? []) {
      if (merged.has(existing.dbId)) continue
      if (itemTime(existing) > requestedAt) merged.set(existing.dbId, existing)
    }

    next[columnId] = sortNewestFirst(Array.from(merged.values()))
  }

  return next
}

/**
 * Punktuppdaterar ett enskilt item i en kolumn (t.ex. trafikkamerabild klar).
 *
 * Returnerar samma state-referens om dbId inte hittas (no-op).
 * Övriga items i kolumnen berörs inte.
 */
export function applyPatch(
  state: ColumnStoreState,
  columnId: string,
  dbId: string,
  patched: NewsItem,
): ColumnStoreState {
  const items = state[columnId]
  if (!items || !items.some(i => i.dbId === dbId)) return state
  return {
    ...state,
    [columnId]: items.map(i => (i.dbId === dbId ? patched : i)),
  }
}
