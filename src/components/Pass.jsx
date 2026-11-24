import { useState } from 'react';
import { fmtCoords, placeCode } from '../lib/places.js';
import { fmtRange, fmtShort, weekdayLetter, MONTHS_HE, parseISO, ltr } from '../lib/dates.js';
import { toF } from '../lib/weather.js';
import { plugTypes } from '../lib/packing.js';
import { luminance } from '../lib/palette.js';

const NUMS = ['אחת', 'שתיים', 'שלוש'];

function Plate({ images, index, setIndex, status, place, palette }) {
  const img = images[index];
  if (status === 'loading') {
    return <div className="plate plate-empty"><p>מחפשת תמונות של {place.name}…</p></div>;
  }
  if (!img) {
    return (
      <div className="plate plate-empty">
        <p>{status === 'error' ? 'ויקימדיה לא ענתה הפעם, אז אין תמונות. נסי שוב עוד מעט.' : `לא מצאתי תמונות טובות של ${place.name}.`}</p>
      </div>
    );
  }
  return (
    <figure className="plate">
      <div className="plate-frame">
        <img key={img.src} src={img.src} crossOrigin="anonymous" alt={img.caption} />
        {palette === undefined && <span className="plate-reading">קוראת את הצבעים…</span>}
      </div>
      <figcaption>
        <span className="plate-cap" dir="auto">{img.caption}</span>
        <a className="plate-credit" href={img.page} target="_blank" rel="noopener noreferrer" dir="ltr">
          {img.artist}{img.license ? ` · ${img.license}` : ''} · Wikimedia Commons
        </a>
      </figcaption>
      {images.length > 1 && (
        <div className="plate-nav">
          <button type="button" onClick={() => setIndex((index + images.length - 1) % images.length)} aria-label="התמונה והפלטה הקודמות">
            <span aria-hidden="true">→</span>
          </button>
          <span className="plate-count" aria-live="polite">תמונה {NUMS[index]} <span>מתוך {NUMS[images.length - 1]}</span></span>
          <button type="button" onClick={() => setIndex((index + 1) % images.length)} aria-label="התמונה והפלטה הבאות">
            <span aria-hidden="true">←</span>
          </button>
        </div>
      )}
    </figure>
  );
}

function Swatches({ palette }) {
  const [copied, setCopied] = useState(null);
  if (palette === undefined) return <ol className="swatches swatches-wait" aria-label="הפלטה נטענת">{[0, 1, 2, 3].map(i => <li key={i}><span className="sw-chip" /></li>)}</ol>;
  if (!palette) return <p className="swatches-none">אי אפשר לקרוא את הצבעים של התמונה הזאת.</p>;
  const copy = async hex => {
    try { await navigator.clipboard.writeText(hex); setCopied(hex); setTimeout(() => setCopied(null), 1400); } catch { setCopied(null); }
  };
  return (
    <ol className="swatches" aria-label="פלטת הצבעים של היעד">
      {palette.map(c => {
        const dark = luminance(c.rgb) < 0.3;
        return (
          <li key={c.hex} style={{ '--sw': c.hex, '--sw-ink': dark ? '#FFF9F7' : '#3A1C2B' }}>
            <button type="button" className="sw-chip" onClick={() => copy(c.hex)} aria-label={`${c.name} ${c.hex}, העתקת קוד הצבע`}>
              <span className="sw-copy" aria-hidden="true">{copied === c.hex ? 'הועתק' : 'העתקה'}</span>
            </button>
            <span className="sw-name">{c.name}</span>
            <span className="sw-hex" dir="ltr">{c.hex}</span>
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
    <figure className="days" aria-label={`טמפרטורות יומיות מ-${fmtShort(days[0].date)} עד ${fmtShort(days[days.length - 1].date)}`}>
      <div className="days-axis" aria-hidden="true"><span dir="ltr">{top}°</span><span dir="ltr">{bottom}°</span></div>
      <div className="days-bars">
        {days.map(d => (
          <div className="day" key={d.date} title={`${fmtShort(d.date)}: ${ltr(Math.round(d.lo) + '°')} עד ${ltr(Math.round(d.hi) + '°')}${d.wetShare >= 0.5 ? ', כנראה גשום' : ''}`}>
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
  if (weather.status === 'loading') return <div className="wx wx-wait"><p>קוראת את נתוני מזג האוויר…</p></div>;
  if (weather.status === 'error') return <div className="wx wx-wait"><p>{weather.error} עד שזה ייטען, הרשימה למטה מניחה מזג אוויר נעים.</p></div>;
  const w = weather.data;
  const basis = w.mode === 'forecast'
    ? 'תחזית חיה לתאריכים שלך.'
    : `מה שהיה בפועל באותם תאריכים בשנים ${w.years.join(', ')}.`;
  return (
    <div className="wx">
      <p className="wx-head">{w.headline}</p>
      <dl className="wx-stats">
        <div><dt>חום ממוצע</dt><dd><span dir="ltr">{Math.round(w.avgHi)}°</span><small dir="ltr">{toF(w.avgHi)}°F</small></dd></div>
        <div><dt>קור ממוצע</dt><dd><span dir="ltr">{Math.round(w.avgLo)}°</span><small dir="ltr">{toF(w.avgLo)}°F</small></dd></div>
        <div><dt>ימי גשם</dt><dd><span>{w.wetDays}</span><small>מתוך {w.days.length}</small></dd></div>
        <div><dt>הכי קר</dt><dd><span dir="ltr">{Math.round(w.coldLo)}°</span><small dir="ltr">{toF(w.coldLo)}°F</small></dd></div>
      </dl>
      <DayChart days={w.days} />
      <p className="wx-basis">כל עמודה היא יום, מהקור של הלילה ועד החום של היום. נקודה כחולה מסמנת יום גשום. {basis}</p>
    </div>
  );
}

export default function Pass({ trip, weather, images, index, setIndex, palette }) {
  const p = trip.place;
  const code = placeCode(p.nameEn || p.name);
  const no = trip.start.slice(5).replace('-', '') + '·' + code;
  const plug = plugTypes(p.countryCode);
  const d0 = parseISO(trip.start);
  return (
    <article className="pass" aria-labelledby="pass-dest">
      <div className="pass-main">
        <Plate images={images.list} index={index} setIndex={setIndex} status={images.status} place={p} palette={palette} />
        <Swatches palette={images.list.length ? palette : null} />
      </div>
      <div className="perf" aria-hidden="true" />
      <aside className="stub">
        <div className="stub-top">
          <p className="stub-no">כרטיס מס׳ <span dir="ltr">{no}</span></p>
          <div className="stamp" aria-hidden="true"><b dir="ltr">{code}</b><span>{MONTHS_HE[d0.getUTCMonth()]} {d0.getUTCFullYear()}</span></div>
        </div>
        <h2 id="pass-dest" className="dest">{p.name}</h2>
        <p className="dest-sub">{p.country} · <span dir="ltr">{fmtCoords(p.lat, p.lon)}</span></p>
        <dl className="facts">
          <div><dt>תאריכים</dt><dd>{fmtRange(trip.start, trip.end)}</dd></div>
          <div><dt>אורך</dt><dd>{trip.nights === 0 ? 'יום אחד' : trip.nights === 1 ? 'לילה אחד' : `${trip.nights} לילות`}</dd></div>
          <div><dt>שקע</dt><dd>{plug ? <>מסוג <span dir="ltr">{plug}</span></> : 'כדאי לבדוק'}</dd></div>
          <div><dt>תוכניות</dt><dd>{trip.activityLabels.length ? trip.activityLabels.join(', ') : 'עוד לא נבחרו'}</dd></div>
        </dl>
        <Weather weather={weather} />
      </aside>
    </article>
  );
}
