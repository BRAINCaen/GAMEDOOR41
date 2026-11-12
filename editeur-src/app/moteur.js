// ==========================================================================
// Moteur côté navigateur : une page en cours de modification
//   source publiée + étapes (chaque étape = une ou plusieurs opérations)
//   → rejouées par le MÊME noyau que le serveur → aperçu fidèle.
// ==========================================================================

import { appliquerOperations, rebaser, INLINE } from '../noyau/operations.mjs';
import { construireArbre, elements, attr, classes, texteDecode, texteVisible, signature, ErreurEditeur } from '../noyau/arbre.mjs';
import { relire } from '../noyau/relecture.mjs';
import { creerPage } from '../noyau/pages.mjs';

export const nouvelUid = () => {
  const c = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  const a = crypto.getRandomValues(new Uint8Array(8));
  for (const x of a) s += c[x % c.length];
  return s;
};

export class DocumentEdition {
  /**
   * @param {object} o
   * @param {string} o.chemin   « tarifs/index.html »
   * @param {string} o.source   HTML publié (ou HTML de la nouvelle page)
   * @param {string} o.sha      empreinte git du fichier publié (null pour une nouvelle page)
   * @param {string} o.commit   version du site
   * @param {object} [o.nouvelle] { slug, titre, description, h1, intro, mode, modele } pour une nouvelle page
   */
  constructor({ chemin, source, sha, commit, etapes = [], position = null, medias = [], nouvelle = null }) {
    this.chemin = chemin;
    this.source = source;
    this.sha = sha;
    this.commit = commit;
    this.etapes = etapes;
    this.position = position == null ? etapes.length : position;
    this.medias = medias;
    this.nouvelle = nouvelle;
    this.arbreBase = construireArbre(source);
    this.cache = null;
    this.ctx = {};
  }

  ops() {
    return this.etapes.slice(0, this.position).flatMap((e) => e.ops);
  }

  get modifie() { return this.position > 0 || !!this.nouvelle; }

  /** État courant (page rejouée). */
  calculer() {
    if (this.cache && this.cache.position === this.position && this.cache.longueur === this.etapes.length) return this.cache;
    let res;
    try {
      res = appliquerOperations(this.source, this.ops(), this.ctx);
      this.cache = { position: this.position, longueur: this.etapes.length, page: res.page, html: res.html, erreur: null };
    } catch (e) {
      // ne devrait pas arriver (chaque étape est testée avant d'être gardée)
      const p = appliquerOperations(this.source, [], this.ctx);
      this.cache = { position: this.position, longueur: this.etapes.length, page: p.page, html: p.html, erreur: e };
    }
    return this.cache;
  }

  get page() { return this.calculer().page; }

  /** Ajoute la signature des éléments publiés visés (protection contre une page changée). */
  signer(op) {
    const c = { ...op };
    for (const [champId, champSig] of [['id', 'sig'], ['ref', 'refSig']]) {
      const id = c[champId];
      if (id == null || c.op === 'meta' || String(id).includes('.')) continue;
      const el = this.arbreBase.parId.get(String(id));
      if (el && c[champSig] == null) c[champSig] = signature(el);
    }
    if (['html', 'inserer', 'dupliquer'].includes(c.op) && !c.uid) c.uid = nouvelUid();
    return c;
  }

  /** Essaie une nouvelle étape ; ne la garde que si le noyau l'accepte. */
  essayer(ops, libelle) {
    const signees = ops.map((o) => this.signer(o));
    const toutes = [...this.ops(), ...signees];
    const res = appliquerOperations(this.source, toutes, this.ctx); // lève ErreurEditeur si refus
    this.etapes = this.etapes.slice(0, this.position);
    this.etapes.push({ ops: signees, libelle: libelle || null, date: new Date().toISOString() });
    this.position = this.etapes.length;
    this.cache = { position: this.position, longueur: this.etapes.length, page: res.page, html: res.html, erreur: null };
    return res;
  }

  /** Test sans rien garder (pour griser un bouton, valider un dépôt…) */
  tester(ops) {
    try { appliquerOperations(this.source, [...this.ops(), ...ops.map((o) => this.signer(o))], this.ctx); return null; } catch (e) { return e; }
  }

  peutAnnuler() { return this.position > 0; }
  peutRetablir() { return this.position < this.etapes.length; }
  annuler() { if (this.peutAnnuler()) { this.position--; this.cache = null; } }
  retablir() { if (this.peutRetablir()) { this.position++; this.cache = null; } }
  allerA(position) { this.position = Math.max(0, Math.min(this.etapes.length, position)); this.cache = null; }

  relecture(ctx) { return relire(this.page, ctx); }

  /** Remet le brouillon sur une version plus récente de la page publiée. */
  rebaser(nouvelleSource, sha, commit) {
    const { perdues, alignes } = rebaser(this.ops(), nouvelleSource);
    this.source = nouvelleSource;
    this.sha = sha;
    this.commit = commit;
    this.arbreBase = construireArbre(nouvelleSource);
    let i = 0;
    const etapes = [];
    for (const e of this.etapes.slice(0, this.position)) {
      const morceau = [];
      for (let k = 0; k < e.ops.length; k++) { const o = alignes[i++]; if (o) morceau.push(o); }
      if (morceau.length) etapes.push({ ...e, ops: morceau });
    }
    this.etapes = etapes;
    this.position = etapes.length;
    this.cache = null;
    try { this.calculer(); } catch (_) { /* affiché ailleurs */ }
    return perdues;
  }

  versBrouillon() {
    return { chemin: this.chemin, base: this.commit, sha: this.sha, etapes: this.etapes.slice(0, this.position), medias: this.medias, nouvelle: this.nouvelle };
  }
}

/** Fabrique le document d'une nouvelle page à partir d'un modèle. */
export function documentNouvellePage(modeleSource, options, commit) {
  const { html, fichier } = creerPage(modeleSource, options);
  return new DocumentEdition({ chemin: fichier, source: html, sha: null, commit, nouvelle: options });
}

// --------------------------------------------------------------------------
// Infos sur les éléments
// --------------------------------------------------------------------------

const NOMS = {
  section: 'Section', header: 'En-tête', footer: 'Pied de page', nav: 'Menu', main: 'Contenu principal', article: 'Article', aside: 'Encart',
  div: 'Bloc', span: 'Texte', p: 'Paragraphe', h1: 'Titre principal', h2: 'Titre', h3: 'Sous-titre', h4: 'Petit titre', h5: 'Petit titre', h6: 'Petit titre',
  a: 'Lien', button: 'Bouton', img: 'Image', picture: 'Image', video: 'Vidéo', iframe: 'Vidéo / carte', ul: 'Liste', ol: 'Liste numérotée', li: 'Ligne de liste',
  strong: 'Gras', em: 'Italique', b: 'Gras', i: 'Italique', small: 'Petit texte', figure: 'Figure', figcaption: 'Légende', blockquote: 'Citation',
  table: 'Tableau', tr: 'Ligne du tableau', td: 'Case', th: 'En-tête de colonne', details: 'Question (FAQ)', summary: 'Question', svg: 'Icône', br: 'Retour à la ligne',
  form: 'Formulaire', label: 'Étiquette', input: 'Champ', time: 'Date', address: 'Adresse', dl: 'Liste', dt: 'Terme', dd: 'Définition', hr: 'Séparateur', body: 'Page',
};

export function nomElement(el) {
  if (!el) return '';
  const cl = classes(el);
  if (el.tag === 'a' && cl.some((c) => /^btn/.test(c))) return 'Bouton';
  if (attr(el, 'data-gdb')) return 'Bloc « ' + attr(el, 'data-gdb').replace(/-/g, ' ') + ' »';
  if (cl.includes('site-header')) return 'En-tête du site';
  if (cl.includes('site-footer')) return 'Pied de page du site';
  return NOMS[el.tag] || el.tag;
}

/** Description d'un élément pour l'inspecteur. */
export function infos(page, id) {
  const el = page.arbre.parId.get(String(id));
  if (!el || !page.attache(el)) return null;
  const chaine = [];
  for (let p = el.parent; p && p.tag !== '#racine'; p = p.parent) if (p.tag !== 'html') chaine.unshift(p);
  const segments = el.enfants
    .map((k, i) => ({ k, i }))
    .filter(({ k }) => k.t === 'txt' && !k.rawtext)
    .map(({ k }, n) => ({ n, valeur: texteDecode(k), vide: !texteDecode(k).trim() }));
  let editable = true;
  let raison = null;
  try { page.exigerEditable(el, { corpsPermis: el.tag === 'body' }); } catch (e) { editable = false; raison = e.message; }
  let blocRacine = null;
  for (let p = el; p && p.tag !== '#racine'; p = p.parent) if (attr(p, 'data-gdb')) { blocRacine = p; break; }
  return {
    el, id: el.id, tag: el.tag, nom: nomElement(el), nouveau: !!el.nouveau, classes: classes(el),
    attrs: Object.fromEntries(el.attrs.map((a) => [a.nom, a.val])), segments,
    chaine, editable, raison, texteRiche: page.estTexteMisEnForme(el) && !['body', 'html'].includes(el.tag) && el.enfants.some((k) => k.t === 'txt' && texteDecode(k).trim()),
    blocRacine, cleStyle: (classes(el).find((c) => /^gds-/.test(c)) || '').slice(4) || null,
    texte: texteVisible(el),
  };
}

/** Données de style de la page (data-gd du bloc <style id="gd-editeur">). */
export function donneeStyles(page) {
  const bloc = page.blocStyles(false);
  if (!bloc) return {};
  try { return JSON.parse(attr(bloc, 'data-gd') || '{}'); } catch (_) { return {}; }
}

/** Combien d'éléments portent cette clé de style ? */
export function usagesCle(page, cle) {
  let n = 0;
  for (const el of elements(page.arbre.racine)) if (classes(el).includes('gds-' + cle)) n++;
  return n;
}

// --------------------------------------------------------------------------
// Texte modifié directement dans le canevas → opérations
// --------------------------------------------------------------------------

const EXCLUS_DOM = (n) => n.nodeType === 1 && (n.tagName === 'GDX-CALQUE' || n.hasAttribute('data-gdx-ignorer'));

function enfantsDom(noeud) {
  const out = [];
  const pousser = (n) => {
    if (n.nodeType === 3) {
      if (out.length && out[out.length - 1].nodeType === 3) out[out.length - 1] = { nodeType: 3, data: out[out.length - 1].data + n.data, fusion: true };
      else out.push(n);
    } else if (n.nodeType === 8) out.push(n);
    else if (n.nodeType === 1 && !EXCLUS_DOM(n)) {
      if (n.hasAttribute('data-gdx')) out.push(n);
      else if (n.tagName === 'TBODY') for (const k of n.childNodes) pousser(k); // élément implicite ajouté par le navigateur
      else out.push({ nodeType: 1, ajoutNavigateur: true, getAttribute: () => null }); // gras, lien, retour à la ligne… ajoutés pendant l'édition
    }
  };
  for (const k of noeud.childNodes) pousser(k);
  return out;
}

function enfantsCore(el) {
  const out = [];
  for (const k of el.enfants) {
    if (k.t === 'txt' || k.t === 'gen') {
      const v = k.t === 'gen' ? k.html : texteDecode(k);
      if (out.length && out[out.length - 1].kind === 'txt') { out[out.length - 1].v += v; out[out.length - 1].multi = true; } else out.push({ kind: 'txt', v, seg: k });
    } else if (k.t === 'com') out.push({ kind: 'com' });
    else out.push({ kind: 'el', el: k });
  }
  return out;
}

const normal = (s) => String(s).replace(/\s+/g, ' ').trim();

/** Espaces insécables du navigateur → espaces, sauf typographie française. */
export function nettoyerTexte(s) {
  return String(s)
    .replace(/ (?=[?!:;»%€])/g, '\u0001')
    .replace(/(«) /g, '$1\u0001')
    .replace(/ /g, ' ')
    .replace(/\u0001/g, ' ')
    .replace(/​/g, '');
}

/**
 * Compare l'élément édité dans le canevas à l'arbre : renvoie la liste des
 * opérations « texte » si seule la frappe a changé, ou null si la structure
 * a changé (gras ajouté, retour à la ligne, icône effacée…).
 */
export function opsTexteDepuisDom(page, id, dom) {
  const el = page.arbre.parId.get(String(id));
  if (!el) return null;
  const ops = [];
  const comparer = (coreEl, domEl) => {
    const c = enfantsCore(coreEl);
    const d = enfantsDom(domEl);
    // un texte entièrement blanc peut manquer côté DOM après édition : on tolère
    let i = 0;
    let j = 0;
    const segsTxt = coreEl.enfants.filter((k) => k.t === 'txt');
    while (i < c.length || j < d.length) {
      const a = c[i];
      const b = d[j];
      if (a && a.kind === 'txt' && (!b || b.nodeType !== 3)) {
        if (normal(a.v)) return false;
        i++; continue;
      }
      if (!a || !b) return false;
      if (a.kind === 'txt') {
        if (b.nodeType !== 3) return false;
        if (normal(a.v) !== normal(nettoyerTexte(b.data))) {
          if (a.multi || a.seg.t !== 'txt' || a.seg.rawtext) return false;
          const n = segsTxt.indexOf(a.seg);
          ops.push({ op: 'texte', id: coreEl.id, n, ancien: a.v, valeur: nettoyerTexte(b.data) });
        }
      } else if (a.kind === 'com') {
        if (b.nodeType !== 8) return false;
      } else {
        if (b.nodeType !== 1 || b.getAttribute('data-gdx') !== String(a.el.id)) return false;
        if (!comparer(a.el, b)) return false;
      }
      i++; j++;
    }
    return true;
  };
  return comparer(el, dom) ? ops : null;
}

/** HTML propre d'un élément de texte édité en mode riche (pour l'opération « html »). */
export function htmlRicheDepuisDom(dom) {
  const clone = dom.cloneNode(true);
  const remplacer = (sel, tag) => {
    for (const n of [...clone.querySelectorAll(sel)]) {
      const r = n.ownerDocument.createElement(tag);
      for (const a of [...n.attributes]) if (a.name === 'href' || a.name === 'target' || a.name === 'rel') r.setAttribute(a.name, a.value);
      while (n.firstChild) r.appendChild(n.firstChild);
      n.replaceWith(r);
    }
  };
  remplacer('b', 'strong');
  remplacer('i', 'em');
  for (const n of [...clone.querySelectorAll('div,p')]) { // « Entrée » dans un texte = retour à la ligne
    const br = n.ownerDocument.createElement('br');
    n.before(br);
    while (n.firstChild) n.before(n.firstChild);
    n.remove();
  }
  for (const n of [...clone.querySelectorAll('font')]) {
    const s = n.ownerDocument.createElement('span');
    if (n.getAttribute('color')) s.setAttribute('style', 'color: ' + n.getAttribute('color'));
    while (n.firstChild) s.appendChild(n.firstChild);
    n.replaceWith(s);
  }
  for (const n of [clone, ...clone.querySelectorAll('*')]) {
    for (const a of [...n.attributes]) {
      if (a.name === 'data-gdx' || a.name === 'contenteditable' || a.name.startsWith('data-gdx-') || a.name === 'spellcheck') n.removeAttribute(a.name);
      if (a.name === 'style' && !a.value.trim()) n.removeAttribute('style');
    }
  }
  for (const n of [...clone.querySelectorAll('span')]) if (!n.attributes.length) { while (n.firstChild) n.before(n.firstChild); n.remove(); }
  let html = clone.innerHTML.replace(/<br>\s*$/, '');
  html = html.replace(/ /g, '&nbsp;');
  return html;
}

export const estInline = (tag) => INLINE.has(tag);

// --------------------------------------------------------------------------
// Plan de la page pour l'assistant
// --------------------------------------------------------------------------

export function planPage(page, { idSelection = null } = {}) {
  const corps = page.corps();
  if (!corps) return '';
  const lignes = [];
  const go = (el, prof) => {
    if (['script', 'style', 'noscript', 'svg', 'template', 'source'].includes(el.tag)) return;
    if (lignes.length > 1800) return;
    const cl = classes(el).filter((c) => !/^gds-/.test(c)).slice(0, 4);
    const segs = el.enfants.filter((k) => k.t === 'txt');
    const textes = segs.map((s, n) => ({ n, v: normal(texteDecode(s)) })).filter((x) => x.v);
    const a = [];
    if (el.tag === 'a' && attr(el, 'href')) a.push('href=' + attr(el, 'href'));
    if (el.tag === 'img') a.push('alt="' + (attr(el, 'alt') || '') + '" src=' + attr(el, 'src'));
    if (attr(el, 'id')) a.push('#' + attr(el, 'id'));
    if (attr(el, 'data-gdb')) a.push('bloc=' + attr(el, 'data-gdb'));
    const t = textes.map((x) => x.n + ':«' + x.v.slice(0, 160) + '»').join(' ');
    lignes.push('  '.repeat(prof) + '[' + el.id + '] ' + el.tag + (cl.length ? '.' + cl.join('.') : '') + (a.length ? ' ' + a.join(' ') : '') + (t ? ' ' + t : '') + (String(el.id) === String(idSelection) ? '   ← SÉLECTIONNÉ' : ''));
    for (const k of el.enfants) if (k.t === 'el') go(k, prof + 1);
  };
  go(corps, 0);
  return lignes.join('\n');
}

export function estErreurEditeur(e) { return e instanceof ErreurEditeur || (e && e.name === 'ErreurEditeur'); }
