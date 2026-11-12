// ==========================================================================
// ACTIONS de l'éditeur (appelées par l'interface)
// ==========================================================================

import { etat, maj, toucher, toast, docCourant } from './etat.js';
import { appel, travail, ErreurApi } from './api.js';
import { DocumentEdition, documentNouvellePage, estErreurEditeur, nouvelUid } from './moteur.js';
import { lireFichier, lireFichiers, chargerTitres, cheminDansZone, retrouverDansPage } from './site.js';
import { construireArbre, signature } from '../noyau/arbre.mjs';
import { rechargerMedia } from './medias.js';

const CLE_LOCALE = 'gd41ed:b:';

// ------------------------------------------------------------------ démarrage
export async function demarrer() {
  const moi = await appel('moi');
  maj({ qui: moi.qui, config: moi, connexion: 'connecte' });
  if (!moi.github) return;
  await rechargerListe();
  try { const r = await appel('reglages'); maj({ reglages: r.reglages }); } catch (_) { /* rien */ }
  // brouillons gardés sur cet appareil
  for (const cle of Object.keys(localStorage)) {
    if (!cle.startsWith(CLE_LOCALE)) continue;
    const chemin = cle.slice(CLE_LOCALE.length);
    if (!etat.docs[chemin]) {
      try { await reprendreBrouillon(chemin, JSON.parse(localStorage.getItem(cle)), true); } catch (_) { /* brouillon illisible : ignoré */ }
    }
  }
  rafraichirBrouillonsServeur();
  setInterval(presence, 45000);
  setInterval(rafraichirBrouillonsServeur, 90000);
  const depuisAdresse = decodeURIComponent((location.hash || '').replace(/^#\/?/, ''));
  const voulu = depuisAdresse ? (depuisAdresse.endsWith('.html') ? depuisAdresse : depuisAdresse.replace(/\/?$/, '/') + 'index.html').replace(/^\/+/, '') : null;
  const premier = (voulu && etat.pages.some((p) => p.chemin === voulu)) ? voulu : (localStorage.getItem('gd41ed:derniere') || 'index.html');
  await ouvrirPage(etat.pages.some((p) => p.chemin === premier) || etat.docs[premier] ? premier : 'index.html');
  chargerTitres().catch(() => {});
}

export async function rechargerListe() {
  const p = await appel('pages');
  maj({ commit: p.commit, pages: p.pages, medias: p.medias, versions: p.versions || {} });
  for (const d of Object.values(etat.docs)) d.ctx = { versions: etat.versions, nouvellePage: !!d.nouvelle };
  return p;
}

async function presence() {
  try {
    await appel('presence', { methode: 'POST', corps: { chemin: etat.courant } });
    const r = await appel('presence');
    maj({ presences: r.presences || [] });
  } catch (_) { /* rien */ }
}

export async function rafraichirBrouillonsServeur() {
  try { const r = await appel('brouillons'); maj({ brouillonsServeur: r.brouillons || [] }); } catch (_) { /* rien */ }
}

// ------------------------------------------------------------------ pages
function nouveauDoc(chemin, source, sha) {
  const d = new DocumentEdition({ chemin, source, sha, commit: etat.commit });
  d.ctx = { versions: etat.versions };
  return d;
}

/** Rejoue des étapes sauvegardées (avec rebasage si la page a changé). */
function restaurer(doc, etapes) {
  const echecs = [];
  for (const e of etapes || []) {
    try { doc.essayer(e.ops, e.libelle); } catch (err) { echecs.push({ libelle: e.libelle, erreur: err.message }); }
  }
  return echecs;
}

async function reprendreBrouillon(chemin, b, silencieux = false) {
  if (!b || !Array.isArray(b.etapes)) return null;
  let doc;
  if (b.nouvelle) {
    const modele = await lireFichier(b.nouvelle.modele || 'contact/index.html');
    doc = documentNouvellePage(modele, b.nouvelle, etat.commit);
    doc.ctx = { versions: etat.versions, nouvellePage: true };
  } else {
    const p = etat.pages.find((x) => x.chemin === chemin);
    if (!p) return null;
    doc = nouveauDoc(chemin, await lireFichier(chemin), p.sha);
    if (b.sha && b.sha !== p.sha) {
      // la page a changé sur le site : on recale les identifiants grâce aux empreintes
      const { rebaser } = await import('../noyau/operations.mjs');
      const plat = b.etapes.flatMap((e) => e.ops.map((o) => ({ o, e })));
      const { alignes } = rebaser(plat.map((x) => x.o), doc.source);
      let i = 0;
      b = { ...b, etapes: b.etapes.map((e) => ({ ...e, ops: e.ops.map(() => alignes[i++]).filter(Boolean) })).filter((e) => e.ops.length) };
    }
  }
  doc.medias = b.medias || [];
  for (const m of doc.medias) rechargerMedia(m);
  const echecs = restaurer(doc, b.etapes);
  etat.docs[chemin] = doc;
  if (echecs.length && !silencieux) toast(echecs.length + ' modification(s) du brouillon ne s’appliquent plus (la page a changé entre-temps).', 'attention', 9000);
  toucher();
  return doc;
}

export async function ouvrirPage(chemin) {
  if (etat.edition) terminerEdition();
  if (!etat.docs[chemin]) {
    const p = etat.pages.find((x) => x.chemin === chemin);
    if (!p) { toast('Page introuvable : ' + chemin, 'erreur'); return; }
    maj({ chargement: 'Ouverture de la page…' });
    try {
      etat.docs[chemin] = nouveauDoc(chemin, await lireFichier(chemin), p.sha);
    } finally { maj({ chargement: null }); }
  }
  localStorage.setItem('gd41ed:derniere', chemin);
  history.replaceState(null, '', '#/' + chemin.replace(/index\.html$/, ''));
  maj({ courant: chemin, selection: null, survol: null, edition: null, menu: null });
  toucher();
  presence();
}

export async function nouvellePage(options) {
  const modele = await lireFichier(options.modele || 'contact/index.html');
  const doc = documentNouvellePage(modele, options, etat.commit);
  doc.ctx = { versions: etat.versions, nouvellePage: true };
  if (etat.docs[doc.chemin] || etat.pages.some((p) => p.chemin === doc.chemin)) throw new Error('Une page existe déjà à cette adresse.');
  etat.docs[doc.chemin] = doc;
  sauverBrouillon(doc);
  maj({ courant: doc.chemin, selection: null });
  toucher();
  return doc;
}

// ------------------------------------------------------------------ modifications
/**
 * Applique une étape (une ou plusieurs opérations) à la page courante.
 * @returns {boolean} true si acceptée
 */
export function appliquer(ops, libelle, { doc = docCourant(), silencieux = false } = {}) {
  if (!doc) return false;
  try {
    doc.essayer(Array.isArray(ops) ? ops : [ops], libelle);
    sauverBrouillon(doc);
    toucher();
    return true;
  } catch (e) {
    if (!silencieux) toast(estErreurEditeur(e) ? e.message : 'Modification impossible : ' + e.message, e.code === 'SUPPRESSION' ? 'interdit' : 'erreur', 7000);
    return false;
  }
}

export function annuler() {
  const d = docCourant();
  if (!d || !d.peutAnnuler()) return;
  d.annuler();
  sauverBrouillon(d);
  toucher();
}

export function retablir() {
  const d = docCourant();
  if (!d || !d.peutRetablir()) return;
  d.retablir();
  sauverBrouillon(d);
  toucher();
}

export function allerA(position) {
  const d = docCourant();
  if (!d) return;
  d.allerA(position);
  sauverBrouillon(d);
  toucher();
}

/** Abandonne TOUTES les modifications non publiées d'une page (rien n'est retiré du site). */
export async function abandonnerBrouillon(chemin) {
  const d = etat.docs[chemin];
  localStorage.removeItem(CLE_LOCALE + chemin);
  try { await appel('brouillon?chemin=' + encodeURIComponent(chemin), { methode: 'DELETE' }); } catch (_) { /* rien */ }
  if (d && d.nouvelle) {
    delete etat.docs[chemin];
    if (etat.courant === chemin) await ouvrirPage('index.html');
  } else if (d) {
    d.etapes = [];
    d.position = 0;
    d.cache = null;
  }
  rafraichirBrouillonsServeur();
  toucher();
}

const minuteurs = new Map();
export function sauverBrouillon(doc) {
  try {
    if (!doc.modifie && !doc.etapes.length) localStorage.removeItem(CLE_LOCALE + doc.chemin);
    else localStorage.setItem(CLE_LOCALE + doc.chemin, JSON.stringify({ ...doc.versBrouillon(), date: new Date().toISOString() }));
  } catch (_) { /* stockage plein : le brouillon serveur prend le relais */ }
  clearTimeout(minuteurs.get(doc.chemin));
  minuteurs.set(doc.chemin, setTimeout(async () => {
    try {
      if (!doc.modifie) await appel('brouillon?chemin=' + encodeURIComponent(doc.chemin), { methode: 'DELETE' });
      else await appel('brouillon', { methode: 'PUT', corps: doc.versBrouillon() });
      maj({ derniereSauvegarde: new Date().toISOString() });
    } catch (_) { maj({ derniereSauvegarde: 'erreur' }); }
  }, 3500));
}

/** Reprend le brouillon d'un·e collègue (enregistré sur le serveur). */
export async function reprendreBrouillonServeur(chemin) {
  const r = await appel('brouillon?chemin=' + encodeURIComponent(chemin));
  if (!r.brouillon) { toast('Brouillon introuvable.', 'erreur'); return; }
  const doc = await reprendreBrouillon(chemin, r.brouillon);
  if (doc) { sauverBrouillon(doc); await ouvrirPage(chemin); toast('Brouillon de ' + r.brouillon.auteur.nom + ' repris.', 'succes'); }
}

// ------------------------------------------------------------------ sélection & texte
export function selectionner(id) {
  maj({ selection: id ? String(id) : null, menu: null });
}

export function demarrerEdition(id) { maj({ edition: id ? String(id) : null }); }
export function terminerEdition() { maj({ edition: null }); }

// ------------------------------------------------------------------ partout sur le site
/**
 * Applique la même modification à un élément de l'en-tête ou du pied de page
 * sur toutes les pages où cet élément est identique.
 * @param {string} id      élément de la page courante
 * @param {(idLocal: string) => object[]} fabrique   opérations pour une page
 */
export async function appliquerPartout(id, fabrique, libelle, { saufCourante = true } = {}) {
  const d = docCourant();
  const ref = cheminDansZone(d.arbreBase, id);
  if (!ref) { toast('Cet élément ne fait pas partie de l’en-tête ou du pied de page communs.', 'erreur'); return; }
  maj({ chargement: 'Application sur toutes les pages…' });
  try {
    const contenus = await lireFichiers(etat.pages);
    let ok = 0;
    let ignorees = 0;
    for (const [chemin, html] of contenus) {
      if (saufCourante && chemin === etat.courant) continue;
      const doc = etat.docs[chemin] || nouveauDoc(chemin, html, etat.pages.find((p) => p.chemin === chemin).sha);
      const el = retrouverDansPage(doc.arbreBase, ref);
      if (!el) { ignorees++; continue; }
      if (appliquer(fabrique(el.id), libelle + ' (toutes les pages)', { doc, silencieux: true })) { etat.docs[chemin] = doc; ok++; } else ignorees++;
    }
    toast('Modifié sur ' + ok + ' page' + (ok > 1 ? 's' : '') + (ignorees ? ' (' + ignorees + ' page' + (ignorees > 1 ? 's' : '') + ' laissée' + (ignorees > 1 ? 's' : '') + ' de côté : en-tête différent)' : '') + '.', 'succes', 7000);
    toucher();
  } finally { maj({ chargement: null }); }
}

/** Remplace des textes trouvés par la recherche (sur plusieurs pages). */
export async function remplacerResultats(resultats, nouveau) {
  const parPage = new Map();
  for (const r of resultats) { if (!parPage.has(r.chemin)) parPage.set(r.chemin, []); parPage.get(r.chemin).push(r); }
  let n = 0;
  const contenus = await lireFichiers(etat.pages.filter((p) => parPage.has(p.chemin)));
  for (const [chemin, liste] of parPage) {
    const doc = etat.docs[chemin] || nouveauDoc(chemin, contenus.get(chemin), etat.pages.find((p) => p.chemin === chemin).sha);
    // regroupe par segment de texte (plusieurs occurrences dans le même texte)
    const parSeg = new Map();
    for (const r of liste) { const k = r.id + '|' + r.n; if (!parSeg.has(k)) parSeg.set(k, []); parSeg.get(k).push(r); }
    const ops = [];
    for (const occ of parSeg.values()) {
      const r0 = occ[0];
      let t = r0.texte;
      for (const r of [...occ].sort((a, b) => b.index - a.index)) t = t.slice(0, r.index) + nouveau + t.slice(r.index + r.longueur);
      ops.push({ op: 'texte', id: r0.id, sig: r0.sig, n: r0.n, ancien: r0.texte, valeur: t });
    }
    if (appliquer(ops, 'Remplacement de texte sur le site', { doc })) { etat.docs[chemin] = doc; n += liste.length; }
  }
  toucher();
  return n;
}

// ------------------------------------------------------------------ publication
export const docsModifies = () => Object.values(etat.docs).filter((d) => d.modifie);

function empreinteLot(lot) {
  const s = JSON.stringify([lot.base, lot.pages, lot.nouvellesPages, lot.medias]);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(36) + s.length.toString(36);
}

/** Prépare le lot à publier, en recalant les pages qui ont changé sur le site entre-temps. */
export async function preparerLot(chemins, message) {
  const liste = await rechargerListe();
  const lot = { base: liste.commit, message, pages: [], nouvellesPages: [], medias: [] };
  const perdues = [];
  for (const chemin of chemins) {
    const d = etat.docs[chemin];
    if (!d || !d.modifie) continue;
    if (!d.nouvelle) {
      const p = liste.pages.find((x) => x.chemin === chemin);
      if (!p) throw new Error('La page /' + chemin + ' n’existe plus.');
      if (p.sha !== d.sha) {
        const ancien = d.ops().length;
        const pertes = d.rebaser(await lireFichier(chemin), p.sha, liste.commit);
        if (pertes.length) perdues.push({ chemin, pertes, total: ancien });
        sauverBrouillon(d);
      } else d.commit = liste.commit;
    }
    const html = d.calculer().html;
    for (const m of d.medias) if (html.includes('/' + m.chemin)) lot.medias.push(m);
    if (d.nouvelle) lot.nouvellesPages.push({ ...d.nouvelle, ops: d.ops() });
    else lot.pages.push({ chemin, ops: d.ops() });
  }
  lot.empreinte = empreinteLot(lot);
  toucher();
  return { lot, perdues };
}

/** Après publication : on repart de la version en ligne. */
export async function apresPublication(chemins) {
  for (const c of chemins) {
    localStorage.removeItem(CLE_LOCALE + c);
    try { await appel('brouillon?chemin=' + encodeURIComponent(c), { methode: 'DELETE' }); } catch (_) { /* rien */ }
    delete etat.docs[c];
  }
  await rechargerListe();
  const courant = etat.courant;
  if (courant && !etat.docs[courant]) await ouvrirPage(etat.pages.some((p) => p.chemin === courant) ? courant : 'index.html');
  rafraichirBrouillonsServeur();
  chargerTitres().catch(() => {});
  toucher();
}

/** Vérifie que le site sert bien la nouvelle version (empreinte du fichier). */
export async function verifierEnLigne(fichiers, { essais = 40 } = {}) {
  const aVerifier = fichiers.filter((f) => f.url && f.sha256);
  const ok = new Set();
  for (let i = 0; i < essais && ok.size < aVerifier.length; i++) {
    await new Promise((r) => setTimeout(r, 4000));
    for (const f of aVerifier) {
      if (ok.has(f.chemin)) continue;
      try {
        const chemin = new URL(f.url).pathname;
        const txt = await (await fetch(chemin + '?verif=' + Date.now(), { cache: 'no-store' })).text();
        const h = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt)))).map((b) => b.toString(16).padStart(2, '0')).join('');
        if (h === f.sha256) ok.add(f.chemin);
      } catch (_) { /* on réessaie */ }
    }
  }
  return { enLigne: ok.size, total: aVerifier.length };
}

export { travail, ErreurApi, nouvelUid, signature, construireArbre };

// ------------------------------------------------------------------ ajouts communs à toutes les pages
/** Retrouve l'opération « inserer » qui a créé un élément ajouté. */
export function opDAjout(id) {
  const d = docCourant();
  if (!d) return null;
  const uid = String(id).split('.')[0];
  return d.ops().find((o) => o.op === 'inserer' && o.uid === uid) || null;
}

/** Un ajout placé dans l'en-tête / le pied de page (ou juste à côté) peut être recopié sur toutes les pages. */
export function ajoutPropageable(id) {
  const op = opDAjout(id);
  if (!op || String(op.id).includes('.')) return null;
  const d = docCourant();
  return cheminDansZone(d.arbreBase, op.id) ? op : null;
}

export async function propagerAjout(id) {
  const op = ajoutPropageable(id);
  if (!op) { toast('Cet ajout n’est pas rattaché à l’en-tête ou au pied de page communs.', 'info'); return; }
  await appliquerPartout(op.id, (idLocal) => [{ op: 'inserer', id: idLocal, position: op.position, html: op.html, uid: nouvelUid() }], 'Ajout recopié');
}

/** Ajoute un lien dans le menu principal de toutes les pages (avant « Contact »). */
export async function ajouterAuMenu(url, libelle) {
  const docAccueil = etat.docs['index.html'] || nouveauDoc('index.html', await lireFichier('index.html'), (etat.pages.find((p) => p.chemin === 'index.html') || {}).sha);
  const arbre = docAccueil.arbreBase;
  let contact = null;
  for (const el of arbre.parId.values()) {
    if (el.tag === 'a' && el.parent && el.parent.tag === 'nav' && (el.attrs.find((a) => a.nom === 'href') || {}).val === '/contact/') { contact = el; break; }
  }
  if (!contact) { toast('Menu introuvable : ajoutez le lien à la main.', 'erreur'); return; }
  const ref = cheminDansZone(arbre, contact.id);
  if (!ref) return;
  const echapper = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const html = '<a href="' + echapper(url) + '">' + echapper(libelle) + '</a>';
  maj({ chargement: 'Ajout au menu de toutes les pages…' });
  try {
    const contenus = await lireFichiers(etat.pages);
    let n = 0;
    const cibles = [...contenus.entries()];
    for (const d of Object.values(etat.docs)) if (d.nouvelle) cibles.push([d.chemin, null]);
    for (const [chemin, html0] of cibles) {
      const doc = etat.docs[chemin] || nouveauDoc(chemin, html0, (etat.pages.find((p) => p.chemin === chemin) || {}).sha);
      const el = retrouverDansPage(doc.arbreBase, ref);
      if (!el) continue;
      if (appliquer([{ op: 'inserer', id: el.id, position: 'avant', html, uid: nouvelUid() }], 'Lien « ' + libelle + ' » ajouté au menu', { doc, silencieux: true })) { etat.docs[chemin] = doc; n++; }
    }
    toast('Lien ajouté au menu de ' + n + ' page(s).', 'succes');
    toucher();
  } finally { maj({ chargement: null }); }
}
