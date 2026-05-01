#!/usr/bin/env node
// One-shot : ajoute fallback PNG + apple-touch-icon PNG sur toutes les pages.
// Garde le SVG en first-choice (Chrome moderne), PNG en fallback (browsers anciens / contextes
// où le SVG ne charge pas — ex : favicon manquant Chrome bug observé sur escape-game-caen).
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const FILES = [
  'index.html',
  'escape-game-caen/index.html',
  'escape-game-caen/garde-a-vue/index.html',
  'escape-game-caen/psychiatric/index.html',
  'escape-game-caen/back-to-the-80s/index.html',
  'quiz-game-caen/index.html',
  'team-building-caen/index.html',
  'evjf-caen/index.html',
  'evg-caen/index.html',
  'anniversaire-caen/index.html',
  'cadeau/index.html',
  'tarifs/index.html',
  'contact/index.html',
  'devis/index.html',
  'references-entreprises-caen/index.html',
  'magazine/index.html',
  'post/escape-game-back-to-80s-famille-caen/index.html',
  'post/team-building-reussi-caen-escape-game/index.html',
  'post/escape-game-a-deux-astuces-avantages/index.html',
  'post/escape-game-horreur-psychiatric-caen/index.html',
  'post/buzz-your-brain-jeu-televise-realiste-caen/index.html',
  'post/organiser-evjf-evg-inoubliable-caen/index.html',
  'post/carte-cadeau-escape-quiz-caen/index.html',
  'post/quiz-game-noel-caen-buzz-your-brain/index.html',
  'post/evjf-evg-caen-quiz-buzz-your-brain/index.html',
  'post/escape-game-caen-tarif-etudiant/index.html',
  'post/escape-game-caen-guide-complet-2026/index.html',
];

const FALLBACK_PNG = '  <link rel="icon" type="image/png" sizes="32x32" href="/img/logo/favicon.png">';
const APPLE_PNG    = '  <link rel="apple-touch-icon" href="/img/logo/logo-icon.png">';

let touched = 0, skipped = 0;

for (const rel of FILES) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) { console.log(`SKIP missing: ${rel}`); skipped++; continue; }
  let html = fs.readFileSync(file, 'utf8');
  const orig = html;

  // Idempotence : si le fallback PNG est déjà présent, on saute.
  if (html.includes('href="/img/logo/favicon.png"')) {
    console.log(`OK already-patched: ${rel}`);
    continue;
  }

  // Cas 1 : page contient apple-touch-icon SVG → remplacer par fallback PNG + apple-touch-icon PNG
  if (html.includes('<link rel="apple-touch-icon" href="/img/logo/logo-icon.svg">')) {
    html = html.replace(
      '<link rel="apple-touch-icon" href="/img/logo/logo-icon.svg">',
      `${FALLBACK_PNG.trimStart()}\n${APPLE_PNG}`
    );
  }
  // Cas 2 : page contient déjà apple-touch-icon PNG (home) → injecter juste fallback PNG après le SVG icon
  else if (html.includes('<link rel="apple-touch-icon" href="/img/logo/logo-icon.png">')) {
    html = html.replace(
      '<link rel="icon" type="image/svg+xml" href="/img/logo/favicon.svg">',
      `<link rel="icon" type="image/svg+xml" href="/img/logo/favicon.svg">\n${FALLBACK_PNG}`
    );
  }
  // Cas 3 : page n'a que rel="icon" SVG (pas d'apple-touch-icon) → injecter les 2 après
  else if (html.includes('<link rel="icon" type="image/svg+xml" href="/img/logo/favicon.svg">')) {
    html = html.replace(
      '<link rel="icon" type="image/svg+xml" href="/img/logo/favicon.svg">',
      `<link rel="icon" type="image/svg+xml" href="/img/logo/favicon.svg">\n${FALLBACK_PNG}\n${APPLE_PNG}`
    );
  }
  else {
    console.log(`SKIP no-favicon-link-found: ${rel}`);
    skipped++;
    continue;
  }

  if (html !== orig) {
    fs.writeFileSync(file, html, 'utf8');
    touched++;
    console.log(`PATCHED: ${rel}`);
  }
}

console.log(`\nDone — ${touched} fichier(s) patché(s), ${skipped} skip.`);
