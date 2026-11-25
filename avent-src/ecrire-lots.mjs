#!/usr/bin/env node
// Réécrit, dans calendrier-de-l-avent/index.html, la rubrique « Les lots » et la ligne « Lots » du
// règlement à partir de avent-src/lots-2026.mjs (entre les repères <!-- lots:debut --> … <!-- lots:fin -->
// et <!-- lots-reglement:debut --> … <!-- lots-reglement:fin -->).
//   node avent-src/ecrire-lots.mjs            réécrit la page
//   node avent-src/ecrire-lots.mjs --verifier ne touche à rien, sort en erreur si la page n'est pas à jour
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ETOILES, JEUX, FINAUX, PLACE_QUIZ, PLACE_ESCAPE } from './lots-2026.mjs';

const PAGE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'calendrier-de-l-avent', 'index.html');
const SEMAINE = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const jourDe = (j) => SEMAINE[new Date(2026, 11, j).getDay()];
const numero = (j) => (j === 1 ? '1er' : String(j));
const h = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const liste = (mots) => (mots.length < 2 ? mots.join('') : mots.slice(0, -1).join(', ') + ' et ' + mots[mots.length - 1]);

/** « dimanches 6, 13 et 20, jeudi 24 » */
function etoilesEnClair() {
  const parJour = {};
  ETOILES.forEach((j) => { (parJour[jourDe(j)] = parJour[jourDe(j)] || []).push(j); });
  return Object.keys(parJour).map((nom) => nom + (parJour[nom].length > 1 ? 's ' : ' ') + liste(parJour[nom].map(numero))).join(', ');
}

export function rubrique() {
  const jours = Object.keys(JEUX).map(Number).sort((a, b) => a - b);
  const cartes = [
    ['orange', 'Chaque jour', PLACE_QUIZ + ' offerte', 'Un gagnant tiré au sort parmi les joueurs du jour, que la réponse soit juste ou non. Une place pour une session de quiz Buzz Your Brain, de 4 à 16 candidats.'],
    ['or', '★ ' + etoilesEnClair() + ' décembre', PLACE_ESCAPE + ' offerte', 'Les jours à étoile, la place de quiz devient une place d’escape game, dans la salle de votre choix : Garde à Vue, Psychiatric ou Back to the 80’s.'],
    ['or', FINAUX.grand.quand, FINAUX.grand.nom, FINAUX.grand.detail],
    ['orange', FINAUX.assidus.quand, FINAUX.assidus.nom, FINAUX.assidus.detail],
  ];
  const L = [];
  L.push('<div class="section-header"><p class="kicker">Les lots</p><h2>Un gagnant chaque jour, et ' + (jours.length + 1) + ' cadeaux en plus</h2></div>');
  L.push('<ul class="av-lots">');
  cartes.forEach(([teinte, quand, titre, texte]) => L.push('  <li class="av-carte av-lot av-lot--' + teinte + '"><p class="av-lot-quand">' + h(quand) + '</p><h3>' + h(titre.charAt(0).toUpperCase() + titre.slice(1)) + '</h3><p>' + h(texte) + '</p></li>'));
  L.push('</ul>');
  L.push('<h3 class="av-jeux-titre">' + jours.length + ' jours, un jeu en plus de la place</h3>');
  L.push('<p class="av-jeux-intro">Ces jours-là, le gagnant du jour repart avec sa place et avec un jeu, choisi dans l’univers de la porte.</p>');
  L.push('<ol class="av-jeux">');
  jours.forEach((j) => {
    const x = JEUX[j], etoile = ETOILES.includes(j);
    L.push('  <li class="av-jeu av-teinte--' + x.univers + '"><span class="av-jeu-porte" aria-hidden="true">' + j + '</span><div><p class="av-jeu-quand">' + (etoile ? '★ ' : '') + h(jourDe(j) + ' ' + numero(j) + ' décembre') + '</p><h4>' + h(x.nom) + (x.sous ? ' <span>' + h(x.sous) + '</span>' : '') + '</h4><p>' + h(x.detail) + '</p><p class="av-jeu-place">Avec ' + h(etoile ? PLACE_ESCAPE : PLACE_QUIZ) + '</p></div></li>');
  });
  L.push('</ol>');
  L.push('<p class="av-note">Le tirage du jour se fait parmi les portes ouvertes le jour même. Le grand tirage et le tirage des 24 portes sont annoncés le 25 décembre à midi. Tickets : 1 par porte ouverte le jour même, 1 de plus si la réponse est juste, 1 pour une porte ouverte en retard. Places offertes valables 12 mois. Jeux à retirer à l’accueil, à Mondeville, avant le 28 février 2027. Lots non échangeables et non remboursables.</p>');
  return L.map((l) => '        ' + l).join('\n');
}

export function ligneReglement() {
  const jours = Object.keys(JEUX).map(Number).sort((a, b) => a - b);
  const jeux = jours.map((j) => 'le ' + numero(j) + ' : ' + JEUX[j].court).join(' ; ');
  return '            <li><strong>Lots.</strong> Chaque jour : ' + h(PLACE_QUIZ) + ' Buzz Your Brain. Les ' + h(liste(ETOILES.map(numero))) + ' décembre : ' + h(PLACE_ESCAPE) + ' à la place. Certains jours, le gagnant reçoit en plus un jeu (' + h(jeux) + '). Grand tirage : ' + h(FINAUX.grand.lot) + '. Tirage des 24 portes : ' + h(FINAUX.assidus.lot) + '. Les places et la session sont des codes à saisir à la réservation sur gamedoor41.fr, valables 12 mois. Les jeux et la DeLorean sont à retirer à l’accueil, à Mondeville, avant le 28 février 2027 : passé cette date, ils sont perdus. Les lots ne sont ni échangeables ni remboursables.</li>';
}

function remplacer(page, nom, contenu) {
  const debut = '<!-- ' + nom + ':debut', fin = '<!-- ' + nom + ':fin -->';
  const a = page.indexOf(debut), b = page.indexOf(fin);
  if (a < 0 || b < 0 || b < a) throw new Error('Repères « ' + nom + ' » absents de la page.');
  const finDebut = page.indexOf('-->', a) + 3;
  const retrait = page.slice(page.lastIndexOf('\n', b) + 1, b);
  return page.slice(0, finDebut) + '\n' + contenu + '\n' + retrait + page.slice(b);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const avant = fs.readFileSync(PAGE, 'utf8');
  const crlf = avant.includes('\r\n');
  let page = avant.replace(/\r\n/g, '\n');
  page = remplacer(page, 'lots', rubrique());
  page = remplacer(page, 'lots-reglement', ligneReglement());
  if (crlf) page = page.replace(/\n/g, '\r\n');
  if (process.argv.includes('--verifier')) {
    if (page !== avant) { console.error('La page n’est pas à jour : lancer « node avent-src/ecrire-lots.mjs ».'); process.exit(1); }
    console.log('Rubrique « Les lots » à jour.');
  } else {
    if (page !== avant) fs.writeFileSync(PAGE, page);
    console.log(page !== avant ? 'Rubrique « Les lots » et règlement réécrits.' : 'Déjà à jour.');
  }
}
