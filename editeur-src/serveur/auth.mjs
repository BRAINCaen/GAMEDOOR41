// ==========================================================================
// Éditeur du site — QUI EST CONNECTÉ ?
//
// Accès réservé aux membres ACTIFS de l'équipe dans Synergia. Depuis le
// 23/11/2026 (Allan : « autorise tous les membres actifs ») : quelle que soit
// leur façon de se connecter à Synergia — Google @gamedoor41.fr, compte Google
// habituel, ou adresse + mot de passe de Synergia.
//  1. Jeton Firebase (projet Synergia) vérifié ICI, sans bibliothèque :
//     signature RS256 avec les clés publiques de Google, émetteur, audience,
//     dates, fournisseur « google.com » (adresse vérifiée) ou « password ».
//  2. Fiche Synergia lue avec le jeton de la personne (API Firestore) :
//     users/{uid}, sinon la fiche dont l'adresse est la sienne ; la règle
//     « compte actif » est celle de Synergia (shared/utils/compteActif.js).
//     Base Synergia fermée depuis le 16/11/2026 : si cette lecture ne trouve
//     rien (compte Google pro rattaché, fiche RH…), Synergia répond lui-même
//     (/api/membre-actif, lecture seule, avec le même jeton) — cas de Makalu
//     le 23/11/2026, refusé alors qu'il est membre actif.
//  3. Admins de l'éditeur : propriétaires (allan@gamedoor41.fr), admins
//     Synergia, et la variable Netlify EDITEUR_ADMINS (adresses séparées par
//     des virgules).
// Rien n'est journalisé (ni jeton, ni adresse).
// ==========================================================================

import { createPublicKey, verify as verifierSignature } from 'node:crypto';

export const PROJET_DEFAUT = 'synergia-app-f27e7';
export const DOMAINE_DEFAUT = 'gamedoor41.fr';
export const PROPRIETAIRES = ['allan@gamedoor41.fr'];
export const SYNERGIA_DEFAUT = 'https://synergia-brain-caen.netlify.app';
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

/**
 * Fiche « vide » : créée par une connexion refusée (compte Google pro pas encore
 * rattaché), sans rien de ce qu'a un vrai compte (XP, pseudo, profil RH).
 * Même règle que rattacherCompte.cjs de Synergia.
 */
export const ficheVide = (d) => {
  if (!d || typeof d !== 'object') return true;
  const xp = Number(d.gamification && d.gamification.totalXp) || 0;
  return xp <= 0 && !d.pseudo && !d.profile && !d.contractData;
};

/**
 * Toutes les fiches Synergia qui peuvent être celles de la personne :
 *  - users/{uid} du compte connecté ;
 *  - users/{aliasDe} quand le compte Google pro a été rattaché au vrai compte
 *    (claim « aliasDe » posé par Synergia, incident Lwiz / Polar du 12/11/2026) ;
 *  - les fiches dont l'adresse (email ou profile.email) est la sienne.
 */
async function fichesSynergia(charge, jeton, { projet, fetchFn }) {
  const base = 'https://firestore.googleapis.com/v1/projects/' + projet + '/databases/(default)/documents';
  const h = { Authorization: 'Bearer ' + jeton, 'Content-Type': 'application/json' };
  const fiches = [];
  // incomplet = une lecture a été refusée ou a échoué. Depuis la fermeture de la base
  // Synergia (16/11/2026), un compte sans la marque « membre » ne lit QUE sa propre
  // fiche : la fiche d'un compte rattaché et la recherche par adresse sont refusées.
  let incomplet = false;
  const uids = [charge.sub];
  if (typeof charge.aliasDe === 'string' && /^[A-Za-z0-9_-]{6,128}$/.test(charge.aliasDe) && charge.aliasDe !== charge.sub) uids.push(charge.aliasDe);
  for (const uid of uids) {
    try {
      const r = await fetchFn(base + '/users/' + encodeURIComponent(uid), { headers: h, signal: AbortSignal.timeout(4000) });
      if (r.ok) fiches.push(objetFirestore((await r.json()).fields));
      else if (r.status !== 404) incomplet = true;
    } catch (_) { incomplet = true; }
  }
  // une adresse NON vérifiée (connexion par mot de passe) ne sert jamais à chercher une fiche
  if (charge.email && charge.email_verified === true) {
    for (const champ of ['email', 'profile.email']) {
      try {
        const q = await fetchFn(base + ':runQuery', {
          method: 'POST', headers: h, signal: AbortSignal.timeout(4000),
          body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'users' }], where: { fieldFilter: { field: { fieldPath: champ }, op: 'EQUAL', value: { stringValue: charge.email } } }, limit: 5 } }),
        });
        if (!q.ok) { incomplet = true; continue; }
        for (const ligne of await q.json()) if (ligne.document) fiches.push(objetFirestore(ligne.document.fields));
      } catch (_) { incomplet = true; }
    }
  }
  return { fiches, incomplet };
}

/**
 * Quand la fiche n'est pas lisible avec le jeton de la personne, on pose la question
 * à Synergia, qui lit avec ses propres droits (/api/membre-actif, lecture seule, même
 * jeton). Réponse : { actif: true, nom, admin } ou { actif: false, code } ; null si
 * Synergia ne répond pas (l'éditeur garde alors sa propre conclusion).
 */
async function demanderASynergia(jeton, { env, fetchFn }) {
  const base = String(env.EDITEUR_SYNERGIA_URL || SYNERGIA_DEFAUT).replace(/\/+$/, '');
  try {
    const r = await fetchFn(base + '/api/membre-actif', {
      method: 'POST', headers: { Authorization: 'Bearer ' + jeton, 'Content-Type': 'application/json' }, body: '{}',
      signal: AbortSignal.timeout(6500),
    });
    if (!r.ok) return null;
    const d = await r.json();
    return d && d.ok === true && typeof d.actif === 'boolean' ? d : null;
  } catch (_) { return null; }
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
  const verifiee = charge.email_verified === true && !!email;
  // Décision d'Allan (23/11/2026) : TOUS les membres actifs, quelle que soit leur façon de se
  // connecter à Synergia — Google (pro ou habituel, adresse vérifiée par Google) ou adresse +
  // mot de passe de Synergia (appli Android). Jamais un jeton « custom » ou anonyme.
  if (!((fournisseur === 'google.com' && verifiee) || fournisseur === 'password')) {
    throw new RefusAcces('Connectez-vous avec Google ou avec l’adresse et le mot de passe de votre compte Synergia.', 403, 'DOMAINE');
  }
  const pro = verifiee && email.endsWith('@' + domaine);
  const admins = new Set([...PROPRIETAIRES, ...String(env.EDITEUR_ADMINS || '').split(/[\s,;]+/)].map((e) => e.trim().toLowerCase()).filter(Boolean));
  // une adresse non vérifiée (mot de passe) n'ouvre JAMAIS les droits d'un propriétaire
  const proprietaire = verifiee && admins.has(email);
  // Lecture directe seulement pour un membre validé (marque « membre » posée par Synergia) :
  // sans elle, la base fermée refuse tout sauf sa propre fiche, et une fiche remplie avant
  // la fermeture ne prouve pas qu'on fait partie de l'équipe → c'est Synergia qui tranche.
  const membre = charge.membre === true;
  const { fiches, incomplet } = membre ? await fichesSynergia({ ...charge, email }, jeton, { projet, fetchFn }) : { fiches: [], incomplet: true };
  // une vraie fiche active (une fiche vide créée par une connexion refusée ne compte pas)
  const actives = fiches.filter((f) => estCompteActif(f) && !ficheVide(f));
  let viaSynergia = null;
  if (!actives.length && !proprietaire) {
    viaSynergia = await demanderASynergia(jeton, { env, fetchFn });
    if (!viaSynergia || !viaSynergia.actif) {
      const code = viaSynergia ? viaSynergia.code : (fiches.some((f) => !estCompteActif(f)) ? 'INACTIF' : null);
      if (!code && incomplet) {
        throw new RefusAcces('Vérification de votre compte Synergia impossible pour le moment : réessayez dans une minute.', 503, 'INDISPONIBLE');
      }
      if (code === 'INACTIF') throw new RefusAcces('Votre compte Synergia n’est plus actif : l’accès à l’éditeur est fermé.', 403, 'INACTIF');
      if (code === 'NON_MEMBRE') throw new RefusAcces('Votre compte Synergia n’est pas encore validé : demandez à Allan de l’accepter dans Synergia (Accès à Synergia), puis reconnectez-vous ici.', 403, 'NON_MEMBRE');
      throw new RefusAcces('Aucun compte Synergia actif ne correspond à ' + (email || 'ce compte') + '. Connectez-vous avec le compte que vous utilisez pour Synergia (Google, ou adresse et mot de passe), ou demandez à Allan.', 403, 'INCONNU');
    }
  }
  const fiche = actives[0] || {};
  const nom = String((viaSynergia && viaSynergia.nom) || fiche.pseudo || (fiche.profile && fiche.profile.firstName) || fiche.firstName || fiche.displayName || charge.name || (pro ? email.split('@')[0] : '') || 'Membre').trim();
  // emailPublic : seule adresse écrite dans le dépôt PUBLIC du site (auteur, aperçu, historique) ;
  // une adresse perso n'y apparaît jamais.
  const qui = { uid: charge.sub, email, emailPublic: pro ? email : null, nom, admin: proprietaire || actives.some(estAdminSynergia) || (!!viaSynergia && viaSynergia.admin === true) };
  if (cache.size > 300) cache.clear();
  cache.set(jeton, { qui, expire: Math.min(charge.exp * 1000, maintenant + 5 * 60e3) });
  return qui;
}
