// ==========================================================================
// Éditeur du site — BIBLIOTHÈQUE DE BLOCS (panneau « Ajouter »)
//
// Chaque bloc fournit un morceau de HTML prêt à insérer dans une page du site.
// Règles communes :
//  - la racine porte data-gdb="<id du bloc>" et au moins une classe « gdb-… » ;
//    tous les styles sont dans /css/editeur-blocs.css, les comportements dans
//    /js/editeur-blocs.js (ajoutés à la page par l'éditeur dès qu'un bloc y est) ;
//  - le HTML traverse le filtre de sécurité (noyau/assainir.mjs) sans rien perdre ;
//  - aucun identifiant (id) : un bloc peut être inséré plusieurs fois ;
//  - tout texte ou image d'exemple porte data-gdb-exemple="" sur le plus petit
//    élément possible : la publication reste bloquée tant qu'il n'est pas remplacé ;
//  - aucun prix, horaire, âge, capacité, date ou nom inventé.
//
// Placement : 'flux'  = bloc posé entre deux autres blocs ;
//             'texte' = peut aller à l'intérieur d'un paragraphe (balises de texte seulement) ;
//             'liste' = ligne de liste (racine <li>), à placer dans une liste.
//
// Réglages (inspecteur) : { cle, libelle, type, cible, attribut, options?, defaut?, aide? }
//   cible    : sélecteur CSS relatif à la racine du bloc ('' = la racine elle-même)
//   type     : 'texte' | 'url' | 'nombre' | 'date' | 'datetime' | 'case' | 'choix'
//              | 'youtube' | 'vimeo' | 'carte'
//   - 'choix' avec attribut 'class' : la valeur est une classe de variante ('' = aucune) ;
//     l'inspecteur retire les classes des autres options puis ajoute celle choisie ;
//   - 'case' : l'attribut est présent (valeur vide) quand la case est cochée, retiré sinon ;
//   - 'date' / 'datetime' : AAAA-MM-JJ ou AAAA-MM-JJTHH:MM, heure de Paris ; vide = sans limite ;
//   - 'youtube' : l'inspecteur demande le lien de la vidéo et écrit son identifiant
//     (11 caractères) dans data-gdb-youtube (le script accepte aussi un lien entier) ;
//   - 'vimeo' / 'carte' : l'inspecteur convertit le lien ou l'adresse en adresse
//     d'intégration (player.vimeo.com/video/…, google.com/maps?q=…&output=embed)
//     et l'écrit dans l'attribut src de l'iframe ciblée.
// Module ES sans dépendance.
// ==========================================================================

const EX = ' data-gdb-exemple=""';
const ALT_EX = 'Photo d’exemple : décrivez-la en quelques mots';

// --------------------------------------------------------------------------
// Icônes (tracés au trait, 24 × 24, style Lucide)
// --------------------------------------------------------------------------
const T = {
  fleche: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  coche: '<path d="M20 6 9 17l-5-5"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  attention: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  bulle: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  repere: '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  horloge: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  groupe: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  gateau: '<path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1"/><path d="M2 21h20"/><path d="M7 8v3"/><path d="M12 8v3"/><path d="M17 8v3"/><path d="M7 4h.01"/><path d="M12 4h.01"/><path d="M17 4h.01"/>',
  jauge: '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
  minuteur: '<path d="M10 2h4"/><path d="M12 14l3-3"/><circle cx="12" cy="14" r="8"/>',
  etoile: '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>',
  copier: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  fermer: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  lecture: '<path d="M6 4.5v15a1 1 0 0 0 1.5.86l12.4-7.5a1 1 0 0 0 0-1.72L7.5 3.64A1 1 0 0 0 6 4.5z"/>',
  cadeau: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/>',
  megaphone: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
  voiture: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
  bus: '<path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/>',
  parking: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/>',
  etincelle: '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>',
  bouclier: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  coeur: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  guillemets: '<path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/><path d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/>',
  calendrier: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
  etiquette: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r="1"/>',
  sablier: '<path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/>',
  cloche: '<path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>',
  carte: '<path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/><path d="M15 5.764v15"/><path d="M9 3.236v15"/>',
  tableau: '<path d="M12 3v18"/><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/>',
  image: '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
  cle: '<path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"/><path d="m21 2-9.6 9.6"/><circle cx="7.5" cy="15.5" r="5.5"/>',
  euro: '<path d="M4 10h12"/><path d="M4 14h9"/><path d="M19 6a7.7 7.7 0 0 0-5.2-2A7.9 7.9 0 0 0 6 12c0 4.4 3.5 8 7.8 8 2 0 3.8-.8 5.2-2"/>',
  question: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
};
// Logo WhatsApp (plein), identique au bouton flottant du site
const WHATSAPP = '<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0 0 20.464 3.488"/>';

/** Icône décorative placée dans le contenu (masquée aux lecteurs d'écran). */
const svg = (trace, classe = 'gdb-ico') =>
  `<svg class="${classe}" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${trace}</svg>`;
const svgPlein = (trace, classe = 'gdb-ico') =>
  `<svg class="${classe}" viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true" focusable="false">${trace}</svg>`;
/** Icône de vignette du panneau « Ajouter ». */
const ico = (trace) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${trace}</svg>`;

const FLECHE = svg(T.fleche, 'gdb-ico gdb-ico-fleche');

// --------------------------------------------------------------------------
// Images d'exemple (fichiers du site, en déclinaisons 480 / 768 / 1024 px)
// --------------------------------------------------------------------------
const IMAGES = {
  jukebox: { base: '/img/escape/salle-back-to-80s-jukebox-wurlitzer-figurines', l: 1024, h: 749, grande: 1466 },
  cabine: { base: '/img/escape/salle-back-to-80s-cabine-telephone-graffiti', l: 1024, h: 752, grande: 1464 },
  barreaux: { base: '/img/escape/salle-garde-a-vue-barreaux-poste-garde', l: 1024, h: 576, grande: 1672 },
  couloir: { base: '/img/quiz/salle-quiz-couloir-vue-ensemble', l: 1024, h: 768 },
  rasante: { base: '/img/quiz/salle-quiz-perspective-rasante', l: 1024, h: 768 },
  pupitre: { base: '/img/quiz/salle-quiz', l: 1024, h: 768, grande: 1400 },
  buzzer: { base: '/img/quiz/buzzer-action', l: 1024, h: 772, grande: 1400 },
  briques: { base: '/img/quiz/asset-quiz-fond-briques-nuit', l: 1024, h: 576, grande: 1920 },
  facade: { base: '/img/escape/facade-41-bis-rue-pasteur-mondeville', l: 1024, h: 773 },
};

/**
 * Balise <img> d'une image du site.
 * @param {string} cle  image de IMAGES
 * @param {object} [o]  classe, tailles (attribut sizes), alt, exemple (false = image réelle), eager
 */
function img(cle, o = {}) {
  const i = IMAGES[cle];
  const variantes = [480, 768, 1024].map((w) => `${i.base}-${w}w.webp ${w}w`);
  if (i.grande && o.grande) variantes.push(`${i.base}.webp ${i.grande}w`);
  const chargement = o.eager ? ' loading="eager" fetchpriority="high"' : ' loading="lazy"';
  return `<img class="${o.classe || 'gdb-img'}" src="${i.base}-1024w.webp" srcset="${variantes.join(', ')}" sizes="${o.tailles || '(max-width: 768px) 100vw, 720px'}" width="${i.l}" height="${i.h}" alt="${o.alt || ALT_EX}"${chargement} decoding="async"${o.exemple === false ? '' : EX}>`;
}

// --------------------------------------------------------------------------
// Petits morceaux réutilisés
// --------------------------------------------------------------------------
const boutonReserver = (texte = 'Réserver en ligne') =>
  `<a class="btn btn-primary gdb-bouton" href="/reserver/" data-track="bloc-reserver">${texte}${FLECHE}</a>`;
const surtitre = (texte = 'Surtitre') => `<p class="gdb-surtitre"${EX}>${texte}</p>`;
const titre = (texte = 'Titre de la section') => `<h2 class="gdb-titre"${EX}>${texte}</h2>`;
const texte = (t = 'Écrivez ici votre texte. Une ou deux phrases courtes se lisent mieux qu’un long bloc.') => `<p class="gdb-texte"${EX}>${t}</p>`;
const entete = (o = {}) =>
  `<div class="gdb-entete">${o.surtitre === false ? '' : surtitre(o.surtitre)}${o.titreReel ? `<h2 class="gdb-titre">${o.titreReel}</h2>` : titre(o.titre)}${o.intro === false ? '' : texte(o.intro || 'Une phrase d’introduction pour présenter cette partie de la page.')}</div>`;
const section = (id, classes, interieur) =>
  `<section class="gdb-section ${classes}" data-gdb="${id}"><div class="container">${interieur}</div></section>`;
const repeter = (n, f) => Array.from({ length: n }, (_, i) => f(i)).join('');
const NUMEROS = ['Premier', 'Deuxième', 'Troisième', 'Quatrième'];
const NUMEROS_F = ['Première', 'Deuxième', 'Troisième', 'Quatrième'];

// Réglages communs
const R_FOND = {
  cle: 'fond', libelle: 'Fond de la section', type: 'choix', cible: '', attribut: 'class', defaut: '',
  options: [
    { valeur: '', libelle: 'Comme la page' },
    { valeur: 'gdb-section--sombre', libelle: 'Gris très foncé' },
    { valeur: 'gdb-section--lueur', libelle: 'Lueur orange' },
    { valeur: 'gdb-section--orange', libelle: 'Orange' },
  ],
};
const R_ESPACE = {
  cle: 'espace', libelle: 'Espace autour', type: 'choix', cible: '', attribut: 'class', defaut: '',
  options: [
    { valeur: '', libelle: 'Normal' },
    { valeur: 'gdb-section--serree', libelle: 'Réduit' },
    { valeur: 'gdb-section--aeree', libelle: 'Large' },
  ],
};
const R_SECTION = [R_FOND, R_ESPACE];
const R_TAILLE_IMAGE = {
  cle: 'taille', libelle: 'Taille', type: 'choix', cible: '', attribut: 'class', defaut: '',
  options: [{ valeur: 'gdb-image--petite', libelle: 'Petite' }, { valeur: '', libelle: 'Moyenne' }, { valeur: 'gdb-image--large', libelle: 'Toute la largeur' }],
};
const R_ALIGNE = (cible = '') => ({
  cle: 'alignement', libelle: 'Alignement', type: 'choix', cible, attribut: 'class', defaut: '',
  options: [{ valeur: '', libelle: 'À gauche' }, { valeur: 'gdb-aligne-centre', libelle: 'Centré' }],
});
const R_ALIGNE_BOUTONS = (cible = '') => ({
  cle: 'alignement', libelle: 'Alignement', type: 'choix', cible, attribut: 'class', defaut: '',
  options: [{ valeur: '', libelle: 'À gauche' }, { valeur: 'gdb-boutons--centre', libelle: 'Centré' }],
});
const R_LIEN = (cible, libelle = 'Adresse du lien', defaut = '/contact/') => ({
  cle: 'lien', libelle, type: 'url', cible, attribut: 'href', defaut, aide: 'Une page du site (/tarifs/) ou une adresse complète (https://…).',
});
const R_PERIODE = (cible = '') => [
  { cle: 'du', libelle: 'Afficher à partir du', type: 'date', cible, attribut: 'data-gdb-du', defaut: '', aide: 'Vide = dès la publication.' },
  { cle: 'au', libelle: 'Masquer après le', type: 'date', cible, attribut: 'data-gdb-au', defaut: '', aide: 'Vide = toujours affiché. Le bloc disparaît le lendemain à minuit (heure de Paris).' },
];

const casesRebours = () =>
  [['j', 'jours'], ['h', 'heures'], ['m', 'minutes'], ['s', 'secondes']]
    .map(([k, u]) => `<span class="gdb-rebours-case"><span class="gdb-rebours-nb" data-gdb-${k}="">00</span><span class="gdb-rebours-unite">${u}</span></span>`).join('');
const rebours = (titreRebours, classeEnPlus = '') =>
  `<div class="gdb-rebours${classeEnPlus}">`
  + `<p class="gdb-rebours-titre"${titreRebours ? '' : EX}>${titreRebours || 'Fin de l’offre dans'}</p>`
  + `<div class="gdb-rebours-cases" data-gdb-compte-a-rebours="" data-gdb-fin="" role="timer" aria-live="off"${EX}>${casesRebours()}</div>`
  + '<p class="gdb-rebours-fini" data-gdb-fini="" hidden>Cette offre est terminée.</p>'
  + '</div>';

const questionFaq = (i) =>
  `<details class="gdb-question"><summary class="gdb-question-titre"${EX}>${['Première question fréquente ?', 'Deuxième question ?', 'Troisième question ?', 'Quatrième question ?'][i].replace(' ?', '&nbsp;?')}</summary>`
  + `<div class="gdb-question-reponse"><p${EX}>La réponse, claire et courte. Ajoutez un lien vers la page utile si besoin.</p></div></details>`;

const temoignage = (id) =>
  `<figure class="gdb-temoignage"${id ? ` data-gdb="${id}"` : ''}>${svg(T.guillemets, 'gdb-ico gdb-temoignage-ico')}`
  + `<blockquote class="gdb-temoignage-texte"><p${EX}>Recopiez ici l’avis d’un client, mot pour mot, avec son accord.</p></blockquote>`
  + `<figcaption class="gdb-temoignage-auteur"><span class="gdb-temoignage-nom"${EX}>Prénom</span><span class="gdb-temoignage-source"${EX}>Source de l’avis</span></figcaption></figure>`;

const carte = (cle, id) =>
  `<article class="gdb-carte"${id ? ` data-gdb="${id}"` : ''}><div class="gdb-carte-image">${img(cle, { classe: 'gdb-carte-img', tailles: '(max-width: 768px) 100vw, 400px' })}</div>`
  + `<div class="gdb-carte-corps"><h3 class="gdb-carte-titre"${EX}>Titre de la carte</h3>`
  + `<p class="gdb-carte-texte"${EX}>Une ou deux phrases pour décrire ce que l’on trouve en cliquant.</p>`
  + `<a class="gdb-lien-fleche gdb-carte-lien" href="/contact/"${EX}>En savoir plus${FLECHE}</a></div></article>`;

const colonnes = (n, id) =>
  `<div class="gdb-colonnes gdb-colonnes--${n}" data-gdb="${id}">`
  + repeter(n, (i) => `<div class="gdb-colonne"><h3 class="gdb-sous-titre"${EX}>Titre de la colonne ${i + 1}</h3><p class="gdb-texte"${EX}>Texte de la colonne ${i + 1}. Vous pouvez ajouter d’autres blocs dans cette colonne.</p></div>`)
  + '</div>';
const R_COLONNES = {
  cle: 'style', libelle: 'Présentation', type: 'choix', cible: '', attribut: 'class', defaut: '',
  options: [{ valeur: '', libelle: 'Simple' }, { valeur: 'gdb-colonnes--cartes', libelle: 'Chaque colonne dans un cadre' }],
};

// --------------------------------------------------------------------------
// Catégories et blocs
// --------------------------------------------------------------------------
export const CATEGORIES = [
  { id: 'texte', nom: 'Textes' },
  { id: 'boutons', nom: 'Boutons et liens' },
  { id: 'medias', nom: 'Images et vidéos' },
  { id: 'mise-en-page', nom: 'Mise en page' },
  { id: 'sections', nom: 'Sections prêtes' },
  { id: 'promos', nom: 'Promotions et annonces' },
  { id: 'infos', nom: 'Infos pratiques' },
  { id: 'avis', nom: 'Avis et confiance' },
];

export const BLOCS = [
  // ======================================================== TEXTES
  {
    id: 'titre-section', nom: 'Titre de section', categorie: 'texte', motsCles: ['titre', 'h2', 'grand titre', 'partie'],
    description: 'Un grand titre (H2) pour ouvrir une nouvelle partie de la page.',
    icone: ico('<path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1"/>'),
    placement: 'flux',
    html: () => `<h2 class="gdb-titre" data-gdb="titre-section"${EX}>Titre de section</h2>`,
    reglages: [R_ALIGNE()],
  },
  {
    id: 'sous-titre', nom: 'Sous-titre', categorie: 'texte', motsCles: ['titre', 'h3', 'intertitre'],
    description: 'Un titre moyen (H3) à l’intérieur d’une partie.',
    icone: ico('<path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2"/><path d="M17 17.5c2 1.5 4 .3 4-1.5a2 2 0 0 0-2-2"/>'),
    placement: 'flux',
    html: () => `<h3 class="gdb-sous-titre" data-gdb="sous-titre"${EX}>Sous-titre</h3>`,
    reglages: [R_ALIGNE()],
  },
  {
    id: 'petit-titre', nom: 'Petit titre', categorie: 'texte', motsCles: ['titre', 'h4'],
    description: 'Un petit titre (H4), par exemple au-dessus d’une liste.',
    icone: ico('<path d="M12 18V6"/><path d="M17 10v3a1 1 0 0 0 1 1h3"/><path d="M21 10v8"/><path d="M4 12h8"/><path d="M4 18V6"/>'),
    placement: 'flux',
    html: () => `<h4 class="gdb-petit-titre" data-gdb="petit-titre"${EX}>Petit titre</h4>`,
  },
  {
    id: 'surtitre', nom: 'Surtitre', categorie: 'texte', motsCles: ['kicker', 'accroche', 'orange', 'au-dessus du titre'],
    description: 'Quelques mots en orange et en capitales, à placer juste au-dessus d’un titre.',
    icone: ico('<path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/>'),
    placement: 'flux',
    html: () => `<p class="gdb-surtitre" data-gdb="surtitre"${EX}>Surtitre de la section</p>`,
    reglages: [R_ALIGNE()],
  },
  {
    id: 'paragraphe', nom: 'Paragraphe', categorie: 'texte', motsCles: ['texte', 'p', 'phrase'],
    description: 'Un paragraphe de texte courant.',
    icone: ico('<path d="M13 4v16"/><path d="M17 4v16"/><path d="M19 4H9.5a4.5 4.5 0 0 0 0 9H13"/>'),
    placement: 'flux',
    html: () => `<p class="gdb-texte" data-gdb="paragraphe"${EX}>Écrivez ici votre texte. Une ou deux phrases courtes se lisent mieux qu’un long bloc.</p>`,
    reglages: [R_ALIGNE()],
  },
  {
    id: 'chapeau', nom: 'Chapeau (introduction)', categorie: 'texte', motsCles: ['intro', 'introduction', 'accroche', 'chapô'],
    description: 'Une phrase d’introduction un peu plus grande, sous le titre principal.',
    icone: ico('<path d="M17 6H3"/><path d="M21 12H8"/><path d="M21 18H8"/><path d="M3 12v6"/>'),
    placement: 'flux',
    html: () => `<p class="gdb-chapeau" data-gdb="chapeau"${EX}>Une phrase d’introduction, un peu plus grande, qui donne envie de lire la suite.</p>`,
    reglages: [R_ALIGNE()],
  },
  {
    id: 'citation', nom: 'Citation', categorie: 'texte', motsCles: ['citation', 'guillemets', 'phrase', 'blockquote'],
    description: 'Une phrase mise en valeur entre guillemets, avec son auteur.',
    icone: ico(T.guillemets),
    placement: 'flux',
    html: () => `<figure class="gdb-citation" data-gdb="citation">${svg(T.guillemets, 'gdb-ico gdb-citation-ico')}<blockquote class="gdb-citation-texte"><p${EX}>Le texte de la citation, en une ou deux phrases.</p></blockquote><figcaption class="gdb-citation-auteur"${EX}>Prénom, qualité de la personne</figcaption></figure>`,
  },
  {
    id: 'liste-puces', nom: 'Liste à puces', categorie: 'texte', motsCles: ['liste', 'puces', 'points', 'ul'],
    description: 'Une liste de points, avec des puces orange.',
    icone: ico('<path d="M3 12h.01"/><path d="M3 18h.01"/><path d="M3 6h.01"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M8 6h13"/>'),
    placement: 'flux',
    html: () => `<ul class="gdb-liste" data-gdb="liste-puces">${repeter(3, (i) => `<li${EX}>${NUMEROS[i]} point de la liste</li>`)}</ul>`,
  },
  {
    id: 'liste-numerotee', nom: 'Liste numérotée', categorie: 'texte', motsCles: ['liste', 'numéros', 'étapes', 'ol'],
    description: 'Une liste dans l’ordre : 1, 2, 3…',
    icone: ico('<path d="M10 12h11"/><path d="M10 18h11"/><path d="M10 6h11"/><path d="M4 10h2"/><path d="M4 6h1v4"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>'),
    placement: 'flux',
    html: () => `<ol class="gdb-liste gdb-liste--numeros" data-gdb="liste-numerotee">${repeter(3, (i) => `<li${EX}>${NUMEROS_F[i]} étape</li>`)}</ol>`,
  },
  {
    id: 'liste-coches', nom: 'Liste à coches', categorie: 'texte', motsCles: ['liste', 'coches', 'avantages', 'inclus', 'check'],
    description: 'Une liste d’avantages ou de choses incluses, avec des coches.',
    icone: ico('<path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/>'),
    placement: 'flux',
    html: () => `<ul class="gdb-liste gdb-liste--coches" data-gdb="liste-coches">${repeter(3, (i) => `<li${EX}>${NUMEROS[i]} avantage</li>`)}</ul>`,
  },
  {
    id: 'ligne-liste', nom: 'Ligne de liste', categorie: 'texte', motsCles: ['liste', 'ligne', 'ajouter un point', 'li'],
    description: 'Une ligne de plus, à placer dans une liste existante.',
    icone: ico('<path d="M11 12H3"/><path d="M16 6H3"/><path d="M16 18H3"/><path d="M18 9v6"/><path d="M21 12h-6"/>'),
    placement: 'liste',
    html: () => `<li class="gdb-ligne" data-gdb="ligne-liste"${EX}>Nouvelle ligne de la liste</li>`,
  },
  {
    id: 'encadre-info', nom: 'Encadré « Bon à savoir »', categorie: 'texte', motsCles: ['info', 'encadré', 'note', 'astuce', 'conseil'],
    description: 'Un encadré pour une information utile.',
    icone: ico(T.info),
    placement: 'flux',
    html: () => `<div class="gdb-encadre gdb-encadre--info" data-gdb="encadre-info" role="note">${svg(T.info, 'gdb-ico gdb-encadre-ico')}<div class="gdb-encadre-corps"><p class="gdb-encadre-titre">Bon à savoir</p><p class="gdb-encadre-texte"${EX}>Ajoutez ici une information utile, en une ou deux phrases.</p></div></div>`,
  },
  {
    id: 'encadre-attention', nom: 'Encadré « Important »', categorie: 'texte', motsCles: ['attention', 'important', 'alerte', 'avertissement'],
    description: 'Un encadré orange pour une règle ou un point à ne pas manquer.',
    icone: ico(T.attention),
    placement: 'flux',
    html: () => `<div class="gdb-encadre gdb-encadre--attention" data-gdb="encadre-attention" role="note">${svg(T.attention, 'gdb-ico gdb-encadre-ico')}<div class="gdb-encadre-corps"><p class="gdb-encadre-titre">Important</p><p class="gdb-encadre-texte"${EX}>Écrivez ici le point important, clairement et sans détour.</p></div></div>`,
  },
  {
    id: 'texte-2-colonnes', nom: 'Texte sur 2 colonnes', categorie: 'texte', motsCles: ['colonnes', 'deux colonnes', 'texte'],
    description: 'Deux paragraphes côte à côte (l’un sous l’autre sur téléphone).',
    icone: ico('<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M12 3v18"/>'),
    placement: 'flux',
    html: () => `<div class="gdb-texte-colonnes" data-gdb="texte-2-colonnes"><p class="gdb-texte"${EX}>Premier paragraphe. Il s’affiche à gauche sur ordinateur et en premier sur téléphone.</p><p class="gdb-texte"${EX}>Deuxième paragraphe. Il s’affiche à droite sur ordinateur et en dessous sur téléphone.</p></div>`,
  },
  {
    id: 'petite-mention', nom: 'Petite mention', categorie: 'texte', motsCles: ['mention', 'petit texte', 'conditions', 'astérisque', 'note'],
    description: 'Un petit texte gris : précision, condition ou source.',
    icone: ico('<path d="M4 18h12"/><path d="M4 14h16"/><path d="M15 4h5"/><path d="M17.5 4v6"/>'),
    placement: 'flux',
    html: () => `<p class="gdb-mention" data-gdb="petite-mention"${EX}>Petite mention : précision, condition ou source.</p>`,
    reglages: [R_ALIGNE()],
  },
  {
    id: 'question-faq', nom: 'Question de FAQ', categorie: 'texte', motsCles: ['faq', 'question', 'réponse', 'accordéon', 'déroulant'],
    description: 'Une question qui s’ouvre au clic pour montrer sa réponse.',
    icone: ico(T.question),
    placement: 'flux',
    html: () => questionFaq(0).replace('<details class="gdb-question">', '<details class="gdb-question" data-gdb="question-faq">'),
  },

  // ======================================================== BOUTONS ET LIENS
  {
    id: 'bouton-reserver', nom: 'Bouton « Réserver »', categorie: 'boutons', motsCles: ['bouton', 'réserver', 'réservation', 'orange', 'cta'],
    description: 'Le bouton orange qui mène à la réservation en ligne.',
    icone: ico('<path d="M14 4.1 12 6"/><path d="m5.1 8-2.9-.8"/><path d="m6 12-1.9 2"/><path d="M7.2 2.2 8 5.1"/><path d="M9.037 9.69a.498.498 0 0 1 .653-.653l11 4.5a.5.5 0 0 1-.074.949l-4.349 1.041a1 1 0 0 0-.74.739l-1.04 4.35a.5.5 0 0 1-.95.074z"/>'),
    placement: 'flux',
    html: () => `<div class="gdb-boutons" data-gdb="bouton-reserver">${boutonReserver()}</div>`,
    reglages: [R_ALIGNE_BOUTONS()],
  },
  {
    id: 'bouton-secondaire', nom: 'Bouton secondaire', categorie: 'boutons', motsCles: ['bouton', 'lien', 'contour'],
    description: 'Un bouton discret (contour blanc) vers une autre page.',
    icone: ico('<rect width="20" height="12" x="2" y="6" rx="2"/>'),
    placement: 'flux',
    html: () => `<div class="gdb-boutons" data-gdb="bouton-secondaire"><a class="btn btn-outline gdb-bouton" href="/contact/"${EX}>Texte du bouton</a></div>`,
    reglages: [R_LIEN('a'), R_ALIGNE_BOUTONS()],
  },
  {
    id: 'groupe-boutons', nom: 'Deux boutons', categorie: 'boutons', motsCles: ['boutons', 'groupe', 'réserver', 'cta'],
    description: '« Réserver en ligne » et un second bouton, côte à côte.',
    icone: ico('<rect width="9" height="8" x="2" y="8" rx="2"/><rect width="9" height="8" x="13" y="8" rx="2"/>'),
    placement: 'flux',
    html: () => `<div class="gdb-boutons" data-gdb="groupe-boutons">${boutonReserver()}<a class="btn btn-outline gdb-bouton" href="/contact/"${EX}>Texte du second bouton</a></div>`,
    reglages: [R_LIEN('.btn-outline', 'Adresse du second bouton'), R_ALIGNE_BOUTONS()],
  },
  {
    id: 'lien-fleche', nom: 'Lien avec flèche', categorie: 'boutons', motsCles: ['lien', 'flèche', 'en savoir plus'],
    description: 'Un lien orange suivi d’une flèche ; il peut aller dans un paragraphe.',
    icone: ico('<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>'),
    placement: 'texte',
    html: () => `<a class="gdb-lien-fleche" data-gdb="lien-fleche" href="/contact/"${EX}>Texte du lien${FLECHE}</a>`,
    reglages: [R_LIEN('')],
  },
  {
    id: 'bouton-whatsapp', nom: 'Bouton WhatsApp', categorie: 'boutons', motsCles: ['whatsapp', 'message', 'contact', 'écrire'],
    description: 'Un bouton vert pour nous écrire sur WhatsApp.',
    icone: ico(T.bulle),
    placement: 'flux',
    html: () => `<div class="gdb-boutons" data-gdb="bouton-whatsapp"><a class="btn gdb-bouton gdb-bouton--whatsapp" href="https://wa.me/33631469322" target="_blank" rel="noopener" data-track="bloc-whatsapp">${svgPlein(WHATSAPP)}Écrire sur WhatsApp</a></div>`,
    reglages: [R_ALIGNE_BOUTONS()],
  },
  {
    id: 'bouton-email', nom: 'Bouton e-mail', categorie: 'boutons', motsCles: ['mail', 'e-mail', 'courriel', 'contact', 'écrire'],
    description: 'Un bouton qui ouvre un e-mail vers contact@gamedoor41.fr.',
    icone: ico(T.mail),
    placement: 'flux',
    html: () => `<div class="gdb-boutons" data-gdb="bouton-email"><a class="btn btn-outline gdb-bouton gdb-bouton--email" href="mailto:contact@gamedoor41.fr" data-track="bloc-email">${svg(T.mail)}contact@gamedoor41.fr</a></div>`,
    reglages: [R_ALIGNE_BOUTONS()],
  },

  // ======================================================== IMAGES ET VIDÉOS
  {
    id: 'image', nom: 'Image', categorie: 'medias', motsCles: ['image', 'photo', 'illustration'],
    description: 'Une photo de la médiathèque du site.',
    icone: ico(T.image),
    placement: 'flux',
    html: () => `<div class="gdb-image" data-gdb="image">${img('jukebox', { tailles: '(max-width: 768px) 100vw, 880px' })}</div>`,
    reglages: [R_TAILLE_IMAGE, {
      cle: 'forme', libelle: 'Forme', type: 'choix', cible: '', attribut: 'class', defaut: '',
      options: [
        { valeur: '', libelle: 'Photo entière' },
        { valeur: 'gdb-image--paysage', libelle: 'Paysage 16:9' },
        { valeur: 'gdb-image--carre', libelle: 'Carré' },
        { valeur: 'gdb-image--portrait', libelle: 'Portrait' },
      ],
    }],
  },
  {
    id: 'image-legende', nom: 'Image avec légende', categorie: 'medias', motsCles: ['image', 'photo', 'légende', 'figure'],
    description: 'Une photo et une courte légende en dessous.',
    icone: ico('<rect x="3" y="3" width="18" height="13" rx="2"/><path d="m3 14 5-5 5 5"/><path d="M7 20h10"/>'),
    placement: 'flux',
    html: () => `<figure class="gdb-image gdb-image--legende" data-gdb="image-legende">${img('cabine', { tailles: '(max-width: 768px) 100vw, 880px' })}<figcaption class="gdb-legende"${EX}>Légende de la photo.</figcaption></figure>`,
    reglages: [R_TAILLE_IMAGE],
  },
  {
    id: 'image-texte', nom: 'Image et texte côte à côte', categorie: 'medias', motsCles: ['image', 'texte', 'côte à côte', 'gauche', 'droite'],
    description: 'Une photo d’un côté, un titre et un texte de l’autre.',
    icone: ico('<rect x="3" y="5" width="9" height="14" rx="2"/><path d="M15 7h6"/><path d="M15 12h6"/><path d="M15 17h4"/>'),
    placement: 'flux',
    html: () => `<div class="gdb-media-texte" data-gdb="image-texte"><div class="gdb-media-texte-image">${img('rasante', { tailles: '(max-width: 768px) 100vw, 560px' })}</div><div class="gdb-media-texte-corps"><h3 class="gdb-sous-titre"${EX}>Titre à côté de l’image</h3><p class="gdb-texte"${EX}>Quelques phrases pour accompagner la photo : ce qu’on y voit, ce qu’on y vit.</p></div></div>`,
    reglages: [{
      cle: 'cote', libelle: 'Place de l’image', type: 'choix', cible: '', attribut: 'class', defaut: '',
      options: [{ valeur: '', libelle: 'Image à gauche' }, { valeur: 'gdb-media-texte--inverse', libelle: 'Image à droite' }],
    }],
  },
  {
    id: 'galerie', nom: 'Galerie de photos', categorie: 'medias', motsCles: ['galerie', 'photos', 'grille', 'visionneuse', 'album'],
    description: 'Une grille de photos ; un clic ouvre la photo en grand.',
    icone: ico('<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>'),
    placement: 'flux',
    html: () => `<div class="gdb-galerie" data-gdb="galerie" data-gdb-galerie="">${['barreaux', 'cabine', 'jukebox', 'couloir', 'buzzer', 'rasante']
      .map((k) => `<a class="gdb-galerie-item" href="${IMAGES[k].base}-1024w.webp">${img(k, { classe: 'gdb-galerie-img', tailles: '(max-width: 768px) 50vw, 380px' })}</a>`).join('')}</div>`,
    reglages: [{
      cle: 'colonnes', libelle: 'Photos par ligne (ordinateur)', type: 'choix', cible: '', attribut: 'class', defaut: '',
      options: [{ valeur: 'gdb-galerie--2', libelle: '2' }, { valeur: '', libelle: '3' }, { valeur: 'gdb-galerie--4', libelle: '4' }],
    }],
  },
  {
    id: 'carrousel', nom: 'Carrousel de photos', categorie: 'medias', motsCles: ['carrousel', 'diaporama', 'slider', 'défilement', 'photos'],
    description: 'Des photos qui défilent, avec flèches et points (au doigt sur téléphone).',
    icone: ico('<path d="M2 3v18"/><rect width="12" height="18" x="6" y="3" rx="2"/><path d="M22 3v18"/>'),
    placement: 'flux',
    html: () => `<div class="gdb-carrousel" data-gdb="carrousel" data-gdb-carrousel="" data-gdb-auto="0" role="region" aria-roledescription="carrousel" aria-label="Photos"><div class="gdb-carrousel-piste" data-gdb-piste="" tabindex="0">${['couloir', 'cabine', 'barreaux', 'buzzer']
      .map((k) => `<div class="gdb-carrousel-diapo">${img(k, { classe: 'gdb-carrousel-img', tailles: '(max-width: 768px) 100vw, 1100px', grande: true })}</div>`).join('')}</div></div>`,
    reglages: [{ cle: 'auto', libelle: 'Défilement automatique (secondes)', type: 'nombre', cible: '', attribut: 'data-gdb-auto', defaut: '0', min: 0, max: 30, aide: '0 = les photos ne défilent que si le visiteur le demande.' }],
  },
  {
    id: 'video-youtube', nom: 'Vidéo YouTube', categorie: 'medias', motsCles: ['vidéo', 'youtube', 'film', 'bande-annonce'],
    description: 'Une vidéo YouTube : elle ne se charge qu’au clic (page plus rapide, sans pistage).',
    icone: ico('<path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/>'),
    placement: 'flux',
    html: () => `<div class="gdb-video" data-gdb="video-youtube"><div class="gdb-video-cadre gdb-youtube" data-gdb-youtube=""${EX}>${img('briques', { classe: 'gdb-youtube-image', tailles: '(max-width: 768px) 100vw, 900px', alt: 'Image d’aperçu de la vidéo (à remplacer)' })}<button type="button" class="gdb-youtube-lecture">${svgPlein(T.lecture)}<span>Lire la vidéo</span></button></div></div>`,
    reglages: [{ cle: 'video', libelle: 'Lien de la vidéo YouTube', type: 'youtube', cible: '[data-gdb-youtube]', attribut: 'data-gdb-youtube', defaut: '', aide: 'Collez le lien de la vidéo (youtube.com/watch?v=… ou youtu.be/…).' }],
  },
  {
    id: 'video-vimeo', nom: 'Vidéo Vimeo', categorie: 'medias', motsCles: ['vidéo', 'vimeo', 'film'],
    description: 'Une vidéo hébergée sur Vimeo.',
    icone: ico('<path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/>'),
    placement: 'flux',
    html: () => `<div class="gdb-video" data-gdb="video-vimeo"><div class="gdb-video-cadre"><iframe class="gdb-video-iframe" title="Vidéo Vimeo" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"${EX}></iframe></div></div>`,
    reglages: [{ cle: 'video', libelle: 'Lien de la vidéo Vimeo', type: 'vimeo', cible: 'iframe', attribut: 'src', defaut: '', aide: 'Collez le lien de la vidéo (vimeo.com/…).' }],
  },
  {
    id: 'banniere-image', nom: 'Bannière photo pleine largeur', categorie: 'medias', motsCles: ['bannière', 'photo', 'pleine largeur', 'titre', 'image de fond'],
    description: 'Une photo sur toute la largeur de l’écran, avec un titre par-dessus.',
    icone: ico('<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 12h8"/><path d="M6 15h5"/>'),
    placement: 'flux',
    html: () => `<section class="gdb-section gdb-banniere" data-gdb="banniere-image">${img('pupitre', { classe: 'gdb-banniere-fond', tailles: '100vw', grande: true })}<div class="container gdb-banniere-contenu">${surtitre()}<h2 class="gdb-titre gdb-banniere-titre"${EX}>Titre de la bannière</h2></div></section>`,
    reglages: [{
      cle: 'hauteur', libelle: 'Hauteur', type: 'choix', cible: '', attribut: 'class', defaut: '',
      options: [{ valeur: '', libelle: 'Normale' }, { valeur: 'gdb-banniere--haute', libelle: 'Haute' }, { valeur: 'gdb-banniere--basse', libelle: 'Basse' }],
    }, R_ALIGNE('.gdb-banniere-contenu')],
  },

  // ======================================================== MISE EN PAGE
  {
    id: 'espace', nom: 'Espace', categorie: 'mise-en-page', motsCles: ['espace', 'blanc', 'marge', 'vide', 'respiration'],
    description: 'Un espace vide pour aérer entre deux blocs.',
    icone: ico('<path d="M12 2v20"/><path d="m8 18 4 4 4-4"/><path d="m8 6 4-4 4 4"/>'),
    placement: 'flux',
    html: () => '<div class="gdb-espace gdb-espace--m" data-gdb="espace" aria-hidden="true"></div>',
    reglages: [{
      cle: 'taille', libelle: 'Hauteur', type: 'choix', cible: '', attribut: 'class', defaut: 'gdb-espace--m',
      options: [{ valeur: 'gdb-espace--s', libelle: 'Petite' }, { valeur: 'gdb-espace--m', libelle: 'Moyenne' }, { valeur: 'gdb-espace--l', libelle: 'Grande' }, { valeur: 'gdb-espace--xl', libelle: 'Très grande' }],
    }],
  },
  {
    id: 'separateur', nom: 'Séparateur', categorie: 'mise-en-page', motsCles: ['séparateur', 'trait', 'ligne', 'hr'],
    description: 'Un trait fin pour séparer deux parties.',
    icone: ico('<path d="M3 12h18"/><path d="m8 8 4-4 4 4"/><path d="m16 16-4 4-4-4"/>'),
    placement: 'flux',
    html: () => '<hr class="gdb-separateur" data-gdb="separateur">',
  },
  {
    id: 'separateur-orange', nom: 'Séparateur orange', categorie: 'mise-en-page', motsCles: ['séparateur', 'trait', 'orange', 'accent'],
    description: 'Un petit trait orange épais, centré.',
    icone: ico('<path d="M8 12h8"/><path d="M3 12h1"/><path d="M20 12h1"/>'),
    placement: 'flux',
    html: () => '<hr class="gdb-separateur gdb-separateur--orange" data-gdb="separateur-orange">',
    reglages: [R_ALIGNE()],
  },
  {
    id: 'colonnes-2', nom: '2 colonnes', categorie: 'mise-en-page', motsCles: ['colonnes', 'deux', 'grille'],
    description: 'Deux colonnes de même largeur (l’une sous l’autre sur téléphone).',
    icone: ico('<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M12 3v18"/>'),
    placement: 'flux', html: () => colonnes(2, 'colonnes-2'), reglages: [R_COLONNES],
  },
  {
    id: 'colonnes-3', nom: '3 colonnes', categorie: 'mise-en-page', motsCles: ['colonnes', 'trois', 'grille'],
    description: 'Trois colonnes de même largeur.',
    icone: ico('<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="M15 3v18"/>'),
    placement: 'flux', html: () => colonnes(3, 'colonnes-3'), reglages: [R_COLONNES],
  },
  {
    id: 'colonnes-4', nom: '4 colonnes', categorie: 'mise-en-page', motsCles: ['colonnes', 'quatre', 'grille'],
    description: 'Quatre colonnes (deux par ligne sur tablette, une sur téléphone).',
    icone: ico('<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7.5 3v18"/><path d="M12 3v18"/><path d="M16.5 3v18"/>'),
    placement: 'flux', html: () => colonnes(4, 'colonnes-4'), reglages: [R_COLONNES],
  },
  {
    id: 'boite', nom: 'Boîte', categorie: 'mise-en-page', motsCles: ['boîte', 'cadre', 'encadré', 'fond'],
    description: 'Un cadre avec un fond, pour regrouper un titre et du texte.',
    icone: ico('<rect x="3" y="3" width="18" height="18" rx="2"/><rect x="7" y="7" width="10" height="10" rx="1"/>'),
    placement: 'flux',
    html: () => `<div class="gdb-boite" data-gdb="boite"><h3 class="gdb-sous-titre"${EX}>Titre de la boîte</h3><p class="gdb-texte"${EX}>Le contenu de la boîte. Vous pouvez y ajouter d’autres blocs.</p></div>`,
    reglages: [{
      cle: 'style', libelle: 'Style', type: 'choix', cible: '', attribut: 'class', defaut: '',
      options: [{ valeur: '', libelle: 'Fond sombre' }, { valeur: 'gdb-boite--orange', libelle: 'Contour orange' }, { valeur: 'gdb-boite--pleine', libelle: 'Fond orange' }],
    }],
  },
  {
    id: 'carte', nom: 'Carte', categorie: 'mise-en-page', motsCles: ['carte', 'vignette', 'image', 'lien'],
    description: 'Une photo, un titre, un texte et un lien.',
    icone: ico('<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M4 10h16"/><path d="M8 14h8"/><path d="M8 18h5"/>'),
    placement: 'flux',
    html: () => carte('buzzer', 'carte'),
    reglages: [R_LIEN('.gdb-carte-lien')],
  },
  {
    id: 'grille-cartes', nom: 'Grille de cartes', categorie: 'mise-en-page', motsCles: ['cartes', 'grille', 'vignettes', 'liste'],
    description: 'Trois cartes côte à côte (photo, titre, texte, lien).',
    icone: ico('<rect x="2" y="4" width="6" height="16" rx="1"/><rect x="9" y="4" width="6" height="16" rx="1"/><rect x="16" y="4" width="6" height="16" rx="1"/>'),
    placement: 'flux',
    html: () => `<div class="gdb-grille gdb-grille--3" data-gdb="grille-cartes">${['barreaux', 'cabine', 'couloir'].map((k) => carte(k)).join('')}</div>`,
    reglages: [{
      cle: 'colonnes', libelle: 'Cartes par ligne (ordinateur)', type: 'choix', cible: '', attribut: 'class', defaut: 'gdb-grille--3',
      options: [{ valeur: 'gdb-grille--2', libelle: '2' }, { valeur: 'gdb-grille--3', libelle: '3' }, { valeur: 'gdb-grille--4', libelle: '4' }],
    }],
  },

  // ======================================================== SECTIONS PRÊTES
  {
    id: 'section-entete', nom: 'En-tête de page avec photo', categorie: 'sections', motsCles: ['en-tête', 'hero', 'titre principal', 'h1', 'image de fond', 'haut de page'],
    description: 'Le haut d’une nouvelle page : grand titre principal (H1) sur une photo. Un seul par page.',
    icone: ico('<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M6 8h8"/><path d="M6 12h5"/><path d="M2 21h20"/>'),
    placement: 'flux',
    html: () => `<section class="gdb-section gdb-entete-page" data-gdb="section-entete">${img('barreaux', { classe: 'gdb-entete-page-fond', tailles: '100vw', grande: true, eager: true })}<div class="container gdb-entete-page-contenu">${surtitre('Surtitre de la page')}<h1 class="gdb-entete-page-titre"${EX}>Titre principal de la page</h1><p class="gdb-chapeau"${EX}>Une phrase qui résume la page et donne envie de rester.</p><div class="gdb-boutons">${boutonReserver()}</div></div></section>`,
    reglages: [R_ALIGNE('.gdb-entete-page-contenu'), {
      cle: 'hauteur', libelle: 'Hauteur', type: 'choix', cible: '', attribut: 'class', defaut: '',
      options: [{ valeur: '', libelle: 'Normale' }, { valeur: 'gdb-entete-page--haute', libelle: 'Plein écran' }],
    }],
  },
  {
    id: 'section-texte-image', nom: 'Texte et photo', categorie: 'sections', motsCles: ['section', 'texte', 'image', 'présentation', 'côte à côte'],
    description: 'Une section complète : surtitre, titre, texte, points forts et bouton, à côté d’une photo.',
    icone: ico('<path d="M3 6h7"/><path d="M3 10h7"/><path d="M3 14h5"/><rect x="13" y="4" width="8" height="14" rx="2"/>'),
    placement: 'flux',
    html: () => section('section-texte-image', 'gdb-texte-image', `<div class="gdb-media-texte gdb-media-texte--section gdb-media-texte--inverse"><div class="gdb-media-texte-image">${img('cabine', { tailles: '(max-width: 768px) 100vw, 580px' })}</div><div class="gdb-media-texte-corps">${surtitre()}${titre()}${texte('Présentez votre sujet en quelques phrases simples : ce que c’est, pour qui, pourquoi c’est bien.')}<ul class="gdb-liste gdb-liste--coches">${repeter(3, (i) => `<li${EX}>${NUMEROS[i]} point fort</li>`)}</ul><div class="gdb-boutons">${boutonReserver()}</div></div></div>`),
    reglages: [...R_SECTION, {
      cle: 'cote', libelle: 'Place de la photo', type: 'choix', cible: '.gdb-media-texte', attribut: 'class', defaut: 'gdb-media-texte--inverse',
      options: [{ valeur: '', libelle: 'Photo à gauche' }, { valeur: 'gdb-media-texte--inverse', libelle: 'Photo à droite' }],
    }],
  },
  {
    id: 'section-atouts', nom: 'Trois atouts avec icônes', categorie: 'sections', motsCles: ['atouts', 'avantages', 'icônes', 'pourquoi', 'points forts'],
    description: 'Un titre puis trois atouts, chacun avec son icône.',
    icone: ico(T.etincelle),
    placement: 'flux',
    html: () => section('section-atouts', 'gdb-atouts', entete() + `<div class="gdb-grille gdb-grille--3">${[T.etincelle, T.bouclier, T.coeur]
      .map((t, i) => `<div class="gdb-atout"><span class="gdb-atout-ico">${svg(t)}</span><h3 class="gdb-atout-titre"${EX}>${NUMEROS[i]} atout</h3><p class="gdb-atout-texte"${EX}>Expliquez cet atout en une phrase simple.</p></div>`).join('')}</div>`),
    reglages: R_SECTION,
  },
  {
    id: 'section-etapes', nom: 'Étapes 1-2-3', categorie: 'sections', motsCles: ['étapes', 'comment ça marche', 'déroulé', 'process', '1 2 3'],
    description: 'Trois étapes numérotées pour expliquer comment ça se passe.',
    icone: ico('<circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><path d="M7 12h3"/><path d="M14 12h3"/>'),
    placement: 'flux',
    html: () => section('section-etapes', 'gdb-etapes', entete({ titre: 'Comment ça se passe' }) + `<ol class="gdb-etapes-liste">${repeter(3, (i) => `<li class="gdb-etape"><h3 class="gdb-etape-titre"${EX}>${NUMEROS_F[i]} étape</h3><p class="gdb-etape-texte"${EX}>Décrivez cette étape en une ou deux phrases.</p></li>`)}</ol>`),
    reglages: R_SECTION,
  },
  {
    id: 'section-chiffres', nom: 'Chiffres clés animés', categorie: 'sections', motsCles: ['chiffres', 'statistiques', 'compteur', 'nombres', 'stats'],
    description: 'Des chiffres qui défilent jusqu’à leur valeur quand on arrive dessus.',
    icone: ico('<path d="M4 9h16"/><path d="M4 15h16"/><path d="M10 3 8 21"/><path d="M16 3l-2 18"/>'),
    placement: 'flux',
    html: () => section('section-chiffres', 'gdb-chiffres', entete({ surtitre: false, intro: false, titre: 'Quelques chiffres' }) + `<div class="gdb-chiffres-grille">${repeter(3, () => `<div class="gdb-chiffre"><p class="gdb-chiffre-valeur" data-gdb-compteur=""${EX}>000</p><p class="gdb-chiffre-libelle"${EX}>Ce que compte ce chiffre</p></div>`)}</div>`),
    reglages: R_SECTION,
  },
  {
    id: 'section-faq', nom: 'FAQ (questions-réponses)', categorie: 'sections', motsCles: ['faq', 'questions', 'réponses', 'accordéon'],
    description: 'Une liste de questions qui s’ouvrent au clic.',
    icone: ico('<path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2z"/><path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1"/>'),
    placement: 'flux',
    html: () => section('section-faq', 'gdb-faq', `<div class="gdb-entete"><p class="gdb-surtitre">FAQ</p><h2 class="gdb-titre">Questions fréquentes</h2></div><div class="gdb-accordeon" data-gdb-accordeon-unique="">${repeter(4, questionFaq)}</div>`),
    reglages: [...R_SECTION, { cle: 'unique', libelle: 'Une seule réponse ouverte à la fois', type: 'case', cible: '.gdb-accordeon', attribut: 'data-gdb-accordeon-unique', defaut: true }],
  },
  {
    id: 'section-appel-action', nom: 'Bandeau d’appel à l’action', categorie: 'sections', motsCles: ['cta', 'appel à l’action', 'réserver', 'bandeau', 'fin de page'],
    description: 'Un bandeau qui invite à réserver ou à nous écrire, idéal en fin de page.',
    icone: ico(T.megaphone),
    placement: 'flux',
    html: () => section('section-appel-action', 'gdb-appel', `<div class="gdb-appel-boite"><div class="gdb-appel-texte"><h2 class="gdb-titre"${EX}>Titre de l’appel à l’action</h2>${texte('Une phrase qui donne envie de passer à l’action.')}</div><div class="gdb-boutons">${boutonReserver()}<a class="btn btn-outline gdb-bouton" href="mailto:contact@gamedoor41.fr" data-track="bloc-email">Nous écrire</a></div></div>`),
    reglages: [...R_SECTION, {
      cle: 'style', libelle: 'Style du bandeau', type: 'choix', cible: '.gdb-appel-boite', attribut: 'class', defaut: '',
      options: [{ valeur: '', libelle: 'Sombre avec lueur' }, { valeur: 'gdb-appel-boite--orange', libelle: 'Orange' }],
    }],
  },
  {
    id: 'section-prix', nom: 'Grille de prix', categorie: 'sections', motsCles: ['prix', 'tarifs', 'formules', 'offres', 'grille'],
    description: 'Trois formules côte à côte, avec prix, ce qui est inclus et bouton.',
    icone: ico(T.euro),
    placement: 'flux',
    html: () => section('section-prix', 'gdb-prix', entete({ titre: 'Nos formules' }) + `<div class="gdb-grille gdb-grille--3 gdb-prix-grille">${repeter(3, (i) => `<article class="gdb-prix-carte${i === 1 ? ' gdb-prix-carte--vedette' : ''}">${i === 1 ? `<p class="gdb-prix-badge"${EX}>Formule mise en avant</p>` : ''}<h3 class="gdb-prix-nom"${EX}>Nom de la formule</h3><p class="gdb-prix-montant"><span class="gdb-prix-valeur"${EX}>00&nbsp;€</span> <span class="gdb-prix-unite"${EX}>par personne</span></p><p class="gdb-prix-texte"${EX}>Décrivez la formule en une phrase.</p><ul class="gdb-liste gdb-liste--coches gdb-prix-inclus"><li${EX}>Ce qui est inclus</li><li${EX}>Autre élément inclus</li></ul><a class="btn ${i === 1 ? 'btn-primary' : 'btn-outline'} gdb-bouton gdb-prix-bouton" href="/reserver/" data-track="bloc-reserver">Réserver</a></article>`)}</div><p class="gdb-mention gdb-aligne-centre"${EX}>Précisez ici si les prix sont TTC, par personne ou par groupe.</p>`),
    reglages: R_SECTION,
  },
  {
    id: 'section-equipe', nom: 'L’équipe', categorie: 'sections', motsCles: ['équipe', 'game masters', 'personnes', 'portraits', 'staff'],
    description: 'Les portraits de l’équipe, avec prénom et rôle.',
    icone: ico(T.groupe),
    placement: 'flux',
    html: () => section('section-equipe', 'gdb-equipe', entete({ titre: 'L’équipe' }) + `<div class="gdb-grille gdb-grille--4 gdb-equipe-grille">${repeter(4, () => '<figure class="gdb-membre"><img class="gdb-membre-photo" src="/img/logo/logo-badge-round.svg" width="512" height="512" alt="Portrait d’exemple : prénom de la personne" loading="lazy" decoding="async"' + EX + `><figcaption class="gdb-membre-legende"><span class="gdb-membre-nom"${EX}>Prénom</span><span class="gdb-membre-role"${EX}>Rôle dans l’équipe</span></figcaption></figure>`)}</div>`),
    reglages: R_SECTION,
  },
  {
    id: 'section-logos', nom: 'Logos partenaires', categorie: 'sections', motsCles: ['logos', 'partenaires', 'clients', 'références', 'confiance'],
    description: 'Une rangée de logos de partenaires ou de clients.',
    icone: ico('<circle cx="6" cy="12" r="3"/><circle cx="18" cy="12" r="3"/><rect x="9.5" y="9" width="5" height="6" rx="1"/>'),
    placement: 'flux',
    html: () => section('section-logos', 'gdb-section--serree gdb-logos', `<p class="gdb-logos-titre"${EX}>Ils nous font confiance</p><ul class="gdb-logos-liste">${[['escape', 240], ['quiz', 240], ['action', 240], ['horizontal-mono-white', 180]]
      .map(([k, h]) => `<li class="gdb-logo"><img class="gdb-logo-img" src="/img/logo/logo-${k}.svg" width="1000" height="${h}" alt="Nom du partenaire (exemple)" loading="lazy" decoding="async"${EX}></li>`).join('')}</ul>`),
    reglages: [R_FOND, { ...R_ESPACE, defaut: 'gdb-section--serree' }],
  },
  {
    id: 'section-temoignages', nom: 'Témoignages clients', categorie: 'sections', motsCles: ['témoignages', 'avis', 'clients', 'retours', 'citations'],
    description: 'Trois avis de clients, recopiés mot pour mot, et un lien vers tous les avis.',
    icone: ico('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 12a2 2 0 0 0 2-2V8H8"/><path d="M14 12a2 2 0 0 0 2-2V8h-2"/>'),
    placement: 'flux',
    html: () => section('section-temoignages', 'gdb-temoignages', entete({ titre: 'Ce qu’en disent nos joueurs', intro: false }) + `<div class="gdb-grille gdb-grille--3">${repeter(3, () => temoignage())}</div><div class="gdb-boutons gdb-boutons--centre"><a class="gdb-lien-fleche" href="/avis/">Lire tous les avis${FLECHE}</a></div>`),
    reglages: R_SECTION,
  },
  {
    id: 'section-contact', nom: 'Contact rapide', categorie: 'sections', motsCles: ['contact', 'e-mail', 'whatsapp', 'adresse', 'écrire'],
    description: 'E-mail, WhatsApp et adresse, en trois cartes cliquables.',
    icone: ico('<path d="M16 2v2"/><path d="M7 22v-2a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2"/><path d="M8 2v2"/><circle cx="12" cy="11" r="3"/><rect x="3" y="4" width="18" height="18" rx="2"/>'),
    placement: 'flux',
    html: () => section('section-contact', 'gdb-contact', `<div class="gdb-entete"><p class="gdb-surtitre">Contact</p><h2 class="gdb-titre">Une question&nbsp;?</h2>${texte('Une phrase d’accueil, par exemple : écrivez-nous, nous vous répondons rapidement.')}</div><div class="gdb-grille gdb-grille--3 gdb-contact-grille">`
      + `<a class="gdb-contact-carte" href="mailto:contact@gamedoor41.fr" data-track="bloc-email"><span class="gdb-contact-ico">${svg(T.mail)}</span><span class="gdb-contact-titre">E-mail</span><span class="gdb-contact-valeur">contact@gamedoor41.fr</span></a>`
      + `<a class="gdb-contact-carte" href="https://wa.me/33631469322" target="_blank" rel="noopener" data-track="bloc-whatsapp"><span class="gdb-contact-ico gdb-contact-ico--whatsapp">${svgPlein(WHATSAPP)}</span><span class="gdb-contact-titre">WhatsApp</span><span class="gdb-contact-valeur">Écrire un message</span></a>`
      + `<a class="gdb-contact-carte" href="https://www.google.com/maps/dir/?api=1&amp;destination=41+bis+rue+Pasteur+14120+Mondeville" target="_blank" rel="noopener"><span class="gdb-contact-ico">${svg(T.repere)}</span><span class="gdb-contact-titre">Adresse</span><span class="gdb-contact-valeur">41 bis rue Pasteur, 14120 Mondeville</span></a>`
      + '</div>'),
    reglages: R_SECTION,
  },
  {
    id: 'section-onglets', nom: 'Onglets', categorie: 'sections', motsCles: ['onglets', 'tabs', 'rubriques', 'contenu par onglet'],
    description: 'Plusieurs contenus rangés sous des onglets cliquables.',
    icone: ico('<path d="M3 9h18"/><path d="M3 5a2 2 0 0 1 2-2h4v6"/><rect x="3" y="3" width="18" height="18" rx="2"/>'),
    placement: 'flux',
    html: () => section('section-onglets', 'gdb-onglets-section', entete({ intro: false }) + `<div class="gdb-onglets" data-gdb-onglets=""><div class="gdb-onglets-liste">${repeter(3, (i) => `<button type="button" class="gdb-onglet"${EX}>${NUMEROS[i]} onglet</button>`)}</div>${repeter(3, (i) => `<div class="gdb-onglet-panneau"><h3 class="gdb-sous-titre"${EX}>Titre du ${['premier', 'deuxième', 'troisième'][i]} onglet</h3><p class="gdb-texte"${EX}>Contenu de l’onglet ${i + 1}. Ajoutez-y du texte, une liste ou une image.</p></div>`)}</div>`),
    reglages: R_SECTION,
  },
  {
    id: 'section-chronologie', nom: 'Chronologie', categorie: 'sections', motsCles: ['chronologie', 'histoire', 'dates', 'frise', 'étapes'],
    description: 'Une frise verticale : des dates ou des étapes, dans l’ordre.',
    icone: ico('<path d="M12 2v20"/><circle cx="12" cy="6" r="2"/><circle cx="12" cy="14" r="2"/><path d="M14 6h6"/><path d="M4 14h6"/>'),
    placement: 'flux',
    html: () => section('section-chronologie', 'gdb-chronologie-section', entete({ intro: false, titre: 'Notre histoire' }) + `<ol class="gdb-chronologie">${repeter(3, (i) => `<li class="gdb-chrono-etape"><p class="gdb-chrono-date"${EX}>Date ${i + 1}</p><h3 class="gdb-chrono-titre"${EX}>Ce qui s’est passé</h3><p class="gdb-chrono-texte"${EX}>Racontez ce moment en une ou deux phrases.</p></li>`)}</ol>`),
    reglages: R_SECTION,
  },

  // ======================================================== PROMOTIONS ET ANNONCES
  {
    id: 'annonce-bandeau', nom: 'Bandeau d’annonce', categorie: 'promos', motsCles: ['annonce', 'bandeau', 'information', 'fermable', 'période', 'actualité'],
    description: 'Une annonce en bandeau, que le visiteur peut fermer ; affichée seulement entre deux dates si vous voulez.',
    icone: ico(T.cloche),
    placement: 'flux',
    html: () => `<aside class="gdb-annonce" data-gdb="annonce-bandeau" data-gdb-fermable="" data-gdb-du="" data-gdb-au="" aria-label="Annonce"><div class="container gdb-annonce-interieur"><span class="gdb-annonce-ico">${svg(T.megaphone)}</span><p class="gdb-annonce-texte"${EX}>Votre annonce en une phrase courte.</p><a class="gdb-annonce-lien" href="/reserver/"${EX}>En savoir plus</a><button type="button" class="gdb-annonce-fermer" data-gdb-fermer="" aria-label="Fermer l’annonce" title="Fermer l’annonce">${svg(T.fermer)}</button></div></aside>`,
    reglages: [
      ...R_PERIODE(),
      R_LIEN('.gdb-annonce-lien', 'Adresse du lien', '/reserver/'),
      { cle: 'fermable', libelle: 'Le visiteur peut fermer l’annonce', type: 'case', cible: '', attribut: 'data-gdb-fermable', defaut: true },
      {
        cle: 'couleur', libelle: 'Couleur', type: 'choix', cible: '', attribut: 'class', defaut: '',
        options: [{ valeur: '', libelle: 'Orange' }, { valeur: 'gdb-annonce--sombre', libelle: 'Sombre' }, { valeur: 'gdb-annonce--quiz', libelle: 'Violet (quiz)' }],
      },
    ],
  },
  {
    id: 'promo-code', nom: 'Promo avec code à copier', categorie: 'promos', motsCles: ['promo', 'code promo', 'réduction', 'copier', 'offre', 'coupon'],
    description: 'Une offre avec son code, que le visiteur copie en un clic.',
    icone: ico(T.etiquette),
    placement: 'flux',
    html: () => `<section class="gdb-section gdb-promo" data-gdb="promo-code" data-gdb-du="" data-gdb-au=""><div class="container"><div class="gdb-promo-boite"><div class="gdb-promo-texte">${surtitre('Offre spéciale')}<h2 class="gdb-titre"${EX}>Titre de l’offre</h2>${texte('Décrivez l’offre en une phrase.')}<p class="gdb-mention"${EX}>Conditions de l’offre.</p></div><div class="gdb-promo-code"><p class="gdb-promo-code-libelle">Votre code</p><p class="gdb-promo-code-valeur"><code data-gdb-code=""${EX}>CODE</code></p><button type="button" class="gdb-copier" data-gdb-copier="">${svg(T.copier)}<span class="gdb-copier-libelle">Copier le code</span></button><div class="gdb-boutons">${boutonReserver()}</div></div></div></div></section>`,
    reglages: [...R_PERIODE(), R_FOND],
  },
  {
    id: 'compte-a-rebours', nom: 'Compte à rebours', categorie: 'promos', motsCles: ['compte à rebours', 'minuteur', 'date limite', 'fin', 'timer'],
    description: 'Les jours, heures, minutes et secondes qui restent avant une date.',
    icone: ico(T.minuteur),
    placement: 'flux',
    html: () => rebours(null).replace('<div class="gdb-rebours">', '<div class="gdb-rebours" data-gdb="compte-a-rebours">'),
    reglages: [{ cle: 'fin', libelle: 'Fin du compte à rebours', type: 'datetime', cible: '[data-gdb-compte-a-rebours]', attribut: 'data-gdb-fin', defaut: '', aide: 'Date et heure de Paris.' }],
  },
  {
    id: 'badge-nouveau', nom: 'Badge « Nouveau »', categorie: 'promos', motsCles: ['badge', 'nouveau', 'étiquette', 'pastille'],
    description: 'Une petite pastille à placer dans un titre ou un texte ; elle peut disparaître seule après une date.',
    icone: ico('<path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/>'),
    placement: 'texte',
    html: () => '<span class="gdb-badge" data-gdb="badge-nouveau" data-gdb-au="">Nouveau</span>',
    reglages: [
      { cle: 'au', libelle: 'Masquer après le', type: 'date', cible: '', attribut: 'data-gdb-au', defaut: '', aide: 'Vide = toujours affiché.' },
      {
        cle: 'couleur', libelle: 'Couleur', type: 'choix', cible: '', attribut: 'class', defaut: '',
        options: [{ valeur: '', libelle: 'Orange' }, { valeur: 'gdb-badge--quiz', libelle: 'Violet (quiz)' }, { valeur: 'gdb-badge--or', libelle: 'Or (événements)' }, { valeur: 'gdb-badge--clair', libelle: 'Blanc' }],
      },
    ],
  },
  {
    id: 'encart-carte-cadeau', nom: 'Encart carte cadeau', categorie: 'promos', motsCles: ['carte cadeau', 'cadeau', 'offrir', 'noël', 'bon cadeau'],
    description: 'Un encart qui mène à la page Carte cadeau.',
    icone: ico(T.cadeau),
    placement: 'flux',
    html: () => `<section class="gdb-section gdb-cadeau" data-gdb="encart-carte-cadeau"><div class="container"><div class="gdb-cadeau-boite"><div class="gdb-cadeau-visuel"><img class="gdb-cadeau-img" src="/img/magazine/cartes-cadeau-quiz-neon-768w.jpg" srcset="/img/magazine/cartes-cadeau-quiz-neon-480w.jpg 480w, /img/magazine/cartes-cadeau-quiz-neon-768w.jpg 768w" sizes="(max-width: 768px) 92vw, 300px" width="768" height="1364" alt="Cartes cadeau GAMEDOOR·41 posées sur le plateau néon du quiz" loading="lazy" decoding="async"></div><div class="gdb-cadeau-texte"><p class="gdb-surtitre">Carte cadeau</p><h2 class="gdb-titre">Offrez une expérience</h2><p class="gdb-texte">Un escape game ou une émission du quiz, à offrir à qui vous voulez. La carte cadeau est valable 12 mois.</p><div class="gdb-boutons"><a class="btn btn-primary gdb-bouton" href="/cadeau/" data-track="bloc-carte-cadeau">Voir la carte cadeau${FLECHE}</a></div></div></div></div></section>`,
    reglages: R_SECTION,
  },
  {
    id: 'offre-limitee', nom: 'Offre limitée dans le temps', categorie: 'promos', motsCles: ['offre', 'limitée', 'promo', 'compte à rebours', 'date', 'urgence'],
    description: 'Une offre avec compte à rebours, affichée seulement pendant sa période.',
    icone: ico(T.sablier),
    placement: 'flux',
    html: () => `<section class="gdb-section gdb-offre" data-gdb="offre-limitee" data-gdb-du="" data-gdb-au=""><div class="container"><div class="gdb-offre-boite"><span class="gdb-badge">Offre limitée</span><h2 class="gdb-titre"${EX}>Titre de l’offre</h2>${texte('Décrivez l’offre en une phrase.')}${rebours('Il reste', ' gdb-rebours--compact')}<div class="gdb-boutons gdb-boutons--centre">${boutonReserver()}</div><p class="gdb-mention"${EX}>Conditions de l’offre.</p></div></div></section>`,
    reglages: [
      ...R_PERIODE(),
      { cle: 'fin', libelle: 'Fin du compte à rebours', type: 'datetime', cible: '[data-gdb-compte-a-rebours]', attribut: 'data-gdb-fin', defaut: '', aide: 'En général la même date que « Masquer après le ».' },
      R_FOND,
    ],
  },

  // ======================================================== INFOS PRATIQUES
  {
    id: 'horaires', nom: 'Horaires', categorie: 'infos', motsCles: ['horaires', 'ouverture', 'heures', 'jours', 'planning'],
    description: 'Les horaires d’ouverture, jour par jour.',
    icone: ico(T.horloge),
    placement: 'flux',
    html: () => `<div class="gdb-horaires" data-gdb="horaires"><h3 class="gdb-sous-titre">Horaires</h3><dl class="gdb-horaires-liste">${['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
      .map((j) => `<div class="gdb-horaires-ligne"><dt>${j}</dt><dd${EX}>00&nbsp;h&nbsp;00 – 00&nbsp;h&nbsp;00</dd></div>`).join('')}</dl><p class="gdb-mention"${EX}>Précision sur les horaires (jours fériés, vacances scolaires…).</p></div>`,
  },
  {
    id: 'adresse-carte', nom: 'Adresse et plan', categorie: 'infos', motsCles: ['adresse', 'plan', 'carte', 'google maps', 'itinéraire', 'venir'],
    description: 'L’adresse de GAMEDOOR·41, un lien d’itinéraire et le plan Google Maps.',
    icone: ico(T.carte),
    placement: 'flux',
    html: () => `<div class="gdb-adresse" data-gdb="adresse-carte"><div class="gdb-adresse-infos"><h3 class="gdb-sous-titre">Nous trouver</h3><address class="gdb-adresse-texte"><strong>GAMEDOOR·41</strong><br>41 bis rue Pasteur<br>14120 Mondeville</address><a class="gdb-lien-fleche" href="https://www.google.com/maps/dir/?api=1&amp;destination=41+bis+rue+Pasteur+14120+Mondeville" target="_blank" rel="noopener">Préparer l’itinéraire${FLECHE}</a></div><div class="gdb-carte-geo"><iframe class="gdb-carte-geo-iframe" src="https://www.google.com/maps?q=41+bis+rue+Pasteur,+14120+Mondeville&amp;output=embed" title="Plan : 41 bis rue Pasteur, 14120 Mondeville" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe></div></div>`,
    reglages: [{ cle: 'carte', libelle: 'Adresse affichée sur le plan', type: 'carte', cible: 'iframe', attribut: 'src', defaut: 'https://www.google.com/maps?q=41+bis+rue+Pasteur,+14120+Mondeville&output=embed', aide: 'Tapez une adresse postale : le plan se met à jour.' }],
  },
  {
    id: 'acces-parking', nom: 'Accès et stationnement', categorie: 'infos', motsCles: ['accès', 'parking', 'stationnement', 'venir', 'bus', 'tram', 'voiture'],
    description: 'Comment venir : en voiture, où se garer, en transports en commun.',
    icone: ico(T.voiture),
    placement: 'flux',
    html: () => `<div class="gdb-acces" data-gdb="acces-parking"><div class="gdb-acces-image">${img('facade', { tailles: '(max-width: 768px) 100vw, 480px', alt: 'Façade du 41 bis rue Pasteur à Mondeville, entrée de GAMEDOOR·41', exemple: false })}</div><ul class="gdb-acces-liste">${[[T.voiture, 'En voiture', 'Indiquez l’itinéraire depuis Caen et la sortie à prendre.'], [T.parking, 'Se garer', 'Précisez où se garer et comment entrer.'], [T.bus, 'En transports en commun', 'Indiquez la ligne et l’arrêt le plus proche.']]
      .map(([t, ti, tx]) => `<li class="gdb-acces-item"><span class="gdb-acces-ico">${svg(t)}</span><div class="gdb-acces-corps"><h3 class="gdb-acces-titre">${ti}</h3><p class="gdb-acces-texte"${EX}>${tx}</p></div></li>`).join('')}</ul></div>`,
  },
  {
    id: 'tableau', nom: 'Tableau simple', categorie: 'infos', motsCles: ['tableau', 'table', 'comparatif', 'grille', 'colonnes'],
    description: 'Un petit tableau (il défile de côté sur téléphone s’il est large).',
    icone: ico(T.tableau),
    placement: 'flux',
    html: () => `<div class="gdb-tableau" data-gdb="tableau" role="region" aria-label="Tableau" tabindex="0"><table class="gdb-tableau-table"><caption class="gdb-tableau-legende"${EX}>Titre du tableau</caption><thead><tr>${repeter(3, (i) => `<th scope="col"${EX}>Colonne ${i + 1}</th>`)}</tr></thead><tbody>${repeter(3, (l) => `<tr>${repeter(3, (c) => `<td${EX}>Case ${l + 1}.${c + 1}</td>`)}</tr>`)}</tbody></table></div>`,
  },
  {
    id: 'fiche-infos', nom: 'Fiche infos (durée, joueurs, âge)', categorie: 'infos', motsCles: ['infos', 'durée', 'âge', 'joueurs', 'fiche', 'niveau', 'caractéristiques'],
    description: 'Les informations clés d’une activité, avec des icônes.',
    icone: ico('<path d="M15 12h-5"/><path d="M15 8h-5"/><path d="M19 17V5a2 2 0 0 0-2-2H4"/><path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3"/>'),
    placement: 'flux',
    html: () => `<ul class="gdb-fiche" data-gdb="fiche-infos">${[[T.horloge, 'Durée', '00&nbsp;min'], [T.groupe, 'Joueurs', 'De 0 à 0'], [T.gateau, 'Âge', 'Dès 00&nbsp;ans'], [T.jauge, 'Niveau', 'À préciser']]
      .map(([t, l, v]) => `<li class="gdb-fiche-item"><span class="gdb-fiche-ico">${svg(t)}</span><span class="gdb-fiche-libelle">${l}</span><span class="gdb-fiche-valeur"${EX}>${v}</span></li>`).join('')}</ul>`,
  },

  // ======================================================== AVIS ET CONFIANCE
  {
    id: 'temoignage', nom: 'Témoignage', categorie: 'avis', motsCles: ['témoignage', 'avis', 'client', 'citation'],
    description: 'Un avis de client, recopié mot pour mot, avec son prénom.',
    icone: ico(T.guillemets),
    placement: 'flux',
    html: () => temoignage('temoignage'),
  },
  {
    id: 'lien-avis', nom: 'Lien vers nos avis', categorie: 'avis', motsCles: ['avis', 'google', 'note', 'confiance', 'étoiles'],
    description: 'Un encart qui invite à lire les avis des joueurs.',
    icone: ico(T.etoile),
    placement: 'flux',
    html: () => `<div class="gdb-avis-lien" data-gdb="lien-avis"><span class="gdb-avis-ico">${svgPlein(T.etoile)}</span><p class="gdb-avis-texte">Découvrez ce que nos joueurs racontent après leur partie.</p><a class="gdb-lien-fleche" href="/avis/">Lire les avis${FLECHE}</a></div>`,
  },
];
