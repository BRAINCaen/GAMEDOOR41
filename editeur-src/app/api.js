// Échanges avec le serveur de l'éditeur (/api/editeur/*) et travaux de fond.
import { jeton } from './auth.js';

export class ErreurApi extends Error {
  constructor(message, code, statut, details) {
    super(message);
    this.code = code;
    this.statut = statut;
    this.details = details;
  }
}

async function entetes(forcer) {
  const j = await jeton(forcer);
  return j ? { Authorization: 'Bearer ' + j } : {};
}

export async function appel(chemin, { methode = 'GET', corps, signal, binaire = false } = {}) {
  const faire = async (forcer) => fetch('/api/editeur/' + chemin, {
    method: methode,
    headers: { ...(await entetes(forcer)), ...(corps ? { 'Content-Type': 'application/json' } : {}) },
    body: corps ? JSON.stringify(corps) : undefined,
    signal,
  });
  let r;
  try {
    r = await faire(false);
    if (r.status === 401) r = await faire(true);
  } catch (e) {
    if (e && e.name === 'AbortError') throw e;
    throw new ErreurApi('Le serveur de l’éditeur ne répond pas. Vérifiez votre connexion internet.', 'RESEAU', 0);
  }
  if (binaire && r.ok) return r.blob();
  let donnee = null;
  try { donnee = await r.json(); } catch (_) { /* rien */ }
  if (!r.ok) throw new ErreurApi((donnee && donnee.erreur) || ('Erreur ' + r.status), donnee && donnee.code, r.status, donnee && donnee.details);
  return donnee;
}

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Lance un travail de fond (aperçu, publication, assistant) et suit son avancement.
 * @param {string} type
 * @param {object} donnees
 * @param {(t: object) => void} [suivi]   appelé à chaque nouvelle étape
 */
export async function travail(type, donnees, suivi) {
  const id = (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)).toLowerCase();
  const r = await fetch('/.netlify/functions/editeur-travail-background', {
    method: 'POST',
    headers: { ...(await entetes(false)), 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, type, ...donnees }),
  });
  if (!r.ok && r.status !== 202) throw new ErreurApi('Impossible de lancer le travail (' + r.status + ').', 'TRAVAIL', r.status);
  const debut = Date.now();
  let attenteVue = 0;
  for (;;) {
    await attendre(type === 'ia' ? 2000 : 1300);
    const t = await appel('travail?id=' + encodeURIComponent(id));
    if (suivi) suivi(t);
    if (t.etat === 'termine') return t.resultat;
    if (t.etat === 'erreur') throw new ErreurApi(t.erreur || 'Le travail a échoué.', t.code, 0, t.details);
    if (t.etat === 'refuse') { const e = new ErreurApi(t.erreur, 'RELECTURE', 0); e.relecture = t.relecture; throw e; }
    if (t.etat === 'attente' && ++attenteVue > 40) throw new ErreurApi('Le travail n’a pas démarré. Réessayez.', 'TRAVAIL', 0);
    if (Date.now() - debut > 12 * 60e3) throw new ErreurApi('Le travail prend trop de temps.', 'DELAI', 0);
  }
}
