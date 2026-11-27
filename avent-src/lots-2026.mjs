// Les lots du calendrier de l'Avent 2026. UNE SEULE SOURCE : le moteur les sert à la page
// (porte du jour, résultat, écran de l'équipe) et `node avent-src/ecrire-lots.mjs` réécrit
// la rubrique « Les lots » et le règlement de calendrier-de-l-avent/index.html.
// Rien de secret ici (les lots sont publics) : ce fichier peut rester dans le dépôt.
//
// Décisions d'Allan du 26/11/2026 :
// - une place offerte = UNE personne, jamais une session entière : on écrit « pour 1 joueur » partout ;
// - la DeLorean se gagne derrière une porte, comme les jeux (la 24, le dernier jour) ;
// - grand tirage = une session d'escape game complète ; tirage des 24 portes = une session de quiz complète ;
// - pas de perdant : le 25 décembre, chaque joueur qui n'a rien gagné reçoit 1 place de quiz pour 1 joueur
//   (pas pour les tirages du jour : là, seul le gagnant reçoit sa place) ;
// - tirages du jour : pas toujours les mêmes, si le sort retombe sur quelqu'un qui a déjà gagné une place, on retire ;
//   le grand tirage et le tirage des 24 portes restent ouverts aux gagnants du jour ;
// - une même personne ne gagne jamais les deux sessions complètes (décision d'Allan du 27/11/2026) :
//   le tirage des 24 portes se fait d'abord, son gagnant ne participe pas au grand tirage.

/** Jours à étoile : la place de quiz devient une place d'escape game. */
export const ETOILES = [6, 13, 20, 24];

export const POUR_UN = 'pour 1 joueur';
export const PLACE = { quiz: '1 place de quiz', escape: '1 place d’escape game' };
export const PLACE_QUIZ = PLACE.quiz + ' ' + POUR_UN;
export const PLACE_ESCAPE = PLACE.escape + ' ' + POUR_UN;
/** La phrase qui lève le doute sur ce qu'est une place. */
export const UNE_PLACE_C_EST = 'La place offerte vaut pour une seule personne, pas pour une session entière : les autres joueurs du groupe paient leur place au tarif habituel.';
export const SALLES = 'Garde à Vue, Psychiatric ou Back to the 80’s';

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
  sessionEscape: img('/img/escape/salle-back-to-80s-borne-arcade-pacman-480w.jpg'),
};

/** Les jours où le gagnant repart aussi avec un cadeau. `court` = nom dans une phrase ;
 *  `objet` = ce qu'on écrit après « + » (par défaut « le jeu <court> ») ; `plus` = au-dessus du nom sur les visuels. */
export const JEUX = {
  1: { univers: 'gav', image: img('/img/avent/jeux/dossiers-criminels.jpg'), maison: false, nom: 'Dossiers Criminels Pocket', sous: 'Qui a tué Isabella Vega ?', court: 'Dossiers Criminels Pocket', detail: 'Une enquête de poche : des indices, des suspects, un coupable à démasquer.' },
  4: { univers: 'psy', image: img('/img/avent/jeux/black-stories.jpg'), maison: false, nom: 'Black Stories', court: 'Black Stories', detail: '50 énigmes macabres à résoudre en posant des questions. Réponses permises : oui ou non.' },
  6: { univers: 'quiz', image: img('/img/avent/jeux/esquisse.jpg'), maison: false, nom: 'Esquissé ?', sous: 'Version 6 joueurs', court: 'Esquissé ?', detail: 'Le téléphone arabe en dessin : on dessine, on devine, et tout dérape.' },
  7: { univers: '80s', image: img('/img/avent/jeux/et.jpg'), maison: true, nom: 'E.T. l’Extra-Terrestre', court: 'E.T. l’Extra-Terrestre', detail: 'Jeu d’aventure coopératif : aidez E.T. à rentrer chez lui avant les agents. 2 à 4 joueurs, dès 10 ans, 30 minutes.' },
  10: { univers: 'quiz', image: img('/img/avent/jeux/snort-funny.jpg'), maison: false, nom: 'Snort Funny', sous: 'Le jeu « ingroinyable »', court: 'Snort Funny', detail: 'Un jeu d’ambiance pour faire rire toute la table.' },
  13: { univers: 'gav', image: img('/img/avent/jeux/sous-scelles.jpg'), maison: false, nom: 'Sous Scellés', sous: 'La Fille du Troisième', court: 'Sous Scellés : La Fille du Troisième', detail: 'Un dossier d’enquête à ouvrir chez vous : à vous de résoudre l’affaire.' },
  15: { univers: '80s', image: img('/img/avent/jeux/retour-vers-le-futur.jpg'), maison: true, nom: 'Retour vers le futur', court: 'Retour vers le futur', detail: 'Jeu d’aventure coopératif : faites monter la DeLorean à 88 miles à l’heure avant l’éclair. 2 à 4 joueurs, dès 10 ans, 50 minutes.' },
  16: { univers: 'psy', image: img('/img/avent/jeux/scream.jpg'), maison: false, nom: 'Scream, le jeu', court: 'Scream', detail: 'Jeu de société coopératif : faites équipe pour échapper au tueur masqué.' },
  18: { univers: 'quiz', image: img('/img/avent/jeux/longueur-d-onde.jpg'), maison: false, nom: 'Longueur d’onde', court: 'Longueur d’onde', detail: 'Jeu d’ambiance en équipes : êtes-vous sur la même longueur d’onde que vos amis ?' },
  20: { univers: 'psy', image: img('/img/avent/jeux/chucky.jpg'), maison: false, nom: 'Chucky, le jeu', court: 'Chucky', detail: 'Jeu d’horreur coopératif : tous ensemble contre la poupée.' },
  23: { univers: '80s', image: img('/img/avent/jeux/goonies.jpg'), maison: true, nom: 'The Goonies', sous: 'Ne disent jamais mourir', court: 'The Goonies', detail: 'Jeu d’aventure : un joueur dirige les ennemis, les autres incarnent les Goonies. 2 à 5 joueurs, dès 12 ans, 50 minutes.' },
  24: { univers: 'final', image: img('/img/avent/jeux/delorean.jpg'), maison: false, nom: 'DeLorean radio-commandée', sous: 'Retour vers le futur', court: 'DeLorean radio-commandée', objet: 'la DeLorean radio-commandée', plus: '+ la', alt: 'La DeLorean radio-commandée', visuel: { nom: 'DeLorean', sous: 'radio-commandée, de Retour vers le futur' }, detail: 'La voiture de Retour vers le futur, à piloter à la télécommande : le cadeau de la dernière porte.' },
};
export const objetDe = (jeu) => jeu.objet || 'le jeu ' + jeu.court;

/** Les deux tirages de la fin (résultat le 25 décembre à midi), et « pas de perdant » pour tous les autres. */
export const FINAUX = {
  grand: { quand: 'Le grand tirage', image: IMAGES_PLACES.sessionEscape, maison: true, alt: 'La salle Back to the 80’s', nom: 'Une session d’escape game complète', lot: '1 session d’escape game pour 2 à 6 joueurs, salle au choix', place: 'sessionEscape', detail: 'Le gros lot, tiré au sort parmi tous les tickets du mois : une session offerte pour toute votre équipe, de 2 à 6 joueurs, dans la salle de votre choix (' + SALLES + ').' },
  assidus: { quand: 'Les 24 portes ouvertes', image: IMAGES_PLACES.session, maison: true, alt: 'La salle du quiz', nom: 'Une session de quiz complète', lot: '1 session de quiz pour 4 à 16 candidats, émission au choix', place: 'session', detail: 'Tirée au sort parmi celles et ceux qui ont ouvert les 24 portes : une session offerte pour tout votre groupe, de 4 à 16 candidats, émission au choix.' },
};
export const PAS_DE_PERDANT = {
  lot: PLACE_QUIZ,
  texte: 'Le 25 décembre, chaque joueur qui n’a gagné aucun tirage reçoit quand même ' + PLACE_QUIZ + ', par mail. Il suffit d’avoir ouvert une porte.',
};

/** Ce que le moteur sert : pour chaque porte le lot en une phrase, le nom du cadeau s'il y en a un, l'objet à retirer
 *  à l'accueil, le genre de code à envoyer au gagnant (place de quiz, place d'escape game, session de quiz,
 *  session d'escape game) et l'image du cadeau à montrer au joueur. */
export function lotsPrevus() {
  const lots = {};
  for (let j = 1; j <= 24; j++) {
    const place = ETOILES.includes(j) ? PLACE_ESCAPE : PLACE_QUIZ;
    const jeu = JEUX[j];
    lots[j] = { lot: jeu ? place + ' + ' + objetDe(jeu) : place, jeu: jeu ? jeu.court : null, objet: jeu ? objetDe(jeu) : null, place: ETOILES.includes(j) ? 'escape' : 'quiz', image: jeu ? jeu.image : null };
  }
  lots.grand = { lot: FINAUX.grand.lot, jeu: null, objet: null, place: FINAUX.grand.place, image: null };
  lots.assidus = { lot: FINAUX.assidus.lot, jeu: null, objet: null, place: FINAUX.assidus.place, image: null };
  return lots;
}
