#!/usr/bin/env node
// Rotate-reviews — pick aleatoire de N reviews thematiques du pool
// data/google-reviews.json, puis injection entre les marqueurs HTML
// commentes <!-- REVIEWS:START theme=... n=3 --> ... <!-- REVIEWS:END -->.
//
// Les avis sont declares UNE SEULE FOIS, en JSON-LD, dans la propriete
// "review" de la fiche Product de la page (cf. injectProductReviews).
// Les cartes visibles sont du HTML nu, sans microdata.
//
// Historique : jusqu'au 06/08/2026 chaque carte portait sa propre microdata
// (itemscope Review + itemReviewed Product). Google y voyait donc, en plus de
// la fiche Product de la page, 3 fiches Product supplementaires reduites a un
// simple "name" — sans offers ni review ni aggregateRating. D'ou l'erreur
// Search Console « Il faut indiquer "offers", "review", ou "aggregateRating" »
// sur 12 elements (3 avis x 4 pages), ouverte le 25/06/2026.
// Ne jamais reintroduire de microdata Schema.org dans les cartes : deux
// formats pour la meme entite = deux entites pour Google.
//
// Usage :
//   node scripts/rotate-reviews.mjs             # rotation + ecrit les fichiers
//   node scripts/rotate-reviews.mjs --dry-run   # log seulement, n'ecrit pas
//   node scripts/rotate-reviews.mjs --commit    # rotation + git add/commit
//
// IMPORTANT : ne pousse JAMAIS automatiquement. Le push reste manuel.

import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(process.cwd());
const POOL_PATH = path.join(ROOT, 'data', 'google-reviews.json');

// --- Config -------------------------------------------------------------

// Couleur d'accent par theme (var CSS). Permet de garder le coloris coherent
// avec chaque univers (escape orange, quiz violet).
const ACCENT_BY_THEME = {
  'garde-a-vue': 'var(--gd-escape-on-dark)',
  'psychiatric': 'var(--gd-escape-on-dark)',
  'back-to-80s': 'var(--gd-escape-on-dark)',
  'quiz': 'var(--gd-quiz)',
};

const PAGES = [
  {
    path: 'escape-game-caen/garde-a-vue/index.html',
    theme: 'garde-a-vue',
    n: 3,
    headingHtml: 'Ce qu\'ils ont vécu <span style="color:{accent};">en Garde à Vue</span>',
  },
  {
    path: 'escape-game-caen/psychiatric/index.html',
    theme: 'psychiatric',
    n: 3,
    headingHtml: 'Ce qu\'ils ont vécu <span style="color:{accent};">à Psychiatric</span>',
  },
  {
    path: 'escape-game-caen/back-to-the-80s/index.html',
    theme: 'back-to-80s',
    n: 3,
    headingHtml: 'Ce qu\'ils ont vécu <span style="color:{accent};">en Back to the 80\'s</span>',
  },
  {
    path: 'quiz-game-caen/index.html',
    theme: 'quiz',
    n: 3,
    headingHtml: 'Ce qu\'ils ont vécu <span style="color:{accent};">à Buzz Your Brain</span>',
  },
];

// --- Helpers ------------------------------------------------------------

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Les vrais avis Google passent AVANT les temoignages source="fictive" :
// eux seuls peuvent etre balises pour les moteurs (cf. buildReviewNodes), et
// une page vitrine a tout interet a montrer d'abord de l'authentique. Les
// fictifs ne servent que de complement quand le pool thematique est trop
// maigre. La rotation reste aleatoire a l'interieur de chaque groupe.
function pickReviews(pool, theme, n) {
  const eligible = pool.filter((r) => Array.isArray(r.themes) && r.themes.includes(theme));
  if (eligible.length < n) {
    console.warn(`  WARNING: theme="${theme}" only ${eligible.length} reviews available, asked ${n}`);
  }
  const authentiques = shuffle(eligible.filter((r) => r.source === 'google'));
  const complement = shuffle(eligible.filter((r) => r.source !== 'google'));
  return [...authentiques, ...complement].slice(0, n);
}

// Build la carte visible. HTML nu : aucune microdata Schema.org ici, le
// balisage de ces avis vit dans la fiche Product JSON-LD de la page.
function buildReviewArticle(review, accentColor) {
  const fullStars = Math.max(0, Math.min(5, Math.round(review.rating || 5)));
  const stars = '★'.repeat(fullStars) + '☆'.repeat(5 - fullStars);
  const text = escapeHtml(review.text || '').replace(/\s+/g, ' ').trim();
  const author = escapeHtml(review.author || 'Anonyme');
  const context = escapeHtml(review.context || '');

  return `        <article class="info-card-mag">
          <div style="color:${accentColor};font-size:1.2rem;margin-bottom:10px;letter-spacing:2px;" aria-label="${fullStars} étoiles sur 5">${stars}</div>
          <p style="font-style:italic;color:var(--grey-light);line-height:1.6;">«&nbsp;${text}&nbsp;»</p>
          <p style="margin-top:12px;font-size:0.9rem;color:var(--grey);"><strong style="color:var(--white);">${author}</strong>${context ? ` &middot; ${context}` : ''}</p>
        </article>`;
}

// Les memes avis, en noeuds Schema.org Review destines a la fiche Product.
// Texte brut (pas d'entites HTML) : c'est du JSON, pas du HTML.
//
// SEULS les avis source="google" sont balises. Le pool contient aussi des
// temoignages source="fictive" : les declarer a Google comme de vrais avis
// serait un faux avis au sens du code de la consommation et un motif de
// penalite manuelle. Ils restent affiches, ils ne sont simplement pas
// transmis aux moteurs. Une page peut donc n'avoir aucun "review" — elle
// reste valide grace a "offers".
function buildReviewNodes(reviews) {
  return reviews.filter((r) => r.source === 'google').map((review) => {
    const fullStars = Math.max(1, Math.min(5, Math.round(review.rating || 5)));
    const node = {
      '@type': 'Review',
      author: { '@type': 'Person', name: review.author || 'Anonyme' },
      reviewRating: {
        '@type': 'Rating',
        ratingValue: String(fullStars),
        bestRating: '5',
      },
      reviewBody: String(review.text || '').replace(/\s+/g, ' ').trim(),
    };
    if (review.date) node.datePublished = review.date;
    return node;
  });
}

// Google EXIGE une note agregee des qu'une fiche porte plusieurs avis :
// « Avis multiples sans objet aggregateRating » est une erreur critique, elle
// empeche la page d'apparaitre en resultat enrichi (alerte Search Console du
// 06/08/2026, provoquee par la correction precedente qui avait retire toute
// note agregee des fiches Product).
//
// ATTENTION a ne pas refaire l'erreur inverse : cette note n'est PAS celle de
// l'etablissement (4.9 sur 2 170 avis). Elle resume UNIQUEMENT les avis
// presents sur cette page. Recopier la note de l'etablissement sur une fiche
// produit est un motif de penalite Google — c'est ce qui avait declenche
// l'alerte initiale du 25/06/2026.
function buildAggregateRating(reviewNodes) {
  if (reviewNodes.length === 0) return null;
  const notes = reviewNodes.map((r) => Number(r.reviewRating.ratingValue));
  const moyenne = notes.reduce((a, b) => a + b, 0) / notes.length;
  return {
    '@type': 'AggregateRating',
    ratingValue: String(Math.round(moyenne * 10) / 10),
    reviewCount: String(reviewNodes.length),
    bestRating: '5',
    worstRating: '1',
  };
}

// Reecrit la propriete "review" de la fiche Product JSON-LD de la page.
// Chirurgical : ne touche que ce bloc, et rend le fichier inchange si aucune
// fiche Product parsable n'est trouvee (mieux vaut ne rien faire que casser).
function injectProductReviews(content, filePath, reviewNodes) {
  const blocks = [...content.matchAll(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
  )];

  for (const match of blocks) {
    let node;
    try {
      node = JSON.parse(match[1]);
    } catch {
      continue; // bloc non parsable : ce n'est pas a nous de le reparer
    }
    if (!node || node['@type'] !== 'Product') continue;

    const note = buildAggregateRating(reviewNodes);
    if (note) {
      node.aggregateRating = note;
      node.review = reviewNodes;
    } else {
      // Aucun avis authentique a declarer sur cette page : on ne laisse ni
      // avis ni note. Search Console signalera "champ review manquant" et
      // "champ aggregateRating manquant", mais ce sont des suggestions non
      // critiques — et mieux vaut un champ absent qu'une note inventee.
      delete node.aggregateRating;
      delete node.review;
    }
    const json = JSON.stringify(node, null, 2)
      .split('\n')
      .map((line) => '  ' + line)
      .join('\n');
    const rebuilt = `<script type="application/ld+json">\n${json}\n  </script>`;

    return content.slice(0, match.index) + rebuilt
      + content.slice(match.index + match[0].length);
  }

  console.warn(`  WARNING: aucune fiche Product JSON-LD dans ${filePath} — avis non balises`);
  return content;
}

// Garde-fou : on n'ecrit jamais un fichier dont un bloc JSON-LD serait casse.
function assertJsonLdValid(content, filePath) {
  const blocks = [...content.matchAll(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
  )];
  blocks.forEach((match, i) => {
    try {
      JSON.parse(match[1]);
    } catch (err) {
      throw new Error(`${filePath} : bloc JSON-LD ${i} invalide apres reecriture — ${err.message}`);
    }
  });
}

// Build le bloc complet entre marqueurs (section + grid + articles).
function buildReviewsSection(reviews, page, rating, reviewCount) {
  const accent = ACCENT_BY_THEME[page.theme] || 'var(--gd-escape-on-dark)';
  const articles = reviews
    .map((r) => buildReviewArticle(r, accent))
    .join('\n');
  const countFmt = reviewCount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const ratingFmt = Number(rating).toFixed(1);
  const heading = (page.headingHtml || 'Ce qu\'ils ont vécu <span style="color:{accent};">chez GAMEDOOR&middot;41</span>')
    .replace(/\{accent\}/g, accent);
  return `<!-- REVIEWS:START theme=${page.theme} n=${reviews.length} -->
  <!-- TEMOIGNAGES JOUEURS — cartes visibles, rotation auto. Le balisage
       Schema.org de ces avis est dans la fiche Product JSON-LD du <head>,
       pas ici : ne PAS rajouter d'itemscope/itemprop dans ce bloc. -->
  <section class="section" style="padding:60px 0;">
    <div class="container">
      <div class="section-header-editorial fade-in" data-num="05">
        <p class="kicker" style="color:${accent};">&#9656; Ils en parlent</p>
        <h2>${heading}</h2>
      </div>
      <div class="info-grid-magazine fade-in">
${articles}
      </div>
      <p style="text-align:center;margin-top:32px;font-size:0.95rem;color:var(--grey-light);">
        Note moyenne <strong style="color:var(--white);">${ratingFmt}/5</strong> sur <a href="https://g.page/r/CUTt-ugPQ0YREBM/review" target="_blank" rel="noopener" style="color:${accent};">${countFmt} avis Google</a> pour l'ensemble de GAMEDOOR&middot;41.
      </p>
    </div>
  </section>
  <!-- REVIEWS:END -->`;
}

// Insere la section reviews avant le commentaire <!-- FAQ -->, si pas
// deja de marqueurs REVIEWS:START dans le fichier.
function insertOrReplace(content, sectionBlock) {
  const markerRe = /<!--\s*REVIEWS:START[\s\S]*?<!--\s*REVIEWS:END\s*-->/;
  if (markerRe.test(content)) {
    return content.replace(markerRe, sectionBlock);
  }
  // Pas de marqueurs : insertion avant le bloc FAQ.
  const faqMarker = '<!-- FAQ -->';
  const idx = content.indexOf(faqMarker);
  if (idx === -1) {
    throw new Error('Cannot find <!-- FAQ --> marker for insertion');
  }
  // Garde l'indentation cohérente avec le contexte.
  return content.slice(0, idx) + sectionBlock + '\n\n  ' + content.slice(idx);
}

// --- Main ---------------------------------------------------------------

async function main() {
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has('--dry-run');
  const doCommit = args.has('--commit');

  const pool = JSON.parse(await fs.readFile(POOL_PATH, 'utf8'));
  const reviews = Array.isArray(pool.reviews) ? pool.reviews : [];
  console.log(`Pool loaded: ${reviews.length} reviews (rating ${pool.rating}, count ${pool.reviewCount})`);

  let changedFiles = [];

  for (const page of PAGES) {
    const fullPath = path.join(ROOT, page.path);
    let content;
    try {
      content = await fs.readFile(fullPath, 'utf8');
    } catch (err) {
      console.warn(`  skip (${err.code}): ${page.path}`);
      continue;
    }

    const picked = pickReviews(reviews, page.theme, page.n);
    if (picked.length === 0) {
      console.warn(`  skip (no reviews for theme="${page.theme}"): ${page.path}`);
      continue;
    }

    const block = buildReviewsSection(picked, page, pool.rating || 4.9, pool.reviewCount || 2121);
    let updated = insertOrReplace(content, block);
    updated = injectProductReviews(updated, page.path, buildReviewNodes(picked));
    assertJsonLdValid(updated, page.path);

    if (updated === content) {
      console.log(`  unchanged: ${page.path}`);
      continue;
    }

    console.log(`  rewrite: ${page.path}  (theme=${page.theme}, picked=${picked.length})`);
    picked.forEach((r) => console.log(`    - ${r.author} [${r.source}] ${r.date}`));

    if (!dryRun) {
      await fs.writeFile(fullPath, updated, 'utf8');
    }
    changedFiles.push(page.path);
  }

  console.log(`\n${changedFiles.length} file(s) ${dryRun ? 'would be' : ''} updated.`);
  if (changedFiles.length === 0) {
    return;
  }

  if (doCommit && !dryRun) {
    console.log('\nCommitting changes...');
    execSync(`git add ${changedFiles.map((f) => `"${f}"`).join(' ')}`, { stdio: 'inherit', cwd: ROOT });
    execSync(`git commit -m "chore(reviews): rotation automatique des temoignages"`, { stdio: 'inherit', cwd: ROOT });
    console.log('Commit done. Push manually after review.');
  } else {
    console.log(`\n${changedFiles.length} changes ready to commit on ${changedFiles.length} file(s).`);
    console.log('Run with --commit to commit, or commit manually.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
