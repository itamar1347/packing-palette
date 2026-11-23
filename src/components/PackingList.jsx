export default function PackingList({ groups, packed, toggle, trip, weatherNote }) {
  const total = groups.reduce((a, g) => a + g.items.length, 0);
  const done = groups.reduce((a, g) => a + g.items.filter(i => packed.has(g.title + '/' + i.id)).length, 0);
  const pieces = groups.reduce((a, g) => a + g.items.reduce((s, i) => s + i.qty, 0), 0);
  return (
    <section className="field-list" aria-labelledby="list-title">
      <header className="list-head">
        <h2 id="list-title">Field list</h2>
        <p className="list-sub">
          {total} lines, {pieces} pieces for {trip.nights + 1} days in {trip.place.name}. {weatherNote}
        </p>
        <p className="list-progress" aria-live="polite"><b>{done}</b> of {total} packed</p>
      </header>
      <div className="groups">
        {groups.map(g => (
          <div className="group" key={g.title}>
            <h3>{g.title}</h3>
            <ul>
              {g.items.map(i => {
                const key = g.title + '/' + i.id;
                const on = packed.has(key);
                return (
                  <li key={key} className={on ? 'is-packed' : ''}>
                    <input type="checkbox" id={`pk-${key.replace(/[^a-z0-9]+/gi, '-')}`} checked={on} onChange={() => toggle(key)} />
                    <label htmlFor={`pk-${key.replace(/[^a-z0-9]+/gi, '-')}`}>
                      <span className="item-name">{i.name}</span>
                      {i.note && <span className="item-note">{i.note}</span>}
                    </label>
                    <span className="item-qty" aria-label={`quantity ${i.qty}`}>×{i.qty}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
