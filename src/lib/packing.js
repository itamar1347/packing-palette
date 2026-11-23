// The packing list: quantities from trip length, weather and the chosen activities.

export const ACTIVITIES = [
  { id: 'safari', label: 'Safari' },
  { id: 'beach', label: 'Beach & swimming' },
  { id: 'hiking', label: 'Hiking' },
  { id: 'city', label: 'City walking' },
  { id: 'dining', label: 'Nice dinners' },
  { id: 'business', label: 'Work meetings' },
  { id: 'snow', label: 'Snow sports' },
  { id: 'photo', label: 'Photography' },
  { id: 'fitness', label: 'Running & gym' },
];

// Plug types by country (IEC letters), for the adapter line.
const PLUGS = {
  ZA: 'M, N, C', US: 'A, B', CA: 'A, B', MX: 'A, B', GB: 'G', IE: 'G', MT: 'G', CY: 'G', HK: 'G', SG: 'G', MY: 'G', AE: 'G', QA: 'G', KE: 'G', TZ: 'D, G', UG: 'G',
  FR: 'C, E', BE: 'C, E', DE: 'C, F', AT: 'C, F', NL: 'C, F', ES: 'C, F', PT: 'C, F', SE: 'C, F', NO: 'C, F', FI: 'C, F', IS: 'C, F', GR: 'C, F', PL: 'C, E',
  CZ: 'C, E', HU: 'C, F', HR: 'C, F', RO: 'C, F', TR: 'C, F', RU: 'C, F', KR: 'C, F', ID: 'C, F', IT: 'C, F, L', CH: 'C, J', DK: 'C, E, F, K', IL: 'C, H',
  JP: 'A, B', TW: 'A, B', TH: 'A, B, C, O', VN: 'A, C', PH: 'A, B, C', CN: 'A, C, I', IN: 'C, D, M', LK: 'D, G', NP: 'C, D, M', AU: 'I', NZ: 'I', FJ: 'I',
  AR: 'C, I', BR: 'C, N', CL: 'C, L', PE: 'A, C', CO: 'A, B', CR: 'A, B', CU: 'A, B, C', EC: 'A, B', EG: 'C, F', MA: 'C, E', TN: 'C, E', JO: 'B, C, D, F, G, J',
  SA: 'A, B, G', NA: 'D, M', BW: 'D, G, M', ZW: 'D, G', ZM: 'C, D, G', MU: 'C, G', MV: 'C, D, G, J, K, L', SC: 'G', IR: 'C, F',
};
export function plugTypes(code) {
  return PLUGS[(code || '').toUpperCase()] || null;
}

const ceil = Math.ceil;

/**
 * @param trip {nights, activities: string[], countryCode}
 * @param w weather summary or null when the weather could not load
 */
export function buildPackingList(trip, w) {
  const nights = Math.max(0, trip.nights);
  const days = nights + 1;
  const n = Math.min(days, 7); // plan one laundry stop on longer trips
  const act = new Set(trip.activities);
  const hi = w ? w.avgHi : 22, lo = w ? w.avgLo : 12, peak = w ? w.peakHi : 26, cold = w ? w.coldLo : 8;
  const wet = w ? w.wetDays : 0, snow = act.has('snow') || (w && w.snowDays > 0), windy = w && w.maxWind >= 40;
  const hot = hi >= 25, warm = hi >= 20, chilly = lo < 12, freezing = cold < 2;
  const laundry = days > 7 ? 'one laundry stop' : null;

  const groups = [];
  const g = (title, items) => { const list = items.filter(Boolean); if (list.length) groups.push({ title, items: list }); };
  const it = (name, qty, note) => ({ id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name, qty, note });

  g('Clothing', [
    it('Underwear', Math.min(days + 1, 8), laundry ? `One per day plus a spare, with ${laundry}` : 'One per day plus a spare'),
    it('Socks', Math.max(1, Math.min(days + 1, 8) - (act.has('hiking') ? 2 : 0)), act.has('hiking') ? 'Everyday pairs; hiking socks are listed below' : 'One pair per day plus a spare'),
    it(hot ? 'Breathable T-shirts' : 'T-shirts or tops', hot ? n : warm ? ceil(n * 0.8) : ceil(n * 0.6), hot ? 'Daytime highs reach ' + Math.round(peak) + '°C' : 'Rewear between washes'),
    chilly && it('Long-sleeve tops', ceil(n / 3) + 1, `Nights drop to about ${Math.round(lo)}°C`),
    act.has('safari') && it('Neutral long-sleeve shirt', 2, 'Khaki, olive or sand. Covers arms at dawn and against insects'),
    hi >= 22 && !act.has('business') && it('Shorts or skirts', ceil(n / 2), 'For the warm middle of the day'),
    it(act.has('safari') ? 'Neutral trousers (khaki, olive)' : 'Trousers or jeans', hi < 22 || chilly ? Math.max(2, ceil(n / 3)) : 1, act.has('safari') ? 'Avoid bright colors, dark blue and black on game drives' : null),
    it('Sleepwear', days > 4 ? 2 : 1, null),
  ]);

  g('Layers & weather', [
    lo < 16 && it(freezing ? 'Warm fleece or wool sweater' : 'Fleece or sweater', lo < 6 ? 2 : 1, act.has('safari') ? 'Early game drives in open vehicles are cold' : `Evenings around ${Math.round(lo)}°C`),
    cold < 8 && it(freezing ? 'Insulated down jacket' : 'Warm jacket', 1, `Coldest nights near ${Math.round(cold)}°C`),
    freezing && it('Thermal base layers', 2, 'Top and bottom sets'),
    (wet >= 2 || (w && w.kinds.rain)) && it('Waterproof rain jacket', 1, w ? `About ${wet} wet day${wet === 1 ? '' : 's'} expected` : null),
    wet >= 3 && act.has('city') && it('Compact umbrella', 1, null),
    windy && !snow && it('Windproof shell', 1, `Gusts up to ${w.maxWind} km/h`),
    cold < 5 && it('Beanie', 1, null),
    cold < 5 && it('Gloves', 1, act.has('safari') ? 'For dawn drives' : null),
    lo < 8 && it('Scarf or neck gaiter', 1, null),
    (peak >= 20 || act.has('safari') || act.has('beach') || act.has('hiking')) && it(act.has('safari') || act.has('hiking') ? 'Wide-brim sun hat' : 'Sun hat or cap', 1, null),
    it('Sunglasses', 1, null),
  ]);

  g('Footwear', [
    it(act.has('city') ? 'Broken-in walking shoes' : 'Comfortable walking shoes', 1, 'Wear them on travel day'),
    (hot || act.has('beach')) && it('Sandals or flip-flops', 1, null),
    act.has('hiking') && it('Hiking boots', 1, 'Broken in before the trip'),
    act.has('safari') && !act.has('hiking') && it('Closed lightweight boots', 1, 'For walking safaris and dusty camps'),
    (snow || wet >= Math.max(3, days / 2)) && !act.has('hiking') && it('Waterproof boots', 1, null),
    (act.has('business') || act.has('dining')) && it('Smart shoes', 1, null),
    act.has('fitness') && it('Running shoes', 1, null),
  ]);

  const actItems = [];
  if (act.has('safari')) actItems.push(
    it('Binoculars', 1, '8×42 or 10×42'), it('Headlamp', 1, 'Camps are dark after sunset'), it('Dust-proof bag for camera or phone', 1, null),
    it('Insect repellent (DEET or picaridin)', 1, null), it('Reusable water bottle', 1, null));
  if (act.has('beach')) actItems.push(
    it('Swimwear', 2, 'One can dry while you wear the other'), it('Beach cover-up', 1, null), it('Quick-dry beach towel', 1, null), it('Waterproof phone pouch', 1, null));
  if (act.has('hiking')) actItems.push(
    it('Hiking socks', 3, 'Merino or synthetic'), it('Daypack (20–30 L)', 1, null), it('Water bottles or 2 L bladder', 2, null), it('Quick-dry hiking tops', 2, null), it('Blister plasters', 1, null));
  if (act.has('city')) actItems.push(it('Crossbody day bag', 1, 'Zips closed against pickpockets'), it('Power bank', 1, 'Maps drain the battery'));
  if (act.has('dining')) actItems.push(it('Evening outfit', Math.min(3, Math.max(1, ceil(nights / 4))), null));
  if (act.has('business')) actItems.push(
    it('Blazer', 1, null), it('Dress shirts or blouses', Math.min(n, 5), null), it('Dress trousers or skirt', 2, null), it('Laptop and charger', 1, null));
  if (act.has('snow')) actItems.push(
    it('Ski jacket and pants', 1, null), it('Ski socks', Math.min(days, 5), 'One pair per ski day'), it('Goggles', 1, null), it('Waterproof ski gloves', 1, null), it('Neck gaiter', 1, null));
  if (act.has('photo')) actItems.push(
    it('Camera and lenses', 1, act.has('safari') ? 'A long lens (300 mm or more) for wildlife' : null), it('Spare batteries', 2, null), it('Memory cards', 2, null), it('Lens cloth', 1, null));
  if (act.has('fitness')) actItems.push(it('Workout sets', Math.min(ceil(n / 2), 4), null));
  g('For your activities', actItems);

  g('Toiletries & health', [
    it('Toothbrush and toothpaste', 1, null),
    it('Deodorant', 1, null),
    it('Travel-size toiletries', 1, 'Liquids under 100 ml in carry-on'),
    (peak >= 18 || act.has('beach') || act.has('safari') || snow) && it('Sunscreen SPF 50', Math.max(1, ceil(days / 7)), 'About one 100 ml tube per week outdoors'),
    it('Lip balm with SPF', 1, null),
    (lo < 10 || act.has('safari')) && it('Rich moisturizer', 1, 'Dry air'),
    it('Prescription medication', 1, `Enough for ${days + 3} days`),
    it('Basic first-aid kit', 1, 'Plasters, painkillers, rehydration salts'),
    (hot && !act.has('safari')) && it('Insect repellent', 1, null),
  ]);

  const plug = plugTypes(trip.countryCode);
  g('Documents & tech', [
    it('Passport', 1, 'Valid six months past your return'),
    it('Travel insurance details', 1, null),
    it('Cards and some local cash', 1, null),
    it('Phone and charger', 1, null),
    it('Travel adapter', 1, plug ? `Plug type ${plug}` : 'Check the local plug type'),
  ]);

  return groups;
}
