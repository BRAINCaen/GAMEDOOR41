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
  { src: 'policier-menottes-tendues.png', slug: 'personnage-garde-a-vue-policier-menottes-tendues' }, // photo du 28/09/2026
];

if (!SRC_DIR || !fs.existsSync(SRC_DIR)) {
  console.error('Indiquez le dossier des PNG sources.');
  process.exit(1);
}
fs.mkdirSync(OUT_DIR, { recursive: true });

for (const { src, slug } of MAP) {
  if (!fs.existsSync(path.join(SRC_DIR, src))) { console.log(`\n(${src} absent : ${slug} non régénéré)`); continue; }
  // On retire les bords transparents pour que le personnage se cale au pixel près dans la carte
  const trimmed = await sharp(path.join(SRC_DIR, src)).trim().toBuffer();
  const meta = await sharp(trimmed).metadata();
  console.log(`\n=== ${slug} (${meta.width}x${meta.height} après détourage) ===`);
  for (const w of WIDTHS) {
    for (const fmt of ['avif', 'webp']) {
      const out = path.join(OUT_DIR, `${slug}-${w}w.${fmt}`);
      let pipe = sharp(trimmed).resize({ width: w, withoutEnlargement: true });
      pipe = fmt === 'avif' ? pipe.avif({ quality: QUALITY.avif }) : pipe.webp({ quality: QUALITY.webp, alphaQuality: 90 });
      await pipe.toFile(out);
      console.log(`  ${path.basename(out).padEnd(52)} ${(fs.statSync(out).size / 1024).toFixed(0).padStart(5)} KB`);
    }
  }
  // Secours pour les rares navigateurs sans WebP : PNG en palette
  const png = path.join(OUT_DIR, `${slug}-720w.png`);
  await sharp(trimmed).resize({ width: 720, withoutEnlargement: true }).png({ palette: true, quality: 85, compressionLevel: 9 }).toFile(png);
  const pm = await sharp(png).metadata();
  console.log(`  ${path.basename(png).padEnd(52)} ${(fs.statSync(png).size / 1024).toFixed(0).padStart(5)} KB  (${pm.width}x${pm.height})`);
}
