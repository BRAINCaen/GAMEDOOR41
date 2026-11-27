/* Calendrier de l'Avent 2026 « Les 24 portes de GAMEDOOR·41 » : le rendre visible sur tout le site.
 *
 *   node scripts/bandeau-avent.mjs            ajoute le lien du menu et le bandeau d'annonce
 *                                             (sans effet sur une page qui les a déjà)
 *   node scripts/bandeau-avent.mjs --retirer  retire tout (à lancer après le 25/12/2026)
 *
 * Ce qui est ajouté sur chaque page qui a le menu du site (61 pages) :
 * - « 🎄 Calendrier de l'Avent » en tête du menu du téléphone ; sur ordinateur, un 🎄 à côté du 🎁
 *   (le menu est déjà plein : un lien écrit en entier pousserait « Contact » et « Réserver » hors de l'écran) ;
 * - un bandeau orange fin, fixé tout en haut de l'écran, qui mène au calendrier
 *   (pas sur la page du calendrier elle-même). Le menu du site descend d'autant : rien n'est caché.
 *
 * Le lien et le bandeau s'effacent tout seuls le 26/12/2026 à 0 h (heure de Paris) : un petit script
 * posé avec le bandeau ajoute la classe `avent-on` sur <html> jusque-là, et les styles (css/style.css et
 * css/home-v33.css, rubrique « Calendrier de l'Avent ») n'affichent rien sans elle. Le --retirer
 * sert seulement à nettoyer les pages ensuite.
 */
import { readFile, writeFile } from 'fs/promises';
import { execFileSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RETIRER = process.argv.includes('--retirer');
const CALENDRIER = '/calendrier-de-l-avent/';
const FIN = 'Date.UTC(2026,11,25,23)'; // 26/12/2026 à 0 h, heure de Paris

const DEBUT_BLOC = '<!-- avent2026:debut -->';
const FIN_BLOC = '<!-- avent2026:fin -->';
const BANDEAU = `${DEBUT_BLOC}
<script>try{if(Date.now()<${FIN})document.documentElement.classList.add('avent-on')}catch(e){}</script>
<a class="avent-bandeau" href="${CALENDRIER}"><span class="avent-bandeau-sapin" aria-hidden="true">🎄</span><strong>Calendrier de l'Avent</strong><span class="avent-bandeau-long">&nbsp;: jeu gratuit, un défi par jour du 1er au 24 décembre, des places et des jeux à gagner</span><span class="avent-bandeau-court">&nbsp;: des places à gagner</span><span class="avent-bandeau-fleche" aria-hidden="true">›</span></a>
${FIN_BLOC}`;
// Pages sans bandeau (le menu reçoit quand même le lien).
const SANS_BANDEAU = new Set(['calendrier-de-l-avent/index.html']);

// Les deux modèles de menu du site : accueil, magazine et articles (« nav-link ») ; pages intérieures.
const MODELES = [
  {
    nom: 'accueil / magazine',
    mobileApres: /(<a href="\/" class="nav-link nav-link-mobile" data-icon="🏠">Accueil<\/a>)/,
    mobile: (actif) => `<a href="${CALENDRIER}" class="nav-link nav-link-mobile avent-lien${actif}" data-icon="🎄" data-avent>Calendrier de l'Avent</a>`,
    bureauApres: /(<a href="\/cadeau\/" class="nav-link nav-link-desktop[^"]*"[^>]*>🎁<\/a>)/,
    bureau: (actif) => `<a href="${CALENDRIER}" class="nav-link nav-link-desktop avent-lien${actif}" aria-label="Calendrier de l'Avent" title="Calendrier de l'Avent" style="font-size:1.5em;line-height:1;" data-avent>🎄</a>`,
  },
  {
    nom: 'pages intérieures',
    mobileApres: /(<a href="\/" class="mobile-only(?: active)?">Accueil<\/a>)/,
    mobile: (actif) => `<a href="${CALENDRIER}" class="mobile-only avent-lien${actif}" data-avent>🎄 Calendrier de l'Avent</a>`,
    bureauApres: /(<a href="\/cadeau\/" class="desktop-only[^"]*"[^>]*>🎁<\/a>)/,
    bureau: (actif) => `<a href="${CALENDRIER}" class="desktop-only avent-lien${actif}" aria-label="Calendrier de l'Avent" title="Calendrier de l'Avent" style="font-size:1.4em;line-height:1;" data-avent>🎄</a>`,
  },
];

function indentation(html, index) {
  const debutLigne = html.lastIndexOf('\n', index) + 1;
  return html.slice(debutLigne, index).match(/^\s*/)[0];
}

function ajouter(html, rel) {
  const modele = MODELES.find((m) => m.mobileApres.test(html) && m.bureauApres.test(html));
  if (!modele) throw new Error(`${rel} : menu non reconnu`);
  const actif = rel === 'calendrier-de-l-avent/index.html' ? ' active' : '';
  const eol = html.includes('\r\n') ? '\r\n' : '\n'; // garder les fins de ligne du fichier
  let out = html;
  if (!out.includes('data-avent>')) {
    for (const [re, lien] of [[modele.mobileApres, modele.mobile(actif)], [modele.bureauApres, modele.bureau(actif)]]) {
      const m = out.match(re);
      const ind = indentation(out, m.index);
      out = out.slice(0, m.index + m[0].length) + eol + ind + lien + out.slice(m.index + m[0].length);
    }
  }
  if (!SANS_BANDEAU.has(rel) && !out.includes(DEBUT_BLOC)) {
    const body = out.match(/<body[^>]*>/);
    if (!body) throw new Error(`${rel} : pas de <body>`);
    const fin = body.index + body[0].length;
    out = out.slice(0, fin) + eol + BANDEAU.replace(/\n/g, eol) + out.slice(fin);
  }
  return out;
}

function retirer(html) {
  return html
    .replace(/\r?\n<!-- avent2026:debut -->[\s\S]*?<!-- avent2026:fin -->/g, '')
    .replace(/\r?\n[ \t]*<a [^>]*data-avent>[^<]*<\/a>/g, '');
}

const fichiers = execFileSync('git', ['ls-files', '*.html'], { cwd: ROOT, encoding: 'utf8' })
  .split('\n').filter(Boolean)
  .filter((f) => !/^(editeur|editeur-src|signatures|apps-script|avent-src|scripts)\//.test(f));

let modifiees = 0, avecMenu = 0;
for (const rel of fichiers) {
  const chemin = join(ROOT, rel);
  const html = await readFile(chemin, 'utf8');
  if (!/id="nav-links-list"|<nav class="nav-links"/.test(html)) continue;
  avecMenu++;
  const neuf = RETIRER ? retirer(html) : ajouter(html, rel);
  if (neuf !== html) { await writeFile(chemin, neuf); modifiees++; }
}
console.log(`${avecMenu} pages avec le menu du site, ${modifiees} modifiée(s) (${RETIRER ? 'retrait' : 'ajout'}).`);
