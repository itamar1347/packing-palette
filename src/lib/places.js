// Location autocomplete (Open-Meteo geocoding), always shown as "City, Country".
const GEO = 'https://geocoding-api.open-meteo.com/v1/search';

// Places that are not towns but are real trip destinations. The example trip is a safari, so Kruger is here.
const LANDMARKS = [
  { id: 'kruger', name: 'Kruger National Park', country: 'South Africa', countryCode: 'ZA', admin1: 'Mpumalanga', lat: -23.988, lon: 31.554, timezone: 'Africa/Johannesburg', wiki: 'Kruger National Park', keywords: ['kruger', 'safari', 'skukuza'] },
  { id: 'serengeti', name: 'Serengeti National Park', country: 'Tanzania', countryCode: 'TZ', admin1: 'Mara', lat: -2.333, lon: 34.833, timezone: 'Africa/Dar_es_Salaam', wiki: 'Serengeti National Park', keywords: ['serengeti', 'safari'] },
  { id: 'masai-mara', name: 'Maasai Mara', country: 'Kenya', countryCode: 'KE', admin1: 'Narok', lat: -1.49, lon: 35.144, timezone: 'Africa/Nairobi', wiki: 'Maasai Mara', keywords: ['maasai', 'masai', 'mara', 'safari'] },
  { id: 'banff', name: 'Banff National Park', country: 'Canada', countryCode: 'CA', admin1: 'Alberta', lat: 51.497, lon: -115.926, timezone: 'America/Edmonton', wiki: 'Banff National Park', keywords: ['banff'] },
  { id: 'yosemite', name: 'Yosemite National Park', country: 'United States', countryCode: 'US', admin1: 'California', lat: 37.865, lon: -119.538, timezone: 'America/Los_Angeles', wiki: 'Yosemite National Park', keywords: ['yosemite'] },
  { id: 'torres', name: 'Torres del Paine', country: 'Chile', countryCode: 'CL', admin1: 'Magallanes', lat: -50.942, lon: -73.407, timezone: 'America/Punta_Arenas', wiki: 'Torres del Paine National Park', keywords: ['torres', 'paine', 'patagonia'] },
];

function landmarkMatches(q) {
  const s = q.trim().toLowerCase();
  if (s.length < 3) return [];
  return LANDMARKS.filter(l => l.keywords.some(k => k.startsWith(s) || s.startsWith(k)) || l.name.toLowerCase().includes(s))
    .map(l => ({ ...l, label: `${l.name}, ${l.country}`, detail: l.admin1 + ' · national park', population: 0 }));
}

export const EXAMPLE_PLACE = { ...LANDMARKS[0], label: 'Kruger National Park, South Africa', detail: 'Mpumalanga · national park', population: 0 };

export async function searchPlaces(q, signal) {
  const s = q.trim();
  if (s.length < 2) return [];
  const local = landmarkMatches(s);
  const r = await fetch(`${GEO}?name=${encodeURIComponent(s)}&count=8&language=en&format=json`, { signal });
  if (!r.ok) throw new Error('The place search is not answering right now.');
  const j = await r.json();
  const seen = new Set(local.map(p => p.label));
  const found = [];
  for (const p of j.results || []) {
    if (!p.country || /^AIR/.test(p.feature_code || '')) continue;
    const label = `${p.name}, ${p.country}`;
    const item = {
      id: String(p.id), name: p.name, country: p.country, countryCode: p.country_code, admin1: p.admin1 || '',
      lat: p.latitude, lon: p.longitude, timezone: p.timezone, population: p.population || 0,
      label, detail: [p.admin1, p.population ? `pop. ${fmtPop(p.population)}` : ''].filter(Boolean).join(' · '),
    };
    // Several towns can share a name inside one country; keep the biggest and show its region.
    if (seen.has(label)) continue;
    seen.add(label);
    found.push(item);
  }
  return [...local, ...found].slice(0, 8);
}

function fmtPop(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M';
  if (n >= 1e3) return Math.round(n / 1e3) + 'k';
  return String(n);
}

export function fmtCoords(lat, lon) {
  const a = `${Math.abs(lat).toFixed(2)}°${lat < 0 ? 'S' : 'N'}`;
  const b = `${Math.abs(lon).toFixed(2)}°${lon < 0 ? 'W' : 'E'}`;
  return `${a} ${b}`;
}

/** A three-letter code for the pass, built from the place name the way station codes are. */
export function placeCode(name) {
  const clean = name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z ]/g, '').toUpperCase();
  const words = clean.split(/\s+/).filter(w => w && !['THE', 'OF', 'NATIONAL', 'PARK', 'DE', 'DEL', 'LA', 'LE'].includes(w));
  const w = words[0] || clean.replace(/\s/g, '') || 'XXX';
  if (words.length >= 3) return words[0][0] + words[1][0] + words[2][0];
  const code = w[0] + w.slice(1).replace(/[AEIOU]/g, '');
  return (code.length >= 3 ? code : w).slice(0, 3).padEnd(3, 'X');
}
