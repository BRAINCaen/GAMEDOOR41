import sharp from 'sharp';
import { readdir, stat, mkdir } from 'fs/promises';
import { join, basename, extname } from 'path';

const IMG_DIR = '/home/user/GAMEDOOR41/img';
const SIZES = [480, 768, 1024, 1440];
const WEBP_QUALITY = 80;
const AVIF_QUALITY = 60;

async function getJpgFiles(dir) {
  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await getJpgFiles(fullPath));
    } else if (/\.jpe?g$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

async function processImage(filePath) {
  const name = basename(filePath, extname(filePath));
  const dir = filePath.replace(/\/[^/]+$/, '');
  const meta = await sharp(filePath).metadata();
  const origW = meta.width;
  const origH = meta.height;
  const results = [];

  // Generate WebP + AVIF for each target size (only if smaller than original)
  for (const w of SIZES) {
    if (w > origW) continue;
    const h = Math.round(origH * (w / origW));
    const webpPath = join(dir, `${name}-${w}w.webp`);
    const avifPath = join(dir, `${name}-${w}w.avif`);

    await sharp(filePath).resize(w, h).webp({ quality: WEBP_QUALITY }).toFile(webpPath);
    const webpStat = await stat(webpPath);

    await sharp(filePath).resize(w, h).avif({ quality: AVIF_QUALITY }).toFile(avifPath);
    const avifStat = await stat(avifPath);

    results.push({
      size: w,
      webp: `${(webpStat.size / 1024).toFixed(1)}K`,
      avif: `${(avifStat.size / 1024).toFixed(1)}K`
    });
  }

  // Also generate full-size WebP + AVIF
  const fullWebp = join(dir, `${name}.webp`);
  const fullAvif = join(dir, `${name}.avif`);
  await sharp(filePath).webp({ quality: WEBP_QUALITY }).toFile(fullWebp);
  await sharp(filePath).avif({ quality: AVIF_QUALITY }).toFile(fullAvif);
  const origStat = await stat(filePath);
  const fullWebpStat = await stat(fullWebp);
  const fullAvifStat = await stat(fullAvif);

  results.push({
    size: origW,
    webp: `${(fullWebpStat.size / 1024).toFixed(1)}K`,
    avif: `${(fullAvifStat.size / 1024).toFixed(1)}K`
  });

  console.log(`${name}.jpg (${origW}x${origH}, ${(origStat.size / 1024).toFixed(0)}K)`);
  console.log(`  dimensions: ${origW}x${origH}`);
  for (const r of results) {
    console.log(`  ${r.size}w -> WebP: ${r.webp}, AVIF: ${r.avif}`);
  }
  return { name, dir, origW, origH };
}

async function main() {
  const files = await getJpgFiles(IMG_DIR);
  console.log(`Found ${files.length} JPEG files to process\n`);

  const manifest = [];
  for (const f of files) {
    const info = await processImage(f);
    manifest.push(info);
    console.log('');
  }

  console.log('\n=== DONE ===');
  console.log(`Processed ${manifest.length} images with ${SIZES.length} sizes each`);
  console.log('Formats: AVIF (primary) + WebP (fallback) + JPEG (legacy)');
}

main().catch(console.error);
