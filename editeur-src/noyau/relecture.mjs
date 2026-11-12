// ==========================================================================
// Éditeur du site — RELECTURE AUTOMATIQUE avant publication
//
// Ne relit QUE ce qui est ajouté ou modifié (le contenu déjà publié n'est
// pas reproché à la personne qui modifie). Niveaux :
//   bloquant  : la publication est refusée tant que ce n'est pas corrigé
//   attention : signalé, la personne décide
//   info      : simple remarque
// Les règles « maison » sont réglables par un admin (Réglages de l'éditeur) ;
// REGLES_DEFAUT reprend les consignes d'Allan connues au 12/11/2026.
// Module PUR.
// ==========================================================================

import { elements, texteDecode, texteVisible, attr, classes } from './arbre.mjs';

export const REGLES_DEFAUT = [
  { motif: 'annulation (gratuite|sans frais)|annuler (gratuitement|sans frais)', niveau: 'bloquant', message: 'Jamais d’annulation gratuite : on parle de report (garantie report).' },
  { motif: 'rembours', niveau: 'bloquant', message: 'Jamais de remboursement promis.' },
  { motif: 'lorem ipsum', niveau: 'bloquant', message: 'Texte d’exemple encore présent.' },
  { motif: 'facultati(f|ve)', niveau: 'attention', message: 'Écrivez « si vous voulez » plutôt que « facultatif ».' },
  { motif: 'appelez[- ]nous|t[ée]l[ée]phonez[- ]nous|appelez[- ]le|contactez[- ]nous par t[ée]l[ée]phone', niveau: 'attention', message: 'On n’invite pas à appeler : renvoyez vers la réservation en ligne ou contact@gamedoor41.fr.' },
  { motif: 'b\\.r\\.a\\.i\\.n', niveau: 'attention', message: 'Le nom de la société est GAMEDOOR·41 (BRAIN reste seulement le nom des escape games).' },
  { motif: 'valable (1|un) an|validit[ée] (d.)?(1|un) an|illimit[ée]', niveau: 'attention', message: 'Cartes cadeaux, bons et avoirs : valables 12 mois.' },
  { motif: '17[,.]50', niveau: 'attention', message: 'Le tarif entreprise (17,50 €) ne s’affiche pas au grand public.' },
  { motif: 'salle (des|pour( les)?) d[ée]butants', niveau: 'attention', message: 'Aucune salle n’est « pour débutants » : le niveau se choisit dans chaque salle.' },
  { motif: 'escape box', niveau: 'attention', message: 'L’Escape Box n’est plus proposée.' },
  { motif: 'pay(ez|er) sur place|paiement sur place', niveau: 'attention', message: 'Le paiement se fait à la réservation : vérifiez cette phrase.' },
  { motif: '\\bm²|\\bm2\\b', niveau: 'info', message: 'Les surfaces ne sont pas annoncées sur le site.' },
];

/** Textes ajoutés ou modifiés dans la page (avec l'élément concerné). */
export function textesModifies(page) {
  const out = [];
  const corps = page.corps();
  if (!corps) return out;
  for (const el of elements(corps)) {
    if (['script', 'style', 'noscript', 'svg', 'template'].includes(el.tag)) continue;
    let dansSvg = false;
    for (let p = el.parent; p; p = p.parent) if (p.tag === 'svg' || p.tag === 'script' || p.tag === 'style') dansSvg = true;
    if (dansSvg) continue;
    const parts = [];
    for (const k of el.enfants) {
      if (k.t === 'txt' && !k.rawtext && (el.nouveau || k.brut != null)) parts.push(texteDecode(k));
      if (k.t === 'gen' && el.nouveau) parts.push(k.html);
    }
    const t = parts.join(' ').replace(/\s+/g, ' ').trim();
    if (t) out.push({ id: el.id, texte: t });
  }
  return out;
}

/**
 * @param {import('./operations.mjs').Page} page
 * @param {object} [ctx] { regles, pagesExistantes: Set<'/tarifs/'> }
 * @returns {{niveau: string, message: string, id?: string, extrait?: string}[]}
 */
export function relire(page, ctx = {}) {
  const res = [...page.avertissements];
  const regles = (ctx.regles && ctx.regles.length ? ctx.regles : REGLES_DEFAUT).filter((r) => r && r.motif);
  const textes = textesModifies(page);
  for (const r of regles) {
    let re;
    try { re = new RegExp(r.motif, 'i'); } catch (_) { continue; }
    for (const t of textes) {
      const m = re.exec(t.texte);
      if (m) res.push({ niveau: r.niveau || 'attention', message: r.message || ('Expression signalée : ' + m[0]), id: t.id, extrait: extrait(t.texte, m.index) });
    }
  }
  const corps = page.corps();
  if (!corps) return res;
  for (const el of elements(corps)) {
    if (!el.nouveau) continue;
    if (attr(el, 'data-gdb-exemple') != null) {
      res.push({ niveau: 'bloquant', message: el.tag === 'img' ? 'Image d’exemple pas encore remplacée.' : 'Texte d’exemple pas encore remplacé : « ' + texteVisible(el).slice(0, 60) + ' »', id: el.id });
    }
    if (el.tag === 'img' && !(attr(el, 'alt') || '').trim() && attr(el, 'aria-hidden') !== 'true' && attr(el, 'role') !== 'presentation') {
      res.push({ niveau: 'bloquant', message: 'Image sans description (texte alternatif) : décrivez-la en quelques mots pour Google et les personnes malvoyantes.', id: el.id });
    }
    if (el.tag === 'a') {
      const href = (attr(el, 'href') || '').trim();
      if (!href || href === '#') res.push({ niveau: 'attention', message: 'Lien sans adresse : « ' + texteVisible(el).slice(0, 40) + ' »', id: el.id });
      else if (ctx.pagesExistantes && /^\/(?!\/)/.test(href) && !/^\/(img|video|css|js)\//.test(href)) {
        const chemin = href.split(/[?#]/)[0].replace(/\/?$/, '/');
        if (!ctx.pagesExistantes.has(chemin)) res.push({ niveau: 'attention', message: 'Lien vers une page qui n’existe pas : ' + href, id: el.id });
      }
      if (!texteVisible(el) && !attr(el, 'aria-label') && ![...elements(el)].some((d) => d.tag === 'img' && attr(d, 'alt'))) {
        res.push({ niveau: 'attention', message: 'Lien sans texte : ajoutez un libellé.', id: el.id });
      }
      if (/^(cliquez ici|ici|lien)$/i.test(texteVisible(el))) res.push({ niveau: 'info', message: 'Un lien « cliquez ici » n’aide ni Google ni les lecteurs d’écran : décrivez la destination.', id: el.id });
    }
    if (el.tag === 'iframe' && !(attr(el, 'title') || '').trim()) res.push({ niveau: 'info', message: 'Vidéo ou carte sans titre : ajoutez-en un (accessibilité).', id: el.id });
  }
  // titres : pas de saut de niveau dans le contenu ajouté
  let precedent = 0;
  for (const el of elements(corps)) {
    const m = /^h([1-6])$/.exec(el.tag);
    if (!m) continue;
    const n = Number(m[1]);
    if (el.nouveau && precedent && n > precedent + 1) res.push({ niveau: 'info', message: 'Titre de niveau ' + n + ' après un titre de niveau ' + precedent + ' : un niveau est sauté.', id: el.id });
    precedent = n;
  }
  return res;
}

function extrait(texte, i) {
  const a = Math.max(0, i - 30);
  return (a > 0 ? '…' : '') + texte.slice(a, i + 50) + (i + 50 < texte.length ? '…' : '');
}

export const aDesBloquants = (liste) => liste.some((r) => r.niveau === 'bloquant');
