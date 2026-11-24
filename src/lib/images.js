// Three iconic photographs of a place, from Wikipedia, Wikidata and Wikimedia Commons.
// Order of preference: the article's lead photo, the place's Wikidata photos (main, night, aerial),
// then Commons featured / quality photos whose title names the place, then the article's other photos.
const WP = 'https://en.wikipedia.org/w/api.php';
const WD = 'https://www.wikidata.org/w/api.php';
const CM = 'https://commons.wikimedia.org/w/api.php';

const api = async (base, params, signal) => {
  const qs = new URLSearchParams({ format: 'json', origin: '*', ...params });
  const r = await fetch(`${base}?${qs}`, { signal });
  if (!r.ok) throw new Error('ויקימדיה לא ענתה.');
  return r.json();
};

const BAD_TITLE = /\b(map|maps|flag|coat of arms|logo|seal|emblem|locator|location|montage|collage|diagram|plan|sign|signage|airport|interior|inside|wasp|bee|beetle|moth|spider|insect|leaf|leaves|mushroom|fungus|lichen|zoo|hospital|stamp|coin|banknote|portrait|svg)\b/i;

function km(a, b, c, d) {
  const R = 6371, r = x => x * Math.PI / 180;
  const h = Math.sin(r(c - a) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

async function findArticle(place, signal) {
  const en = place.nameEn || place.name;
  const q = place.wiki || `${en} ${place.admin1En || ''} ${place.countryEn || ''}`.replace(/\s+/g, ' ').trim();
  const j = await api(WP, {
    action: 'query', generator: 'search', gsrsearch: q, gsrlimit: '8', prop: 'pageprops|pageimages|coordinates',
    piprop: 'name', ppprop: 'wikibase_item', colimit: 'max',
  }, signal);
  const pages = Object.values((j.query && j.query.pages) || {}).sort((a, b) => a.index - b.index);
  const skip = /\b(airport|station|stadium|university|county|district|municipality|province|list of|history of|people|election|club|f\.c\.)\b/i;
  const near = p => p.coordinates && p.coordinates[0] && km(place.lat, place.lon, p.coordinates[0].lat, p.coordinates[0].lon) < (place.wiki ? 200 : 60);
  const named = p => p.title.toLowerCase().startsWith(en.toLowerCase().split(',')[0]);
  return pages.find(p => !skip.test(p.title) && named(p) && near(p))
    || pages.find(p => !skip.test(p.title) && near(p))
    || pages.find(p => !skip.test(p.title) && named(p))
    || null;
}

async function wikidataFiles(qid, signal) {
  if (!qid) return [];
  const j = await api(WD, { action: 'wbgetentities', ids: qid, props: 'claims' }, signal);
  const claims = (j.entities && j.entities[qid] && j.entities[qid].claims) || {};
  const out = [];
  for (const p of ['P18', 'P3451', 'P8592', 'P8517']) {
    for (const c of claims[p] || []) {
      const v = c.mainsnak && c.mainsnak.datavalue && c.mainsnak.datavalue.value;
      if (typeof v === 'string') out.push(v);
    }
  }
  return out;
}

async function commonsFiles(place, signal) {
  const name = (place.wiki || place.nameEn || place.name).replace(/"/g, '');
  const j = await api(CM, {
    action: 'query', list: 'search', srnamespace: '6', srlimit: '30',
    srsearch: `intitle:"${name}" incategory:Featured_pictures_on_Wikimedia_Commons|Quality_images filetype:bitmap`,
  }, signal);
  return ((j.query && j.query.search) || []).map(s => s.title.replace(/^File:/, ''));
}

async function articleFiles(title, signal) {
  const j = await api(WP, { action: 'query', titles: title, prop: 'images', imlimit: '60' }, signal);
  const p = Object.values((j.query && j.query.pages) || {})[0];
  return ((p && p.images) || []).map(i => i.title.replace(/^File:/, '')).filter(t => /\.(jpe?g)$/i.test(t));
}

function stripHtml(s) {
  const d = document.createElement('div');
  d.innerHTML = s || '';
  return (d.textContent || '').replace(/\s+/g, ' ').trim();
}

async function fileInfo(files, signal) {
  const out = new Map();
  for (let i = 0; i < files.length; i += 40) {
    const chunk = files.slice(i, i + 40);
    const j = await api(CM, {
      action: 'query', titles: chunk.map(f => 'File:' + f).join('|'), prop: 'imageinfo',
      iiprop: 'url|size|mime|extmetadata', iiurlwidth: '1600', iiextmetadatafilter: 'Artist|LicenseShortName|ObjectName|ImageDescription',
    }, signal);
    const norm = {};
    for (const n of (j.query && j.query.normalized) || []) norm[n.to] = n.from;
    for (const p of Object.values((j.query && j.query.pages) || {})) {
      const ii = p.imageinfo && p.imageinfo[0];
      if (!ii) continue;
      const m = ii.extmetadata || {};
      out.set(p.title.replace(/^File:/, ''), {
        file: p.title.replace(/^File:/, ''), src: ii.thumburl || ii.url, width: ii.width, height: ii.height, mime: ii.mime,
        page: ii.descriptionurl, artist: stripHtml(m.Artist && m.Artist.value) || 'Unknown',
        license: stripHtml(m.LicenseShortName && m.LicenseShortName.value) || '',
        caption: stripHtml((m.ObjectName && m.ObjectName.value) || '') || p.title.replace(/^File:/, '').replace(/\.[a-z]+$/i, '').replace(/_/g, ' '),
      });
    }
  }
  return out;
}

const norm = s => s.replace(/_/g, ' ').trim();

function usable(info) {
  if (!info || !/^image\/(jpeg|png|webp|tiff)$/.test(info.mime || '')) return false;
  if (info.width < 1200) return false;
  const ratio = info.width / info.height;
  if (ratio < 0.95 || ratio > 2.6) return false;
  return !BAD_TITLE.test(info.file.replace(/[_.,()-]/g, ' '));
}

export async function getPlaceImages(place, signal) {
  const article = await findArticle(place, signal).catch(() => null);
  const qid = article && article.pageprops && article.pageprops.wikibase_item;
  const [wd, cm, art] = await Promise.all([
    wikidataFiles(qid, signal).catch(() => []),
    commonsFiles(place, signal).catch(() => []),
    article ? articleFiles(article.title, signal).catch(() => []) : [],
  ]);
  const ordered = [];
  const add = f => { const n = norm(f); if (n && !ordered.includes(n)) ordered.push(n); };
  if (article && article.pageimage) add(article.pageimage);
  wd.forEach(add); cm.forEach(add); art.forEach(add);
  const infos = await fileInfo(ordered.slice(0, 80), signal);
  const picked = [];
  const seenStems = new Set();
  for (const f of ordered) {
    const info = infos.get(f);
    if (!usable(info)) continue;
    // Avoid two frames from the same burst ("... 2024 -- 0431" and "... 2024 -- 0432").
    const stem = f.replace(/[\d\s_-]+(\.[a-z]+)$/i, '').toLowerCase();
    if (seenStems.has(stem)) continue;
    seenStems.add(stem);
    picked.push(info);
    if (picked.length === 3) break;
  }
  return { article: article ? article.title : null, images: picked };
}
