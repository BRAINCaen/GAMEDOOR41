// ==========================================================================
// Les 24 portes de GAMEDOOR·41 — MOTEUR DU JEU (côté serveur)
// Inscription sans mot de passe, une réponse par porte et par personne,
// réponse vérifiée ici (jamais envoyée au navigateur avant le lendemain midi),
// tirage au sort quotidien, écran de l'équipe.
// Les 24 défis (avec leurs réponses) ne sont PAS dans le dépôt : ils sont
// déposés dans le stockage par l'équipe (voir LISEZMOI.md).
// ==========================================================================
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { mailGagnant, mailPasDePerdant, mailAccuse, mailQuestionEquipe, mailRapport, legendeJour, legendeFin, quandParis, dateTexte } from './messages.mjs';

export const ANNEE = 2026;
export const NB_PORTES = 24;
export const MAX_INSCRIPTIONS_PAR_IP = 8;
export const MAX_QUESTIONS_PAR_IP = 3;
export const MAX_ESSAIS_MAIL = 6;
/** Places « pas de perdant » envoyées par passage (une fonction planifiée n'a que 30 secondes), et en même temps. */
export const PAQUET_PAS_DE_PERDANT = 60;
const EN_MEME_TEMPS = 6;
export const TYPES_CODES = ['quiz', 'escape', 'session', 'sessionEscape'];
export const NOMS_CODES = { quiz: 'places de quiz', escape: 'places d’escape game', session: 'session de quiz', sessionEscape: 'session d’escape game' };
const UN_CODE = { quiz: 'place de quiz', escape: 'place d’escape game', session: 'session de quiz', sessionEscape: 'session d’escape game' };
const UNIVERS = ['gav', 'psy', '80s', 'quiz', 'final'];
const JETABLES = ['yopmail.com', 'yopmail.fr', 'mailinator.com', 'guerrillamail.com', 'sharklasers.com', '10minutemail.com', 'tempmail.com', 'temp-mail.org', 'trashmail.com', 'mekuron.com', 'getnada.com', 'maildrop.cc', 'throwawaymail.com', 'mohmal.com', 'emailondeck.com', 'jetable.org', 'tempr.email', 'dispostable.com', 'fakeinbox.com', 'mailnesia.com'];

const hacher = (texte) => createHash('sha256').update(texte).digest('hex');
const pad = (n) => String(n).padStart(2, '0');

// ---------- le temps (heure de Paris) ----------
export function parisDe(date) {
  const p = {};
  new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', hourCycle: 'h23' })
    .formatToParts(date).forEach((x) => { if (x.type !== 'literal') p[x.type] = parseInt(x.value, 10); });
  return { annee: p.year, mois: p.month, jour: p.day, heure: p.hour };
}
/** 0 = pas commencé, 1 à 24 = jour du calendrier, 25 et plus = terminé (25 = lendemain du 24, 26 = surlendemain…) */
export function jourCalendrier(p) {
  if (p.annee < ANNEE || (p.annee === ANNEE && p.mois < 12)) return 0;
  if (p.annee > ANNEE) return 99;
  return p.jour;
}
/** Le résultat de la porte j se voit le lendemain à partir de midi. */
export function resultatVisible(j, quand) {
  if (quand.simule) return quand.cal > j;
  return quand.cal > j + 1 || (quand.cal === j + 1 && quand.heure >= 12);
}

// ---------- les personnes ----------
export function normaliserEmail(brut) {
  const email = String(brut || '').trim().toLowerCase();
  if (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(email)) return null;
  let [local, domaine] = email.split('@');
  if (domaine === 'googlemail.com') domaine = 'gmail.com';
  local = local.split('+')[0];
  if (domaine === 'gmail.com') local = local.replace(/\./g, '');
  if (!local) return null;
  return { email, cle: local + '@' + domaine, domaine };
}
export const idJoueur = (cle) => hacher('avent-' + ANNEE + '|' + cle).slice(0, 40);
export function signer(id, secret) { return id + '.' + createHmac('sha256', secret).update(id).digest('hex').slice(0, 32); }
export function lireJeton(jeton, secret) {
  const [id, sceau] = String(jeton || '').split('.');
  if (!/^[0-9a-f]{40}$/.test(id || '') || !sceau) return null;
  const attendu = Buffer.from(signer(id, secret));
  const recu = Buffer.from(id + '.' + sceau);
  return attendu.length === recu.length && timingSafeEqual(attendu, recu) ? id : null;
}
function nettoyerPrenom(brut) {
  const p = String(brut || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 30);
  return p.length >= 2 ? p : null;
}
/** Ce qu'on affiche du gagnant : le prénom et le début masqué de son adresse. */
export function etiquetteGagnant(joueur) {
  const [local, domaine] = joueur.email.split('@');
  return joueur.prenom + ' (' + local.slice(0, 2) + '•••@' + domaine.slice(0, 1) + '•••)';
}

// ---------- les défis ----------
export function verifierDefis(defis) {
  if (!Array.isArray(defis) || defis.length !== NB_PORTES) return 'Il faut exactement ' + NB_PORTES + ' défis.';
  for (let i = 0; i < defis.length; i++) {
    const d = defis[i];
    const ou = 'Défi ' + (i + 1) + ' : ';
    if (!d || d.j !== i + 1) return ou + 'le numéro de jour ne suit pas.';
    if (!UNIVERS.includes(d.univers)) return ou + 'univers inconnu.';
    for (const champ of ['titre', 'intro', 'question', 'explication']) if (typeof d[champ] !== 'string' || !d[champ].trim()) return ou + 'il manque « ' + champ + ' ».';
    if (d.type === 'qcm') {
      if (!Array.isArray(d.choix) || d.choix.length < 2 || d.choix.length > 4) return ou + 'il faut 2 à 4 réponses.';
      if (!Number.isInteger(d.bonne) || d.bonne < 0 || d.bonne >= d.choix.length) return ou + 'la bonne réponse n’est pas dans la liste.';
    } else if (d.type === 'code') {
      if (!/^\d{1,6}$/.test(d.code || '') || d.code.length !== d.longueur) return ou + 'le code ne correspond pas à sa longueur.';
    } else return ou + 'type inconnu.';
  }
  return null;
}
const SECRETS = ['bonne', 'code', 'explication', 'prod'];
export function defiPublic(d) { const v = {}; Object.keys(d).forEach((k) => { if (!SECRETS.includes(k)) v[k] = d[k]; }); return v; }
export function corriger(d, reponse) {
  if (d.type === 'qcm') return Number.isInteger(reponse) && reponse >= 0 && reponse < d.choix.length ? { ok: true, juste: reponse === d.bonne, reponse } : { ok: false };
  const texte = String(reponse == null ? '' : reponse);
  return /^\d+$/.test(texte) && texte.length === d.longueur ? { ok: true, juste: texte === d.code, reponse: texte } : { ok: false };
}
const texteBonne = (d) => (d.type === 'qcm' ? d.choix[d.bonne] : d.code);

// ---------- les tickets ----------
export function ticketsDe(joueur, estVisible) {
  let n = 0;
  Object.keys(joueur.reponses || {}).forEach((j) => { const r = joueur.reponses[j]; n += 1 + (r.juste && r.leJour && estVisible(Number(j)) ? 1 : 0); });
  return n;
}
function vueJoueur(joueur, quand) {
  const reponses = {};
  let bonusEnAttente = 0;
  Object.keys(joueur.reponses || {}).forEach((j) => {
    const r = joueur.reponses[j];
    const visible = resultatVisible(Number(j), quand);
    reponses[j] = { reponse: r.reponse, leJour: r.leJour };
    if (visible) reponses[j].juste = r.juste; else if (r.leJour) bonusEnAttente++;
  });
  return { prenom: joueur.prenom, reponses, tickets: ticketsDe(joueur, (j) => resultatVisible(j, quand)), bonusEnAttente, nouvelles: !!joueur.nouvelles };
}

// ---------- réponses HTTP ----------
const ENTETES = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' };
const json = (corps, statut = 200) => new Response(JSON.stringify(corps), { status: statut, headers: ENTETES });
const refus = (statut, code, message) => json({ erreur: code, message }, statut);

// ---------- le moteur ----------
// `courrier` : de quoi envoyer un mail (voir courrier.mjs), ou null : rien ne part, l'équipe écrit à la main.
// `contact` : l'adresse de l'équipe, qui reçoit les questions et le bilan du jour.
export function creerMoteur({ stockage, maintenant = () => new Date(), contexte = 'production', lotsPrevus = {}, courrier = null, contact = 'contact@gamedoor41.fr' }) {
  const essai = contexte !== 'production';
  let secretCache = null;
  let tiragesCache = { quand: 0, valeurs: {} };
  let lotsCache = { quand: 0, valeurs: null };

  async function secret() {
    if (secretCache) return secretCache;
    let s = await stockage.lire('config/secret');
    if (!s) {
      await stockage.ecrire('config/secret', { hmac: randomBytes(32).toString('hex'), cree: maintenant().toISOString() }, { siAbsent: true });
      s = await stockage.lire('config/secret');
    }
    secretCache = s;
    return s;
  }
  async function defis() { return (await stockage.lire('config/defis')) || null; }
  /** Les lots : ceux du fichier des lots (avent-src/lots-2026.mjs), corrigés par ce que l'équipe a saisi.
   *  Par clé (1 à 24, grand, assidus) : { lot: la phrase affichée, jeu: le nom du jeu en plus ou null,
   *  objet: ce qui se retire à l'accueil ou null, place: le genre de code à envoyer ('quiz', 'escape', 'session') ou null }. */
  async function lots() {
    const t = maintenant().getTime();
    if (lotsCache.valeurs && t - lotsCache.quand < 45000) return lotsCache.valeurs;
    const saisis = (await stockage.lire('config/lots')) || {};
    const tout = {};
    Object.keys(lotsPrevus).forEach((k) => { const p = lotsPrevus[k]; tout[k] = { lot: String(p.lot || ''), jeu: p.jeu || null, objet: p.objet || null, place: p.place || null, image: p.image || null }; });
    Object.keys(saisis).forEach((k) => { if (saisis[k]) tout[k] = { ...(tout[k] || { jeu: null, objet: null, place: null, image: null }), lot: String(saisis[k]) }; });
    lotsCache = { quand: t, valeurs: tout };
    return tout;
  }

  function quandPour(req) {
    const p = parisDe(maintenant());
    const q = { cal: jourCalendrier(p), heure: p.heure, simule: false };
    const voulu = essai ? parseInt(req.headers.get('x-avent-jour') || '', 10) : NaN;
    if (Number.isInteger(voulu) && voulu >= 0 && voulu <= 26) { q.cal = voulu; q.heure = 13; q.simule = true; }
    return q;
  }

  async function tousLesJoueurs() {
    const cles = await stockage.lister('joueurs/');
    const sortie = [];
    for (let i = 0; i < cles.length; i += 25) {
      const lot = await Promise.all(cles.slice(i, i + 25).map((c) => stockage.lire(c)));
      lot.forEach((j) => { if (j && j.email) sortie.push(j); });
    }
    return sortie;
  }

  // --- tirages ---
  // Une même personne ne gagne qu'un tirage (décision d'Allan du 26/11/2026) : ceux qui ont déjà gagné un autre
  // tirage (`gagnants`) sont écartés, et on tire parmi les autres ; s'il ne reste personne d'autre, on tire parmi tous.
  // `retires` : les gagnants que l'équipe a remplacés pour CE tirage, jamais repris.
  const fiche = (g) => (g ? { id: g.id, prenom: g.prenom, email: g.email, etiquette: etiquetteGagnant(g) } : null);
  function piocher(urne, gagnants) {
    const libres = urne.filter((x) => !gagnants.has(x.id));
    const choix = libres.length ? libres : urne;
    const ecartes = libres.length ? new Set(urne.filter((x) => gagnants.has(x.id)).map((x) => x.id)).size : 0;
    return { gagnant: choix.length ? choix[randomInt(choix.length)] : null, ecartes };
  }
  function tirerJour(j, joueurs, { retires = [], gagnants = new Set() } = {}) {
    const candidats = joueurs.filter((x) => x.reponses && x.reponses[j] && x.reponses[j].leJour && !retires.includes(x.id));
    const { gagnant, ecartes } = piocher(candidats, gagnants);
    return { cle: pad(j), genre: 'jour', jour: j, participants: candidats.length, dejaGagnants: ecartes, tireLe: maintenant().toISOString(), gagnant: fiche(gagnant), prevenu: false };
  }
  function tirerFinal(genre, joueurs, { retires = [], gagnants = new Set() } = {}) {
    const tout = () => true;
    const eligibles = joueurs.filter((x) => !retires.includes(x.id));
    let urne = [];
    if (genre === 'grand') eligibles.forEach((x) => { const n = ticketsDe(x, tout); for (let i = 0; i < n; i++) urne.push(x); });
    else urne = eligibles.filter((x) => Object.keys(x.reponses || {}).length >= NB_PORTES);
    const { gagnant, ecartes } = piocher(urne, gagnants);
    return { cle: genre, genre, participants: genre === 'grand' ? eligibles.filter((x) => Object.keys(x.reponses || {}).length).length : urne.length, billets: urne.length, dejaGagnants: ecartes, tireLe: maintenant().toISOString(),
      gagnant: fiche(gagnant), prevenu: false };
  }
  /** Les gagnants de tous les tirages, sauf celui de clé `sauf`. */
  function gagnantsAutres(tir, sauf) {
    const s = new Set();
    Object.values(tir).forEach((t) => { if (t && t.gagnant && t.cle !== sauf) s.add(t.gagnant.id); });
    return s;
  }
  async function lireTirages() {
    const cles = await stockage.lister('tirages/');
    const valeurs = {};
    (await Promise.all(cles.map((c) => stockage.lire(c)))).forEach((x) => { if (x) valeurs[x.cle] = x; });
    return valeurs;
  }
  /** Fait les tirages dus et pas encore faits, dans l'ordre (porte 1 à 24, grand tirage, tirage des 24 portes).
   *  Écriture « seulement si absent » : deux appels en même temps ne tirent pas deux gagnants. */
  async function assurerTirages(quand) {
    if (quand.simule && !essai) return 0;
    const dus = [];
    for (let j = 1; j <= NB_PORTES; j++) if (resultatVisible(j, quand)) dus.push(pad(j));
    if (resultatVisible(NB_PORTES, quand)) dus.push('grand', 'assidus');
    if (!dus.length) return 0;
    const connus = await lireTirages();
    const manquants = dus.filter((c) => !connus[c]);
    // Aperçu avec jour simulé seulement : on voyage dans le temps, donc un tirage déjà fait peut être
    // périmé (des joueurs d'essai sont arrivés ou partis depuis). On le refait, sauf si l'équipe y a touché.
    const aRevoir = essai && quand.simule ? dus.filter((c) => connus[c]) : [];
    if (!manquants.length && !aRevoir.length) return 0;
    const joueurs = await tousLesJoueurs();
    const tirer = (c) => { const choix = { gagnants: gagnantsAutres(connus, c) }; return /^\d\d$/.test(c) ? tirerJour(Number(c), joueurs, choix) : tirerFinal(c, joueurs, choix); };
    let n = 0;
    for (const c of manquants) {
      const t = tirer(c);
      if (await stockage.ecrire('tirages/' + c, t, { siAbsent: true })) { n++; connus[c] = t; }
      else connus[c] = (await stockage.lire('tirages/' + c)) || t;     // tiré au même moment par un autre passage : c'est le sien qui compte
    }
    for (const c of aRevoir) {
      const vieux = connus[c];
      if (!vieux || vieux.prevenu || vieux.lot || (vieux.anciens && vieux.anciens.length)) continue;
      const neuf = tirer(c);
      const disparu = vieux.gagnant && !joueurs.some((x) => x.id === vieux.gagnant.id);
      const doublon = vieux.gagnant && neuf.dejaGagnants > 0 && gagnantsAutres(connus, c).has(vieux.gagnant.id);
      if (neuf.participants !== vieux.participants || neuf.billets !== vieux.billets || disparu || doublon) { await stockage.ecrire('tirages/' + c, neuf); connus[c] = neuf; n++; }
    }
    tiragesCache = { quand: 0, valeurs: {} };
    return n;
  }
  async function tirages() {
    const t = maintenant().getTime();
    if (t - tiragesCache.quand < 45000) return tiragesCache.valeurs;
    const valeurs = await lireTirages();
    tiragesCache = { quand: t, valeurs };
    return valeurs;
  }

  // --- pas de perdant : le 25 à midi, après les deux tirages de la fin, chaque joueur qui n'a gagné aucun tirage
  //     reçoit 1 place de quiz pour 1 joueur (décision d'Allan du 26/11/2026). Une fiche par joueur : pas-de-perdant/<id>.
  async function assurerPasDePerdant(quand) {
    if (!resultatVisible(NB_PORTES, quand) || (quand.simule && !essai)) return 0;
    const tir = await lireTirages();
    if (!tir.grand || !tir.assidus) return 0;
    if (!essai && (await stockage.lire('etat/pas-de-perdant'))) return 0;   // fait une fois pour toutes : plus personne ne s'inscrit après le 24
    const gagnants = gagnantsAutres(tir, null);
    const deja = new Set((await stockage.lister('pas-de-perdant/')).map((c) => c.slice('pas-de-perdant/'.length)));
    const nouveaux = (await tousLesJoueurs()).filter((x) => Object.keys(x.reponses || {}).length && !gagnants.has(x.id) && !deja.has(x.id));
    let n = 0;
    for (let i = 0; i < nouveaux.length; i += 20) {
      const faits = await Promise.all(nouveaux.slice(i, i + 20).map((x) => stockage.ecrire('pas-de-perdant/' + x.id, { id: x.id, prenom: x.prenom, email: x.email, le: maintenant().toISOString(), code: null, mail: null }, { siAbsent: true })));
      n += faits.filter(Boolean).length;
    }
    await stockage.ecrire('etat/pas-de-perdant', { le: maintenant().toISOString(), fiches: deja.size + n });
    return n;
  }
  async function fichesPasDePerdant() {
    const cles = await stockage.lister('pas-de-perdant/');
    const sortie = [];
    for (let i = 0; i < cles.length; i += 25) (await Promise.all(cles.slice(i, i + 25).map((c) => stockage.lire(c)))).forEach((f) => { if (f) sortie.push(f); });
    return sortie;
  }
  /** Où en sont les places « pas de perdant » (avant le 25 : estimation = les joueurs qui n'ont encore rien gagné). */
  async function etatPasDePerdant(joueurs, tir) {
    const fiches = await fichesPasDePerdant();
    if (!fiches.length) {
      const gagnants = gagnantsAutres(tir, null);
      const n = joueurs.filter((x) => Object.keys(x.reponses || {}).length && !gagnants.has(x.id)).length;
      return { fait: !!(tir.grand && tir.assidus), estimation: !(tir.grand && tir.assidus), joueurs: n, envoyees: 0, attendentCode: 0, echecs: 0, aDonner: tir.grand && tir.assidus ? 0 : n };
    }
    const envoyee = (f) => !!(f.mail && f.mail.etat === 'envoye');
    return {
      fait: true, estimation: false, joueurs: fiches.length,
      envoyees: fiches.filter(envoyee).length,
      attendentCode: fiches.filter((f) => !envoyee(f) && !f.code).length,
      echecs: fiches.filter((f) => !envoyee(f) && f.mail && f.mail.etat === 'echec').length,
      aDonner: fiches.filter((f) => !envoyee(f) && !f.code).length,
    };
  }

  // --- la remise des lots : un code pris dans la réserve + un mail au gagnant, sans personne ---
  async function reserve() {
    const r = (await stockage.lire('config/codes')) || {};
    TYPES_CODES.forEach((t) => { if (!Array.isArray(r[t])) r[t] = []; });
    if (!Array.isArray(r.donnes)) r.donnes = [];
    return r;
  }
  /** Les codes déjà donnés (chacun « réservé » par un fichier codes-pris/<code>, écrit « seulement si absent »). */
  async function codesPris() { return new Set((await stockage.lister('codes-pris/')).map((c) => c.slice('codes-pris/'.length))); }
  /** La réserve sans les codes déjà donnés par un passage qui tournait en même temps. */
  async function reserveNette() {
    const [r, pris] = await Promise.all([reserve(), codesPris()]);
    TYPES_CODES.forEach((t) => { r[t] = r[t].filter((c) => !pris.has(c)); });
    return r;
  }
  /** Prend un code par personne de `pour` (moins s'il n'y en a pas assez). Un code n'est JAMAIS donné à deux
   *  personnes, même si deux passages tournent en même temps : chacun est réservé avant d'être donné. */
  async function prendreCodes(type, pour) {
    if (!pour.length) return [];
    const r = await reserve();
    if (!r[type] || !r[type].length) return [];
    const pris = await codesPris();
    const le = maintenant().toISOString();
    const donnes = [], gardes = [];
    for (const code of r[type]) {
      if (pris.has(code)) continue;                                      // déjà donné par un autre passage
      if (donnes.length >= pour.length) { gardes.push(code); continue; }
      if (await stockage.ecrire('codes-pris/' + code, { type, pour: pour[donnes.length], le }, { siAbsent: true })) {
        r.donnes.push({ code, type, pour: pour[donnes.length], le });
        donnes.push(code);
      }
    }
    r[type] = gardes;
    await stockage.ecrire('config/codes', r);
    return donnes;
  }
  async function prendreCode(type, pour) { return (await prendreCodes(type, [pour]))[0] || null; }
  const cleLot = (cle) => (/^\d\d$/.test(cle) ? String(Number(cle)) : cle);

  /** Envoie les places « pas de perdant » qui ne sont pas encore parties : jamais sans code (on attend que l'équipe
   *  en ajoute, le bilan du jour le lui dit), par paquets, plusieurs mails à la fois. */
  async function livrerPasDePerdant(origine, paquet) {
    const fiches = await fichesPasDePerdant();
    const envoyee = (f) => !!(f.mail && f.mail.etat === 'envoye');
    let libres = (await reserveNette()).quiz.length;
    const choisies = fiches.filter((f) => !envoyee(f) && !(f.mail && f.mail.essais >= MAX_ESSAIS_MAIL) && (f.code || libres-- > 0)).slice(0, paquet);
    if (!choisies.length) return { envoyes: 0, echecs: 0 };
    const tranche = Math.floor(maintenant().getTime() / 600000);
    const miennes = [];
    for (let i = 0; i < choisies.length; i += 20) {
      const part = choisies.slice(i, i + 20);
      const ok = await Promise.all(part.map((f) => stockage.ecrire('verrous/pdp-' + f.id + '-' + tranche, { le: maintenant().toISOString() }, { siAbsent: true })));
      part.forEach((f, k) => { if (ok[k]) miennes.push(f); });
    }
    const sansCode = miennes.filter((f) => !f.code);
    const codes = await prendreCodes('quiz', sansCode.map((f) => 'pas-de-perdant ' + f.id));
    sansCode.forEach((f, k) => { f.code = codes[k] || null; });
    await Promise.all(sansCode.filter((f) => f.code).map((f) => stockage.ecrire('pas-de-perdant/' + f.id, f)));  // le code reste à cette personne, même si le mail échoue
    const aEnvoyer = miennes.filter((f) => f.code);
    let envoyes = 0, echecs = 0;
    for (let i = 0; i < aEnvoyer.length; i += EN_MEME_TEMPS) {
      await Promise.all(aEnvoyer.slice(i, i + EN_MEME_TEMPS).map(async (f) => {
        const r = await courrier.envoyer({ a: f.email, nom: f.prenom, ...mailPasDePerdant({ prenom: f.prenom, code: f.code, essai, origine }) });
        const essais = ((f.mail && f.mail.essais) || 0) + 1;
        f.mail = r.ok ? { etat: 'envoye', le: maintenant().toISOString(), essais } : { etat: 'echec', le: maintenant().toISOString(), essais, erreur: String(r.erreur || 'inconnue').slice(0, 200) };
        if (r.ok) envoyes++; else echecs++;
        await stockage.ecrire('pas-de-perdant/' + f.id, f);
      }));
    }
    return { envoyes, echecs };
  }

  /** Envoie leur lot aux gagnants qui ne l'ont pas encore reçu, puis les places « pas de perdant ».
   *  Sans risque à relancer : chacun n'est servi qu'une fois. */
  async function livrer(origine, { paquet = PAQUET_PAS_DE_PERDANT } = {}) {
    if (!courrier) return { envoyes: 0, echecs: 0 };
    const prevus = await lots();
    let envoyes = 0, echecs = 0;
    for (const cleBlob of await stockage.lister('tirages/')) {
      const cle = cleBlob.slice('tirages/'.length);
      let t = await stockage.lire(cleBlob);
      if (!t || !t.gagnant) continue;
      const p = prevus[cleLot(cle)] || {};
      const fait = !!(t.mail && t.mail.etat === 'envoye');
      const codeEnRetard = fait && !!t.mail.sansCode;                   // premier mail parti sans code : la réserve était vide
      if ((fait && !codeEnRetard) || (!t.mail && t.prevenu)) continue;  // déjà servi, ou prévenu à la main par l'équipe
      if (!fait && t.mail && t.mail.essais >= MAX_ESSAIS_MAIL) continue;
      if (codeEnRetard && (!p.place || (!t.code && !(await reserve())[p.place].length))) continue;
      // un seul essai par tranche de 10 minutes, même si deux passages tombent en même temps
      if (!(await stockage.ecrire('verrous/lot-' + cle + '-' + Math.floor(maintenant().getTime() / 600000), { le: maintenant().toISOString() }, { siAbsent: true }))) continue;
      let code = t.code || null;
      if (!code && p.place) code = await prendreCode(p.place, cle);
      const message = mailGagnant({ prenom: t.gagnant.prenom, tirage: t.genre, jour: t.jour, participants: t.participants, lot: t.lot || p.lot || 'votre lot', place: p.place, objet: p.objet, code, suite: codeEnRetard, essai, origine });
      const r = await courrier.envoyer({ a: t.gagnant.email, nom: t.gagnant.prenom, ...message });
      t = (await stockage.lire(cleBlob)) || t;                           // l'équipe a pu toucher au tirage pendant l'envoi
      t.code = code;
      const essais = ((t.mail && t.mail.essais) || 0) + 1;
      const le = maintenant().toISOString();
      if (r.ok) { t.mail = { etat: 'envoye', le, essais, sansCode: !!p.place && !code }; t.prevenu = true; envoyes++; }
      else if (codeEnRetard) { t.mail = { ...t.mail, erreur: String(r.erreur || 'inconnue').slice(0, 200) }; echecs++; }
      else { t.mail = { etat: 'echec', le, essais, erreur: String(r.erreur || 'inconnue').slice(0, 200) }; echecs++; }
      await stockage.ecrire(cleBlob, t);
    }
    tiragesCache = { quand: 0, valeurs: {} };
    const pdp = await livrerPasDePerdant(origine, paquet);
    return { envoyes: envoyes + pdp.envoyes, echecs: echecs + pdp.echecs };
  }

  /** Combien de codes il faut encore, par genre, pour finir le mois (tirages pas encore servis + places « pas de perdant »). */
  function besoinsCodes(prevus, tir, pdp) {
    const besoin = Object.fromEntries(TYPES_CODES.map((t) => [t, 0]));
    Object.keys(prevus).forEach((k) => {
      const p = prevus[k], t = tir[/^\d+$/.test(k) ? pad(Number(k)) : k];
      if (!p.place || !(p.place in besoin)) return;
      if (!t) besoin[p.place]++;                                         // tirage à venir
      else if (t.gagnant && !t.code && !(!t.mail && t.prevenu)) besoin[p.place]++; // gagnant qui attend son code
    });
    besoin.quiz += pdp ? pdp.aDonner : 0;
    return besoin;
  }

  /** Bilan du jour envoyé à l'équipe, une fois par tirage quotidien (ou à la demande depuis son écran). */
  async function rapport(quand, origine, { force = false } = {}) {
    if (!courrier) return false;
    let jour = 0;
    for (let j = 1; j <= NB_PORTES; j++) if (resultatVisible(j, quand)) jour = j;
    if (!jour) return false;
    const cle = pad(jour);
    if (!force && !(await stockage.ecrire('rapports/' + cle, { le: maintenant().toISOString() }, { siAbsent: true }))) return false;
    tiragesCache.quand = 0; lotsCache.quand = 0;
    const [joueurs, tir, prevus, r, clesQuestions] = await Promise.all([tousLesJoueurs(), tirages(), lots(), reserveNette(), stockage.lister('questions/')]);
    const pdp = await etatPasDePerdant(joueurs, tir);
    const lignes = [], alertes = [];
    let leJour = 0, justes = 0;
    joueurs.forEach((x) => { const rep = x.reponses && x.reponses[jour]; if (rep && rep.leJour) { leJour++; if (rep.juste) justes++; } });
    lignes.push('Porte ' + jour + ' (' + dateTexte(jour, ANNEE) + ') : ' + leJour + ' joueur' + (leJour > 1 ? 's' : '') + ' le jour même, ' + justes + ' bonne' + (justes > 1 ? 's' : '') + ' réponse' + (justes > 1 ? 's' : '') + '.');
    const dire = (nom, k) => {
      const t = tir[k], p = prevus[cleLot(k)] || {};
      if (!t) { alertes.push(nom + ' : le tirage n’a pas eu lieu. Ouvrez l’écran de l’équipe pour le relancer.'); return; }
      if (!t.gagnant) { lignes.push(nom + ' : pas de gagnant (aucun participant).'); return; }
      const servi = t.mail && t.mail.etat === 'envoye';
      lignes.push(nom + ' : ' + t.gagnant.prenom + ' <' + t.gagnant.email + '> gagne ' + (t.lot || p.lot || 'son lot') + (t.code ? ' · code ' + t.code : '') + ' · ' + (servi ? 'mail envoyé' : t.prevenu ? 'prévenu à la main' : 'mail pas encore parti') + '.');
      if (p.objet) lignes.push('À mettre de côté à l’accueil pour ' + t.gagnant.prenom + ' : ' + p.objet + '.');
      if (!servi && !t.prevenu) alertes.push(nom + ' : le mail au gagnant n’est pas parti' + (t.mail && t.mail.erreur ? ' (' + t.mail.erreur + ')' : '') + '. ' + (t.mail && t.mail.essais >= MAX_ESSAIS_MAIL ? 'Les essais automatiques sont finis : utilisez « Écrire au gagnant » dans l’écran de l’équipe.' : 'Un nouvel essai part tout seul dans la demi-heure.'));
      if (servi && t.mail.sansCode) alertes.push(nom + ' : ' + t.gagnant.prenom + ' attend son code (' + (UN_CODE[p.place] || p.place) + '), la réserve est vide. Ajoutez des codes dans l’écran de l’équipe : il partira tout seul.');
    };
    dire('Gagnant de la porte ' + jour, cle);
    if (jour === NB_PORTES) {
      dire('Grand tirage', 'grand'); dire('Tirage des 24 portes', 'assidus');
      if (pdp.fait) {
        lignes.push('Pas de perdant : ' + pdp.joueurs + ' joueur' + (pdp.joueurs > 1 ? 's' : '') + ' sans aucun gain reçoi' + (pdp.joueurs > 1 ? 'vent' : 't') + ' 1 place de quiz pour 1 joueur · ' + pdp.envoyees + ' mail' + (pdp.envoyees > 1 ? 's' : '') + ' parti' + (pdp.envoyees > 1 ? 's' : '') + (pdp.joueurs > pdp.envoyees ? ', les autres partent tout seuls par paquets de ' + PAQUET_PAS_DE_PERDANT + ' toutes les demi-heures' : '') + '.');
        if (pdp.attendentCode > r.quiz.length) alertes.push('Pas de perdant : ' + (pdp.attendentCode - r.quiz.length) + ' joueur' + (pdp.attendentCode - r.quiz.length > 1 ? 's attendent leur' : ' attend sa') + ' place de quiz, il manque des codes. Ajoutez des codes « places de quiz » dans l’écran de l’équipe : les mails partiront tout seuls.');
      }
    } else if (pdp.joueurs) lignes.push('Pas de perdant (le 25 décembre) : à ce jour, ' + pdp.joueurs + ' joueur' + (pdp.joueurs > 1 ? 's n’ont' : ' n’a') + ' rien gagné et recevr' + (pdp.joueurs > 1 ? 'ont' : 'a') + ' 1 place de quiz : comptez autant de codes de quiz en plus.');
    lignes.push('Depuis le début : ' + joueurs.length + ' inscrit' + (joueurs.length > 1 ? 's' : '') + ', ' + joueurs.reduce((n, x) => n + Object.keys(x.reponses || {}).length, 0) + ' participations, ' + joueurs.filter((x) => x.nouvelles).length + ' veulent nos nouvelles.');
    lignes.push('Codes en réserve : ' + TYPES_CODES.map((t) => NOMS_CODES[t] + ' ' + r[t].length).join(', ') + '.');
    const besoin = besoinsCodes(prevus, tir, pdp);
    TYPES_CODES.forEach((t) => { if (t === 'quiz' && pdp.fait) return; /* déjà dit plus haut, joueur par joueur */ if (r[t].length < besoin[t]) alertes.push('Il manque ' + (besoin[t] - r[t].length) + ' code' + (besoin[t] - r[t].length > 1 ? 's' : '') + ' « ' + NOMS_CODES[t] + ' » pour finir le mois' + (t === 'quiz' && pdp.aDonner ? ' (dont ' + pdp.aDonner + ' pour « pas de perdant »)' : '') + '. À ajouter dans l’écran de l’équipe.'); });
    const questions = (await Promise.all(clesQuestions.map((c) => stockage.lire(c)))).filter((q) => q && q.etat === 'ouverte');
    if (questions.length) {
      lignes.push('Questions en attente : ' + questions.length + '.');
      const vieilles = questions.filter((q) => maintenant().getTime() - new Date(q.le).getTime() > 48 * 3600000).length;
      if (vieilles) alertes.push(vieilles + ' question' + (vieilles > 1 ? 's attendent' : ' attend') + ' une réponse depuis plus de 48 heures.');
    }
    const envoi = await courrier.envoyer({ a: contact, nom: 'GAMEDOOR·41', ...mailRapport({ jour, lignes, alertes, essai, origine }) });
    if (!envoi.ok && !force) await stockage.supprimer('rapports/' + cle);
    return envoi.ok;
  }

  /** Tout ce qui se fait tout seul : tirages dus, lots envoyés, bilan du jour à l'équipe. */
  async function automate(quand, origine) {
    if (quand.cal < 1 || quand.cal > 60) return { tirages: 0, envoyes: 0, echecs: 0, rapport: false }; // hors décembre : rien à faire
    const n = await assurerTirages(quand);
    await assurerPasDePerdant(quand);
    const l = await livrer(origine);
    const b = await rapport(quand, origine);
    return { tirages: n, envoyes: l.envoyes, echecs: l.echecs, rapport: b };
  }

  // --- routes publiques ---
  async function joueurDuJeton(req) {
    const id = lireJeton(req.headers.get('x-avent-jeton'), (await secret()).hmac);
    return id ? await stockage.lire('joueurs/' + id) : null;
  }

  async function etat(req) {
    const quand = quandPour(req);
    const liste = await defis();
    if (!liste) return refus(503, 'pas_pret', 'Le calendrier n’est pas encore prêt.');
    try { await assurerTirages(quand); } catch (e) { console.error('[avent] tirage impossible :', e && e.message); }
    const tir = await tirages();
    const prevus = await lots();
    const lotDe = (k) => (prevus[k] && prevus[k].lot) || null;
    const resultats = {};
    liste.forEach((d) => {
      if (!resultatVisible(d.j, quand)) return;
      const t = tir[pad(d.j)];
      resultats[d.j] = { bonne: texteBonne(d), explication: d.explication, tire: !!t, gagnant: t && t.gagnant ? t.gagnant.etiquette : null, participants: t ? t.participants : null, lot: (t && t.lot) || lotDe(d.j) };
    });
    const finaux = {};
    ['grand', 'assidus'].forEach((g) => { if (tir[g]) finaux[g] = { gagnant: tir[g].gagnant ? tir[g].gagnant.etiquette : null, lot: tir[g].lot || lotDe(g) }; });
    const joueur = await joueurDuJeton(req);
    const moi = joueur ? vueJoueur(joueur, quand) : null;
    if (moi && resultatVisible(NB_PORTES, quand)) {
      const pdp = await stockage.lire('pas-de-perdant/' + joueur.id);
      if (pdp) moi.pasDePerdant = { envoye: !!(pdp.mail && pdp.mail.etat === 'envoye') };
    }
    return json({
      cal: quand.cal, simule: quand.simule, essai,
      portes: liste.map((d) => ({ j: d.j, univers: d.univers, gros: !!d.gros, titre: d.j <= quand.cal ? d.titre : null, lot: lotDe(d.j), jeu: (prevus[d.j] && prevus[d.j].jeu) || null, image: (prevus[d.j] && prevus[d.j].image) || null })),
      lotsFinaux: { grand: lotDe('grand'), assidus: lotDe('assidus') },
      resultats, finaux, moi,
    });
  }

  async function defi(req, url) {
    const quand = quandPour(req);
    const j = parseInt(url.searchParams.get('j') || '', 10);
    const liste = await defis();
    if (!liste) return refus(503, 'pas_pret', 'Le calendrier n’est pas encore prêt.');
    const d = liste.find((x) => x.j === j);
    if (!d) return refus(404, 'inconnu', 'Cette porte n’existe pas.');
    if (j > quand.cal) return refus(403, 'fermee', 'Cette porte n’est pas encore ouverte.');
    return json({ defi: defiPublic(d) });
  }

  async function jouer(req, ip) {
    const quand = quandPour(req);
    let corps;
    try { corps = await req.json(); } catch (_) { return refus(400, 'illisible', 'Demande illisible.'); }
    const j = parseInt(corps && corps.j, 10);
    if (!Number.isInteger(j) || j < 1 || j > NB_PORTES) return refus(400, 'porte', 'Cette porte n’existe pas.');
    if (quand.cal < 1) return refus(403, 'pas_commence', 'Le calendrier commence le 1er décembre.');
    if (quand.cal > NB_PORTES) return refus(403, 'termine', 'Le calendrier est terminé.');
    if (j > quand.cal) return refus(403, 'fermee', 'Cette porte n’est pas encore ouverte.');
    const liste = await defis();
    const d = liste && liste.find((x) => x.j === j);
    if (!d) return refus(503, 'pas_pret', 'Le calendrier n’est pas encore prêt.');
    const corrige = corriger(d, corps.reponse);
    if (!corrige.ok) return refus(400, 'reponse', 'Cette réponse n’est pas valable.');

    const s = await secret();
    let id = lireJeton(req.headers.get('x-avent-jeton'), s.hmac);
    let joueur = id ? await stockage.lire('joueurs/' + id) : null;
    if (!joueur) {
      const mail = normaliserEmail(corps.email);
      const prenom = nettoyerPrenom(corps.prenom);
      if (!mail || !prenom) return refus(401, 'inscription', 'Indiquez votre prénom et votre adresse mail.');
      if (JETABLES.includes(mail.domaine)) return refus(400, 'email_jetable', 'Les adresses mail temporaires ne sont pas acceptées.');
      id = idJoueur(mail.cle);
      joueur = await stockage.lire('joueurs/' + id);
      if (!joueur) {
        if (corps.reglement !== true) return refus(400, 'reglement', 'Cochez la case du règlement pour participer.');
        const cleIp = 'limites/' + ANNEE + '-' + pad(quand.cal) + '/' + hacher(s.hmac + '|' + (ip || 'inconnue')).slice(0, 24);
        const compteur = (await stockage.lire(cleIp)) || { n: 0 };
        if (compteur.n >= MAX_INSCRIPTIONS_PAR_IP) return refus(429, 'trop', 'Trop d’inscriptions depuis cette connexion aujourd’hui. Réessayez demain.');
        await stockage.ecrire(cleIp, { n: compteur.n + 1 });
        joueur = { id, prenom, email: mail.email, nouvelles: corps.nouvelles === true, reglement: maintenant().toISOString(), inscritLe: maintenant().toISOString(), inscritJour: quand.cal, reponses: {} };
      } else if (corps.nouvelles === true) joueur.nouvelles = true;
    }
    if (joueur.reponses[j]) return json({ erreur: 'deja_joue', message: 'Vous avez déjà joué cette porte.', jeton: signer(joueur.id, s.hmac), moi: vueJoueur(joueur, quand) }, 409);
    joueur.reponses[j] = { reponse: corrige.reponse, juste: corrige.juste, leJour: j === quand.cal, quand: maintenant().toISOString() };
    await stockage.ecrire('joueurs/' + joueur.id, joueur);
    return json({ ok: true, jeton: signer(joueur.id, s.hmac), moi: vueJoueur(joueur, quand) });
  }

  /** Question ou réclamation : gardée pour l'équipe, transmise par mail, accusé de réception à la personne. */
  async function question(req, ip, origine) {
    let corps; try { corps = await req.json(); } catch (_) { return refus(400, 'illisible', 'Demande illisible.'); }
    corps = corps || {};
    if (corps.site) return json({ ok: true });                           // champ piège : seul un robot le remplit
    const mail = normaliserEmail(corps.email), prenom = nettoyerPrenom(corps.prenom);
    const message = String(corps.message || '').replace(/[\u0000-\u0008\u000b-\u001f<>]/g, '').trim().slice(0, 2000);
    if (!mail || !prenom) return refus(400, 'identite', 'Indiquez votre prénom et votre adresse mail.');
    if (JETABLES.includes(mail.domaine)) return refus(400, 'email_jetable', 'Les adresses mail temporaires ne sont pas acceptées.');
    if (message.length < 10) return refus(400, 'court', 'Votre message est trop court pour que nous puissions vous répondre.');
    const s = await secret(), p = parisDe(maintenant());
    const jourCle = p.annee + pad(p.mois) + pad(p.jour);
    const cleIp = 'limites/q-' + jourCle + '/' + hacher(s.hmac + '|' + (ip || 'inconnue')).slice(0, 24);
    const cleMail = 'limites/q-' + jourCle + '/m-' + hacher(s.hmac + '|' + mail.cle).slice(0, 24);
    const [parIp, parMail] = await Promise.all([stockage.lire(cleIp), stockage.lire(cleMail)]);
    if ((parIp && parIp.n >= MAX_QUESTIONS_PAR_IP) || (parMail && parMail.n >= MAX_QUESTIONS_PAR_IP)) return refus(429, 'trop', 'Vous nous avez déjà écrit plusieurs fois aujourd’hui. Nous vous répondons sous 48 heures.');
    await Promise.all([stockage.ecrire(cleIp, { n: ((parIp && parIp.n) || 0) + 1 }), stockage.ecrire(cleMail, { n: ((parMail && parMail.n) || 0) + 1 })]);
    const id = maintenant().getTime().toString(36) + randomBytes(3).toString('hex');
    const idJ = idJoueur(mail.cle);
    const joueur = await stockage.lire('joueurs/' + idJ);
    let fiche = 'Cette adresse n’est pas inscrite au jeu.';
    if (joueur) {
      const gains = Object.values(await tirages()).filter((t) => t.gagnant && t.gagnant.id === idJ).map((t) => (t.genre === 'jour' ? 'porte ' + t.jour : t.genre === 'grand' ? 'grand tirage' : 'tirage des 24 portes'));
      const pdp = await stockage.lire('pas-de-perdant/' + idJ);
      if (pdp) gains.push('la place « pas de perdant » (' + (pdp.mail && pdp.mail.etat === 'envoye' ? 'mail envoyé' + (pdp.code ? ', code ' + pdp.code : '') : pdp.code ? 'code ' + pdp.code + ', mail pas encore parti' : 'en attente d’un code') + ')');
      fiche = 'Inscrit·e le ' + String(joueur.inscritLe || '').slice(0, 10) + ', ' + Object.keys(joueur.reponses || {}).length + ' porte(s) ouverte(s)' + (gains.length ? ', a gagné : ' + gains.join(', ') : ', n’a pas gagné pour le moment') + '.';
    }
    const q = { id, prenom, email: mail.email, message, le: maintenant().toISOString(), etat: 'ouverte', fiche, accuse: false };
    await stockage.ecrire('questions/' + id, q);
    if (courrier) {
      await courrier.envoyer({ a: contact, nom: 'GAMEDOOR·41', repondreA: { email: mail.email, name: prenom }, ...mailQuestionEquipe({ prenom, email: mail.email, message, fiche, essai, origine }) });
      // l'accusé ne recopie pas le message : le formulaire ne doit pas servir à écrire à un inconnu en notre nom
      const r = await courrier.envoyer({ a: mail.email, nom: prenom, ...mailAccuse({ prenom, essai, origine }) });
      if (r.ok) { q.accuse = true; await stockage.ecrire('questions/' + id, q); }
    }
    return json({ ok: true });
  }

  /** Le fil des publications pour les réseaux sociaux : Synergia (Espace Com) le lit et publie à l'heure dite.
   *  Chaque publication a un identifiant fixe : la publier deux fois est impossible côté Synergia. */
  async function annonces(req, origine) {
    const quand = quandPour(req);
    const liste = await defis();
    if (!liste) return refus(503, 'pas_pret', 'Le calendrier n’est pas encore prêt.');
    try { await assurerTirages(quand); } catch (e) { console.error('[avent] tirage impossible :', e && e.message); }
    const tir = await tirages();
    const prevus = await lots();
    const lotDe = (k) => (prevus[k] && prevus[k].lot) || '';
    const gagne = (k, jour) => { const t = tir[k]; return t ? { jour, gagnant: t.gagnant ? t.gagnant.etiquette : null, lot: t.lot || lotDe(cleLot(k)) } : null; };
    const image = (nom) => origine + '/img/avent/' + nom + '.jpg';
    const reseaux = ['instagram', 'facebook'];
    const publications = [];
    for (let j = 1; j <= NB_PORTES; j++) {
      publications.push({ id: 'avent' + ANNEE + '-story-' + pad(j), jour: j, format: 'story', reseaux, quand: quandParis(ANNEE, j, 8, 0), image: image('story-' + pad(j)), texte: 'Porte ' + j + ' du calendrier de l’Avent : à gagner aujourd’hui, ' + lotDe(j) + '.', pret: true });
      publications.push({ id: 'avent' + ANNEE + '-post-' + pad(j), jour: j, format: 'post', reseaux, quand: quandParis(ANNEE, j, 12, 15), image: image('post-' + pad(j)), texte: legendeJour({ jour: j, lot: lotDe(j), veille: j > 1 ? gagne(pad(j - 1), j - 1) : null }), pret: j === 1 || !!tir[pad(j - 1)] });
    }
    publications.push({ id: 'avent' + ANNEE + '-post-25', jour: 25, format: 'post', reseaux, quand: quandParis(ANNEE, 25, 12, 15), image: image('post-25'), texte: legendeFin({ veille: gagne(pad(NB_PORTES), NB_PORTES), grand: gagne('grand'), assidus: gagne('assidus') }), pret: !!(tir[pad(NB_PORTES)] && tir.grand && tir.assidus) });
    return json({ cal: quand.cal, essai, maintenant: maintenant().toISOString(), publications });
  }

  /** Aperçu seulement : efface le joueur d'essai pour pouvoir rejouer. */
  async function effacerEssai(req) {
    if (!essai) return refus(404, 'inconnu', 'Introuvable.');
    const j = await joueurDuJeton(req);
    if (j) await stockage.supprimer('joueurs/' + j.id);
    return json({ ok: true });
  }

  // --- écran de l'équipe ---
  async function equipeAutorisee(req) {
    const s = await secret();
    const code = req.headers.get('x-avent-code') || '';
    if (!s.codeHash || !code) return false;
    const a = Buffer.from(hacher(s.hmac + '|' + code)), b = Buffer.from(s.codeHash);
    return a.length === b.length && timingSafeEqual(a, b);
  }
  async function initialiser(req) {
    const s = await secret();
    if (s.codeHash) return refus(409, 'deja', 'Le code de l’équipe existe déjà.');
    let corps; try { corps = await req.json(); } catch (_) { corps = {}; }
    const code = String((corps && corps.code) || '');
    if (code.length < 12) return refus(400, 'court', 'Code trop court (12 caractères au moins).');
    const neuf = { ...s, codeHash: hacher(s.hmac + '|' + code) };
    await stockage.ecrire('config/secret', neuf);
    secretCache = neuf;
    return json({ ok: true });
  }
  async function bilan(req, origine) {
    const quand = quandPour(req);
    lotsCache.quand = 0;
    try { await assurerTirages(quand); await assurerPasDePerdant(quand); await livrer(origine, { paquet: 15 }); } catch (e) { console.error('[avent] remise des lots impossible :', e && e.message); }
    const [joueurs, liste, prevus] = await Promise.all([tousLesJoueurs(), defis(), lots()]);
    const textes = {};
    Object.keys(prevus).forEach((k) => { textes[k] = prevus[k].lot; });
    tiragesCache.quand = 0;
    const tir = await tirages();
    const r = await reserveNette();
    const pdp = await etatPasDePerdant(joueurs, tir);
    const questions = (await Promise.all((await stockage.lister('questions/')).map((c) => stockage.lire(c)))).filter(Boolean);
    const jours = [];
    for (let j = 1; j <= NB_PORTES; j++) {
      let joues = 0, leJour = 0, justes = 0;
      joueurs.forEach((x) => { const r = x.reponses && x.reponses[j]; if (r) { joues++; if (r.leJour) leJour++; if (r.juste) justes++; } });
      const d = liste && liste.find((x) => x.j === j);
      jours.push({ j, titre: d ? d.titre : '', univers: d ? d.univers : '', gros: !!(d && d.gros), joues, leJour, justes, lot: textes[j] || '', tirage: tir[pad(j)] || null });
    }
    return json({
      cal: quand.cal, essai, pret: !!liste,
      inscrits: joueurs.length, actifs: joueurs.filter((x) => Object.keys(x.reponses || {}).length).length,
      nouvelles: joueurs.filter((x) => x.nouvelles).length, assidus: joueurs.filter((x) => Object.keys(x.reponses || {}).length >= NB_PORTES).length,
      participations: joueurs.reduce((n, x) => n + Object.keys(x.reponses || {}).length, 0),
      jours, finaux: { grand: tir.grand || null, assidus: tir.assidus || null }, lots: textes,
      courrier: !!courrier, contact,
      codes: Object.fromEntries(TYPES_CODES.map((t) => [t, r[t].length])), codesDonnes: r.donnes.length, besoins: besoinsCodes(prevus, tir, pdp), pasDePerdant: pdp,
      questions: questions.sort((a, b) => (a.le < b.le ? 1 : -1)).slice(0, 100),
    });
  }
  /** Ajoute des codes à la réserve (collés par l'équipe, un par ligne). Un code déjà connu n'est pas repris. */
  async function ajouterCodes(corps) {
    const type = String(corps.type || '');
    if (!TYPES_CODES.includes(type)) return refus(400, 'type', 'Genre de code inconnu.');
    const r = await reserve();
    const connus = new Set([...TYPES_CODES.flatMap((t) => r[t]), ...r.donnes.map((d) => d.code)]);
    const recus = String(corps.codes || '').split(/[\s,;]+/).map((c) => c.trim()).filter(Boolean);
    const refuses = recus.filter((c) => !/^[A-Za-z0-9_-]{3,40}$/.test(c));
    let ajoutes = 0;
    recus.forEach((c) => { if (/^[A-Za-z0-9_-]{3,40}$/.test(c) && !connus.has(c)) { connus.add(c); r[type].push(c); ajoutes++; } });
    if (corps.vider === true) r[type] = [];
    await stockage.ecrire('config/codes', r);
    return json({ ok: true, ajoutes, refuses: refuses.slice(0, 10), codes: Object.fromEntries(TYPES_CODES.map((t) => [t, r[t].length])) });
  }
  async function equipeEcrire(req, action, origine) {
    let corps; try { corps = await req.json(); } catch (_) { return refus(400, 'illisible', 'Demande illisible.'); }
    if (action === 'defis') {
      const souci = verifierDefis(corps.defis);
      if (souci) return refus(400, 'defis', souci);
      await stockage.ecrire('config/defis', corps.defis);
      return json({ ok: true, nombre: corps.defis.length });
    }
    if (action === 'lots') {
      const saisis = {};
      Object.keys(corps.lots || {}).forEach((k) => { if (/^(\d{1,2}|grand|assidus)$/.test(k)) saisis[k] = String(corps.lots[k] || '').slice(0, 200); });
      await stockage.ecrire('config/lots', saisis);
      lotsCache = { quand: 0, valeurs: null };
      return json({ ok: true });
    }
    if (action === 'tirage') {
      const cle = /^(grand|assidus)$/.test(corps.cle) ? corps.cle : pad(parseInt(corps.cle, 10));
      const actuel = await stockage.lire('tirages/' + cle);
      if (!actuel) return refus(404, 'absent', 'Ce tirage n’a pas encore eu lieu.');
      if (corps.action === 'prevenu') actuel.prevenu = corps.valeur !== false;
      else if (corps.action === 'lot') actuel.lot = String(corps.valeur || '').slice(0, 200);
      else if (corps.action === 'retirer') {
        const joueurs = await tousLesJoueurs();
        const anciens = (actuel.anciens || []).concat(actuel.gagnant ? [{ ...actuel.gagnant, remplaceLe: maintenant().toISOString(), raison: String(corps.raison || '').slice(0, 200) }] : []);
        const choix = { retires: anciens.map((a) => a.id), gagnants: gagnantsAutres(await lireTirages(), cle) };
        const neuf = actuel.genre === 'jour' ? tirerJour(actuel.jour, joueurs, choix) : tirerFinal(actuel.genre, joueurs, choix);
        // le nouveau gagnant reçoit son propre mail et son propre code (l'ancien garde le sien)
        Object.assign(actuel, { gagnant: neuf.gagnant, tireLe: neuf.tireLe, dejaGagnants: neuf.dejaGagnants, prevenu: false, anciens, mail: null, code: null });
      } else return refus(400, 'action', 'Action inconnue.');
      await stockage.ecrire('tirages/' + cle, actuel);
      tiragesCache = { quand: 0, valeurs: {} };
      return json({ ok: true, tirage: actuel });
    }
    if (action === 'codes') return ajouterCodes(corps);
    if (action === 'question') {
      const q = await stockage.lire('questions/' + String(corps.id || '').replace(/[^a-z0-9]/g, ''));
      if (!q) return refus(404, 'absent', 'Question introuvable.');
      q.etat = corps.etat === 'ouverte' ? 'ouverte' : 'traitee';
      q.traiteeLe = q.etat === 'traitee' ? maintenant().toISOString() : null;
      await stockage.ecrire('questions/' + q.id, q);
      return json({ ok: true });
    }
    if (action === 'rapport') {
      if (!courrier) return refus(409, 'sans_courrier', 'L’envoi des mails n’est pas branché sur ce site.');
      const ok = await rapport(quandPour(req), origine, { force: true });
      return ok ? json({ ok: true, a: contact }) : refus(409, 'rien', 'Rien à envoyer : aucun tirage n’a encore eu lieu, ou l’envoi a échoué.');
    }
    return refus(404, 'inconnu', 'Introuvable.');
  }
  async function exporter() {
    const joueurs = await tousLesJoueurs();
    const lignes = ['prenom;email;portes_ouvertes;inscrit_le'];
    joueurs.filter((x) => x.nouvelles).forEach((x) => lignes.push([x.prenom.replace(/[;"\r\n]/g, ' '), x.email, Object.keys(x.reponses || {}).length, (x.inscritLe || '').slice(0, 10)].join(';')));
    return new Response('﻿' + lignes.join('\r\n'), { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="avent-2026-nouvelles.csv"', 'cache-control': 'no-store' } });
  }

  async function gerer(req, { ip } = {}) {
    const url = new URL(req.url);
    const origine = url.origin;
    const chemin = url.pathname.replace(/^\/api\/avent\/?/, '').replace(/\/+$/, '');
    const m = req.method;
    try {
      if (chemin === 'etat' && m === 'GET') return await etat(req);
      if (chemin === 'defi' && m === 'GET') return await defi(req, url);
      if (chemin === 'jouer' && m === 'POST') return await jouer(req, ip);
      if (chemin === 'question' && m === 'POST') return await question(req, ip, origine);
      if (chemin === 'annonces' && m === 'GET') return await annonces(req, origine);
      if (chemin === 'essai/effacer' && m === 'POST') return await effacerEssai(req);
      if (chemin === 'equipe/initialiser' && m === 'POST') return await initialiser(req);
      if (chemin.startsWith('equipe/')) {
        if (!(await equipeAutorisee(req))) { await new Promise((r) => setTimeout(r, 400)); return refus(401, 'code', 'Code de l’équipe incorrect.'); }
        if (chemin === 'equipe/bilan' && m === 'GET') return await bilan(req, origine);
        if (chemin === 'equipe/defis' && m === 'GET') return json({ defis: await defis() });
        if (chemin === 'equipe/export' && m === 'GET') return await exporter();
        if (m === 'POST') return await equipeEcrire(req, chemin.slice('equipe/'.length), origine);
      }
      return refus(404, 'inconnu', 'Introuvable.');
    } catch (e) {
      console.error('[avent] erreur :', e && e.stack ? e.stack : e);
      return refus(500, 'panne', 'Un souci de notre côté. Réessayez dans un instant.');
    }
  }

  return { gerer, assurerTirages, livrer, automate, quandReel: () => { const p = parisDe(maintenant()); return { cal: jourCalendrier(p), heure: p.heure, simule: false }; } };
}
