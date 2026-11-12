// ==========================================================================
// SITE ENTIER : contenu de toutes les pages (recherche, remplacement sur tout
// le site, en-tête / pied de page communs), mis en cache dans le navigateur
// par empreinte git (une page déjà lue n'est retéléchargée que si elle a changé).
// ==========================================================================

import { appel } from './api.js';
import { etat, maj } from './etat.js';
import { construireArbre, elements, texteDecode, attr, classes, signature } from '../noyau/arbre.mjs';

const BASE_IDB = 'gd41-editeur';
let idb = null;
function ouvrir() {
  if (idb) return idb;
  idb = new Promise((res) => {
    try {
      const r = indexedDB.open(BASE_IDB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore('fichiers');
      r.onsuccess = () => res(r.result);
      r.onerror = () => res(null);
    } catch (_) { res(null); }
  });
  return idb;
}
async function idbLire(cle) {
  const db = await ouvrir();
  if (!db) return null;
  return new Promise((res) => { try { const t = db.transaction('fichiers').objectStore('fichiers').get(cle); t.onsuccess = () => res(t.result || null); t.onerror = () => res(null); } catch (_) { res(null); } });
}
async function idbEcrire(cle, val) {
  const db = await ouvrir();
  if (!db) return;
  try { db.transaction('fichiers', 'readwrite').objectStore('fichiers').put(val, cle); } catch (_) { /* rien */ }
}

const contenus = new Map(); // sha → texte

/** Contenu de pages (par lots de 30), avec cache par empreinte. */
export async function lireFichiers(liste, suivi) {
  const out = new Map();
  const manquants = [];
  for (const p of liste) {
    if (contenus.has(p.sha)) { out.set(p.chemin, contenus.get(p.sha)); continue; }
    const c = await idbLire(p.sha);
    if (c != null) { contenus.set(p.sha, c); out.set(p.chemin, c); } else manquants.push(p);
  }
  for (let i = 0; i < manquants.length; i += 30) {
    if (suivi) suivi(i, manquants.length);
    const lot = manquants.slice(i, i + 30);
    const r = await appel('fichiers', { methode: 'POST', corps: { commit: etat.commit, chemins: lot.map((p) => p.chemin) } });
    for (const f of r.fichiers) {
      if (f.contenu == null) continue;
      contenus.set(f.sha, f.contenu);
      idbEcrire(f.sha, f.contenu);
      out.set(f.chemin, f.contenu);
    }
  }
  return out;
}

export async function lireFichier(chemin) {
  const p = etat.pages.find((x) => x.chemin === chemin);
  if (!p) throw new Error('Page inconnue : ' + chemin);
  return (await lireFichiers([p])).get(chemin);
}

/** Titres de toutes les pages (pour la liste des pages et les liens). */
export async function chargerTitres() {
  const tous = await lireFichiers(etat.pages);
  const titres = {};
  for (const [chemin, html] of tous) {
    const m = /<title>([\s\S]*?)<\/title>/i.exec(html);
    titres[chemin] = m ? m[1].replace(/&amp;/g, '&').replace(/&#39;/g, '’').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim() : chemin;
  }
  maj({ titres });
  return tous;
}

const normal = (s) => String(s).replace(/\s+/g, ' ').trim();
const sansAccents = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Recherche un texte dans le contenu visible de toutes les pages.
 * @returns {{ chemin, id, n, texte, index }[]}
 */
export async function rechercher(requete, { exact = false } = {}) {
  const q = normal(requete);
  if (q.length < 2) return [];
  const tous = await lireFichiers(etat.pages);
  const res = [];
  for (const [chemin, html] of tous) {
    const source = etat.docs[chemin] ? etat.docs[chemin].calculer().html : html;
    const arbre = construireArbre(source);
    let corps = null;
    for (const el of elements(arbre.racine)) if (el.tag === 'body') { corps = el; break; }
    if (!corps) continue;
    for (const el of elements(corps)) {
      if (['script', 'style', 'noscript', 'svg', 'template'].includes(el.tag)) continue;
      let interdit = false;
      for (let p = el.parent; p; p = p.parent) if (['script', 'style', 'svg', 'noscript'].includes(p.tag)) interdit = true;
      if (interdit) continue;
      const segs = el.enfants.filter((k) => k.t === 'txt');
      segs.forEach((s, n) => {
        if (s.rawtext) return;
        const t = texteDecode(s);
        const i = exact ? t.indexOf(requete) : sansAccents(t).indexOf(sansAccents(q));
        if (i >= 0) res.push({ chemin, id: el.id, sig: signature(el), n, texte: t, index: i, longueur: exact ? requete.length : q.length, tag: el.tag });
      });
    }
  }
  return res;
}

/**
 * En-tête / pied de page communs : retrouve dans les autres pages l'élément
 * équivalent (même place dans l'en-tête ou le pied, même contenu exact).
 */
/** Le lien « actif » du menu change d'une page à l'autre : on l'ignore pour comparer. */
export const normaliserZone = (s) => String(s)
  .replace(/\s+aria-current="[^"]*"/g, '')
  .replace(/\sclass="active"/g, '')
  .replace(/(class="[^"]*?)\s*\bactive\b/g, '$1')
  .replace(/\s+/g, ' ');

export function cheminDansZone(arbre, id) {
  const el = arbre.parId.get(String(id));
  if (!el) return null;
  const chemin = [];
  let zone = null;
  for (let p = el; p && p.tag !== '#racine'; p = p.parent) {
    const cl = classes(p);
    if (p.tag === 'header' && cl.includes('site-header')) { zone = 'header.site-header'; break; }
    if (p.tag === 'footer' && cl.includes('site-footer')) { zone = 'footer.site-footer'; break; }
    const freres = p.parent.enfants.filter((k) => k.t === 'el');
    chemin.unshift(freres.indexOf(p));
  }
  if (!zone) return null;
  return { zone, chemin, sig: signature(el), contenu: normaliserZone(el.buf.slice(el.s, el.e)) };
}

export function retrouverDansPage(arbre, ref) {
  const [tag, cl] = ref.zone.split('.');
  let zone = null;
  for (const el of elements(arbre.racine)) if (el.tag === tag && classes(el).includes(cl)) { zone = el; break; }
  if (!zone) return null;
  let el = zone;
  for (const i of ref.chemin) {
    const freres = el.enfants.filter((k) => k.t === 'el');
    el = freres[i];
    if (!el) return null;
  }
  return normaliserZone(el.buf.slice(el.s, el.e)) === ref.contenu ? el : null;
}

export const titreCourt = (chemin) => {
  const t = etat.titres[chemin];
  if (t) return t.replace(/\s*[—|-]\s*GAMEDOOR.*$/i, '').trim() || t;
  if (chemin === 'index.html') return 'Accueil';
  return chemin.replace(/\/index\.html$/, '').split('/').pop().replace(/-/g, ' ');
};

export const urlPage = (chemin) => '/' + chemin.replace(/index\.html$/, '');
export { attr };
