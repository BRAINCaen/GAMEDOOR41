#!/usr/bin/env node
// Pose les deux signatures B.R.A.I.N. fournies par Allan le 23/11/2026 :
//   - « Un quiz signé B.R.A.I.N. »  → en-tête de la page du quiz
//   - « Scénarios de B.R.A.I.N. »   → en-tête de la page escape et des 3 salles
// Images : img/logo/quiz-signe-brain.png et img/logo/scenarios-de-brain.png (fond transparent,
// lettres blanches et rouges : à poser sur fond sombre uniquement).
// Relançable : une page qui porte déjà sa signature est laissée telle quelle.
//
// Usage : node scripts/ajouter-logos-brain.mjs

import fs from 'node:fs';

const img = (fichier, alt, largeur, hauteur, taille) =>
  `<img src="/img/logo/${fichier}" alt="${alt}" width="${largeur}" height="${hauteur}" loading="lazy" decoding="async" style="height:${taille};width:auto;max-width:100%;">`;
const QUIZ = img('quiz-signe-brain.png', 'Un quiz signé B.R.A.I.N.', 862, 294, 'clamp(60px, 7vw, 92px)');
const ESCAPE = img('scenarios-de-brain.png', 'Scénarios de B.R.A.I.N.', 862, 287, 'clamp(56px, 6.5vw, 88px)');

// [page, repère (expression avec le retrait de la ligne en dernier groupe), bloc ajouté après le repère]
const POSES = [
  ['quiz-game-caen/index.html',
    /(<a href="#tarifs" class="btn btn-outline">Voir les tarifs<\/a>\n([ \t]*)<\/div>)/,
    (r) => `${r}<p class="marque-signature" style="order:6;margin:26px 0 0;line-height:0;">${QUIZ}</p>`],
  ['escape-game-caen/index.html',
    /(<a href="\/tarifs\/">Voir les tarifs <span class="arrow">→<\/span><\/a>\n([ \t]*)<\/div>)/,
    (r) => `${r}<p class="marque-signature" style="display:flex;justify-content:center;margin:26px auto 0;line-height:0;max-width:none;">${ESCAPE}</p>`],
  ...['psychiatric', 'garde-a-vue', 'back-to-the-80s'].map((salle) => [`escape-game-caen/${salle}/index.html`,
    /(data-track="cta-reserver-(?:psychiatric|garde-a-vue|80s)">[^\n]*\n[^\n]*<span[^\n]*<\/span>\n([ \t]*)<\/div>)/,
    (r) => `${r}<p class="marque-signature" style="margin:22px 0 0;line-height:0;">${ESCAPE}</p>`]),
];

let faits = 0;
for (const [f, repere, bloc] of POSES) {
  const brut = fs.readFileSync(f, 'utf8'), crlf = brut.includes('\r\n');
  let t = brut.replace(/\r\n/g, '\n');
  if (t.includes('class="marque-signature"')) { console.log(`= ${f} (déjà posée)`); continue; }
  const m = t.match(repere);
  if (!m) { console.error(`! ${f} : repère introuvable`); process.exitCode = 1; continue; }
  t = t.replace(repere, (tout, _g1, retrait) => `${tout}\n${bloc(retrait)}`);
  fs.writeFileSync(f, crlf ? t.replace(/\n/g, '\r\n') : t); faits++;
  console.log(`+ ${f}`);
}
console.log(`${faits} page(s) modifiée(s).`);
