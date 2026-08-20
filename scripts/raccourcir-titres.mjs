#!/usr/bin/env node
/**
 * Raccourcit les titres coupes par Google (au-dela d'environ 60 caracteres
 * affiches, la fin n'apparait pas dans les resultats).
 *
 * Deux garde-fous, parce qu'un titre est ce qui declenche le clic :
 *  - seules les pages a la fois trop longues ET peu cliquees dans le releve
 *    Search Console sont touchees ; les autres restent telles quelles ;
 *  - tout argument retire du titre doit exister ailleurs sur la page (titre
 *    h1, meta description ou corps). Sinon le script refuse et le signale :
 *    on raccourcit, on ne supprime pas d'information.
 *
 * Usage : node scripts/raccourcir-titres.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

const RACINE = path.resolve(import.meta.dirname, '..');

const TITRES = [
  { page: 'team-building-caen',
    neuf: 'Team Building Caen &middot; Escape Game d\u00e8s 13,64\u20ac HT | GAMEDOOR\u00b741',
    garder: ['Quiz'] },
  { page: 'evjf-caen',
    neuf: 'EVJF Caen &middot; Quiz Mariage &amp; Escape Game | GAMEDOOR\u00b741',
    garder: ['Mari\u00e9e', 'offerte'] },
  { page: 'evg-caen',
    neuf: 'EVG Caen &middot; Escape Game &amp; Quiz Comp\u00e9titif | GAMEDOOR\u00b741',
    garder: ['Mari\u00e9', 'offerte'] },
  { page: 'mariage-caen',
    neuf: 'Animation Mariage Caen &middot; EVJF, EVG, Jour J | GAMEDOOR\u00b741',
    garder: ['offerte'] },
  { page: 'magazine',
    neuf: 'Magazine &middot; Escape Game &amp; Activit\u00e9s \u00e0 Caen | GAMEDOOR\u00b741',
    garder: ['guide'] },
  { page: 'post/halloween-caen-escape-game-psychiatric',
    neuf: 'Halloween 2026 \u00e0 Caen &middot; Escape Game Psychiatric | GAMEDOOR\u00b741',
    garder: ['\u00e9pouvante'] },
  { page: 'post/caen-4eme-ville-etudiante-2026',
    neuf: 'Caen, 4\u1d49 ville \u00e9tudiante 2026 &middot; Id\u00e9es de sorties | GAMEDOOR\u00b741',
    garder: ['France'] },
  { page: 'post/canicule-caen-escape-game-climatise',
    neuf: 'Canicule \u00e0 Caen &middot; Escape Game Climatis\u00e9 | GAMEDOOR\u00b741',
    garder: ['Back to the 80', 'TOP 100'] },
];

/* Longueur telle que Google l'affiche : les entites valent un caractere. */
const affiche = (s) => s
  .replace(/&middot;/g, '\u00b7')
  .replace(/&amp;/g, '&')
  .replace(/&eacute;/g, '\u00e9')
  .replace(/&nbsp;/g, ' ');

let faits = 0;
const refus = [];

for (const t of TITRES) {
  const f = path.join(RACINE, t.page, 'index.html');
  if (!fs.existsSync(f)) { refus.push(t.page + ' : page introuvable'); continue; }
  const html = fs.readFileSync(f, 'utf8');

  const m = html.match(/<title>([\s\S]*?)<\/title>/);
  if (!m) { refus.push(t.page + ' : pas de balise titre'); continue; }
  const ancien = m[1];
  if (affiche(ancien) === affiche(t.neuf)) { continue; }

  /* Le corps de la page, hors balise titre : c'est la qu'on verifie que rien
     d'important ne disparait du site en quittant le titre. */
  const corps = affiche(html.replace(m[0], '')).toLowerCase();
  const perdus = t.garder.filter((g) => !corps.includes(affiche(g).toLowerCase()));
  if (perdus.length) {
    refus.push(t.page + ' : "' + perdus.join('", "') + '" absent(s) du reste de la page — titre inchange');
    continue;
  }

  fs.writeFileSync(f, html.replace(m[0], '<title>' + t.neuf + '</title>'), 'utf8');
  console.log(t.page);
  console.log('   avant ' + String(affiche(ancien).length).padStart(2) + ' car. : ' + affiche(ancien));
  console.log('   apres ' + String(affiche(t.neuf).length).padStart(2) + ' car. : ' + affiche(t.neuf));
  faits++;
}

console.log('\n' + faits + ' titre(s) raccourci(s)');
if (refus.length) {
  console.log('NON MODIFIES :');
  for (const r of refus) console.log('  ' + r);
}
