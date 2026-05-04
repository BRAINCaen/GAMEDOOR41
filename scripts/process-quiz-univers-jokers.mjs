import sharp from 'sharp';
import { stat, rename, unlink } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const QUIZ = join(ROOT, 'img', 'quiz');

const SIZES = [480, 768, 1024];
const WEBP_QUALITY = 82;
const AVIF_QUALITY = 60;
const PNG_COMPRESSION = 9;

const MAP = [
  ['Affiche 100_ Blind Test Violette (sans numéro).png', 'affiche-blindtest-100-violette'],
  ['Buzz Your Brain 80 (sans numéro).png',               'univers-quiz-blindtest-80s'],
  ['Buzz Your Brain 90 sans numéro).png',                'univers-quiz-blindtest-90s'],
  ['Buzz Your Brain 2000 (sans numéro).png',             'univers-quiz-blindtest-2000s'],
  ['Buzz Your Brain Ados (sans numéro + sans signature).png', 'univers-quiz-ados'],
  ['Buzz Your Brain Anglais.png',                        'univers-quiz-anglais'],
  ['Buzz Your Brain Apéro (sans numéro).png',            'univers-quiz-apero'],
  ['Buzz Your Brain Cinema (sans numéro + sans signature).png', 'univers-quiz-cinema'],
  ['Buzz Your Brain Evg-Evjf 2.png',                     'univers-quiz-evjf-evg'],
  ['Buzz Your Brain FA (sans numéro).png',               'univers-quiz-fa'],
  ['Buzz Your Brain Japon (sans numéro) (1).png',        'univers-quiz-japon'],
  ['Buzz Your Brain KIDS.png',                           'univers-quiz-kids'],
  ['JOKER_COUP_DE_PRESSION_PNG.png',                     'joker-coup-de-pression'],
  ['JOKER_GEL_DE_CERVEAU_PNG.png',                       'joker-gel-de-cerveau'],
  ['JOKER_LE_PETIT_JOUEUR_PNG.png',                      'joker-le-petit-joueur'],
  ['JOKER_LE_TRICHEUR_PNG.png',                          'joker-le-tricheur'],
];

const fmt = (n) => `${(n / 1024).toFixed(1)}K`;

async function processOne(srcName, baseName) {
  const src = join(QUIZ, srcName);
  const meta = await sharp(src).metadata();
  const W = meta.width;
  const H = meta.height;
  const srcStat = await stat(src);
  console.log(`\n${srcName}\n  → ${baseName}  (${W}×${H}, ${fmt(srcStat.size)})`);

  for (const w of SIZES) {
    if (w >= W) continue;
    const h = Math.round(H * (w / W));
    const pngPath  = join(QUIZ, `${baseName}-${w}w.png`);
    const webpPath = join(QUIZ, `${baseName}-${w}w.webp`);
    const avifPath = join(QUIZ, `${baseName}-${w}w.avif`);

    await sharp(src).resize(w, h).png({ compressionLevel: PNG_COMPRESSION, palette: true }).toFile(pngPath);
    await sharp(src).resize(w, h).webp({ quality: WEBP_QUALITY }).toFile(webpPath);
    await sharp(src).resize(w, h).avif({ quality: AVIF_QUALITY }).toFile(avifPath);

    const [pngS, webpS, avifS] = await Promise.all([stat(pngPath), stat(webpPath), stat(avifPath)]);
    console.log(`  ${String(w).padStart(4)}w   png ${fmt(pngS.size).padStart(8)}   webp ${fmt(webpS.size).padStart(8)}   avif ${fmt(avifS.size).padStart(8)}`);
  }

  // Full size: png (compressed) + webp + avif
  const fullPng  = join(QUIZ, `${baseName}.png`);
  const fullWebp = join(QUIZ, `${baseName}.webp`);
  const fullAvif = join(QUIZ, `${baseName}.avif`);
  await sharp(src).png({ compressionLevel: PNG_COMPRESSION, palette: true }).toFile(fullPng);
  await sharp(src).webp({ quality: WEBP_QUALITY }).toFile(fullWebp);
  await sharp(src).avif({ quality: AVIF_QUALITY }).toFile(fullAvif);
  const [pS, wS, aS] = await Promise.all([stat(fullPng), stat(fullWebp), stat(fullAvif)]);
  console.log(`  full ${String(W).padStart(4)}w   png ${fmt(pS.size).padStart(8)}   webp ${fmt(wS.size).padStart(8)}   avif ${fmt(aS.size).padStart(8)}`);

  // Remove the original ugly-named source file (we now have the optimized full-size png alongside)
  await unlink(src);
  console.log(`  ✕ removed source: ${srcName}`);
}

async function main() {
  console.log(`Processing ${MAP.length} sources from ${QUIZ}`);
  for (const [src, name] of MAP) {
    try {
      await processOne(src, name);
    } catch (e) {
      console.error(`FAILED ${src}: ${e.message}`);
    }
  }
  console.log('\nDone.');
}

main().catch((e) => { console.error(e); process.exit(1); });
