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
  { src: '2.png', slug: 'personnage-back-to-the-80s' },
  { src: 'policier-menottes-tendues.png', slug: 'personnage-garde-a-vue-policier-menottes-tendues' }, // photo du 28/09/2026
  { src: 'patiente-camisole.png', slug: 'personnage-psychiatric-patiente-camisole' }, // photo du 28/09/2026
  // Pour un calque posé devant le bouton, ajouter premierPlan: { slug, zone: [[x, y], …] } (polygone autour des cheveux)
];

const rampe = (v, a, b) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
function dansPolygone(poly, x, y) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
}

// Calque des cheveux : dans le polygone, opacité selon la noirceur du pixel (cheveux noirs, camisole claire),
// puis seule la grande masse est gardée (taches et ombres isolées de la camisole écartées),
// avec les mèches fines qui la touchent.
async function calqueCheveux(image, zone) {
  const { data, info } = await sharp(image).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, N = W * H;
  const a = new Float32Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!dansPolygone(zone, x, y)) continue;
    const i = (y * W + x) * 4;
    a[y * W + x] = rampe(0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2], 115, 55) * data[i + 3] / 255;
  }
  const lab = new Int32Array(N), tailles = [0];
  for (let k = 0; k < N; k++) {
    if (a[k] < 0.5 || lab[k]) continue;
    const n = tailles.length, pile = [k];
    let c = 0; lab[k] = n;
    while (pile.length) {
      const p = pile.pop(), x = p % W; c++;
      for (const q of [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, p - W, p + W]) {
        if (q >= 0 && q < N && a[q] >= 0.5 && !lab[q]) { lab[q] = n; pile.push(q); }
      }
    }
    tailles.push(c);
  }
  const garde = new Uint8Array(N);
  for (let k = 0; k < N; k++) if (lab[k] && tailles[lab[k]] >= 3000) garde[k] = 1;
  const out = Buffer.from(data);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = y * W + x;
    let v = a[k];
    if (v > 0 && !garde[k]) { // mèche fine : gardée si elle touche la masse (3 px)
      let proche = false;
      for (let dy = -3; dy <= 3 && !proche; dy++) for (let dx = -3; dx <= 3; dx++) {
        const yy = y + dy, xx = x + dx;
        if (yy >= 0 && yy < H && xx >= 0 && xx < W && garde[yy * W + xx]) { proche = true; break; }
      }
      if (!proche) v = 0;
    }
    out[k * 4 + 3] = Math.round(v * 255);
  }
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
      console.log(`  ${path.basename(out).padEnd(52)} ${(fs.statSync(out).size / 1024).toFixed(0).padStart(5)} KB`);
    }
  }
  // Secours pour les rares navigateurs sans WebP : PNG en palette
  const png = path.join(OUT_DIR, `${slug}-720w.png`);
  await sharp(image).resize({ width: 720, withoutEnlargement: true }).png({ palette: true, quality: 85, compressionLevel: 9 }).toFile(png);
  const pm = await sharp(png).metadata();
  console.log(`  ${path.basename(png).padEnd(52)} ${(fs.statSync(png).size / 1024).toFixed(0).padStart(5)} KB  (${pm.width}x${pm.height})`);
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
  if (premierPlan) await declinaisons(await calqueCheveux(trimmed, premierPlan.zone), premierPlan.slug);
}
