// Four colors read from a photograph: pixel clustering in Lab space, then the four most
// distinct well-populated clusters, ordered dark to light, each with a plain field name.

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image failed to load'));
    img.src = src;
  });
}

function srgbToLinear(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }
function toLab([r, g, b]) {
  const R = srgbToLinear(r), G = srgbToLinear(g), B = srgbToLinear(b);
  let x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  let y = (R * 0.2126 + G * 0.7152 + B * 0.0722);
  let z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = t => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  x = f(x); y = f(y); z = f(z);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
const dist2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;

export function extractPalette(img, count = 4) {
  const W = 120, H = Math.max(1, Math.round(W * img.naturalHeight / img.naturalWidth));
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, W, H);
  const data = ctx.getImageData(0, 0, W, H).data;
  const px = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 200) continue;
    const rgb = [data[i], data[i + 1], data[i + 2]];
    px.push({ rgb, lab: toLab(rgb) });
  }
  // k-means with a deterministic spread of starting points
  const K = 9;
  const sorted = px.slice().sort((a, b) => a.lab[0] - b.lab[0]);
  let centers = Array.from({ length: K }, (_, k) => sorted[Math.floor((k + 0.5) * sorted.length / K)].lab.slice());
  let assign = new Array(px.length).fill(0);
  for (let it = 0; it < 12; it++) {
    const sums = centers.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < px.length; i++) {
      let best = 0, bd = Infinity;
      for (let k = 0; k < K; k++) { const d = dist2(px[i].lab, centers[k]); if (d < bd) { bd = d; best = k; } }
      assign[i] = best;
      const s = sums[best]; s[0] += px[i].lab[0]; s[1] += px[i].lab[1]; s[2] += px[i].lab[2]; s[3]++;
    }
    centers = centers.map((c0, k) => (sums[k][3] ? [sums[k][0] / sums[k][3], sums[k][1] / sums[k][3], sums[k][2] / sums[k][3]] : c0));
  }
  const groups = centers.map(() => ({ n: 0, r: 0, g: 0, b: 0 }));
  assign.forEach((k, i) => { const g = groups[k]; g.n++; g.r += px[i].rgb[0]; g.g += px[i].rgb[1]; g.b += px[i].rgb[2]; });
  const clusters = groups.map((g, k) => ({
    share: g.n / px.length, lab: centers[k],
    rgb: g.n ? [Math.round(g.r / g.n), Math.round(g.g / g.n), Math.round(g.b / g.n)] : [0, 0, 0],
  })).filter(c0 => c0.share > 0.01);
  // Pick: the largest cluster first, then whichever adds the most (share × distance from those chosen).
  clusters.sort((a, b) => b.share - a.share);
  const chosen = [clusters[0]];
  while (chosen.length < count && chosen.length < clusters.length) {
    let best = null, score = -1;
    for (const c0 of clusters) {
      if (chosen.includes(c0)) continue;
      const d = Math.min(...chosen.map(x => Math.sqrt(dist2(x.lab, c0.lab))));
      const chroma = Math.hypot(c0.lab[1], c0.lab[2]);
      const s = Math.sqrt(c0.share) * d * (1 + chroma / 80);
      if (s > score) { score = s; best = c0; }
    }
    chosen.push(best);
  }
  const total = chosen.reduce((a, x) => a + x.share, 0);
  const out = chosen
    .sort((a, b) => a.lab[0] - b.lab[0])
    .map(x => ({ hex: hex(x.rgb), rgb: x.rgb, share: x.share / total, name: colorName(x.rgb) }));
  // Two swatches with one name: mark the darker "כהה" and the lighter "בהיר".
  out.forEach((c, i) => {
    const j = out.findIndex((d, k) => k !== i && d.name === c.name);
    if (j > i) { c.name = c.name + ' כהה'; out[j].name = out[j].name + ' בהיר'; }
  });
  return out;
}

function hex(rgb) { return '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase(); }

function hsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  let h = 0, s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  return [h, s, l];
}

// Names a guide would print beside a swatch: [deep, mid, light] per hue family.
const FAMILIES = [
  [15, ['בורדו', 'לבנה', 'ורד']],
  [40, ['קינמון', 'טרקוטה', 'משמש']],
  [65, ['ברונזה', 'חרדל', 'קש']],
  [90, ['זית', 'חזזית', 'פיסטוק']],
  [150, ['יער', 'אזוב', 'מרווה']],
  [190, ['ים עמוק', 'טורקיז', 'קצף ים']],
  [230, ['נמל', 'ים', 'שמיים']],
  [265, ['אינדיגו', 'דרדר', 'פריווינקל']],
  [300, ['חציל', 'סגול', 'לילך']],
  [340, ['שזיף', 'סחלב', 'סומק']],
  [361, ['בורדו', 'לבנה', 'ורד']],
];
const MUTED = {
  'לבנה': 'חימר', 'טרקוטה': 'חאקי', 'חרדל': 'חאקי', 'קש': 'חול', 'משמש': 'חול', 'קינמון': 'קליפת עץ', 'ברונזה': 'קליפת עץ',
  'חזזית': 'שיח מדבר', 'אזוב': 'מרווה', 'ים': 'כחול צפחה', 'שמיים': 'אובך', 'טורקיז': 'אקליפטוס', 'ורד': 'אבקת ורדים', 'סחלב': 'אברש', 'סומק': 'דמדומים',
};

export function colorName(rgb) {
  const [h, s, l] = hsl(rgb);
  if (s < 0.1 || (l < 0.12) || (l > 0.94)) {
    if (l < 0.16) return 'פחם';
    if (l < 0.38) return 'צפחה';
    if (l < 0.62) return 'אבן';
    if (l < 0.85) return 'ערפל';
    return 'גיר';
  }
  const fam = FAMILIES.find(f => h < f[0])[1];
  const name = l < 0.3 ? fam[0] : l < 0.62 ? fam[1] : fam[2];
  return s < 0.42 && MUTED[name] ? MUTED[name] : name;
}

export function luminance([r, g, b]) {
  const f = c => srgbToLinear(c);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** The palette color that can serve as the page accent on cream: the most colorful one dark enough to read. */
export function accentFrom(palette) {
  if (!palette || !palette.length) return null;
  const paper = 0.86;
  const ok = palette.map(p => {
    const lum = luminance(p.rgb), lab = toLab(p.rgb);
    return { p, contrast: (paper + 0.05) / (lum + 0.05), s: Math.hypot(lab[1], lab[2]) / 100 };
  });
  // Prefer the most colorful swatch (Lab chroma, so pale tints don't win), darkened only as far as it needs to read on cream.
  const colorful = ok.filter(x => x.s >= 0.12).sort((a, b) => b.s * Math.sqrt(b.p.share) - a.s * Math.sqrt(a.p.share));
  if (!colorful.length) {
    const readable = ok.filter(x => x.contrast >= 4.5).sort((a, b) => b.s - a.s);
    if (readable.length) return readable[0].p.hex;
  }
  const top = (colorful[0] || ok.sort((a, b) => b.s - a.s)[0]).p.rgb;
  let k = 1;
  let rgb = top;
  while (k > 0.2 && (paper + 0.05) / (luminance(rgb) + 0.05) < 4.5) { k -= 0.05; rgb = top.map(v => Math.round(v * k)); }
  return hex(rgb);
}
