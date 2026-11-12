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
  const c = { iss: 'https://securetoken.google.com/' + PROJET, aud: PROJET, iat: maintenant - 10, exp: maintenant + 3600, auth_time: maintenant - 10, sub: 'uid-1', email: 'lea@gamedoor41.fr', email_verified: true, firebase: { sign_in_provider: 'google.com' }, ...charge };
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

test('compte Google d’un autre domaine : refusé', async () => {
  await refuse(jeton({ sub: 'uid-gmail', email: 'lea@gmail.com' }), reseau(), 'DOMAINE');
});

test('adresse non vérifiée ou connexion par mot de passe : refusées', async () => {
  await refuse(jeton({ sub: 'uid-nv', email_verified: false }), reseau(), 'DOMAINE');
  await refuse(jeton({ sub: 'uid-mdp', firebase: { sign_in_provider: 'password' } }), reseau(), 'DOMAINE');
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
