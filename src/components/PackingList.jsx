// Short stable DOM id from an item key (the keys are Hebrew words).
function domId(key) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (Math.imul(31, h) + key.charCodeAt(i)) | 0;
  return 'pk-' + (h >>> 0).toString(36);
}

export default function PackingList({ groups, packed, toggle, trip, weatherNote }) {
  const total = groups.reduce((a, g) => a + g.items.length, 0);
  const done = groups.reduce((a, g) => a + g.items.filter(i => packed.has(g.title + '/' + i.id)).length, 0);
  const pieces = groups.reduce((a, g) => a + g.items.reduce((s, i) => s + i.qty, 0), 0);
  return (
    <section className="field-list" aria-labelledby="list-title">
      <header className="list-head">
        <h2 id="list-title">מה לארוז</h2>
        <p className="list-sub">
          {total} שורות ו-{pieces} פריטים ל-{trip.nights + 1} ימים ב{trip.place.name}. {weatherNote}
        </p>
        <p className="list-progress" aria-live="polite"><b>{done}</b> מתוך {total} כבר במזוודה</p>
      </header>
      <div className="groups">
        {groups.map(g => (
          <div className="group" key={g.title}>
            <h3>{g.title}</h3>
            <ul>
              {g.items.map(i => {
                const key = g.title + '/' + i.id;
                const on = packed.has(key);
                const id = domId(key);
                return (
                  <li key={key} className={on ? 'is-packed' : ''}>
                    <input type="checkbox" id={id} checked={on} onChange={() => toggle(key)} />
                    <label htmlFor={id}>
                      <span className="item-name">{i.name}</span>
                      {i.note && <span className="item-note">{i.note}</span>}
                    </label>
                    <span className="item-qty" aria-label={`כמות ${i.qty}`} dir="ltr">×{i.qty}</span>
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
