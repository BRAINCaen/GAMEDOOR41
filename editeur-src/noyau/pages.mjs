// ==========================================================================
// Éditeur du site — NOUVELLES PAGES et PLAN DU SITE
//
// Une nouvelle page part d'une page existante (« modèle ») :
//  - « vierge »  : on garde l'en-tête du site, le menu, le pied de page et les
//                  scripts communs ; le contenu central est remplacé par une
//                  section de départ (titre H1 + phrase) ;
//  - « copie »   : tout le contenu du modèle est recopié (à réécrire ensuite).
// Dans les deux cas : nouveau <title>, description, adresse canonique, partage
// (og:*), données structurées du modèle retirées (elles décrivaient l'autre
// page), lien « actif » du menu retiré. La page est ajoutée au sitemap.xml.
// Module PUR.
// ==========================================================================

import { ErreurEditeur, construireArbre, serialiser, elements, attr, classes, definirAttr, echapperTexteFr, echapperAttr } from './arbre.mjs';

const SITE = 'https://gamedoor41.fr';
export const CHEMIN_PAGE_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*){0,2}$/;
const RESERVES = new Set(['editeur', 'editeur-src', 'netlify', 'css', 'js', 'img', 'video', 'data', 'scripts', 'apps-script', 'signatures', 'api', 'node_modules', 'reserver']);

/** « Soirée Halloween 2027 ! » → « soiree-halloween-2027 » */
export function slugifier(texte) {
  return String(texte || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/['’]/g, '-').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-').slice(0, 70);
}

/** Vérifie l'adresse d'une nouvelle page (« post/mon-article », « soiree-halloween »). */
export function verifierChemin(slug, existants) {
  const s = String(slug || '').replace(/^\/+|\/+$/g, '');
  if (!CHEMIN_PAGE_RE.test(s)) throw new ErreurEditeur('Adresse de page invalide : lettres minuscules, chiffres et tirets (ex. « soiree-halloween »).', 'CHEMIN');
  if (RESERVES.has(s.split('/')[0])) throw new ErreurEditeur('Cette adresse est réservée au fonctionnement du site.', 'CHEMIN');
  const fichier = s + '/index.html';
  if (existants && existants.has(fichier)) throw new ErreurEditeur('Une page existe déjà à cette adresse : /' + s + '/', 'CHEMIN');
  return { slug: s, fichier, url: SITE + '/' + s + '/' };
}

const enfantsEl = (el) => el.enfants.filter((k) => k.t === 'el');

/**
 * Construit le HTML d'une nouvelle page à partir d'un modèle.
 * @param {string} modele  HTML de la page modèle
 * @param {object} o       { slug, titre, description, h1, intro, mode: 'vierge'|'copie' }
 */
export function creerPage(modele, o) {
  const { slug, url } = verifierChemin(o.slug);
  const titre = String(o.titre || '').replace(/\s+/g, ' ').trim();
  const description = String(o.description || '').replace(/\s+/g, ' ').trim();
  const h1 = String(o.h1 || titre).replace(/\s+/g, ' ').trim();
  if (titre.length < 5) throw new ErreurEditeur('Donnez un titre à la page (5 caractères au moins).', 'META');
  if (description.length < 20) throw new ErreurEditeur('Donnez une description de la page (20 caractères au moins) : c’est le texte affiché par Google.', 'META');
  const arbre = construireArbre(modele);
  const tous = [...elements(arbre.racine)];
  const head = tous.find((e) => e.tag === 'head');
  const body = tous.find((e) => e.tag === 'body');
  if (!head || !body) throw new ErreurEditeur('Page modèle illisible.', 'MODELE');

  // ---- en-tête HTML
  for (const el of [...elements(head)]) {
    if (el.tag === 'title') el.enfants = [{ t: 'gen', html: echapperTexteFr(titre), parent: el }];
    if (el.tag === 'link' && attr(el, 'rel') === 'canonical') definirAttr(el, 'href', url);
    if (el.tag === 'meta') {
      const n = attr(el, 'name') || attr(el, 'property');
      if (n === 'description' || n === 'og:description' || n === 'twitter:description') definirAttr(el, 'content', description);
      if (n === 'og:title' || n === 'twitter:title') definirAttr(el, 'content', titre);
      if (n === 'og:url') definirAttr(el, 'content', url);
      if (n === 'robots') definirAttr(el, 'content', 'index, follow');
    }
  }
  // données structurées du modèle : elles décrivaient l'autre page
  const retirer = (el) => { const i = el.parent.enfants.indexOf(el); el.parent.enfants.splice(i, 1); };
  for (const el of [...elements(arbre.racine)]) {
    if (el.tag === 'script' && attr(el, 'type') === 'application/ld+json' && el.parent) retirer(el);
  }
  // le lien du menu « actif » désignait la page modèle
  for (const el of elements(body)) {
    if (el.tag === 'a' && classes(el).includes('active')) definirAttr(el, 'class', classes(el).filter((c) => c !== 'active').join(' '));
    if (el.tag === 'a' && attr(el, 'aria-current')) definirAttr(el, 'aria-current', 'false');
  }
  definirAttr(body, 'class', [...classes(body).filter((c) => !/-page$/.test(c)), 'page-' + slug.replace(/\//g, '-')].join(' '));

  // ---- contenu
  if ((o.mode || 'vierge') === 'vierge') {
    const kids = enfantsEl(body);
    const iHeader = kids.findIndex((e) => e.tag === 'header');
    const iFooter = kids.findIndex((e) => e.tag === 'footer');
    if (iHeader < 0 || iFooter < 0 || iFooter < iHeader) throw new ErreurEditeur('Le modèle n’a pas d’en-tête et de pied de page reconnaissables.', 'MODELE');
    const debut = body.enfants.indexOf(kids[iHeader]) + 1;
    const fin = body.enfants.indexOf(kids[iFooter]);
    const exemple = !String(o.intro || '').trim();
    const intro = exemple ? 'Présentez ici votre nouvelle page en une ou deux phrases.' : String(o.intro).trim();
    const section = '\n\n  <main id="contenu" class="gdb-page">\n    <section class="section gdb-section">\n      <div class="container">\n        <h1 class="gdb-titre-page">' + echapperTexteFr(h1) + '</h1>\n        <p class="gdb-texte"' + (exemple ? ' data-gdb-exemple=""' : '') + '>' + echapperTexteFr(intro) + '</p>\n      </div>\n    </section>\n  </main>\n\n';
    body.enfants.splice(debut, fin - debut, { t: 'gen', html: section, parent: body });
  }
  return { html: serialiser(arbre), fichier: slug + '/index.html', url };
}

/** Ajoute une adresse au sitemap.xml (sans rien retirer). */
export function ajouterAuSitemap(xml, url, date) {
  const s = String(xml);
  if (s.includes('<loc>' + url + '</loc>')) return s;
  const i = s.lastIndexOf('</urlset>');
  if (i < 0) throw new ErreurEditeur('Plan du site illisible.', 'SITEMAP');
  const bloc = '  <url>\n    <loc>' + echapperAttr(url) + '</loc>\n    <lastmod>' + date + '</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>\n';
  return s.slice(0, i) + bloc + s.slice(i);
}

/** Met à jour la date de dernière modification d'une page dans le sitemap (si elle y est). */
export function majDateSitemap(xml, url, date) {
  const s = String(xml);
  const i = s.indexOf('<loc>' + url + '</loc>');
  if (i < 0) return s;
  const fin = s.indexOf('</url>', i);
  const bloc = s.slice(i, fin);
  const nouveau = bloc.replace(/<lastmod>[^<]*<\/lastmod>/, '<lastmod>' + date + '</lastmod>');
  return s.slice(0, i) + nouveau + s.slice(fin);
}

/** URL publique d'un fichier de page (« tarifs/index.html » → « https://gamedoor41.fr/tarifs/ »). */
export function urlDeFichier(fichier) {
  if (fichier === 'index.html') return SITE + '/';
  return SITE + '/' + fichier.replace(/index\.html$/, '');
}
