// ==========================================================================
// Les 24 portes de GAMEDOOR·41 — MOTEUR DU JEU (côté serveur)
// Inscription sans mot de passe, une réponse par porte et par personne,
// réponse vérifiée ici (jamais envoyée au navigateur avant le lendemain midi),
// tirage au sort quotidien, écran de l'équipe.
// Les 24 défis (avec leurs réponses) ne sont PAS dans le dépôt : ils sont
// déposés dans le stockage par l'équipe (voir LISEZMOI.md).
// ==========================================================================
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

export const ANNEE = 2026;
export const NB_PORTES = 24;
export const MAX_INSCRIPTIONS_PAR_IP = 8;
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
export function creerMoteur({ stockage, maintenant = () => new Date(), contexte = 'production' }) {
  const essai = contexte !== 'production';
  let secretCache = null;
  let tiragesCache = { quand: 0, valeurs: {} };

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
  async function tirerJour(j, joueurs, exclus = []) {
    const candidats = joueurs.filter((x) => x.reponses && x.reponses[j] && x.reponses[j].leJour && !exclus.includes(x.id));
    const gagnant = candidats.length ? candidats[randomInt(candidats.length)] : null;
    return { cle: pad(j), genre: 'jour', jour: j, participants: candidats.length, tireLe: maintenant().toISOString(),
      gagnant: gagnant ? { id: gagnant.id, prenom: gagnant.prenom, email: gagnant.email, etiquette: etiquetteGagnant(gagnant) } : null, prevenu: false };
  }
  function tirerFinal(genre, joueurs) {
    const tout = () => true;
    let urne = [];
    if (genre === 'grand') joueurs.forEach((x) => { const n = ticketsDe(x, tout); for (let i = 0; i < n; i++) urne.push(x); });
    else urne = joueurs.filter((x) => Object.keys(x.reponses || {}).length >= NB_PORTES);
    const gagnant = urne.length ? urne[randomInt(urne.length)] : null;
    return { cle: genre, genre, participants: genre === 'grand' ? joueurs.filter((x) => Object.keys(x.reponses || {}).length).length : urne.length, billets: urne.length, tireLe: maintenant().toISOString(),
      gagnant: gagnant ? { id: gagnant.id, prenom: gagnant.prenom, email: gagnant.email, etiquette: etiquetteGagnant(gagnant) } : null, prevenu: false };
  }
  /** Fait les tirages dus et pas encore faits. Écriture « seulement si absent » : deux appels en même temps ne tirent pas deux gagnants. */
  async function assurerTirages(quand) {
    if (quand.simule && !essai) return 0;
    const dus = [];
    for (let j = 1; j <= NB_PORTES; j++) if (resultatVisible(j, quand)) dus.push(pad(j));
    if (resultatVisible(NB_PORTES, quand)) dus.push('grand', 'assidus');
    if (!dus.length) return 0;
    const faits = new Set((await stockage.lister('tirages/')).map((c) => c.slice('tirages/'.length)));
    const manquants = dus.filter((c) => !faits.has(c));
    if (!manquants.length) return 0;
    const joueurs = await tousLesJoueurs();
    let n = 0;
    for (const c of manquants) {
      const t = /^\d\d$/.test(c) ? await tirerJour(Number(c), joueurs) : tirerFinal(c, joueurs);
      if (await stockage.ecrire('tirages/' + c, t, { siAbsent: true })) n++;
    }
    tiragesCache = { quand: 0, valeurs: {} };
    return n;
  }
  async function tirages() {
    const t = maintenant().getTime();
    if (t - tiragesCache.quand < 45000) return tiragesCache.valeurs;
    const cles = await stockage.lister('tirages/');
    const valeurs = {};
    (await Promise.all(cles.map((c) => stockage.lire(c)))).forEach((x) => { if (x) valeurs[x.cle] = x; });
    tiragesCache = { quand: t, valeurs };
    return valeurs;
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
    const resultats = {};
    liste.forEach((d) => {
      if (!resultatVisible(d.j, quand)) return;
      const t = tir[pad(d.j)];
      resultats[d.j] = { bonne: texteBonne(d), explication: d.explication, tire: !!t, gagnant: t && t.gagnant ? t.gagnant.etiquette : null, participants: t ? t.participants : null, lot: (t && t.lot) || null };
    });
    const finaux = {};
    ['grand', 'assidus'].forEach((g) => { if (tir[g]) finaux[g] = { gagnant: tir[g].gagnant ? tir[g].gagnant.etiquette : null, lot: tir[g].lot || null }; });
    const joueur = await joueurDuJeton(req);
    return json({
      cal: quand.cal, simule: quand.simule, essai,
      portes: liste.map((d) => ({ j: d.j, univers: d.univers, gros: !!d.gros, titre: d.j <= quand.cal ? d.titre : null })),
      resultats, finaux, moi: joueur ? vueJoueur(joueur, quand) : null,
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
  async function bilan(req) {
    const quand = quandPour(req);
    const [joueurs, liste, lots] = await Promise.all([tousLesJoueurs(), defis(), stockage.lire('config/lots')]);
    try { await assurerTirages(quand); } catch (e) { console.error('[avent] tirage impossible :', e && e.message); }
    tiragesCache.quand = 0;
    const tir = await tirages();
    const jours = [];
    for (let j = 1; j <= NB_PORTES; j++) {
      let joues = 0, leJour = 0, justes = 0;
      joueurs.forEach((x) => { const r = x.reponses && x.reponses[j]; if (r) { joues++; if (r.leJour) leJour++; if (r.juste) justes++; } });
      const d = liste && liste.find((x) => x.j === j);
      jours.push({ j, titre: d ? d.titre : '', univers: d ? d.univers : '', gros: !!(d && d.gros), joues, leJour, justes, lot: (lots && lots[j]) || '', tirage: tir[pad(j)] || null });
    }
    return json({
      cal: quand.cal, essai, pret: !!liste,
      inscrits: joueurs.length, actifs: joueurs.filter((x) => Object.keys(x.reponses || {}).length).length,
      nouvelles: joueurs.filter((x) => x.nouvelles).length, assidus: joueurs.filter((x) => Object.keys(x.reponses || {}).length >= NB_PORTES).length,
      participations: joueurs.reduce((n, x) => n + Object.keys(x.reponses || {}).length, 0),
      jours, finaux: { grand: tir.grand || null, assidus: tir.assidus || null }, lots: lots || {},
    });
  }
  async function equipeEcrire(req, action) {
    let corps; try { corps = await req.json(); } catch (_) { return refus(400, 'illisible', 'Demande illisible.'); }
    if (action === 'defis') {
      const souci = verifierDefis(corps.defis);
      if (souci) return refus(400, 'defis', souci);
      await stockage.ecrire('config/defis', corps.defis);
      return json({ ok: true, nombre: corps.defis.length });
    }
    if (action === 'lots') {
      const lots = {};
      Object.keys(corps.lots || {}).forEach((k) => { if (/^(\d{1,2}|grand|assidus)$/.test(k)) lots[k] = String(corps.lots[k] || '').slice(0, 200); });
      await stockage.ecrire('config/lots', lots);
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
        const neuf = actuel.genre === 'jour' ? await tirerJour(actuel.jour, joueurs, anciens.map((a) => a.id)) : tirerFinal(actuel.genre, joueurs.filter((x) => !anciens.some((a) => a.id === x.id)));
        Object.assign(actuel, { gagnant: neuf.gagnant, tireLe: neuf.tireLe, prevenu: false, anciens });
      } else return refus(400, 'action', 'Action inconnue.');
      await stockage.ecrire('tirages/' + cle, actuel);
      tiragesCache = { quand: 0, valeurs: {} };
      return json({ ok: true, tirage: actuel });
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
    const chemin = url.pathname.replace(/^\/api\/avent\/?/, '').replace(/\/+$/, '');
    const m = req.method;
    try {
      if (chemin === 'etat' && m === 'GET') return await etat(req);
      if (chemin === 'defi' && m === 'GET') return await defi(req, url);
      if (chemin === 'jouer' && m === 'POST') return await jouer(req, ip);
      if (chemin === 'essai/effacer' && m === 'POST') return await effacerEssai(req);
      if (chemin === 'equipe/initialiser' && m === 'POST') return await initialiser(req);
      if (chemin.startsWith('equipe/')) {
        if (!(await equipeAutorisee(req))) { await new Promise((r) => setTimeout(r, 400)); return refus(401, 'code', 'Code de l’équipe incorrect.'); }
        if (chemin === 'equipe/bilan' && m === 'GET') return await bilan(req);
        if (chemin === 'equipe/defis' && m === 'GET') return json({ defis: await defis() });
        if (chemin === 'equipe/export' && m === 'GET') return await exporter();
        if (m === 'POST') return await equipeEcrire(req, chemin.slice('equipe/'.length));
      }
      return refus(404, 'inconnu', 'Introuvable.');
    } catch (e) {
      console.error('[avent] erreur :', e && e.stack ? e.stack : e);
      return refus(500, 'panne', 'Un souci de notre côté. Réessayez dans un instant.');
    }
  }

  return { gerer, assurerTirages, quandReel: () => { const p = parisDe(maintenant()); return { cal: jourCalendrier(p), heure: p.heure, simule: false }; } };
}
