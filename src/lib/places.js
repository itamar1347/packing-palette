// Destination search (Open-Meteo geocoding) shown in Hebrew as "עיר, מדינה".
// Photographs are looked up by the English name, fetched once a place is chosen.
const GEO = 'https://geocoding-api.open-meteo.com/v1';

// Real trip destinations that are not towns. The example trip is a safari, so Kruger is first.
const LANDMARKS = [
  { id: 'kruger', name: 'פארק קרוגר', country: 'דרום אפריקה', nameEn: 'Kruger National Park', countryEn: 'South Africa', countryCode: 'ZA', admin1: 'מפומלנגה', lat: -23.988, lon: 31.554, wiki: 'Kruger National Park', keywords: ['kruger', 'safari', 'skukuza', 'קרוגר', 'ספארי'] },
  { id: 'serengeti', name: 'הסרנגטי', country: 'טנזניה', nameEn: 'Serengeti National Park', countryEn: 'Tanzania', countryCode: 'TZ', admin1: 'מארה', lat: -2.333, lon: 34.833, wiki: 'Serengeti National Park', keywords: ['serengeti', 'safari', 'סרנגטי', 'ספארי'] },
  { id: 'masai-mara', name: 'מסאי מארה', country: 'קניה', nameEn: 'Maasai Mara', countryEn: 'Kenya', countryCode: 'KE', admin1: 'נארוק', lat: -1.49, lon: 35.144, wiki: 'Maasai Mara', keywords: ['maasai', 'masai', 'mara', 'מסאי', 'ספארי'] },
  { id: 'banff', name: 'הפארק הלאומי באנף', country: 'קנדה', nameEn: 'Banff National Park', countryEn: 'Canada', countryCode: 'CA', admin1: 'אלברטה', lat: 51.497, lon: -115.926, wiki: 'Banff National Park', keywords: ['banff', 'באנף'] },
  { id: 'yosemite', name: 'יוסמיטי', country: 'ארצות הברית', nameEn: 'Yosemite National Park', countryEn: 'United States', countryCode: 'US', admin1: 'קליפורניה', lat: 37.865, lon: -119.538, wiki: 'Yosemite National Park', keywords: ['yosemite', 'יוסמיטי'] },
  { id: 'torres', name: 'טורס דל פיינה', country: "צ'ילה", nameEn: 'Torres del Paine', countryEn: 'Chile', countryCode: 'CL', admin1: 'מגאלנס', lat: -50.942, lon: -73.407, wiki: 'Torres del Paine National Park', keywords: ['torres', 'paine', 'patagonia', 'טורס', 'פטגוניה'] },
];

function landmarkMatches(q) {
  const s = q.trim().toLowerCase();
  if (s.length < 3) return [];
  return LANDMARKS.filter(l => l.keywords.some(k => k.startsWith(s) || s.startsWith(k)) || l.name.includes(s) || l.nameEn.toLowerCase().includes(s))
    .map(l => ({ ...l, label: `${l.name}, ${l.country}`, detail: `${l.admin1} · פארק לאומי` }));
}

export const EXAMPLE_PLACE = { ...LANDMARKS[0], label: 'פארק קרוגר, דרום אפריקה', detail: 'מפומלנגה · פארק לאומי' };

function fmtPop(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + ' מיליון';
  if (n >= 1e3) return Math.round(n / 1e3) + ' אלף';
  return String(n);
}

export async function searchPlaces(q, signal) {
  const s = q.trim();
  if (s.length < 2) return [];
  const local = landmarkMatches(s);
  const r = await fetch(`${GEO}/search?name=${encodeURIComponent(s)}&count=8&language=he&format=json`, { signal });
  if (!r.ok) throw new Error('החיפוש לא עונה כרגע.');
  const j = await r.json();
  const seen = new Set(local.map(p => p.label));
  const found = [];
  for (const p of j.results || []) {
    if (!p.country || /^AIR/.test(p.feature_code || '')) continue;
    const label = `${p.name}, ${p.country}`;
    if (seen.has(label)) continue; // several towns share a name: keep the biggest
    seen.add(label);
    found.push({
      id: String(p.id), name: p.name, country: p.country, countryCode: p.country_code, admin1: p.admin1 || '',
      lat: p.latitude, lon: p.longitude, label,
      detail: [p.admin1, p.population ? `${fmtPop(p.population)} תושבים` : ''].filter(Boolean).join(' · '),
    });
  }
  return [...local, ...found].slice(0, 8);
}

/** English name and country for the photo search (Wikipedia works best in English). */
export async function withEnglishName(place, signal) {
  if (place.nameEn) return place;
  try {
    const r = await fetch(`${GEO}/get?id=${encodeURIComponent(place.id)}&language=en`, { signal });
    const j = await r.json();
    return { ...place, nameEn: j.name || place.name, countryEn: j.country || '', admin1En: j.admin1 || '' };
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    return { ...place, nameEn: place.name, countryEn: '' };
  }
}

export function fmtCoords(lat, lon) {
  const a = `${Math.abs(lat).toFixed(2)}°${lat < 0 ? 'S' : 'N'}`;
  const b = `${Math.abs(lon).toFixed(2)}°${lon < 0 ? 'W' : 'E'}`;
  return `${a} ${b}`;
}

/** A three-letter code for the pass, built from the English name the way station codes are. */
export function placeCode(name) {
  const clean = name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z ]/g, '').toUpperCase();
  const words = clean.split(/\s+/).filter(w => w && !['THE', 'OF', 'NATIONAL', 'PARK', 'DE', 'DEL', 'LA', 'LE'].includes(w));
  const w = words[0] || clean.replace(/\s/g, '') || 'XXX';
  if (words.length >= 3) return words[0][0] + words[1][0] + words[2][0];
  const code = w[0] + w.slice(1).replace(/[AEIOU]/g, '');
  return (code.length >= 3 ? code : w).slice(0, 3).padEnd(3, 'X');
}
