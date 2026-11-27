// Points d'entrée Netlify du calendrier de l'Avent (regroupés dans netlify/avent-coeur.mjs).
import { creerMoteur } from './coeur.mjs';
import { stockageNetlify } from './stockage.mjs';
import { lotsPrevus } from './lots-2026.mjs';
import { courrierBrevo, courrierRelais, seulementEquipe } from './courrier.mjs';

// Les mails partent par le Hub, qui garde la clé Brevo commune (variable AVENT_RELAIS_CLE du site), ou directement par Brevo
// si le site a un jour sa propre BREVO_API_KEY. Sans l'une ni l'autre, rien ne part : l'équipe prévient à la main.
// Sur un aperçu, seuls les mails vers une adresse @gamedoor41.fr partent (jamais de vrai mail aux faux joueurs d'essai).
const SITE = 'https://gamedoor41.fr';
const CONTACT = process.env.AVENT_CONTACT || 'contact@gamedoor41.fr';
const RELAIS = process.env.AVENT_RELAIS_URL || 'https://synergia-hub.netlify.app/api/pont/avent-mail';
function courrier(contexte) {
  const cle = process.env.BREVO_API_KEY, relais = process.env.AVENT_RELAIS_CLE;
  const c = cle ? courrierBrevo({ cle, expediteur: { name: 'GAMEDOOR·41', email: process.env.AVENT_EXPEDITEUR || CONTACT }, repondre: { name: 'GAMEDOOR·41', email: CONTACT } })
    : relais ? courrierRelais({ url: RELAIS, cle: relais }) : null;
  return c && contexte !== 'production' ? seulementEquipe(c) : c;
}

// Un aperçu (deploy-preview-…--gamedoor41.netlify.app) ou un essai local n'est jamais « le vrai jeu ».
// Dans le doute, on se considère en production : c'est le réglage le plus strict.
export function contexteDe(hote) {
  return /--gamedoor41\.netlify\.app$/i.test(hote) || /^(localhost|127\.0\.0\.1)$/i.test(hote) ? 'apercu' : 'production';
}

const moteurs = {};
function moteur(contexte) {
  if (!moteurs[contexte]) moteurs[contexte] = creerMoteur({ contexte, lotsPrevus: lotsPrevus(), courrier: courrier(contexte), contact: CONTACT, stockage: stockageNetlify(contexte === 'production' ? 'avent-2026' : 'avent-2026-apercu') });
  return moteurs[contexte];
}

export async function gererAvent(req, context) {
  const contexte = contexteDe(new URL(req.url).hostname);
  return moteur(contexte).gerer(req, { ip: context && context.ip });
}

/** Fonction planifiée (toutes les demi-heures) : tirage de la veille dès midi, lot envoyé au gagnant,
 *  bilan du jour à l'équipe. Hors décembre, elle ne fait rien. */
export async function tirageDuJour() {
  const m = moteur('production');
  const r = await m.automate(m.quandReel(), SITE);
  if (r.tirages || r.envoyes || r.echecs) console.log('[avent] tirages : ' + r.tirages + ', lots envoyés : ' + r.envoyes + ', envois ratés : ' + r.echecs);
  return r;
}
