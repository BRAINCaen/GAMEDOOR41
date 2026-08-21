#!/usr/bin/env node
// Deux corrections de chargement, sur toutes les pages du site.
//
// 1. VERSIONNEMENT DES CSS/JS
//    netlify.toml met /css/* et /js/* en cache "immutable" pendant un an.
//    C'est excellent pour la vitesse... et catastrophique sans empreinte :
//    un visiteur deja venu garde l'ancien CSS pendant douze mois, meme apres
//    une refonte. On ajoute donc ?v=<empreinte du contenu> a chaque lien.
//    L'empreinte ne change QUE si le fichier change — le cache reste donc
//    pleinement efficace, mais une modification atteint tout le monde
//    immediatement.
//
// 2. defer SUR LES SCRIPTS LOCAUX
//    /js/main.js etait charge sans defer sur 25 pages : le navigateur
//    interrompait la construction de la page pour le telecharger et
//    l'executer. Son code est entierement dans un DOMContentLoaded, donc
//    defer ne change rien a son comportement (avec defer, le script
//    s'execute avant que cet evenement ne se declenche).
//
// A RELANCER APRES CHAQUE MODIFICATION D'UN FICHIER CSS OU JS,
// sinon les visiteurs qui reviennent ne verront pas le changement.
//
// Usage : node scripts/perf-assets.mjs [--dry-run]

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const dryRun = process.argv.includes('--dry-run');

const pages = execSync('git ls-files "*.html"', { encoding: 'utf8' })
  .split('\n').filter(Boolean)
  .filter((f) => !/^(_archive|_wip|extracted-v33|node_modules|signatures)\//.test(f));

// --- empreintes ----------------------------------------------------------

const empreintes = new Map();
function empreinte(cheminWeb) {
  if (empreintes.has(cheminWeb)) return empreintes.get(cheminWeb);
  const fichier = path.join(ROOT, cheminWeb);
  let h = null;
  if (fs.existsSync(fichier)) {
    h = crypto.createHash('sha1').update(fs.readFileSync(fichier)).digest('hex').slice(0, 8);
  }
  empreintes.set(cheminWeb, h);
  return h;
}

// --- reecriture ----------------------------------------------------------

let pagesModifiees = 0, liensVersionnes = 0, defersAjoutes = 0;
const introuvables = new Set();

for (const page of pages) {
  const avant = fs.readFileSync(page, 'utf8');
  let apres = avant;

  // 1. ?v= sur les CSS et JS locaux (href ou src), en remplacant une
  //    eventuelle version deja presente.
  apres = apres.replace(
    /((?:href|src)=")(\/(?:css|js)\/[^"?]+\.(?:css|js))(\?v=[a-f0-9]+)?(")/g,
    (tout, avantAttr, chemin, ancienne, apresAttr) => {
      const h = empreinte(chemin);
      if (!h) { introuvables.add(chemin); return tout; }
      const neuf = `${avantAttr}${chemin}?v=${h}${apresAttr}`;
      if (neuf !== tout) liensVersionnes++;
      return neuf;
    },
  );

  // 2. defer sur les <script src="/..."> qui n'ont ni defer ni async.
  apres = apres.replace(/<script\b([^>]*?)\bsrc="(\/[^"]+)"([^>]*)>/g,
    (tout, av, src, ap) => {
      if (/\b(defer|async)\b/.test(av + ap)) return tout;
      defersAjoutes++;
      const autres = av.trim();
      return `<script defer${autres ? ' ' + autres : ''} src="${src}"${ap}>`;
    });

  // Normalise les espaces doubles laisses par une version precedente.
  apres = apres.replace(/<script defer\s{2,}src=/g, '<script defer src=');

  if (apres === avant) continue;
  if (!dryRun) fs.writeFileSync(page, apres, 'utf8');
  pagesModifiees++;
}

console.log(`${pages.length} pages examinees · ${pagesModifiees} modifiee(s)\n`);
console.log(`  liens CSS/JS (re)versionnes : ${liensVersionnes}`);
console.log(`  defer ajoutes               : ${defersAjoutes}`);

console.log('\nempreintes actuelles :');
[...empreintes.entries()].filter(([, h]) => h).sort()
  .forEach(([c, h]) => console.log(`  ${h}  ${c}`));

if (introuvables.size) {
  console.log(`\n${introuvables.size} fichier(s) reference(s) mais absent(s) du depot :`);
  [...introuvables].forEach((c) => console.log('  - ' + c));
}
