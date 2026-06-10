/**
 * Workflows-kodnod: formaterar inkommande artikeldata till Newsdeck
 * Publisher-nodens input-format ({ item: { ... } }).
 *
 * Helt generisk — inga hårdkodade sajter eller tidszoner:
 * - Fältnamn plockas case-insensitivt från en lista av alias
 *   (Rubrik/title/headline, Body/description, Artikelns_URL/url, osv.)
 * - source härleds från url:ens domännamn om payloaden inte skickar ett
 * - url används som item.id så ompostningar av samma artikel ersätter
 *   föregångaren i kolumnen (Newsdecks source-dedup)
 * - timestamp parsas ur "[11 juni 2026, 05:00]"-prefixet i brödtexten,
 *   men kasseras om den hamnar i framtiden (okänd källtidszon) — då
 *   sätter Newsdeck mottagningstiden i stället
 */

const data = inputData || {};

// Case-insensitiv fältplockning: första alias som har ett värde vinner
const pick = (obj, keys) => {
  const lookup = {};
  for (const k of Object.keys(obj)) lookup[k.toLowerCase()] = obj[k];
  for (const key of keys) {
    const v = lookup[key.toLowerCase()];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
};

const toIsoTimestamp = (value) => {
  if (typeof value !== 'string') return undefined;

  const match = value.match(/^\s*\[(\d{1,2})\s+([A-Za-zÅÄÖåäö]+)\s+(\d{4}),\s*(\d{1,2}):(\d{2})\]/m);
  if (!match) return undefined;

  const [, dayStr, monthNameRaw, yearStr, hourStr, minuteStr] = match;
  const monthMap = {
    januari: 1, februari: 2, mars: 3, april: 4, maj: 5, juni: 6,
    juli: 7, augusti: 8, september: 9, oktober: 10, november: 11, december: 12
  };

  const month = monthMap[monthNameRaw.toLowerCase()];
  if (!month) return undefined;

  const date = new Date(Date.UTC(
    Number(yearStr), month - 1, Number(dayStr), Number(hourStr), Number(minuteStr), 0
  ));
  if (Number.isNaN(date.getTime())) return undefined;

  // Källtidszonen är okänd — en "framtida" tid betyder att lokal tid
  // tolkats som UTC. Kassera hellre än att visa fel sorteringstid.
  if (date.getTime() > Date.now()) return undefined;

  return date.toISOString();
};

const hostnameFromUrl = (value) => {
  try {
    return new URL(String(value)).hostname.replace(/^www\./, '');
  } catch {
    return undefined;
  }
};

const title = pick(data, ['rubrik', 'headline', 'title', 'titel']);
const description = pick(data, ['body', 'description', 'beskrivning', 'text', 'brödtext', 'brodtext']);
const url = pick(data, ['artikelns_url', 'artikel_url', 'url', 'länk', 'lank', 'link']);
const newsValueRaw = pick(data, ['value', 'newsvalue', 'nyhetsvärde', 'nyhetsvarde']);
const sourceRaw = pick(data, ['källa', 'kalla', 'source', 'sajt', 'site']);
const category = pick(data, ['kategori', 'category']);

const item = {
  title: title != null ? String(title) : ''
};

if (description != null) item.description = String(description);

if (url != null) {
  item.url = String(url);
  // Dedup: samma artikel-url i samma kolumn ersätter föregångaren
  item.id = String(url);
}

// Källnamn: payloadens eget värde vinner, annars domännamnet ur url:en
const source = sourceRaw != null ? String(sourceRaw) : hostnameFromUrl(url);
if (source) item.source = source;

const newsValue = Number(newsValueRaw);
if (Number.isFinite(newsValue)) item.newsValue = newsValue;

const timestamp = toIsoTimestamp(description);
if (timestamp) item.timestamp = timestamp;

if (category != null) item.category = String(category);

const result = { item };

console.log(JSON.stringify(result));
