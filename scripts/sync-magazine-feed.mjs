#!/usr/bin/env node
/**
 * Resynchronise tout ce qui decoule de la liste du magazine.
 *
 * Source de verite : magazine/index.html — les <article class="mag-card">.
 * C'est la page que l'on edite a la main quand on publie un article ; tout le
 * reste doit en decouler, sinon ca se desynchronise (le flux annoncait 14
 * articles sur 24, dix articles ecrits que personne ne pouvait decouvrir).
 *
 * Ce script regenere :
 *   1. le balisage CollectionPage + ItemList + fil d'Ariane dans magazine/index.html
 *   2. blog-feed.xml, avec les 24 articles
 *
 * Relancable sans risque : le bloc injecte est delimite par des commentaires,
 * et le flux est reecrit entierement a chaque passage.
 *
 * Usage : node scripts/sync-magazine-feed.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

const RACINE = path.resolve(import.meta.dirname, '..');
const MAGAZINE = path.join(RACINE, 'magazine', 'index.html');
const FLUX = path.join(RACINE, 'blog-feed.xml');
const SITE = 'https://gamedoor41.fr';

const DEBUT = '  <!-- magazine:balisage-genere — produit par scripts/sync-magazine-feed.mjs, ne pas editer a la main -->';
const FIN = '  <!-- /magazine:balisage-genere -->';

/* --- Lecture des cartes ------------------------------------------------- */

function lireCartes(html) {
  const cartes = [];
  const bloc = /<article class="mag-card">([\s\S]*?)<\/article>/g;
  let m;
  while ((m = bloc.exec(html)) !== null) {
    const c = m[1];
    const href = (c.match(/<a href="(\/post\/[^"]+)"/) || [])[1];
    const titre = (c.match(/<h3 class="mag-card-title">([\s\S]*?)<\/h3>/) || [])[1];
    const extrait = (c.match(/<p class="mag-card-excerpt">([\s\S]*?)<\/p>/) || [])[1];
    const date = (c.match(/<time datetime="([\d-]+)"/) || [])[1];
    const categorie = (c.match(/<span class="post-cat [a-z-]*">([^<]*)<\/span>/) || [])[1];
    const image = (c.match(/<img[^>]+src="([^"]+)"/) || [])[1];
    if (!href || !titre || !date) {
      console.warn('  carte ignoree (incomplete) : ' + (href || titre || '?'));
      continue;
    }
    cartes.push({
      href,
      slug: href.replace(/^\/post\//, '').replace(/\/$/, ''),
      titre: titre.trim(),
      extrait: (extrait || '').trim(),
      date,
      categorie: (categorie || 'Magazine').trim(),
      image: image || '/img/og/og-default.jpg',
    });
  }
  return cartes;
}

/* La meta description de l'article est plus complete que l'extrait affiche :
   c'est elle qu'on veut dans le flux, quand elle existe. */
function descriptionArticle(slug, repli) {
  const f = path.join(RACINE, 'post', slug, 'index.html');
  if (!fs.existsSync(f)) return repli;
  const h = fs.readFileSync(f, 'utf8');
  const d = (h.match(/<meta name="description" content="([^"]*)"/) || [])[1];
  return d ? d.trim() : repli;
}

/* --- Sorties ------------------------------------------------------------ */

const deshtml = (s) => s
  .replace(/<[^>]*>/g, '')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&#39;|&rsquo;/g, "'")
  .replace(/\s+/g, ' ')
  .trim();

const pourJson = (s) => JSON.stringify(deshtml(s)).slice(1, -1);

function balisage(cartes) {
  const items = cartes.map((c, i) => `        {
          "@type": "ListItem",
          "position": ${i + 1},
          "url": "${SITE}${c.href}",
          "name": "${pourJson(c.titre)}"
        }`).join(',\n');

  return `${DEBUT}
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Magazine GAMEDOOR\u00b741",
    "description": "Guides et conseils sorties, escape game, quiz, anniversaires, EVJF/EVG et team building \u00e0 Caen.",
    "url": "${SITE}/magazine/",
    "inLanguage": "fr-FR",
    "isPartOf": { "@type": "WebSite", "name": "GAMEDOOR\u00b741", "url": "${SITE}/" },
    "publisher": { "@type": "Organization", "name": "GAMEDOOR\u00b741", "url": "${SITE}/" },
    "mainEntity": {
      "@type": "ItemList",
      "numberOfItems": ${cartes.length},
      "itemListOrder": "https://schema.org/ItemListOrderDescending",
      "itemListElement": [
${items}
      ]
    }
  }
  </script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Accueil", "item": "${SITE}/" },
      { "@type": "ListItem", "position": 2, "name": "Magazine", "item": "${SITE}/magazine/" }
    ]
  }
  </script>
${FIN}`;
}

const RFC822 = (iso) => new Date(iso + 'T10:00:00Z').toUTCString();

function flux(cartes) {
  const recent = cartes.map((c) => c.date).sort().pop();
  const items = cartes.map((c) => {
    const desc = descriptionArticle(c.slug, c.extrait);
    return `  <item>
    <title><![CDATA[ ${deshtml(c.titre)} ]]></title>
    <description><![CDATA[ ${deshtml(desc)} ]]></description>
    <link>${SITE}${c.href}</link>
    <guid isPermaLink="false">gamedoor41-${c.slug}</guid>
    <category><![CDATA[ ${c.categorie} ]]></category>
    <pubDate>${RFC822(c.date)}</pubDate>
    <dc:creator>GAMEDOOR\u00b741</dc:creator>
  </item>`;
  }).join('\n\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom" version="2.0">
<channel>
  <title><![CDATA[ GAMEDOOR\u00b741 — Magazine ]]></title>
  <description><![CDATA[ Magazine GAMEDOOR\u00b741 — escape game, quiz Buzz Your Brain, team building, EVJF/EVG, mariages et anniversaires \u00e0 Caen. Anciennement Brain Escape Game. ]]></description>
  <link>${SITE}/magazine/</link>
  <language>fr</language>
  <generator>GAMEDOOR\u00b741</generator>
  <atom:link href="${SITE}/blog-feed.xml" rel="self" type="application/rss+xml"/>
  <lastBuildDate>${RFC822(recent)}</lastBuildDate>

${items}

</channel>
</rss>
`;
}

/* --- Execution ---------------------------------------------------------- */

const html = fs.readFileSync(MAGAZINE, 'utf8');
const cartes = lireCartes(html);
if (cartes.length < 10) {
  console.error('Seulement ' + cartes.length + ' cartes lues : la page a du changer de structure. Rien ecrit.');
  process.exit(1);
}
console.log(cartes.length + ' articles lus dans magazine/index.html');

/* Remplacement par reperage des bornes plutot que par expression reguliere :
   le bloc contient des caracteres qu'il faudrait echapper, source d'erreurs. */
const i = html.indexOf(DEBUT);
const j = html.indexOf(FIN);
let nouveau;
if (i >= 0 && j > i) {
  nouveau = html.slice(0, i) + balisage(cartes) + html.slice(j + FIN.length);
  console.log('  balisage remplace dans magazine/index.html');
} else {
  nouveau = html.replace('</head>', balisage(cartes) + '\n</head>');
  console.log('  balisage ajoute dans magazine/index.html');
}

fs.writeFileSync(MAGAZINE, nouveau, 'utf8');
fs.writeFileSync(FLUX, flux(cartes), 'utf8');
console.log('  blog-feed.xml reecrit — ' + cartes.length + ' articles');
