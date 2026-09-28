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
  // Policier aux menottes (photo du 28/09/2026) : retourné pour avoir les menottes à droite,
  // puis textes remis à l'endroit. Coordonnées prises dans la photo détourée, AVANT le miroir.
  {
    src: 'policier-menottes.png', slug: 'personnage-garde-a-vue-policier-menottes',
    miroir: {
      zones: [{ x0: 532, x1: 664, y0: 600, y1: 735 }],   // écusson « WARNING » : zone re-retournée d'un bloc
      lettres: [{ x0: 548, x1: 721, y0: 146, y1: 234 }], // « POLICE » sur la casquette : seules les lettres sont déplacées
    },
  },
];

const FONDU = 3; // px d'adoucissement au bord des zones re-retournées
const clair = (b, i) => (b[i] + b[i + 1]) / 2; // lettres blanches : R et G hauts (le tissu éclairé en bleu n'a que B haut)
const rampe = (v, a, b) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

function flou(arr, w, h, r) { // flou boîte séparable, 3 passes ≈ gaussien
  const a = Float32Array.from(arr), t = new Float32Array(a.length);
  for (let p = 0; p < 3; p++) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let s = 0, n = 0;
      for (let k = -r; k <= r; k++) { const xx = x + k; if (xx >= 0 && xx < w) { s += a[y * w + xx]; n++; } }
      t[y * w + x] = s / n;
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let s = 0, n = 0;
      for (let k = -r; k <= r; k++) { const yy = y + k; if (yy >= 0 && yy < h) { s += t[yy * w + x]; n++; } }
      a[y * w + x] = s / n;
    }
  }
  return a;
}

// Miroir gauche/droite, puis remise à l'endroit des textes (sinon « POLICE » se lirait à l'envers)
async function miroirAvecTextes(image, { zones = [], lettres = [] }) {
  const { data, info } = await sharp(image).flop().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, out = Buffer.from(data);
  const miroir = z => ({ x0: W - 1 - z.x1, x1: W - 1 - z.x0, y0: z.y0, y1: z.y1 });

  // Zones entières (écusson) : re-retournées sur place, fondu sur les bords
  for (const z of zones.map(miroir)) {
    for (let y = z.y0; y <= z.y1; y++) for (let x = z.x0; x <= z.x1; x++) {
      const sx = z.x0 + z.x1 - x;
      const a = Math.min(1, (Math.min(x - z.x0, z.x1 - x, y - z.y0, z.y1 - y) + 0.5) / FONDU);
      const i = (y * W + x) * 4, j = (y * W + sx) * 4;
      for (let c = 0; c < 4; c++) out[i + c] = Math.round(data[j + c] * a + data[i + c] * (1 - a));
    }
  }

  // Lettres seules (casquette) : l'éclairage du tissu n'est pas symétrique, un bloc entier laisserait un rectangle visible.
  // 1) on bouche les lettres inversées avec la moyenne floue du tissu voisin ; 2) on pose les lettres à l'endroit par-dessus.
  for (const z of lettres.map(miroir)) {
    const M = 14; // marge de contexte pour le bouchage
    const X0 = z.x0 - M, Y0 = z.y0 - M, w = z.x1 - z.x0 + 1 + 2 * M, h = z.y1 - z.y0 + 1 + 2 * M;
    const at = (x, y) => ((Y0 + y) * W + (X0 + x)) * 4;
    const dedans = (x, y) => X0 + x >= z.x0 && X0 + x <= z.x1 && Y0 + y >= z.y0 && Y0 + y <= z.y1;
    const inv = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (dedans(x, y)) inv[y * w + x] = rampe(clair(data, at(x, y)), 70, 120);
    const dil = new Float32Array(w * h); // lettres inversées, dilatées de 2 px
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let m = 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const yy = y + dy, xx = x + dx;
        if (yy >= 0 && yy < h && xx >= 0 && xx < w) m = Math.max(m, inv[yy * w + xx]);
      }
      dil[y * w + x] = m;
    }
    const masque = flou(dil, w, h, 1).map(v => Math.min(1, v * 1.6));
    const poids = new Float32Array(w * h); // tissu hors lettres, pondéré par l'opacité
    for (let k = 0; k < w * h; k++) poids[k] = (1 - dil[k]) * data[at(k % w, (k / w) | 0) + 3] / 255;
    const somme = flou(poids, w, h, 6), tissu = [];
    for (let c = 0; c < 3; c++) {
      const ch = new Float32Array(w * h);
      for (let k = 0; k < w * h; k++) ch[k] = data[at(k % w, (k / w) | 0) + c] * poids[k];
      tissu.push(flou(ch, w, h, 6));
    }
    for (let k = 0; k < w * h; k++) {
      const a = masque[k];
      if (!a || somme[k] < 1e-3) continue;
      const i = at(k % w, (k / w) | 0);
      for (let c = 0; c < 3; c++) out[i + c] = Math.round(out[i + c] * (1 - a) + (tissu[c][k] / somme[k]) * a);
    }
    for (let y = z.y0; y <= z.y1; y++) for (let x = z.x0; x <= z.x1; x++) {
      const sx = z.x0 + z.x1 - x, i = (y * W + x) * 4, j = (y * W + sx) * 4;
      // opacité des deux pixels : le fond transparent de la photo contient des couleurs parasites
      const a = rampe(clair(data, j), 55, 120) * Math.min(data[i + 3], data[j + 3]) / 255;
      if (!a) continue;
      for (let c = 0; c < 3; c++) out[i + c] = Math.round(data[j + c] * a + out[i + c] * (1 - a));
    }
  }
  return sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
}

if (!SRC_DIR || !fs.existsSync(SRC_DIR)) {
  console.error('Indiquez le dossier des PNG sources.');
  process.exit(1);
}
fs.mkdirSync(OUT_DIR, { recursive: true });

for (const { src, slug, miroir } of MAP) {
  if (!fs.existsSync(path.join(SRC_DIR, src))) { console.log(`\n(${src} absent : ${slug} non régénéré)`); continue; }
  // On retire les bords transparents pour que le personnage se cale au pixel près dans la carte
  let trimmed = await sharp(path.join(SRC_DIR, src)).trim().toBuffer();
  if (miroir) trimmed = await miroirAvecTextes(trimmed, miroir);
  const meta = await sharp(trimmed).metadata();
  console.log(`\n=== ${slug} (${meta.width}x${meta.height} après détourage) ===`);
  for (const w of WIDTHS) {
    for (const fmt of ['avif', 'webp']) {
      const out = path.join(OUT_DIR, `${slug}-${w}w.${fmt}`);
      let pipe = sharp(trimmed).resize({ width: w, withoutEnlargement: true });
      pipe = fmt === 'avif' ? pipe.avif({ quality: QUALITY.avif }) : pipe.webp({ quality: QUALITY.webp, alphaQuality: 90 });
      await pipe.toFile(out);
      console.log(`  ${path.basename(out).padEnd(44)} ${(fs.statSync(out).size / 1024).toFixed(0).padStart(5)} KB`);
    }
  }
  // Secours pour les rares navigateurs sans WebP : PNG en palette
  const png = path.join(OUT_DIR, `${slug}-720w.png`);
  await sharp(trimmed).resize({ width: 720, withoutEnlargement: true }).png({ palette: true, quality: 85, compressionLevel: 9 }).toFile(png);
  const pm = await sharp(png).metadata();
  console.log(`  ${path.basename(png).padEnd(44)} ${(fs.statSync(png).size / 1024).toFixed(0).padStart(5)} KB  (${pm.width}x${pm.height})`);
}
