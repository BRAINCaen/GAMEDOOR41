// ==========================================================================
// Éditeur du site — STYLES
//
// Les styles choisis dans l'inspecteur sont rangés dans UN bloc par page :
//   <style id="gd-editeur" data-gd='{"k3x9a":{"tous":{…},"telephone":{…}}}'>…</style>
// La donnée (data-gd) est la source ; le CSS est régénéré à chaque modification.
// Chaque élément stylé reçoit la classe « gds-<clé> ».
//
// GARDE-FOU : sur un élément DÉJÀ PUBLIÉ, aucun style ne peut le faire
// disparaître (display:none, transparence, taille zéro, débordement masqué,
// déplacement hors de l'écran…). Seuls les éléments ajoutés dans la
// modification en cours peuvent être masqués (ex. « seulement sur téléphone »).
// Module PUR.
// ==========================================================================

import { ErreurEditeur } from './arbre.mjs';
import { valeurCssSure, PROP_CSS_RE, declarationRecouvrante } from './assainir.mjs';

export const APPAREILS = {
  tous: null,
  tablette: '(max-width: 1024px)',
  telephone: '(max-width: 768px)',
  survol: ':hover',
};

/** Propriétés réglables depuis l'inspecteur. */
export const PROPRIETES = new Set([
  'color', 'background', 'background-color', 'background-image', 'background-size', 'background-position', 'background-repeat', 'background-attachment',
  'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'word-spacing', 'text-transform', 'text-align',
  'text-decoration', 'text-decoration-color', 'text-decoration-thickness', 'text-underline-offset', 'text-shadow', 'text-wrap', 'white-space', 'word-break', 'hyphens',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'margin-inline', 'margin-block',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'padding-inline', 'padding-block',
  'width', 'min-width', 'max-width', 'height', 'min-height', 'max-height', 'aspect-ratio',
  'border', 'border-width', 'border-style', 'border-color', 'border-radius',
  'border-top', 'border-right', 'border-bottom', 'border-left',
  'border-top-left-radius', 'border-top-right-radius', 'border-bottom-left-radius', 'border-bottom-right-radius',
  'outline', 'outline-offset', 'box-shadow', 'opacity', 'filter', 'backdrop-filter', 'mix-blend-mode',
  'display', 'flex-direction', 'flex-wrap', 'justify-content', 'align-items', 'align-content', 'align-self', 'justify-self',
  'gap', 'row-gap', 'column-gap', 'flex', 'flex-grow', 'flex-shrink', 'flex-basis', 'order',
  'grid-template-columns', 'grid-template-rows', 'grid-column', 'grid-row', 'place-items',
  'object-fit', 'object-position', 'transform', 'transform-origin', 'transition', 'cursor', 'list-style', 'list-style-type',
  'vertical-align', 'float', 'clear', 'columns', 'column-count', 'overflow', 'overflow-x', 'overflow-y',
  'position', 'top', 'right', 'bottom', 'left', 'z-index', 'visibility', 'clip-path', 'text-indent', 'animation',
  '-webkit-text-fill-color', 'background-clip', '-webkit-background-clip', 'scroll-margin-top',
]);

// Interdits sur un élément déjà publié (peuvent servir à le faire disparaître)
const INTERDITS_EXISTANT = new Set([
  'visibility', 'clip-path', 'clip', 'mask', 'mask-image', 'content-visibility', 'text-indent',
  'position', 'top', 'right', 'bottom', 'left', 'z-index', 'height', 'max-height',
  'overflow', 'overflow-x', 'overflow-y', '-webkit-text-fill-color', 'background-clip', '-webkit-background-clip',
  'columns', 'column-count', 'animation', 'mix-blend-mode', 'float',
]);

const PX_PAR = { px: 1, rem: 16, em: 16, pt: 1.333, vw: 12, vh: 8, '%': null, ch: 8, ex: 8, vmin: 8, vmax: 12 };

/** Toutes les longueurs d'une valeur, en px (approx.). « % » → null. */
function longueurs(val) {
  const out = [];
  for (const m of String(val).matchAll(/(-?\d*\.?\d+)(px|rem|em|pt|vw|vh|%|ch|ex|vmin|vmax)?/g)) {
    const n = parseFloat(m[1]);
    const u = m[2] || '';
    if (!u) { out.push({ n, u: '', px: n }); continue; }
    const f = PX_PAR[u];
    out.push({ n, u, px: f == null ? null : n * f });
  }
  return out;
}

function alphaCouleur(v) {
  const s = String(v).toLowerCase().trim();
  if (s === 'transparent') return 0;
  let m = /rgba?\(([^)]+)\)/.exec(s) || /hsla?\(([^)]+)\)/.exec(s);
  if (m) {
    const parts = m[1].split(/[\s,/]+/).filter(Boolean);
    if (parts.length >= 4) { const a = parts[3]; return a.endsWith('%') ? parseFloat(a) / 100 : parseFloat(a); }
    return 1;
  }
  m = /^#([0-9a-f]{8})$/.exec(s);
  if (m) return parseInt(m[1].slice(6), 16) / 255;
  m = /^#([0-9a-f]{4})$/.exec(s);
  if (m) return parseInt(m[1][3] + m[1][3], 16) / 255;
  return 1;
}

/**
 * Une déclaration est-elle permise ? Renvoie null si oui, sinon le motif du refus.
 * @param {string} prop
 * @param {string} val
 * @param {boolean} existant  l'élément est déjà publié
 */
export function refusDeclaration(prop, val, existant) {
  if (!PROP_CSS_RE.test(prop)) return 'propriété inconnue';
  if (!PROPRIETES.has(prop) && !prop.startsWith('--')) return 'propriété non réglable depuis l’éditeur (' + prop + ')';
  if (!valeurCssSure(val)) return 'valeur refusée';
  const v = String(val).toLowerCase().replace(/\s*!important\s*$/, '').trim();
  const recouvre = declarationRecouvrante(prop, v);
  if (recouvre) return recouvre;
  if (!existant) return null;

  // ---- élément déjà publié : rien qui le fasse disparaître
  if (INTERDITS_EXISTANT.has(prop)) return 'interdit sur un contenu publié (risque de le masquer)';
  if (prop === 'display' && !/^(block|inline-block|inline|flex|inline-flex|grid|inline-grid|flow-root|list-item)$/.test(v)) return 'cet affichage masquerait le contenu';
  if (prop === 'opacity') { const n = v.endsWith('%') ? parseFloat(v) / 100 : parseFloat(v); if (!(n >= 0.4)) return 'opacité trop faible (40 % minimum)'; }
  if ((prop === 'color' || prop === 'text-decoration-color') && alphaCouleur(v) < 0.4) return 'couleur trop transparente';
  if (prop === 'font-size' && longueurs(v).some((l) => l.px != null && l.px < 10)) return 'texte trop petit (10 px minimum)';
  if (prop === 'line-height' && longueurs(v).some((l) => (l.u === '' ? l.n < 0.8 : l.px != null && l.px < 10))) return 'interligne trop petit';
  if (prop === 'letter-spacing' && longueurs(v).some((l) => l.px != null && l.px < -2)) return 'lettres trop serrées';
  if ((prop === 'width' || prop === 'max-width' || prop === 'min-width' || prop === 'flex-basis') && longueurs(v).some((l) => (l.u === '%' ? l.n < 10 : l.px != null && l.px < 60))) return 'largeur trop petite';
  if (prop === 'transform') {
    for (const m of v.matchAll(/scale[xy]?\(([^)]+)\)/g)) if (m[1].split(',').some((x) => Math.abs(parseFloat(x)) < 0.5)) return 'réduction trop forte';
    for (const m of v.matchAll(/translate[xyz3d]*\(([^)]+)\)/g)) if (longueurs(m[1]).some((l) => l.px != null && Math.abs(l.px) > 400)) return 'déplacement trop grand';
    if (/rotate[xy]\(\s*(9\d|[1-9]\d\d)/.test(v)) return 'rotation qui masquerait le contenu';
  }
  if (prop === 'filter' || prop === 'backdrop-filter') {
    for (const m of v.matchAll(/(opacity|brightness|contrast)\(([^)]+)\)/g)) { const n = m[2].endsWith('%') ? parseFloat(m[2]) / 100 : parseFloat(m[2]); if (n < 0.4) return 'filtre qui masquerait le contenu'; }
    for (const m of v.matchAll(/blur\(([^)]+)\)/g)) if (longueurs(m[1]).some((l) => l.px != null && l.px > 3)) return 'flou trop fort';
  }
  if (prop === 'font-family' && /^\s*$/.test(v)) return 'police vide';
  return null;
}

/** Lit la donnée de style d'une page (attribut data-gd du bloc). */
export function lireDonneeStyles(json) {
  if (!json) return {};
  try {
    const d = JSON.parse(json);
    return d && typeof d === 'object' && !Array.isArray(d) ? d : {};
  } catch (_) { return {}; }
}

const CLE_RE = /^[a-z0-9]{4,16}$/;
export const estCleStyle = (c) => CLE_RE.test(String(c || ''));

/** Fusionne des réglages (valeur '' ou null = retirer la propriété). */
export function fusionnerStyles(actuel, nouveaux) {
  const res = { ...(actuel || {}) };
  for (const app of Object.keys(nouveaux || {})) {
    if (!(app in APPAREILS)) throw new ErreurEditeur('Appareil inconnu : ' + app, 'STYLE');
    const cible = { ...(res[app] || {}) };
    for (const [p, v] of Object.entries(nouveaux[app] || {})) {
      if (v == null || v === '') delete cible[p];
      else cible[p] = String(v).trim();
    }
    if (Object.keys(cible).length) res[app] = cible; else delete res[app];
  }
  return res;
}

/** Vérifie tous les réglages d'une clé ; lève une ErreurEditeur au premier refus. */
export function verifierStyles(styles, existant) {
  for (const [app, decl] of Object.entries(styles || {})) {
    if (!(app in APPAREILS)) throw new ErreurEditeur('Appareil inconnu : ' + app, 'STYLE');
    for (const [p, v] of Object.entries(decl || {})) {
      const r = refusDeclaration(String(p).toLowerCase(), String(v), existant);
      if (r) throw new ErreurEditeur('Style refusé (' + p + ': ' + v + ') : ' + r + '.', 'STYLE', { prop: p, valeur: v });
    }
  }
}

const declarations = (o) => Object.entries(o || {})
  .map(([p, v]) => p + ':' + String(v).replace(/\s*!important\s*$/i, '') + ' !important').join(';');

/** CSS complet du bloc de styles de l'éditeur. */
export function genererCss(donnee) {
  const cles = Object.keys(donnee).filter(estCleStyle).sort();
  const lignes = ['/* Styles posés avec l’éditeur du site (gamedoor41.fr/editeur/) — régénérés automatiquement */'];
  for (const c of cles) {
    const d = donnee[c];
    if (d.tous) lignes.push('.gds-' + c + '{' + declarations(d.tous) + '}');
    if (d.survol) lignes.push('.gds-' + c + ':hover{' + declarations(d.survol) + '}');
  }
  for (const app of ['tablette', 'telephone']) {
    const r = cles.filter((c) => donnee[c][app]).map((c) => '.gds-' + c + '{' + declarations(donnee[c][app]) + '}');
    if (r.length) lignes.push('@media ' + APPAREILS[app] + '{' + r.join('') + '}');
  }
  return '\n' + lignes.join('\n') + '\n';
}
