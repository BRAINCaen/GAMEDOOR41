import test from 'node:test';
import assert from 'node:assert/strict';
import { creerMoteur, normaliserEmail, parisDe, jourCalendrier, resultatVisible, verifierDefis, defiPublic, corriger, lireJeton, signer, etiquetteGagnant, MAX_INSCRIPTIONS_PAR_IP } from '../coeur.mjs';
import { stockageMemoire } from '../stockage.mjs';
import { contexteDe } from '../entree.mjs';
import { lotsPrevus } from '../lots-2026.mjs';

import { defisDEssai } from './defis-essai.mjs';
const bonne = (d) => (d.type === 'qcm' ? d.bonne : d.code);
const mauvaise = (d) => (d.type === 'qcm' ? (d.bonne + 1) % 4 : '999');

async function monde({ contexte = 'production', date = '2026-12-05T10:00:00+01:00' } = {}) {
  const horloge = { t: new Date(date) };
  const stockage = stockageMemoire();
  const moteur = creerMoteur({ stockage, contexte, maintenant: () => horloge.t });
  const defis = defisDEssai();
  await stockage.ecrire('config/defis', defis);
  const appel = async (methode, chemin, { corps, jeton, code, jour, ip = '1.1.1.1' } = {}) => {
    const headers = {};
    if (jeton) headers['x-avent-jeton'] = jeton;
    if (code) headers['x-avent-code'] = code;
    if (jour != null) headers['x-avent-jour'] = String(jour);
    const r = await moteur.gerer(new Request('https://gamedoor41.fr/api/avent/' + chemin, { method: methode, headers, body: corps ? JSON.stringify(corps) : undefined }), { ip });
    const type = r.headers.get('content-type') || '';
    return { statut: r.status, corps: type.includes('json') ? await r.json() : await r.text() };
  };
  const inscrire = (n, j, reponse, plus = {}) => appel('POST', 'jouer', { corps: { j, reponse, prenom: 'Joueur' + n, email: 'joueur' + n + '@exemple.fr', reglement: true, ...plus }, ip: '10.0.' + Math.floor(n / 200) + '.' + (n % 200) });
  return { horloge, stockage, moteur, defis, appel, inscrire, a: (d) => { horloge.t = new Date(d); } };
}

test('heure de Paris et jours du calendrier', () => {
  assert.deepEqual(parisDe(new Date('2026-11-30T22:59:00Z')), { annee: 2026, mois: 11, jour: 30, heure: 23 });
  assert.equal(jourCalendrier(parisDe(new Date('2026-11-30T22:59:00Z'))), 0);
  assert.equal(jourCalendrier(parisDe(new Date('2026-11-30T23:00:00Z'))), 1, 'le 1er décembre commence à minuit, heure de Paris');
  assert.equal(jourCalendrier(parisDe(new Date('2026-12-24T22:59:00Z'))), 24);
  assert.equal(jourCalendrier(parisDe(new Date('2026-12-24T23:00:00Z'))), 25);
  assert.equal(jourCalendrier(parisDe(new Date('2027-01-02T10:00:00Z'))), 99);
  assert.equal(resultatVisible(5, { cal: 5, heure: 23 }), false);
  assert.equal(resultatVisible(5, { cal: 6, heure: 11 }), false, 'pas avant midi le lendemain');
  assert.equal(resultatVisible(5, { cal: 6, heure: 12 }), true);
  assert.equal(resultatVisible(5, { cal: 7, heure: 0 }), true);
});

test('adresses mail : une personne = une adresse', () => {
  assert.equal(normaliserEmail('pas une adresse'), null);
  assert.equal(normaliserEmail('a@b'), null);
  assert.equal(normaliserEmail('  Jean.Dupont+avent@Gmail.com ').cle, 'jeandupont@gmail.com');
  assert.equal(normaliserEmail('jean.dupont@googlemail.com').cle, 'jeandupont@gmail.com');
  assert.equal(normaliserEmail('jean.dupont+x@orange.fr').cle, 'jean.dupont@orange.fr');
  assert.equal(etiquetteGagnant({ prenom: 'Camille', email: 'camille.martin@gmail.com' }), 'Camille (ca•••@g•••)');
});

test('défis : contrôle, version publique sans réponse, correction', () => {
  const defis = defisDEssai();
  assert.equal(verifierDefis(defis), null);
  assert.match(verifierDefis(defis.slice(0, 23)), /24/);
  assert.match(verifierDefis(defis.map((d) => (d.j === 3 ? { ...d, bonne: 9 } : d))), /Défi 3/);
  const pub = defiPublic(defis[4]);
  assert.equal(pub.code, undefined); assert.equal(pub.explication, undefined); assert.equal(pub.prod, undefined);
  assert.equal(defiPublic(defis[0]).bonne, undefined);
  assert.deepEqual(corriger(defis[0], defis[0].bonne), { ok: true, juste: true, reponse: defis[0].bonne });
  assert.equal(corriger(defis[0], 7).ok, false);
  assert.equal(corriger(defis[0], '1').ok, false, 'un texte n’est pas un choix');
  assert.equal(corriger(defis[4], '105').juste, true);
  assert.equal(corriger(defis[4], '15').ok, false, 'mauvaise longueur');
  assert.equal(corriger(defis[4], '1e5').ok, false);
});

test('jetons : signés, infalsifiables', () => {
  const id = 'a'.repeat(40);
  const j = signer(id, 'secret');
  assert.equal(lireJeton(j, 'secret'), id);
  assert.equal(lireJeton(j, 'autre'), null);
  assert.equal(lireJeton(id + '.' + '0'.repeat(32), 'secret'), null);
  assert.equal(lireJeton('', 'secret'), null);
});

test('jouer : inscription, une seule réponse par porte, rien ne fuit avant le lendemain midi', async () => {
  const m = await monde();
  const d5 = m.defis[4];
  assert.equal((await m.appel('POST', 'jouer', { corps: { j: 5, reponse: bonne(d5) } })).statut, 401, 'sans prénom ni mail');
  assert.equal((await m.appel('POST', 'jouer', { corps: { j: 5, reponse: bonne(d5), prenom: 'Camille', email: 'c@exemple.fr' } })).corps.erreur, 'reglement');
  assert.equal((await m.appel('POST', 'jouer', { corps: { j: 5, reponse: bonne(d5), prenom: 'Camille', email: 'x@yopmail.com', reglement: true } })).corps.erreur, 'email_jetable');
  assert.equal((await m.appel('POST', 'jouer', { corps: { j: 6, reponse: 0, prenom: 'Camille', email: 'c@exemple.fr', reglement: true } })).corps.erreur, 'fermee');
  assert.equal((await m.appel('POST', 'jouer', { corps: { j: 5, reponse: 'abc', prenom: 'Camille', email: 'c@exemple.fr', reglement: true } })).corps.erreur, 'reponse');

  const r = await m.appel('POST', 'jouer', { corps: { j: 5, reponse: bonne(d5), prenom: ' Camille ', email: 'C@Exemple.fr', reglement: true, nouvelles: true } });
  assert.equal(r.statut, 200);
  assert.equal(r.corps.moi.prenom, 'Camille');
  assert.equal(r.corps.moi.tickets, 1, 'le bonus de bonne réponse ne se voit pas avant le résultat');
  assert.equal(r.corps.moi.bonusEnAttente, 1);
  assert.equal(r.corps.moi.reponses[5].juste, undefined, 'on ne dit pas si c’est juste');
  assert.ok(!JSON.stringify(r.corps).includes('Explication'));
  const jeton = r.corps.jeton;

  const encore = await m.appel('POST', 'jouer', { corps: { j: 5, reponse: mauvaise(d5) }, jeton });
  assert.equal(encore.statut, 409);
  const parMail = await m.appel('POST', 'jouer', { corps: { j: 5, reponse: mauvaise(d5), prenom: 'Autre', email: 'c@exemple.fr', reglement: true } });
  assert.equal(parMail.statut, 409, 'même adresse = même personne, même sans jeton');

  // porte passée, en rattrapage : 1 ticket, pas de bonus
  const rat = await m.appel('POST', 'jouer', { corps: { j: 2, reponse: bonne(m.defis[1]) }, jeton });
  assert.equal(rat.statut, 200);
  assert.equal(rat.corps.moi.reponses[2].leJour, false);

  // état : les résultats des jours 1 à 3 sont visibles (le 4 seulement à midi)
  const e = await m.appel('GET', 'etat', { jeton });
  assert.deepEqual(Object.keys(e.corps.resultats), ['1', '2', '3']);
  assert.equal(e.corps.portes[4].titre, 'Défi 5'); assert.equal(e.corps.portes[5].titre, null, 'titre des portes à venir caché');
  assert.equal(e.corps.moi.reponses[2].juste, true);
  assert.equal(e.corps.moi.tickets, 2, 'rattrapage : pas de bonus même si juste');
  m.a('2026-12-05T12:00:00+01:00');
  assert.ok((await m.appel('GET', 'etat')).corps.resultats[4]);
  m.a('2026-12-06T12:00:00+01:00');
  const lendemain = await m.appel('GET', 'etat', { jeton });
  assert.equal(lendemain.corps.moi.tickets, 3, '1 + bonus de la porte 5, + 1 de rattrapage');
  assert.equal(lendemain.corps.resultats[5].bonne, d5.code);
  assert.equal(lendemain.corps.resultats[5].gagnant, 'Camille (c•••@e•••)');

  // défi : jamais la réponse, jamais une porte fermée
  const pub = await m.appel('GET', 'defi?j=6');
  assert.equal(pub.statut, 200); assert.equal(pub.corps.defi.bonne, undefined); assert.equal(pub.corps.defi.explication, undefined);
  assert.equal((await m.appel('GET', 'defi?j=7')).statut, 403);
});

test('avant le 1er et après le 24, on ne joue pas', async () => {
  const m = await monde({ date: '2026-11-30T20:00:00+01:00' });
  assert.equal((await m.inscrire(1, 1, 0)).corps.erreur, 'pas_commence');
  m.a('2026-12-25T00:10:00+01:00');
  assert.equal((await m.inscrire(1, 24, '124')).corps.erreur, 'termine');
});

test('simulation du jour : seulement sur un aperçu, jamais sur le vrai site', async () => {
  const prod = await monde({ date: '2026-11-25T10:00:00+01:00' });
  assert.equal((await prod.appel('GET', 'etat', { jour: 12 })).corps.cal, 0);
  assert.equal((await prod.appel('POST', 'essai/effacer')).statut, 404);
  const essai = await monde({ contexte: 'apercu', date: '2026-11-25T10:00:00+01:00' });
  const e = await essai.appel('GET', 'etat', { jour: 12 });
  assert.equal(e.corps.cal, 12); assert.equal(e.corps.simule, true);
  assert.equal(Object.keys(e.corps.resultats).length, 11);
  assert.equal(contexteDe('gamedoor41.fr'), 'production');
  assert.equal(contexteDe('www.gamedoor41.fr'), 'production');
  assert.equal(contexteDe('gamedoor41.netlify.app'), 'production');
  assert.equal(contexteDe('deploy-preview-70--gamedoor41.netlify.app'), 'apercu');
  assert.equal(contexteDe('autre-site.exemple'), 'production', 'dans le doute : le plus strict');
});

test('limite d’inscriptions par connexion', async () => {
  const m = await monde();
  for (let i = 0; i < MAX_INSCRIPTIONS_PAR_IP; i++) assert.equal((await m.appel('POST', 'jouer', { corps: { j: 5, reponse: '105', prenom: 'Joueur', email: 'j' + i + '@exemple.fr', reglement: true }, ip: '9.9.9.9' })).statut, 200);
  assert.equal((await m.appel('POST', 'jouer', { corps: { j: 5, reponse: '105', prenom: 'Joueur', email: 'trop@exemple.fr', reglement: true }, ip: '9.9.9.9' })).statut, 429);
  assert.equal((await m.appel('POST', 'jouer', { corps: { j: 5, reponse: '105', prenom: 'Joueur', email: 'ailleurs@exemple.fr', reglement: true }, ip: '8.8.8.8' })).statut, 200);
});

test('tirage du jour : un seul gagnant, parmi ceux qui ont joué le jour même, une seule fois', async () => {
  const m = await monde({ date: '2026-12-05T10:00:00+01:00' });
  for (let n = 1; n <= 30; n++) await m.inscrire(n, 5, n % 2 ? bonne(m.defis[4]) : mauvaise(m.defis[4]));
  m.a('2026-12-06T09:00:00+01:00');
  await m.inscrire(99, 5, bonne(m.defis[4])); // rattrapage : hors tirage du jour
  assert.equal(await m.moteur.assurerTirages(m.moteur.quandReel()), 4, 'à 9 h le 6 : tirages des portes 1 à 4 seulement');
  m.a('2026-12-06T12:00:30+01:00');
  const [a, b] = await Promise.all([m.moteur.assurerTirages(m.moteur.quandReel()), m.moteur.assurerTirages(m.moteur.quandReel())]);
  assert.equal(a + b, 1, 'deux appels en même temps : un seul tirage');
  const t = await m.stockage.lire('tirages/05');
  assert.equal(t.participants, 30);
  assert.match(t.gagnant.email, /^joueur\d+@exemple\.fr$/);
  assert.notEqual(t.gagnant.email, 'joueur99@exemple.fr');
  const t1 = await m.stockage.lire('tirages/01');
  assert.equal(t1.gagnant, null, 'personne n’a joué la porte 1 le jour même');
  assert.equal(await m.moteur.assurerTirages(m.moteur.quandReel()), 0);
});

test('aperçu avec jour simulé : un tirage périmé est refait, jamais sur le vrai site', async () => {
  const essai = await monde({ contexte: 'apercu', date: '2026-11-25T10:00:00+01:00' });
  assert.equal((await essai.appel('GET', 'etat', { jour: 6 })).corps.resultats[5].gagnant, null, 'personne n’a encore joué');
  const r = await essai.appel('POST', 'jouer', { jour: 5, corps: { j: 5, reponse: '105', prenom: 'Allan', email: 'allan@exemple.fr', reglement: true } });
  assert.equal(r.statut, 200);
  essai.a('2026-11-25T10:01:00+01:00');
  assert.equal((await essai.appel('GET', 'etat', { jour: 6 })).corps.resultats[5].gagnant, 'Allan (al•••@e•••)', 'le tirage d’essai suit les nouveaux joueurs');
  await essai.appel('POST', 'essai/effacer', { jeton: r.corps.jeton });
  essai.a('2026-11-25T10:02:00+01:00');
  assert.equal((await essai.appel('GET', 'etat', { jour: 6 })).corps.resultats[5].gagnant, null, 'joueur d’essai effacé : plus de gagnant');

  const vrai = await monde({ date: '2026-12-05T10:00:00+01:00' });
  await vrai.inscrire(1, 5, '105');
  vrai.a('2026-12-06T12:30:00+01:00');
  const avant = (await vrai.appel('GET', 'etat')).corps.resultats[5].gagnant;
  await vrai.inscrire(2, 5, '105');
  vrai.a('2026-12-06T12:32:00+01:00');
  assert.equal((await vrai.appel('GET', 'etat')).corps.resultats[5].gagnant, avant, 'sur le vrai site, un tirage fait ne bouge plus');
  assert.equal((await vrai.stockage.lire('tirages/05')).participants, 1);
});

test('une même personne ne gagne qu’un tirage : on retire parmi les autres, sauf s’il n’y a personne d’autre', async () => {
  const m = await monde({ date: '2026-12-01T10:00:00+01:00' });
  const jetons = {};
  for (let j = 1; j <= 4; j++) {
    m.a('2026-12-0' + j + 'T10:00:00+01:00');
    for (const n of [1, 2, 3]) {
      const r = await m.appel('POST', 'jouer', { corps: { j, reponse: bonne(m.defis[j - 1]), prenom: 'Joueur' + n, email: 'joueur' + n + '@exemple.fr', reglement: true }, jeton: jetons[n], ip: '10.1.1.' + n });
      assert.equal(r.statut, 200); jetons[n] = r.corps.jeton;
    }
  }
  m.a('2026-12-05T12:05:00+01:00');
  assert.equal(await m.moteur.assurerTirages(m.moteur.quandReel()), 4);
  const t = [];
  for (let j = 1; j <= 4; j++) t.push(await m.stockage.lire('tirages/0' + j));
  assert.equal(new Set(t.slice(0, 3).map((x) => x.gagnant.id)).size, 3, 'portes 1 à 3 : trois gagnants différents');
  assert.deepEqual(t.slice(0, 3).map((x) => x.dejaGagnants), [0, 1, 2]);
  assert.ok(t[3].gagnant, 'porte 4 : les trois ont déjà gagné, on tire quand même parmi tous');
  assert.equal(t[3].dejaGagnants, 0); assert.equal(t[3].participants, 3);
  // l'équipe remplace le gagnant de la porte 3 : ni lui, ni ceux qui ont gagné ailleurs s'il reste quelqu'un d'autre
  await m.appel('POST', 'equipe/initialiser', { corps: { code: 'un-code-assez-long' } });
  const r = await m.appel('POST', 'equipe/tirage', { code: 'un-code-assez-long', corps: { cle: 3, action: 'retirer' } });
  assert.notEqual(r.corps.tirage.gagnant.id, t[2].gagnant.id);
});

test('écran de l’équipe : code, bilan, retirer au sort, lots, export, défis', async () => {
  const m = await monde({ date: '2026-12-05T10:00:00+01:00' });
  assert.equal((await m.appel('GET', 'equipe/bilan', { code: 'nimporte' })).statut, 401);
  assert.equal((await m.appel('POST', 'equipe/initialiser', { corps: { code: 'court' } })).statut, 400);
  assert.equal((await m.appel('POST', 'equipe/initialiser', { corps: { code: 'un-code-assez-long' } })).statut, 200);
  assert.equal((await m.appel('POST', 'equipe/initialiser', { corps: { code: 'un-autre-code-long' } })).statut, 409, 'le code ne se remplace pas');
  const code = 'un-code-assez-long';
  for (let n = 1; n <= 6; n++) await m.inscrire(n, 5, bonne(m.defis[4]), { nouvelles: n <= 2 });
  m.a('2026-12-06T13:00:00+01:00');
  const b = await m.appel('GET', 'equipe/bilan', { code });
  assert.equal(b.statut, 200);
  assert.equal(b.corps.inscrits, 6); assert.equal(b.corps.nouvelles, 2); assert.equal(b.corps.jours[4].leJour, 6); assert.equal(b.corps.jours[4].justes, 6);
  const premier = b.corps.jours[4].tirage.gagnant;
  assert.ok(premier.email);
  const r = await m.appel('POST', 'equipe/tirage', { code, corps: { cle: 5, action: 'retirer', raison: 'pas de réponse' } });
  assert.notEqual(r.corps.tirage.gagnant.id, premier.id);
  assert.equal(r.corps.tirage.anciens[0].id, premier.id);
  assert.equal((await m.appel('POST', 'equipe/tirage', { code, corps: { cle: 5, action: 'prevenu' } })).corps.tirage.prevenu, true);
  assert.equal((await m.appel('POST', 'equipe/tirage', { code, corps: { cle: 5, action: 'lot', valeur: '1 place de quiz' } })).corps.tirage.lot, '1 place de quiz');
  assert.equal((await m.appel('GET', 'etat')).corps.resultats[5].lot, '1 place de quiz');
  assert.equal((await m.appel('POST', 'equipe/lots', { code, corps: { lots: { 5: 'Une place', grand: 'Soirée', pirate: 'x' } } })).statut, 200);
  assert.deepEqual((await m.appel('GET', 'equipe/bilan', { code })).corps.lots, { 5: 'Une place', grand: 'Soirée' });
  const csv = (await m.appel('GET', 'equipe/export', { code })).corps;
  assert.equal(csv.trim().split('\r\n').length, 3, 'seulement les 2 personnes qui ont demandé les nouvelles');
  assert.equal((await m.appel('GET', 'equipe/defis', { code })).corps.defis.length, 24);
  assert.equal((await m.appel('POST', 'equipe/defis', { code, corps: { defis: m.defis.slice(1) } })).statut, 400);
});

test('lots : ceux du fichier des lots, servis à la page, corrigeables par l’équipe', async () => {
  const prevus = lotsPrevus();
  assert.equal(Object.keys(prevus).length, 26, '24 portes + grand tirage + tirage des 24 portes');
  assert.equal(prevus[2].lot, '1 place de quiz pour 1 joueur'); assert.equal(prevus[2].jeu, null);
  [6, 13, 20, 24].forEach((j) => assert.match(prevus[j].lot, /^1 place d’escape game pour 1 joueur/, 'jour à étoile ' + j));
  assert.equal(Object.keys(prevus).filter((k) => prevus[k].jeu).length, 12, '11 jeux + la DeLorean');
  assert.match(prevus[15].lot, /^1 place de quiz pour 1 joueur \+ le jeu Retour vers le futur$/);
  assert.equal(prevus[24].lot, '1 place d’escape game pour 1 joueur + la DeLorean radio-commandée');
  assert.equal(prevus[24].objet, 'la DeLorean radio-commandée');
  assert.equal(prevus[16].lot, '1 place de quiz pour 1 joueur + le jeu Scream');
  assert.equal(prevus.grand.place, 'sessionEscape'); assert.match(prevus.grand.lot, /session d’escape game pour 2 à 6 joueurs/); assert.equal(prevus.grand.objet, null);
  assert.equal(prevus.assidus.place, 'session');
  assert.match(prevus.assidus.lot, /4 à 16 candidats/);

  const horloge = { t: new Date('2026-12-04T10:00:00+01:00') };
  const stockage = stockageMemoire();
  const moteur = creerMoteur({ stockage, contexte: 'production', maintenant: () => horloge.t, lotsPrevus: prevus });
  await stockage.ecrire('config/defis', defisDEssai());
  const appel = async (methode, chemin, { corps, code } = {}) => {
    const r = await moteur.gerer(new Request('https://gamedoor41.fr/api/avent/' + chemin, { method: methode, headers: code ? { 'x-avent-code': code } : {}, body: corps ? JSON.stringify(corps) : undefined }), { ip: '3.3.3.3' });
    return { statut: r.status, corps: await r.json() };
  };
  let e = (await appel('GET', 'etat')).corps;
  assert.equal(e.portes[3].lot, '1 place de quiz pour 1 joueur + le jeu Black Stories'); assert.equal(e.portes[3].jeu, 'Black Stories');
  assert.equal(e.portes[4].jeu, null);
  assert.match(e.portes[3].image, /^\/img\/avent\/jeux\/black-stories\.jpg\?v=\d+$/, 'l’image du jeu est servie à la page');
  assert.equal(e.portes[4].image, null, 'pas de jeu, pas d’image');
  assert.match(e.lotsFinaux.grand, /session d’escape game/);
  // un joueur le 4, résultat le 5 à midi : le lot prévu s'affiche sans que l'équipe saisisse quoi que ce soit
  assert.equal((await appel('POST', 'jouer', { corps: { j: 4, reponse: bonne(defisDEssai()[3]), prenom: 'Lou', email: 'lou@exemple.fr', reglement: true } })).statut, 200);
  horloge.t = new Date('2026-12-05T12:30:00+01:00');
  e = (await appel('GET', 'etat')).corps;
  assert.equal(e.resultats[4].lot, '1 place de quiz pour 1 joueur + le jeu Black Stories');
  // l'équipe corrige le lot d'un jour : la page suit, le repère « jeu » reste
  await appel('POST', 'equipe/initialiser', { corps: { code: 'un-code-assez-long' } });
  assert.equal((await appel('POST', 'equipe/lots', { code: 'un-code-assez-long', corps: { lots: { 8: '1 place de quiz + un jeu surprise' } } })).statut, 200);
  e = (await appel('GET', 'etat')).corps;
  assert.equal(e.portes[7].lot, '1 place de quiz + un jeu surprise');
  assert.equal(e.portes[3].lot, '1 place de quiz pour 1 joueur + le jeu Black Stories');
  const b = (await appel('GET', 'equipe/bilan', { code: 'un-code-assez-long' })).corps;
  assert.equal(b.jours[3].lot, '1 place de quiz pour 1 joueur + le jeu Black Stories'); assert.equal(b.lots[8], '1 place de quiz + un jeu surprise');
});

test('grand tirage et tirage des assidus après le 24', async () => {
  const m = await monde({ date: '2026-12-01T10:00:00+01:00' });
  let jetonAssidu;
  for (let j = 1; j <= 24; j++) {
    m.a('2026-12-' + String(j).padStart(2, '0') + 'T10:00:00+01:00');
    const r = await m.appel('POST', 'jouer', { corps: { j, reponse: bonne(m.defis[j - 1]), prenom: 'Assidue', email: 'assidue@exemple.fr', reglement: true }, jeton: jetonAssidu, ip: '7.7.7.7' });
    assert.equal(r.statut, 200); jetonAssidu = r.corps.jeton;
    if (j === 3) await m.inscrire(50, 3, 0);
  }
  m.a('2026-12-25T12:05:00+01:00');
  const e = await m.appel('GET', 'etat', { jeton: jetonAssidu });
  assert.equal(e.corps.moi.tickets, 48);
  assert.equal(e.corps.finaux.assidus.gagnant, 'Assidue (as•••@e•••)');
  assert.equal((await m.stockage.lire('tirages/assidus')).dejaGagnants, 0, 'le tirage des 24 portes a lieu en premier');
  assert.equal((await m.stockage.lire('tirages/03')).gagnant.etiquette, 'Joueur50 (jo•••@e•••)', 'porte 3 : Assidue a déjà gagné, c’est l’autre joueur');
  // une seule session complète par personne : Assidue (48 tickets) est écartée du grand tirage ;
  // Joueur50, gagnant de la porte 3, peut gagner le grand tirage
  const grand = await m.stockage.lire('tirages/grand');
  assert.equal(grand.dejaGagnants, 1);
  assert.equal(grand.gagnant.etiquette, 'Joueur50 (jo•••@e•••)');
  assert.equal(e.corps.finaux.grand.gagnant, 'Joueur50 (jo•••@e•••)');
  assert.equal(grand.billets, 48 + 1 + ((0 === m.defis[2].bonne) ? 1 : 0));
  // l'équipe remplace le gagnant du grand tirage : personne d'autre que la gagnante des 24 portes → pas de gagnant
  const code = 'un-code-assez-long';
  await m.appel('POST', 'equipe/initialiser', { corps: { code } });
  const r = await m.appel('POST', 'equipe/tirage', { code, corps: { cle: 'grand', action: 'retirer', raison: 'essai' } });
  assert.equal(r.corps.tirage.gagnant, null, 'jamais les deux sessions à la même personne, même au nouveau tirage');
  // et l'inverse : nouveau tirage des 24 portes, la seule assidue est retirée → personne
  const r2 = await m.appel('POST', 'equipe/tirage', { code, corps: { cle: 'assidus', action: 'retirer' } });
  assert.equal(r2.corps.tirage.gagnant, null);
});

test('les deux sessions complètes ne vont jamais à la même personne', async () => {
  const m = await monde({ date: '2026-12-01T10:00:00+01:00' });
  const jetons = {};
  for (let j = 1; j <= 24; j++) {
    m.a('2026-12-' + String(j).padStart(2, '0') + 'T10:00:00+01:00');
    for (let n = 1; n <= 3; n++) {
      const r = await m.appel('POST', 'jouer', { corps: { j, reponse: bonne(m.defis[j - 1]), prenom: 'Fidele' + n, email: 'fidele' + n + '@exemple.fr', reglement: true }, jeton: jetons[n], ip: '8.8.8.' + n });
      assert.equal(r.statut, 200); jetons[n] = r.corps.jeton;
    }
  }
  m.a('2026-12-25T12:05:00+01:00');
  await m.appel('GET', 'etat');
  const grand = await m.stockage.lire('tirages/grand'), assidus = await m.stockage.lire('tirages/assidus');
  assert.ok(grand.gagnant && assidus.gagnant);
  assert.notEqual(grand.gagnant.id, assidus.gagnant.id);
  assert.equal(grand.dejaGagnants, 1);
});
