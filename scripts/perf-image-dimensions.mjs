#!/usr/bin/env node
// Ajoute width et height sur toutes les balises <img> du site.
//
// Pourquoi : sans dimensions declarees, le navigateur ne connait pas la place
// que prendra l'image tant qu'il ne l'a pas telechargee. Il affiche donc le
// texte, puis le decale quand l'image arrive. C'est le "saut de mise en page"
// que Google mesure (CLS) et il est particulierement penible au telephone,
// d'ou viennent 87 % des visites. Audit du 06/08/2026 : 326 balises sur 483
// n'avaient pas ses dimensions.
//
// Les valeurs sont lues dans le fichier image lui-meme, jamais inventees.
// Les attributs HTML width/height ne changent pas l'affichage : le CSS du
// site (largeurs en %, .gd-icon en em) reste prioritaire. Ils ne servent qu'a
// donner le rapport largeur/hauteur avant le telechargement.
//
// Idempotent : relancer ne fait rien de plus.
//
// Usage : node scripts/perf-image-dimensions.mjs [--dry-run]

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import sharp from 'sharp';

const ROOT = process.cwd();
const dryRun = process.argv.includes('--dry-run');

const pages = execSync('git ls-files "*.html"', { encoding: 'utf8' })
  .split('\n').filter(Boolean)
  .filter((f) => !/^(_archive|_wip|extracted-v33|node_modules|signatures)\//.test(f));

// Un <img ...> en respectant les guillemets, pour ne pas couper sur un ">"
// present dans un attribut.
const RE_IMG = /<img\b(?:[^>"']|"[^"]*"|'[^']*')*>/g;

const cache = new Map();

// Les SVG sont lus a la main : sharp leur applique une densite et renvoie des
// dimensions rendues, pas les dimensions declarees. Ici on veut le rapport
// d'aspect d'origine.
function dimensionsSvg(fichier) {
  const src = fs.readFileSync(fichier, 'utf8').slice(0, 2000);
  const w = src.match(/\bwidth="([\d.]+)(?:px)?"/)?.[1];
  const h = src.match(/\bheight="([\d.]+)(?:px)?"/)?.[1];
  if (w && h) return { width: Math.round(+w), height: Math.round(+h) };
  const vb = src.match(/\bviewBox="[\d.\-]+\s+[\d.\-]+\s+([\d.]+)\s+([\d.]+)"/);
  if (vb) return { width: Math.round(+vb[1]), height: Math.round(+vb[2]) };
  return null;
}

async function dimensions(srcAttr) {
  if (cache.has(srcAttr)) return cache.get(srcAttr);
  const fichier = path.join(ROOT, srcAttr.split('?')[0]);
  if (!fs.existsSync(fichier)) { cache.set(srcAttr, null); return null; }
  let d = null;
  try {
    d = srcAttr.endsWith('.svg')
      ? dimensionsSvg(fichier)
      : await (async () => {
        const m = await sharp(fichier).metadata();
        // Une photo prise en portrait porte parfois une rotation EXIF : les
        // dimensions utiles sont alors inversees par rapport au fichier.
        const pivote = m.orientation >= 5 && m.orientation <= 8;
        return pivote
          ? { width: m.height, height: m.width }
          : { width: m.width, height: m.height };
      })();
  } catch {
    d = null;
  }
  cache.set(srcAttr, d);
  return d;
}

let posees = 0;
const irresolues = new Set();
const parPage = [];

for (const page of pages) {
  const avant = fs.readFileSync(page, 'utf8');
  const balises = [...avant.matchAll(RE_IMG)];
  let apres = avant;
  let n = 0;

  // On remplace de la fin vers le debut : les index restent valides.
  for (const m of balises.reverse()) {
    const img = m[0];
    if (/\bwidth\s*=/.test(img) && /\bheight\s*=/.test(img)) continue;

    const src = img.match(/\bsrc="([^"]+)"/)?.[1];
    if (!src || !src.startsWith('/')) { if (src) irresolues.add(src); continue; }

    const d = await dimensions(src);
    if (!d || !d.width || !d.height) { irresolues.add(src); continue; }

    // On retire d'abord un eventuel attribut isole, pour ne pas en avoir deux.
    let nouveau = img
      .replace(/\s+width="[^"]*"/, '')
      .replace(/\s+height="[^"]*"/, '')
      .replace(/^<img/, `<img width="${d.width}" height="${d.height}"`);

    apres = apres.slice(0, m.index) + nouveau + apres.slice(m.index + img.length);
    n++;
  }

  if (n === 0) continue;
  if (!dryRun) fs.writeFileSync(page, apres, 'utf8');
  posees += n;
  parPage.push({ page, n });
}

console.log(`${pages.length} pages · ${posees} balise(s) <img> ${dryRun ? 'seraient completees' : 'completees'}\n`);
parPage.sort((a, b) => b.n - a.n).slice(0, 15)
  .forEach((p) => console.log(`  ${String(p.n).padStart(3)}  ${p.page}`));
if (parPage.length > 15) console.log(`  … et ${parPage.length - 15} autre(s) page(s)`);

if (irresolues.size) {
  console.log(`\n${irresolues.size} image(s) dont les dimensions n'ont pas pu etre lues :`);
  [...irresolues].forEach((s) => console.log('  - ' + s));
}
