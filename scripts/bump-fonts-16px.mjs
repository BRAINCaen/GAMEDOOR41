#!/usr/bin/env node
// Bump toutes les font-size < 16px à 16px dans les CSS du site.
// SAFE: ne touche QUE les déclarations `font-size:` (regex stricte),
// pas le code, pas les HTML, pas les autres propriétés.
import fs from 'node:fs';
import path from 'node:path';

const FILES = [
  'css/home-v33.css',
  'css/post.css',
  'css/style.css',
];
const MIN_PX = 16;

for (const file of FILES) {
  if (!fs.existsSync(file)) {
    console.log(`SKIP ${file} (n'existe pas)`);
    continue;
  }
  let content = fs.readFileSync(file, 'utf8');
  const bumps = [];

  // 1) font-size: Npx (où N est un nombre entier ou décimal)
  content = content.replace(/font-size:\s*(\d+(?:\.\d+)?)px/g, (m, n) => {
    const v = parseFloat(n);
    if (v < MIN_PX) {
      bumps.push(`${v}px → 16px`);
      return `font-size: ${MIN_PX}px`;
    }
    return m;
  });

  // 2) font-size: 0.Xrem ou .Xrem (root assumé à 16px)
  content = content.replace(/font-size:\s*(0?\.\d+)rem/g, (m, n) => {
    const v = parseFloat(n);
    const px = v * 16;
    if (px < MIN_PX) {
      bumps.push(`${v}rem (=${px}px) → 1rem`);
      return `font-size: 1rem`;
    }
    return m;
  });

  // 3) font-size: clamp(MINpx, ..., MAXpx) — bump le mini si < 16
  content = content.replace(
    /font-size:\s*clamp\(\s*(\d+(?:\.\d+)?)px\s*,([^)]+),\s*(\d+(?:\.\d+)?)px\s*\)/g,
    (m, mn, mid, mx) => {
      const minV = parseFloat(mn);
      if (minV < MIN_PX) {
        bumps.push(`clamp ${minV}px,...,${mx}px → clamp 16px,...,${mx}px`);
        return `font-size: clamp(${MIN_PX}px,${mid},${mx}px)`;
      }
      return m;
    },
  );

  if (bumps.length > 0) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`\n${file}: ${bumps.length} bumps`);
    bumps.forEach((b, i) => console.log(`  ${i + 1}. ${b}`));
  } else {
    console.log(`${file}: rien à bumper (tout est déjà ≥ 16px)`);
  }
}

console.log('\n✓ Toutes les font-size < 16px ont été bumpées à 16px.');
