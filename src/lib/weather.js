// Weather for the trip dates. Trips inside the next 16 days use the live forecast;
// later trips use what actually happened on the same dates in the three most recent years.
import { todayISO, addDays, diffDays, shiftYears } from './dates.js';

const FORECAST = 'https://api.open-meteo.com/v1/forecast';
const ARCHIVE = 'https://archive-api.open-meteo.com/v1/archive';
const DAILY = 'temperature_2m_max,temperature_2m_min,precipitation_sum,snowfall_sum,weather_code,wind_speed_10m_max';

async function getDaily(base, place, start, end, signal) {
  const url = `${base}?latitude=${place.lat}&longitude=${place.lon}&start_date=${start}&end_date=${end}&daily=${DAILY}&timezone=auto`;
  const r = await fetch(url, { signal });
  if (!r.ok) throw new Error('The weather service did not answer.');
  const j = await r.json();
  if (!j.daily || !j.daily.time) throw new Error('No weather data for these dates.');
  return j.daily;
}

function kind(code) {
  if (code == null) return 'unknown';
  if (code <= 1) return 'clear';
  if (code <= 3) return 'cloud';
  if (code === 45 || code === 48) return 'fog';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'storm';
  return 'rain';
}

const mean = a => a.reduce((s, x) => s + x, 0) / (a.length || 1);
const num = v => (typeof v === 'number' && isFinite(v) ? v : null);

export async function getTripWeather(place, start, end, signal) {
  const today = todayISO();
  const nights = diffDays(start, end);
  const forecastLast = addDays(today, 15);
  let days, mode, years = [];

  if (start >= today && end <= forecastLast) {
    mode = 'forecast';
    const d = await getDaily(FORECAST, place, start, end, signal);
    days = d.time.map((t, i) => ({
      date: t, hi: num(d.temperature_2m_max[i]), lo: num(d.temperature_2m_min[i]), rain: num(d.precipitation_sum[i]) || 0,
      snow: num(d.snowfall_sum[i]) || 0, wind: num(d.wind_speed_10m_max[i]) || 0, kind: kind(d.weather_code[i]), wetShare: (num(d.precipitation_sum[i]) || 0) >= 1 ? 1 : 0,
    }));
  } else {
    mode = 'climate';
    // The archive runs about a week behind, so use the latest three years whose dates are fully recorded.
    const limit = addDays(today, -8);
    const shifts = [];
    for (let k = 1; shifts.length < 3 && k < 8; k++) if (shiftYears(end, k) <= limit && shiftYears(start, k) <= shiftYears(end, k)) shifts.push(k);
    const runs = await Promise.all(shifts.map(k => getDaily(ARCHIVE, place, shiftYears(start, k), shiftYears(end, k), signal)));
    years = shifts.map(k => Number(shiftYears(start, k).slice(0, 4)));
    const n = nights + 1;
    days = [];
    for (let i = 0; i < n; i++) {
      const pick = key => runs.map(r => num(r[key][i])).filter(v => v != null);
      const codes = runs.map(r => kind(r.weather_code[i]));
      const rains = pick('precipitation_sum');
      const count = {};
      codes.forEach(c => { count[c] = (count[c] || 0) + 1; });
      const top = Object.keys(count).sort((a, b) => count[b] - count[a])[0];
      days.push({
        date: addDays(start, i), hi: pick('temperature_2m_max').length ? mean(pick('temperature_2m_max')) : null,
        lo: pick('temperature_2m_min').length ? mean(pick('temperature_2m_min')) : null,
        rain: mean(rains), snow: mean(pick('snowfall_sum')), wind: Math.max(0, ...pick('wind_speed_10m_max')),
        kind: top, wetShare: rains.filter(v => v >= 1).length / (rains.length || 1),
        absHi: Math.max(...pick('temperature_2m_max')), absLo: Math.min(...pick('temperature_2m_min')),
      });
    }
  }
  return summarize(days, mode, years);
}

function summarize(days, mode, years) {
  const his = days.map(d => d.hi).filter(v => v != null), los = days.map(d => d.lo).filter(v => v != null);
  const kinds = {};
  days.forEach(d => { kinds[d.kind] = (kinds[d.kind] || 0) + 1; });
  const s = {
    mode, years, days,
    avgHi: mean(his), avgLo: mean(los),
    peakHi: Math.max(...days.map(d => (d.absHi != null ? d.absHi : d.hi)).filter(v => v != null)),
    coldLo: Math.min(...days.map(d => (d.absLo != null ? d.absLo : d.lo)).filter(v => v != null)),
    wetDays: Math.round(days.reduce((a, d) => a + d.wetShare, 0)),
    totalRain: Math.round(days.reduce((a, d) => a + d.rain, 0)),
    snowDays: days.filter(d => d.snow >= 0.5).length,
    maxWind: Math.round(Math.max(0, ...days.map(d => d.wind))),
    kinds,
  };
  s.headline = headline(s, days.length);
  return s;
}

function feel(t) {
  if (t >= 32) return 'hot';
  if (t >= 26) return 'warm';
  if (t >= 19) return 'mild';
  if (t >= 11) return 'cool';
  if (t >= 3) return 'cold';
  return 'freezing';
}

function headline(s, n) {
  const wetRatio = s.wetDays / n;
  const sky = s.snowDays >= 2 ? 'Snowy' : wetRatio >= 0.5 ? 'Often wet' : wetRatio >= 0.25 ? 'Changeable' : (s.kinds.clear || 0) >= n / 2 ? 'Dry and bright' : 'Mostly dry';
  const swing = s.avgHi - s.avgLo;
  const day = `${feel(s.avgHi)} days near ${Math.round(s.avgHi)}°C`;
  const night = swing >= 12 ? `, with ${feel(s.avgLo)} nights around ${Math.round(s.avgLo)}°C` : `, nights around ${Math.round(s.avgLo)}°C`;
  return `${sky}: ${day}${night}.`;
}

export function toF(c) {
  return Math.round(c * 9 / 5 + 32);
}
