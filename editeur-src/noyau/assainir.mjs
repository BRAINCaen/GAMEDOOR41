// ==========================================================================
// Éditeur du site — FILTRE DE SÉCURITÉ DU CONTENU AJOUTÉ
//
// Tout HTML ajouté par l'éditeur (bloc, section, assistant, collage) passe ici,
// dans le navigateur ET sur le serveur (le serveur ne fait jamais confiance au
// navigateur). Liste blanche : ce qui n'y est pas est retiré et signalé.
//  - aucun script, aucun gestionnaire « on… », aucun lien javascript:/data: ;
//  - images et vidéos : uniquement des fichiers du site (/img/…, /video/…) ;
//  - cadres (iframe) : uniquement YouTube, Vimeo, Google Maps et quelques
//    services connus (liste IFRAMES_AUTORISEES) ;
//  - styles en ligne : propriétés CSS filtrées (pas d'url() externe douteuse,
//    pas d'expression, pas d'@import).
// Module PUR (navigateur + serveur).
// ==========================================================================

import { parseFragment } from 'parse5';
import { echapperAttr, echapperTexte } from './arbre.mjs';

const BALISES = new Set([
  'section', 'div', 'article', 'aside', 'header', 'footer', 'nav', 'main',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'a', 'strong', 'b', 'em', 'i', 'u', 's',
  'small', 'mark', 'sup', 'sub', 'br', 'hr', 'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  'blockquote', 'q', 'cite', 'figure', 'figcaption', 'img', 'picture', 'source', 'video', 'audio',
  'iframe', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
  'details', 'summary', 'button', 'time', 'address', 'abbr', 'code', 'pre', 'kbd', 'del', 'ins',
  'wbr', 'label', 'meter', 'progress',
]);
const BALISES_SVG = new Set([
  'svg', 'g', 'path', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'rect', 'text', 'tspan',
  'defs', 'lineargradient', 'radialgradient', 'stop', 'use', 'title', 'desc', 'symbol',
]);
const VIDES = new Set(['br', 'hr', 'img', 'source', 'wbr', 'col']);

// Attributs permis partout (en plus de data-* et aria-*)
const ATTRS_GLOBAUX = new Set(['class', 'id', 'style', 'title', 'role', 'lang', 'dir', 'hidden', 'tabindex']);
const ATTRS = {
  a: ['href', 'target', 'rel', 'download'],
  img: ['src', 'srcset', 'sizes', 'alt', 'width', 'height', 'loading', 'decoding', 'fetchpriority'],
  source: ['src', 'srcset', 'sizes', 'type', 'media', 'width', 'height'],
  picture: [],
  video: ['src', 'poster', 'controls', 'autoplay', 'muted', 'loop', 'playsinline', 'preload', 'width', 'height'],
  audio: ['src', 'controls', 'loop', 'preload'],
  iframe: ['src', 'width', 'height', 'loading', 'allow', 'allowfullscreen', 'referrerpolicy', 'frameborder', 'scrolling'],
  td: ['colspan', 'rowspan', 'headers'], th: ['colspan', 'rowspan', 'scope', 'headers'],
  col: ['span'], colgroup: ['span'],
  details: ['open'], button: ['type', 'disabled', 'value', 'name'],
  time: ['datetime'], ol: ['start', 'reversed', 'type'], li: ['value'],
  blockquote: ['cite'], q: ['cite'], del: ['datetime'], ins: ['datetime'], abbr: [],
  label: ['for'], meter: ['value', 'min', 'max', 'low', 'high', 'optimum'], progress: ['value', 'max'],
};
const ATTRS_SVG = new Set([
  'viewbox', 'xmlns', 'width', 'height', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
  'stroke-dasharray', 'stroke-dashoffset', 'stroke-miterlimit', 'd', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'y1', 'x2', 'y2',
  'points', 'transform', 'opacity', 'fill-opacity', 'stroke-opacity', 'fill-rule', 'clip-rule', 'offset',
  'stop-color', 'stop-opacity', 'gradientunits', 'gradienttransform', 'href', 'xlink:href', 'preserveaspectratio',
  'aria-hidden', 'focusable', 'role', 'class', 'style', 'text-anchor', 'font-size', 'font-weight', 'font-family',
  'dominant-baseline', 'id', 'vector-effect', 'dx', 'dy',
]);
const BOOLEENS = new Set(['controls', 'autoplay', 'muted', 'loop', 'playsinline', 'allowfullscreen', 'open', 'hidden', 'disabled', 'reversed', 'download']);

/** Cadres autorisés (préfixes exacts d'adresse). */
export const IFRAMES_AUTORISEES = [
  'https://www.youtube-nocookie.com/embed/',
  'https://www.youtube.com/embed/',
  'https://player.vimeo.com/video/',
  'https://www.google.com/maps/embed',
  'https://maps.google.com/maps?',
  'https://www.google.com/maps?',
  'https://www.openstreetmap.org/export/embed.html',
  'https://open.spotify.com/embed/',
  'https://w.soundcloud.com/player/',
  'https://www.tiktok.com/embed/',
  'https://www.instagram.com/p/',
  'https://www.instagram.com/reel/',
  'https://www.facebook.com/plugins/',
  'https://calendar.google.com/calendar/embed',
  'https://docs.google.com/forms/',
  'https://www.canva.com/design/',
  'https://view.genial.ly/',
  'https://www.dailymotion.com/embed/',
  'https://synergia-hub.netlify.app/',
];
const ALLOW_PERMIS = ['accelerometer', 'autoplay', 'clipboard-write', 'encrypted-media', 'gyroscope', 'picture-in-picture', 'web-share', 'fullscreen'];

const DANGEREUX = /^\s*(javascript|vbscript|data|file|blob):/i;

/** Lien sûr : http(s), mailto, tel, sms, chemin du site, ancre. */
export function estLienSur(href) {
  if (typeof href !== 'string') return false;
  const h = href.trim();
  if (!h || DANGEREUX.test(h)) return false;
  if (/[\u0000-\u001f]/.test(h)) return false;
  if (/^(https?:\/\/|mailto:|tel:|sms:)/i.test(h)) return true;
  if (/^\/(?!\/)/.test(h) || h.startsWith('#') || h.startsWith('?')) return true;
  return false;
}

/** Image ou vidéo du site (pas d'image hébergée ailleurs). */
export function estMediaDuSite(src) {
  if (typeof src !== 'string') return false;
  let s = src.trim();
  s = s.replace(/^https:\/\/(www\.)?gamedoor41\.fr(?=\/)/i, '');
  if (!/^\/(img|video|images)\//.test(s)) return false;
  if (s.includes('..') || /[\s"'<>\\]/.test(s.replace(/\s+\d+[wx]$/, ''))) return false;
  return true;
}

/** srcset : chaque candidat doit être un média du site. */
export function estSrcsetSur(v) {
  if (typeof v !== 'string' || !v.trim()) return false;
  return v.split(',').every((c) => {
    const [u] = c.trim().split(/\s+/);
    return estMediaDuSite(u);
  });
}

export function estIframeAutorisee(src) {
  if (typeof src !== 'string') return false;
  const s = src.trim();
  return IFRAMES_AUTORISEES.some((p) => s.startsWith(p)) && !/[\s"'<>]/.test(s);
}

// --------------------------------------------------------------------------
// CSS en ligne
// --------------------------------------------------------------------------

/** Découpe « a: b; c: d(e;f) » en déclarations en respectant parenthèses et guillemets. */
export function decouperDeclarations(css) {
  const out = [];
  let cur = '';
  let prof = 0;
  let guil = null;
  for (const ch of String(css || '')) {
    if (guil) { cur += ch; if (ch === guil) guil = null; continue; }
    if (ch === '"' || ch === "'") { guil = ch; cur += ch; continue; }
    if (ch === '(') prof++;
    if (ch === ')') prof = Math.max(0, prof - 1);
    if (ch === ';' && prof === 0) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out.map((d) => {
    const i = d.indexOf(':');
    if (i < 0) return null;
    return { prop: d.slice(0, i).trim().toLowerCase(), val: d.slice(i + 1).trim() };
  }).filter((d) => d && d.prop && d.val);
}

/** Une valeur CSS est-elle sûre ? (pas de script, pas d'URL externe non https) */
export function valeurCssSure(val) {
  const v = String(val);
  if (/expression\s*\(|javascript:|vbscript:|behavior\s*:|-moz-binding|@import|<|>|\\/i.test(v)) return false;
  const urls = [...v.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi)].map((m) => m[2]);
  for (const u of urls) if (!(estMediaDuSite(u) || /^https:\/\/fonts\.gstatic\.com\//.test(u))) return false;
  return true;
}

export const PROP_CSS_RE = /^(--[a-z0-9-]+|-?[a-z][a-z-]*)$/;

const enPx = (v) => {
  const out = [];
  for (const m of String(v).matchAll(/(-?\d*\.?\d+)(px|rem|em|vh|vw|%)?/g)) {
    const n = parseFloat(m[1]);
    const u = m[2] || 'px';
    out.push(u === 'px' ? n : u === 'rem' || u === 'em' ? n * 16 : u === 'vh' ? n * 9 : u === 'vw' ? n * 14 : null);
  }
  return out;
};

/**
 * Déclaration qui permettrait à un contenu AJOUTÉ de recouvrir un contenu publié
 * (positionnement par-dessus, décalage énorme, superposition). Vaut pour tout ajout.
 */
export function declarationRecouvrante(prop, val) {
  const v = String(val).toLowerCase().replace(/\s*!important\s*$/, '').trim();
  if (prop === 'position' && !/^(static|relative)$/.test(v)) return 'positionnement par-dessus le contenu interdit';
  if (['top', 'right', 'bottom', 'left', 'inset', 'inset-block', 'inset-inline'].includes(prop) && enPx(v).some((n) => n == null || Math.abs(n) > 200)) return 'décalage trop grand';
  if (prop === 'z-index' && parseInt(v, 10) > 50) return 'z-index trop élevé (50 au plus)';
  if (/^margin/.test(prop) && enPx(v).some((n) => n != null && n < -120)) return 'marge négative trop forte';
  if (prop === 'transform') for (const m of v.matchAll(/translate[xyz3d]*\(([^)]+)\)/g)) if (enPx(m[1]).some((n) => n == null || Math.abs(n) > 400)) return 'déplacement trop grand';
  return null;
}

export function assainirStyle(css, retires) {
  const ok = [];
  for (const { prop, val } of decouperDeclarations(css)) {
    if (!PROP_CSS_RE.test(prop) || !valeurCssSure(val) || declarationRecouvrante(prop, val)) {
      if (retires) retires.push({ quoi: 'style', detail: prop + ': ' + val });
      continue;
    }
    ok.push(prop + ': ' + val.replace(/\s*!important\s*$/i, ' !important'));
  }
  return ok.join('; ');
}

// --------------------------------------------------------------------------
// HTML
// --------------------------------------------------------------------------

const nomAttr = (a) => (a.prefix ? a.prefix + ':' : '') + a.name;

function attrPermis(tag, nom, svg) {
  if (nom.startsWith('on')) return false;
  if (nom === 'data-gdx' || nom === 'data-gd-editeur') return false;
  if (/^data-[a-z0-9_-]+$/.test(nom) || /^aria-[a-z]+$/.test(nom)) return true;
  if (svg) return ATTRS_SVG.has(nom.toLowerCase());
  if (ATTRS_GLOBAUX.has(nom)) return true;
  return (ATTRS[tag] || []).includes(nom);
}

function valeurAttrSure(tag, nom, val, retires) {
  const v = String(val);
  switch (nom) {
    case 'href':
    case 'xlink:href':
      if (tag === 'use') return /^#[A-Za-z][\w-]*$/.test(v) || /^\/img\/[\w./-]+\.svg#[\w-]+$/.test(v);
      return estLienSur(v);
    case 'src':
      if (tag === 'iframe') return estIframeAutorisee(v);
      return estMediaDuSite(v);
    case 'srcset': return estSrcsetSur(v);
    case 'poster': return estMediaDuSite(v);
    case 'style': return true; // filtré à part
    case 'class': return /^[\w\s:-]*$/.test(v);
    case 'id': return /^[A-Za-z][\w-]*$/.test(v);
    case 'target': return v === '_blank' || v === '_self';
    case 'rel': return /^(\s*(noopener|noreferrer|nofollow|sponsored|ugc|external)\s*)+$/i.test(v);
    case 'allow': return v.split(';').every((x) => ALLOW_PERMIS.includes(x.trim().split(/\s+/)[0]) || !x.trim());
    case 'type': return tag === 'button' ? v === 'button' : /^(image|video|audio)\/[\w.+-]+$/.test(v);
    case 'width': case 'height': return /^\d{1,5}(%|px)?$/.test(v) || tag === 'svg' || /^[\d.]+$/.test(v);
    case 'tabindex': return /^-?\d{1,3}$/.test(v);
    case 'loading': return v === 'lazy' || v === 'eager';
    case 'referrerpolicy': return /^[a-z-]+$/.test(v);
    default:
      if (DANGEREUX.test(v) && /(href|src|action|formaction|data)$/.test(nom)) return false;
      return true;
  }
}

/**
 * Nettoie un morceau de HTML ajouté par l'éditeur.
 * @param {string} html
 * @returns {{ html: string, retires: {quoi: string, detail: string}[] }}
 */
export function assainirHtml(html) {
  const frag = parseFragment(String(html || ''));
  const retires = [];
  const ecrire = (n, dansSvg) => {
    if (n.nodeName === '#text') return echapperTexte(n.value).replace(/ /g, '&nbsp;');
    if (n.nodeName === '#comment') return '';
    if (!n.tagName) return '';
    const tag = n.tagName.toLowerCase();
    const svg = dansSvg || tag === 'svg';
    if (svg ? !BALISES_SVG.has(tag) : !BALISES.has(tag)) {
      retires.push({ quoi: 'élément', detail: tag });
      // on garde le texte des éléments inconnus, jamais le contenu des scripts / styles
      if (['script', 'style', 'noscript', 'template', 'object', 'embed', 'form', 'input', 'textarea', 'select', 'link', 'meta', 'base'].includes(tag)) return '';
      return (n.childNodes || []).map((k) => ecrire(k, svg)).join('');
    }
    let attrs = '';
    let aTarget = false;
    let aRel = false;
    for (const a of n.attrs || []) {
      const nom = nomAttr(a);
      if (!attrPermis(tag, nom, svg)) { retires.push({ quoi: 'attribut', detail: tag + ' ' + nom }); continue; }
      let val = a.value;
      if (nom === 'style') {
        val = assainirStyle(val, retires);
        if (!val) continue;
      } else if (!valeurAttrSure(tag, nom, val, retires)) {
        retires.push({ quoi: 'attribut', detail: tag + ' ' + nom + '="' + String(val).slice(0, 80) + '"' });
        continue;
      }
      if (nom === 'target' && val === '_blank') aTarget = true;
      if (nom === 'rel') { aRel = true; if (aTarget || /_blank/.test(val)) val = /noopener/.test(val) ? val : (val + ' noopener').trim(); }
      if (BOOLEENS.has(nom) && (val === '' || val === nom)) attrs += ' ' + nom;
      else attrs += ' ' + nom + '="' + echapperAttr(val) + '"';
    }
    if (tag === 'a' && aTarget && !aRel) attrs += ' rel="noopener"';
    if (tag === 'iframe' && !/\sloading=/.test(attrs)) attrs += ' loading="lazy"';
    if (tag === 'img' && !/\sloading=/.test(attrs)) attrs += ' loading="lazy"';
    if (tag === 'img' && !/\sdecoding=/.test(attrs)) attrs += ' decoding="async"';
    if (tag === 'button' && !/\stype=/.test(attrs)) attrs = ' type="button"' + attrs;
    const kids = n.nodeName === 'template' ? [] : (n.childNodes || []);
    if (VIDES.has(tag)) return '<' + tag + attrs + '>';
    const inner = kids.map((k) => ecrire(k, svg)).join('');
    const nomEcrit = svg ? n.tagName : tag;
    return '<' + nomEcrit + attrs + '>' + inner + '</' + nomEcrit + '>';
  };
  const out = frag.childNodes.map((k) => ecrire(k, false)).join('');
  return { html: out, retires };
}

/** Le HTML ressort-il intact du filtre ? (utile pour les tests des blocs) */
export function estDejaPropre(html) {
  const r = assainirHtml(html);
  return r.retires.length === 0;
}
