import { useEffect, useMemo, useRef, useState } from 'react';
import LocationField from './components/LocationField.jsx';
import Pass from './components/Pass.jsx';
import PackingList from './components/PackingList.jsx';
import SongOfTheDay from './components/SongOfTheDay.jsx';
import { EXAMPLE_PLACE, searchPlaces, withEnglishName } from './lib/places.js';
import { getTripWeather } from './lib/weather.js';
import { getPlaceImages } from './lib/images.js';
import { loadImage, extractPalette, accentFrom } from './lib/palette.js';
import { ACTIVITIES, buildPackingList } from './lib/packing.js';
import { addDays, diffDays, nextOccurrence, ltr } from './lib/dates.js';

const MAX_NIGHTS = 45;
const exampleStart = nextOccurrence(7, 16);
const EXAMPLE = { place: EXAMPLE_PLACE, start: exampleStart, end: addDays(exampleStart, 15), activities: ['safari', 'photo'] };

function makeTrip(f) {
  return {
    place: f.place, start: f.start, end: f.end, nights: diffDays(f.start, f.end),
    activities: f.activities, activityLabels: ACTIVITIES.filter(a => f.activities.includes(a.id)).map(a => a.label),
  };
}

// Kept in this browser only: the last trip she planned, and what she has already packed for each trip.
const TRIP_KEY = 'pp-trip-v1';
const PACKED_KEY = 'pp-packed-v1';
function load(key, fallback) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } }
function save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode: lasts for this visit */ } }
const tripId = t => `${t.place.id}|${t.start}|${t.end}`;
const isDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
function savedTrip() {
  const t = load(TRIP_KEY, null);
  if (!t || !t.place || typeof t.place.lat !== 'number' || !t.place.label || !isDate(t.start) || !isDate(t.end) || t.end < t.start) return null;
  return { place: t.place, start: t.start, end: t.end, activities: Array.isArray(t.activities) ? t.activities.filter(a => ACTIVITIES.some(x => x.id === a)) : [] };
}
function packedFor(t) { const all = load(PACKED_KEY, {}); return new Set(Array.isArray(all[tripId(t)]) ? all[tripId(t)] : []); }
function savePacked(t, set) {
  const all = load(PACKED_KEY, {});
  delete all[tripId(t)];
  all[tripId(t)] = [...set];
  const keys = Object.keys(all);
  keys.slice(0, Math.max(0, keys.length - 8)).forEach(k => delete all[k]); // keep the 8 most recent trips
  save(PACKED_KEY, all);
}

const START = savedTrip() || EXAMPLE;
const RESTORED = START !== EXAMPLE;

export default function App() {
  const [form, setForm] = useState({ query: START.place.label, place: START.place, start: START.start, end: START.end, activities: START.activities });
  const [errors, setErrors] = useState({});
  const [trip, setTrip] = useState(() => makeTrip(START));
  const [weather, setWeather] = useState({ status: 'loading' });
  const [images, setImages] = useState({ status: 'loading', list: [] });
  const [index, setIndex] = useState(0);
  const [palettes, setPalettes] = useState({});
  const [packed, setPacked] = useState(() => packedFor(START));
  const [busy, setBusy] = useState(false);
  const run = useRef(0);

  // Fetch weather and photographs whenever the trip changes.
  useEffect(() => {
    const id = ++run.current;
    const ctrl = new AbortController();
    setWeather({ status: 'loading' });
    setImages({ status: 'loading', list: [] });
    setIndex(0);
    getTripWeather(trip.place, trip.start, trip.end, ctrl.signal)
      .then(data => id === run.current && setWeather({ status: 'ok', data }))
      .catch(e => id === run.current && e.name !== 'AbortError' && setWeather({ status: 'error', error: e.message || 'מזג האוויר לא נטען.' }));
    withEnglishName(trip.place, ctrl.signal)
      .then(place => getPlaceImages(place, ctrl.signal))
      .then(r => id === run.current && setImages({ status: 'ok', list: r.images }))
      .catch(e => id === run.current && e.name !== 'AbortError' && setImages({ status: 'error', list: [] }));
    return () => ctrl.abort();
  }, [trip]);

  // Read a palette from each photograph once it is known.
  useEffect(() => {
    images.list.forEach(img => {
      if (img.src in palettes) return;
      setPalettes(p => ({ ...p, [img.src]: undefined }));
      loadImage(img.src)
        .then(el => extractPalette(el, 4))
        .then(pal => setPalettes(p => ({ ...p, [img.src]: pal })))
        .catch(() => setPalettes(p => ({ ...p, [img.src]: null })));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.list]);

  const current = images.list[index];
  const palette = current ? palettes[current.src] : null;
  const accent = useMemo(() => accentFrom(palette) || '#8E3B5F', [palette]);
  useEffect(() => { document.documentElement.style.setProperty('--accent', accent); }, [accent]);

  const groups = useMemo(() => buildPackingList(
    { nights: trip.nights, activities: trip.activities, countryCode: trip.place.countryCode },
    weather.status === 'ok' ? weather.data : null,
  ), [trip, weather]);

  const dirty = form.place !== trip.place || form.start !== trip.start || form.end !== trip.end || form.activities.join() !== trip.activities.join() || form.query !== trip.place.label;

  const submit = async e => {
    e.preventDefault();
    const errs = {};
    let place = form.place && form.query === form.place.label ? form.place : null;
    if (!place && form.query.trim().length >= 2) {
      setBusy(true);
      try { place = (await searchPlaces(form.query))[0] || null; } catch { place = null; }
      setBusy(false);
      if (place) setForm(f => ({ ...f, place, query: place.label }));
    }
    if (!place) errs.dest = form.query.trim() ? 'בחרי מקום מהרשימה שנפתחת, בפורמט עיר, מדינה.' : 'לאן נוסעים? כתבי עיר או מדינה.';
    if (!form.start || !form.end) errs.dates = 'בחרי את שני התאריכים.';
    else if (form.end < form.start) errs.dates = 'תאריך החזרה יוצא לפני תאריך היציאה.';
    else if (diffDays(form.start, form.end) > MAX_NIGHTS) errs.dates = `האתר עובד הכי טוב עד ${MAX_NIGHTS} לילות. אפשר לחלק טיול ארוך לכמה חלקים.`;
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const next = makeTrip({ ...form, place });
    setPacked(packedFor(next));
    setTrip(next);
    save(TRIP_KEY, { place, start: form.start, end: form.end, activities: form.activities });
    requestAnimationFrame(() => document.getElementById('pass-dest')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' }));
  };

  const toggleAct = id => setForm(f => ({ ...f, activities: f.activities.includes(id) ? f.activities.filter(a => a !== id) : [...f.activities, id] }));
  const togglePacked = key => setPacked(s => {
    const n = new Set(s);
    if (n.has(key)) n.delete(key); else n.add(key);
    savePacked(trip, n);
    return n;
  });

  const w = weather.status === 'ok' ? weather.data : null;
  const weatherNote = w
    ? `מותאם לימים של ${ltr(Math.round(w.avgHi) + '°')}, לילות של ${ltr(Math.round(w.avgLo) + '°')}${w.wetDays === 0 ? ' ובלי גשם' : w.wetDays === 1 ? ' ויום גשום אחד' : ` ו-${w.wetDays} ימים גשומים`}.`
    : weather.status === 'loading' ? 'מזג האוויר עוד נטען.' : 'לפי מזג אוויר נעים, עד שהנתונים ייטענו.';

  return (
    <>
      <header className="masthead">
        <div className="wrap mast">
          <p className="mast-name">פלטת <em>אריזה</em></p>
          <p className="mast-deck">מדריך קטן לכל טיול של מיכל: מזג האוויר, הצבעים של המקום, ומה לשים במזוודה.</p>
        </div>
      </header>

      <main className="wrap">
        <SongOfTheDay />

        <form className="slip" onSubmit={submit} noValidate aria-label="פרטי הטיול">
          <p className="slip-title">לאן הפעם?</p>
          {RESTORED && <p className="slip-saved">הטיול האחרון שלך והפריטים שכבר ארזת נשמרו במכשיר הזה.</p>}
          <LocationField
            query={form.query} place={form.place} error={errors.dest}
            onQuery={q => setForm(f => ({ ...f, query: q, place: null }))}
            onPick={p => setForm(f => ({ ...f, place: p, query: p.label }))}
          />
          <div className="field field-date">
            <label htmlFor="start">יציאה</label>
            <input id="start" type="date" value={form.start}
              onChange={e => setForm(f => ({ ...f, start: e.target.value, end: f.end && e.target.value && f.end < e.target.value ? e.target.value : f.end }))}
              aria-invalid={errors.dates ? 'true' : undefined} aria-describedby={errors.dates ? 'date-err' : undefined} />
          </div>
          <div className="field field-date">
            <label htmlFor="end">חזרה</label>
            <input id="end" type="date" value={form.end} min={form.start || undefined}
              onChange={e => setForm(f => ({ ...f, end: e.target.value }))}
              aria-invalid={errors.dates ? 'true' : undefined} aria-describedby={errors.dates ? 'date-err' : undefined} />
          </div>
          {errors.dates && <p className="field-err field-err-dates" id="date-err">{errors.dates}</p>}
          <fieldset className="field field-acts">
            <legend>מה מתכננים לעשות? <span>לא חובה</span></legend>
            <div className="chips">
              {ACTIVITIES.map(a => (
                <label key={a.id} className={`chip${form.activities.includes(a.id) ? ' is-on' : ''}`}>
                  <input type="checkbox" checked={form.activities.includes(a.id)} onChange={() => toggleAct(a.id)} />
                  <span>{a.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="slip-go">
            <button type="submit" className="go" disabled={busy}>{busy ? 'מחפשת את המקום…' : dirty ? 'בואי נארוז לטיול הזה' : 'רענון הטיול'}</button>
            {dirty && <span className="slip-note">השינויים יופיעו אחרי הלחיצה.</span>}
          </div>
        </form>

        <Pass trip={trip} weather={weather} images={images} index={index} setIndex={setIndex} palette={palette} />

        <PackingList groups={groups} packed={packed} toggle={togglePacked} trip={trip} weatherNote={weatherNote} />
      </main>

      <footer className="wrap foot">
        <p>מזג האוויר מ-Open-Meteo: תחזית אם הטיול ב-16 הימים הקרובים, ואחרת מה שהיה באותם תאריכים בשנים האחרונות. התמונות מוויקיפדיה ומוויקימדיה, עם קרדיט מתחת לכל תמונה. הפלטה נקראת מהתמונה עצמה. השירים וקטעי ההאזנה מ-iTunes.</p>
      </footer>
    </>
  );
}
