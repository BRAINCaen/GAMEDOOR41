// Contrôle d'accès de l'éditeur : seuls les membres ACTIFS de Synergia, connectés
// avec Google @gamedoor41.fr, passent. Jetons signés ici avec une fausse clé.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, createSign } from 'node:crypto';
import { identifier, verifierJeton } from '../serveur/auth.mjs';

const PROJET = 'synergia-app-f27e7';
const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'cle1', alg: 'RS256', use: 'sig' };
const autre = generateKeyPairSync('rsa', { modulusLength: 2048 });

const b64 = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
function jeton(charge, { cle = privateKey, kid = 'cle1' } = {}) {
  const maintenant = Math.floor(Date.now() / 1000);
  const c = { iss: 'https://securetoken.google.com/' + PROJET, aud: PROJET, iat: maintenant - 10, exp: maintenant + 3600, auth_time: maintenant - 10, sub: 'uid-1', email: 'lea@gamedoor41.fr', email_verified: true, firebase: { sign_in_provider: 'google.com' }, membre: true, ...charge };
  const tete = b64({ alg: 'RS256', kid, typ: 'JWT' });
  const corps = b64(c);
  const s = createSign('RSA-SHA256').update(tete + '.' + corps).sign(cle).toString('base64url');
  return tete + '.' + corps + '.' + s;
}

/** Faux réseau : clés publiques de Google + Firestore de Synergia. */
function reseau({ fiche = { isActive: true, pseudo: 'Léa' }, parEmail = null, parUid = null } = {}) {
  return async (url, o = {}) => {
    const rep = (status, body, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
    if (url.includes('securetoken@system.gserviceaccount.com')) return rep(200, { keys: [jwk] }, { 'cache-control': 'public, max-age=3600' });
    const enChamps = (f) => Object.fromEntries(Object.entries(f).map(([k, v]) => [k, typeof v === 'boolean' ? { booleanValue: v } : { stringValue: String(v) }]));
    if (url.includes('/documents/users/')) {
      const uid = decodeURIComponent(url.split('/documents/users/')[1]);
      const f = parUid ? parUid[uid] : fiche;
      return f ? rep(200, { fields: enChamps(f) }) : rep(404, {});
    }
    if (url.endsWith(':runQuery')) return rep(200, parEmail ? [{ document: { fields: enChamps(parEmail) } }] : [{}]);
    return rep(404, {});
  };
}
const requete = (j) => new Request('https://gamedoor41.fr/api/editeur/moi', { headers: j ? { Authorization: 'Bearer ' + j } : {} });
const env = { EDITEUR_ADMINS: '' };
const refuse = async (j, net, code) => assert.rejects(() => identifier(requete(j), env, { fetchFn: net }), (e) => !code || e.code === code);

test('membre actif avec Google @gamedoor41.fr : accepté', async () => {
  const q = await identifier(requete(jeton({ sub: 'uid-ok' })), env, { fetchFn: reseau() });
  assert.equal(q.email, 'lea@gamedoor41.fr');
  assert.equal(q.nom, 'Léa');
  assert.equal(q.admin, false);
});

test('compte Google PERSO d’un membre validé : accepté, et son adresse n’est jamais publiée', async () => {
  const q = await identifier(requete(jeton({ sub: 'uid-gmail', email: 'lea.perso@gmail.com' })), env, { fetchFn: reseau() });
  assert.equal(q.nom, 'Léa');
  assert.equal(q.emailPublic, null);
  const p = await identifier(requete(jeton({ sub: 'uid-pro-pub' })), env, { fetchFn: reseau() });
  assert.equal(p.emailPublic, 'lea@gamedoor41.fr');
});

test('adresse + mot de passe de Synergia (appli Android) : acceptée pour un membre validé', async () => {
  const q = await identifier(requete(jeton({ sub: 'uid-mdp', email: 'lea.perso@gmail.com', email_verified: false, firebase: { sign_in_provider: 'password' } })), env, { fetchFn: reseau() });
  assert.equal(q.nom, 'Léa');
  assert.equal(q.emailPublic, null);
});

test('Google à adresse non vérifiée, jeton « custom » ou anonyme : refusés', async () => {
  await refuse(jeton({ sub: 'uid-nv', email_verified: false }), reseau(), 'DOMAINE');
  await refuse(jeton({ sub: 'uid-custom', firebase: { sign_in_provider: 'custom' } }), reseau(), 'DOMAINE');
  await refuse(jeton({ sub: 'uid-anonyme', firebase: { sign_in_provider: 'anonymous' } }), reseau(), 'DOMAINE');
});

test('compte Synergia archivé ou inactif : refusé', async () => {
  await refuse(jeton({ sub: 'uid-arch' }), reseau({ fiche: { isActive: true, isArchived: true } }), 'INACTIF');
  await refuse(jeton({ sub: 'uid-inact' }), reseau({ fiche: { isActive: false } }), 'INACTIF');
  await refuse(jeton({ sub: 'uid-fus' }), reseau({ fiche: { _mergedInto: 'x' } }), 'INACTIF');
});

test('aucune fiche Synergia : refusé ; fiche retrouvée par l’adresse : accepté', async () => {
  await refuse(jeton({ sub: 'uid-inconnu' }), reseau({ fiche: null }), 'INCONNU');
  const q = await identifier(requete(jeton({ sub: 'uid-par-email' })), env, { fetchFn: reseau({ fiche: null, parEmail: { isActive: true, pseudo: 'Léa', isAdmin: true } }) });
  assert.equal(q.admin, true);
});

test('propriétaire (allan@gamedoor41.fr) : accepté et admin même sans fiche', async () => {
  const q = await identifier(requete(jeton({ sub: 'uid-allan', email: 'allan@gamedoor41.fr' })), env, { fetchFn: reseau({ fiche: null }) });
  assert.equal(q.admin, true);
});

test('jetons falsifiés, expirés ou d’un autre projet : refusés', async () => {
  await refuse(jeton({ sub: 'uid-faux' }, { cle: autre.privateKey }), reseau(), 'CONNEXION');
  await refuse(jeton({ sub: 'uid-exp', exp: Math.floor(Date.now() / 1000) - 120 }), reseau(), 'CONNEXION');
  await refuse(jeton({ sub: 'uid-aud', aud: 'autre-projet', iss: 'https://securetoken.google.com/autre-projet' }), reseau(), 'CONNEXION');
  await refuse(jeton({ sub: 'uid-kid' }, { kid: 'inconnue' }), reseau(), 'CONNEXION');
  await refuse(null, reseau(), 'CONNEXION');
  await refuse('pas.un.jeton', reseau(), 'CONNEXION');
  // charge modifiée après signature
  const j = jeton({ sub: 'uid-modif' }).split('.');
  const charge = JSON.parse(Buffer.from(j[1], 'base64url').toString());
  charge.email = 'allan@gamedoor41.fr';
  await refuse(j[0] + '.' + b64(charge) + '.' + j[2], reseau(), 'CONNEXION');
});

test('vérification seule du jeton', async () => {
  const c = await verifierJeton(jeton({ sub: 'uid-v' }), { projet: PROJET, fetchFn: reseau() });
  assert.equal(c.sub, 'uid-v');
});

test('compte Google pro rattaché (alias) : la vraie fiche est retrouvée', async () => {
  // fiche vide créée par une connexion refusée + vraie fiche trouvée par l'adresse
  const q1 = await identifier(requete(jeton({ sub: 'uid-alias1', email: 'lwiz@gamedoor41.fr' })), env, { fetchFn: reseau({ parUid: { 'uid-alias1': { email: 'lwiz@gamedoor41.fr' } }, parEmail: { isActive: true, pseudo: 'Lwiz', email: 'lwiz@gamedoor41.fr' } }) });
  assert.equal(q1.nom, 'Lwiz');
  // claim aliasDe posé par Synergia
  const q2 = await identifier(requete(jeton({ sub: 'uid-alias2', email: 'polar@gamedoor41.fr', aliasDe: 'uid-vrai-polar' })), env, { fetchFn: reseau({ parUid: { 'uid-vrai-polar': { isActive: true, pseudo: 'Polar' } } }) });
  assert.equal(q2.nom, 'Polar');
  // seulement une fiche vide : refusé
  await refuse(jeton({ sub: 'uid-vide', email: 'inconnu@gamedoor41.fr' }), reseau({ parUid: { 'uid-vide': { email: 'inconnu@gamedoor41.fr' } } }), 'INCONNU');
  // fiche vide + vraie fiche archivée : refusé (ancien membre)
  await refuse(jeton({ sub: 'uid-parti', email: 'parti@gamedoor41.fr' }), reseau({ parUid: { 'uid-parti': {} }, parEmail: { isActive: true, isArchived: true, pseudo: 'Parti' } }), 'INACTIF');
});

// ---- Base Synergia FERMÉE (depuis le 16/11/2026) : un compte sans la marque « membre »
// ne lit que SA fiche ; la fiche du vrai compte et la recherche par adresse sont refusées
// (403). L'éditeur demande alors à Synergia (/api/membre-actif). Cas de Makalu, 23/11/2026.
function baseFermee({ propre = null, synergia = undefined, synergiaStatut = 200 } = {}) {
  const appels = { synergia: [] };
  const net = async (url, o = {}) => {
    const rep = (status, body, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
    if (url.includes('securetoken@system.gserviceaccount.com')) return rep(200, { keys: [jwk] }, { 'cache-control': 'public, max-age=3600' });
    const porteur = String((o.headers && o.headers.Authorization) || '').replace(/^Bearer /, '');
    const sub = JSON.parse(Buffer.from(porteur.split('.')[1] || 'e30', 'base64url').toString()).sub;
    if (url.includes('/documents/users/')) {
      const uid = decodeURIComponent(url.split('/documents/users/')[1]);
      if (uid !== sub) return rep(403, { error: { status: 'PERMISSION_DENIED' } });
      return propre ? rep(200, { fields: Object.fromEntries(Object.entries(propre).map(([k, v]) => [k, typeof v === 'boolean' ? { booleanValue: v } : { stringValue: String(v) }])) }) : rep(404, {});
    }
    if (url.endsWith(':runQuery')) return rep(403, [{ error: { status: 'PERMISSION_DENIED' } }]);
    if (url.endsWith('/api/membre-actif')) {
      appels.synergia.push({ url, methode: o.method, porteur });
      if (synergia === undefined) return rep(404, {});
      if (synergia === 'panne') throw new TypeError('fetch failed');
      return rep(synergiaStatut, synergia);
    }
    return rep(404, {});
  };
  return { net, appels };
}

test('base fermée, compte Google pro rattaché : Synergia confirme → accepté (nom et admin de Synergia)', async () => {
  const { net, appels } = baseFermee({ synergia: { ok: true, actif: true, nom: 'Makalu', admin: false } });
  const j = jeton({ sub: 'uid-pro-makalu', email: 'makalu@gamedoor41.fr', aliasDe: 'uid-vrai-makalu' });
  const q = await identifier(requete(j), env, { fetchFn: net });
  assert.equal(q.nom, 'Makalu');
  assert.equal(q.admin, false);
  assert.equal(q.uid, 'uid-pro-makalu');
  assert.equal(appels.synergia.length, 1);
  assert.equal(appels.synergia[0].url, 'https://synergia-brain-caen.netlify.app/api/membre-actif');
  assert.equal(appels.synergia[0].methode, 'POST');
  assert.equal(appels.synergia[0].porteur, j);
  const q2 = await identifier(requete(jeton({ sub: 'uid-pro-chef', email: 'chef@gamedoor41.fr' })), env, { fetchFn: baseFermee({ synergia: { ok: true, actif: true, nom: 'Chef', admin: true } }).net });
  assert.equal(q2.admin, true);
});

test('base fermée : Synergia dit « pas de fiche » → INCONNU, « plus actif » → INACTIF', async () => {
  await refuse(jeton({ sub: 'uid-pro-x1', email: 'x1@gamedoor41.fr' }), baseFermee({ synergia: { ok: true, actif: false, code: 'AUCUNE_FICHE' } }).net, 'INCONNU');
  await refuse(jeton({ sub: 'uid-pro-x2', email: 'x2@gamedoor41.fr' }), baseFermee({ synergia: { ok: true, actif: false, code: 'INACTIF' } }).net, 'INACTIF');
  // la fiche propre active suffit : Synergia n'est pas dérangé
  const b = baseFermee({ propre: { isActive: true, pseudo: 'Léa' }, synergia: { ok: true, actif: false, code: 'AUCUNE_FICHE' } });
  const q = await identifier(requete(jeton({ sub: 'uid-pro-lea' })), env, { fetchFn: b.net });
  assert.equal(q.nom, 'Léa');
  assert.equal(b.appels.synergia.length, 0);
});

test('base fermée et Synergia muet (pas encore en ligne, panne, réponse bizarre) : « réessayez », jamais un faux refus', async () => {
  for (const [i, opts] of [[1, {}], [2, { synergia: 'panne' }], [3, { synergia: { ok: false }, synergiaStatut: 503 }], [4, { synergia: { ok: true } }]]) {
    await refuse(jeton({ sub: 'uid-pro-m' + i, email: 'm' + i + '@gamedoor41.fr' }), baseFermee(opts).net, 'INDISPONIBLE');
  }
  // propriétaire : jamais bloqué
  const q = await identifier(requete(jeton({ sub: 'uid-pro-allan', email: 'allan@gamedoor41.fr' })), env, { fetchFn: baseFermee().net });
  assert.equal(q.admin, true);
});

test('adresse de Synergia réglable (EDITEUR_SYNERGIA_URL)', async () => {
  const b = baseFermee({ synergia: { ok: true, actif: true, nom: 'Q' } });
  await identifier(requete(jeton({ sub: 'uid-pro-q', email: 'q@gamedoor41.fr' })), { ...env, EDITEUR_SYNERGIA_URL: 'https://essai.example/' }, { fetchFn: b.net });
  assert.equal(b.appels.synergia[0].url, 'https://essai.example/api/membre-actif');
});

// ---- « Tous les membres actifs » (Allan, 23/11/2026) : c'est Synergia qui tranche ----

test('TRICHE : mot de passe sur un compte créé avec l’adresse d’Allan (non vérifiée) → jamais propriétaire', async () => {
  const b = baseFermee({ synergia: { ok: true, actif: false, code: 'AUCUNE_FICHE' } });
  await refuse(jeton({ sub: 'uid-pirate', email: 'allan@gamedoor41.fr', email_verified: false, firebase: { sign_in_provider: 'password' }, membre: false }), b.net, 'INCONNU');
  assert.equal(b.appels.synergia.length, 1);
});

test('sans la marque « membre », la fiche lue ne suffit pas : Synergia tranche (NON_MEMBRE)', async () => {
  // compte inscrit seul avant la fermeture de la base : fiche remplie, accès jamais validé
  const b = baseFermee({ propre: { isActive: true, pseudo: 'Inconnu' }, synergia: { ok: true, actif: false, code: 'NON_MEMBRE' } });
  await refuse(jeton({ sub: 'uid-inscrit-seul', email: 'inconnu@gmail.com', membre: false }), b.net, 'NON_MEMBRE');
});

test('Google pro sans marque (compte rattaché) : Synergia confirme par le pseudo → accepté', async () => {
  const b = baseFermee({ synergia: { ok: true, actif: true, nom: 'Makalù', admin: false } });
  const q = await identifier(requete(jeton({ sub: 'uid-pro-mk', email: 'makalu@gamedoor41.fr', membre: false })), env, { fetchFn: b.net });
  assert.equal(q.nom, 'Makalù');
  assert.equal(q.emailPublic, 'makalu@gamedoor41.fr');
});
