// Les textes que le calendrier envoie tout seul : mail au gagnant, accusé de réception d'une question,
// bilan du jour pour l'équipe, légendes des publications sur les réseaux sociaux.
// Fonctions pures (aucun envoi ici) : faciles à relire et à essayer.

const SEMAINE = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
export const dateTexte = (j, annee = 2026) => SEMAINE[new Date(Date.UTC(annee, 11, j)).getUTCDay()] + ' ' + (j === 1 ? '1er' : j) + ' décembre';
const h = (t) => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pad = (n) => String(n).padStart(2, '0');

export const ADRESSE = '41 bis rue Pasteur, 14120 Mondeville';
export const PAGE = '/calendrier-de-l-avent/';
export const RETRAIT_JEUX = '28 février 2027';

/** Mise en page commune des mails : sobre, lisible partout, sans image. */
function habiller(titre, blocs, origine) {
  const corps = blocs.filter(Boolean).map((b) => (b.cadre
    ? '<div style="margin:18px 0;padding:16px 18px;background:#fff6ec;border-left:5px solid #ff6b00;border-radius:6px;">' + b.cadre + '</div>'
    : '<p style="margin:0 0 14px;">' + b + '</p>')).join('\n');
  return '<!doctype html><html lang="fr"><body style="margin:0;padding:0;background:#f2efe9;">' +
    '<div style="max-width:600px;margin:0 auto;padding:24px 14px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1a1a1a;">' +
    '<div style="background:#0a0a0a;color:#fff;padding:20px 22px;border-radius:10px 10px 0 0;border-bottom:4px solid #ff6b00;">' +
    '<div style="font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#ff6b00;">Les 24 portes de GAMEDOOR·41</div>' +
    '<div style="font-size:22px;font-weight:bold;margin-top:6px;">' + h(titre) + '</div></div>' +
    '<div style="background:#ffffff;padding:22px;border-radius:0 0 10px 10px;">' + corps + '</div>' +
    '<p style="margin:14px 6px 0;font-size:12px;color:#777;">GAMEDOOR·41 · ' + h(ADRESSE) + ' · <a href="' + h(origine + PAGE) + '" style="color:#777;">le calendrier de l’Avent</a></p>' +
    '</div></body></html>';
}

const QUOI = {
  quiz: '1 place de quiz pour 1 joueur', escape: '1 place d’escape game pour 1 joueur',
  session: '1 session de quiz pour 4 à 16 candidats, émission au choix', sessionEscape: '1 session d’escape game pour 2 à 6 joueurs, salle au choix',
};
/** Ce que vaut le code, sans laisser de place au doute (une place = une personne ; une session = tout le groupe). */
const PRECISION = {
  quiz: 'Il vaut pour une seule personne, pas pour une session entière : les autres joueurs de votre groupe paient leur place au tarif habituel.',
  escape: 'Il vaut pour une seule personne, pas pour une session entière : les autres joueurs de votre équipe paient leur place au tarif habituel. Salle au choix : Garde à Vue, Psychiatric ou Back to the 80’s.',
  session: 'Il offre la session entière à tout votre groupe, de 4 à 16 candidats : choisissez l’émission en réservant.',
  sessionEscape: 'Il offre la session entière à toute votre équipe, de 2 à 6 joueurs, dans la salle de votre choix : Garde à Vue, Psychiatric ou Back to the 80’s.',
};

/**
 * Mail au gagnant. `tirage` : 'jour' | 'grand' | 'assidus' ; `place` : 'quiz' | 'escape' | 'session' | 'sessionEscape' | null ;
 * `code` : le code à saisir à la réservation (null si la réserve de codes est vide) ;
 * `suite` : vrai pour le second mail qui apporte un code promis dans le premier.
 */
export function mailGagnant({ prenom, tirage = 'jour', jour, participants, lot, place, objet, code, suite = false, essai = false, origine = 'https://gamedoor41.fr' }) {
  const ou = tirage === 'grand' ? 'du grand tirage' : tirage === 'assidus' ? 'du tirage des 24 portes ouvertes' : 'de la porte ' + jour + ' (' + dateTexte(jour) + ')';
  const sujet = (essai ? '[ESSAI] ' : '') + (suite ? 'Votre code : ' + (QUOI[place] || 'votre lot') + ' (calendrier de l’Avent GAMEDOOR·41)' : 'Bravo ' + prenom + ', vous avez gagné au calendrier de l’Avent GAMEDOOR·41');
  const lignes = [], blocs = [];
  const dire = (texte, html) => { lignes.push(texte); blocs.push(html || h(texte)); };
  dire('Bonjour ' + prenom + ',');
  if (suite) dire('Comme promis, voici le code de votre lot ' + ou + ' de notre calendrier de l’Avent.');
  else {
    dire('Bravo ! Le tirage au sort ' + ou + ' de notre calendrier de l’Avent est tombé sur vous' + (tirage === 'jour' && participants > 1 ? ', parmi ' + participants + ' joueurs' : '') + '.');
    lignes.push('Votre lot : ' + lot); blocs.push({ cadre: '<strong style="font-size:13px;letter-spacing:1px;text-transform:uppercase;color:#b34a00;">Votre lot</strong><br><span style="font-size:19px;font-weight:bold;">' + h(lot) + '</span>' });
  }
  if (place && code) {
    lignes.push('Votre code : ' + code);
    blocs.push({ cadre: '<strong style="font-size:13px;letter-spacing:1px;text-transform:uppercase;color:#b34a00;">Votre code</strong><br><span style="font-size:26px;font-weight:bold;letter-spacing:2px;font-family:Consolas,Menlo,monospace;">' + h(code) + '</span>' });
    dire('Ce code vous offre ' + QUOI[place] + '. ' + PRECISION[place] + ' Réservez sur gamedoor41.fr/reserver, puis saisissez-le au moment de régler. Il est valable sans limite de durée.',
      'Ce code vous offre <strong>' + h(QUOI[place]) + '</strong>. ' + h(PRECISION[place]) + ' Réservez sur <a href="https://gamedoor41.fr/reserver/" style="color:#b34a00;">gamedoor41.fr/reserver</a>, puis saisissez-le au moment de régler. Il est valable sans limite de durée.');
  } else if (place && !suite) {
    dire('Le code de votre ' + (/^session/.test(place) ? 'session' : 'place') + ' vous arrive dans un second mail, sous 48 heures.');
  }
  if (objet && !suite) dire('Votre cadeau, ' + objet + ', vous attend à l’accueil de GAMEDOOR·41, ' + ADRESSE + '. Venez le chercher le jour de votre session, ou répondez à ce mail pour nous dire quand vous passez. Il est à retirer avant le ' + RETRAIT_JEUX + '.',
    'Votre cadeau, <strong>' + h(objet) + '</strong>, vous attend à l’accueil de GAMEDOOR·41, ' + h(ADRESSE) + '. Venez le chercher le jour de votre session, ou répondez à ce mail pour nous dire quand vous passez. Il est à retirer avant le ' + h(RETRAIT_JEUX) + '.');
  dire('Les lots ne sont ni échangeables ni remboursables. Une question ? Répondez simplement à ce mail.');
  if (!suite && tirage === 'jour' && jour < 24) dire('Et le calendrier continue : une nouvelle porte s’ouvre chaque jour jusqu’au 24 décembre.');
  dire('À très vite,');
  dire('L’équipe GAMEDOOR·41');
  return { sujet, texte: lignes.join('\n\n'), html: habiller(suite ? 'Voici votre code' : 'Vous avez gagné !', blocs, origine) };
}

/** « Pas de perdant » : la place de quiz offerte le 25 décembre à chaque joueur qui n'a gagné aucun tirage. */
export function mailPasDePerdant({ prenom, code, essai = false, origine = 'https://gamedoor41.fr' }) {
  const lignes = [], blocs = [];
  const dire = (texte, html) => { lignes.push(texte); blocs.push(html || h(texte)); };
  dire('Bonjour ' + prenom + ',');
  dire('Merci d’avoir joué à notre calendrier de l’Avent ! Le tirage au sort ne vous a pas désigné cette fois, mais chez nous il n’y a pas de perdant : voici ' + QUOI.quiz + ', offerte.');
  lignes.push('Votre code : ' + code);
  blocs.push({ cadre: '<strong style="font-size:13px;letter-spacing:1px;text-transform:uppercase;color:#b34a00;">Votre code</strong><br><span style="font-size:26px;font-weight:bold;letter-spacing:2px;font-family:Consolas,Menlo,monospace;">' + h(code) + '</span>' });
  dire('Ce code vous offre ' + QUOI.quiz + ' Buzz Your Brain. ' + PRECISION.quiz + ' Réservez sur gamedoor41.fr/reserver, puis saisissez-le au moment de régler. Il est valable sans limite de durée.',
    'Ce code vous offre <strong>' + h(QUOI.quiz) + '</strong> Buzz Your Brain. ' + h(PRECISION.quiz) + ' Réservez sur <a href="https://gamedoor41.fr/reserver/" style="color:#b34a00;">gamedoor41.fr/reserver</a>, puis saisissez-le au moment de régler. Il est valable sans limite de durée.');
  dire('Les lots ne sont ni échangeables ni remboursables. Une question ? Répondez simplement à ce mail.');
  dire('Joyeux Noël, et à très vite à Mondeville,');
  dire('L’équipe GAMEDOOR·41');
  return { sujet: (essai ? '[ESSAI] ' : '') + 'Pas de perdant : votre place de quiz offerte (calendrier de l’Avent GAMEDOOR·41)', texte: lignes.join('\n\n'), html: habiller('Pas de perdant !', blocs, origine) };
}

/** Accusé de réception envoyé à la personne qui pose une question ou fait une réclamation. */
export function mailAccuse({ prenom, essai = false, origine = 'https://gamedoor41.fr' }) {
  const lignes = [
    'Bonjour ' + prenom + ',',
    'Nous avons bien reçu votre message au sujet du calendrier de l’Avent. Nous vous répondons sous 48 heures, par mail.',
    'En attendant, les réponses aux questions les plus fréquentes (tirages, lots, tickets, portes en retard) sont en bas de la page du calendrier : ' + origine + PAGE + '#av-questions',
    'À très vite,', 'L’équipe GAMEDOOR·41',
  ];
  const blocs = [h(lignes[0]), h(lignes[1]), 'En attendant, les réponses aux questions les plus fréquentes (tirages, lots, tickets, portes en retard) sont <a href="' + h(origine + PAGE + '#av-questions') + '" style="color:#b34a00;">en bas de la page du calendrier</a>.',
    h(lignes[3]), h(lignes[4])];
  return { sujet: (essai ? '[ESSAI] ' : '') + 'Bien reçu : votre message sur le calendrier de l’Avent GAMEDOOR·41', texte: lignes.join('\n\n'), html: habiller('Message bien reçu', blocs, origine) };
}

/** La question transmise à l'équipe (on répond en faisant « Répondre »). */
export function mailQuestionEquipe({ prenom, email, message, fiche, essai = false, origine = 'https://gamedoor41.fr' }) {
  const lignes = ['Question ou réclamation reçue sur le calendrier de l’Avent.', 'De : ' + prenom + ' <' + email + '>', fiche, 'Message : « ' + message + ' »', 'Pour répondre : bouton « Répondre » de ce mail. La personne a déjà reçu un accusé de réception (réponse promise sous 48 heures).', 'Toutes les questions : ' + origine + PAGE + 'equipe/'];
  const blocs = [h(lignes[0]), '<strong>De :</strong> ' + h(prenom) + ' &lt;' + h(email) + '&gt;', h(fiche), { cadre: h(message).replace(/\n/g, '<br>') }, h(lignes[4]), '<a href="' + h(origine + PAGE + 'equipe/') + '" style="color:#b34a00;">Voir toutes les questions dans l’écran de l’équipe</a>'];
  return { sujet: (essai ? '[ESSAI] ' : '') + '[Avent] Question de ' + prenom, texte: lignes.join('\n\n'), html: habiller('Une question à traiter', blocs, origine) };
}

/** Bilan du jour pour l'équipe. `alertes` : ce qui demande une action. */
export function mailRapport({ jour, lignes, alertes, essai = false, origine = 'https://gamedoor41.fr' }) {
  const quoi = jour > 24 ? 'Tirages de fin' : 'Porte ' + jour;
  const sujet = (essai ? '[ESSAI] ' : '') + '[Avent] ' + quoi + (alertes.length ? ' : ' + alertes.length + ' action' + (alertes.length > 1 ? 's' : '') + ' à faire' : ' : tout est parti tout seul');
  const texte = [quoi + ' du calendrier de l’Avent.', ...lignes, alertes.length ? 'À FAIRE :\n- ' + alertes.join('\n- ') : 'Rien à faire.', 'Écran de l’équipe : ' + origine + PAGE + 'equipe/'].join('\n\n');
  const blocs = [...lignes.map(h), alertes.length ? { cadre: '<strong style="color:#b00020;">À faire</strong><ul style="margin:8px 0 0;padding-left:20px;">' + alertes.map((a) => '<li>' + h(a) + '</li>').join('') + '</ul>' } : { cadre: '<strong style="color:#1f8f4a;">Rien à faire.</strong>' }, '<a href="' + h(origine + PAGE + 'equipe/') + '" style="color:#b34a00;">Ouvrir l’écran de l’équipe</a>'];
  return { sujet, texte, html: habiller(quoi + (alertes.length ? ' : à regarder' : ' : tout est parti'), blocs, origine) };
}

// ---------- réseaux sociaux ----------
const MOTS = '#calendrierdelavent #jeuconcours #concours #caen #mondeville #normandie #escapegame #quiz #gamedoor41';
const LIEN = 'gamedoor41.fr/calendrier-de-l-avent';
/** Pas de point après un lot qui finit déjà par « ? » (le jeu Esquissé ?). */
const fin = (lot, signe) => (/[?!.]$/.test(lot) ? '' : signe);
/** Le gros lot du grand tirage, rappelé le 24 (DeLorean derrière la porte 24 ET gros lot en plus : demande d'Allan). */
export const GROS_LOT = 'une session d’escape game complète pour toute votre équipe (2 à 6 joueurs, salle au choix)';

/** Légende de la publication du jour (12 h 15) : le lot du jour + le gagnant de la veille. */
export function legendeJour({ jour, lot, veille }) {
  const l = ['🎄 Porte ' + jour + ' du calendrier de l’Avent GAMEDOOR·41', '🎁 À gagner aujourd’hui : ' + lot + fin(lot, '.'), 'Un défi d’une minute, une seule réponse, et vous êtes dans le tirage au sort de demain midi. Bonne ou mauvaise réponse, tout le monde a sa chance. Et pas de perdant : le 25 décembre, chaque joueur qui n’a rien gagné reçoit 1 place de quiz pour 1 joueur.'];
  if (jour === 24) l.push('🔐 Et en plus, le gros lot : ' + GROS_LOT + ', tirée au sort demain midi parmi tous les tickets du mois. Dernière porte, dernière chance d’ajouter des tickets !');
  if (veille && veille.gagnant) l.push('🏆 Porte ' + veille.jour + ' : bravo à ' + veille.gagnant + ', qui remporte ' + veille.lot + fin(veille.lot, ' !'));
  l.push('👉 Pour jouer : ' + LIEN + ' (lien dans notre bio). Jeu gratuit, jusqu’au 24 décembre.');
  l.push(MOTS);
  return l.join('\n\n');
}
/** Légende du 25 décembre : gagnant de la porte 24, grand tirage, tirage des 24 portes. */
export function legendeFin({ veille, grand, assidus }) {
  const l = ['🎄 Les 24 portes de GAMEDOOR·41 sont toutes ouvertes. Merci d’avoir joué avec nous tout le mois !'];
  if (veille && veille.gagnant) l.push('🏆 Porte 24 : bravo à ' + veille.gagnant + ', qui remporte ' + veille.lot + fin(veille.lot, '.'));
  if (grand && grand.gagnant) l.push('🔐 Grand tirage : ' + grand.gagnant + ' remporte ' + grand.lot + '.');
  if (assidus && assidus.gagnant) l.push('⭐ Tirage des 24 portes ouvertes : ' + assidus.gagnant + ' remporte ' + assidus.lot + '.');
  l.push('🎁 Et comme il n’y a pas de perdant, tous les autres joueurs reçoivent 1 place de quiz pour 1 joueur.');
  l.push('Chacun a reçu son mail. Joyeux Noël à toutes et à tous, et à très vite à Mondeville !');
  l.push(MOTS);
  return l.join('\n\n');
}
/** Heure de Paris en décembre (UTC+1) au format ISO. */
export const quandParis = (annee, j, heure, minute = 0) => annee + '-12-' + pad(j) + 'T' + pad(heure) + ':' + pad(minute) + ':00+01:00';
