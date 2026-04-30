import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = 'img/escape';
const WIDTHS = [480, 768, 1024];
const FORMATS = ['jpg', 'webp', 'avif'];

const MAP = [
  { src: 'img/Back (1).png', slug: 'salle-back-to-80s-borne-arcade-pacman' },
  { src: 'img/Back (2).png', slug: 'salle-back-to-80s-cabine-telephone-graffiti' },
  { src: 'img/Back (3).png', slug: 'salle-back-to-80s-jukebox-wurlitzer-figurines' },
  { src: 'img/Garde à vue (1).png', slug: 'salle-garde-a-vue-cellule-banc-toilettes' },
  { src: 'img/Garde à vue (2).png', slug: 'salle-garde-a-vue-barreaux-poste-garde' },
  { src: 'img/Garde à vue (3).png', slug: 'salle-garde-a-vue-scanner-empreinte-entree' },
  { src: 'img/Garde à vue (4).png', slug: 'salle-garde-a-vue-menottes-barreaux-wc' },
  { src: 'img/Psy (1).png', slug: 'salle-asile-psychiatrique-couloir-fauteuil-roulant' },
  { src: 'img/Psy (2).png', slug: 'salle-asile-psychiatrique-contention-poignet-lit' },
  { src: 'img/Psy (3).png', slug: 'salle-asile-psychiatrique-sangle-service-psy' },
  { src: 'img/Psy (4).png', slug: 'salle-asile-psychiatrique-porte-mains-sang' },
];

const QUALITY = { jpg: 82, webp: 80, avif: 55 };

fs.mkdirSync(OUT_DIR, { recursive: true });

async function emit(input, slug, width, fmt) {
  const suffix = width ? `-${width}w` : '';
  const ext = fmt === 'jpg' ? 'jpg' : fmt;
  const out = path.join(OUT_DIR, `${slug}${suffix}.${ext}`);
  let pipe = sharp(input);
  if (width) pipe = pipe.resize({ width, withoutEnlargement: true });
  if (fmt === 'jpg') pipe = pipe.jpeg({ quality: QUALITY.jpg, mozjpeg: true });
  else if (fmt === 'webp') pipe = pipe.webp({ quality: QUALITY.webp });
  else if (fmt === 'avif') pipe = pipe.avif({ quality: QUALITY.avif });
  await pipe.toFile(out);
  const size = fs.statSync(out).size;
  return { out, size };
}

async function run() {
  let total = 0;
  for (const { src, slug } of MAP) {
    if (!fs.existsSync(src)) {
      console.log(`SKIP ${src} (not found)`);
      continue;
    }
    const meta = await sharp(src).metadata();
    console.log(`\n=== ${slug} (${meta.width}x${meta.height}) ===`);
    const widths = [null, ...WIDTHS.filter(w => w < meta.width)];
    for (const w of widths) {
      for (const fmt of FORMATS) {
        const { out, size } = await emit(src, slug, w, fmt);
        console.log(`  ${path.basename(out).padEnd(75)} ${(size/1024).toFixed(0).padStart(5)} KB`);
        total++;
      }
    }
  }
  console.log(`\n${total} variants generated.`);
}

run().catch(e => { console.error(e); process.exit(1); });
