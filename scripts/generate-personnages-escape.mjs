// Personnages détourés des 3 univers (cartes d'orientation de /escape-game-caen/).
// Usage : node scripts/generate-personnages-escape.mjs <dossier des PNG sources>
// Les sources (1086x1448, fond transparent, ~2,5 Mo) ne sont pas versionnées : seules les variantes le sont.
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
  { src: '3.png', slug: 'personnage-garde-a-vue' },
];

if (!SRC_DIR || !fs.existsSync(SRC_DIR)) {
  console.error('Indiquez le dossier des PNG sources.');
  process.exit(1);
}
fs.mkdirSync(OUT_DIR, { recursive: true });

for (const { src, slug } of MAP) {
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
      console.log(`  ${path.basename(out).padEnd(44)} ${(fs.statSync(out).size / 1024).toFixed(0).padStart(5)} KB`);
    }
  }
  // Secours pour les rares navigateurs sans WebP : PNG en palette
  const png = path.join(OUT_DIR, `${slug}-720w.png`);
  await sharp(trimmed).resize({ width: 720, withoutEnlargement: true }).png({ palette: true, quality: 85, compressionLevel: 9 }).toFile(png);
  const pm = await sharp(png).metadata();
  console.log(`  ${path.basename(png).padEnd(44)} ${(fs.statSync(png).size / 1024).toFixed(0).padStart(5)} KB  (${pm.width}x${pm.height})`);
}
