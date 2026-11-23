import { useEffect, useMemo, useRef, useState } from 'react';
import LocationField from './components/LocationField.jsx';
import Pass from './components/Pass.jsx';
import PackingList from './components/PackingList.jsx';
import { EXAMPLE_PLACE, searchPlaces } from './lib/places.js';
import { getTripWeather } from './lib/weather.js';
import { getPlaceImages } from './lib/images.js';
import { loadImage, extractPalette, accentFrom } from './lib/palette.js';
import { ACTIVITIES, buildPackingList } from './lib/packing.js';
import { addDays, diffDays, nextOccurrence } from './lib/dates.js';

const MAX_NIGHTS = 45;
const exampleStart = nextOccurrence(7, 16);
const EXAMPLE = { place: EXAMPLE_PLACE, start: exampleStart, end: addDays(exampleStart, 15), activities: ['safari', 'photo'] };

function makeTrip(f) {
  return {
    place: f.place, start: f.start, end: f.end, nights: diffDays(f.start, f.end),
    activities: f.activities, activityLabels: ACTIVITIES.filter(a => f.activities.includes(a.id)).map(a => a.label),
  };
}

export default function App() {
  const [form, setForm] = useState({ query: EXAMPLE.place.label, place: EXAMPLE.place, start: EXAMPLE.start, end: EXAMPLE.end, activities: EXAMPLE.activities });
  const [errors, setErrors] = useState({});
  const [trip, setTrip] = useState(() => makeTrip(EXAMPLE));
  const [weather, setWeather] = useState({ status: 'loading' });
  const [images, setImages] = useState({ status: 'loading', list: [] });
  const [index, setIndex] = useState(0);
  const [palettes, setPalettes] = useState({});
  const [packed, setPacked] = useState(() => new Set());
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
      .catch(e => id === run.current && e.name !== 'AbortError' && setWeather({ status: 'error', error: e.message || 'The weather did not load.' }));
    getPlaceImages(trip.place, ctrl.signal)
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
  const accent = useMemo(() => accentFrom(palette) || '#4E5A34', [palette]);
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
    if (!place) errs.dest = form.query.trim() ? 'Pick a place from the suggestions, written as City, Country.' : 'Enter where you are going.';
    if (!form.start || !form.end) errs.dates = 'Choose both travel dates.';
    else if (form.end < form.start) errs.dates = 'The return date comes before the departure date.';
    else if (diffDays(form.start, form.end) > MAX_NIGHTS) errs.dates = `Trips up to ${MAX_NIGHTS} nights work best here. Split a longer trip into legs.`;
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setPacked(new Set());
    setTrip(makeTrip({ ...form, place }));
    requestAnimationFrame(() => document.getElementById('pass-dest')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' }));
  };

  const toggleAct = id => setForm(f => ({ ...f, activities: f.activities.includes(id) ? f.activities.filter(a => a !== id) : [...f.activities, id] }));
  const togglePacked = key => setPacked(s => { const n = new Set(s); if (n.has(key)) n.delete(key); else n.add(key); return n; });

  const w = weather.status === 'ok' ? weather.data : null;
  const weatherNote = w ? `Sized for ${Math.round(w.avgHi)}°C days, ${Math.round(w.avgLo)}°C nights and ${w.wetDays} wet day${w.wetDays === 1 ? '' : 's'}.` : weather.status === 'loading' ? 'Weather still loading.' : 'Using mild-weather defaults.';

  return (
    <>
      <header className="masthead">
        <div className="wrap mast">
          <p className="mast-name">Packing Palette</p>
          <p className="mast-deck">A field guide for one trip: its weather, its colors, and what to bring.</p>
        </div>
      </header>

      <main className="wrap">
        <form className="slip" onSubmit={submit} noValidate aria-label="Trip details">
          <LocationField
            query={form.query} place={form.place} error={errors.dest}
            onQuery={q => setForm(f => ({ ...f, query: q, place: null }))}
            onPick={p => setForm(f => ({ ...f, place: p, query: p.label }))}
          />
          <div className="field field-date">
            <label htmlFor="start">Depart</label>
            <input id="start" type="date" value={form.start}
              onChange={e => setForm(f => ({ ...f, start: e.target.value, end: f.end && e.target.value && f.end < e.target.value ? e.target.value : f.end }))}
              aria-invalid={errors.dates ? 'true' : undefined} aria-describedby={errors.dates ? 'date-err' : undefined} />
          </div>
          <div className="field field-date">
            <label htmlFor="end">Return</label>
            <input id="end" type="date" value={form.end} min={form.start || undefined}
              onChange={e => setForm(f => ({ ...f, end: e.target.value }))}
              aria-invalid={errors.dates ? 'true' : undefined} aria-describedby={errors.dates ? 'date-err' : undefined} />
          </div>
          {errors.dates && <p className="field-err field-err-dates" id="date-err">{errors.dates}</p>}
          <fieldset className="field field-acts">
            <legend>Activities <span>optional</span></legend>
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
            <button type="submit" className="go" disabled={busy}>{busy ? 'Finding the place…' : dirty ? 'Pack for this trip' : 'Refresh this trip'}</button>
            {dirty && <span className="slip-note">Changes apply when you press the button.</span>}
          </div>
        </form>

        <Pass trip={trip} weather={weather} images={images} index={index} setIndex={setIndex} palette={palette} />

        <PackingList groups={groups} packed={packed} toggle={togglePacked} trip={trip} weatherNote={weatherNote} />
      </main>

      <footer className="wrap foot">
        <p>Weather from Open-Meteo (forecast within 16 days, otherwise the same dates in recent years). Photographs from Wikipedia and Wikimedia Commons, credited on each plate. Palettes are read from the photograph itself.</p>
      </footer>
    </>
  );
}
