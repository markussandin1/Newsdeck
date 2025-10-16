# Kategori-instruktioner för Workflow AI-agenter

## Översikt

När du analyserar och kategoriserar nyhetshändelser i Workflows måste du **alltid** sätta händelsen till **en av de förutbestämda kategorierna** nedan. Gissa aldrig eller hitta på nya kategorier.

## Tillåtna kategorier

### 🚨 Akuta händelser & räddningstjänst

- **brand** - Brand eller eldsvåda (hus, skog, fordon)
- **explosion** - Explosion eller detonation
- **räddning** - Räddningsinsats (sök/räddning, person i nöd)
- **gasläcka** - Gasläcka
- **kemolycka** - Kemikalieolycka eller utsläpp

### 🚔 Brott & polis

- **rån** - Rån eller väpnat rån
- **mord** - Mord eller dråp
- **misshandel** - Misshandel eller grov misshandel
- **skjutning** - Skjutning eller skottlossning
- **inbrott** - Inbrott i bostad eller lokal
- **stöld** - Stöld eller tillgrepp
- **våldtäkt** - Våldtäkt eller sexualbrott
- **mordförsök** - Mordförsök
- **hot** - Hot, ofredande eller trakasserier

### 🚗 Trafik

- **trafikolycka** - Trafikolycka på väg (bil, motorcykel, cykel)
- **personpåhållning** - Person påkörd av tåg eller tunnelbana
- **vägarbete** - Vägarbete eller avstängning
- **fordonsbrand** - Fordon i brand
- **kö** - Trafikstörning eller kö

### 🚂 Tåg & kollektivtrafik

- **växelfel** - Växelfel på järnväg
- **urspårning** - Tåg urspårat
- **signalfel** - Signalfel på järnväg
- **strömavbrott-tåg** - Strömavbrott i järnvägssystemet
- **inställd-trafik** - Inställd tågtrafik

### 🌊 Väder & naturhändelser

- **översvämning** - Översvämning
- **storm** - Storm eller kraftiga vindar
- **snöoväder** - Snöoväder eller snöfall
- **halka** - Halka eller isbildning
- **värmebölja** - Värmebölja eller extremt höga temperaturer
- **skogsbrand** - Skogsbrand eller gräsbrand
- **ras** - Ras, skred eller jordskred
- **skyfall** - Skyfall eller kraftigt regn

### 🏢 Övriga händelser

- **strömavbrott** - Strömavbrott
- **vattenläcka** - Vattenläcka
- **olycka** - Olycka (allmän, använd om ingen annan kategori passar)
- **sjukdom** - Hälsa eller sjukdomshändelse
- **djur** - Djur på spåret eller väg
- **larm** - Larm eller falsklarm
- **annan** - Övrig händelse (använd ENDAST om ingen annan kategori passar)

## Instruktioner för AI-agenter

När du analyserar en händelse:

1. **Läs titeln och beskrivningen noggrant**
2. **Identifiera händelsens huvudsakliga karaktär**
3. **Välj den MEST specifika kategorin** som matchar händelsen
4. **Om flera kategorier passar, välj den mest allvarliga/akuta**
5. **Om ingen kategori passar exakt, välj "olycka" för allmänna händelser eller "annan" som absolut sista utväg**

### Exempel på kategorisering

#### Bra exempel ✅

```
Titel: "Brand i flerfamiljshus i Sundsvall"
→ Kategori: brand

Titel: "Trafikolycka på E4 söderut, en person skadad"
→ Kategori: trafikolycka

Titel: "Person påkörd av tåg vid station"
→ Kategori: personpåhållning

Titel: "Växelfel orsakar förseningar på pendeltåg"
→ Kategori: växelfel

Titel: "Skjutning i centrum, två personer skadade"
→ Kategori: skjutning

Titel: "Storm med vindar upp till 30 m/s väntas"
→ Kategori: storm

Titel: "Strömavbrott drabbar 5000 hushåll"
→ Kategori: strömavbrott
```

#### Dåliga exempel ❌

```
Titel: "Brand i flerfamiljshus"
→ Kategori: emergency ❌ (Använd inte engelska kategorier!)
→ Kategori: fire ❌ (Använd inte engelska kategorier!)
→ Kategori: husbrander ❌ (Kategorin finns inte!)
→ Rätt: brand ✅

Titel: "Allvarlig olycka på motorväg"
→ Kategori: traffic-accident ❌ (Använd inte bindestreck i fel format!)
→ Rätt: trafikolycka ✅
```

## Integration i Workflows

När du skapar eller uppdaterar workflows, använd denna prompt-mall för AI-agenten som analyserar händelser:

```
Analysera följande händelse och sätt en kategori.

VIKTIGT: Använd ENDAST en av dessa exakta kategorier (kopiera exakt, inga variationer):

brand, explosion, räddning, gasläcka, kemolycka, rån, mord, misshandel, skjutning, inbrott, stöld, våldtäkt, mordförsök, hot, trafikolycka, personpåhållning, vägarbete, fordonsbrand, kö, växelfel, urspårning, signalfel, strömavbrott-tåg, inställd-trafik, översvämning, storm, snöoväder, halka, värmebölja, skogsbrand, ras, skyfall, strömavbrott, vattenläcka, olycka, sjukdom, djur, larm, annan

Välj den MEST specifika kategorin. Om ingen passar exakt, använd "olycka" eller "annan".

Händelse:
{event_data}

Svara med kategorin på första raden, sedan förklara varför på rad 2.
```

## Validering

NewsDeck kommer att validera kategorier mot denna lista. Om en okänd kategori skickas kommer händelsen fortfarande att sparas men får ingen ikon på kartan.

För att se alla kategorier programmatiskt:

```typescript
import { CATEGORIES, CATEGORY_KEYS } from '@/lib/categories'

// Alla giltiga kategori-nycklar
console.log(CATEGORY_KEYS)

// Hämta specifik kategori
const category = CATEGORIES['brand']
console.log(category.icon) // '🔥'
```

## Frågor?

Kontakta utvecklingsteamet om du behöver lägga till nya kategorier eller ändra befintliga.
