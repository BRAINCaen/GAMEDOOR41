#!/usr/bin/env node
// Rotate-reviews — pick aleatoire de N reviews thematiques du pool
// data/google-reviews.json, puis injection des blocs Schema.org Review
// VALIDES (objets imbriques itemReviewed/reviewRating/author) entre des
// marqueurs HTML commentes <!-- REVIEWS:START theme=... n=3 --> ... END.
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
    productName: 'Garde à Vue — Escape Game Caen',
    headingHtml: 'Ce qu\'ils ont vécu <span style="color:{accent};">en Garde à Vue</span>',
  },
  {
    path: 'escape-game-caen/psychiatric/index.html',
    theme: 'psychiatric',
    n: 3,
    productName: 'Psychiatric — Escape Game Horreur Caen',
    headingHtml: 'Ce qu\'ils ont vécu <span style="color:{accent};">à Psychiatric</span>',
  },
  {
    path: 'escape-game-caen/back-to-the-80s/index.html',
    theme: 'back-to-80s',
    n: 3,
    productName: "Back to the 80's — Escape Game Caen",
    headingHtml: 'Ce qu\'ils ont vécu <span style="color:{accent};">en Back to the 80\'s</span>',
  },
  {
    path: 'quiz-game-caen/index.html',
    theme: 'quiz',
    n: 3,
    productName: 'Buzz Your Brain — Quiz Game Caen',
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

function pickReviews(pool, theme, n) {
  const eligible = pool.filter((r) => Array.isArray(r.themes) && r.themes.includes(theme));
  if (eligible.length < n) {
    console.warn(`  WARNING: theme="${theme}" only ${eligible.length} reviews available, asked ${n}`);
  }
  return shuffle(eligible).slice(0, n);
}

// Build un bloc <article> Schema.org Review VALIDE (objets imbriques pour
// itemReviewed/reviewRating/author — cf fix 9e9977b).
function buildReviewArticle(review, productName, accentColor) {
  const fullStars = Math.max(0, Math.min(5, Math.round(review.rating || 5)));
  const stars = '★'.repeat(fullStars) + '☆'.repeat(5 - fullStars);
  const text = escapeHtml(review.text || '').replace(/\s+/g, ' ').trim();
  const author = escapeHtml(review.author || 'Anonyme');
  const context = escapeHtml(review.context || '');
  const date = escapeHtml(review.date || '');
  const product = escapeHtml(productName);

  return `        <article class="info-card-mag" itemscope itemtype="https://schema.org/Review">
          <div itemprop="itemReviewed" itemscope itemtype="https://schema.org/Product" style="display:none">
            <meta itemprop="name" content="${product}">
          </div>
          <div itemprop="reviewRating" itemscope itemtype="https://schema.org/Rating" style="display:none">
            <meta itemprop="ratingValue" content="${fullStars}">
            <meta itemprop="bestRating" content="5">
          </div>
          <div style="color:${accentColor};font-size:1.2rem;margin-bottom:10px;letter-spacing:2px;">${stars}</div>
          <p itemprop="reviewBody" style="font-style:italic;color:var(--grey-light);line-height:1.6;">«&nbsp;${text}&nbsp;»</p>
          <p style="margin-top:12px;font-size:0.9rem;color:var(--grey);"><span itemprop="author" itemscope itemtype="https://schema.org/Person"><strong itemprop="name" style="color:var(--white);">${author}</strong></span>${context ? ` &middot; ${context}` : ''}</p>
          <meta itemprop="datePublished" content="${date}">
        </article>`;
}

// Build le bloc complet entre marqueurs (section + grid + articles).
function buildReviewsSection(reviews, page, rating, reviewCount) {
  const accent = ACCENT_BY_THEME[page.theme] || 'var(--gd-escape-on-dark)';
  const articles = reviews
    .map((r) => buildReviewArticle(r, page.productName, accent))
    .join('\n');
  const countFmt = reviewCount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const ratingFmt = Number(rating).toFixed(1);
  const heading = (page.headingHtml || 'Ce qu\'ils ont vécu <span style="color:{accent};">chez GAMEDOOR&middot;41</span>')
    .replace(/\{accent\}/g, accent);
  return `<!-- REVIEWS:START theme=${page.theme} n=${reviews.length} -->
  <!-- TEMOIGNAGES JOUEURS — Schema Review pour SEO rich results (rotation auto) -->
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
    const updated = insertOrReplace(content, block);

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
