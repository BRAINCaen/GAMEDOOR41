// Points d'entrée Netlify du calendrier de l'Avent (regroupés dans netlify/avent-coeur.mjs).
import { creerMoteur } from './coeur.mjs';
import { stockageNetlify } from './stockage.mjs';
import { lotsPrevus } from './lots-2026.mjs';
import { courrierBrevo } from './courrier.mjs';

// L'envoi des mails se branche avec la variable BREVO_API_KEY du site (Netlify). Sans elle, rien ne part.
const SITE = 'https://gamedoor41.fr';
const CONTACT = process.env.AVENT_CONTACT || 'contact@gamedoor41.fr';
function courrier() {
  const cle = process.env.BREVO_API_KEY;
  return cle ? courrierBrevo({ cle, expediteur: { name: 'GAMEDOOR·41', email: process.env.AVENT_EXPEDITEUR || CONTACT }, repondre: { name: 'GAMEDOOR·41', email: CONTACT } }) : null;
}

// Un aperçu (deploy-preview-…--gamedoor41.netlify.app) ou un essai local n'est jamais « le vrai jeu ».
// Dans le doute, on se considère en production : c'est le réglage le plus strict.
export function contexteDe(hote) {
  return /--gamedoor41\.netlify\.app$/i.test(hote) || /^(localhost|127\.0\.0\.1)$/i.test(hote) ? 'apercu' : 'production';
}

const moteurs = {};
function moteur(contexte) {
  if (!moteurs[contexte]) moteurs[contexte] = creerMoteur({ contexte, lotsPrevus: lotsPrevus(), courrier: courrier(), contact: CONTACT, stockage: stockageNetlify(contexte === 'production' ? 'avent-2026' : 'avent-2026-apercu') });
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
