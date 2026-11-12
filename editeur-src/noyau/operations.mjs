// ==========================================================================
// Éditeur du site — OPÉRATIONS
//
// Une modification de page = la version publiée (source) + une liste
// d'opérations. Le navigateur rejoue la liste pour l'aperçu ; le serveur la
// rejoue À NOUVEAU sur le fichier du dépôt avant de publier (il ne croit
// jamais le navigateur sur parole). Les mêmes contrôles tournent des deux côtés.
//
// RÈGLE D'OR : aucun contenu déjà publié ne peut être retiré. Il n'existe
// aucune opération de suppression d'un élément publié ; « supprimer » ne vaut
// que pour ce qui a été ajouté dans la modification en cours (pas encore en
// ligne). Un texte publié peut être réécrit, jamais vidé ni amputé ; un lien
// peut changer d'adresse, jamais disparaître ; une image peut être remplacée,
// jamais retirée ; aucun style ne peut masquer un élément publié.
// En dernier filet, verifierConservation() compare l'avant et l'après.
//
// Opérations (champ « op ») :
//   texte      { id, n, ancien, valeur }            texte du n-ième segment de texte de l'élément
//   html       { id, html, uid }                    texte mis en forme (gras, lien…) d'un élément de texte
//   attr       { id, nom, valeur }                  lien, texte alternatif, infobulle… (valeur null = retirer, nouveaux seulement)
//   classe     { id, ajouter:[], retirer:[] }
//   style      { id, cle, styles, base? }           styles par appareil (tous / tablette / telephone / survol)
//   inserer    { id, position, html, uid }          position : avant | apres | debut | fin
//   deplacer   { id, ref, position }
//   dupliquer  { id, uid }
//   supprimer  { id }                               UNIQUEMENT un élément ajouté dans cette modification
//   image      { id, src, srcset?, sizes?, largeur?, hauteur?, alt? }
//   meta       { titre?, description?, image? }
// Module PUR.
// ==========================================================================

import {
  ErreurEditeur, construireArbre, serialiser, elements, texteDecode, texteVisible, attr, classes,
  definirAttr, retirerAttr, ajouterClasse, remplacerTexte, detacher, inserer, cloner,
  contient, VIDES, BRUTS, echapperTexteFr, signature,
} from './arbre.mjs';
import { assainirHtml, estLienSur, estMediaDuSite, estSrcsetSur, estIframeAutorisee } from './assainir.mjs';
import { lireDonneeStyles, fusionnerStyles, verifierStyles, genererCss, estCleStyle, refusDeclaration } from './css.mjs';

export const INLINE = new Set(['a', 'strong', 'b', 'em', 'i', 'u', 's', 'small', 'mark', 'sup', 'sub', 'br', 'span', 'abbr', 'code', 'time', 'q', 'del', 'ins', 'kbd', 'wbr', 'cite']);
const PHRASING = new Set([...INLINE, 'img', 'picture', 'source', 'video', 'audio', 'iframe', 'svg', 'button', 'label', 'meter', 'progress',
  'g', 'path', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'rect', 'text', 'tspan', 'defs', 'lineargradient', 'radialgradient', 'stop', 'use', 'title', 'desc', 'symbol']);
const PARENTS_PHRASING = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'a', 'strong', 'em', 'b', 'i', 'u', 's', 'small', 'label', 'button', 'dt', 'q', 'cite', 'abbr', 'mark', 'sup', 'sub', 'time', 'legend', 'caption', 'summary', 'code']);
const JAMAIS_CIBLE = new Set(['html', 'head', 'script', 'style', 'noscript', 'template', 'meta', 'link', 'title', 'base', 'source', 'param', 'track']);
const ANCETRES_INTERDITS = new Set(['head', 'script', 'style', 'noscript', 'template', 'iframe']);
const UID_RE = /^[a-z0-9]{4,12}$/;
const norm = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();

// Attributs modifiables sur un élément déjà publié
const ATTRS_EXISTANTS = {
  '*': ['title', 'aria-label', 'data-track'],
  a: ['href', 'target', 'rel'],
  img: ['alt', 'width', 'height', 'loading'],
  iframe: ['src', 'title', 'allow', 'allowfullscreen'],
  video: ['poster', 'controls', 'autoplay', 'muted', 'loop', 'playsinline'],
  button: [], time: ['datetime'], td: ['colspan', 'rowspan'], th: ['colspan', 'rowspan'], details: ['open'],
};
const RETIRABLES_EXISTANTS = new Set(['target', 'rel', 'loading', 'title', 'data-track', 'open', 'autoplay', 'loop']);
const CLASSES_PERMISES_EXISTANT = /^(gds-[a-z0-9]{4,16}|fade-in|text-(orange|cyan|red|grey))$/;

/** Versions des fichiers communs des blocs (empreintes ?v=), injectées par la construction. */
export const RESSOURCES_BLOCS = {
  css: '/css/editeur-blocs.css',
  js: '/js/editeur-blocs.js',
};

export class Page {
  /**
   * @param {string} source  HTML publié
   * @param {object} [ctx]
   * @param {{css: string, js: string}} [ctx.versions]   empreintes des fichiers des blocs
   * @param {Set<string>} [ctx.medias]                   chemins d'images connus (contrôle d'existence) ; absent = pas de contrôle
   */
  constructor(source, ctx = {}) {
    this.source = source;
    this.ctx = ctx;
    // une page jamais publiée : tout son contenu compte comme « ajouté »
    this.arbre = construireArbre(source, { nouveau: !!ctx.nouvellePage });
    if (this.arbre.conflits.length) this.conflits = this.arbre.conflits;
    this.absorbes = new Set();
    this.uids = new Set();
    this.avertissements = [];
    this.ops = [];
  }

  // ---------------------------------------------------------------- outils
  el(id, quoi = 'élément') {
    const el = this.arbre.parId.get(String(id));
    if (!el || !this.attache(el)) throw new ErreurEditeur('Cet ' + quoi + ' n’existe plus dans la page (elle a peut-être changé entre-temps). Rechargez la page.', 'INTROUVABLE', { id });
    return el;
  }

  attache(el) {
    let n = el;
    while (n.parent) n = n.parent;
    return n === this.arbre.racine;
  }

  corps() {
    for (const el of elements(this.arbre.racine)) if (el.tag === 'body') return el;
    return null;
  }

  tete() {
    for (const el of elements(this.arbre.racine)) if (el.tag === 'head') return el;
    return null;
  }

  /** L'élément peut-il être modifié (dans le corps de page, hors scripts, hors intérieur d'un SVG) ? */
  exigerEditable(el, { corpsPermis = false } = {}) {
    if (JAMAIS_CIBLE.has(el.tag)) throw new ErreurEditeur('Cet élément technique ne se modifie pas depuis l’éditeur.', 'TECHNIQUE');
    if (el.tag === 'body' && !corpsPermis) throw new ErreurEditeur('Choisissez un élément de la page.', 'TECHNIQUE');
    let dansCorps = el.tag === 'body';
    for (let p = el.parent; p; p = p.parent) {
      if (p.tag === 'body') dansCorps = true;
      if (ANCETRES_INTERDITS.has(p.tag)) throw new ErreurEditeur('Cet élément technique ne se modifie pas depuis l’éditeur.', 'TECHNIQUE');
      if (p.tag === 'svg') throw new ErreurEditeur('Une icône se modifie en entier : choisissez l’icône elle-même.', 'TECHNIQUE');
    }
    if (!dansCorps) throw new ErreurEditeur('Seul le contenu visible de la page se modifie ici.', 'TECHNIQUE');
    if (el.conflit) throw new ErreurEditeur('Cet élément est mal construit dans la page : demandez à Claude de le corriger.', 'TECHNIQUE');
  }

  exigerUid(uid) {
    if (!UID_RE.test(String(uid || ''))) throw new ErreurEditeur('Identifiant d’opération invalide.', 'UID');
    if (this.uids.has(uid)) throw new ErreurEditeur('Opération en double.', 'UID');
    this.uids.add(uid);
  }

  /** Le contenu `noeuds` peut-il être placé dans `parent` ? (règles du HTML) */
  verifierPlacement(parent, noeuds) {
    const tops = noeuds.filter((n) => n.t === 'el');
    const tous = [];
    for (const n of tops) { tous.push(n); for (const d of elements(n)) tous.push(d); }
    const tag = parent.tag;
    const dire = (m) => { throw new ErreurEditeur(m, 'PLACEMENT'); };
    if (tag === 'head' || JAMAIS_CIBLE.has(tag) || VIDES.has(tag) || BRUTS.has(tag) || tag === 'svg' || tag === 'picture') dire('On ne peut pas placer de contenu à cet endroit.');
    for (let p = parent; p; p = p.parent) if (p.tag === 'svg') dire('On ne peut pas placer de contenu dans une icône.');
    if (PARENTS_PHRASING.has(tag) && tous.some((n) => !PHRASING.has(n.tag))) dire('Ce bloc ne peut pas aller à l’intérieur d’un texte : placez-le avant ou après.');
    if ((tag === 'ul' || tag === 'ol') && tops.some((n) => n.tag !== 'li')) dire('Dans une liste, on ne peut ajouter que des lignes de liste.');
    if (tag === 'dl' && tops.some((n) => !['dt', 'dd', 'div'].includes(n.tag))) dire('Placement impossible dans cette liste.');
    if (tag === 'table' && tops.some((n) => !['tr', 'thead', 'tbody', 'tfoot', 'caption', 'colgroup'].includes(n.tag))) dire('Dans un tableau, on ne peut ajouter que des lignes.');
    if (['thead', 'tbody', 'tfoot'].includes(tag) && tops.some((n) => n.tag !== 'tr')) dire('Dans un tableau, on ne peut ajouter que des lignes.');
    if (tag === 'tr' && tops.some((n) => n.tag !== 'td' && n.tag !== 'th')) dire('Dans une ligne de tableau, on ne peut ajouter que des cases.');
    if (tops.some((n) => n.tag === 'li') && tag !== 'ul' && tag !== 'ol') dire('Une ligne de liste doit aller dans une liste.');
    if (tops.some((n) => n.tag === 'tr') && !['table', 'thead', 'tbody', 'tfoot'].includes(tag)) dire('Une ligne de tableau doit aller dans un tableau.');
    if (tops.some((n) => n.tag === 'td' || n.tag === 'th') && tag !== 'tr') dire('Une case de tableau doit aller dans une ligne de tableau.');
    let dansLien = false;
    let dansBouton = false;
    for (let p = parent; p; p = p.parent) { if (p.tag === 'a') dansLien = true; if (p.tag === 'button') dansBouton = true; }
    if (dansLien && tous.some((n) => n.tag === 'a' || n.tag === 'button')) dire('Un lien ne peut pas contenir un autre lien ou un bouton.');
    if (dansBouton && tous.some((n) => ['a', 'button', 'iframe', 'details', 'video'].includes(n.tag))) dire('Un bouton ne peut pas contenir cet élément.');
    if (tous.some((n) => n.tag === 'h1') && this.compterTag('h1') >= 1) this.avertissements.push({ niveau: 'attention', message: 'La page a déjà un titre principal (H1) : Google préfère un seul H1 par page. Utilisez plutôt un titre de section (H2).' });
  }

  compterTag(tag) {
    let n = 0;
    for (const el of elements(this.arbre.racine)) if (el.tag === tag) n++;
    return n;
  }

  /** Analyse un morceau de HTML ajouté (filtré) en nœuds neufs. */
  fragment(html, uid) {
    const { html: propre, retires } = assainirHtml(html);
    for (const r of retires) this.avertissements.push({ niveau: 'info', message: 'Retiré pour la sécurité : ' + r.quoi + ' ' + r.detail });
    if (!propre.trim()) throw new ErreurEditeur('Rien à ajouter (le contenu est vide après filtrage).', 'VIDE');
    const frag = construireArbre(propre, { fragment: true, prefixe: uid + '.', nouveau: true });
    const idsPage = new Set();
    for (const e of elements(this.arbre.racine)) { const v = attr(e, 'id'); if (v) idsPage.add(v); }
    for (const [id, el] of frag.parId) {
      const v = attr(el, 'id');
      if (v && idsPage.has(v)) { retirerAttr(el, 'id'); this.avertissements.push({ niveau: 'info', message: 'Ancre « ' + v + ' » déjà utilisée dans la page : retirée de l\u2019ajout.' }); }
      else if (v) idsPage.add(v);
      this.arbre.parId.set(id, el);
    }
    return frag.racine.enfants.slice();
  }

  /** L'élément (ou un de ses descendants) est-il un contenu publié ? */
  contientOriginal(el) {
    if (!el.nouveau) return true;
    for (const d of elements(el)) if (!d.nouveau) return true;
    return false;
  }

  /** Un élément AJOUTÉ porte-t-il de quoi masquer ce qu'il contient ? */
  ajoutMasquant(el) {
    if (attr(el, 'hidden') != null || attr(el, 'aria-hidden') === 'true') return true;
    if (attr(el, 'data-gdb-du') != null || attr(el, 'data-gdb-au') != null) return true;
    if (classes(el).some((c) => /^gdb-masque/.test(c))) return true;
    if (/display\s*:\s*none|visibility\s*:|opacity\s*:\s*0(\.[0-3])?\s*(;|$)|content-visibility/i.test(attr(el, 'style') || '')) return true;
    const cle = (classes(el).find((c) => /^gds-/.test(c)) || '').slice(4);
    if (cle) {
      const bloc = this.blocStyles(false);
      const d = bloc ? lireDonneeStyles(attr(bloc, 'data-gd'))[cle] : null;
      if (d) for (const decl of Object.values(d)) for (const [p, v] of Object.entries(decl || {})) if (refusDeclaration(p, String(v), true)) return true;
    }
    return false;
  }

  /** Un conteneur PUBLIÉ manifestement caché (attribut hidden, classes « sr-only », « mobile-only »…) */
  conteneurPublieMasque(el) {
    if (attr(el, 'hidden') != null || attr(el, 'aria-hidden') === 'true') return true;
    if (/display\s*:\s*none|visibility\s*:\s*hidden/i.test(attr(el, 'style') || '')) return true;
    return classes(el).some((c) => /(^|[-_])(hidden|sr-only|visually-hidden|d-none|invisible)($|[-_])/.test(c) || c === 'mobile-only' || c === 'desktop-only');
  }

  segmentsTexte(el) {
    return el.enfants.filter((k) => k.t === 'txt');
  }

  /** Un élément publié visé doit avoir l'empreinte attendue (sinon la page a changé). */
  verifierSignatures(op) {
    for (const [champId, champSig] of [['id', 'sig'], ['ref', 'refSig']]) {
      const id = op[champId];
      if (id == null || op.op === 'meta' || String(id).includes('.')) continue;
      const el = this.arbre.parId.get(String(id));
      if (!el || el.nouveau) continue;
      const attendu = op[champSig];
      if (attendu == null) {
        if (this.ctx.exigerSignatures) throw new ErreurEditeur('Opération sans empreinte : rechargez l’éditeur.', 'PERIME');
        continue;
      }
      if (signature(el) !== attendu) throw new ErreurEditeur('Cet élément a changé depuis l’ouverture de la page (quelqu’un a publié entre-temps). Rechargez la page.', 'PERIME', { id });
    }
  }

  // ---------------------------------------------------------------- opérations
  appliquer(op) {
    if (!op || typeof op !== 'object') throw new ErreurEditeur('Opération illisible.', 'OP');
    const f = this['op_' + op.op];
    if (typeof f !== 'function') throw new ErreurEditeur('Opération inconnue : ' + op.op, 'OP');
    this.verifierSignatures(op);
    f.call(this, op);
    this.ops.push(op);
  }

  op_texte(op) {
    const el = this.el(op.id);
    this.exigerEditable(el);
    const segs = this.segmentsTexte(el);
    const seg = segs[op.n];
    if (!seg || seg.rawtext) throw new ErreurEditeur('Ce texte est introuvable (la page a peut-être changé).', 'INTROUVABLE');
    const avant = texteDecode(seg);
    if (op.ancien != null && norm(avant) !== norm(op.ancien)) throw new ErreurEditeur('Ce texte a changé depuis l’ouverture de la page. Rechargez-la.', 'PERIME', { avant, ancien: op.ancien });
    const valeur = String(op.valeur == null ? '' : op.valeur);
    if (!el.nouveau) this.gardeTexte(norm(avant), norm(valeur));
    const brutAvant = seg.brut != null ? seg.brut : seg.buf.slice(seg.s, seg.e);
    const lead = /^\s*/.exec(brutAvant)[0];
    const reste = brutAvant.slice(lead.length);
    const trail = /\s*$/.exec(reste)[0];
    const coeur = valeur.replace(/^\s+|\s+$/g, '');
    seg.brut = lead + echapperTexteFr(coeur) + (reste ? trail : '');
  }

  /** Un texte publié ne peut être ni vidé ni amputé de plus des deux tiers. */
  gardeTexte(avant, apres) {
    if (avant && !apres) throw new ErreurEditeur('Un texte publié ne peut pas être vidé : on ne supprime jamais de contenu. Réécrivez-le plutôt.', 'SUPPRESSION');
    if (avant.length >= 40 && apres.length < avant.length * 0.34) {
      throw new ErreurEditeur('Ce texte serait raccourci de plus des deux tiers, ce qui revient à supprimer du contenu. Gardez l’essentiel de l’information ou ajoutez un nouveau texte à côté.', 'SUPPRESSION');
    }
  }

  estTexteMisEnForme(el) {
    for (const d of elements(el)) if (!INLINE.has(d.tag)) return false;
    return !el.enfants.some((k) => k.t === 'txt' && k.rawtext);
  }

  op_html(op) {
    const el = this.el(op.id);
    this.exigerEditable(el);
    this.exigerUid(op.uid);
    if (VIDES.has(el.tag) || INLINE.has(el.tag) && el.tag !== 'span' && el.tag !== 'a') {
      if (!['span', 'a', 'strong', 'em', 'b', 'i', 'small', 'mark', 'q', 'cite', 'label'].includes(el.tag)) throw new ErreurEditeur('Ce texte se modifie mot à mot.', 'TECHNIQUE');
    }
    if (!this.estTexteMisEnForme(el)) throw new ErreurEditeur('Cet élément contient autre chose que du texte : modifiez les textes un par un.', 'TECHNIQUE');
    const nouveaux = this.fragment(op.html, op.uid);
    for (const n of nouveaux) {
      if (n.t !== 'el') continue;
      for (const d of [n, ...elements(n)]) if (!INLINE.has(d.tag)) throw new ErreurEditeur('Seul du texte mis en forme (gras, italique, lien…) peut être placé ici.', 'PLACEMENT');
    }
    if (el.tag === 'a' && nouveaux.some((n) => n.t === 'el' && (n.tag === 'a' || [...elements(n)].some((d) => d.tag === 'a')))) throw new ErreurEditeur('Un lien ne peut pas contenir un autre lien.', 'PLACEMENT');
    const avant = texteVisible(el);
    const tmp = { enfants: nouveaux };
    const apres = texteVisible(tmp);
    const liensAvant = [...elements(el)].filter((d) => d.tag === 'a').length;
    const liensApres = nouveaux.reduce((s, n) => s + (n.t === 'el' ? [n, ...elements(n)].filter((d) => d.tag === 'a').length : 0), 0);
    if (this.contientOriginal(el)) {
      this.gardeTexte(avant, apres);
      if (liensApres < liensAvant) throw new ErreurEditeur('Un lien publié ne peut pas être retiré du texte (vous pouvez changer son adresse ou ses mots).', 'SUPPRESSION');
    }
    // les éléments de mise en forme d'origine sont « absorbés » par la réécriture
    for (const d of elements(el)) if (!d.nouveau) this.absorbes.add(d.id);
    const premier = el.enfants.find((k) => k.t === 'txt');
    const dernier = [...el.enfants].reverse().find((k) => k.t === 'txt');
    const brut = (s) => (s ? (s.brut != null ? s.brut : s.buf.slice(s.s, s.e)) : '');
    const lead = el.enfants[0] && el.enfants[0].t === 'txt' ? /^\s*/.exec(brut(premier))[0] : '';
    const derniere = el.enfants[el.enfants.length - 1];
    const trail = derniere && derniere.t === 'txt' ? /\s*$/.exec(brut(dernier))[0] : '';
    el.enfants = [];
    const out = [];
    if (lead) out.push({ t: 'gen', html: lead });
    out.push(...nouveaux);
    if (trail) out.push({ t: 'gen', html: trail });
    for (const n of out) n.parent = el;
    el.enfants = out;
  }

  op_attr(op) {
    const el = this.el(op.id);
    this.exigerEditable(el);
    const nom = String(op.nom || '').toLowerCase();
    const valeur = op.valeur == null ? null : String(op.valeur);
    if (!/^[a-z][a-z0-9:-]*$/.test(nom) || nom.startsWith('on') || nom === 'data-gdx' || nom === 'style' || nom === 'class') throw new ErreurEditeur('Attribut non modifiable : ' + nom, 'ATTR');
    const actuel = attr(el, nom);
    if (!el.nouveau) {
      const permis = [...(ATTRS_EXISTANTS['*'] || []), ...(ATTRS_EXISTANTS[el.tag] || [])];
      if (nom === 'id') {
        if (actuel) throw new ErreurEditeur('L’ancre de cet élément existe déjà et sert peut-être ailleurs : elle ne se change pas.', 'ATTR');
      } else if (!permis.includes(nom)) {
        throw new ErreurEditeur('Ce réglage ne se modifie pas sur un élément publié (' + nom + ').', 'ATTR');
      }
      if (valeur == null) {
        if (actuel != null && !RETIRABLES_EXISTANTS.has(nom)) throw new ErreurEditeur('Ce réglage publié ne peut pas être retiré (' + nom + ').', 'SUPPRESSION');
      } else if (actuel && actuel.trim() && !valeur.trim() && nom !== 'title') {
        throw new ErreurEditeur('Ce réglage publié ne peut pas être vidé (' + nom + ').', 'SUPPRESSION');
      }
    }
    if (el.nouveau && this.contientOriginal(el) && ['hidden', 'aria-hidden', 'data-gdb-du', 'data-gdb-au', 'inert'].includes(nom) && valeur != null) {
      throw new ErreurEditeur('Ce bloc contient un contenu publié : il ne peut pas être masqué.', 'SUPPRESSION');
    }
    if (valeur == null) { retirerAttr(el, nom); return; }
    // même filtre que le contenu ajouté
    if (nom === 'href' && !estLienSur(valeur)) throw new ErreurEditeur('Adresse de lien refusée : ' + valeur, 'ATTR');
    if (nom === 'src' && el.tag === 'iframe' && !estIframeAutorisee(valeur)) throw new ErreurEditeur('Ce site ne peut pas être intégré dans la page (vidéos YouTube/Vimeo, Google Maps… seulement).', 'ATTR');
    if ((nom === 'src' || nom === 'poster') && el.tag !== 'iframe' && !estMediaDuSite(valeur)) throw new ErreurEditeur('Utilisez une image ou une vidéo de la médiathèque du site.', 'ATTR');
    if (nom === 'srcset' && !estSrcsetSur(valeur)) throw new ErreurEditeur('Liste d’images refusée.', 'ATTR');
    if (nom === 'id' && !/^[A-Za-z][\w-]{0,60}$/.test(valeur)) throw new ErreurEditeur('Ancre invalide : lettres, chiffres et tirets seulement.', 'ATTR');
    if (nom === 'id') for (const d of elements(this.arbre.racine)) if (d !== el && attr(d, 'id') === valeur) throw new ErreurEditeur('Cette ancre existe déjà dans la page.', 'ATTR');
    if (nom === 'target' && !['_blank', '_self'].includes(valeur)) throw new ErreurEditeur('Ouverture de lien invalide.', 'ATTR');
    if (el.nouveau) {
      const test = assainirHtml('<' + el.tag + ' ' + nom + '="' + valeur.replace(/"/g, '&quot;') + '"></' + el.tag + '>');
      if (test.retires.length) throw new ErreurEditeur('Réglage refusé par le filtre de sécurité : ' + nom, 'ATTR');
    }
    definirAttr(el, nom, valeur);
    if (nom === 'target' && valeur === '_blank' && !/noopener/.test(attr(el, 'rel') || '')) definirAttr(el, 'rel', ((attr(el, 'rel') || '') + ' noopener').trim());
  }

  op_classe(op) {
    const el = this.el(op.id);
    this.exigerEditable(el, { corpsPermis: false });
    const aj = (op.ajouter || []).map(String);
    const re = (op.retirer || []).map(String);
    for (const c of [...aj, ...re]) if (!/^[A-Za-z_][\w-]*$/.test(c)) throw new ErreurEditeur('Classe invalide : ' + c, 'CLASSE');
    if (this.contientOriginal(el)) {
      for (const c of aj) if (!CLASSES_PERMISES_EXISTANT.test(c)) throw new ErreurEditeur('Cette mise en forme ne peut pas être ajoutée à un élément publié (' + c + ').', 'CLASSE');
      for (const c of re) if (!/^gds-/.test(c)) throw new ErreurEditeur('Une mise en forme d’origine ne se retire pas (' + c + ').', 'CLASSE');
    }
    const cl = classes(el).filter((c) => !re.includes(c));
    for (const c of aj) if (!cl.includes(c)) cl.push(c);
    if (cl.length) definirAttr(el, 'class', cl.join(' '));
    else if (el.nouveau) retirerAttr(el, 'class');
  }

  /** Bloc <style id="gd-editeur"> (créé au besoin) */
  blocStyles(creer) {
    for (const el of elements(this.arbre.racine)) if (el.tag === 'style' && attr(el, 'id') === 'gd-editeur') return el;
    if (!creer) return null;
    const tete = this.tete();
    if (!tete) throw new ErreurEditeur('Page sans en-tête HTML : styles impossibles.', 'TECHNIQUE');
    const [style] = construireArbre('<style id="gd-editeur" data-gd="{}"></style>', { fragment: true, prefixe: 'gdstyle.', nouveau: true }).racine.enfants;
    style.parent = tete;
    tete.enfants.push({ t: 'gen', html: '  ', parent: tete }, style, { t: 'gen', html: '\n', parent: tete });
    return style;
  }

  op_style(op) {
    const el = this.el(op.id);
    this.exigerEditable(el);
    if (!estCleStyle(op.cle)) throw new ErreurEditeur('Clé de style invalide.', 'STYLE');
    const bloc = this.blocStyles(true);
    const donnee = lireDonneeStyles(attr(bloc, 'data-gd'));
    const cl = classes(el);
    const avecCle = (k) => [...elements(this.arbre.racine)].filter((d) => classes(d).includes('gds-' + k));
    if (op.base) {
      if (!estCleStyle(op.base) || !cl.includes('gds-' + op.base)) throw new ErreurEditeur('Style de départ introuvable.', 'STYLE');
      if (donnee[op.cle] || avecCle(op.cle).length) throw new ErreurEditeur('Clé de style déjà utilisée.', 'STYLE');
      donnee[op.cle] = JSON.parse(JSON.stringify(donnee[op.base] || {}));
      definirAttr(el, 'class', cl.filter((c) => c !== 'gds-' + op.base).concat('gds-' + op.cle).join(' '));
    } else if (cl.includes('gds-' + op.cle)) {
      if (avecCle(op.cle).length > 1) throw new ErreurEditeur('Ce style est partagé avec un autre élément : indiquez une nouvelle clé.', 'STYLE');
    } else {
      if (cl.some((c) => /^gds-/.test(c))) throw new ErreurEditeur('Cet élément a déjà son propre style : utilisez sa clé.', 'STYLE');
      if (donnee[op.cle] || avecCle(op.cle).length) throw new ErreurEditeur('Clé de style déjà utilisée.', 'STYLE');
      ajouterClasse(el, 'gds-' + op.cle);
    }
    const existant = avecCle(op.cle).some((d) => this.contientOriginal(d));
    verifierStyles(op.styles, existant);
    donnee[op.cle] = fusionnerStyles(donnee[op.cle], op.styles);
    if (!Object.keys(donnee[op.cle]).length) delete donnee[op.cle];
    definirAttr(bloc, 'data-gd', JSON.stringify(donnee));
    bloc.enfants = [{ t: 'gen', html: genererCss(donnee), parent: bloc }];
  }

  op_inserer(op) {
    const ref = this.el(op.id);
    const position = op.position;
    if (!['avant', 'apres', 'debut', 'fin'].includes(position)) throw new ErreurEditeur('Position inconnue.', 'POSITION');
    this.exigerEditable(ref, { corpsPermis: position === 'debut' || position === 'fin' });
    this.exigerUid(op.uid);
    const noeuds = this.fragment(op.html, op.uid);
    const parent = position === 'debut' || position === 'fin' ? ref : ref.parent;
    this.verifierPlacement(parent, noeuds);
    inserer(noeuds, ref, position);
  }

  op_deplacer(op) {
    const el = this.el(op.id);
    const ref = this.el(op.ref, 'emplacement');
    this.exigerEditable(el);
    const position = op.position;
    if (!['avant', 'apres', 'debut', 'fin'].includes(position)) throw new ErreurEditeur('Position inconnue.', 'POSITION');
    this.exigerEditable(ref, { corpsPermis: position === 'debut' || position === 'fin' });
    if (contient(el, ref)) throw new ErreurEditeur('Un élément ne peut pas être placé à l’intérieur de lui-même.', 'POSITION');
    if (['main', 'header', 'footer'].includes(el.tag) && /site-(header|footer)/.test(attr(el, 'class') || '') || el.tag === 'main') throw new ErreurEditeur('L’en-tête, le pied de page et le contenu principal restent à leur place.', 'POSITION');
    const parent = position === 'debut' || position === 'fin' ? ref : ref.parent;
    this.verifierPlacement(parent, [el]);
    if (this.contientOriginal(el)) {
      for (let p = parent; p && p.tag !== 'body' && p.tag !== '#racine'; p = p.parent) {
        if (p.nouveau ? this.ajoutMasquant(p) : this.conteneurPublieMasque(p)) throw new ErreurEditeur('Cet emplacement est masqué (sur certains écrans ou selon une date) : un contenu publié ne peut pas y être déplacé.', 'SUPPRESSION');
      }
    }
    detacher(el);
    inserer([el], ref, position);
  }

  op_dupliquer(op) {
    const el = this.el(op.id);
    this.exigerEditable(el);
    this.exigerUid(op.uid);
    if (el.tag === 'main' || /\bsite-(header|footer)\b/.test(attr(el, 'class') || '')) throw new ErreurEditeur('L’en-tête, le pied de page et le contenu principal ne se dupliquent pas.', 'TECHNIQUE');
    const copie = cloner(el, op.uid + '.', this.arbre.parId);
    for (const d of [copie, ...elements(copie)]) if (attr(d, 'id') != null) retirerAttr(d, 'id');
    const i = el.parent.enfants.indexOf(el);
    const avant = el.parent.enfants[i - 1];
    const ws = avant && avant.t === 'txt' ? /\s*$/.exec(avant.brut != null ? avant.brut : avant.buf.slice(avant.s, avant.e))[0] : '';
    const ajout = ws ? [{ t: 'gen', html: ws }, copie] : [copie];
    inserer(ajout, el, 'apres');
  }

  op_supprimer(op) {
    const el = this.el(op.id);
    if (!el.nouveau) throw new ErreurEditeur('Interdit : on ne supprime jamais un contenu déjà publié. Vous pouvez le modifier, le déplacer ou ajouter du contenu à côté.', 'SUPPRESSION');
    for (const d of elements(el)) if (!d.nouveau) throw new ErreurEditeur('Ce bloc contient un élément déjà publié : il ne peut pas être supprimé.', 'SUPPRESSION');
    detacher(el);
  }

  op_image(op) {
    const el = this.el(op.id);
    this.exigerEditable(el);
    if (el.tag !== 'img') throw new ErreurEditeur('Choisissez une image.', 'IMAGE');
    const src = String(op.src || '');
    if (!estMediaDuSite(src)) throw new ErreurEditeur('Choisissez une image de la médiathèque du site.', 'IMAGE');
    if (op.srcset && !estSrcsetSur(op.srcset)) throw new ErreurEditeur('Variantes d’image refusées.', 'IMAGE');
    if (this.ctx.medias) {
      const chemins = [src, ...String(op.srcset || '').split(',').map((c) => c.trim().split(/\s+/)[0]).filter(Boolean)];
      for (const c of chemins) if (!this.ctx.medias.has(c.replace(/^https:\/\/(www\.)?gamedoor41\.fr/, ''))) throw new ErreurEditeur('Image introuvable dans la médiathèque : ' + c, 'IMAGE');
    }
    definirAttr(el, 'src', src);
    if (op.srcset) definirAttr(el, 'srcset', op.srcset);
    else if (attr(el, 'srcset') != null) {
      if (el.nouveau) retirerAttr(el, 'srcset'); else definirAttr(el, 'srcset', src);
    }
    if (op.sizes) definirAttr(el, 'sizes', String(op.sizes));
    if (op.largeur && op.hauteur) { definirAttr(el, 'width', String(Math.round(op.largeur))); definirAttr(el, 'height', String(Math.round(op.hauteur))); }
    if (op.alt != null) {
      if (!el.nouveau && (attr(el, 'alt') || '').trim() && !String(op.alt).trim()) throw new ErreurEditeur('Le texte de description de l’image ne peut pas être vidé.', 'SUPPRESSION');
      definirAttr(el, 'alt', String(op.alt));
    }
    // <picture> : chaque <source> reçoit la nouvelle image (sans retirer de source)
    if (el.parent && el.parent.tag === 'picture') {
      for (const s of el.parent.enfants) {
        if (s.t !== 'el' || s.tag !== 'source') continue;
        definirAttr(s, 'srcset', op.srcset || src);
        const type = /\.webp(\s|$|,)/.test(op.srcset || src) ? 'image/webp' : /\.avif/.test(op.srcset || src) ? 'image/avif' : /\.jpe?g/.test(src) ? 'image/jpeg' : /\.png/.test(src) ? 'image/png' : null;
        if (type && attr(s, 'type') != null) definirAttr(s, 'type', type);
        if (op.sizes && attr(s, 'sizes') != null) definirAttr(s, 'sizes', String(op.sizes));
      }
    }
  }

  op_meta(op) {
    const tete = this.tete();
    if (!tete) throw new ErreurEditeur('Page sans en-tête.', 'TECHNIQUE');
    const metas = [...elements(tete)];
    const trouverMeta = (cle, val) => metas.find((m) => m.tag === 'meta' && attr(m, cle) === val);
    const poser = (cle, val, contenu) => { const m = trouverMeta(cle, val); if (m) definirAttr(m, 'content', contenu); return !!m; };
    if (op.titre != null) {
      const t = norm(op.titre);
      if (t.length < 5) throw new ErreurEditeur('Le titre de la page est trop court.', 'META');
      if (t.length > 120) throw new ErreurEditeur('Le titre de la page est trop long (120 caractères au plus).', 'META');
      const title = metas.find((m) => m.tag === 'title');
      if (!title) throw new ErreurEditeur('Page sans titre.', 'META');
      title.enfants = [{ t: 'gen', html: echapperTexteFr(t), parent: title }];
      poser('property', 'og:title', t);
      poser('name', 'twitter:title', t);
    }
    if (op.description != null) {
      const d = norm(op.description);
      if (d.length < 20) throw new ErreurEditeur('La description est trop courte (20 caractères au moins).', 'META');
      if (d.length > 320) throw new ErreurEditeur('La description est trop longue (320 caractères au plus).', 'META');
      if (!poser('name', 'description', d)) {
        const [m] = construireArbre('<meta name="description" content="' + d.replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '">', { fragment: true, prefixe: 'gdmeta.', nouveau: true }).racine.enfants;
        m.parent = tete;
        tete.enfants.push({ t: 'gen', html: '  ', parent: tete }, m, { t: 'gen', html: '\n', parent: tete });
      }
      poser('property', 'og:description', d);
      poser('name', 'twitter:description', d);
    }
    if (op.image != null) {
      if (!estMediaDuSite(op.image)) throw new ErreurEditeur('Choisissez une image de la médiathèque.', 'META');
      const abs = 'https://gamedoor41.fr' + String(op.image).replace(/^https:\/\/(www\.)?gamedoor41\.fr/, '');
      poser('property', 'og:image', abs);
      poser('name', 'twitter:image', abs);
    }
  }

  // ---------------------------------------------------------------- fin
  /** Ajoute la feuille et le script communs des blocs si la page en contient. */
  assurerRessourcesBlocs() {
    const corps = this.corps();
    const tete = this.tete();
    if (!corps || !tete) return;
    let blocs = false;
    for (const d of elements(corps)) if (classes(d).some((c) => c.startsWith('gdb-'))) { blocs = true; break; }
    if (!blocs) return;
    const v = this.ctx.versions || {};
    const hrefCss = RESSOURCES_BLOCS.css + (v.css ? '?v=' + v.css : '');
    const srcJs = RESSOURCES_BLOCS.js + (v.js ? '?v=' + v.js : '');
    const link = [...elements(tete)].find((e) => e.tag === 'link' && (attr(e, 'href') || '').startsWith(RESSOURCES_BLOCS.css));
    if (link) { if (attr(link, 'href') !== hrefCss) definirAttr(link, 'href', hrefCss); } else {
      const [l] = construireArbre('<link rel="stylesheet" href="' + hrefCss + '" id="gd-blocs-css">', { fragment: true, prefixe: 'gdcss.', nouveau: true }).racine.enfants;
      l.parent = tete;
      tete.enfants.push({ t: 'gen', html: '  ', parent: tete }, l, { t: 'gen', html: '\n', parent: tete });
    }
    const script = [...elements(corps)].find((e) => e.tag === 'script' && (attr(e, 'src') || '').startsWith(RESSOURCES_BLOCS.js));
    if (script) { if (attr(script, 'src') !== srcJs) definirAttr(script, 'src', srcJs); } else {
      const [s] = construireArbre('<script defer src="' + srcJs + '" id="gd-blocs-js"></script>', { fragment: true, prefixe: 'gdjs.', nouveau: true }).racine.enfants;
      s.parent = corps;
      corps.enfants.push({ t: 'gen', html: '\n', parent: corps }, s, { t: 'gen', html: '\n', parent: corps });
    }
  }

  html(o) {
    return serialiser(this.arbre, o);
  }
}

/**
 * Applique une liste d'opérations à une page publiée.
 * @returns {{ page: Page, html: string, avertissements: object[] }}
 */
export function appliquerOperations(source, ops, ctx = {}) {
  const page = new Page(source, ctx);
  (ops || []).forEach((op, i) => {
    try {
      page.appliquer(op);
    } catch (e) {
      if (e instanceof ErreurEditeur) { e.details = { ...(e.details || {}), index: i, op: op && op.op }; }
      throw e;
    }
  });
  page.assurerRessourcesBlocs();
  const html = page.html();
  if (ops && ops.length && !ctx.nouvellePage) verifierConservation(source, html);
  return { page, html, avertissements: page.avertissements };
}

// --------------------------------------------------------------------------
// Dernier filet : rien de publié n'a disparu
// --------------------------------------------------------------------------

const BALISES_CONTENU = ['a', 'img', 'picture', 'video', 'audio', 'iframe', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li', 'ul', 'ol',
  'section', 'article', 'aside', 'table', 'tr', 'td', 'th', 'figure', 'figcaption', 'blockquote', 'details', 'summary', 'button',
  'form', 'header', 'footer', 'nav', 'main', 'svg', 'source', 'dl', 'dt', 'dd', 'address', 'time'];

function inventaire(source) {
  const a = construireArbre(source);
  const compte = Object.fromEntries(BALISES_CONTENU.map((t) => [t, 0]));
  let corps = null;
  for (const el of elements(a.racine)) if (el.tag === 'body') { corps = el; break; }
  const base = corps || a.racine;
  const hrefs = [];
  for (const el of elements(base)) {
    if (el.tag in compte) compte[el.tag]++;
    if (el.tag === 'a' && attr(el, 'href')) hrefs.push(attr(el, 'href'));
  }
  return { compte, texte: texteVisible(base).length, hrefs };
}

/** Lève une erreur si la nouvelle version contient MOINS de contenu que la publiée. */
export function verifierConservation(avant, apres) {
  const a = inventaire(avant);
  const b = inventaire(apres);
  for (const t of BALISES_CONTENU) {
    if (b.compte[t] < a.compte[t]) {
      throw new ErreurEditeur('Contrôle de sécurité : la nouvelle version contient moins d’éléments « ' + t + ' » que la version publiée (' + a.compte[t] + ' → ' + b.compte[t] + '). Publication bloquée : on ne supprime jamais de contenu.', 'CONSERVATION', { tag: t });
    }
  }
  if (b.texte < a.texte * 0.85) {
    throw new ErreurEditeur('Contrôle de sécurité : la page perdrait plus de 15 % de son texte. Publication bloquée : on ne supprime jamais de contenu.', 'CONSERVATION');
  }
  return true;
}

// --------------------------------------------------------------------------
// Rebasage : une page a changé sur le site pendant qu'on la modifiait
// --------------------------------------------------------------------------

/**
 * Réécrit les identifiants d'éléments publiés d'une liste d'opérations pour
 * une NOUVELLE version de la page, grâce aux empreintes. Renvoie
 * { ops, perdues } : `perdues` = opérations dont l'élément a changé ou disparu
 * (à refaire à la main). Les éléments ajoutés (« uid.n ») ne bougent pas.
 */
export function rebaser(ops, nouvelleSource) {
  const arbre = construireArbre(nouvelleSource);
  const parSig = new Map();
  for (const el of elements(arbre.racine)) {
    const s = signature(el);
    if (!s) continue;
    parSig.set(s, parSig.has(s) ? null : el.id); // null = empreinte en double (ambiguë)
  }
  const out = [];
  const perdues = [];
  const alignes = [];
  for (const op of ops) {
    const c = { ...op };
    let ok = true;
    for (const [champId, champSig] of [['id', 'sig'], ['ref', 'refSig']]) {
      const id = c[champId];
      if (id == null || c.op === 'meta' || String(id).includes('.')) continue;
      const nouveau = c[champSig] ? parSig.get(c[champSig]) : null;
      if (!nouveau) { ok = false; break; }
      c[champId] = nouveau;
    }
    if (ok) out.push(c); else perdues.push(op);
    alignes.push(ok ? c : null);
  }
  return { ops: out, perdues, alignes };
}
