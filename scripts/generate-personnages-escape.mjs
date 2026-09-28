// Personnages détourés des 3 univers (cartes d'orientation de /escape-game-caen/).
// Usage : node scripts/generate-personnages-escape.mjs <dossier des PNG sources>
// Les sources (fond transparent, ~2 Mo) ne sont pas versionnées : seules les variantes le sont.
// Une source absente du dossier est ignorée : on peut ne régénérer qu'un seul personnage.
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const SRC_DIR = process.argv[2];
const OUT_DIR = 'img/escape';
const WIDTHS = [400, 720];
const QUALITY = { webp: 80, avif: 55 };

const MAP = [
  { src: '1.png', slug: 'personnage-psychiatric' },
  { src: '2.png', slug: 'personnage-back-to-the-80s' },
  // Policier qui tend les menottes (photo du 28/09/2026). Les menottes sont aussi extraites seules,
  // aux mêmes dimensions, pour un calque posé DEVANT le bouton de la carte.
  // Zone en coordonnées de la photo détourée : sous la main, du haut de la chaîne au bas des bracelets.
  {
    src: 'policier-tend-menottes.png', slug: 'personnage-garde-a-vue-policier-tend-menottes',
    premierPlan: { slug: 'personnage-garde-a-vue-menottes-premier-plan', zone: { x0: 70, x1: 330, y0: 530, y1: 1160 } },
  },
];

// Ne garde que le métal des menottes dans la zone : pixels clairs et peu colorés (le gilet est noir, la peau colorée),
// gravures sombres rebouchées, puis seul le plus grand objet d'un seul tenant (chaîne + bracelets).
async function calqueMenottes(image, zone) {
  const { data, info } = await sharp(image).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, N = W * H;
  let m = new Uint8Array(N);
  for (let y = zone.y0; y <= zone.y1; y++) for (let x = zone.x0; x <= zone.x1; x++) {
    const i = (y * W + x) * 4, r = data[i], g = data[i + 1], b = data[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (data[i + 3] > 40 && 0.3 * r + 0.59 * g + 0.11 * b > 70 && (mx ? (mx - mn) / mx : 0) < 0.38) m[y * W + x] = 1;
  }
  const morpho = (src, r, dilater) => { // disque de rayon r
    const o = new Uint8Array(N);
    for (let y = zone.y0; y <= zone.y1; y++) for (let x = zone.x0; x <= zone.x1; x++) {
      let v = dilater ? 0 : 1;
      for (let dy = -r; dy <= r && v === (dilater ? 0 : 1); dy++) for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r) continue;
        const t = src[(y + dy) * W + x + dx];
        if (dilater && t) { v = 1; break; }
        if (!dilater && !t) { v = 0; break; }
      }
      o[y * W + x] = v;
    }
    return o;
  };
  m = morpho(morpho(m, 3, true), 3, false);
  const lab = new Int32Array(N), tailles = [0];
  for (let k = 0; k < N; k++) {
    if (!m[k] || lab[k]) continue;
    const n = tailles.length, pile = [k];
    let c = 0; lab[k] = n;
    while (pile.length) {
      const p = pile.pop(), x = p % W; c++;
      for (const q of [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, p - W, p + W]) {
        if (q >= 0 && q < N && m[q] && !lab[q]) { lab[q] = n; pile.push(q); }
      }
    }
    tailles.push(c);
  }
  const garde = tailles.indexOf(Math.max(...tailles.slice(1)));
  const out = Buffer.from(data);
  for (let k = 0; k < N; k++) if (lab[k] !== garde) out[k * 4 + 3] = 0;
  return sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
}

async function declinaisons(image, slug) {
  const meta = await sharp(image).metadata();
  console.log(`\n=== ${slug} (${meta.width}x${meta.height}) ===`);
  for (const w of WIDTHS) {
    for (const fmt of ['avif', 'webp']) {
      const out = path.join(OUT_DIR, `${slug}-${w}w.${fmt}`);
      let pipe = sharp(image).resize({ width: w, withoutEnlargement: true });
      pipe = fmt === 'avif' ? pipe.avif({ quality: QUALITY.avif }) : pipe.webp({ quality: QUALITY.webp, alphaQuality: 90 });
      await pipe.toFile(out);
      console.log(`  ${path.basename(out).padEnd(50)} ${(fs.statSync(out).size / 1024).toFixed(0).padStart(5)} KB`);
    }
  }
  // Secours pour les rares navigateurs sans WebP : PNG en palette
  const png = path.join(OUT_DIR, `${slug}-720w.png`);
  await sharp(image).resize({ width: 720, withoutEnlargement: true }).png({ palette: true, quality: 85, compressionLevel: 9 }).toFile(png);
  const pm = await sharp(png).metadata();
  console.log(`  ${path.basename(png).padEnd(50)} ${(fs.statSync(png).size / 1024).toFixed(0).padStart(5)} KB  (${pm.width}x${pm.height})`);
}

if (!SRC_DIR || !fs.existsSync(SRC_DIR)) {
  console.error('Indiquez le dossier des PNG sources.');
  process.exit(1);
}
fs.mkdirSync(OUT_DIR, { recursive: true });

for (const { src, slug, premierPlan } of MAP) {
  if (!fs.existsSync(path.join(SRC_DIR, src))) { console.log(`\n(${src} absent : ${slug} non régénéré)`); continue; }
  // On retire les bords transparents pour que le personnage se cale au pixel près dans la carte
  const trimmed = await sharp(path.join(SRC_DIR, src)).trim().toBuffer();
  await declinaisons(trimmed, slug);
  if (premierPlan) await declinaisons(await calqueMenottes(trimmed, premierPlan.zone), premierPlan.slug);
}
