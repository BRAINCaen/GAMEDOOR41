// Essais de tout ce qui se fait sans personne : lot envoyé au gagnant, réserve de codes, bilan du jour,
// questions et réclamations, fil des publications pour les réseaux sociaux.
import test from 'node:test';
import assert from 'node:assert/strict';
import { creerMoteur, MAX_ESSAIS_MAIL, MAX_QUESTIONS_PAR_IP } from '../coeur.mjs';
import { stockageMemoire } from '../stockage.mjs';
import { courrierMemoire } from '../courrier.mjs';
import { lotsPrevus } from '../lots-2026.mjs';
import { defisDEssai } from './defis-essai.mjs';

const SITE = 'https://gamedoor41.fr';
const CODE = 'un-code-assez-long';
const bonne = (d) => (d.type === 'qcm' ? d.bonne : d.code);

async function monde({ contexte = 'production', date = '2026-12-04T13:00:00+01:00', avecCourrier = true, codes = { quiz: 'QUIZ-AAA1\nQUIZ-AAA2\nQUIZ-AAA3', escape: 'ESC-BBB1', session: 'SES-CCC1' } } = {}) {
  const horloge = { t: new Date(date) };
  const stockage = stockageMemoire();
  const courrier = avecCourrier ? courrierMemoire() : null;
  const moteur = creerMoteur({ stockage, contexte, maintenant: () => horloge.t, lotsPrevus: lotsPrevus(), courrier, contact: 'equipe@exemple.fr' });
  const defis = defisDEssai();
  await stockage.ecrire('config/defis', defis);
  const appel = async (methode, chemin, { corps, code, ip = '1.1.1.1' } = {}) => {
    const r = await moteur.gerer(new Request(SITE + '/api/avent/' + chemin, { method: methode, headers: code ? { 'x-avent-code': code } : {}, body: corps ? JSON.stringify(corps) : undefined }), { ip });
    const type = r.headers.get('content-type') || '';
    return { statut: r.status, corps: type.includes('json') ? await r.json() : await r.text() };
  };
  await appel('POST', 'equipe/initialiser', { corps: { code: CODE } });
  for (const type of Object.keys(codes || {})) await appel('POST', 'equipe/codes', { code: CODE, corps: { type, codes: codes[type] } });
  const a = (d) => { horloge.t = new Date(d); };
  const jouer = (n, j) => appel('POST', 'jouer', { corps: { j, reponse: bonne(defis[j - 1]), prenom: 'Joueur' + n, email: 'joueur' + n + '@exemple.fr', reglement: true }, ip: '10.0.0.' + n });
  const passer = () => moteur.automate(moteur.quandReel(), SITE);
  // les portes d'avant (sans joueur) sont tirées et le bilan de la veille part : on repart d'une boîte vide
  await passer();
  if (courrier) courrier.boite.length = 0;
  return { horloge, stockage, courrier, moteur, defis, appel, a, jouer, passer };
}

const RESERVE_PLEINE = { quiz: Array.from({ length: 20 }, (_, i) => 'QUIZ-AAA' + (i + 1)).join(' '), escape: 'ESC-BBB1 ESC-BBB2 ESC-BBB3 ESC-BBB4', session: 'SESSION-1' };

test('le lot part tout seul : un mail, un code, une seule fois, et le bilan à l’équipe', async () => {
  const m = await monde({ codes: RESERVE_PLEINE });
  for (let n = 1; n <= 5; n++) await m.jouer(n, 4);
  assert.deepEqual(await m.passer(), { tirages: 0, envoyes: 0, echecs: 0, rapport: false }, 'tant que le lendemain midi n’est pas passé : rien');
  m.a('2026-12-05T12:01:00+01:00');
  assert.deepEqual(await m.passer(), { tirages: 1, envoyes: 1, echecs: 0, rapport: true });
  const [gagnant, bilan] = m.courrier.boite;
  assert.equal(m.courrier.boite.length, 2);
  const t = await m.stockage.lire('tirages/04');
  assert.equal(gagnant.a, t.gagnant.email);
  assert.match(gagnant.sujet, /^Bravo Joueur\d, vous avez gagné/);
  assert.match(gagnant.texte, /porte 4 \(vendredi 4 décembre\)/);
  assert.match(gagnant.texte, /parmi 5 joueurs/);
  assert.match(gagnant.texte, /Votre lot : 1 place de quiz \+ le jeu Black Stories/);
  assert.match(gagnant.texte, /Votre code : QUIZ-AAA1/);
  assert.match(gagnant.texte, /Votre cadeau, le jeu Black Stories, vous attend à l’accueil/);
  assert.match(gagnant.html, /QUIZ-AAA1/);
  assert.equal(t.code, 'QUIZ-AAA1'); assert.equal(t.prevenu, true); assert.equal(t.mail.etat, 'envoye');
  assert.equal(bilan.a, 'equipe@exemple.fr');
  assert.match(bilan.sujet, /^\[Avent\] Porte 4 : tout est parti tout seul$/);
  assert.match(bilan.texte, /5 joueurs le jour même, 5 bonnes réponses/);
  assert.match(bilan.texte, /code QUIZ-AAA1 · mail envoyé/);
  assert.match(bilan.texte, /À mettre de côté à l’accueil pour Joueur\d : le jeu Black Stories/);
  assert.match(bilan.texte, /Codes en réserve : quiz 19, escape 4, session 1/);
  // les passages suivants ne renvoient rien
  m.a('2026-12-05T12:31:00+01:00'); assert.deepEqual(await m.passer(), { tirages: 0, envoyes: 0, echecs: 0, rapport: false });
  m.a('2026-12-05T18:31:00+01:00'); await m.passer();
  assert.equal(m.courrier.boite.length, 2);
  // le lot s'affiche tout seul sur la page, le code jamais
  const e = (await m.appel('GET', 'etat')).corps;
  assert.equal(e.resultats[4].lot, '1 place de quiz + le jeu Black Stories');
  assert.doesNotMatch(JSON.stringify(e), /QUIZ-AAA|exemple\.fr/);
});

test('jour à étoile : c’est un code d’escape game qui part', async () => {
  const m = await monde({ date: '2026-12-06T13:00:00+01:00' });
  await m.jouer(1, 6);
  m.a('2026-12-07T12:05:00+01:00'); await m.passer();
  assert.match(m.courrier.boite[0].texte, /Votre lot : 1 place d’escape game \+ le jeu Esquissé \?/);
  assert.match(m.courrier.boite[0].texte, /Votre code : ESC-BBB1/);
  assert.match(m.courrier.boite[0].texte, /Ce code vous offre 1 place d’escape game/);
  assert.doesNotMatch(m.courrier.boite[0].texte, /parmi/, 'un seul joueur : on ne le dit pas');
  assert.match(m.courrier.boite[1].texte, /Il manque \d+ codes? « escape » pour finir le mois/);
});

test('réserve vide : le mail part quand même, le code suit dès que l’équipe en ajoute', async () => {
  const m = await monde({ date: '2026-12-02T13:00:00+01:00', codes: {} });
  await m.jouer(1, 2);
  m.a('2026-12-03T12:05:00+01:00'); await m.passer();
  assert.match(m.courrier.boite[0].texte, /Le code de votre place vous arrive dans un second mail, sous 48 heures/);
  assert.match(m.courrier.boite[1].sujet, /action/);
  assert.match(m.courrier.boite[1].texte, /attend son code \(quiz\), la réserve est vide/);
  m.a('2026-12-03T12:35:00+01:00'); await m.passer();
  assert.equal(m.courrier.boite.length, 2, 'toujours pas de code : pas de second mail');
  const r = await m.appel('POST', 'equipe/codes', { code: CODE, corps: { type: 'quiz', codes: 'NEUF-1, NEUF-2 ; NEUF-1 pas bon!' } });
  assert.equal(r.corps.ajoutes, 3); assert.deepEqual(r.corps.refuses, ['bon!']); assert.equal(r.corps.codes.quiz, 3);
  m.a('2026-12-03T13:05:00+01:00'); await m.passer();
  assert.equal(m.courrier.boite.length, 3);
  assert.match(m.courrier.boite[2].sujet, /^Votre code : 1 place de quiz/);
  assert.match(m.courrier.boite[2].texte, /Votre code : NEUF-1/);
  m.a('2026-12-03T13:35:00+01:00'); await m.passer();
  assert.equal(m.courrier.boite.length, 3, 'le code n’est envoyé qu’une fois');
  assert.equal((await m.appel('GET', 'equipe/bilan', { code: CODE })).corps.codes.quiz, 2);
});

test('mail en panne : nouveaux essais espacés, le code est gardé, l’équipe est prévenue', async () => {
  const m = await monde({ date: '2026-12-02T13:00:00+01:00' });
  await m.jouer(1, 2);
  m.courrier.panne();
  m.a('2026-12-03T12:05:00+01:00');
  assert.deepEqual(await m.passer(), { tirages: 1, envoyes: 0, echecs: 1, rapport: false }, 'le bilan non plus n’a pas pu partir');
  assert.deepEqual(await m.passer(), { tirages: 0, envoyes: 0, echecs: 0, rapport: false }, 'pas deux essais dans les mêmes 10 minutes');
  m.courrier.panne(false);
  m.a('2026-12-03T12:35:00+01:00');
  assert.deepEqual(await m.passer(), { tirages: 0, envoyes: 1, echecs: 0, rapport: true });
  assert.match(m.courrier.boite[0].texte, /Votre code : QUIZ-AAA1/, 'le code pris au premier essai est celui qui part');
  assert.equal((await m.appel('GET', 'equipe/bilan', { code: CODE })).corps.codes.quiz, 2);
  // panne durable : on s'arrête au bout de MAX_ESSAIS_MAIL essais
  const n = await monde({ date: '2026-12-02T13:00:00+01:00' });
  await n.jouer(1, 2);
  n.courrier.panne();
  for (let i = 0; i < MAX_ESSAIS_MAIL + 3; i++) { n.a(new Date(new Date('2026-12-03T12:05:00+01:00').getTime() + i * 30 * 60000).toISOString()); await n.passer(); }
  assert.equal((await n.stockage.lire('tirages/02')).mail.essais, MAX_ESSAIS_MAIL);
});

test('sans envoi de mails branché : rien ne casse, l’équipe garde la main', async () => {
  const m = await monde({ avecCourrier: false, date: '2026-12-02T13:00:00+01:00' });
  await m.jouer(1, 2);
  m.a('2026-12-03T12:05:00+01:00');
  assert.deepEqual(await m.passer(), { tirages: 1, envoyes: 0, echecs: 0, rapport: false });
  const b = (await m.appel('GET', 'equipe/bilan', { code: CODE })).corps;
  assert.equal(b.courrier, false); assert.equal(b.jours[1].tirage.prevenu, false);
  assert.equal((await m.appel('POST', 'equipe/rapport', { code: CODE, corps: {} })).statut, 409);
});

test('gagnant remplacé par l’équipe : le nouveau reçoit son mail et son propre code', async () => {
  const m = await monde({ date: '2026-12-02T13:00:00+01:00' });
  await m.jouer(1, 2); await m.jouer(2, 2);
  m.a('2026-12-03T12:05:00+01:00'); await m.passer();
  const premier = (await m.stockage.lire('tirages/02')).gagnant.email;
  await m.appel('POST', 'equipe/tirage', { code: CODE, corps: { cle: 2, action: 'retirer', raison: 'adresse fausse' } });
  m.a('2026-12-03T12:35:00+01:00'); await m.passer();
  const mails = m.courrier.boite.filter((x) => /^Bravo/.test(x.sujet));
  assert.equal(mails.length, 2); assert.equal(mails[0].a, premier); assert.notEqual(mails[1].a, premier);
  assert.match(mails[1].texte, /Votre code : QUIZ-AAA2/);
});

test('prévenu à la main par l’équipe : aucun mail automatique ne part en double', async () => {
  const m = await monde({ avecCourrier: false, date: '2026-12-02T13:00:00+01:00' });
  await m.jouer(1, 2);
  m.a('2026-12-03T12:05:00+01:00'); await m.passer();
  await m.appel('POST', 'equipe/tirage', { code: CODE, corps: { cle: 2, action: 'prevenu' } });
  const courrier = courrierMemoire();
  const apres = creerMoteur({ stockage: m.stockage, maintenant: () => m.horloge.t, lotsPrevus: lotsPrevus(), courrier, contact: 'equipe@exemple.fr' });
  await apres.livrer(SITE);
  assert.equal(courrier.boite.length, 0);
});

test('fin du jeu : porte 24, grand tirage (objet à retirer) et tirage des 24 portes (session de quiz)', async () => {
  const m = await monde({ date: '2026-12-01T10:00:00+01:00', codes: RESERVE_PLEINE });
  for (let j = 1; j <= 24; j++) {
    m.a('2026-12-' + String(j).padStart(2, '0') + 'T10:00:00+01:00');
    assert.equal((await m.jouer(1, j)).statut, 200);
    if (j > 1) { m.a('2026-12-' + String(j).padStart(2, '0') + 'T12:05:00+01:00'); await m.passer(); }
  }
  m.a('2026-12-25T12:05:00+01:00');
  const r = await m.passer();
  assert.equal(r.tirages, 3); assert.equal(r.envoyes, 3); assert.equal(r.rapport, true);
  const fin = m.courrier.boite.slice(-4);
  const grand = fin.find((x) => /grand tirage/.test(x.texte) && /^Bravo/.test(x.sujet));
  const assidus = fin.find((x) => /24 portes ouvertes/.test(x.texte) && /^Bravo/.test(x.sujet));
  assert.match(grand.texte, /Votre cadeau, la DeLorean radio-commandée de Retour vers le futur, vous attend/);
  assert.doesNotMatch(grand.texte, /Votre code/);
  assert.match(assidus.texte, /Votre code : SESSION-1/);
  assert.match(assidus.texte, /Ce code vous offre 1 session de quiz pour 4 à 16 candidats, émission au choix/);
  const bilan = fin.find((x) => /^\[Avent\]/.test(x.sujet));
  assert.match(bilan.sujet, /tout est parti tout seul/);
  assert.match(bilan.texte, /Grand tirage : Joueur1/); assert.match(bilan.texte, /Tirage des 24 portes : Joueur1/);
  assert.match(bilan.texte, /Codes en réserve : quiz 0, escape 0, session 0/);
  const b = (await m.appel('GET', 'equipe/bilan', { code: CODE })).corps;
  assert.deepEqual(b.besoins, { quiz: 0, escape: 0, session: 0 }); assert.equal(b.codesDonnes, 25);
  // en janvier : plus rien ne tourne
  m.a('2027-01-15T12:05:00+01:00');
  assert.deepEqual(await m.passer(), { tirages: 0, envoyes: 0, echecs: 0, rapport: false });
});

test('questions et réclamations : gardées, transmises à l’équipe, accusé de réception, pas d’abus possible', async () => {
  const m = await monde({ date: '2026-12-03T15:00:00+01:00' });
  await m.jouer(1, 3);
  const q = (corps, ip) => m.appel('POST', 'question', { corps, ip });
  assert.equal((await q({ prenom: 'Lou', email: 'pas-un-mail', message: 'Bonjour, une question sur les lots.' })).statut, 400);
  assert.equal((await q({ prenom: 'Lou', email: 'lou@exemple.fr', message: 'court' })).statut, 400);
  assert.equal((await q({ prenom: 'Lou', email: 'lou@yopmail.com', message: 'Bonjour, une question sur les lots.' })).statut, 400);
  assert.equal((await q({ prenom: 'Robot', email: 'robot@exemple.fr', message: 'Achetez mes pilules magiques', site: 'http://spam' })).statut, 200);
  assert.equal(m.courrier.boite.length, 0, 'le champ piège ne déclenche rien');
  assert.equal((await q({ prenom: 'Joueur1', email: 'joueur1@exemple.fr', message: 'Bonjour, je n’ai pas reçu mon code, <b>pouvez-vous</b> regarder ?' })).statut, 200);
  const [equipe, accuse] = m.courrier.boite;
  assert.equal(equipe.a, 'equipe@exemple.fr'); assert.equal(equipe.repondreA.email, 'joueur1@exemple.fr');
  assert.match(equipe.texte, /je n’ai pas reçu mon code, bpouvez-vous\/b regarder/);
  assert.match(equipe.texte, /1 porte\(s\) ouverte\(s\), n’a pas gagné pour le moment/);
  assert.equal(accuse.a, 'joueur1@exemple.fr');
  assert.match(accuse.texte, /sous 48 heures/);
  assert.doesNotMatch(accuse.texte + accuse.html, /pas reçu mon code/, 'l’accusé ne recopie pas le message');
  // limite par connexion et par adresse
  for (let i = 1; i < MAX_QUESTIONS_PAR_IP; i++) assert.equal((await q({ prenom: 'Joueur1', email: 'joueur1@exemple.fr', message: 'Encore une question numéro ' + i })).statut, 200);
  assert.equal((await q({ prenom: 'Joueur1', email: 'joueur1@exemple.fr', message: 'Et une de trop pour aujourd’hui' })).statut, 429);
  assert.equal((await q({ prenom: 'Joueur1', email: 'joueur1@exemple.fr', message: 'Depuis une autre connexion, même adresse' }, '9.9.9.9')).statut, 429);
  // l'équipe les voit et les classe
  let b = (await m.appel('GET', 'equipe/bilan', { code: CODE })).corps;
  assert.equal(b.questions.length, MAX_QUESTIONS_PAR_IP); assert.equal(b.questions[0].etat, 'ouverte'); assert.equal(b.questions[0].accuse, true);
  assert.equal((await m.appel('POST', 'equipe/question', { code: CODE, corps: { id: b.questions[0].id } })).statut, 200);
  b = (await m.appel('GET', 'equipe/bilan', { code: CODE })).corps;
  assert.equal(b.questions.filter((x) => x.etat === 'ouverte').length, MAX_QUESTIONS_PAR_IP - 1);
  assert.equal((await m.appel('GET', 'equipe/bilan')).statut, 401, 'les questions ne se lisent pas sans le code de l’équipe');
});

test('réseaux sociaux : le fil des publications suit le jeu', async () => {
  const m = await monde({ date: '2026-12-04T10:00:00+01:00' });
  await m.jouer(1, 4);
  let f = (await m.appel('GET', 'annonces')).corps;
  assert.equal(f.publications.length, 49, '24 stories + 24 publications + celle du 25');
  assert.equal(new Set(f.publications.map((p) => p.id)).size, 49);
  const pub = (id) => f.publications.find((p) => p.id === id);
  assert.deepEqual(pub('avent2026-story-04'), { id: 'avent2026-story-04', jour: 4, format: 'story', reseaux: ['instagram', 'facebook'], quand: '2026-12-04T08:00:00+01:00', image: SITE + '/img/avent/story-04.jpg', texte: 'Porte 4 du calendrier de l’Avent : à gagner aujourd’hui, 1 place de quiz + le jeu Black Stories.', pret: true });
  assert.equal(pub('avent2026-post-01').pret, true);
  assert.match(pub('avent2026-post-01').texte, /À gagner aujourd’hui : 1 place de quiz \+ le jeu Dossiers Criminels Pocket\./);
  assert.doesNotMatch(pub('avent2026-post-01').texte, /bravo/i);
  assert.equal(pub('avent2026-post-05').pret, false, 'le tirage de la porte 4 n’a pas encore eu lieu');
  m.a('2026-12-05T12:16:00+01:00');
  f = (await m.appel('GET', 'annonces')).corps;
  const p5 = pub('avent2026-post-05');
  assert.equal(p5.pret, true); assert.equal(p5.quand, '2026-12-05T12:15:00+01:00'); assert.equal(p5.image, SITE + '/img/avent/post-05.jpg');
  assert.match(p5.texte, /^🎄 Porte 5 du calendrier de l’Avent GAMEDOOR·41/);
  assert.match(p5.texte, /🏆 Porte 4 : bravo à Joueur1 \(jo•••@e•••\), qui remporte 1 place de quiz \+ le jeu Black Stories !/);
  assert.doesNotMatch(JSON.stringify(f), /joueur1@exemple|QUIZ-AAA/, 'ni adresse ni code dans le fil public');
  assert.equal(pub('avent2026-post-25').pret, false);
  assert.ok(p5.texte.length < 2200, 'légende sous la limite d’Instagram');
  // porte sans joueur : la publication part quand même, sans gagnant
  m.a('2026-12-06T12:16:00+01:00');
  f = (await m.appel('GET', 'annonces')).corps;
  assert.equal(pub('avent2026-post-06').pret, true);
  assert.doesNotMatch(pub('avent2026-post-06').texte, /bravo/i);
});
