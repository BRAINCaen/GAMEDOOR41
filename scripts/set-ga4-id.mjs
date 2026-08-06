#!/usr/bin/env node
// Remplace l'identifiant de mesure Google Analytics sur toutes les pages, et
// active la mesure inter-domaines vers la reservation.
//
// Contexte : l'ancien suivi (G-2ENESBTXTE) est une propriete creee pour le
// site Wix en 2024. Elle ne mesure plus rien depuis le 30/09/2025 et ne
// concerne de toute facon pas gamedoor41.fr. Il faut donc une propriete neuve
// (creee a la main sur analytics.google.com, cf. apps-script/
// rapport-seo-gamedoor41/INSTALLATION.md etape 4) puis poser son identifiant
// ici.
//
// La mesure inter-domaines est ajoutee dans le code en plus du reglage dans
// l'interface Analytics. Sans elle, un visiteur qui part reserver sur
// braincaen.4escape.io est compte comme une visite perdue, puis comme un
// nouveau visiteur inconnu : la reservation n'est jamais rattachee a la
// source qui l'a amenee, et tout le referencement devient impossible a juger.
//
// Usage :
//   node scripts/set-ga4-id.mjs G-XXXXXXXXXX [--dry-run]

import fs from 'node:fs';
import { execSync } from 'node:child_process';

const ANCIEN = 'G-2ENESBTXTE';
const DOMAINES = ['gamedoor41.fr', 'braincaen.4escape.io'];

const nouveau = process.argv.find((a) => /^G-[A-Z0-9]{6,}$/.test(a));
const dryRun = process.argv.includes('--dry-run');

if (!nouveau) {
  console.error('Identifiant de mesure manquant.');
  console.error('Usage : node scripts/set-ga4-id.mjs G-XXXXXXXXXX [--dry-run]');
  console.error('\nOu le trouver : analytics.google.com > Administration >');
  console.error('Flux de donnees > le flux gamedoor41.fr > "ID de mesure".');
  process.exit(1);
}

const pages = execSync('git ls-files "*.html"', { encoding: 'utf8' })
  .split('\n').filter(Boolean)
  .filter((f) => !/^(_archive|_wip|extracted-v33|node_modules)\//.test(f));

// Le snippet complet, avec la mesure inter-domaines.
const config = `gtag('config','${nouveau}',{linker:{domains:${JSON.stringify(DOMAINES)}}});`;

let modifiees = 0, sansBalise = [];

for (const page of pages) {
  const avant = fs.readFileSync(page, 'utf8');
  if (!avant.includes(ANCIEN) && !avant.includes(nouveau)) { sansBalise.push(page); continue; }

  let apres = avant
    // l'URL du tag manager et les eventuels autres appels
    .split(ANCIEN).join(nouveau)
    // remplace la config simple par la config inter-domaines
    .replace(new RegExp(`gtag\\('config','${nouveau}'\\);`, 'g'), config)
    .replace(new RegExp(`gtag\\('config',\\s*'${nouveau}'\\s*\\);`, 'g'), config);

  if (apres === avant) continue;
  if (!dryRun) fs.writeFileSync(page, apres, 'utf8');
  modifiees++;
}

console.log(`${pages.length} pages · ${modifiees} ${dryRun ? 'seraient modifiees' : 'modifiees'}`);
console.log(`  ancien identifiant : ${ANCIEN}`);
console.log(`  nouveau            : ${nouveau}`);
console.log(`  mesure inter-domaines : ${DOMAINES.join(' + ')}`);

if (sansBalise.length) {
  console.log(`\n${sansBalise.length} page(s) sans balise Analytics — a traiter a la main :`);
  sansBalise.forEach((p) => console.log('  - ' + p));
}

console.log('\nApres execution : relancer node scripts/perf-assets.mjs si un CSS/JS a bouge,');
console.log('puis verifier en ligne avec le rapport Temps reel d Analytics.');
