import sharp from 'sharp';

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

const images = [
  {
    src: '/home/user/GAMEDOOR41/img/escape/garde-a-vue-porte.jpg',
    out: '/home/user/GAMEDOOR41/img/og/og-default.jpg',
    label: 'default (escape porte)'
  },
  {
    src: '/home/user/GAMEDOOR41/img/quiz/salle-quiz.jpg',
    out: '/home/user/GAMEDOOR41/img/og/og-quiz.jpg',
    label: 'quiz (salle quiz)'
  },
  {
    src: '/home/user/GAMEDOOR41/img/escape/garde-a-vue-cellule.jpg',
    out: '/home/user/GAMEDOOR41/img/og/og-escape.jpg',
    label: 'escape (cellule)'
  },
  {
    src: '/home/user/GAMEDOOR41/img/escape/psychiatric-main.jpg',
    out: '/home/user/GAMEDOOR41/img/og/og-psychiatric.jpg',
    label: 'psychiatric'
  },
  {
    src: '/home/user/GAMEDOOR41/img/escape/80s-jukebox.jpg',
    out: '/home/user/GAMEDOOR41/img/og/og-80s.jpg',
    label: '80s'
  }
];

import { mkdir } from 'fs/promises';
await mkdir('/home/user/GAMEDOOR41/img/og', { recursive: true });

for (const img of images) {
  await sharp(img.src)
    .resize(OG_WIDTH, OG_HEIGHT, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 85, mozjpeg: true })
    .toFile(img.out);

  const { size } = await import('fs/promises').then(fs => fs.stat(img.out));
  console.log(`${img.label}: ${img.out} (${(size / 1024).toFixed(1)}K)`);
}

console.log('\nDone!');
