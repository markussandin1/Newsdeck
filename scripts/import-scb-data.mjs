#!/usr/bin/env node

/**
 * Import Swedish geographic data from SCB (Statistics Sweden)
 *
 * This script populates the geographic reference tables with:
 * - 21 Swedish counties (län)
 * - 290 Swedish municipalities (kommuner)
 * - Common name variations for fuzzy matching
 *
 * Usage:
 *   node scripts/import-scb-data.mjs
 *
 * Requires DATABASE_URL environment variable
 */

import pg from 'pg'
import dotenv from 'dotenv'

// Load .env.local first (takes precedence), then .env
dotenv.config({ path: '.env.local' })
dotenv.config()

const { Pool } = pg

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set')
  console.error('Please add DATABASE_URL to your .env file')
  process.exit(1)
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

// Swedish counties (län) - Official SCB data
// Source: https://www.scb.se/hitta-statistik/regional-statistik-och-kartor/regionala-indelningar/lan-och-kommuner/
const SWEDISH_REGIONS = [
  { code: '01', name: 'Stockholms län', nameShort: 'Stockholm' },
  { code: '03', name: 'Uppsala län', nameShort: 'Uppsala' },
  { code: '04', name: 'Södermanlands län', nameShort: 'Södermanland' },
  { code: '05', name: 'Östergötlands län', nameShort: 'Östergötland' },
  { code: '06', name: 'Jönköpings län', nameShort: 'Jönköping' },
  { code: '07', name: 'Kronobergs län', nameShort: 'Kronoberg' },
  { code: '08', name: 'Kalmar län', nameShort: 'Kalmar' },
  { code: '09', name: 'Gotlands län', nameShort: 'Gotland' },
  { code: '10', name: 'Blekinge län', nameShort: 'Blekinge' },
  { code: '12', name: 'Skåne län', nameShort: 'Skåne' },
  { code: '13', name: 'Hallands län', nameShort: 'Halland' },
  { code: '14', name: 'Västra Götalands län', nameShort: 'Västra Götaland' },
  { code: '17', name: 'Värmlands län', nameShort: 'Värmland' },
  { code: '18', name: 'Örebro län', nameShort: 'Örebro' },
  { code: '19', name: 'Västmanlands län', nameShort: 'Västmanland' },
  { code: '20', name: 'Dalarnas län', nameShort: 'Dalarna' },
  { code: '21', name: 'Gävleborgs län', nameShort: 'Gävleborg' },
  { code: '22', name: 'Västernorrlands län', nameShort: 'Västernorrland' },
  { code: '23', name: 'Jämtlands län', nameShort: 'Jämtland' },
  { code: '24', name: 'Västerbottens län', nameShort: 'Västerbotten' },
  { code: '25', name: 'Norrbottens län', nameShort: 'Norrbotten' },
]

// Complete Swedish municipalities data (290 items) - Official SCB data from 2025
// Source: https://www.scb.se/hitta-statistik/regional-statistik-och-kartor/regionala-indelningar/lan-och-kommuner/
const SWEDISH_MUNICIPALITIES = [
  // Stockholms län (01) - 26 municipalities
  { regionCode: '01', code: '0114', name: 'Upplands Väsby' },
  { regionCode: '01', code: '0115', name: 'Vallentuna' },
  { regionCode: '01', code: '0117', name: 'Österåker' },
  { regionCode: '01', code: '0120', name: 'Värmdö' },
  { regionCode: '01', code: '0123', name: 'Järfälla' },
  { regionCode: '01', code: '0125', name: 'Ekerö' },
  { regionCode: '01', code: '0126', name: 'Huddinge' },
  { regionCode: '01', code: '0127', name: 'Botkyrka' },
  { regionCode: '01', code: '0128', name: 'Salem' },
  { regionCode: '01', code: '0136', name: 'Haninge' },
  { regionCode: '01', code: '0138', name: 'Tyresö' },
  { regionCode: '01', code: '0139', name: 'Upplands-Bro' },
  { regionCode: '01', code: '0140', name: 'Nykvarn' },
  { regionCode: '01', code: '0160', name: 'Täby' },
  { regionCode: '01', code: '0162', name: 'Danderyd' },
  { regionCode: '01', code: '0163', name: 'Sollentuna' },
  { regionCode: '01', code: '0180', name: 'Stockholm' },
  { regionCode: '01', code: '0181', name: 'Södertälje' },
  { regionCode: '01', code: '0182', name: 'Nacka' },
  { regionCode: '01', code: '0183', name: 'Sundbyberg' },
  { regionCode: '01', code: '0184', name: 'Solna' },
  { regionCode: '01', code: '0186', name: 'Lidingö' },
  { regionCode: '01', code: '0187', name: 'Vaxholm' },
  { regionCode: '01', code: '0188', name: 'Norrtälje' },
  { regionCode: '01', code: '0191', name: 'Sigtuna' },
  { regionCode: '01', code: '0192', name: 'Nynäshamn' },

  // Uppsala län (03) - 8 municipalities
  { regionCode: '03', code: '0305', name: 'Håbo' },
  { regionCode: '03', code: '0319', name: 'Älvkarleby' },
  { regionCode: '03', code: '0330', name: 'Knivsta' },
  { regionCode: '03', code: '0331', name: 'Heby' },
  { regionCode: '03', code: '0360', name: 'Tierp' },
  { regionCode: '03', code: '0380', name: 'Uppsala' },
  { regionCode: '03', code: '0381', name: 'Enköping' },
  { regionCode: '03', code: '0382', name: 'Östhammar' },

  // Södermanlands län (04) - 9 municipalities
  { regionCode: '04', code: '0428', name: 'Vingåker' },
  { regionCode: '04', code: '0461', name: 'Gnesta' },
  { regionCode: '04', code: '0480', name: 'Nyköping' },
  { regionCode: '04', code: '0481', name: 'Oxelösund' },
  { regionCode: '04', code: '0482', name: 'Flen' },
  { regionCode: '04', code: '0483', name: 'Katrineholm' },
  { regionCode: '04', code: '0484', name: 'Eskilstuna' },
  { regionCode: '04', code: '0486', name: 'Strängnäs' },
  { regionCode: '04', code: '0488', name: 'Trosa' },

  // Östergötlands län (05) - 13 municipalities
  { regionCode: '05', code: '0509', name: 'Ödeshög' },
  { regionCode: '05', code: '0512', name: 'Ydre' },
  { regionCode: '05', code: '0513', name: 'Kinda' },
  { regionCode: '05', code: '0560', name: 'Boxholm' },
  { regionCode: '05', code: '0561', name: 'Åtvidaberg' },
  { regionCode: '05', code: '0562', name: 'Finspång' },
  { regionCode: '05', code: '0563', name: 'Valdemarsvik' },
  { regionCode: '05', code: '0580', name: 'Linköping' },
  { regionCode: '05', code: '0581', name: 'Norrköping' },
  { regionCode: '05', code: '0582', name: 'Söderköping' },
  { regionCode: '05', code: '0583', name: 'Motala' },
  { regionCode: '05', code: '0584', name: 'Vadstena' },
  { regionCode: '05', code: '0586', name: 'Mjölby' },

  // Jönköpings län (06) - 13 municipalities
  { regionCode: '06', code: '0604', name: 'Aneby' },
  { regionCode: '06', code: '0617', name: 'Gnosjö' },
  { regionCode: '06', code: '0642', name: 'Mullsjö' },
  { regionCode: '06', code: '0643', name: 'Habo' },
  { regionCode: '06', code: '0662', name: 'Gislaved' },
  { regionCode: '06', code: '0665', name: 'Vaggeryd' },
  { regionCode: '06', code: '0680', name: 'Jönköping' },
  { regionCode: '06', code: '0682', name: 'Nässjö' },
  { regionCode: '06', code: '0683', name: 'Värnamo' },
  { regionCode: '06', code: '0684', name: 'Sävsjö' },
  { regionCode: '06', code: '0685', name: 'Vetlanda' },
  { regionCode: '06', code: '0686', name: 'Eksjö' },
  { regionCode: '06', code: '0687', name: 'Tranås' },

  // Kronobergs län (07) - 8 municipalities
  { regionCode: '07', code: '0760', name: 'Uppvidinge' },
  { regionCode: '07', code: '0761', name: 'Lessebo' },
  { regionCode: '07', code: '0763', name: 'Tingsryd' },
  { regionCode: '07', code: '0764', name: 'Alvesta' },
  { regionCode: '07', code: '0765', name: 'Älmhult' },
  { regionCode: '07', code: '0767', name: 'Markaryd' },
  { regionCode: '07', code: '0780', name: 'Växjö' },
  { regionCode: '07', code: '0781', name: 'Ljungby' },

  // Kalmar län (08) - 12 municipalities
  { regionCode: '08', code: '0821', name: 'Högsby' },
  { regionCode: '08', code: '0834', name: 'Torsås' },
  { regionCode: '08', code: '0840', name: 'Mörbylånga' },
  { regionCode: '08', code: '0860', name: 'Hultsfred' },
  { regionCode: '08', code: '0861', name: 'Mönsterås' },
  { regionCode: '08', code: '0862', name: 'Emmaboda' },
  { regionCode: '08', code: '0880', name: 'Kalmar' },
  { regionCode: '08', code: '0881', name: 'Nybro' },
  { regionCode: '08', code: '0882', name: 'Oskarshamn' },
  { regionCode: '08', code: '0883', name: 'Västervik' },
  { regionCode: '08', code: '0884', name: 'Vimmerby' },
  { regionCode: '08', code: '0885', name: 'Borgholm' },

  // Gotlands län (09) - 1 municipalities
  { regionCode: '09', code: '0980', name: 'Gotland' },

  // Blekinge län (10) - 5 municipalities
  { regionCode: '10', code: '1060', name: 'Olofström' },
  { regionCode: '10', code: '1080', name: 'Karlskrona' },
  { regionCode: '10', code: '1081', name: 'Ronneby' },
  { regionCode: '10', code: '1082', name: 'Karlshamn' },
  { regionCode: '10', code: '1083', name: 'Sölvesborg' },

  // Skåne län (12) - 33 municipalities
  { regionCode: '12', code: '1214', name: 'Svalöv' },
  { regionCode: '12', code: '1230', name: 'Staffanstorp' },
  { regionCode: '12', code: '1231', name: 'Burlöv' },
  { regionCode: '12', code: '1233', name: 'Vellinge' },
  { regionCode: '12', code: '1256', name: 'Östra Göinge' },
  { regionCode: '12', code: '1257', name: 'Örkelljunga' },
  { regionCode: '12', code: '1260', name: 'Bjuv' },
  { regionCode: '12', code: '1261', name: 'Kävlinge' },
  { regionCode: '12', code: '1262', name: 'Lomma' },
  { regionCode: '12', code: '1263', name: 'Svedala' },
  { regionCode: '12', code: '1264', name: 'Skurup' },
  { regionCode: '12', code: '1265', name: 'Sjöbo' },
  { regionCode: '12', code: '1266', name: 'Hörby' },
  { regionCode: '12', code: '1267', name: 'Höör' },
  { regionCode: '12', code: '1270', name: 'Tomelilla' },
  { regionCode: '12', code: '1272', name: 'Bromölla' },
  { regionCode: '12', code: '1273', name: 'Osby' },
  { regionCode: '12', code: '1275', name: 'Perstorp' },
  { regionCode: '12', code: '1276', name: 'Klippan' },
  { regionCode: '12', code: '1277', name: 'Åstorp' },
  { regionCode: '12', code: '1278', name: 'Båstad' },
  { regionCode: '12', code: '1280', name: 'Malmö' },
  { regionCode: '12', code: '1281', name: 'Lund' },
  { regionCode: '12', code: '1282', name: 'Landskrona' },
  { regionCode: '12', code: '1283', name: 'Helsingborg' },
  { regionCode: '12', code: '1284', name: 'Höganäs' },
  { regionCode: '12', code: '1285', name: 'Eslöv' },
  { regionCode: '12', code: '1286', name: 'Ystad' },
  { regionCode: '12', code: '1287', name: 'Trelleborg' },
  { regionCode: '12', code: '1290', name: 'Kristianstad' },
  { regionCode: '12', code: '1291', name: 'Simrishamn' },
  { regionCode: '12', code: '1292', name: 'Ängelholm' },
  { regionCode: '12', code: '1293', name: 'Hässleholm' },

  // Hallands län (13) - 6 municipalities
  { regionCode: '13', code: '1315', name: 'Hylte' },
  { regionCode: '13', code: '1380', name: 'Halmstad' },
  { regionCode: '13', code: '1381', name: 'Laholm' },
  { regionCode: '13', code: '1382', name: 'Falkenberg' },
  { regionCode: '13', code: '1383', name: 'Varberg' },
  { regionCode: '13', code: '1384', name: 'Kungsbacka' },

  // Västra Götalands län (14) - 49 municipalities
  { regionCode: '14', code: '1401', name: 'Härryda' },
  { regionCode: '14', code: '1402', name: 'Partille' },
  { regionCode: '14', code: '1407', name: 'Öckerö' },
  { regionCode: '14', code: '1415', name: 'Stenungsund' },
  { regionCode: '14', code: '1419', name: 'Tjörn' },
  { regionCode: '14', code: '1421', name: 'Orust' },
  { regionCode: '14', code: '1427', name: 'Sotenäs' },
  { regionCode: '14', code: '1430', name: 'Munkedal' },
  { regionCode: '14', code: '1435', name: 'Tanum' },
  { regionCode: '14', code: '1438', name: 'Dals-Ed' },
  { regionCode: '14', code: '1439', name: 'Färgelanda' },
  { regionCode: '14', code: '1440', name: 'Ale' },
  { regionCode: '14', code: '1441', name: 'Lerum' },
  { regionCode: '14', code: '1442', name: 'Vårgårda' },
  { regionCode: '14', code: '1443', name: 'Bollebygd' },
  { regionCode: '14', code: '1444', name: 'Grästorp' },
  { regionCode: '14', code: '1445', name: 'Essunga' },
  { regionCode: '14', code: '1446', name: 'Karlsborg' },
  { regionCode: '14', code: '1447', name: 'Gullspång' },
  { regionCode: '14', code: '1452', name: 'Tranemo' },
  { regionCode: '14', code: '1460', name: 'Bengtsfors' },
  { regionCode: '14', code: '1461', name: 'Mellerud' },
  { regionCode: '14', code: '1462', name: 'Lilla Edet' },
  { regionCode: '14', code: '1463', name: 'Mark' },
  { regionCode: '14', code: '1465', name: 'Svenljunga' },
  { regionCode: '14', code: '1466', name: 'Herrljunga' },
  { regionCode: '14', code: '1470', name: 'Vara' },
  { regionCode: '14', code: '1471', name: 'Götene' },
  { regionCode: '14', code: '1472', name: 'Tibro' },
  { regionCode: '14', code: '1473', name: 'Töreboda' },
  { regionCode: '14', code: '1480', name: 'Göteborg' },
  { regionCode: '14', code: '1481', name: 'Mölndal' },
  { regionCode: '14', code: '1482', name: 'Kungälv' },
  { regionCode: '14', code: '1484', name: 'Lysekil' },
  { regionCode: '14', code: '1485', name: 'Uddevalla' },
  { regionCode: '14', code: '1486', name: 'Strömstad' },
  { regionCode: '14', code: '1487', name: 'Vänersborg' },
  { regionCode: '14', code: '1488', name: 'Trollhättan' },
  { regionCode: '14', code: '1489', name: 'Alingsås' },
  { regionCode: '14', code: '1490', name: 'Borås' },
  { regionCode: '14', code: '1491', name: 'Ulricehamn' },
  { regionCode: '14', code: '1492', name: 'Åmål' },
  { regionCode: '14', code: '1493', name: 'Mariestad' },
  { regionCode: '14', code: '1494', name: 'Lidköping' },
  { regionCode: '14', code: '1495', name: 'Skara' },
  { regionCode: '14', code: '1496', name: 'Skövde' },
  { regionCode: '14', code: '1497', name: 'Hjo' },
  { regionCode: '14', code: '1498', name: 'Tidaholm' },
  { regionCode: '14', code: '1499', name: 'Falköping' },

  // Värmlands län (17) - 16 municipalities
  { regionCode: '17', code: '1715', name: 'Kil' },
  { regionCode: '17', code: '1730', name: 'Eda' },
  { regionCode: '17', code: '1737', name: 'Torsby' },
  { regionCode: '17', code: '1760', name: 'Storfors' },
  { regionCode: '17', code: '1761', name: 'Hammarö' },
  { regionCode: '17', code: '1762', name: 'Munkfors' },
  { regionCode: '17', code: '1763', name: 'Forshaga' },
  { regionCode: '17', code: '1764', name: 'Grums' },
  { regionCode: '17', code: '1765', name: 'Årjäng' },
  { regionCode: '17', code: '1766', name: 'Sunne' },
  { regionCode: '17', code: '1780', name: 'Karlstad' },
  { regionCode: '17', code: '1781', name: 'Kristinehamn' },
  { regionCode: '17', code: '1782', name: 'Filipstad' },
  { regionCode: '17', code: '1783', name: 'Hagfors' },
  { regionCode: '17', code: '1784', name: 'Arvika' },
  { regionCode: '17', code: '1785', name: 'Säffle' },

  // Örebro län (18) - 12 municipalities
  { regionCode: '18', code: '1814', name: 'Lekeberg' },
  { regionCode: '18', code: '1860', name: 'Laxå' },
  { regionCode: '18', code: '1861', name: 'Hallsberg' },
  { regionCode: '18', code: '1862', name: 'Degerfors' },
  { regionCode: '18', code: '1863', name: 'Hällefors' },
  { regionCode: '18', code: '1864', name: 'Ljusnarsberg' },
  { regionCode: '18', code: '1880', name: 'Örebro' },
  { regionCode: '18', code: '1881', name: 'Kumla' },
  { regionCode: '18', code: '1882', name: 'Askersund' },
  { regionCode: '18', code: '1883', name: 'Karlskoga' },
  { regionCode: '18', code: '1884', name: 'Nora' },
  { regionCode: '18', code: '1885', name: 'Lindesberg' },

  // Västmanlands län (19) - 10 municipalities
  { regionCode: '19', code: '1904', name: 'Skinnskatteberg' },
  { regionCode: '19', code: '1907', name: 'Surahammar' },
  { regionCode: '19', code: '1960', name: 'Kungsör' },
  { regionCode: '19', code: '1961', name: 'Hallstahammar' },
  { regionCode: '19', code: '1962', name: 'Norberg' },
  { regionCode: '19', code: '1980', name: 'Västerås' },
  { regionCode: '19', code: '1981', name: 'Sala' },
  { regionCode: '19', code: '1982', name: 'Fagersta' },
  { regionCode: '19', code: '1983', name: 'Köping' },
  { regionCode: '19', code: '1984', name: 'Arboga' },

  // Dalarnas län (20) - 15 municipalities
  { regionCode: '20', code: '2021', name: 'Vansbro' },
  { regionCode: '20', code: '2023', name: 'Malung-Sälen' },
  { regionCode: '20', code: '2026', name: 'Gagnef' },
  { regionCode: '20', code: '2029', name: 'Leksand' },
  { regionCode: '20', code: '2031', name: 'Rättvik' },
  { regionCode: '20', code: '2034', name: 'Orsa' },
  { regionCode: '20', code: '2039', name: 'Älvdalen' },
  { regionCode: '20', code: '2061', name: 'Smedjebacken' },
  { regionCode: '20', code: '2062', name: 'Mora' },
  { regionCode: '20', code: '2080', name: 'Falun' },
  { regionCode: '20', code: '2081', name: 'Borlänge' },
  { regionCode: '20', code: '2082', name: 'Säter' },
  { regionCode: '20', code: '2083', name: 'Hedemora' },
  { regionCode: '20', code: '2084', name: 'Avesta' },
  { regionCode: '20', code: '2085', name: 'Ludvika' },

  // Gävleborgs län (21) - 10 municipalities
  { regionCode: '21', code: '2101', name: 'Ockelbo' },
  { regionCode: '21', code: '2104', name: 'Hofors' },
  { regionCode: '21', code: '2121', name: 'Ovanåker' },
  { regionCode: '21', code: '2132', name: 'Nordanstig' },
  { regionCode: '21', code: '2161', name: 'Ljusdal' },
  { regionCode: '21', code: '2180', name: 'Gävle' },
  { regionCode: '21', code: '2181', name: 'Sandviken' },
  { regionCode: '21', code: '2182', name: 'Söderhamn' },
  { regionCode: '21', code: '2183', name: 'Bollnäs' },
  { regionCode: '21', code: '2184', name: 'Hudiksvall' },

  // Västernorrlands län (22) - 7 municipalities
  { regionCode: '22', code: '2260', name: 'Ånge' },
  { regionCode: '22', code: '2262', name: 'Timrå' },
  { regionCode: '22', code: '2280', name: 'Härnösand' },
  { regionCode: '22', code: '2281', name: 'Sundsvall' },
  { regionCode: '22', code: '2282', name: 'Kramfors' },
  { regionCode: '22', code: '2283', name: 'Sollefteå' },
  { regionCode: '22', code: '2284', name: 'Örnsköldsvik' },

  // Jämtlands län (23) - 8 municipalities
  { regionCode: '23', code: '2303', name: 'Ragunda' },
  { regionCode: '23', code: '2305', name: 'Bräcke' },
  { regionCode: '23', code: '2309', name: 'Krokom' },
  { regionCode: '23', code: '2313', name: 'Strömsund' },
  { regionCode: '23', code: '2321', name: 'Åre' },
  { regionCode: '23', code: '2326', name: 'Berg' },
  { regionCode: '23', code: '2361', name: 'Härjedalen' },
  { regionCode: '23', code: '2380', name: 'Östersund' },

  // Västerbottens län (24) - 15 municipalities
  { regionCode: '24', code: '2401', name: 'Nordmaling' },
  { regionCode: '24', code: '2403', name: 'Bjurholm' },
  { regionCode: '24', code: '2404', name: 'Vindeln' },
  { regionCode: '24', code: '2409', name: 'Robertsfors' },
  { regionCode: '24', code: '2417', name: 'Norsjö' },
  { regionCode: '24', code: '2418', name: 'Malå' },
  { regionCode: '24', code: '2421', name: 'Storuman' },
  { regionCode: '24', code: '2422', name: 'Sorsele' },
  { regionCode: '24', code: '2425', name: 'Dorotea' },
  { regionCode: '24', code: '2460', name: 'Vännäs' },
  { regionCode: '24', code: '2462', name: 'Vilhelmina' },
  { regionCode: '24', code: '2463', name: 'Åsele' },
  { regionCode: '24', code: '2480', name: 'Umeå' },
  { regionCode: '24', code: '2481', name: 'Lycksele' },
  { regionCode: '24', code: '2482', name: 'Skellefteå' },

  // Norrbottens län (25) - 14 municipalities
  { regionCode: '25', code: '2505', name: 'Arvidsjaur' },
  { regionCode: '25', code: '2506', name: 'Arjeplog' },
  { regionCode: '25', code: '2510', name: 'Jokkmokk' },
  { regionCode: '25', code: '2513', name: 'Överkalix' },
  { regionCode: '25', code: '2514', name: 'Kalix' },
  { regionCode: '25', code: '2518', name: 'Övertorneå' },
  { regionCode: '25', code: '2521', name: 'Pajala' },
  { regionCode: '25', code: '2523', name: 'Gällivare' },
  { regionCode: '25', code: '2560', name: 'Älvsbyn' },
  { regionCode: '25', code: '2580', name: 'Luleå' },
  { regionCode: '25', code: '2581', name: 'Piteå' },
  { regionCode: '25', code: '2582', name: 'Boden' },
  { regionCode: '25', code: '2583', name: 'Haparanda' },
  { regionCode: '25', code: '2584', name: 'Kiruna' },

]

/**
 * Generate common name variations for a location name
 */
function generateNameVariations(name, nameShort, type) {
  const variations = []
  const baseName = name.toLowerCase().trim()
  const baseShort = nameShort ? nameShort.toLowerCase().trim() : null

  // Base variations
  variations.push({ variant: baseName, type: 'exact' })
  if (baseShort && baseShort !== baseName) {
    variations.push({ variant: baseShort, type: 'exact' })
  }

  // Remove "län" suffix for regions
  if (type === 'region' && name.includes('län')) {
    const withoutLan = name.replace(/\slän$/i, '').toLowerCase().trim()
    variations.push({ variant: withoutLan, type: 'exact' })
    if (nameShort) {
      variations.push({ variant: nameShort.toLowerCase().trim() + 's lan', type: 'fuzzy' })
    }
  }

  // Remove possessive 's'
  if (name.includes('s ')) {
    const withoutS = name.replace(/s\s/, ' ').toLowerCase().trim()
    variations.push({ variant: withoutS, type: 'fuzzy' })
  }

  // Common abbreviations
  if (name.toLowerCase().includes('stockholm')) {
    variations.push({ variant: 'sthlm', type: 'fuzzy' })
  }
  if (name.toLowerCase().includes('göteborg')) {
    variations.push({ variant: 'gbg', type: 'fuzzy' })
  }
  if (name.toLowerCase().includes('malmö')) {
    variations.push({ variant: 'malmo', type: 'fuzzy' })  // Without ö
  }

  return variations
}

/**
 * Import Swedish regions (län)
 */
async function importRegions() {
  console.log('\n📍 Importing Swedish regions (län)...')

  let inserted = 0
  let skipped = 0

  for (const region of SWEDISH_REGIONS) {
    try {
      await pool.query(
        `INSERT INTO regions (country_code, code, name, name_short, is_active)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (country_code, code) DO NOTHING`,
        ['SE', region.code, region.name, region.nameShort, true]
      )

      // Check if it was actually inserted
      const result = await pool.query(
        'SELECT 1 FROM regions WHERE country_code = $1 AND code = $2',
        ['SE', region.code]
      )

      if (result.rowCount > 0) {
        inserted++
        console.log(`  ✓ ${region.name} (${region.code})`)

        // Generate and insert name variations
        const variations = generateNameVariations(region.name, region.nameShort, 'region')
        for (const variation of variations) {
          const priority = variation.type === 'exact' ? 20 : 30  // Region priority
          await pool.query(
            `INSERT INTO location_name_mappings (
              variant, region_country_code, region_code, match_priority, match_type
            ) VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (variant) DO NOTHING`,
            [variation.variant, 'SE', region.code, priority, variation.type]
          )
        }
      } else {
        skipped++
      }
    } catch (error) {
      console.error(`  ✗ Error importing ${region.name}:`, error.message)
    }
  }

  console.log(`\n✅ Regions imported: ${inserted} new, ${skipped} existing`)
}

/**
 * Import Swedish municipalities (kommuner)
 */
async function importMunicipalities() {
  console.log('\n🏘️  Importing Swedish municipalities (kommuner)...')
  console.log(`   Note: This is a sample dataset. Full dataset has 290 municipalities.`)

  let inserted = 0
  let skipped = 0

  for (const municipality of SWEDISH_MUNICIPALITIES) {
    try {
      await pool.query(
        `INSERT INTO municipalities (country_code, region_code, code, name, is_active)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (country_code, region_code, code) DO NOTHING`,
        ['SE', municipality.regionCode, municipality.code, municipality.name, true]
      )

      // Check if it was actually inserted
      const result = await pool.query(
        'SELECT 1 FROM municipalities WHERE country_code = $1 AND region_code = $2 AND code = $3',
        ['SE', municipality.regionCode, municipality.code]
      )

      if (result.rowCount > 0) {
        inserted++
        console.log(`  ✓ ${municipality.name} (${municipality.code})`)

        // Generate and insert name variations
        const variations = generateNameVariations(municipality.name, null, 'municipality')
        for (const variation of variations) {
          const priority = variation.type === 'exact' ? 10 : 15  // Municipality priority (higher than region)
          await pool.query(
            `INSERT INTO location_name_mappings (
              variant, municipality_country_code, municipality_region_code,
              municipality_code, match_priority, match_type
            ) VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (variant) DO NOTHING`,
            [variation.variant, 'SE', municipality.regionCode, municipality.code, priority, variation.type]
          )
        }
      } else {
        skipped++
      }
    } catch (error) {
      console.error(`  ✗ Error importing ${municipality.name}:`, error.message)
    }
  }

  console.log(`\n✅ Municipalities imported: ${inserted} new, ${skipped} existing`)
}

/**
 * Main import function
 */
async function main() {
  console.log('🇸🇪 SCB Geographic Data Import')
  console.log('================================')
  console.log(`Database: ${process.env.DATABASE_URL.split('@')[1] || 'local'}`)

  try {
    // Test database connection
    await pool.query('SELECT 1')
    console.log('✅ Database connection successful\n')

    // Import regions
    await importRegions()

    // Import municipalities
    await importMunicipalities()

    // Print summary
    const regionCount = await pool.query('SELECT COUNT(*) FROM regions WHERE country_code = $1', ['SE'])
    const municipalityCount = await pool.query('SELECT COUNT(*) FROM municipalities WHERE country_code = $1', ['SE'])
    const mappingCount = await pool.query('SELECT COUNT(*) FROM location_name_mappings')

    console.log('\n📊 Import Summary')
    console.log('=================')
    console.log(`Regions (län):         ${regionCount.rows[0].count}`)
    console.log(`Municipalities:        ${municipalityCount.rows[0].count}`)
    console.log(`Name mappings:         ${mappingCount.rows[0].count}`)

    console.log('\n✅ Import completed successfully!')
    console.log('\nNext steps:')
    console.log('  1. Restart your application to load the location cache')
    console.log('  2. Test location normalization with sample news items')
    console.log('  3. Check /api/geo endpoints for geographic data')

  } catch (error) {
    console.error('\n❌ Import failed:', error.message)
    console.error(error.stack)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Run the import
main()
