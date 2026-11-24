import { useEffect, useRef, useState } from 'react';
import { SONGS, songForDate, savedChoice, saveChoice, songDetails, searchLinks } from '../lib/songs.js';
import { todayISO, fmtDayLong } from '../lib/dates.js';

export default function SongOfTheDay() {
  const today = todayISO();
  const picked = songForDate(today);
  const [song, setSong] = useState(() => savedChoice(today) || picked);
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audio = useRef(null);

  useEffect(() => {
    const ctrl = new AbortController();
    setInfo(null); setError(null); setPlaying(false); setProgress(0);
    songDetails(song, ctrl.signal).then(setInfo).catch(e => e.name !== 'AbortError' && setError(e.message));
    return () => ctrl.abort();
  }, [song]);

  const choose = s => { setSong(s); saveChoice(s.id === picked.id ? null : s, today); };
  const another = () => {
    const pool = SONGS.filter(s => s.id !== song.id);
    choose(pool[Math.floor(Math.random() * pool.length)]);
  };
  const toggle = () => {
    const a = audio.current;
    if (!a) return;
    if (a.paused) a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    else { a.pause(); setPlaying(false); }
  };

  const links = searchLinks(song);
  const mine = song.id === picked.id;
  return (
    <section className={`song${playing ? ' is-playing' : ''}`} aria-labelledby="song-title">
      <div className="song-art">
        <span className="vinyl" aria-hidden="true" />
        {info && info.art ? <img src={info.art} alt={`עטיפת האלבום ${info.album}`} /> : <span className="art-wait" aria-hidden="true" />}
      </div>
      <div className="song-body">
        <p className="song-kicker">השיר שלך להיום · {fmtDayLong(today)}</p>
        <h2 id="song-title" className="song-title" dir="ltr">{info ? info.title : song.title}</h2>
        <p className="song-meta" dir="ltr">{info ? `${info.artist} · ${info.album} · ${info.year}` : 'The Weeknd'}</p>
        <p className="song-why">{mine ? 'למה דווקא הוא: ' : ''}{song.why}</p>
        {error && <p className="song-err">{error}</p>}
        <div className="song-play">
          {info && info.preview && (
            <>
              <audio ref={audio} src={info.preview} preload="none"
                onTimeUpdate={e => setProgress(e.currentTarget.duration ? e.currentTarget.currentTime / e.currentTarget.duration : 0)}
                onEnded={() => { setPlaying(false); setProgress(0); }} />
              <button type="button" className="play" onClick={toggle} aria-pressed={playing}>
                <span className="play-icon" aria-hidden="true">{playing ? '❚❚' : '▶'}</span>
                {playing ? 'עצירה' : 'האזיני לקטע'}
              </button>
              <span className="play-bar" aria-hidden="true"><i style={{ width: `${progress * 100}%` }} /></span>
            </>
          )}
          <span className="song-links">
            <a href={links.spotify} target="_blank" rel="noopener noreferrer">Spotify</a>
            <a href={links.youtube} target="_blank" rel="noopener noreferrer">YouTube</a>
            {info && info.apple && <a href={info.apple} target="_blank" rel="noopener noreferrer">Apple Music</a>}
          </span>
        </div>
        <div className="song-change">
          <button type="button" className="ghost" onClick={another}>שיר אחר להיום</button>
          <label className="song-pick">
            <span>או לבחור בעצמך</span>
            <select value={song.id} onChange={e => choose(SONGS.find(s => String(s.id) === e.target.value))} dir="ltr">
              {SONGS.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </label>
          {!mine && <button type="button" className="linkish" onClick={() => choose(picked)}>חזרה לשיר שנבחר לך</button>}
        </div>
      </div>
    </section>
  );
}
