// Calendar dates as 'YYYY-MM-DD' strings, handled in UTC so time zones never shift a day.
export function toISO(d) {
  return d.toISOString().slice(0, 10);
}
export function parseISO(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
export function todayISO() {
  const n = new Date();
  return toISO(new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())));
}
export function addDays(s, n) {
  const d = parseISO(s);
  d.setUTCDate(d.getUTCDate() + n);
  return toISO(d);
}
export function diffDays(a, b) {
  return Math.round((parseISO(b) - parseISO(a)) / 864e5);
}
/** Shift a date back by whole years, moving Feb 29 to Feb 28. */
export function shiftYears(s, years) {
  const [y, m, d] = s.split('-').map(Number);
  const ny = y - years;
  const leap = (ny % 4 === 0 && ny % 100 !== 0) || ny % 400 === 0;
  const day = m === 2 && d === 29 && !leap ? 28 : d;
  return `${ny}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
/** Next occurrence of a month/day on or after today (used for the July 16-31 example). */
export function nextOccurrence(month, day) {
  const t = todayISO();
  const y = Number(t.slice(0, 4));
  const cand = `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return cand >= t ? cand : `${y + 1}-${cand.slice(5)}`;
}

/** Keep a number run ("26°", "16–31") left-to-right inside Hebrew text. */
export const ltr = s => '⁦' + s + '⁩';

export const MONTHS_HE = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
const DAYS_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

/** "16 ביולי" */
export function fmtShort(s) {
  const d = parseISO(s);
  return `${d.getUTCDate()} ב${MONTHS_HE[d.getUTCMonth()]}`;
}
/** "16–31 ביולי 2027" or "28 בדצמבר 2026 – 4 בינואר 2027" */
export function fmtRange(a, b) {
  const da = parseISO(a), db = parseISO(b);
  const sameYear = da.getUTCFullYear() === db.getUTCFullYear();
  if (da.getUTCMonth() === db.getUTCMonth() && sameYear) {
    return `${ltr(`${da.getUTCDate()}–${db.getUTCDate()}`)} ב${MONTHS_HE[da.getUTCMonth()]} ${db.getUTCFullYear()}`;
  }
  return `${fmtShort(a)}${sameYear ? '' : ' ' + da.getUTCFullYear()} – ${fmtShort(b)} ${db.getUTCFullYear()}`;
}
/** "יום שלישי, 24 בנובמבר" */
export function fmtDayLong(s) {
  return `יום ${DAYS_HE[parseISO(s).getUTCDay()]}, ${fmtShort(s)}`;
}
export function weekdayLetter(s) {
  return 'אבגדהוש'[parseISO(s).getUTCDay()];
}
