// ==========================================================================
// Éditeur du site — ARBRE FIDÈLE À LA SOURCE
//
// Une page HTML est découpée en un arbre construit à partir des POSITIONS des
// balises dans le fichier (et non à partir de l'arbre DOM du navigateur, qui
// déplace certains blancs et corrige certaines erreurs). Conséquence : sans
// modification, la réécriture redonne le fichier OCTET POUR OCTET ; avec des
// modifications, seuls les morceaux touchés changent (pas de reformatage).
//
// Nœuds :
//   el  : { t, id, tag, buf, s, e, ts:[s,e], te:[s,e]|null, attrs:[{nom,val,s,e}],
//           enfants:[], parent, nouveau, attrsModifies }
//   txt : { t, buf, s, e, brut (texte HTML de remplacement ou null), parent, rawtext }
//   com : { t, buf, s, e, parent }          (commentaire, doctype, débris)
//   gen : { t, html, parent }               (texte généré : contenu de <style id="gd-editeur">)
//
// Les éléments d'origine portent un identifiant numérique (ordre du fichier) ;
// les éléments ajoutés par l'éditeur portent « <op>.<n> » et nouveau = true.
// Module PUR (navigateur + serveur).
// ==========================================================================

import { parse, parseFragment } from 'parse5';
import { decodeHTML } from 'entities';

export class ErreurEditeur extends Error {
  constructor(message, code = 'REFUS', details = null) {
    super(message);
    this.name = 'ErreurEditeur';
    this.code = code;
    this.details = details;
  }
}

export const VIDES = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
// Contenu brut : jamais décodé, jamais modifiable en texte
export const BRUTS = new Set(['script', 'style', 'xmp', 'iframe', 'noembed', 'noframes', 'noscript', 'plaintext']);
const RCDATA = new Set(['title', 'textarea']);

/** Parcourt tous les nœuds parse5 (y compris le contenu des <template>). */
function* parcourirP5(n) {
  yield n;
  const kids = n.content && n.nodeName === 'template' ? n.content.childNodes : n.childNodes;
  if (kids) for (const k of kids) yield* parcourirP5(k);
}

/**
 * Construit l'arbre d'un texte HTML.
 * @param {string} buf      le texte
 * @param {object} [o]
 * @param {boolean} [o.fragment]  morceau de HTML (ajout) plutôt que page entière
 * @param {string}  [o.prefixe]   préfixe des identifiants (« 3. » pour l'opération 3) ; vide = page d'origine
 * @param {boolean} [o.nouveau]   éléments ajoutés par l'éditeur
 */
export function construireArbre(buf, o = {}) {
  const { fragment = false, prefixe = '', nouveau = false } = o;
  const doc = fragment
    ? parseFragment(buf, { sourceCodeLocationInfo: true })
    : parse(buf, { sourceCodeLocationInfo: true });

  // 1. Éléments écrits dans la source (balise ouvrante présente) et commentaires
  const elements = [];
  const comments = [];
  for (const n of parcourirP5(doc)) {
    const loc = n.sourceCodeLocation;
    if (!loc) continue;
    if (n.tagName && loc.startTag) {
      const attrs = (n.attrs || []).map((a) => {
        const al = loc.attrs && loc.attrs[a.name];
        return { nom: a.name, val: a.value, s: al ? al.startOffset : -1, e: al ? al.endOffset : -1 };
      });
      elements.push({
        t: 'el', id: null, tag: n.tagName.toLowerCase(), tagSource: n.tagName, buf,
        s: loc.startOffset, e: loc.endOffset,
        ts: [loc.startTag.startOffset, loc.startTag.endOffset],
        te: loc.endTag ? [loc.endTag.startOffset, loc.endTag.endOffset] : null,
        attrs, enfants: [], parent: null, nouveau, attrsModifies: false,
      });
    } else if (n.nodeName === '#comment' || n.nodeName === '#documentType') {
      comments.push({ s: loc.startOffset, e: loc.endOffset });
    }
  }
  elements.sort((a, b) => a.s - b.s || b.e - a.e);
  comments.sort((a, b) => a.s - b.s);

  // Fin réelle d'un élément sans balise fermante : jamais avant la fin de sa balise ouvrante
  for (const el of elements) {
    if (el.e < el.ts[1]) el.e = el.ts[1];
    if (VIDES.has(el.tag)) { el.e = el.ts[1]; el.te = null; }
  }

  // 2. Imbrication par positions
  const racine = { t: 'el', id: fragment ? '#fragment' : '#document', tag: '#racine', buf, s: 0, e: buf.length, ts: null, te: null, attrs: [], enfants: [], parent: null, nouveau, attrsModifies: false };
  const pile = [racine];
  const conflits = [];
  for (const el of elements) {
    while (pile.length > 1 && pile[pile.length - 1].e <= el.s) pile.pop();
    let parent = pile[pile.length - 1];
    const finContenu = parent.te ? parent.te[0] : parent.e;
    if (el.e > finContenu) {
      // Chevauchement (balises mal imbriquées) : on borne l'élément à son parent
      conflits.push({ tag: el.tag, s: el.s, parent: parent.tag });
      el.e = Math.max(el.ts[1], finContenu);
      if (el.te && el.te[1] > el.e) el.te = null;
      el.conflit = true;
    }
    el.parent = parent;
    parent.enfants.push(el);
    if (!VIDES.has(el.tag) && el.e > el.ts[1]) pile.push(el);
  }

  // 3. Segments de texte et commentaires entre les éléments
  let ic = 0;
  const remplir = (el) => {
    const debut = el.ts ? el.ts[1] : el.s;
    const fin = el.te ? el.te[0] : el.e;
    const brut = BRUTS.has(el.tag);
    const kids = el.enfants;
    const res = [];
    let cur = debut;
    const ajouterTexte = (a, b) => {
      if (b <= a) return;
      if (brut) { res.push({ t: 'txt', buf, s: a, e: b, brut: null, parent: el, rawtext: true }); return; }
      // découpe autour des commentaires situés dans [a, b)
      while (ic < comments.length && comments[ic].e <= a) ic++;
      let p = a;
      let j = ic;
      while (j < comments.length && comments[j].s < b) {
        const c = comments[j];
        if (c.s >= p && c.e <= b) {
          if (c.s > p) res.push({ t: 'txt', buf, s: p, e: c.s, brut: null, parent: el, rawtext: false });
          res.push({ t: 'com', buf, s: c.s, e: c.e, parent: el });
          p = c.e;
        }
        j++;
      }
      if (p < b) res.push({ t: 'txt', buf, s: p, e: b, brut: null, parent: el, rawtext: false });
    };
    for (const k of kids) {
      ajouterTexte(cur, Math.min(k.s, fin));
      res.push(k);
      remplir(k);
      cur = Math.max(cur, k.e);
    }
    ajouterTexte(cur, fin);
    el.enfants = res;
  };
  remplir(racine);

  // 4. Identifiants (ordre du fichier)
  let n = 0;
  const parId = new Map();
  const numeroter = (el) => {
    for (const k of el.enfants) {
      if (k.t !== 'el') continue;
      k.id = prefixe + String(n++);
      parId.set(k.id, k);
      numeroter(k);
    }
  };
  numeroter(racine);

  return { buf, racine, parId, conflits, fragment };
}

// --------------------------------------------------------------------------
// Lecture
// --------------------------------------------------------------------------

export const tranche = (n) => n.buf.slice(n.s, n.e);

/** Texte décodé d'un segment de texte (avec son remplacement éventuel). */
export function texteDecode(seg) {
  if (seg.t === 'gen') return seg.html;
  const brut = seg.brut != null ? seg.brut : seg.buf.slice(seg.s, seg.e);
  const norm = brut.replace(/\r\n?/g, '\n');
  if (seg.rawtext) return norm;
  // Une balise fermante orpheline (« </div> » de trop) est ignorée par les navigateurs
  return decodeHTML(norm.replace(/<\/[a-zA-Z][^>]*>/g, ''));
}

/** Valeur courante d'un attribut (ou null). */
export function attr(el, nom) {
  const a = el.attrs.find((x) => x.nom === nom);
  return a ? a.val : null;
}

export const classes = (el) => (attr(el, 'class') || '').split(/\s+/).filter(Boolean);

/** Tous les éléments d'un sous-arbre (ordre du document). */
export function* elements(el) {
  for (const k of el.enfants) {
    if (k.t !== 'el') continue;
    yield k;
    yield* elements(k);
  }
}

/** Texte visible d'un sous-arbre (sans scripts ni styles), espaces réduits. */
export function texteVisible(el) {
  let out = '';
  const go = (n) => {
    for (const k of n.enfants) {
      if (k.t === 'txt') { if (!k.rawtext) out += texteDecode(k); }
      else if (k.t === 'el') {
        if (k.tag === 'script' || k.tag === 'style' || k.tag === 'template' || k.tag === 'noscript') continue;
        if (k.tag === 'br') out += ' ';
        go(k);
      }
    }
  };
  go(el);
  return out.replace(/\s+/g, ' ').trim();
}

/**
 * Empreinte d'un élément PUBLIÉ (texte source exact, avant modification) :
 * une opération préparée sur une ancienne version de la page ne peut viser
 * que l'élément qui a exactement la même empreinte.
 */
export function signature(el) {
  if (!el || el.nouveau || !el.ts) return null;
  const s = el.buf.slice(el.s, el.e);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return el.tag + ':' + s.length.toString(36) + ':' + h.toString(36);
}

export function ancetres(el) {
  const out = [];
  for (let p = el.parent; p; p = p.parent) out.push(p);
  return out;
}

export function trouver(arbre, predicat) {
  for (const el of elements(arbre.racine)) if (predicat(el)) return el;
  return null;
}

export function contient(parent, el) {
  for (let p = el; p; p = p.parent) if (p === parent) return true;
  return false;
}

// --------------------------------------------------------------------------
// Écriture
// --------------------------------------------------------------------------

export const echapperTexte = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const echapperAttr = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Balise ouvrante (brute si intacte, régénérée sinon). */
function baliseOuvrante(el, annoter) {
  let html;
  if (!el.attrsModifies) {
    html = el.buf.slice(el.ts[0], el.ts[1]);
  } else {
    const brutOuv = el.buf.slice(el.ts[0], el.ts[1]);
    const nom = (/^<([^\s/>]+)/.exec(brutOuv) || [])[1] || el.tag;
    let out = '<' + nom;
    for (const a of el.attrs) {
      if (a.s >= 0 && !a.modifie) out += ' ' + el.buf.slice(a.s, a.e);
      else if (a.val === '' && a.booleen) out += ' ' + a.nom;
      else out += ' ' + a.nom + '="' + echapperAttr(a.val) + '"';
    }
    out += /\/>$/.test(brutOuv) ? ' />' : '>';
    html = out;
  }
  if (annoter) {
    const marque = ' data-gdx="' + el.id + '"';
    html = /\/>$/.test(html) ? html.slice(0, -2).replace(/\s*$/, '') + marque + ' />' : html.slice(0, -1) + marque + '>';
  }
  return html;
}

/**
 * Réécrit l'arbre en HTML.
 * @param {object} o
 * @param {boolean} [o.annoter]   ajoute data-gdx sur chaque élément (canevas de l'éditeur)
 * @param {Function} [o.filtre]   (el) → 'garder' | 'neutraliser' (élément remplacé par rien) — canevas seulement
 * @param {object} [o.injections] { finTete: html, debutCorps: html, finCorps: html } — canevas seulement
 */
export function serialiser(arbre, o = {}) {
  const { annoter = false, filtre = null, injections = null } = o;
  const morceaux = [];
  const go = (n) => {
    for (const k of n.enfants) {
      if (k.t === 'txt') morceaux.push(k.brut != null ? k.brut : k.buf.slice(k.s, k.e));
      else if (k.t === 'com') morceaux.push(k.buf.slice(k.s, k.e));
      else if (k.t === 'gen') morceaux.push(k.html);
      else if (k.t === 'el') {
        if (filtre && filtre(k) === 'neutraliser') continue;
        if (injections && k.tag === 'body' && (injections.debutCorps || injections.finCorps)) {
          morceaux.push(baliseOuvrante(k, annoter));
          if (injections.debutCorps) morceaux.push(injections.debutCorps);
          go(k);
          if (injections.finCorps) morceaux.push(injections.finCorps);
          if (k.te) morceaux.push(k.buf.slice(k.te[0], k.te[1]));
          continue;
        }
        morceaux.push(baliseOuvrante(k, annoter));
        if (injections && k.tag === 'head' && injections.debutTete) morceaux.push(injections.debutTete);
        go(k);
        if (injections && k.tag === 'head' && injections.finTete) morceaux.push(injections.finTete);
        if (k.te) morceaux.push(k.buf.slice(k.te[0], k.te[1]));
      }
    }
  };
  go(arbre.racine);
  return morceaux.join('');
}

// --------------------------------------------------------------------------
// Modifications de bas niveau (utilisées par operations.mjs)
// --------------------------------------------------------------------------

export function definirAttr(el, nom, val) {
  const a = el.attrs.find((x) => x.nom === nom);
  if (a) {
    if (a.val === val) return;
    a.val = val; a.modifie = true; a.booleen = false;
  } else {
    el.attrs.push({ nom, val, s: -1, e: -1, modifie: true });
  }
  el.attrsModifies = true;
}

export function retirerAttr(el, nom) {
  const i = el.attrs.findIndex((x) => x.nom === nom);
  if (i < 0) return;
  el.attrs.splice(i, 1);
  el.attrsModifies = true;
}

export function ajouterClasse(el, c) {
  const cl = classes(el);
  if (cl.includes(c)) return;
  cl.push(c);
  definirAttr(el, 'class', cl.join(' '));
}

/** Remplace le texte d'un segment (texte décodé → HTML échappé). */
export function remplacerTexte(seg, valeur) {
  seg.brut = echapperTexteFr(valeur);
}

/** Échappement qui garde les espaces insécables français sous forme lisible. */
export function echapperTexteFr(s) {
  return echapperTexte(s).replace(/ /g, '&nbsp;');
}

/** Détache un nœud de son parent. */
export function detacher(n) {
  const p = n.parent;
  if (!p) return;
  const i = p.enfants.indexOf(n);
  if (i >= 0) p.enfants.splice(i, 1);
  n.parent = null;
}

/** Insère un ou plusieurs nœuds par rapport à une référence. */
export function inserer(noeuds, ref, position) {
  let parent;
  let index;
  if (position === 'debut' || position === 'fin') {
    if (VIDES.has(ref.tag) || BRUTS.has(ref.tag)) throw new ErreurEditeur('On ne peut rien placer à l’intérieur de cet élément.', 'POSITION');
    if (!ref.te && ref.ts && ref.e <= ref.ts[1]) throw new ErreurEditeur('Cet élément ne peut pas contenir d’autres éléments.', 'POSITION');
    parent = ref;
    index = position === 'debut' ? 0 : ref.enfants.length;
  } else {
    parent = ref.parent;
    if (!parent) throw new ErreurEditeur('Position impossible.', 'POSITION');
    index = parent.enfants.indexOf(ref) + (position === 'apres' ? 1 : 0);
  }
  for (const n of noeuds) n.parent = parent;
  parent.enfants.splice(index, 0, ...noeuds);
}

/** Copie profonde d'un sous-arbre (nouveaux identifiants « prefixe + n »). */
export function cloner(el, prefixe, parId) {
  let n = 0;
  const go = (src, parent) => {
    if (src.t !== 'el') return { ...src, parent };
    const c = {
      ...src,
      id: prefixe + String(n++),
      attrs: src.attrs.map((a) => ({ ...a })),
      parent, nouveau: true, enfants: [],
    };
    if (parId) parId.set(c.id, c);
    c.enfants = src.enfants.map((k) => go(k, c));
    return c;
  };
  return go(el, null);
}

/** Greffe les nœuds d'un fragment analysé (ajout) : renvoie ses nœuds de premier niveau. */
export function noeudsDuFragment(fragArbre, parId) {
  for (const [id, el] of fragArbre.parId) parId.set(id, el);
  return fragArbre.racine.enfants.slice();
}
