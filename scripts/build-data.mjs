#!/usr/bin/env node
// Builds the static reference databases served from public/data/.
//
//   node scripts/build-data.mjs [--cache <dir>]
//
// Sources (all public, all on GitHub so the build works behind restrictive proxies):
//   - OurAirports            airports.csv            -> airports.json
//   - VATSpy data project     VATSpy.dat + Boundaries -> vatsim.json, firs.json
//   - vAMSYS fleet catalogs   backend/data/aircraft   -> fleet.json
//   - vAMSYS airport catalogs backend/data/airports   -> airports.json (network flags)

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'public', 'data')
const cacheArg = process.argv.indexOf('--cache')
const cacheDir = cacheArg > 0 ? path.resolve(process.argv[cacheArg + 1]) : path.join(root, '.data-cache')

const NE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson'
const SOURCES = {
  'rivers.geojson': `${NE}/ne_10m_rivers_lake_centerlines.geojson`,
  'lakes.geojson': `${NE}/ne_50m_lakes.geojson`,
  'places.geojson': `${NE}/ne_10m_populated_places.geojson`,
  'airports.csv': 'https://raw.githubusercontent.com/davidmegginson/ourairports-data/main/airports.csv',
  'VATSpy.dat': 'https://raw.githubusercontent.com/vatsimnetwork/vatspy-data-project/master/VATSpy.dat',
  'Boundaries.geojson': 'https://raw.githubusercontent.com/vatsimnetwork/vatspy-data-project/master/Boundaries.geojson',
}

async function source(name) {
  fs.mkdirSync(cacheDir, { recursive: true })
  const file = path.join(cacheDir, name)
  if (!fs.existsSync(file)) {
    console.log(`fetch ${SOURCES[name]}`)
    const res = await fetch(SOURCES[name])
    if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`)
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()))
  }
  return fs.readFileSync(file, 'utf8')
}

function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else quoted = false
      } else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else if (c !== '\r') field += c
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  const [header, ...body] = rows
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])))
}

const round = (n, d) => Math.round(n * 10 ** d) / 10 ** d

// Display name without generic suffixes: "Pulkovo Airport" -> "Pulkovo".
function shortAirportName(name) {
  return name
    .replace(/\b(international|intl\.?|regional|municipal|domestic)\b/gi, '')
    .replace(/\b(airport|airfield|aerodrome|air base|airbase)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/[\s,–-]+$/, '')
    .trim() || name
}

// Russian aliases for cities that OurAirports keywords don't cover well. Search-only.
const RU_CITY_ALIASES = {
  Moscow: 'Москва', 'St. Petersburg': 'Санкт-Петербург Питер СПб', 'Saint Petersburg': 'Санкт-Петербург Питер СПб',
  Sochi: 'Сочи Адлер', Kazan: 'Казань', Yekaterinburg: 'Екатеринбург', Novosibirsk: 'Новосибирск', Samara: 'Самара',
  'Nizhny Novgorod': 'Нижний Новгород', 'Rostov-on-Don': 'Ростов-на-Дону', Krasnodar: 'Краснодар', Ufa: 'Уфа',
  Perm: 'Пермь', Volgograd: 'Волгоград', Krasnoyarsk: 'Красноярск', Omsk: 'Омск', Chelyabinsk: 'Челябинск',
  Irkutsk: 'Иркутск', Vladivostok: 'Владивосток', Khabarovsk: 'Хабаровск', Kaliningrad: 'Калининград',
  Murmansk: 'Мурманск', Arkhangelsk: 'Архангельск', Mineralnye_Vody: 'Минеральные Воды', 'Mineralnye Vody': 'Минеральные Воды',
  Makhachkala: 'Махачкала', Grozny: 'Грозный', Vladikavkaz: 'Владикавказ', Nalchik: 'Нальчик', Stavropol: 'Ставрополь',
  Anapa: 'Анапа', Gelendzhik: 'Геленджик', Simferopol: 'Симферополь', Astrakhan: 'Астрахань', Saratov: 'Саратов',
  Orenburg: 'Оренбург', Tyumen: 'Тюмень', Surgut: 'Сургут', Tomsk: 'Томск', Barnaul: 'Барнаул', Kemerovo: 'Кемерово',
  Novokuznetsk: 'Новокузнецк', Abakan: 'Абакан', 'Ulan-Ude': 'Улан-Удэ', Chita: 'Чита', Yakutsk: 'Якутск',
  Magadan: 'Магадан', 'Petropavlovsk-Kamchatsky': 'Петропавловск-Камчатский', 'Yuzhno-Sakhalinsk': 'Южно-Сахалинск',
  Norilsk: 'Норильск', Syktyvkar: 'Сыктывкар', Vologda: 'Вологда', Petrozavodsk: 'Петрозаводск', Pskov: 'Псков',
  Kaluga: 'Калуга', Belgorod: 'Белгород', Voronezh: 'Воронеж', Lipetsk: 'Липецк', Kursk: 'Курск', Bryansk: 'Брянск',
  Ivanovo: 'Иваново', Yaroslavl: 'Ярославль', Cheboksary: 'Чебоксары', Izhevsk: 'Ижевск', Kirov: 'Киров',
  Ulyanovsk: 'Ульяновск', Penza: 'Пенза', Saransk: 'Саранск', 'Naberezhnye Chelny': 'Набережные Челны', Magnitogorsk: 'Магнитогорск',
  'Khanty-Mansiysk': 'Ханты-Мансийск', 'Nizhnevartovsk': 'Нижневартовск', 'Novy Urengoy': 'Новый Уренгой', Salekhard: 'Салехард',
  Minsk: 'Минск', Yerevan: 'Ереван', Tbilisi: 'Тбилиси', Batumi: 'Батуми', Kutaisi: 'Кутаиси', Baku: 'Баку',
  Almaty: 'Алматы', Astana: 'Астана', Tashkent: 'Ташкент', Samarkand: 'Самарканд', Bukhara: 'Бухара', Bishkek: 'Бишкек',
  Osh: 'Ош', Dushanbe: 'Душанбе', Ashgabat: 'Ашхабад', Antalya: 'Анталья', Istanbul: 'Стамбул', Dubai: 'Дубай',
  'Sharm el-Sheikh': 'Шарм-эль-Шейх', Hurghada: 'Хургада', Cairo: 'Каир', Bangkok: 'Бангкок', Phuket: 'Пхукет',
  Beijing: 'Пекин', Shanghai: 'Шанхай', Delhi: 'Дели', 'New Delhi': 'Нью-Дели', Male: 'Мале', Colombo: 'Коломбо',
  Havana: 'Гавана', Varadero: 'Варадеро', Tehran: 'Тегеран', Doha: 'Доха', 'Abu Dhabi': 'Абу-Даби',
}

const CYRILLIC = /[Ѐ-ӿ]/

let PLACES = []

/** Russian city name: hand list first, then the nearest Natural Earth city (≤ 30 km) with the same English name. */
function cityRuFor(city, lat, lon) {
  const own = RU_CITY_ALIASES[city]
  if (own) return own.split(' ')[0] === 'Санкт-Петербург' ? 'Санкт-Петербург' : own.replace(/\s+(Питер|СПб|Адлер)$/u, '').split(/\s{2,}/)[0]
  const key = city.toLowerCase()
  for (const p of PLACES) {
    if (!p[1]) continue
    if (Math.abs(p[4] - lat) > 0.3 || Math.abs(p[3] - lon) > 0.5) continue
    if (p[0].toLowerCase() === key || p[0].toLowerCase().startsWith(key) || key.startsWith(p[0].toLowerCase())) return p[1]
  }
  return ''
}

async function buildAirports() {
  const rows = parseCsv(await source('airports.csv'))
  const network = {}
  for (const src of ['vnws', 'rag']) {
    const file = path.join(root, 'backend', 'data', 'airports', `${src}.json`)
    if (!fs.existsSync(file)) continue
    for (const a of JSON.parse(fs.readFileSync(file, 'utf8'))) {
      const icao = String(a.icao || '').toUpperCase()
      network[icao] = (network[icao] || 0) | (src === 'vnws' ? 1 : 2) | (a.is_hub ? 4 : 0)
    }
  }
  const typeCode = { large_airport: 'L', medium_airport: 'M', small_airport: 'S' }
  const out = []
  const seen = new Set()
  for (const r of rows) {
    let icao = r.icao_code
    if (!/^[A-Z]{4}$/.test(icao) && /^[A-Z]{4}$/.test(r.gps_code) && r.gps_code === r.ident) icao = r.gps_code
    if (!/^[A-Z]{4}$/.test(icao) && /^[A-Z]{4}$/.test(r.ident)) icao = r.ident
    if (!/^[A-Z]{4}$/.test(icao) || seen.has(icao)) continue
    const t = typeCode[r.type]
    if (!t) continue
    seen.add(icao)
    const city = (r.municipality || '').replace(/\s*\(.*?\)\s*/g, ' ').trim().replace(/^St\. Petersburg$/, 'Saint Petersburg')
    const ru = [
      ...String(r.keywords || '').split(',').map((k) => k.trim()).filter((k) => CYRILLIC.test(k)),
      RU_CITY_ALIASES[city] || '',
    ].filter(Boolean).join(' ').replace(/́/g, '')
    const wiki = (r.wikipedia_link || '').replace(/^https?:\/\/en\.wikipedia\.org\/wiki\//, '')
    out.push([
      icao, r.iata_code || '', shortAirportName(r.name), r.name, city, r.iso_country,
      round(Number(r.latitude_deg), 4), round(Number(r.longitude_deg), 4),
      t + (r.scheduled_service === 'yes' ? '1' : '0'), network[icao] || 0, ru, wiki.startsWith('http') ? '' : wiki,
      cityRuFor(city, Number(r.latitude_deg), Number(r.longitude_deg)),
    ])
  }
  // Large/scheduled first so naive prefix scans hit the important ones early.
  const rank = (a) => (a[8][0] === 'L' ? 0 : a[8][0] === 'M' ? 1 : 2) - (a[9] ? 3 : 0) + (a[8][1] === '1' ? 0 : 0.5)
  out.sort((a, b) => rank(a) - rank(b) || a[0].localeCompare(b[0]))
  const fields = ['icao', 'iata', 'name', 'fullName', 'city', 'country', 'lat', 'lon', 'kind', 'network', 'ru', 'wiki', 'cityRu']
  fs.writeFileSync(path.join(outDir, 'airports.json'), JSON.stringify({ v: 1, fields, rows: out }))
  console.log(`airports.json: ${out.length} airports`)
}

const DIVISION_NAMES = {
  VATRUS: ['Россия', 'Russia'], VATEUD: ['Европа', 'Europe'], VATUK: ['Великобритания', 'United Kingdom'],
  VATMENA: ['Ближний Восток и Северная Африка', 'Middle East & North Africa'], VATSSA: ['Африка к югу от Сахары', 'Sub-Saharan Africa'],
  VATUSA: ['США', 'United States'], VATCAN: ['Канада', 'Canada'], VATCAR: ['Карибы', 'Caribbean'], VATMEX: ['Мексика', 'Mexico'],
  VATCA: ['Центральная Америка', 'Central America'], VATSUR: ['Южная Америка', 'South America'], VATBRZ: ['Бразилия', 'Brazil'],
  VATSEA: ['Юго-Восточная Азия', 'Southeast Asia'], VATPRC: ['Китай', 'China'], VATROC: ['Тайвань', 'Taiwan'],
  VATJPN: ['Япония', 'Japan'], VATKOR: ['Корея', 'Korea'], VATPAC: ['Австралия и Тихий океан', 'Australia & Pacific'],
  VATNZ: ['Новая Зеландия', 'New Zealand'], VATWA: ['Западная Азия', 'West Asia'], VATIL: ['Израиль', 'Israel'],
}

function roundGeometry(geometry, d) {
  const ring = (r) => {
    const outRing = []
    for (const [x, y] of r) {
      const p = [round(x, d), round(y, d)]
      const last = outRing[outRing.length - 1]
      if (!last || last[0] !== p[0] || last[1] !== p[1]) outRing.push(p)
    }
    return outRing
  }
  if (geometry.type === 'Polygon') return { type: 'Polygon', coordinates: geometry.coordinates.map(ring) }
  return { type: 'MultiPolygon', coordinates: geometry.coordinates.map((poly) => poly.map(ring)) }
}

async function buildVatsim() {
  const dat = (await source('VATSpy.dat')).split(/\r?\n/)
  let section = ''
  const countries = []
  const firNames = {}
  const firCallsign = {}
  const airportFir = {}
  const uirs = []
  for (const line of dat) {
    if (!line || line.startsWith(';')) continue
    const m = line.match(/^\[(.+)\]$/)
    if (m) { section = m[1]; continue }
    const p = line.split('|')
    if (section === 'Countries') countries.push({ name: p[0], prefix: p[1], facility: p[2] || '' })
    else if (section === 'Airports' && p[6] === '0' && /^[A-Z]{4}$/.test(p[0])) airportFir[p[0]] = p[5]
    else if (section === 'FIRs') {
      const boundary = p[3] || p[0]
      if (!firNames[boundary]) { firNames[boundary] = p[1]; firCallsign[boundary] = p[2] || p[0] }
    } else if (section === 'UIRs') uirs.push({ id: p[0], name: p[1], firs: (p[2] || '').split(',').filter(Boolean) })
  }

  const geo = JSON.parse(await source('Boundaries.geojson'))
  const firs = []
  const features = []
  for (const f of geo.features) {
    const p = f.properties
    const id = p.id
    const isSector = id.includes('-')
    const name = (firNames[id] || id).replace(/\s+-\s+.*$/, '').trim()
    firs.push({
      id, name, division: p.division, region: p.region, oceanic: p.oceanic === '1', sector: isSector,
      parent: isSector ? id.split('-')[0] : null, label: [round(Number(p.label_lon), 3), round(Number(p.label_lat), 3)],
    })
    features.push({ type: 'Feature', id, properties: {}, geometry: roundGeometry(f.geometry, 3) })
  }
  fs.writeFileSync(path.join(outDir, 'firs.json'), JSON.stringify({ type: 'FeatureCollection', features }))

  const divisions = Object.entries(
    firs.reduce((acc, f) => { if (f.division?.startsWith('VAT')) acc[f.division] = (acc[f.division] || 0) + 1; return acc }, {}),
  ).map(([id, count]) => ({ id, ru: DIVISION_NAMES[id]?.[0] || id, en: DIVISION_NAMES[id]?.[1] || id, firCount: count }))
    .sort((a, b) => b.firCount - a.firCount)

  fs.writeFileSync(path.join(outDir, 'vatsim.json'), JSON.stringify({ divisions, firs, countries, uirs, airportFir }))
  console.log(`vatsim.json: ${divisions.length} divisions, ${firs.length} FIR/sector boundaries, ${Object.keys(airportFir).length} airport→FIR`)
}

function buildFleet() {
  const fleet = []
  for (const src of ['vnws', 'rag']) {
    const file = path.join(root, 'backend', 'data', 'aircraft', `${src}.json`)
    if (!fs.existsSync(file)) continue
    for (const a of JSON.parse(fs.readFileSync(file, 'utf8'))) {
      if (a.is_hidden) continue
      fleet.push({
        va: src, reg: a.registration, type: a.fleet_code, model: a.name, fleet: a.fleet_name,
        kind: a.fleet_type, pax: a.passengers ?? null, image: a.image_url ?? null,
      })
    }
  }
  fs.writeFileSync(path.join(outDir, 'fleet.json'), JSON.stringify(fleet))
  console.log(`fleet.json: ${fleet.length} aircraft`)
}

function roundLines(geometry, d) {
  const line = (l) => {
    const out = []
    for (const [x, y] of l) {
      const p = [round(x, d), round(y, d)]
      const last = out[out.length - 1]
      if (!last || last[0] !== p[0] || last[1] !== p[1]) out.push(p)
    }
    return out
  }
  if (geometry.type === 'LineString') return { type: 'LineString', coordinates: line(geometry.coordinates) }
  return { type: 'MultiLineString', coordinates: geometry.coordinates.map(line) }
}

/** Rivers (10m, major only), lakes (50m) and big cities (with Russian names) for detailed tour maps. */
async function buildPhysical() {
  const rivers = JSON.parse(await source('rivers.geojson')).features
    .filter((f) => f.geometry && (f.properties.scalerank ?? 99) <= 6 && f.properties.featurecla !== 'Lake Centerline')
    .map((f) => ({ type: 'Feature', properties: { r: f.properties.scalerank }, geometry: roundLines(f.geometry, 2) }))
  const lakes = JSON.parse(await source('lakes.geojson')).features
    .filter((f) => f.geometry)
    .map((f) => ({ type: 'Feature', properties: { r: f.properties.scalerank }, geometry: roundGeometry(f.geometry, 2) }))
  fs.writeFileSync(path.join(outDir, 'physical.json'), JSON.stringify({ rivers, lakes }))
  const places = JSON.parse(await source('places.geojson')).features
    .filter((f) => (f.properties.POP_MAX ?? f.properties.pop_max ?? 0) >= 150000 || (f.properties.ADM0CAP ?? f.properties.adm0cap) === 1)
    .map((f) => { const p = f.properties; return [p.NAME ?? p.name, p.NAME_RU || p.name_ru || '', p.ISO_A2 ?? p.iso_a2, round(f.geometry.coordinates[0], 3), round(f.geometry.coordinates[1], 3), p.POP_MAX ?? p.pop_max, (p.ADM0CAP ?? p.adm0cap) ? 1 : 0] })
    .sort((a, b) => b[5] - a[5])
  fs.writeFileSync(path.join(outDir, 'places.json'), JSON.stringify(places))
  console.log(`physical.json: ${rivers.length} rivers, ${lakes.length} lakes; places.json: ${places.length} cities`)
  return places
}

/** Low-zoom Terrarium elevation tiles bundled for offline relief; higher zooms stream from AWS Open Data. */
async function buildTerrain() {
  const dir = path.join(root, 'public', 'terrain')
  let n = 0
  for (let z = 0; z <= 3; z++) {
    for (let x = 0; x < 2 ** z; x++) {
      for (let y = 0; y < 2 ** z; y++) {
        const file = path.join(dir, String(z), String(x), `${y}.png`)
        if (fs.existsSync(file)) { n++; continue }
        const res = await fetch(`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`)
        if (!res.ok) continue
        fs.mkdirSync(path.dirname(file), { recursive: true })
        fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()))
        n++
      }
    }
  }
  console.log(`terrain: ${n} tiles (z0–3)`)
}

fs.mkdirSync(outDir, { recursive: true })
PLACES = await buildPhysical()
await buildTerrain()
await buildAirports()
await buildVatsim()
buildFleet()

// Natural Earth 1:50m countries (land + borders), served as-is for the route maps.
fs.copyFileSync(path.join(root, 'node_modules', 'world-atlas', 'countries-50m.json'), path.join(outDir, 'countries-50m.json'))
console.log('countries-50m.json copied')
