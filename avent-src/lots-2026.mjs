// Les lots du calendrier de l'Avent 2026. UNE SEULE SOURCE : le moteur les sert à la page
// (porte du jour, résultat, écran de l'équipe) et `node avent-src/ecrire-lots.mjs` réécrit
// la rubrique « Les lots » et le règlement de calendrier-de-l-avent/index.html.
// Rien de secret ici (les lots sont publics) : ce fichier peut rester dans le dépôt.

/** Jours à étoile : la place de quiz devient une place d'escape game. */
export const ETOILES = [6, 13, 20, 24];

export const PLACE_QUIZ = '1 place de quiz';
export const PLACE_ESCAPE = '1 place d’escape game';

// Images : /img/* est servi avec un cache « immuable » d'un an. Pour remplacer une image par une nouvelle
// photo, garder le même nom de fichier et AUGMENTER VERSION_IMAGES : sinon les téléphones gardent l'ancienne.
// `maison: true` = photo prise par nous, assez grande pour les visuels des réseaux sociaux ;
// `maison: false` = petite vignette provisoire (photo du vendeur), à remplacer par notre photo de la boîte.
export const VERSION_IMAGES = 1;
const img = (chemin) => chemin + '?v=' + VERSION_IMAGES;
export const IMAGES_PLACES = {
  quiz: img('/img/quiz/salle-quiz-buzzers-premier-plan-480w.jpg'),
  escape: img('/img/escape/salle-garde-a-vue-barreaux-poste-garde-480w.jpg'),
  session: img('/img/quiz/salle-quiz-buzz-your-brain-vue-large-480w.jpg'),
};

/** Les jours où le gagnant repart aussi avec un jeu. `court` = nom dans une phrase. */
export const JEUX = {
  1: { univers: 'gav', image: img('/img/avent/jeux/dossiers-criminels.jpg'), maison: false, nom: 'Dossiers Criminels Pocket', sous: 'Qui a tué Isabella Vega ?', court: 'Dossiers Criminels Pocket', detail: 'Une enquête de poche : des indices, des suspects, un coupable à démasquer.' },
  4: { univers: 'psy', image: img('/img/avent/jeux/black-stories.jpg'), maison: false, nom: 'Black Stories', court: 'Black Stories', detail: '50 énigmes macabres à résoudre en posant des questions. Réponses permises : oui ou non.' },
  6: { univers: 'quiz', image: img('/img/avent/jeux/esquisse.jpg'), maison: false, nom: 'Esquissé ?', sous: 'Version 6 joueurs', court: 'Esquissé ?', detail: 'Le téléphone arabe en dessin : on dessine, on devine, et tout dérape.' },
  7: { univers: '80s', image: img('/img/avent/jeux/et.jpg'), maison: true, nom: 'E.T. l’Extra-Terrestre', court: 'E.T. l’Extra-Terrestre', detail: 'Jeu d’aventure coopératif : aidez E.T. à rentrer chez lui avant les agents. 2 à 4 joueurs, dès 10 ans, 30 minutes.' },
  10: { univers: 'quiz', image: img('/img/avent/jeux/snort-funny.jpg'), maison: false, nom: 'Snort Funny', sous: 'Le jeu « ingroinyable »', court: 'Snort Funny', detail: 'Un jeu d’ambiance pour faire rire toute la table.' },
  13: { univers: 'gav', image: img('/img/avent/jeux/sous-scelles.jpg'), maison: false, nom: 'Sous Scellés', sous: 'La Fille du Troisième', court: 'Sous Scellés : La Fille du Troisième', detail: 'Un dossier d’enquête à ouvrir chez vous : à vous de résoudre l’affaire.' },
  15: { univers: '80s', image: img('/img/avent/jeux/retour-vers-le-futur.jpg'), maison: true, nom: 'Retour vers le futur', court: 'Retour vers le futur', detail: 'Jeu d’aventure coopératif : faites monter la DeLorean à 88 miles à l’heure avant l’éclair. 2 à 4 joueurs, dès 10 ans, 50 minutes.' },
  16: { univers: 'psy', image: img('/img/avent/jeux/scream.jpg'), maison: false, nom: 'Scream, le jeu', court: 'Scream, le jeu', detail: 'Jeu de société coopératif : faites équipe pour échapper au tueur masqué.' },
  18: { univers: 'quiz', image: img('/img/avent/jeux/longueur-d-onde.jpg'), maison: false, nom: 'Longueur d’onde', court: 'Longueur d’onde', detail: 'Jeu d’ambiance en équipes : êtes-vous sur la même longueur d’onde que vos amis ?' },
  20: { univers: 'psy', image: img('/img/avent/jeux/chucky.jpg'), maison: false, nom: 'Chucky, le jeu', court: 'Chucky, le jeu', detail: 'Jeu d’horreur coopératif : tous ensemble contre la poupée.' },
  23: { univers: '80s', image: img('/img/avent/jeux/goonies.jpg'), maison: true, nom: 'The Goonies', sous: 'Ne disent jamais mourir', court: 'The Goonies', detail: 'Jeu d’aventure : un joueur dirige les ennemis, les autres incarnent les Goonies. 2 à 5 joueurs, dès 12 ans, 50 minutes.' },
};

/** Les deux tirages de la fin (résultat le 25 décembre à midi). */
export const FINAUX = {
  grand: { quand: 'Le grand tirage', image: img('/img/avent/jeux/delorean.jpg'), maison: false, nom: 'Une DeLorean radio-commandée', lot: 'la DeLorean radio-commandée de Retour vers le futur', detail: 'La voiture de Retour vers le futur, à piloter à la télécommande. Chaque ticket gagné pendant le mois est une chance de plus.' },
  assidus: { quand: 'Les 24 portes ouvertes', image: IMAGES_PLACES.session, maison: true, nom: 'Une session de quiz complète', lot: '1 session de quiz pour 4 à 16 candidats, émission au choix', detail: 'Un tirage réservé à celles et ceux qui ont ouvert les 24 portes : une session de quiz offerte pour 4 à 16 candidats, émission au choix.' },
};

/** Ce que le moteur sert : pour chaque porte le lot en une phrase, le nom du jeu s'il y en a un, l'objet à retirer
 *  à l'accueil, et le genre de code à envoyer au gagnant (place de quiz, place d'escape game, session de quiz),
 *  et l'image du jeu (ou de la DeLorean) à montrer au joueur. */
export function lotsPrevus() {
  const lots = {};
  for (let j = 1; j <= 24; j++) {
    const place = ETOILES.includes(j) ? PLACE_ESCAPE : PLACE_QUIZ;
    const jeu = JEUX[j];
    lots[j] = { lot: jeu ? place + ' + le jeu ' + jeu.court : place, jeu: jeu ? jeu.court : null, objet: jeu ? 'le jeu ' + jeu.court : null, place: ETOILES.includes(j) ? 'escape' : 'quiz', image: jeu ? jeu.image : null };
  }
  lots.grand = { lot: FINAUX.grand.lot, jeu: null, objet: FINAUX.grand.lot, place: null, image: FINAUX.grand.image };
  lots.assidus = { lot: FINAUX.assidus.lot, jeu: null, objet: null, place: 'session', image: null };
  return lots;
}
