// ==========================================================================
// Éditeur du site — QUI EST CONNECTÉ ?
//
// Accès réservé aux membres ACTIFS de l'équipe dans Synergia, connectés avec
// leur compte Google @gamedoor41.fr.
//  1. Jeton Firebase (projet Synergia) vérifié ICI, sans bibliothèque :
//     signature RS256 avec les clés publiques de Google, émetteur, audience,
//     dates, fournisseur « google.com », adresse vérifiée @gamedoor41.fr.
//  2. Fiche Synergia lue avec le jeton de la personne (API Firestore) :
//     users/{uid}, sinon la fiche dont l'adresse est la sienne ; la règle
//     « compte actif » est celle de Synergia (shared/utils/compteActif.js).
//  3. Admins de l'éditeur : propriétaires (allan@gamedoor41.fr), admins
//     Synergia, et la variable Netlify EDITEUR_ADMINS (adresses séparées par
//     des virgules).
// Rien n'est journalisé (ni jeton, ni adresse).
// ==========================================================================

import { createPublicKey, verify as verifierSignature } from 'node:crypto';

export const PROJET_DEFAUT = 'synergia-app-f27e7';
export const DOMAINE_DEFAUT = 'gamedoor41.fr';
export const PROPRIETAIRES = ['allan@gamedoor41.fr'];
const URL_CLES = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

export class RefusAcces extends Error {
  constructor(message, statut = 403, code = 'REFUS') {
    super(message);
    this.statut = statut;
    this.code = code;
  }
}

let cles = { valeurs: null, expire: 0 };
async function clesPubliques(fetchFn) {
  if (cles.valeurs && Date.now() < cles.expire) return cles.valeurs;
  const r = await fetchFn(URL_CLES, { signal: AbortSignal.timeout(4000) });
  if (!r.ok) throw new RefusAcces('Vérification de la connexion impossible pour le moment.', 503, 'INDISPONIBLE');
  const json = await r.json();
  const age = /max-age=(\d+)/.exec(r.headers.get('cache-control') || '');
  cles = { valeurs: Object.fromEntries((json.keys || []).map((k) => [k.kid, k])), expire: Date.now() + (age ? Number(age[1]) * 1000 : 3600e3) };
  return cles.valeurs;
}

const b64url = (s) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

/** Vérifie un jeton Firebase ; renvoie ses informations ou lève RefusAcces. */
export async function verifierJeton(jeton, { projet = PROJET_DEFAUT, fetchFn = fetch, maintenant = Date.now() } = {}) {
  const parts = String(jeton || '').split('.');
  if (parts.length !== 3) throw new RefusAcces('Connexion requise.', 401, 'CONNEXION');
  let entete;
  let charge;
  try {
    entete = JSON.parse(b64url(parts[0]).toString('utf8'));
    charge = JSON.parse(b64url(parts[1]).toString('utf8'));
  } catch (_) { throw new RefusAcces('Connexion illisible.', 401, 'CONNEXION'); }
  if (entete.alg !== 'RS256' || !entete.kid) throw new RefusAcces('Connexion invalide.', 401, 'CONNEXION');
  const toutes = await clesPubliques(fetchFn);
  const jwk = toutes[entete.kid];
  if (!jwk) { cles.expire = 0; throw new RefusAcces('Connexion expirée : reconnectez-vous.', 401, 'CONNEXION'); }
  const ok = verifierSignature('RSA-SHA256', Buffer.from(parts[0] + '.' + parts[1]), createPublicKey({ key: jwk, format: 'jwk' }), b64url(parts[2]));
  if (!ok) throw new RefusAcces('Connexion invalide.', 401, 'CONNEXION');
  const s = Math.floor(maintenant / 1000);
  if (charge.aud !== projet || charge.iss !== 'https://securetoken.google.com/' + projet) throw new RefusAcces('Connexion d’un autre service.', 401, 'CONNEXION');
  if (!(charge.exp > s - 30)) throw new RefusAcces('Connexion expirée : reconnectez-vous.', 401, 'CONNEXION');
  if (!(charge.iat <= s + 300) || !charge.sub) throw new RefusAcces('Connexion invalide.', 401, 'CONNEXION');
  return charge;
}

// ---- lecture Firestore (API REST, avec le jeton de la personne)
function valeurFirestore(v) {
  if (!v || typeof v !== 'object') return null;
  if ('stringValue' in v) return v.stringValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return v.timestampValue;
  if ('mapValue' in v) return objetFirestore(v.mapValue.fields || {});
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(valeurFirestore);
  return null;
}
const objetFirestore = (fields) => Object.fromEntries(Object.entries(fields || {}).map(([k, v]) => [k, valeurFirestore(v)]));

/** Règle unique de Synergia (copie fidèle de shared/utils/compteActif.js). */
export const estCompteActif = (u) => {
  if (!u || typeof u !== 'object') return false;
  if (u.isActive === false) return false;
  if (u.archived === true || u.isArchived === true || u._archived === true) return false;
  if (u.mergedInto || u._mergedInto) return false;
  return true;
};

const estAdminSynergia = (u) => !!u && (u.isAdmin === true || u.role === 'admin' || (u.profile && u.profile.role === 'admin') || (Array.isArray(u.permissions) && u.permissions.includes('admin_access')));

async function fichesSynergia(charge, jeton, { projet, fetchFn }) {
  const base = 'https://firestore.googleapis.com/v1/projects/' + projet + '/databases/(default)/documents';
  const h = { Authorization: 'Bearer ' + jeton, 'Content-Type': 'application/json' };
  const r = await fetchFn(base + '/users/' + encodeURIComponent(charge.sub), { headers: h, signal: AbortSignal.timeout(4000) });
  const fiches = [];
  if (r.ok) fiches.push(objetFirestore((await r.json()).fields));
  else if (r.status !== 404) throw new RefusAcces('Lecture de votre fiche Synergia impossible pour le moment.', 503, 'INDISPONIBLE');
  if (!fiches.length && charge.email) {
    for (const champ of ['email', 'profile.email']) {
      const q = await fetchFn(base + ':runQuery', {
        method: 'POST', headers: h, signal: AbortSignal.timeout(4000),
        body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'users' }], where: { fieldFilter: { field: { fieldPath: champ }, op: 'EQUAL', value: { stringValue: charge.email } } }, limit: 5 } }),
      });
      if (!q.ok) continue;
      for (const ligne of await q.json()) if (ligne.document) fiches.push(objetFirestore(ligne.document.fields));
      if (fiches.length) break;
    }
  }
  return fiches;
}

const cache = new Map();

/**
 * Identifie la personne à partir de l'en-tête « Authorization: Bearer <jeton> ».
 * @returns {Promise<{ uid, email, nom, admin: boolean }>}
 */
export async function identifier(requete, env = process.env, { fetchFn = fetch, maintenant = Date.now() } = {}) {
  const brut = requete.headers.get('authorization') || '';
  const m = /^Bearer\s+(\S+)$/i.exec(brut.trim());
  if (!m) throw new RefusAcces('Connexion requise.', 401, 'CONNEXION');
  const jeton = m[1];
  const enCache = cache.get(jeton);
  if (enCache && enCache.expire > maintenant) return enCache.qui;

  const projet = env.EDITEUR_FIREBASE_PROJET || PROJET_DEFAUT;
  const domaine = (env.EDITEUR_DOMAINE || DOMAINE_DEFAUT).toLowerCase();
  const charge = await verifierJeton(jeton, { projet, fetchFn, maintenant });
  const email = String(charge.email || '').trim().toLowerCase();
  const fournisseur = charge.firebase && charge.firebase.sign_in_provider;
  if (fournisseur !== 'google.com' || charge.email_verified !== true || !email.endsWith('@' + domaine)) {
    throw new RefusAcces('L’éditeur est réservé aux comptes Google @' + domaine + ' de l’équipe. Reconnectez-vous avec votre adresse @' + domaine + '.', 403, 'DOMAINE');
  }
  const admins = new Set([...PROPRIETAIRES, ...String(env.EDITEUR_ADMINS || '').split(/[\s,;]+/)].map((e) => e.trim().toLowerCase()).filter(Boolean));
  const proprietaire = admins.has(email);
  const fiches = await fichesSynergia({ ...charge, email }, jeton, { projet, fetchFn });
  const actives = fiches.filter(estCompteActif);
  if (!actives.length && !proprietaire) {
    throw new RefusAcces(fiches.length
      ? 'Votre compte Synergia n’est plus actif : l’accès à l’éditeur est fermé.'
      : 'Aucune fiche Synergia ne correspond à ' + email + ' : demandez à Allan de vérifier votre compte.', 403, fiches.length ? 'INACTIF' : 'INCONNU');
  }
  const fiche = actives[0] || {};
  const nom = String(fiche.pseudo || (fiche.profile && fiche.profile.firstName) || fiche.firstName || fiche.displayName || charge.name || email.split('@')[0]).trim();
  const qui = { uid: charge.sub, email, nom, admin: proprietaire || actives.some(estAdminSynergia) };
  if (cache.size > 300) cache.clear();
  cache.set(jeton, { qui, expire: Math.min(charge.exp * 1000, maintenant + 5 * 60e3) });
  return qui;
}
