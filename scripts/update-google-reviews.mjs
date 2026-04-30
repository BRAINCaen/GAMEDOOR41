#!/usr/bin/env node
// Fetches the Google Places rating and review count, then updates all
// HTML files across the site. Designed to run nightly via GitHub Actions.
//
// Required env var:
//   GOOGLE_PLACES_API_KEY  — key with "Places API (New)" enabled

import fs from 'node:fs/promises';
import path from 'node:path';

// Text Search query — targets the Google Business listing (note/avis),
// not the street address. Robust to the Brain Escape Game → GAMEDOOR•41
// rebranding: both names will match as long as the business remains on
// the same address.
const SEARCH_QUERY = 'Brain Escape Game 41 bis rue Pasteur Caen';

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

if (!API_KEY) {
  console.error('Missing GOOGLE_PLACES_API_KEY env var.');
  process.exit(1);
}

const ROOT = path.resolve(process.cwd());

const HTML_FILES = [
  'index.html',
  'quiz-game-caen/index.html',
  'escape-game-caen/index.html',
  'escape-game-caen/garde-a-vue/index.html',
  'escape-game-caen/psychiatric/index.html',
  'escape-game-caen/back-to-the-80s/index.html',
  'team-building-caen/index.html',
  'evjf-caen/index.html',
  'evg-caen/index.html',
  'anniversaire-caen/index.html',
  'cadeau/index.html',
  'tarifs/index.html',
  'references-entreprises-caen/index.html',
  'contact/index.html',
  'devis/index.html',
];

async function fetchPlace() {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.rating,places.userRatingCount,places.formattedAddress,places.reviews',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ textQuery: SEARCH_QUERY, maxResultCount: 5 }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Places API ${res.status}: ${body}`);
  }
  const data = await res.json();
  const candidates = data.places ?? [];
  const match = candidates.find(
    (p) => typeof p.rating === 'number' && typeof p.userRatingCount === 'number',
  );
  if (!match) {
    throw new Error(`No business with rating found. Payload: ${JSON.stringify(data)}`);
  }
  return {
    placeId: match.id,
    rating: match.rating,
    count: match.userRatingCount,
    name: match.displayName?.text ?? 'unknown',
    address: match.formattedAddress ?? '',
    reviews: Array.isArray(match.reviews) ? match.reviews : [],
  };
}

// --- Reviews helpers ----------------------------------------------------

const FR_MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

function formatDateFr(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.valueOf())) return '';
  return `${FR_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// "Marie Dupont" -> "Marie D."  ·  "Marie D." -> "Marie D."  ·  "Marie" -> "Marie"
function anonymizeName(displayName) {
  const trimmed = (displayName || '').trim();
  if (!trimmed) return 'Anonyme';
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0];
  const first = parts[0];
  const last = parts[parts.length - 1];
  if (/^[A-Za-zÀ-ÿ]\.?$/.test(last)) {
    return `${first} ${last.endsWith('.') ? last : last + '.'}`;
  }
  return `${first} ${last.charAt(0).toUpperCase()}.`;
}

function truncateQuote(text, max = 280) {
  const cleaned = (text || '').replace(/\s+/g, ' ').trim();
  if (cleaned.length <= max) return cleaned;
  const slice = cleaned.slice(0, max);
  const lastSpace = slice.lastIndexOf(' ');
  const cut = lastSpace > max * 0.6 ? lastSpace : max;
  return slice.slice(0, cut).replace(/[.,;:!?\-–—\s]+$/, '') + '…';
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Trier par note desc puis date desc, ne garder que les avis utilisables
// (texte non vide, longueur min). On reste tolérant : si moins de 3 avis 5★
// disponibles on accepte les 4★ ; si vraiment rien, on retourne [] et le
// HTML reste sur les placeholders.
function pickReviews(rawReviews, count = 3, minLen = 30) {
  const usable = (rawReviews || [])
    .map((r) => {
      const text = (r?.text?.text || r?.originalText?.text || '').trim();
      return {
        rating: typeof r?.rating === 'number' ? r.rating : 5,
        text,
        author: r?.authorAttribution?.displayName || '',
        publishTime: r?.publishTime || '',
      };
    })
    .filter((r) => r.text.length >= minLen && r.rating >= 4)
    .sort((a, b) => {
      if (b.rating !== a.rating) return b.rating - a.rating;
      return (b.publishTime || '').localeCompare(a.publishTime || '');
    });
  return usable.slice(0, count);
}

function buildReviewArticleInner(review) {
  const fullStars = Math.max(0, Math.min(5, Math.round(review.rating || 5)));
  const stars = '★'.repeat(fullStars) + '☆'.repeat(5 - fullStars);
  return `
        <div class="review-stars">${stars}</div>
        <p class="review-quote">«&nbsp;${escapeHtml(truncateQuote(review.text))}&nbsp;»</p>
        <div class="review-meta">
          <span class="review-name">${escapeHtml(anonymizeName(review.author))}</span>
          <span class="review-date">${escapeHtml(formatDateFr(review.publishTime))}</span>
        </div>
      `;
}

function formatWithSpaces(n) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function buildReplacements({ rating, count, reviews = [] }) {
  const ratingStr = rating.toFixed(1);                // "4.9"
  const countExact = count;                           // 2085
  const countExactFmt = formatWithSpaces(countExact); // "2 085"

  // Order matters: specific patterns first, generic last.
  // All count patterns allow the "+" suffix to be optional so they keep
  // matching once we've rewritten the page without it.
  return [
    // Schema.org aggregateRating
    {
      label: 'schema.ratingValue',
      re: /"ratingValue":\s*"[\d.]+"/g,
      out: `"ratingValue": "${ratingStr}"`,
    },
    {
      label: 'schema.reviewCount',
      re: /"reviewCount":\s*"\d+"/g,
      out: `"reviewCount": "${countExact}"`,
    },

    // Narrative: "plus de X XXX avis"
    {
      label: 'narrative.plusDe',
      re: /plus de \d{1,3}(?:[ \u00A0]\d{3})+\s+avis\b/gi,
      out: `plus de ${countExactFmt} avis`,
    },
    // "Plus de X XXX avis vérifiés"
    {
      label: 'narrative.verifies',
      re: /Plus de \d{1,3}(?:[ \u00A0]\d{3})+\s+avis vérifiés/g,
      out: `Plus de ${countExactFmt} avis vérifiés`,
    },

    // "<div class="number">X XXX</div>" — requires space-separated thousands
    // so "2017" / "4" / other plain numbers don't match.
    {
      label: 'proofStat.number',
      re: /<div class="number">\d{1,3}(?:[ \u00A0]\d{3})+\+?<\/div>/g,
      out: `<div class="number">${countExactFmt}</div>`,
    },

    // Google label: "Google (X XXX avis)"
    {
      label: 'label.google',
      re: /Google \(\d{1,3}(?:[ \u00A0]\d{3})+\+?\s*avis\)/g,
      out: `Google (${countExactFmt} avis)`,
    },

    // "X XXX avis Google" headings
    {
      label: 'heading.avisGoogle',
      re: /\b\d{1,3}(?:[ \u00A0]\d{3})+\+?\s*avis Google\b/g,
      out: `${countExactFmt} avis Google`,
    },

    // Generic: "X XXX avis" (excludes "avis Google" and "avis vérifiés"
    // which are handled above)
    {
      label: 'generic.avisPlus',
      re: /\b\d{1,3}(?:[ \u00A0]\d{3})+\+?\s*avis\b(?!\s+(?:vérifiés|Google))/gi,
      out: `${countExactFmt} avis`,
    },

    // Title tag: "2085 Avis" (no space, capital A)
    {
      label: 'title.avis',
      re: /\b\d{3,}\+? Avis\b/g,
      out: `${countExact} Avis`,
    },

    // Rating display "X.X/5"
    {
      label: 'rating.slash5',
      re: /\b[45]\.\d\/5\b/g,
      out: `${ratingStr}/5`,
    },

    // Proof stat rating: <div class="number"...>4.9<small>/5</small></div>
    {
      label: 'proofStat.ratingSmall',
      re: /(<div class="number"[^>]*>)[45]\.\d(<small>\/5<\/small><\/div>)/g,
      out: `$1${ratingStr}$2`,
    },

    // Review slots — remplit le contenu interne de chaque <article class="review"
    // data-review-slot="N"> avec les vrais avis Google (note, citation, prénom L.,
    // mois année). Si pas assez d'avis dispo, le slot reste tel quel.
    {
      label: 'reviewSlot',
      re: /(<article class="review[^"]*" data-review-slot="(\d+)"[^>]*>)[\s\S]*?(<\/article>)/g,
      fn: (match, openTag, slotStr, closeTag) => {
        const slot = parseInt(slotStr, 10);
        const r = reviews[slot - 1];
        if (!r) return match;
        return `${openTag}${buildReviewArticleInner(r)}${closeTag}`;
      },
    },
  ];
}

async function updateFile(relPath, replacements) {
  const full = path.join(ROOT, relPath);
  let content;
  try {
    content = await fs.readFile(full, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.warn(`skip (missing): ${relPath}`);
      return { path: relPath, changes: 0 };
    }
    throw err;
  }

  const original = content;
  const perRule = {};
  for (const rule of replacements) {
    // Count hits separately, then replace — pour les règles à `out` (string)
    // on garde le replace string (préserve $1/$2). Les règles `fn` utilisent
    // une callback : on assume la substitution backref manuellement à l'intérieur.
    const matches = content.match(rule.re);
    if (!matches) continue;
    perRule[rule.label] = matches.length;
    if (typeof rule.fn === 'function') {
      content = content.replace(rule.re, rule.fn);
    } else {
      content = content.replace(rule.re, rule.out);
    }
  }

  if (content === original) {
    return { path: relPath, changes: 0, perRule };
  }

  await fs.writeFile(full, content, 'utf8');
  const total = Object.values(perRule).reduce((a, b) => a + b, 0);
  return { path: relPath, changes: total, perRule };
}

async function main() {
  const place = await fetchPlace();
  console.log(`Place: ${place.name} (${place.placeId})`);
  console.log(`Address: ${place.address}`);
  console.log(`Rating: ${place.rating} · Count: ${place.count}`);

  const picked = pickReviews(place.reviews, 3);
  console.log(`Reviews usable: ${picked.length} / ${place.reviews.length}`);
  for (const r of picked) {
    console.log(`  - ${r.rating}★ ${anonymizeName(r.author)} (${formatDateFr(r.publishTime)})`);
  }

  const rules = buildReplacements({ ...place, reviews: picked });
  let totalChanges = 0;
  const report = [];

  for (const file of HTML_FILES) {
    const r = await updateFile(file, rules);
    totalChanges += r.changes;
    report.push(r);
  }

  console.log('\n--- Update report ---');
  for (const r of report) {
    if (r.changes > 0) {
      const breakdown = Object.entries(r.perRule)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ');
      console.log(`  ${r.path}: ${r.changes} (${breakdown})`);
    }
  }
  console.log(`Total replacements: ${totalChanges}`);

  // Also write a JSON snapshot for downstream use / debugging
  const snapshot = {
    updatedAt: new Date().toISOString(),
    placeId: place.placeId,
    name: place.name,
    rating: place.rating,
    reviewCount: place.count,
    source: 'Google Places API (New) — Text Search',
  };
  await fs.writeFile(
    path.join(ROOT, 'data', 'google-reviews.json'),
    JSON.stringify(snapshot, null, 2) + '\n',
    'utf8',
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
