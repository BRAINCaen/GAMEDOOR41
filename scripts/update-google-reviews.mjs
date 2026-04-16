#!/usr/bin/env node
// Fetches the Google Places rating and review count, then updates all
// HTML files across the site. Designed to run nightly via GitHub Actions.
//
// Required env var:
//   GOOGLE_PLACES_API_KEY  — key with "Places API (New)" enabled

import fs from 'node:fs/promises';
import path from 'node:path';

// Public identifier for the GAMEDOOR•41 Google Business listing
// (anciennement Brain Escape Game Caen). Not secret.
const PLACE_ID = 'ChIJm39bjEFoCkgR0IwsEq72CLU';

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
  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(PLACE_ID)}?fields=rating,userRatingCount,displayName`;
  const res = await fetch(url, {
    headers: {
      'X-Goog-Api-Key': API_KEY,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Places API ${res.status}: ${body}`);
  }
  const data = await res.json();
  if (typeof data.rating !== 'number' || typeof data.userRatingCount !== 'number') {
    throw new Error(`Unexpected Places payload: ${JSON.stringify(data)}`);
  }
  return {
    rating: data.rating,
    count: data.userRatingCount,
    name: data.displayName?.text ?? 'unknown',
  };
}

function formatWithSpaces(n) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function buildReplacements({ rating, count }) {
  const ratingStr = rating.toFixed(1);                // "4.9"
  const countExact = count;                           // 2075
  const countRounded = Math.floor(count / 10) * 10;   // 2070
  const countExactFmt = formatWithSpaces(countExact); // "2 075"
  const countRoundedFmt = formatWithSpaces(countRounded); // "2 070"

  // Order matters: specific patterns first, generic last.
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

    // Narrative: "plus de X XXX avis" (no "+")
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

    // "<div class="number">X XXX+</div>"
    {
      label: 'proofStat.number',
      re: /<div class="number">\d{1,3}(?:[ \u00A0]\d{3})+\+<\/div>/g,
      out: `<div class="number">${countRoundedFmt}+</div>`,
    },

    // Google label: "Google (X XXX+ avis)"
    {
      label: 'label.google',
      re: /Google \(\d{1,3}(?:[ \u00A0]\d{3})+\+?\s*avis\)/g,
      out: `Google (${countRoundedFmt}+ avis)`,
    },

    // "X XXX+ avis Google · 4.9/5" headings — count part only
    {
      label: 'heading.avisGoogle',
      re: /\b\d{1,3}(?:[ \u00A0]\d{3})+\+\s*avis Google\b/g,
      out: `${countRoundedFmt}+ avis Google`,
    },

    // Hero bar: "X XXX+ avis Google" (already covered above) and lone "X XXX+ avis"
    {
      label: 'generic.avisPlus',
      re: /\b\d{1,3}(?:[ \u00A0]\d{3})+\+\s*avis\b(?!\s+vérifiés)/gi,
      out: `${countRoundedFmt}+ avis`,
    },

    // Title tag: "2060+ Avis" (no space, capital A)
    {
      label: 'title.avis',
      re: /\b\d{3,}\+ Avis\b/g,
      out: `${countExact}+ Avis`,
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
    let hits = 0;
    content = content.replace(rule.re, (match) => {
      hits++;
      return typeof rule.out === 'function' ? rule.out(match) : rule.out;
    });
    if (hits > 0) perRule[rule.label] = hits;
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
  console.log(`Place: ${place.name}`);
  console.log(`Rating: ${place.rating} · Count: ${place.count}`);

  const rules = buildReplacements(place);
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
    rating: place.rating,
    reviewCount: place.count,
    source: 'Google Places API (New)',
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
