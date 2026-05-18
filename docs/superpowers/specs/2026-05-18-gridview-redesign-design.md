# GridView v2 — Hero, secondary heroes och tidsband

**Status:** Spec
**Datum:** 2026-05-18
**Mål:** Göra Grid-vyn till en snabb överblick för en nyhetsredaktör — "vad är viktigast just nu och vad har hänt senaste timmen i Sverige".

## Persona och mål

Nyhetsredaktör som vill skanna en skärm och inom 5 sekunder veta:
1. Vad är den viktigaste händelsen just nu?
2. Finns det fler stora saker?
3. Vad har hänt senaste 15 minuterna / timmen / idag?

Nuvarande Grid-vy (`components/views/GridView.tsx`) sorterar bara på `newsValue` + tid och låter de viktigaste få större brickor. Den saknar Hero och tidsmedvetenhet — en gammal 5:a kan dominera när en färsk 4:a är mer relevant.

## Algoritm

### Score-funktion

Varje item får en score:

```
score = newsValue × decay(ageMinutes)
decay(ageMinutes) = exp(-ageMinutes / 60)
```

- En färsk newsValue 4 (5 min gammal) ≈ 4 × 0.92 = 3.68
- En 90 min gammal newsValue 5 ≈ 5 × 0.22 = 1.10
- ⇒ den färska 4:an vinner — matchar redaktörens intuition

`ageMinutes` räknas från `createdInDb || timestamp` (samma som dagens kod).

### Urval

1. **Hero** = item med högst `score` bland alla items i alla kolumner.
2. **Secondary heroes** = de två items med näst högst score, exkluderat Hero.
3. **Tidsband** under topp-3:
   - **Senaste 15 minuter** — items med `ageMinutes < 15`, sorterade på score fallande
   - **Senaste timmen** — `15 ≤ ageMinutes < 60`, sorterade på score fallande
   - **Tidigare idag** — `60 ≤ ageMinutes < 24×60`, sorterade på score fallande
   - **(implicit: items äldre än 24h visas inte i Grid)**

Items som hamnar i topp-3 visas **inte** i tidsbanden (ingen duplicering).

### Edge cases

- **Inga items alls** → tom state-text i barens plats för "Översikt".
- **Bara 1 item totalt** → endast Hero visas, på full bredd (Hero-raden blir 1 kolumn).
- **Bara 2 items totalt** → Hero + 1 secondary hero, Hero-raden blir 2 kolumner (`2fr 1fr`).
- **Hero saknar koordinater** → karta-delen av Hero ersätts med en utökad textyta (text fyller hela Hero).
- **Inga items < 60 min gamla** → "Senaste 15 minuter"-bandet visas inte (rubrik döljs om bandet är tomt).

## Layout

### Översiktsbar (oförändrad i logik)

Behåller dagens stats-rad (Totalt / Kritisk / Hög / Medel / Kolumner). Etiketten "Översikt" byts till **"Översikt · Sverige senaste timmen"** för att signalera nya vyns fokus.

### Hero-rad (ny)

CSS grid: `grid-template-columns: 2fr 1fr 1fr; gap: 14px`.

**Hero (vänster, 2fr):**
- Min-höjd 280px.
- Bakgrund: vertikal gradient i prioritetsfärg (5 = röd, 4 = amber).
- 4px vänsterribbon i prioritetsfärg.
- Inre layout: två kolumner `1.4fr 1fr`:
  - Vänster: label ("Topphändelse · Kritisk/Hög" med pulserande prick om ≤ 30 min gammalt), titel **30px** font-weight 600, beskrivning (om finns) 14px, meta längst ner med källa · ort · tid · newsValue.
  - Höger: statisk kart-thumbnail (se nedan). Faller bort om koordinater saknas.

**Secondary heroes (mitten + höger, 1fr vardera):**
- Min-höjd 280px.
- 3px vänsterribbon i prioritetsfärg.
- Lättare bakgrund (rgba vit 0.03), om `newsValue === 5` får den dessutom en svag röd bakgrundsgradient.
- Label ("Kritisk · X min sedan"), titel **19px**, beskrivning 12.5px, meta längst ner.
- Ingen karta.

### Tidsband (ny)

För varje band som har items:
- Band-header: liten uppercase-rubrik vänster ("Senaste 15 minuter"), antal höger ("6 händelser"), 1px botten-border.
- Tiles: CSS grid `repeat(4, 1fr); gap: 10px`.
- Tile: 3px vänsterribbon i prioritetsfärg (grå om newsValue ≤ 2), titel **15px** font-weight 500, meta med prio-badge · tid · källa.
- "Tidigare idag"-bandet har `opacity: 0.6` för att tona ner det.

### Responsivitet

- **≥ 1280px**: layout som ovan.
- **768px–1279px**: hero-raden blir 1fr 1fr (Hero + 1 secondary), andra secondary går ner som första tile i "Senaste 15 minuter"-bandet. Tiles blir 3 per rad.
- **< 768px**: allt staplas vertikalt — Hero full bredd, secondary heroes 1 per rad, tiles 2 per rad. Hero-kartan flyttas under text (inte sida om sida).

## Karta — statisk thumbnail

### Krav

- Statisk: ingen pan/zoom-interaktion. Klick på Hero ska fortfarande öppna item-detalj (samma `onSelectItem` som idag).
- Visuellt distinkt marker i prioritetsfärg.
- Plats-chip nere i vänsterhörnet med ortsnamn (om finns) eller koordinater.

### Implementation

Befintlig `LeafletMap` är interaktiv och designad för detaljpanelen. Vi skapar en ny komponent **`components/StaticMapThumb.tsx`** som återanvänder Leaflet men:
- Anropar `map.dragging.disable()`, `map.scrollWheelZoom.disable()`, `map.doubleClickZoom.disable()`, `map.touchZoom.disable()`, `map.boxZoom.disable()`, `map.keyboard.disable()`.
- Tar bort `attribution` och zoom-controls.
- Höjd full container-höjd (inte fast pixel).
- Marker styled efter prio (röd för 5, amber för 4).
- Rendrar plats-chip som overlay (absolut positionerad).

Alternativ vi valde bort: använda en tile-screenshot-tjänst som Mapbox Static API — kräver extern beroende och nyckel. Leaflet med interaktioner avstängda är "tillräckligt statiskt" och vi har redan beroendet.

## Filer som ändras

| Fil | Ändring |
|---|---|
| `components/views/GridView.tsx` | Skrivs om — ny algoritm + ny JSX-struktur |
| `components/StaticMapThumb.tsx` | **Ny** — statisk kart-komponent |
| `app/globals.css` | Nya CSS-klasser `nd-gv-*` (Hero, secondary, tile, band) — gamla `nd-tile*`-klasser tas bort om de inte används av andra vyer |
| `lib/design-system.ts` | Eventuell helper `scoreItem(item)` om vi vill ha den återanvändbar |

Vi behåller den befintliga `getPriority()` och `PRIORITY_COLORS` — de räcker för färgmappning.

## Testning

Eftersom Grid-vyn är ren presentation utan egen state är manuell verifiering i webbläsare primär:
- Köra `npm run dev` mot prod-DB, växla till Grid-vy i en dashboard med mixad data.
- Verifiera: Hero väljs på högst score, secondary-heroes är topp-2 efter Hero, items dupliceras inte mellan topp-3 och band.
- Verifiera edge cases: ingen 5:a senaste timmen (Hero blir en hög 4:a), 1 item totalt (bara Hero visas), Hero utan koordinater (text fyller hela Hero), mobil-bredd.
- `npm run type-check` och `npm run lint` ska passera.

## Avgränsningar (out of scope)

- Ingen filtreringssidebar i Grid (Pulse har det).
- Inga inställningar för score-vikter — exponenten 60 minuter är hårdkodad. Kan justeras senare om redaktörerna vill ha mer/mindre recency-bias.
- Inga animationer utöver Hero-pulse.
- Klick på karta öppnar item-detalj (ingen separat kartvy).
