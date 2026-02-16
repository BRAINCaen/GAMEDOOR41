import sharp from 'sharp';
import { readdir, stat } from 'fs/promises';
import { join, basename, extname } from 'path';

const IMG_DIR = '/home/user/GAMEDOOR41/img';
const SIZES = [480, 768, 1024];
const JPEG_QUALITY = 80;

async function getJpgFiles(dir) {
  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await getJpgFiles(fullPath));
    } else if (/\.jpe?g$/i.test(entry.name) && !/-\d+w\.jpg$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

async function main() {
  const files = await getJpgFiles(IMG_DIR);
  console.log(`Found ${files.length} original JPEG files\n`);

  for (const filePath of files) {
    const name = basename(filePath, extname(filePath));
    const dir = filePath.replace(/\/[^/]+$/, '');
    const meta = await sharp(filePath).metadata();
    const origW = meta.width;
    const origH = meta.height;

    console.log(`${name}.jpg (${origW}x${origH})`);

    for (const w of SIZES) {
      if (w >= origW) continue;
      const h = Math.round(origH * (w / origW));
      const outPath = join(dir, `${name}-${w}w.jpg`);
      await sharp(filePath).resize(w, h).jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toFile(outPath);
      const s = await stat(outPath);
      console.log(`  -> ${name}-${w}w.jpg (${(s.size / 1024).toFixed(1)}K)`);
    }
  }

  console.log('\nDone!');
}

main().catch(console.error);
