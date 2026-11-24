// The packing list: quantities from trip length, weather and the chosen activities.
import { ltr } from './dates.js';

export const ACTIVITIES = [
  { id: 'safari', label: 'ספארי' },
  { id: 'beach', label: 'חוף ושחייה' },
  { id: 'hiking', label: 'טיולים רגליים' },
  { id: 'city', label: 'הליכה בעיר' },
  { id: 'dining', label: 'ארוחות ערב שוות' },
  { id: 'business', label: 'פגישות עבודה' },
  { id: 'snow', label: 'סקי ושלג' },
  { id: 'photo', label: 'צילום' },
  { id: 'fitness', label: 'ריצה וחדר כושר' },
];

// Plug types by country (IEC letters), for the adapter line.
const PLUGS = {
  ZA: 'M, N, C', US: 'A, B', CA: 'A, B', MX: 'A, B', GB: 'G', IE: 'G', MT: 'G', CY: 'G', HK: 'G', SG: 'G', MY: 'G', AE: 'G', QA: 'G', KE: 'G', TZ: 'D, G', UG: 'G',
  FR: 'C, E', BE: 'C, E', DE: 'C, F', AT: 'C, F', NL: 'C, F', ES: 'C, F', PT: 'C, F', SE: 'C, F', NO: 'C, F', FI: 'C, F', IS: 'C, F', GR: 'C, F', PL: 'C, E',
  CZ: 'C, E', HU: 'C, F', HR: 'C, F', RO: 'C, F', TR: 'C, F', RU: 'C, F', KR: 'C, F', ID: 'C, F', IT: 'C, F, L', CH: 'C, J', DK: 'C, E, F, K', IL: 'C, H',
  JP: 'A, B', TW: 'A, B', TH: 'A, B, C, O', VN: 'A, C', PH: 'A, B, C', CN: 'A, C, I', IN: 'C, D, M', LK: 'D, G', NP: 'C, D, M', AU: 'I', NZ: 'I', FJ: 'I',
  AR: 'C, I', BR: 'C, N', CL: 'C, L', PE: 'A, C', CO: 'A, B', CR: 'A, B', CU: 'A, B, C', EC: 'A, B', EG: 'C, F', MA: 'C, E', TN: 'C, E', JO: 'B, C, D, F, G, J',
  SA: 'A, B, G', NA: 'D, M', BW: 'D, G, M', ZW: 'D, G', ZM: 'C, D, G', MU: 'C, G', MV: 'C, D, G, J, K, L', SC: 'G', IR: 'C, F', GE: 'C, F',
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
  const laundry = days > 7;
  const deg = t => ltr(`${Math.round(t)}°`);

  const groups = [];
  const g = (title, items) => { const list = items.filter(Boolean); if (list.length) groups.push({ title, items: list }); };
  const it = (name, qty, note) => ({ id: name, name, qty, note });

  g('בגדים', [
    it('תחתונים', Math.min(days + 1, 8), laundry ? 'אחד לכל יום ועוד אחד, עם כביסה אחת באמצע' : 'אחד לכל יום ועוד אחד'),
    it('גרביים', Math.max(1, Math.min(days + 1, 8) - (act.has('hiking') ? 2 : 0)), act.has('hiking') ? 'זוגות ליום-יום. גרבי הליכה ברשימה למטה' : 'זוג לכל יום ועוד זוג'),
    it(hot ? 'חולצות טי מאווררות' : 'חולצות טי וגופיות', hot ? n : warm ? ceil(n * 0.8) : ceil(n * 0.6), hot ? `בצהריים מגיע ל-${deg(peak)}` : 'אפשר ללבוש פעמיים בין כביסות'),
    chilly && it('חולצות עם שרוול ארוך', ceil(n / 3) + 1, `בלילה יורד לבערך ${deg(lo)}`),
    act.has('safari') && it('חולצה ארוכה בצבע ניטרלי', 2, 'חאקי, זית או חול. מכסה ידיים בבוקר וגם מפני חרקים'),
    hi >= 22 && !act.has('business') && it('מכנסיים קצרים או חצאיות', ceil(n / 2), 'לשעות החמות של היום'),
    it(act.has('safari') ? 'מכנסיים ארוכים בחאקי או זית' : 'מכנסיים ארוכים או ג׳ינס', hi < 22 || chilly ? Math.max(2, ceil(n / 3)) : 1, act.has('safari') ? 'בלי צבעים בוהקים, כחול כהה או שחור בנסיעות השטח' : null),
    it('פיג׳מה', days > 4 ? 2 : 1, null),
  ]);

  g('שכבות ומזג אוויר', [
    lo < 16 && it(freezing ? 'סוודר צמר או פליז חם' : 'פליז או סוודר', lo < 6 ? 2 : 1, act.has('safari') ? 'נסיעות השטח של הבוקר בג׳יפ פתוח קרות' : `ערבים של בערך ${deg(lo)}`),
    cold < 8 && it(freezing ? 'מעיל פוך' : 'מעיל חם', 1, `הלילות הכי קרים: בערך ${deg(cold)}`),
    freezing && it('ביגוד תרמי', 2, 'סט עליון ותחתון'),
    (wet >= 2 || (w && w.kinds.rain)) && it('מעיל גשם', 1, w ? `צפויים בערך ${wet} ימים גשומים` : null),
    wet >= 3 && act.has('city') && it('מטרייה מתקפלת', 1, null),
    windy && !snow && it('מעיל רוח', 1, `משבים עד ${w.maxWind} קמ״ש`),
    cold < 5 && it('כובע צמר', 1, null),
    cold < 5 && it('כפפות', 1, act.has('safari') ? 'לנסיעות של הזריחה' : null),
    lo < 8 && it('צעיף או חם צוואר', 1, null),
    (peak >= 20 || act.has('safari') || act.has('beach') || act.has('hiking')) && it(act.has('safari') || act.has('hiking') ? 'כובע שמש רחב שוליים' : 'כובע שמש', 1, null),
    it('משקפי שמש', 1, null),
  ]);

  g('נעליים', [
    it(act.has('city') ? 'נעלי הליכה נוחות ומוכרות' : 'נעליים נוחות להליכה', 1, 'כדאי לנעול אותן ביום הטיסה'),
    (hot || act.has('beach')) && it('סנדלים או כפכפים', 1, null),
    act.has('hiking') && it('נעלי הליכה', 1, 'רכות ומוכרות לרגל לפני הטיול'),
    act.has('safari') && !act.has('hiking') && it('נעליים סגורות וקלות', 1, 'לסיורים רגליים ולמחנות מאובקים'),
    (snow || wet >= Math.max(3, days / 2)) && !act.has('hiking') && it('מגפיים עמידים למים', 1, null),
    (act.has('business') || act.has('dining')) && it('נעליים אלגנטיות', 1, null),
    act.has('fitness') && it('נעלי ריצה', 1, null),
  ]);

  const actItems = [];
  if (act.has('safari')) actItems.push(
    it('משקפת', 1, '8×42 או 10×42'), it('פנס ראש', 1, 'במחנות חשוך אחרי השקיעה'), it('שקית אטומה לאבק למצלמה או לטלפון', 1, null),
    it('דוחה יתושים', 1, 'עם DEET או איקרידין'), it('בקבוק מים רב-פעמי', 1, null));
  if (act.has('beach')) actItems.push(
    it('בגד ים', 2, 'אחד מתייבש בזמן שלובשים את השני'), it('כיסוי לחוף', 1, null), it('מגבת חוף שמתייבשת מהר', 1, null), it('כיס אטום למים לטלפון', 1, null));
  if (act.has('hiking')) actItems.push(
    it('גרבי הליכה', 3, 'מרינו או סינתטי'), it('תיק יום (20–30 ליטר)', 1, null), it('בקבוקי מים או שלוקר של 2 ליטר', 2, null), it('חולצות ספורט שמתייבשות מהר', 2, null), it('פלסטרים לשלפוחיות', 1, null));
  if (act.has('city')) actItems.push(it('תיק צד שנסגר ברוכסן', 1, 'נגד כייסים'), it('מטען נייד', 1, 'מפות מרוקנות את הסוללה'));
  if (act.has('dining')) actItems.push(it('בגד ערב', Math.min(3, Math.max(1, ceil(nights / 4))), null));
  if (act.has('business')) actItems.push(
    it('בלייזר', 1, null), it('חולצות מכופתרות', Math.min(n, 5), null), it('מכנסיים או חצאית מחויטים', 2, null), it('מחשב נייד ומטען', 1, null));
  if (act.has('snow')) actItems.push(
    it('מעיל ומכנסי סקי', 1, null), it('גרבי סקי', Math.min(days, 5), 'זוג לכל יום סקי'), it('משקפי סקי', 1, null), it('כפפות סקי עמידות למים', 1, null), it('חם צוואר', 1, null));
  if (act.has('photo')) actItems.push(
    it('מצלמה ועדשות', 1, act.has('safari') ? 'עדשה ארוכה (300 מ״מ ומעלה) לבעלי חיים' : null), it('סוללות רזרביות', 2, null), it('כרטיסי זיכרון', 2, null), it('מטלית לעדשה', 1, null));
  if (act.has('fitness')) actItems.push(it('סטים לאימון', Math.min(ceil(n / 2), 4), null));
  g('לפעילויות שלך', actItems);

  g('טיפוח ובריאות', [
    it('מברשת ומשחת שיניים', 1, null),
    it('דאודורנט', 1, null),
    it('תכשירי טיפוח בגודל נסיעות', 1, 'נוזלים עד 100 מ״ל בתיק היד'),
    (peak >= 18 || act.has('beach') || act.has('safari') || snow) && it('קרם הגנה SPF 50', Math.max(1, ceil(days / 7)), 'בערך שפופרת של 100 מ״ל לכל שבוע בחוץ'),
    it('שפתון עם הגנה', 1, null),
    (lo < 10 || act.has('safari')) && it('קרם לחות עשיר', 1, 'האוויר יבש'),
    it('תרופות קבועות', 1, `מספיק ל-${days + 3} ימים`),
    it('ערכת עזרה ראשונה קטנה', 1, 'פלסטרים, משככי כאבים, תמיסת מלחים'),
    (hot && !act.has('safari')) && it('דוחה יתושים', 1, null),
  ]);

  const plug = plugTypes(trip.countryCode);
  g('מסמכים וטכנולוגיה', [
    it('דרכון', 1, 'בתוקף לפחות חצי שנה אחרי החזרה'),
    it('פרטי ביטוח נסיעות', 1, null),
    it('כרטיסי אשראי וקצת מזומן מקומי', 1, null),
    it('טלפון ומטען', 1, null),
    it('מתאם לשקע', 1, plug ? `שקע מסוג ${plug}` : 'כדאי לבדוק את סוג השקע המקומי'),
  ]);

  return groups;
}
