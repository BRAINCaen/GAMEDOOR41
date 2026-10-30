// Ajoute sur toutes les pages publiques le script de la fenêtre promotionnelle (js/promo-popup.js),
// juste avant </body>. La promotion elle-même (image, textes, date de fin) se règle dans js/promo-popup.js.
// Pages écartées : 404, signatures mail, pages légales (on n'y affiche pas de promotion).
//
// Usage : node scripts/ajouter-popup-promo.mjs [--apercu]
// Rejouable : une page qui a déjà le script est laissée telle quelle. Ensuite : node scripts/perf-assets.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const apercu = process.argv.includes('--apercu');
const ECARTEES = /^(_archive|_wip|extracted-v33|node_modules|signatures)\/|^404\.html$|^(mentions-legales|politique-confidentialite|politique-cookies|termes-conditions)\//;
const BALISE = '<script defer src="/js/promo-popup.js"></script>';

const pages = execSync('git ls-files --cached --others --exclude-standard "*.html"', { encoding: 'utf8' })
  .split('\n').map((s) => s.trim()).filter((f) => f && !ECARTEES.test(f));

let ajoutees = 0;
const sansBody = [];
for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  if (html.includes('/js/promo-popup.js')) continue;
  const pos = html.lastIndexOf('</body>');
  if (pos < 0) { sansBody.push(page); continue; }
  const finLigne = html.includes('\r\n') ? '\r\n' : '\n';
  const neuf = html.slice(0, pos) + BALISE + finLigne + html.slice(pos);
  if (!apercu) writeFileSync(page, neuf);
  ajoutees++;
}
console.log(`${apercu ? '[aperçu] ' : ''}${ajoutees} page(s) ${apercu ? 'à modifier' : 'modifiée(s)'} sur ${pages.length}`);
if (sansBody.length) console.log('Sans </body> (non modifiées) :', sansBody.join(', '));
