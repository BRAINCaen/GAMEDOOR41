import sharp from 'sharp';
import { stat } from 'fs/promises';
import { join, basename, extname, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const SIZES = [480, 768, 1024];
const WEBP_QUALITY = 80;
const AVIF_QUALITY = 60;
const JPEG_QUALITY = 80;

const FILES = [
  'img/escape/salle-garde-a-vue-cellule-hero.jpg',
  'img/escape/salle-garde-a-vue-menottes-cellule.jpg',
  'img/escape/salle-garde-a-vue-menottes-portrait.jpg',
  'img/escape/salle-garde-a-vue-scanner-empreintes.jpg',
  'img/escape/salle-garde-a-vue-scanner-portrait.jpg',
  'img/escape/salle-psychiatric-lit-fauteuil.jpg',
  'img/escape/asset-psychiatric-rorschach.jpg',
  'img/quiz/salle-quiz-buzz-your-brain-vue-large.jpg',
  'img/quiz/salle-quiz-buzzers-premier-plan.jpg',
  'img/quiz/salle-quiz-couloir-vue-ensemble.jpg',
  'img/quiz/salle-quiz-perspective-rasante.jpg',
  'img/quiz/asset-quiz-fond-briques-nuit.jpg',
];

const fmt = (n) => `${(n / 1024).toFixed(1)}K`;

async function processImage(relPath) {
  const filePath = join(ROOT, relPath);
  const name = basename(filePath, extname(filePath));
  const dir = dirname(filePath);
  const meta = await sharp(filePath).metadata();
  const origW = meta.width;
  const origH = meta.height;
  const origStat = await stat(filePath);

  console.log(`\n${relPath}  (${origW}x${origH}, ${fmt(origStat.size)})`);

  for (const w of SIZES) {
    if (w >= origW) continue;
    const h = Math.round(origH * (w / origW));

    const jpgPath = join(dir, `${name}-${w}w.jpg`);
    const webpPath = join(dir, `${name}-${w}w.webp`);
    const avifPath = join(dir, `${name}-${w}w.avif`);

    await sharp(filePath).resize(w, h).jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toFile(jpgPath);
    await sharp(filePath).resize(w, h).webp({ quality: WEBP_QUALITY }).toFile(webpPath);
    await sharp(filePath).resize(w, h).avif({ quality: AVIF_QUALITY }).toFile(avifPath);

    const [jpgS, webpS, avifS] = await Promise.all([stat(jpgPath), stat(webpPath), stat(avifPath)]);
    console.log(`  ${w}w  jpg ${fmt(jpgS.size).padStart(7)}  webp ${fmt(webpS.size).padStart(7)}  avif ${fmt(avifS.size).padStart(7)}`);
  }

  const fullWebp = join(dir, `${name}.webp`);
  const fullAvif = join(dir, `${name}.avif`);
  await sharp(filePath).webp({ quality: WEBP_QUALITY }).toFile(fullWebp);
  await sharp(filePath).avif({ quality: AVIF_QUALITY }).toFile(fullAvif);
  const [fullWebpS, fullAvifS] = await Promise.all([stat(fullWebp), stat(fullAvif)]);
  console.log(`  full ${origW}w  webp ${fmt(fullWebpS.size).padStart(7)}  avif ${fmt(fullAvifS.size).padStart(7)}`);
}

async function main() {
  console.log(`Processing ${FILES.length} new photos`);
  for (const f of FILES) {
    try {
      await processImage(f);
    } catch (e) {
      console.error(`FAILED: ${f}`, e.message);
    }
  }
  console.log('\nDone.');
}

main().catch((e) => { console.error(e); process.exit(1); });
