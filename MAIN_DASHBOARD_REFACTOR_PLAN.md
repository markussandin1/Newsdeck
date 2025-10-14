# MainDashboard Refactor Plan

## Målsättning

Bryta upp `components/MainDashboard.tsx` (≈2 400 rader) i mindre, mer hanterbara moduler utan att påverka beteenden. Refaktoreringen ska ske iterativt med verifiering efter varje steg och möjlighet att backa om något går fel.

## Förberedelser (före Fas 0)

- [ ] `git checkout -b refactor/split-main-dashboard`
- [ ] `npm run lint`
- [ ] `npm run type-check`
- [ ] (valfritt) `npm run build`
- [ ] `git commit -am "chore: baseline before refactor"`

## Fas 0 – Baslinje

Säkerställ att projektet är stabilt före förändringar.

- Kör `npm run lint`, `npm run type-check`, `npm run build`
- Snabb manuell kontroll i UI:t (öppna dashboarden, klicka runt)
- Inga kodändringar, men dokumentera status i PR/commit-meddelande

## Fas 0.5 – Typer & Hook-kontrakt

- Skapa `lib/dashboard/types.ts`
- Definiera interfaces för kommande hooks/komponenter (t.ex. `DashboardDataState`, `DashboardPollingState`, `DashboardLayoutState`) och skissa på deras publika API (state + actions)
- Inventera befintliga hjälpfunktioner i `lib/utils.ts`/`lib/services` så att nya typer samspelar med befintliga helpers och alias (`@/`)
- Uppdatera `MainDashboard.tsx` att använda de nya typerna där det är rimligt
- Verifiering: `npm run lint`, `npm run type-check`
- Commit

## Fas 1 – Utilities

- Flytta hjälpfunktioner (`isRecord`, `deepEqual`, `extractWorkflowId`, formatterare) till `lib/dashboard/utils.ts`
- Kontrollera att generiska helpers inte duplicerar befintliga exports från `lib/utils.ts`; dela eventuella truly generiska funktioner där istället
- Importera funktionerna från den nya modulen
- Verifiering: `npm run lint`, `npm run type-check`
- Manuell test: skapa/visa kolumn för att bekräfta att formattering och ID-extraktion fungerar
- Commit

## Fas 2a – `useDashboardData`

- Extrahera dataflödet (kolumn-data, arkiverade kolumner, dashboardlista, `fetchColumnData`, `loadArchivedColumns`, `loadAllDashboards`, `lastUpdate`, `isLoading`)
- Lägg `columnDataRef`/dedupliceringslogiken i hooken så att all statehantering sker på ett ställe
- Hookens API bör använda typerna från Fas 0.5 och returnera state + `refresh`
- Verifiering: `npm run lint`, `npm run type-check`
- Manuell test: ladda dashboard, kontrollera att data visas, öppna arkivet
- Commit och skapa PR för review

## Fas 2b – `useDashboardPolling`

- Flytta long-polling-logiken, reconnect-handling, abort controllers, last-seen timestamps, `connectionStatus`
- Hooken ska använda data från `useDashboardData` och exponera kontrollfunktioner (t.ex. `start`, `stop`, `status`)
- Säkerställ att hooken inte behöver intern state från framtida ljud-hook; planera gränssnittet så att ljudhantering injiceras (ex. `playIfAllowed`)
- Verifiering: `npm run lint`, `npm run type-check`
- Manuell test: trigga nya händelser (använd testdata/API) och säkerställ att de dyker upp live
- Commit, uppdatera PR-notes med vad som testats

## Fas 3 – Ljud & mute (`useColumnNotifications`)

- Flytta audio-initialisering, localStorage-hantering, `mutedColumns`, `showAudioPrompt`, `toggleMute`
- Hooken bör tillhandahålla `playIfAllowed`, `toggleMute`, `isMuted`, `prompt` och exportera mute-setet för polling-hooken
- Verifieringschecklista:
  - [ ] Slå på ljud (`Aktivera ljud`) → hör pling vid ny händelse
  - [ ] Muta kolumn → inget ljud från den kolumnen
  - [ ] Ladda om sidan → mute-status kvarstår
- Komplettera med `npm run lint`, `npm run type-check`
- Commit och PR-uppdatering

## Fas 4 – Layout och mobilstate (`useDashboardLayout`)

- Flytta `isMobile`, `activeColumnIndex`, `showMobileMenu`, `showDashboardDropdown`, pull-to-refresh (`pullDistance`, `isRefreshing`, `touchStartY`, `scrollContainerRef`)
- Hooken exponerar state + handlers samt beräknade värden som `activeColumns` för header/menyer
- Verifiering:
  - [ ] Ändra fönsterbredd < 768px → mobilvy aktiveras
  - [ ] Testa pull-to-refresh (touch-simulering i devtools) → kolumner laddas om
  - [ ] Mobilmeny och kolumnmeny öppnas/stängs korrekt
- Komplettera med `npm run lint`, `npm run type-check`
- Commit

## Fas 5 – Presentationskomponenter

### Fas 5a – `ColumnCard`
- Flytta presentationen av enskild kolumn (utan drag & drop)
- Verifiering: kolumner renderas som tidigare
- `npm run lint`, `npm run type-check`
- Commit

### Fas 5b – `ColumnBoard` (drag & drop)
- Flytta logiken för kolumnlistan och drag & drop
- Lägg extra tid på testning:
  - [ ] Dra kolumn mellan olika index (inkl. första/sista)
  - [ ] Horisontell scroll medan drag pågår
  - [ ] Dra och släpp med arkiverade kolumner synliga/dolda
- `npm run lint`, `npm run type-check`
- Commit och skapa PR (eller uppdatera befintlig) för review

### Fas 5c – Övriga UI-delar
- Bryt ut `DashboardHeader`, `DashboardModals`, `RealtimeIndicator`, `MobileMenu`
- Verifiera varje del efter flytt
- `npm run lint`, `npm run type-check`
- Commit

## Fas 6 – Avslutning

- Kör fulla `npm run lint`, `npm run type-check`, `npm run build`
- Manuell regression: öppna dashboarden, testa viktiga flöden (skapa, arkivera, drag & drop, live-uppdateringar, ljud)
- Uppdatera dokumentation (`lib/dashboard/README.md`) med hook-ansvar och komponenthierarki
- Slutcommit + merge

## Extra rekommendationer

- Snapshot-tester: Lägg till `tests/dashboard-utils.test.ts` för formatterare (kan använda Jest/Vitest beroende på setup). Uppdatera efter hand.
- Code review: Begär review efter Fas 2b, 3, 4 och 5b för att upptäcka regressionsrisker tidigt.
- Rollback-plan: Om någon fas går snett – `git revert` till senaste stabila commit.
- Dokumentera manuella tester i PR-beskrivningar efter varje fas.
