#!/usr/bin/env node
// Pose des liens internes CONTEXTUELS depuis les articles du magazine vers
// le sommaire /escape-game-caen/.
//
// Pourquoi : "escape game caen" est passe de 792 clics en juillet 2025 a 442
// en juillet 2026. Le sommaire recevait deja 39 liens depuis les articles,
// mais avec des ancres pauvres : 12 "Voir les salles", 8 "GAMEDOOR·41",
// et seulement 3 sur l'expression reellement recherchee. Google lit l'ancre
// pour comprendre de quoi parle la page d'arrivee.
//
// Methode : on ne fabrique pas de phrase. On cherche, dans les paragraphes
// de l'article, une occurrence DEJA ECRITE de "escape game a Caen" (ou une
// variante) qui n'est pas encore un lien, et on la transforme en lien. Si
// l'expression n'existe nulle part, l'article est laisse tel quel et signale
// — mieux vaut pas de lien qu'une phrase plaquee.
//
// Securite : seuls les <p> SANS aucune balise <a> sont candidats, ce qui rend
// impossible l'imbrication de liens. Les titres, le menu et le pied de page
// ne sont jamais touches. Et surtout : a l'interieur du paragraphe, la
// recherche ne porte QUE sur le texte visible, jamais sur le contenu des
// balises — une premiere version posait le lien dans un attribut alt d'image
// et produisait du HTML casse.
//
// Usage : node scripts/link-escape-hub.mjs [--dry-run] [--max=N]

import fs from 'node:fs';
import { execSync } from 'node:child_process';

const CIBLE = '/escape-game-caen/';
const dryRun = process.argv.includes('--dry-run');
const argMax = process.argv.find((a) => a.startsWith('--max='));
const MAX = argMax ? Number(argMax.split('=')[1]) : Infinity;

// Du plus precis au plus generique : on prefere toujours l'ancre qui contient
// la ville.
const EXPRESSIONS = [
  /escape games? à Caen/i,
  /escape games? caennais/i,
  /escape games? de Caen/i,
  /salles? d['’]escape game/i,
  /escape games?/i,
];

// Remplace la premiere occurrence de `expr` trouvee dans le TEXTE VISIBLE du
// fragment HTML. Le fragment est decoupe en jetons balise / texte, et seuls
// les jetons texte sont examines : impossible de toucher un attribut alt,
// title, src ou style. Rend null si l'expression n'apparait pas en texte.
function lierDansLeTexte(fragment, expr) {
  const jetons = fragment.split(/(<[^>]*>)/);
  for (let i = 0; i < jetons.length; i++) {
    const jeton = jetons[i];
    if (jeton.startsWith('<')) continue; // c'est une balise
    const m = jeton.match(expr);
    if (!m) continue;

    // Ne jamais couper un nom de marque : "Brain Escape Game" est une
    // enseigne, pas une categorie. Ce cas-la doit pointer vers
    // /brain-devient-gamedoor41/, ce qui est deja fait ailleurs.
    const avantMatch = jeton.slice(0, m.index);
    if (/\bBrain\s+$/i.test(avantMatch)) continue;

    const ancre = m[0];
    jetons[i] = jeton.slice(0, m.index) + `<a href="${CIBLE}">${ancre}</a>`
      + jeton.slice(m.index + ancre.length);
    return { contenu: jetons.join(''), ancre };
  }
  return null;
}

// Un <p> mal ferme dans la source fait deborder la capture sur les blocs
// suivants (constate sur escape-game-caen-tarif-etudiant : le lien atterrissait
// dans un <h2>). Si le contenu capture contient un bloc, c'est que la capture
// est fausse — on ecarte le candidat.
const BLOCS_INTERDITS = /<(?:h[1-6]|div|section|aside|table|ul|ol|p)\b/i;

const articles = execSync('git ls-files "post/*/index.html"', { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);

// Nombre de liens contextuels deja presents, pour traiter en priorite les
// articles les plus pauvres.
function compteLiens(html) {
  const debut = html.indexOf('</header>');
  const fin = html.indexOf('<footer');
  const corps = html.slice(debut, fin > 0 ? fin : html.length);
  return (corps.match(new RegExp(`href="${CIBLE}"`, 'g')) || []).length;
}

const classes = articles
  .map((f) => ({ f, html: fs.readFileSync(f, 'utf8') }))
  .map((a) => ({ ...a, liens: compteLiens(a.html) }))
  .sort((a, b) => a.liens - b.liens);

let poses = 0;
const sansExpression = [];
const faits = [];

for (const { f, html, liens } of classes) {
  if (poses >= MAX) break;

  const debut = html.indexOf('</header>');
  const fin = html.indexOf('<footer');
  if (debut === -1 || fin === -1) { sansExpression.push(`${f} (structure inattendue)`); continue; }

  const avant = html.slice(0, debut);
  const corps = html.slice(debut, fin);
  const apres = html.slice(fin);

  // Paragraphes sans aucun lien : seuls candidats surs.
  const paragraphes = [...corps.matchAll(/<p(?![^>]*class="[^"]*(?:kicker|footer)[^"]*")[^>]*>([\s\S]*?)<\/p>/g)]
    .filter((m) => !m[1].includes('<a '))
    .filter((m) => !BLOCS_INTERDITS.test(m[1]));

  let modifie = null;
  for (const expr of EXPRESSIONS) {
    let trouve = null;
    for (const p of paragraphes) {
      const remplace = lierDansLeTexte(p[1], expr);
      if (remplace) { trouve = { p, ...remplace }; break; }
    }
    if (!trouve) continue;
    modifie = corps.slice(0, trouve.p.index)
      + trouve.p[0].replace(trouve.p[1], trouve.contenu)
      + corps.slice(trouve.p.index + trouve.p[0].length);
    faits.push(`${f.replace('post/', '').replace('/index.html', '')}  (avait ${liens}) → « ${trouve.ancre} »`);
    break;
  }

  if (!modifie) { sansExpression.push(f); continue; }

  if (!dryRun) fs.writeFileSync(f, avant + modifie + apres, 'utf8');
  poses++;
}

console.log(`${articles.length} articles examines · ${poses} lien(s) contextuel(s) ${dryRun ? 'seraient poses' : 'poses'}\n`);
faits.forEach((l) => console.log('  + ' + l));
if (sansExpression.length) {
  console.log(`\n${sansExpression.length} article(s) sans expression exploitable, laisses tels quels :`);
  sansExpression.forEach((f) => console.log('  - ' + f));
}
