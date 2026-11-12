// Commandes sur l'élément sélectionné (barre flottante, menu, raccourcis, panneaux)
import { etat, maj, toast, docCourant } from './etat.js';
import { appliquer, selectionner } from './actions.js';
import { nouvelUid, infos, donneeStyles, usagesCle } from './moteur.js';
import { elements, serialiser, attr, classes } from '../noyau/arbre.mjs';

const TECHNIQUES = new Set(['script', 'style', 'noscript', 'template', 'link', 'meta']);
const freresElements = (el) => el.parent.enfants.filter((k) => k.t === 'el' && !TECHNIQUES.has(k.tag));

export function elementCourant(id = etat.selection) {
  const d = docCourant();
  if (!d || id == null) return null;
  const el = d.page.arbre.parId.get(String(id));
  return el && d.page.attache(el) ? el : null;
}

/** Point d'insertion par défaut : fin du contenu principal (ou avant le pied de page). */
function pointParDefaut(page) {
  const corps = page.corps();
  if (!corps) return null;
  const main = [...elements(corps)].find((e) => e.tag === 'main');
  if (main) return { id: main.id, position: 'fin' };
  const pied = corps.enfants.find((k) => k.t === 'el' && k.tag === 'footer');
  if (pied) return { id: pied.id, position: 'avant' };
  return { id: corps.id, position: 'fin' };
}

/**
 * Insère du HTML (bloc, image, collage). Si aucune position n'est donnée,
 * cherche le premier endroit valide après la sélection en remontant les parents.
 * @returns {string|null} id du nouvel élément
 */
export function insererHtml(html, libelle, { id = etat.selection, position = null } = {}) {
  const d = docCourant();
  if (!d) return null;
  const page = d.page;
  const candidats = [];
  if (id != null && position) candidats.push({ id, position });
  else if (id != null) {
    let el = page.arbre.parId.get(String(id));
    while (el && el.tag !== '#racine' && el.tag !== 'html') {
      if (el.tag === 'body') { candidats.push({ id: el.id, position: 'fin' }); break; }
      candidats.push({ id: el.id, position: 'apres' });
      el = el.parent;
    }
  } else {
    const p = pointParDefaut(page);
    if (p) candidats.push(p);
  }
  let derniere = null;
  for (const c of candidats) {
    const uid = nouvelUid();
    const op = { op: 'inserer', id: c.id, position: c.position, html, uid };
    const err = d.tester([op]);
    if (err) { derniere = err; continue; }
    if (appliquer([op], libelle)) {
      selectionner(uid + '.0');
      return uid + '.0';
    }
    return null;
  }
  toast(derniere ? derniere.message : 'Impossible d’ajouter ce contenu ici.', 'erreur', 6000);
  return null;
}

export function deplacerVers(id, ref, position) {
  if (String(id) === String(ref)) return false;
  return appliquer([{ op: 'deplacer', id, ref, position }], 'Élément déplacé');
}

export function monter(id = etat.selection) {
  const el = elementCourant(id);
  if (!el || !el.parent) return;
  const fr = freresElements(el);
  const i = fr.indexOf(el);
  if (i <= 0) { toast('Déjà en premier dans son conteneur.', 'info'); return; }
  deplacerVers(el.id, fr[i - 1].id, 'avant');
}

export function descendre(id = etat.selection) {
  const el = elementCourant(id);
  if (!el || !el.parent) return;
  const fr = freresElements(el);
  const i = fr.indexOf(el);
  if (i < 0 || i >= fr.length - 1) { toast('Déjà en dernier dans son conteneur.', 'info'); return; }
  deplacerVers(el.id, fr[i + 1].id, 'apres');
}

export function dupliquer(id = etat.selection) {
  const el = elementCourant(id);
  if (!el) return;
  const uid = nouvelUid();
  if (appliquer([{ op: 'dupliquer', id: el.id, uid }], 'Élément dupliqué')) selectionner(uid + '.0');
}

export function supprimer(id = etat.selection) {
  const el = elementCourant(id);
  if (!el) return;
  if (!el.nouveau) {
    toast('Interdit : un contenu publié ne se supprime jamais. Vous pouvez le modifier, le déplacer ou ajouter du contenu à côté. En cas de vrai problème : menu du compte › « Signaler un problème à Allan ».', 'interdit', 9000);
    return;
  }
  const parent = el.parent;
  if (appliquer([{ op: 'supprimer', id: el.id }], 'Ajout retiré (pas encore publié)')) selectionner(parent && parent.tag !== 'body' ? parent.id : null);
}

export function selectionnerParent(id = etat.selection) {
  const el = elementCourant(id);
  if (el && el.parent && !['body', 'html', '#racine'].includes(el.parent.tag)) selectionner(el.parent.id);
}

/** HTML d'un élément tel qu'il est dans la page (sans annotations de l'éditeur). */
export function htmlDe(id = etat.selection) {
  const el = elementCourant(id);
  if (!el) return null;
  return serialiser({ racine: { enfants: [el] } });
}

export function copier(id = etat.selection) {
  const html = htmlDe(id);
  if (!html) return;
  maj({ presse: html });
  try { navigator.clipboard.writeText(html); } catch (_) { /* rien */ }
  toast('Élément copié : collez-le où vous voulez (Ctrl+V).', 'succes', 2500);
}

export function coller(id = etat.selection) {
  if (!etat.presse) { toast('Rien à coller : copiez d’abord un élément.', 'info'); return; }
  insererHtml(etat.presse.replace(/\sid="[^"]*"/g, ''), 'Élément collé', { id });
}

// ---- styles
let stylePresse = null;
export function copierStyle(id = etat.selection) {
  const d = docCourant();
  const i = d && infos(d.page, id);
  if (!i || !i.cleStyle) { toast('Cet élément n’a pas de style posé avec l’éditeur.', 'info'); return; }
  stylePresse = JSON.parse(JSON.stringify(donneeStyles(d.page)[i.cleStyle] || {}));
  toast('Style copié.', 'succes', 2000);
}

export function collerStyle(id = etat.selection) {
  if (!stylePresse) { toast('Copiez d’abord le style d’un élément.', 'info'); return; }
  modifierStyle(id, stylePresse, 'Style collé');
}

/** Pose des styles (par appareil) sur un élément, en gérant sa clé de style. */
export function modifierStyle(id, styles, libelle = 'Style modifié') {
  const d = docCourant();
  const i = d && infos(d.page, id);
  if (!i) return false;
  const op = { op: 'style', id: i.id, styles };
  if (i.cleStyle && usagesCle(d.page, i.cleStyle) === 1) op.cle = i.cleStyle;
  else if (i.cleStyle) { op.cle = nouvelUid(); op.base = i.cleStyle; }
  else op.cle = nouvelUid();
  return appliquer([op], libelle);
}

export function reinitialiserStyle(id = etat.selection) {
  const d = docCourant();
  const i = d && infos(d.page, id);
  if (!i || !i.cleStyle) return;
  const donnee = donneeStyles(d.page)[i.cleStyle] || {};
  const vide = {};
  for (const [app, decl] of Object.entries(donnee)) vide[app] = Object.fromEntries(Object.keys(decl).map((p) => [p, null]));
  modifierStyle(id, vide, 'Style d’origine rétabli');
}

export function estDansZoneCommune(id = etat.selection) {
  for (let p = elementCourant(id); p; p = p.parent) {
    if (p.tag === 'header' && classes(p).includes('site-header')) return 'en-tête';
    if (p.tag === 'footer' && classes(p).includes('site-footer')) return 'pied de page';
  }
  return null;
}

export { attr };
