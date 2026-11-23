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
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export function fmtShort(s) {
  const d = parseISO(s);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}
export function fmtRange(a, b) {
  const da = parseISO(a), db = parseISO(b);
  const sameYear = da.getUTCFullYear() === db.getUTCFullYear();
  if (da.getUTCMonth() === db.getUTCMonth() && sameYear) {
    return `${MONTHS_LONG[da.getUTCMonth()]} ${da.getUTCDate()}–${db.getUTCDate()}, ${db.getUTCFullYear()}`;
  }
  return `${fmtShort(a)}${sameYear ? '' : ', ' + da.getUTCFullYear()} – ${fmtShort(b)}, ${db.getUTCFullYear()}`;
}
export function weekdayLetter(s) {
  return 'SMTWTFS'[parseISO(s).getUTCDay()];
}
