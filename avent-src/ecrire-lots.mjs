#!/usr/bin/env node
// Réécrit, dans calendrier-de-l-avent/index.html, la rubrique « Les lots » et la ligne « Lots » du
// règlement à partir de avent-src/lots-2026.mjs (entre les repères <!-- lots:debut --> … <!-- lots:fin -->
// et <!-- lots-reglement:debut --> … <!-- lots-reglement:fin -->).
//   node avent-src/ecrire-lots.mjs            réécrit la page
//   node avent-src/ecrire-lots.mjs --verifier ne touche à rien, sort en erreur si la page n'est pas à jour
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ETOILES, JEUX, FINAUX, PLACE_QUIZ, PLACE_ESCAPE, IMAGES_PLACES, UNE_PLACE_C_EST, SALLES, PAS_DE_PERDANT } from './lots-2026.mjs';

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
    ['orange', IMAGES_PLACES.quiz, 'photo', 'La salle du quiz Buzz Your Brain', 'Chaque jour', PLACE_QUIZ, 'Un gagnant tiré au sort parmi les joueurs du jour, que la réponse soit juste ou non. ' + UNE_PLACE_C_EST],
    ['or', IMAGES_PLACES.escape, 'photo', 'La salle Garde à Vue', '★ ' + etoilesEnClair() + ' décembre', PLACE_ESCAPE, 'Les jours à étoile, la place de quiz devient une place d’escape game, dans la salle de votre choix : ' + SALLES + '. Elle aussi vaut pour une seule personne.'],
    ['or', FINAUX.grand.image, 'photo', FINAUX.grand.alt, FINAUX.grand.quand, FINAUX.grand.nom, FINAUX.grand.detail],
    ['orange', FINAUX.assidus.image, 'photo', FINAUX.assidus.alt, FINAUX.assidus.quand, FINAUX.assidus.nom, FINAUX.assidus.detail],
  ];
  const L = [];
  L.push('<div class="section-header"><p class="kicker">Les lots</p><h2>Un gagnant chaque jour, et ' + jours.length + ' cadeaux en plus</h2></div>');
  L.push('<ul class="av-lots">');
  cartes.forEach(([teinte, image, genre, alt, quand, titre, texte]) => L.push('  <li class="av-carte av-lot av-lot--' + teinte + '"><figure class="av-lot-visuel av-lot-visuel--' + genre + '"><img src="' + h(image) + '" alt="' + h(alt) + '" loading="lazy" decoding="async"></figure><p class="av-lot-quand">' + h(quand) + '</p><h3>' + h(titre.charAt(0).toUpperCase() + titre.slice(1)) + '</h3><p>' + h(texte) + '</p></li>'));
  L.push('</ul>');
  L.push('<p class="av-pas-de-perdant"><span class="av-pas-de-perdant-titre">Pas de perdant</span> ' + h(PAS_DE_PERDANT.texte) + '</p>');
  L.push('<h3 class="av-jeux-titre">' + jours.length + ' jours, un cadeau en plus de la place</h3>');
  L.push('<p class="av-jeux-intro">Ces jours-là, le gagnant du jour repart avec sa place et avec un cadeau, choisi dans l’univers de la porte.</p>');
  L.push('<ol class="av-jeux">');
  jours.forEach((j) => {
    const x = JEUX[j], etoile = ETOILES.includes(j);
    L.push('  <li class="av-jeu av-teinte--' + x.univers + '"><figure class="av-jeu-visuel"><img src="' + h(x.image) + '" alt="' + h(x.alt || 'La boîte du jeu ' + x.court) + '" loading="lazy" decoding="async"><span class="av-jeu-porte" aria-hidden="true">' + j + '</span></figure><div><p class="av-jeu-quand">' + (etoile ? '★ ' : '') + h(jourDe(j) + ' ' + numero(j) + ' décembre') + '</p><h4>' + h(x.nom) + (x.sous ? ' <span>' + h(x.sous) + '</span>' : '') + '</h4><p>' + h(x.detail) + '</p><p class="av-jeu-place">Avec ' + h(etoile ? PLACE_ESCAPE : PLACE_QUIZ) + '</p></div></li>');
  });
  L.push('</ol>');
  L.push('<p class="av-note">Le tirage du jour se fait parmi les portes ouvertes le jour même. Pour que ce ne soit pas toujours les mêmes : si le tirage du jour retombe sur quelqu’un qui a déjà gagné une place, on refait le tirage. Le grand tirage et le tirage des 24 portes sont ouverts à tous, gagnants du jour compris, et annoncés le 25 décembre à midi. Tickets : 1 par porte ouverte le jour même, 1 de plus si la réponse est juste, 1 pour une porte ouverte en retard. Places et sessions offertes valables 12 mois. Cadeaux à retirer à l’accueil, à Mondeville, avant le 28 février 2027. Lots non échangeables et non remboursables.</p>');
  // « 1 » jamais seul en bout de ligne : « 1 joueur », « 1 place », « 1 session » restent ensemble
  return L.map((l) => '        ' + l).join('\n').replace(/(^|[ >(])1 (joueur|place|session)/g, '$11&nbsp;$2');
}

export function ligneReglement() {
  const jours = Object.keys(JEUX).map(Number).sort((a, b) => a - b);
  const cadeaux = jours.map((j) => 'le ' + numero(j) + ' : ' + (JEUX[j].objet || JEUX[j].court)).join(' ; ');
  return [
    '            <li><strong>Lots.</strong> Chaque jour : ' + h(PLACE_QUIZ.replace(' pour ', ' Buzz Your Brain pour ')) + '. Les '+ h(liste(ETOILES.map(numero))) + ' décembre : ' + h(PLACE_ESCAPE) + ' à la place. Une place vaut pour une seule personne, jamais pour une session entière : les autres joueurs du groupe paient leur place. Certains jours, le gagnant reçoit en plus un cadeau (' + h(cadeaux) + '). Grand tirage : ' + h(FINAUX.grand.lot) + ' (' + h(SALLES) + '), pour toute l’équipe. Tirage des 24 portes : ' + h(FINAUX.assidus.lot) + ', pour tout le groupe. Les places et les sessions sont des codes à saisir à la réservation sur gamedoor41.fr, valables 12 mois. Les cadeaux sont à retirer à l’accueil, à Mondeville, avant le 28 février 2027 : passé cette date, ils sont perdus. Les lots ne sont ni échangeables ni remboursables.</li>',
    '            <li><strong>Pas de perdant.</strong> Le 25 décembre, chaque participant qui n’a gagné aucun tirage reçoit par mail ' + h(PLACE_QUIZ) + ', valable 12 mois. Les tirages du jour n’ont pas de lot de consolation : seul le gagnant du jour reçoit un lot.</li>',
  ].join('\n');
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
