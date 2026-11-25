// Points d'entrée Netlify du calendrier de l'Avent (regroupés dans netlify/avent-coeur.mjs).
import { creerMoteur } from './coeur.mjs';
import { stockageNetlify } from './stockage.mjs';
import { lotsPrevus } from './lots-2026.mjs';

// Un aperçu (deploy-preview-…--gamedoor41.netlify.app) ou un essai local n'est jamais « le vrai jeu ».
// Dans le doute, on se considère en production : c'est le réglage le plus strict.
export function contexteDe(hote) {
  return /--gamedoor41\.netlify\.app$/i.test(hote) || /^(localhost|127\.0\.0\.1)$/i.test(hote) ? 'apercu' : 'production';
}

const moteurs = {};
function moteur(contexte) {
  if (!moteurs[contexte]) moteurs[contexte] = creerMoteur({ contexte, lotsPrevus: lotsPrevus(), stockage: stockageNetlify(contexte === 'production' ? 'avent-2026' : 'avent-2026-apercu') });
  return moteurs[contexte];
}

export async function gererAvent(req, context) {
  const contexte = contexteDe(new URL(req.url).hostname);
  return moteur(contexte).gerer(req, { ip: context && context.ip });
}

/** Fonction planifiée (tous les jours à midi, heure de Paris en hiver) : tirage de la veille. */
export async function tirageDuJour() {
  const m = moteur('production');
  const n = await m.assurerTirages(m.quandReel());
  if (n) console.log('[avent] tirages faits : ' + n);
  return n;
}
