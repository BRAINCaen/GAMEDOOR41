#!/usr/bin/env node
/**
 * Ajoute au pied de page les trois pages qui existent mais que personne ne
 * croise : /avis/, /escape-game-famille-caen/ et /escape-game-enfant-caen/.
 *
 * Le site a trois pieds de page differents selon le gabarit (cf. CLAUDE.md) :
 * listes <ul><li>, colonnes "Activites", ou liens compactes sur une seule
 * ligne pour les articles. Plutot que de coder les trois, le script repere le
 * lien qui doit servir d'ancre PAR SON ADRESSE, recopie sa mise en forme
 * (avec ou sans <li>, saut de ligne ou non) et insere juste apres. C'est ce
 * qui evite de casser les pieds de page ecrits sur une seule ligne.
 *
 * Idempotent : une page qui porte deja le lien est laissee telle quelle.
 *
 * Usage : node scripts/link-avis-segments.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

const RACINE = path.resolve(import.meta.dirname, '..');
const IGNORE = ['node_modules', '_archive', '_wip', 'extracted-v33',
  'gamedoor41-design-system', 'marketing', '.git', 'apps-script', 'scripts', 'netlify'];

/* Chaque entree : le lien a poser, et les adresses derriere lesquelles le
   poser, par ordre de preference. */
const AJOUTS = [
  { href: '/escape-game-famille-caen/', texte: 'Escape Game en famille',
    apres: ['/quiz-game-caen/', '/escape-game-caen/'] },
  { href: '/escape-game-enfant-caen/', texte: 'Escape Game enfant',
    apres: ['/escape-game-famille-caen/', '/quiz-game-caen/'] },
  { href: '/avis/', texte: 'Avis clients',
    apres: ['/tarifs/', '/magazine/', '/faq/', '/contact/'] },
];

function pages(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (IGNORE.includes(e.name)) continue;
      pages(path.join(dir, e.name), out);
    } else if (e.name === 'index.html') out.push(path.join(dir, e.name));
  }
  return out;
}

/* Le premier <a href="cible"> du pied de page : ou il commence, ou il finit. */
function reperer(footer, cible) {
  const i = footer.indexOf('<a href="' + cible + '"');
  if (i < 0) return null;
  const f = footer.indexOf('</a>', i);
  if (f < 0) return null;
  return { debut: i, fin: f + 4 };
}

function poser(footer, ajout) {
  if (footer.indexOf('href="' + ajout.href + '"') >= 0) return null;
  for (const cible of ajout.apres) {
    const a = reperer(footer, cible);
    if (!a) continue;

    /* Le lien ancre est-il dans un <li> ? Est-il seul sur sa ligne ? */
    const avant = footer.slice(Math.max(0, a.debut - 6), a.debut);
    const apres = footer.slice(a.fin, a.fin + 6);
    const dansLi = avant.endsWith('<li>') && apres.startsWith('</li>');
    const finBalise = dansLi ? a.fin + 5 : a.fin;
    const suite = footer.slice(finBalise, finBalise + 1);

    let lien = '<a href="' + ajout.href + '">' + ajout.texte + '</a>';
    if (dansLi) lien = '<li>' + lien + '</li>';

    let insertion = lien;
    if (suite === '\n') {
      /* L'ancre termine sa ligne : on garde la mise en page en colonne, avec
         la meme indentation — uniquement les espaces de debut de ligne. */
      const debutLigne = footer.lastIndexOf('\n', a.debut) + 1;
      const brut = footer.slice(debutLigne, a.debut);
      const espaces = brut.length === brut.trimStart().length === false
        ? brut.slice(0, brut.length - brut.trimStart().length)
        : brut.match(/^[ \t]*/)[0];
      insertion = '\n' + espaces + lien;
    }
    return footer.slice(0, finBalise) + insertion + footer.slice(finBalise);
  }
  return undefined; // aucune ancre trouvee
}

let touchees = 0, ajoutes = 0;
const sansAncre = [];

for (const f of pages(RACINE)) {
  const html = fs.readFileSync(f, 'utf8');
  const d = html.indexOf('<footer');
  const fin = html.indexOf('</footer>');
  if (d < 0 || fin < 0) continue;

  let footer = html.slice(d, fin);
  let n = 0;
  for (const a of AJOUTS) {
    const r = poser(footer, a);
    if (r === undefined) { sansAncre.push(path.relative(RACINE, f) + ' -> ' + a.href); continue; }
    if (r === null) continue;
    footer = r; n++;
  }
  if (!n) continue;
  fs.writeFileSync(f, html.slice(0, d) + footer + html.slice(fin), 'utf8');
  touchees++; ajoutes += n;
}

console.log(touchees + ' pages modifiees, ' + ajoutes + ' liens ajoutes');
if (sansAncre.length) {
  console.log(sansAncre.length + ' insertion(s) sans ancre (pied de page reduit) :');
  for (const s of sansAncre.slice(0, 6)) console.log('  ' + s);
  if (sansAncre.length > 6) console.log('  ...');
}
