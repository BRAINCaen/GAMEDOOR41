// Ajoute js/suivi-reservation.js (mesure GA4 « begin_checkout » des clics « Réserver ») juste avant </body>
// sur toutes les pages publiques qui ne chargent pas /js/main.js : main.js fait déjà cette mesure ailleurs.
//
// Empreinte ?v= : calculée comme scripts/perf-assets.mjs (sha1 du fichier, 8 caractères), mais sur le
// contenu en fins de ligne LF, c'est-à-dire tel qu'il est dans git et sur Netlify (sur un poste Windows,
// git convertit les fins de ligne du disque en CRLF).
//
// Usage : node scripts/ajouter-suivi-reservation.mjs [--apercu]
// Rejouable : une page qui charge main.js ou qui a déjà le script est laissée telle quelle.
// À relancer après la création d'une page sans main.js (nouvel article du magazine, etc.).

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';

const apercu = process.argv.includes('--apercu');
const ECARTEES = /^(_archive|_wip|extracted-v33|node_modules|signatures)\//;
const SCRIPT = '/js/suivi-reservation.js';

const octetsLF = Buffer.from(readFileSync('.' + SCRIPT).toString('latin1').replace(/\r\n/g, '\n'), 'latin1');
const empreinte = createHash('sha1').update(octetsLF).digest('hex').slice(0, 8);
const BALISE = `<script defer src="${SCRIPT}?v=${empreinte}"></script>`;

const pages = execSync('git ls-files --cached --others --exclude-standard "*.html"', { encoding: 'utf8' })
  .split('\n').map((s) => s.trim()).filter((f) => f && !ECARTEES.test(f));

const ajoutees = [], sansBody = [], absentes = [];
let avecMain = 0, dejaLa = 0;
for (const page of pages) {
  if (!existsSync(page)) { absentes.push(page); continue; }
  const html = readFileSync(page, 'utf8');
  if (html.includes('/js/main.js')) { avecMain++; continue; }
  if (html.includes(SCRIPT)) { dejaLa++; continue; }
  const pos = html.lastIndexOf('</body>');
  if (pos < 0) { sansBody.push(page); continue; }
  const finLigne = html.includes('\r\n') ? '\r\n' : '\n';
  if (!apercu) writeFileSync(page, html.slice(0, pos) + BALISE + finLigne + html.slice(pos));
  ajoutees.push(page);
}
console.log(`${apercu ? '[aperçu] ' : ''}${BALISE}`);
console.log(`${ajoutees.length} page(s) ${apercu ? 'à modifier' : 'modifiée(s)'} sur ${pages.length} · ${avecMain} avec main.js · ${dejaLa} déjà équipée(s)`);
ajoutees.forEach((p) => console.log('  + ' + p));
if (sansBody.length) console.log('Sans </body> (non modifiées) :', sansBody.join(', '));
if (absentes.length) console.log('Absentes du disque (non modifiées) :', absentes.join(', '));
