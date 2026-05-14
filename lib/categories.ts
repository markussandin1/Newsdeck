/**
 * Standardiserade kategorier för nyhetshändelser i NewsDeck
 *
 * Denna fil definierar alla tillåtna kategorier och deras metadata.
 * AI-agenter i Workflows ska alltid mappa händelser till dessa förutbestämda kategorier.
 */

export type CategoryKey =
  // Akuta händelser & räddningstjänst
  | 'brand'
  | 'explosion'
  | 'räddning'
  | 'gasläcka'
  | 'kemolycka'

  // Brott & polis
  | 'rån'
  | 'mord'
  | 'misshandel'
  | 'skjutning'
  | 'inbrott'
  | 'stöld'
  | 'våldtäkt'
  | 'mordförsök'
  | 'hot'

  // Trafik
  | 'trafikolycka'
  | 'personpåhållning'
  | 'vägarbete'
  | 'fordonsbrand'
  | 'kö'

  // Tåg & kollektivtrafik
  | 'växelfel'
  | 'urspårning'
  | 'signalfel'
  | 'strömavbrott-tåg'
  | 'inställd-trafik'

  // Väder & naturhändelser
  | 'översvämning'
  | 'storm'
  | 'snöoväder'
  | 'halka'
  | 'värmebölja'
  | 'skogsbrand'
  | 'ras'
  | 'skyfall'

  // Övriga händelser
  | 'strömavbrott'
  | 'vattenläcka'
  | 'olycka'
  | 'sjukdom'
  | 'djur'
  | 'larm'
  | 'annan'

export interface CategoryDefinition {
  key: CategoryKey
  label: string
  icon: string
  group: 'emergency' | 'crime' | 'traffic' | 'rail' | 'weather' | 'other'
  description: string
}

export const CATEGORIES: Record<CategoryKey, CategoryDefinition> = {
  // Akuta händelser & räddningstjänst
  brand: {
    key: 'brand',
    label: 'Brand',
    icon: '🔥',
    group: 'emergency',
    description: 'Brand eller eldsvåda'
  },
  explosion: {
    key: 'explosion',
    label: 'Explosion',
    icon: '💥',
    group: 'emergency',
    description: 'Explosion eller detonation'
  },
  räddning: {
    key: 'räddning',
    label: 'Räddning',
    icon: '🆘',
    group: 'emergency',
    description: 'Räddningsinsats'
  },
  gasläcka: {
    key: 'gasläcka',
    label: 'Gasläcka',
    icon: '☣️',
    group: 'emergency',
    description: 'Gasläcka'
  },
  kemolycka: {
    key: 'kemolycka',
    label: 'Kemolycka',
    icon: '⚠️',
    group: 'emergency',
    description: 'Kemikalieolycka eller utsläpp'
  },

  // Brott & polis
  rån: {
    key: 'rån',
    label: 'Rån',
    icon: '💰',
    group: 'crime',
    description: 'Rån eller väpnat rån'
  },
  mord: {
    key: 'mord',
    label: 'Mord',
    icon: '🔪',
    group: 'crime',
    description: 'Mord eller dråp'
  },
  misshandel: {
    key: 'misshandel',
    label: 'Misshandel',
    icon: '🤕',
    group: 'crime',
    description: 'Misshandel eller grov misshandel'
  },
  skjutning: {
    key: 'skjutning',
    label: 'Skjutning',
    icon: '🔫',
    group: 'crime',
    description: 'Skjutning eller skottlossning'
  },
  inbrott: {
    key: 'inbrott',
    label: 'Inbrott',
    icon: '🏠',
    group: 'crime',
    description: 'Inbrott i bostad eller lokal'
  },
  stöld: {
    key: 'stöld',
    label: 'Stöld',
    icon: '👜',
    group: 'crime',
    description: 'Stöld eller tillgrepp'
  },
  våldtäkt: {
    key: 'våldtäkt',
    label: 'Våldtäkt',
    icon: '🚨',
    group: 'crime',
    description: 'Våldtäkt eller sexualbrott'
  },
  mordförsök: {
    key: 'mordförsök',
    label: 'Mordförsök',
    icon: '⚠️',
    group: 'crime',
    description: 'Mordförsök'
  },
  hot: {
    key: 'hot',
    label: 'Hot',
    icon: '💬',
    group: 'crime',
    description: 'Hot, ofredande eller trakasserier'
  },

  // Trafik
  trafikolycka: {
    key: 'trafikolycka',
    label: 'Trafikolycka',
    icon: '🚗',
    group: 'traffic',
    description: 'Trafikolycka på väg'
  },
  personpåhållning: {
    key: 'personpåhållning',
    label: 'Personpåhållning',
    icon: '🚂',
    group: 'traffic',
    description: 'Person påkörd av tåg eller tunnelbana'
  },
  vägarbete: {
    key: 'vägarbete',
    label: 'Vägarbete',
    icon: '🚧',
    group: 'traffic',
    description: 'Vägarbete eller avstängning'
  },
  fordonsbrand: {
    key: 'fordonsbrand',
    label: 'Fordonsbrand',
    icon: '🔥',
    group: 'traffic',
    description: 'Fordon i brand'
  },
  kö: {
    key: 'kö',
    label: 'Kö',
    icon: '🚙',
    group: 'traffic',
    description: 'Trafikstörning eller kö'
  },

  // Tåg & kollektivtrafik
  växelfel: {
    key: 'växelfel',
    label: 'Växelfel',
    icon: '🔧',
    group: 'rail',
    description: 'Växelfel på järnväg'
  },
  urspårning: {
    key: 'urspårning',
    label: 'Urspårning',
    icon: '🚂',
    group: 'rail',
    description: 'Tåg urspårat'
  },
  signalfel: {
    key: 'signalfel',
    label: 'Signalfel',
    icon: '🚦',
    group: 'rail',
    description: 'Signalfel på järnväg'
  },
  'strömavbrott-tåg': {
    key: 'strömavbrott-tåg',
    label: 'Strömavbrott (tåg)',
    icon: '⚡',
    group: 'rail',
    description: 'Strömavbrott i järnvägssystemet'
  },
  'inställd-trafik': {
    key: 'inställd-trafik',
    label: 'Inställd trafik',
    icon: '🚫',
    group: 'rail',
    description: 'Inställd tågtrafik'
  },

  // Väder & naturhändelser
  översvämning: {
    key: 'översvämning',
    label: 'Översvämning',
    icon: '🌊',
    group: 'weather',
    description: 'Översvämning'
  },
  storm: {
    key: 'storm',
    label: 'Storm',
    icon: '🌪️',
    group: 'weather',
    description: 'Storm eller kraftiga vindar'
  },
  snöoväder: {
    key: 'snöoväder',
    label: 'Snöoväder',
    icon: '❄️',
    group: 'weather',
    description: 'Snöoväder eller snöfall'
  },
  halka: {
    key: 'halka',
    label: 'Halka',
    icon: '🧊',
    group: 'weather',
    description: 'Halka eller isbildning'
  },
  värmebölja: {
    key: 'värmebölja',
    label: 'Värmebölja',
    icon: '🌡️',
    group: 'weather',
    description: 'Värmebölja eller extremt höga temperaturer'
  },
  skogsbrand: {
    key: 'skogsbrand',
    label: 'Skogsbrand',
    icon: '🌲',
    group: 'weather',
    description: 'Skogsbrand eller gräsbrand'
  },
  ras: {
    key: 'ras',
    label: 'Ras',
    icon: '⛰️',
    group: 'weather',
    description: 'Ras, skred eller jordskred'
  },
  skyfall: {
    key: 'skyfall',
    label: 'Skyfall',
    icon: '🌧️',
    group: 'weather',
    description: 'Skyfall eller kraftigt regn'
  },

  // Övriga händelser
  strömavbrott: {
    key: 'strömavbrott',
    label: 'Strömavbrott',
    icon: '⚡',
    group: 'other',
    description: 'Strömavbrott'
  },
  vattenläcka: {
    key: 'vattenläcka',
    label: 'Vattenläcka',
    icon: '💧',
    group: 'other',
    description: 'Vattenläcka'
  },
  olycka: {
    key: 'olycka',
    label: 'Olycka',
    icon: '⚠️',
    group: 'other',
    description: 'Olycka (allmän)'
  },
  sjukdom: {
    key: 'sjukdom',
    label: 'Sjukdom',
    icon: '🏥',
    group: 'other',
    description: 'Hälsa eller sjukdomshändelse'
  },
  djur: {
    key: 'djur',
    label: 'Djur',
    icon: '🦌',
    group: 'other',
    description: 'Djur på spåret eller väg'
  },
  larm: {
    key: 'larm',
    label: 'Larm',
    icon: '🔔',
    group: 'other',
    description: 'Larm eller falsklarm'
  },
  annan: {
    key: 'annan',
    label: 'Annan',
    icon: '📍',
    group: 'other',
    description: 'Övrig händelse'
  }
}

/**
 * Pseudo-definitioner som visas när Workflows skickar in gruppnamn
 * ("Trafik", "Brand", …) istället för en specifik CategoryKey.
 *
 * Bakgrund: AI-noden har historiskt skickat in storstavade gruppnamn
 * eller varianter (Brand, Trafik, Övrigt, Kollektivtrafik, …). Dessa
 * matchar inte CategoryKey-enumen exakt och resulterade i att kortet
 * renderades utan emoji/etikett. Tills Workflows-prompten är uppdaterad
 * och historisk data hunnit rulla ut faller vi tillbaka på dessa här
 * — bättre med en grupp-ikon än ingen ikon alls.
 */
const GROUP_FALLBACKS: Record<string, CategoryDefinition> = {
  trafik: {
    key: 'annan',
    label: 'Trafik',
    icon: '🚗',
    group: 'traffic',
    description: 'Trafik-relaterad händelse (oklassificerad)',
  },
  brand: CATEGORIES.brand,
  brott: {
    key: 'annan',
    label: 'Brott',
    icon: '🚨',
    group: 'crime',
    description: 'Brottsrelaterad händelse (oklassificerad)',
  },
  kollektivtrafik: {
    key: 'annan',
    label: 'Kollektivtrafik',
    icon: '🚆',
    group: 'rail',
    description: 'Kollektivtrafik-störning (oklassificerad)',
  },
  väder: {
    key: 'annan',
    label: 'Väder',
    icon: '🌧️',
    group: 'weather',
    description: 'Väder-relaterad händelse (oklassificerad)',
  },
  vader: {
    // utan å för fall där input saknar diakritik
    key: 'annan',
    label: 'Väder',
    icon: '🌧️',
    group: 'weather',
    description: 'Väder-relaterad händelse (oklassificerad)',
  },
  övrigt: CATEGORIES.annan,
  ovrigt: CATEGORIES.annan,
}

/**
 * Hämta kategori-definition för en given nyckel.
 *
 * Tolerant lookup (P2/kategori-fix):
 *  1. Exakt match mot CategoryKey
 *  2. Case-insensitive match (lowercase)
 *  3. Trimmat + lowercase
 *  4. Gruppnamns-fallback (Trafik → 🚗-pseudokategori)
 *  5. undefined (visar inget kategori-pill)
 *
 * Detta gör att items som kom in med "Brand", "Trafik" eller
 * "Kollektivtrafik" ändå får en relevant ikon och etikett i UI:t,
 * även om vi inte vet exakt subkategori.
 */
export function getCategory(key: string): CategoryDefinition | undefined {
  if (!key) return undefined

  // 1. Exakt match
  const exact = CATEGORIES[key as CategoryKey]
  if (exact) return exact

  // 2-3. Trim + lowercase
  const normalized = key.trim().toLowerCase()
  if (normalized !== key) {
    const lower = CATEGORIES[normalized as CategoryKey]
    if (lower) return lower
  }

  // 4. Gruppnamns-fallback
  return GROUP_FALLBACKS[normalized]
}

/**
 * Hämta ikon för en kategori
 */
export function getCategoryIcon(category?: string): string {
  if (!category) return '📍'
  return getCategory(category)?.icon || '📍'
}

/**
 * Hämta alla kategorier grupperade
 */
export function getCategoriesByGroup(): Record<string, CategoryDefinition[]> {
  const grouped: Record<string, CategoryDefinition[]> = {}

  Object.values(CATEGORIES).forEach(cat => {
    if (!grouped[cat.group]) {
      grouped[cat.group] = []
    }
    grouped[cat.group].push(cat)
  })

  return grouped
}

/**
 * Validera att en kategori finns
 */
export function isValidCategory(category: string): boolean {
  return category in CATEGORIES
}

/**
 * Lista alla kategori-nycklar (för AI-instruktioner)
 */
export const CATEGORY_KEYS = Object.keys(CATEGORIES) as CategoryKey[]

/**
 * Kategori-lista formaterad för AI-instruktioner
 */
export const CATEGORY_LIST_FOR_AI = CATEGORY_KEYS.join(', ')
