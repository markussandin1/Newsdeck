// Mock newsroom data — shaped to match Newsdeck's real NewsItem schema.

const now = Date.now();
const m = (mins) => new Date(now - mins * 60000).toISOString();

window.COLUMNS = [
  { id: 'breaking', title: 'Breaking Sverige', description: 'Prio-händelser nationellt', flowId: 'wf-breaking' },
  { id: 'sthlm', title: 'Stockholm', description: 'Blåljus & händelser', flowId: 'wf-sthlm' },
  { id: 'traffic', title: 'Trafik & väg', description: 'Trafikverket, E4, E6, E20', flowId: 'wf-traffic' },
  { id: 'police', title: 'Polisen RSS', description: 'Händelser senaste 24h', flowId: 'wf-police' },
  { id: 'weather', title: 'Väder & SMHI', description: 'Varningar klass 1–3', flowId: 'wf-weather' },
  { id: 'sport', title: 'Sport', description: 'TT Sport + egna källor', flowId: 'wf-sport' },
  { id: 'world', title: 'Utrikes (TT)', description: 'Reuters & AFP via TT', flowId: 'wf-world' },
];

window.ITEMS = [
  // Breaking
  { dbId: '1', workflowId: 'wf-breaking', source: 'TT Nyhetsbyrån', url: 'https://tt.se', title: 'Explosion i flerfamiljshus i Husby – flera skadade', description: 'Räddningstjänsten på plats efter kraftig smäll sent på onsdagskvällen. Polisen har spärrat av ett större område.', newsValue: 5, category: 'explosion', timestamp: m(2), createdInDb: m(2), location: { municipality: 'Stockholm', area: 'Husby', county: 'Stockholms län' } },
  { dbId: '2', workflowId: 'wf-breaking', source: 'Expressen', url: 'https://expressen.se', title: 'Statsministern kallar till extrainsatt pressträff kl 09.00', description: 'Inga detaljer har släppts i förväg. Flera tunga statsråd väntas närvara.', newsValue: 5, category: 'annan', timestamp: m(12), createdInDb: m(12) },
  { dbId: '3', workflowId: 'wf-breaking', source: 'SVT', url: 'https://svt.se', title: 'Riksbanken höjer styrräntan med 25 punkter', newsValue: 4, category: 'annan', timestamp: m(28), createdInDb: m(28) },
  { dbId: '4', workflowId: 'wf-breaking', source: 'DN', title: 'Stort cyberangrepp mot svenska myndigheter – MSB bekräftar', description: 'Flera myndigheter har drabbats av överbelastningsattacker sedan i morse.', newsValue: 5, category: 'larm', timestamp: m(44), createdInDb: m(44) },
  { dbId: '5', workflowId: 'wf-breaking', source: 'Aftonbladet', title: 'EU-kommissionen presenterar nytt migrationspaket', newsValue: 3, category: 'annan', timestamp: m(70), createdInDb: m(70) },

  // Stockholm
  { dbId: '10', workflowId: 'wf-sthlm', source: 'SOS Alarm', title: 'Brand i lägenhet på Södermalm – utrymning pågår', description: 'Rökutveckling rapporteras från fastighet på Götgatan. Inga personskador är ännu bekräftade.', newsValue: 4, category: 'brand', timestamp: m(4), createdInDb: m(4), location: { municipality: 'Stockholm', area: 'Södermalm', street: 'Götgatan 78' } },
  { dbId: '11', workflowId: 'wf-sthlm', source: 'Polisen', url: 'https://polisen.se', title: 'Skottlossning rapporterad i Rinkeby', description: 'Polis är på plats, inga skadade bekräftade. Tekniker kallas till platsen.', newsValue: 5, category: 'skjutning', timestamp: m(18), createdInDb: m(18), location: { municipality: 'Stockholm', area: 'Rinkeby' } },
  { dbId: '12', workflowId: 'wf-sthlm', source: 'SL', title: 'Stopp i tunnelbanans röda linje mellan T-Centralen och Slussen', newsValue: 3, category: 'signalfel', timestamp: m(33), createdInDb: m(33), location: { municipality: 'Stockholm' } },
  { dbId: '13', workflowId: 'wf-sthlm', source: 'Mitt i', title: 'Kommunstyrelsen beslutar om ny cykelplan för city', newsValue: 2, category: 'annan', timestamp: m(62), createdInDb: m(62) },
  { dbId: '14', workflowId: 'wf-sthlm', source: 'SOS Alarm', title: 'Trafikolycka E4 södergående vid Essingeleden', newsValue: 3, category: 'trafikolycka', timestamp: m(88), createdInDb: m(88), location: { municipality: 'Stockholm', area: 'Essingeleden' } },
  { dbId: '15', workflowId: 'wf-sthlm', source: 'Polisen', title: 'Rån mot butik i Vällingby – två gärningsmän på fri fot', newsValue: 3, category: 'rån', timestamp: m(120), createdInDb: m(120), location: { municipality: 'Stockholm', area: 'Vällingby' } },

  // Traffic
  { dbId: '20', workflowId: 'wf-traffic', source: 'Trafikverket', url: 'https://trafikverket.se', title: 'E6 avstängd norrgående efter olycka vid Kungälv', description: 'Två personbilar och en lastbil inblandade. Räddningstjänst på plats, omledning via väg 168.', newsValue: 4, category: 'trafikolycka', timestamp: m(6), createdInDb: m(6), location: { municipality: 'Kungälv', area: 'E6', county: 'Västra Götaland' } },
  { dbId: '21', workflowId: 'wf-traffic', source: 'Trafikverket', title: 'Köbildning 4 km på E4 vid Södertälje södergående', newsValue: 2, category: 'kö', timestamp: m(22), createdInDb: m(22) },
  { dbId: '22', workflowId: 'wf-traffic', source: 'Trafikverket', title: 'Vägarbete nattetid E20 Örebro – enkelriktat körfält', newsValue: 2, category: 'vägarbete', timestamp: m(50), createdInDb: m(50) },
  { dbId: '23', workflowId: 'wf-traffic', source: 'SOS Alarm', title: 'Fordonsbrand rapporterad på Hallandsåsen', newsValue: 3, category: 'fordonsbrand', timestamp: m(78), createdInDb: m(78), location: { area: 'Hallandsåsen' } },

  // Police
  { dbId: '30', workflowId: 'wf-police', source: 'Polisen', title: 'Misshandel – Göteborg, centrum', description: 'Ung man förd till sjukhus med lindriga skador. En person gripen på plats.', newsValue: 3, category: 'misshandel', timestamp: m(15), createdInDb: m(15), location: { municipality: 'Göteborg' } },
  { dbId: '31', workflowId: 'wf-police', source: 'Polisen', title: 'Inbrott i villa – Lund', newsValue: 2, category: 'inbrott', timestamp: m(42), createdInDb: m(42), location: { municipality: 'Lund' } },
  { dbId: '32', workflowId: 'wf-police', source: 'Polisen', title: 'Rattfylleri – Malmö', newsValue: 2, category: 'olycka', timestamp: m(69), createdInDb: m(69), location: { municipality: 'Malmö' } },
  { dbId: '33', workflowId: 'wf-police', source: 'Polisen', title: 'Stöld ur bil – Uppsala centrum', newsValue: 1, category: 'stöld', timestamp: m(96), createdInDb: m(96), location: { municipality: 'Uppsala' } },

  // Weather
  { dbId: '40', workflowId: 'wf-weather', source: 'SMHI', url: 'https://smhi.se', title: 'Klass 2-varning för snöfall i Norrbotten', description: '30–45 cm snöfall väntas mellan torsdag kväll och fredag morgon. Stora trafikstörningar befaras.', newsValue: 4, category: 'snöoväder', timestamp: m(8), createdInDb: m(8), location: { county: 'Norrbottens län' } },
  { dbId: '41', workflowId: 'wf-weather', source: 'SMHI', title: 'Klass 1-varning för hårda vindbyar längs västkusten', newsValue: 3, category: 'storm', timestamp: m(36), createdInDb: m(36), location: { county: 'Västra Götaland' } },
  { dbId: '42', workflowId: 'wf-weather', source: 'SMHI', title: 'Halkvarning Södermanland och Östergötland i natt', newsValue: 2, category: 'halka', timestamp: m(74), createdInDb: m(74) },

  // Sport
  { dbId: '50', workflowId: 'wf-sport', source: 'TT Sport', title: 'Zlatan tillbaka i landslaget enligt uppgifter', newsValue: 4, category: 'annan', timestamp: m(11), createdInDb: m(11) },
  { dbId: '51', workflowId: 'wf-sport', source: 'SVT Sport', title: 'AIK vinner mot Djurgården 2–1 i derbyt', newsValue: 3, category: 'annan', timestamp: m(40), createdInDb: m(40) },
  { dbId: '52', workflowId: 'wf-sport', source: 'Expressen', title: 'Hockeykrönikan: Så blir slutspelet 2026', newsValue: 2, category: 'annan', timestamp: m(82), createdInDb: m(82) },

  // World
  { dbId: '60', workflowId: 'wf-world', source: 'Reuters', title: 'ECB håller räntan oförändrad, signalerar sänkning i juni', newsValue: 3, category: 'annan', timestamp: m(20), createdInDb: m(20) },
  { dbId: '61', workflowId: 'wf-world', source: 'AFP', title: 'Förhandlingar återupptas om vapenvila', newsValue: 4, category: 'annan', timestamp: m(55), createdInDb: m(55) },
  { dbId: '62', workflowId: 'wf-world', source: 'TT / Reuters', title: 'Jordbävning magnitud 6.1 utanför Japans kust', newsValue: 4, category: 'olycka', timestamp: m(99), createdInDb: m(99) },
];

window.CATEGORIES = {
  brand: { label: 'Brand', icon: '🔥' },
  explosion: { label: 'Explosion', icon: '💥' },
  skjutning: { label: 'Skjutning', icon: '🔫' },
  rån: { label: 'Rån', icon: '💰' },
  misshandel: { label: 'Misshandel', icon: '🤕' },
  inbrott: { label: 'Inbrott', icon: '🏠' },
  stöld: { label: 'Stöld', icon: '👜' },
  trafikolycka: { label: 'Trafikolycka', icon: '🚗' },
  fordonsbrand: { label: 'Fordonsbrand', icon: '🔥' },
  vägarbete: { label: 'Vägarbete', icon: '🚧' },
  kö: { label: 'Kö', icon: '🚙' },
  signalfel: { label: 'Signalfel', icon: '🚦' },
  storm: { label: 'Storm', icon: '🌪️' },
  snöoväder: { label: 'Snö', icon: '❄️' },
  halka: { label: 'Halka', icon: '🧊' },
  larm: { label: 'Larm', icon: '🔔' },
  olycka: { label: 'Olycka', icon: '⚠️' },
  annan: { label: 'Övrigt', icon: '•' },
};
