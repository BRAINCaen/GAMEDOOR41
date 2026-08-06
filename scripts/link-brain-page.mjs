#!/usr/bin/env node
// Pose les liens internes vers /brain-devient-gamedoor41/ sur tout le site.
//
// Cette page recueille les requetes "brain caen", "brain escape game caen",
// "buzz your brain caen" — 188 clics/mois accroches a l'ancienne marque que
// plus aucune page n'accueillait (audit Search Console 06/08/2026).
//
// Trois points d'entree, poses sur les deux variantes de gabarit du site
// (menu A = accueil + articles avec home-v33.css, menu B = les autres) :
//   1. le menu mobile, en bas de la liste ;
//   2. le pied de page ;
//   3. le bandeau heritage "Brain Escape Game + Buzz Your Brain = GAMEDOOR·41",
//      qui devient cliquable — c'est l'ancre la plus riche en mots-cles et elle
//      est deja presente sur 21 pages.
//
// Le menu DESKTOP n'est volontairement pas touche : ses 8 entrees tiennent
// sur une seule ligne grace a deux paliers de reduction de police
// (css/style.css, media queries 980px et 980-1180px). Une 9e entree la ferait
// passer a la ligne sur les portables. A rediscuter si on accepte d'en retirer
// une autre.
//
// Idempotent : relancer le script ne cree pas de doublon.
//
// Usage : node scripts/link-brain-page.mjs [--dry-run]

import fs from 'node:fs';
import { execSync } from 'node:child_process';

const URL_PAGE = '/brain-devient-gamedoor41/';
const dryRun = process.argv.includes('--dry-run');

const fichiers = execSync('git ls-files "*.html"', { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)
  .filter((f) => !/^(_archive|_wip|extracted-v33|node_modules)\//.test(f))
  .filter((f) => !f.startsWith('brain-devient-gamedoor41/'));

// --- 1. Menu mobile ------------------------------------------------------

const NAV_A = '<a href="/contact/" class="nav-link" data-icon="📍">Contact</a>';
const NAV_A_NEW = `${NAV_A}\n        <a href="${URL_PAGE}" class="nav-link nav-link-mobile" data-icon="🔁">Brain devient GAMEDOOR·41</a>`;

const NAV_B = '<a href="https://braincaen.4escape.io/booking" class="mobile-only nav-cta-mobile"';
const NAV_B_NEW = `<a href="${URL_PAGE}" class="mobile-only">Brain devient GAMEDOOR·41</a>\n        ${NAV_B}`;

function poserMenu(html) {
  if (html.includes(NAV_A)) return html.replace(NAV_A, NAV_A_NEW);
  if (html.includes(NAV_B)) return html.replace(NAV_B, NAV_B_NEW);
  return html;
}

// --- 2. Pied de page -----------------------------------------------------

const LIEN_FOOTER_B = `          <p style="margin-top:12px;"><a href="${URL_PAGE}">Anciennement Brain Escape Game &amp; Buzz Your Brain</a></p>\n        `;
const LIEN_FOOTER_A = `\n          <li><a href="${URL_PAGE}">Brain devient GAMEDOOR·41</a></li>`;

// Le site compte cinq gabarits de pied de page differents. On les traite du
// plus specifique au plus generique, et on s'arrete au premier qui matche.
const FIN_INFOS_ARTICLE = '<a href="/magazine/">Magazine</a></div>';
const LEGAL_MINIMAL = '<p class="footer-legal">© 2026 GAMEDOOR·41';
const LEGAL_RESTAURATION = '<p style="margin:0 0 6px;">&copy; 2026 GAMEDOOR·41';

function poserFooter(html) {
  // 1. Gabarit B : juste avant la premiere colonne, donc en fin de bloc marque.
  const iBrand = html.indexOf('<div class="footer-brand">');
  if (iBrand !== -1) {
    const iCol = html.indexOf('<div class="footer-col"', iBrand);
    if (iCol !== -1) {
      return html.slice(0, iCol) + LIEN_FOOTER_B.trimStart() + '\n        ' + html.slice(iCol);
    }
  }

  // 2. Accueil : liste "Infos" en <ul>.
  const iInfos = html.indexOf('<h4>Infos</h4>');
  if (iInfos !== -1) {
    const iUl = html.indexOf('<ul>', iInfos);
    // Le <ul> doit appartenir au bloc Infos, pas a une section plus bas.
    if (iUl !== -1 && iUl - iInfos < 40) {
      const fin = iUl + '<ul>'.length;
      return html.slice(0, fin) + LIEN_FOOTER_A + html.slice(fin);
    }
  }

  // 3. Articles du magazine : colonne "Infos" en <a> successifs.
  if (html.includes(FIN_INFOS_ARTICLE)) {
    return html.replace(
      FIN_INFOS_ARTICLE,
      `<a href="/magazine/">Magazine</a><a href="${URL_PAGE}">Brain devient GAMEDOOR·41</a></div>`,
    );
  }

  // 4. Page Avis : la mention existe deja en texte, on la lie.
  const mention = 'Anciennement <em>Brain Escape Game</em>';
  if (html.includes(mention)) {
    return html.replace(mention, `Anciennement <a href="${URL_PAGE}"><em>Brain Escape Game</em></a>`);
  }

  // 5. Pieds de page reduits (magazine, restauration) : ligne ajoutee avant le
  //    copyright.
  for (const ancre of [LEGAL_MINIMAL, LEGAL_RESTAURATION]) {
    if (html.includes(ancre)) {
      const classe = ancre === LEGAL_MINIMAL ? ' class="footer-legal"' : '';
      return html.replace(
        ancre,
        `<p${classe}><a href="${URL_PAGE}">Anciennement Brain Escape Game &amp; Buzz Your Brain</a></p>\n    ${ancre}`,
      );
    }
  }

  return html;
}

// --- 3. Bandeau heritage cliquable ---------------------------------------

const BANDEAU = '<span class="heritage-eq"><strong>Brain Escape Game + Buzz Your Brain = GAMEDOOR·41</strong></span>';
const BANDEAU_NEW = `<span class="heritage-eq"><a href="${URL_PAGE}"><strong>Brain Escape Game + Buzz Your Brain = GAMEDOOR·41</strong></a></span>`;

function poserBandeau(html) {
  return html.includes(BANDEAU) ? html.replace(BANDEAU, BANDEAU_NEW) : html;
}

// --- Execution -----------------------------------------------------------

let modifies = 0;
const compteurs = { menu: 0, footer: 0, bandeau: 0, deja: 0, sansAncrage: [] };

for (const f of fichiers) {
  const avant = fs.readFileSync(f, 'utf8');
  if (avant.includes(`href="${URL_PAGE}"`)) { compteurs.deja++; continue; }

  let apres = poserMenu(avant);
  if (apres !== avant) compteurs.menu++;
  const apresMenu = apres;

  apres = poserFooter(apres);
  if (apres !== apresMenu) compteurs.footer++;
  const apresFooter = apres;

  apres = poserBandeau(apres);
  if (apres !== apresFooter) compteurs.bandeau++;

  if (apres === avant) { compteurs.sansAncrage.push(f); continue; }
  if (!dryRun) fs.writeFileSync(f, apres, 'utf8');
  modifies++;
}

console.log(`${fichiers.length} pages examinees`);
console.log(`  menu mobile   : ${compteurs.menu}`);
console.log(`  pied de page  : ${compteurs.footer}`);
console.log(`  bandeau lie   : ${compteurs.bandeau}`);
console.log(`  deja liees    : ${compteurs.deja}`);
console.log(`\n${modifies} fichier(s) ${dryRun ? 'seraient modifies' : 'modifies'}.`);
if (compteurs.sansAncrage.length) {
  console.log(`\nAucun ancrage trouve sur ${compteurs.sansAncrage.length} page(s) — a traiter a la main :`);
  compteurs.sansAncrage.forEach((f) => console.log('  - ' + f));
}
