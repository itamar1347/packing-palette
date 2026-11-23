import { useState } from 'react';
import { fmtCoords, placeCode } from '../lib/places.js';
import { fmtRange, fmtShort, weekdayLetter } from '../lib/dates.js';
import { toF } from '../lib/weather.js';
import { plugTypes } from '../lib/packing.js';
import { luminance } from '../lib/palette.js';

const ROMAN = ['I', 'II', 'III'];

function Plate({ images, index, setIndex, status, place, palette }) {
  const img = images[index];
  if (status === 'loading') {
    return <div className="plate plate-empty"><p>Finding photographs of {place.name}…</p></div>;
  }
  if (!img) {
    return (
      <div className="plate plate-empty">
        <p>{status === 'error' ? 'Wikimedia did not answer, so there are no photographs this time.' : `No usable photographs of ${place.name} turned up.`}</p>
      </div>
    );
  }
  return (
    <figure className="plate">
      <div className="plate-frame">
        <img key={img.src} src={img.src} crossOrigin="anonymous" alt={img.caption} />
        {palette === undefined && <span className="plate-reading">Reading colors…</span>}
      </div>
      <figcaption>
        <span className="plate-cap">{img.caption}</span>
        <a className="plate-credit" href={img.page} target="_blank" rel="noopener noreferrer">
          {img.artist} · {img.license} · Wikimedia Commons
        </a>
      </figcaption>
      {images.length > 1 && (
        <div className="plate-nav">
          <button type="button" onClick={() => setIndex((index + images.length - 1) % images.length)} aria-label="Previous photograph and palette">
            <span aria-hidden="true">←</span>
          </button>
          <span className="plate-count" aria-live="polite">Plate {ROMAN[index]} <span>of {ROMAN[images.length - 1]}</span></span>
          <button type="button" onClick={() => setIndex((index + 1) % images.length)} aria-label="Next photograph and palette">
            <span aria-hidden="true">→</span>
          </button>
        </div>
      )}
    </figure>
  );
}

function Swatches({ palette }) {
  const [copied, setCopied] = useState(null);
  if (palette === undefined) return <ol className="swatches swatches-wait" aria-label="Palette loading">{[0, 1, 2, 3].map(i => <li key={i}><span className="sw-chip" /></li>)}</ol>;
  if (!palette) return <p className="swatches-none">This photograph does not allow its colors to be read.</p>;
  const copy = async hex => {
    try { await navigator.clipboard.writeText(hex); setCopied(hex); setTimeout(() => setCopied(null), 1400); } catch { setCopied(null); }
  };
  return (
    <ol className="swatches" aria-label="Destination palette">
      {palette.map(c => {
        const dark = luminance(c.rgb) < 0.3;
        return (
          <li key={c.hex} style={{ '--sw': c.hex, '--sw-ink': dark ? '#FBF8F1' : '#201D18', flexGrow: Math.max(0.6, c.share * 4) }}>
            <button type="button" className="sw-chip" onClick={() => copy(c.hex)} aria-label={`${c.name} ${c.hex}, copy hex code`}>
              <span className="sw-copy" aria-hidden="true">{copied === c.hex ? 'Copied' : 'Copy'}</span>
            </button>
            <span className="sw-name">{c.name}</span>
            <span className="sw-hex">{c.hex}</span>
          </li>
        );
      })}
    </ol>
  );
}

function DayChart({ days }) {
  const his = days.map(d => d.hi).filter(v => v != null), los = days.map(d => d.lo).filter(v => v != null);
  if (!his.length) return null;
  const top = Math.ceil(Math.max(...his) / 5) * 5, bottom = Math.floor(Math.min(...los) / 5) * 5;
  const span = Math.max(5, top - bottom);
  const y = t => ((t - bottom) / span) * 100;
  return (
    <figure className="days" aria-label={`Daily highs and lows from ${fmtShort(days[0].date)} to ${fmtShort(days[days.length - 1].date)}`}>
      <div className="days-axis" aria-hidden="true"><span>{top}°</span><span>{bottom}°</span></div>
      <div className="days-bars">
        {days.map(d => (
          <div className="day" key={d.date} title={`${fmtShort(d.date)}: ${Math.round(d.lo)}° to ${Math.round(d.hi)}°C${d.wetShare >= 0.5 ? ', likely wet' : ''}`}>
            <div className="day-track">
              <span className="day-bar" style={{ bottom: `${y(d.lo)}%`, height: `${Math.max(2, y(d.hi) - y(d.lo))}%` }} />
            </div>
            <span className={`day-wet${d.wetShare >= 0.5 ? ' is-wet' : ''}`} aria-hidden="true" />
            {days.length <= 16 && <span className="day-l" aria-hidden="true">{weekdayLetter(d.date)}</span>}
          </div>
        ))}
      </div>
      <figcaption className="days-foot" aria-hidden="true">
        <span>{fmtShort(days[0].date)}</span><span>{fmtShort(days[days.length - 1].date)}</span>
      </figcaption>
    </figure>
  );
}

function Weather({ weather }) {
  if (weather.status === 'loading') return <div className="wx wx-wait"><p>Reading the weather records…</p></div>;
  if (weather.status === 'error') return <div className="wx wx-wait"><p>{weather.error} The list below assumes mild weather until it loads.</p></div>;
  const w = weather.data;
  const basis = w.mode === 'forecast'
    ? 'Live forecast for your dates.'
    : `Typical for these dates: what fell on the same days in ${w.years.join(', ')}.`;
  return (
    <div className="wx">
      <p className="wx-head">{w.headline}</p>
      <dl className="wx-stats">
        <div><dt>Avg high</dt><dd>{Math.round(w.avgHi)}°<small>{toF(w.avgHi)}°F</small></dd></div>
        <div><dt>Avg low</dt><dd>{Math.round(w.avgLo)}°<small>{toF(w.avgLo)}°F</small></dd></div>
        <div><dt>Wet days</dt><dd>{w.wetDays}<small>of {w.days.length}</small></dd></div>
        <div><dt>Coldest</dt><dd>{Math.round(w.coldLo)}°<small>{toF(w.coldLo)}°F</small></dd></div>
      </dl>
      <DayChart days={w.days} />
      <p className="wx-basis">Each bar runs from the night low to the day high; a blue dot marks a wet day. {basis}</p>
    </div>
  );
}

export default function Pass({ trip, weather, images, index, setIndex, palette }) {
  const p = trip.place;
  const code = placeCode(p.name);
  const no = trip.start.slice(5).replace('-', '') + '·' + code;
  const plug = plugTypes(p.countryCode);
  const month = new Date(trip.start + 'T00:00:00Z').toLocaleString('en', { month: 'short', timeZone: 'UTC' }).toUpperCase();
  return (
    <article className="pass" aria-labelledby="pass-dest">
      <div className="pass-main">
        <Plate images={images.list} index={index} setIndex={setIndex} status={images.status} place={p} palette={palette} />
        <Swatches palette={images.list.length ? palette : null} />
      </div>
      <div className="perf" aria-hidden="true" />
      <aside className="stub">
        <div className="stub-top">
          <p className="stub-no">Pass No. {no}</p>
          <div className="stamp" aria-hidden="true"><b>{code}</b><span>{month} {trip.start.slice(0, 4)}</span></div>
        </div>
        <h2 id="pass-dest" className="dest">{p.name}</h2>
        <p className="dest-sub">{p.country} · {fmtCoords(p.lat, p.lon)}</p>
        <dl className="facts">
          <div><dt>Dates</dt><dd>{fmtRange(trip.start, trip.end)}</dd></div>
          <div><dt>Length</dt><dd>{trip.nights} night{trip.nights === 1 ? '' : 's'}</dd></div>
          <div><dt>Plug</dt><dd>{plug ? `Type ${plug}` : 'Check locally'}</dd></div>
          <div><dt>Plans</dt><dd>{trip.activityLabels.length ? trip.activityLabels.join(', ') : 'Nothing set'}</dd></div>
        </dl>
        <Weather weather={weather} />
      </aside>
    </article>
  );
}
