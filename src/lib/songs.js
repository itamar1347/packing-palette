// Song of the day for Michal: The Weeknd songs chosen for her, one per day, each with a short reason.
// Ids are iTunes track ids (verified), used to fetch the cover art and a 30-second preview.
import { todayISO, parseISO } from './dates.js';

export const SONGS = [
  { id: 1499378607, title: 'Blinding Lights', why: 'הקלאסיקה. בוקר שמתחיל ככה לא יכול להיות רע.' },
  { id: 1505683980, title: 'Save Your Tears', why: 'לשיר בקול רם בדרך, גם אם כולם שומעים.' },
  { id: 1550878097, title: 'Starboy', why: 'שיר עם ביטחון עצמי, ליום שבו את הכוכבת.' },
  { id: 1550878095, title: 'I Feel It Coming', why: 'רך ושמח, כמו ההתרגשות שלפני טיול.' },
  { id: 1677006158, title: 'Die For You', why: 'הכי רומנטי ברשימה. במיוחד בשבילך.' },
  { id: 1440858500, title: "Can't Feel My Face", why: 'אי אפשר להקשיב בלי לזוז, לפחות עם הכתפיים.' },
  { id: 1550878101, title: 'The Hills', why: 'קצת דרמה זה בריא לפעמים.' },
  { id: 1550878106, title: 'Earned It', why: 'כי מגיע לך. פשוט ככה.' },
  { id: 1440858507, title: 'In the Night', why: 'קצב של שנות השמונים ואנרגיה של ערב בחוץ.' },
  { id: 1550878103, title: 'Call Out My Name', why: 'לשקט של אחרי יום ארוך.' },
  { id: 1550878100, title: 'Often', why: 'וייב לילי ואיטי, לנסיעה בלי יעד.' },
  { id: 1550878110, title: 'Wicked Games', why: 'מהימים הראשונים שלו. חובה לכל מעריצה.' },
  { id: 1550877899, title: 'In Your Eyes', why: 'הסקסופון בסוף שווה את כל השיר.' },
  { id: 1499378615, title: 'After Hours', why: 'שש דקות של אווירה. לאוזניות ולחלון.' },
  { id: 1499386253, title: 'Heartless', why: 'קצבי ובועט, לבוקר שצריך בו קצת אש.' },
  { id: 1499386246, title: 'Scared To Live', why: 'שיר עדין על להעז. מתאים ליום חדש.' },
  { id: 1505683874, title: 'Alone Again', why: 'פתיחה קולנועית ליום שמתחיל לאט.' },
  { id: 1505683877, title: 'Hardest To Love', why: 'תופים מהירים ומילים רכות. שילוב מושלם.' },
  { id: 1499386254, title: 'Faith', why: 'לנסיעה ארוכה בלילה.' },
  { id: 1505683880, title: 'Snowchild', why: 'שיר רגוע שמספר את כל הסיפור שלו.' },
  { id: 1603164239, title: 'Take My Breath', why: 'דיסקו מודרני. כולם לרחבה.' },
  { id: 1603164243, title: 'Sacrifice', why: 'גרוב שמכניס כוח לכל הליכה.' },
  { id: 1603171870, title: 'Out of Time', why: 'השיר הכי חלומי באלבום Dawn FM.' },
  { id: 1603171970, title: 'Less Than Zero', why: 'קליל ואופטימי, מתאים ליום עם שמש.' },
  { id: 1603171893, title: 'Is There Someone Else?', why: 'שקט ומתוק, לערב רגוע.' },
  { id: 1603171529, title: 'Gasoline', why: 'אנרגיה של שנות השמונים, לדרך לאימון.' },
  { id: 1630221411, title: 'Moth To A Flame', why: 'עם Swedish House Mafia. מושלם לערב בחוץ.' },
  { id: 1677005501, title: 'Party Monster', why: 'לסוף השבוע. אין מה להוסיף.' },
  { id: 1677005645, title: 'Reminder', why: 'תזכורת קטנה כמה הוא טוב.' },
  { id: 1677005654, title: 'Secrets', why: 'גרוב של שנות השמונים, אי אפשר לשבת במקום.' },
  { id: 1550878098, title: 'Pray For Me', why: 'עם Kendrick Lamar. אפי ומלא עוצמה.' },
  { id: 1767418043, title: 'Dancing In The Flames', why: 'מהתקופה החדשה שלו. סינתים ונוסטלגיה.' },
  { id: 1793702839, title: 'São Paulo', why: 'עם Anitta. קצב ברזילאי שכיף לזוז אליו.' },
  { id: 1793702853, title: 'Timeless', why: 'עם Playboi Carti, לרגע שצריך אנרגיה.' },
  { id: 1657890074, title: "Creepin'", why: 'עם Metro Boomin. גרוב שנתקע בראש.' },
  { id: 1727173441, title: 'Popular', why: 'עם Madonna. כי את פופולרית.' },
  { id: 1720045966, title: 'One Of The Girls', why: 'עם JENNIE. אחד השירים הכי יפים שלו.' },
  { id: 1793702597, title: 'Cry For Me', why: 'מהאלבום האחרון. רגשי ויפה.' },
  { id: 1691967279, title: 'Double Fantasy', why: 'עם Future. אווירה של לילה בעיר.' },
  { id: 1550878111, title: 'The Morning', why: 'מהמיקסטייפ הראשון. לבוקר עצלן.' },
];

// A fixed shuffled order, so every song comes up once before any repeats.
function seededOrder(n, seed) {
  const order = Array.from({ length: n }, (_, i) => i);
  let s = seed >>> 0;
  const rnd = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  return order;
}
const ORDER = seededOrder(SONGS.length, 20260716);

export function songForDate(dateISO) {
  const day = Math.floor(parseISO(dateISO) / 864e5);
  return SONGS[ORDER[day % SONGS.length]];
}

const KEY = d => `pp-song-${d}`;
export function savedChoice(dateISO = todayISO()) {
  try { const v = localStorage.getItem(KEY(dateISO)); return v ? SONGS.find(s => String(s.id) === v) || null : null; } catch { return null; }
}
export function saveChoice(song, dateISO = todayISO()) {
  try { if (song) localStorage.setItem(KEY(dateISO), String(song.id)); else localStorage.removeItem(KEY(dateISO)); } catch { /* private mode: the choice lasts for this visit only */ }
}

const cache = new Map();
/** Cover art, album, year, preview and store link from iTunes. */
export async function songDetails(song, signal) {
  if (cache.has(song.id)) return cache.get(song.id);
  const r = await fetch(`https://itunes.apple.com/lookup?id=${song.id}&country=US`, { signal });
  if (!r.ok) throw new Error('לא הצלחתי לטעון את פרטי השיר.');
  const j = await r.json();
  const t = j.results && j.results[0];
  if (!t) throw new Error('השיר לא נמצא.');
  const info = {
    title: t.trackName, artist: t.artistName, album: t.collectionName.replace(/ \(Deluxe\)$/, ''), year: (t.releaseDate || '').slice(0, 4),
    art: (t.artworkUrl100 || '').replace('100x100bb', '600x600bb'), preview: t.previewUrl, apple: t.trackViewUrl,
  };
  cache.set(song.id, info);
  return info;
}

export function searchLinks(song) {
  const q = encodeURIComponent(`The Weeknd ${song.title}`);
  return {
    spotify: `https://open.spotify.com/search/${q}`,
    youtube: `https://www.youtube.com/results?search_query=${q}`,
  };
}
