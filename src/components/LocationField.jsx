import { useEffect, useRef, useState } from 'react';
import { searchPlaces } from '../lib/places.js';

/** Destination input with "City, Country" suggestions. The parent owns {query, place}. */
export default function LocationField({ query, place, onQuery, onPick, error }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [status, setStatus] = useState('idle');
  const timer = useRef(0);
  const ctrl = useRef(null);
  const typed = useRef(false);

  useEffect(() => {
    if (!typed.current) return undefined;
    clearTimeout(timer.current);
    if (query.trim().length < 2) { setItems([]); setStatus('idle'); return undefined; }
    timer.current = setTimeout(async () => {
      if (ctrl.current) ctrl.current.abort();
      ctrl.current = new AbortController();
      setStatus('loading');
      try {
        const res = await searchPlaces(query, ctrl.current.signal);
        setItems(res); setActive(res.length ? 0 : -1); setStatus(res.length ? 'ok' : 'empty'); setOpen(true);
      } catch (e) {
        if (e.name !== 'AbortError') { setItems([]); setStatus('error'); setOpen(true); }
      }
    }, 220);
    return () => clearTimeout(timer.current);
  }, [query]);

  const pick = p => { typed.current = false; onPick(p); setOpen(false); setItems([]); setActive(-1); };

  const onKey = e => {
    if (e.key === 'ArrowDown' && items.length) { e.preventDefault(); setOpen(true); setActive(a => (a + 1) % items.length); }
    else if (e.key === 'ArrowUp' && items.length) { e.preventDefault(); setActive(a => (a <= 0 ? items.length - 1 : a - 1)); }
    else if (e.key === 'Enter' && open && items[active]) { e.preventDefault(); pick(items[active]); }
    else if (e.key === 'Escape') setOpen(false);
  };

  const showList = open && (items.length > 0 || status === 'empty' || status === 'error');
  return (
    <div className="field field-dest">
      <label htmlFor="dest">לאן?</label>
      <div className="combo">
        <input
          id="dest" type="text" autoComplete="off" spellCheck="false" placeholder="עיר, מדינה"
          role="combobox" aria-autocomplete="list" aria-expanded={showList} aria-controls="dest-list"
          aria-activedescendant={showList && active >= 0 ? `dest-opt-${active}` : undefined}
          aria-invalid={error ? 'true' : undefined} aria-describedby={error ? 'dest-err' : undefined}
          value={query}
          onChange={e => { typed.current = true; onQuery(e.target.value); }}
          onKeyDown={onKey}
          onFocus={() => items.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 160)}
        />
        {status === 'loading' && <span className="combo-hint" aria-hidden="true">מחפשת…</span>}
        {place && !typed.current && <span className="combo-ok" aria-hidden="true">✓</span>}
        {showList && (
          <ul className="combo-list" id="dest-list" role="listbox" aria-label="מקומות מתאימים">
            {items.map((p, i) => (
              <li
                key={p.id} id={`dest-opt-${i}`} role="option" aria-selected={i === active}
                className={i === active ? 'is-active' : ''}
                onMouseDown={e => { e.preventDefault(); pick(p); }}
                onMouseEnter={() => setActive(i)}
              >
                <span className="opt-name">{p.label}</span>
                {p.detail && <span className="opt-detail">{p.detail}</span>}
              </li>
            ))}
            {status === 'empty' && <li className="combo-note" role="presentation">לא מצאתי מקום בשם הזה. נסי לכתוב אחרת, או באנגלית.</li>}
            {status === 'error' && <li className="combo-note" role="presentation">החיפוש לא עונה כרגע. נסי שוב בעוד רגע.</li>}
          </ul>
        )}
      </div>
      {error && <p className="field-err" id="dest-err">{error}</p>}
    </div>
  );
}
