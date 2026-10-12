// Retire des pages HTML les commentaires visibles dans les outils de developpement du navigateur
// (notes de construction, remarques SEO, explications de mise en page), qui n'ont rien a faire en ligne.
//
// Sont conserves :
//  - les marqueurs dont dependent les scripts de maintenance :
//      <!-- REVIEWS:START ... --> / <!-- REVIEWS:END -->   (scripts/rotate-reviews.mjs, robot de nuit)
//      <!-- FAQ -->                                        (point d'insertion de rotate-reviews.mjs)
//      <!-- magazine:balisage-genere --> / <!-- /magazine:balisage-genere -->  (scripts/sync-magazine-feed.mjs)
//      <!-- SALLE n: ... -->                                (scripts/reorder-salles.mjs)
//      <!-- CODES-PROMO:START --> / <!-- CODES-PROMO:END --> (scripts/generer-codes-promo.mjs)
//  - tout ce qui est dans un <script> (aucun commentaire HTML n'y est touche)
//
// Sont retires :
//  - tous les autres commentaires HTML <!-- ... --> hors <script>
//  - les commentaires CSS /* ... */ des blocs <style> en ligne
//
// Usage : node scripts/retirer-commentaires.mjs            (modifie les fichiers)
//         node scripts/retirer-commentaires.mjs --apercu   (liste seulement ce qui serait retire)

import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const apercu = process.argv.includes('--apercu');
const fichiers = execSync('git ls-files "*.html"', { encoding: 'utf8' })
  .split('\n').map(s => s.trim()).filter(f => f && !f.startsWith('signatures/'));

const GARDER = /^(REVIEWS:(START|END)\b|FAQ$|\/?magazine:balisage-genere\b|SALLE \d+:|CODES-PROMO:(START|END)$)/;

let totalHtml = 0, totalCss = 0, fichiersModifies = 0;
const retires = [];

function nettoyerHorsScript(html, fichier) {
  // Decoupe en segments : hors <script> / dans <script>, pour ne jamais toucher au JavaScript
  const parts = html.split(/(<script\b[\s\S]*?<\/script>)/i);
  return parts.map((part, i) => {
    if (i % 2 === 1) return part; // segment <script>...</script> : intact
    // 1. commentaires HTML seuls sur leur ligne : la ligne entiere disparait (fin de ligne LF ou CRLF)
    part = part.replace(/^[ \t]*<!--([\s\S]*?)-->[ \t]*(\r?\n|$)/gm, (m, corps) => {
      const resume = corps.replace(/\s+/g, ' ').trim();
      if (GARDER.test(resume)) return m;
      totalHtml++; retires.push(`${fichier} :: ${resume.slice(0, 90)}`);
      return '';
    });
    //    commentaires HTML au milieu d'une ligne : retires en place
    part = part.replace(/[ \t]*<!--([\s\S]*?)-->/g, (m, corps) => {
      const resume = corps.replace(/\s+/g, ' ').trim();
      if (GARDER.test(resume)) return m;
      totalHtml++; retires.push(`${fichier} :: ${resume.slice(0, 90)}`);
      return '';
    });
    // 2. commentaires CSS dans les <style> en ligne (meme logique)
    part = part.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi, (m, ouv, css, ferm) => {
      let nettoye = css.replace(/^[ \t]*\/\*[\s\S]*?\*\/[ \t]*(\r?\n|$)/gm, () => { totalCss++; return ''; });
      nettoye = nettoye.replace(/[ \t]*\/\*[\s\S]*?\*\//g, () => { totalCss++; return ''; });
      return ouv + nettoye + ferm;
    });
    // 3. jamais plus d'une ligne vide d'affilee la ou des commentaires ont disparu
    part = part.replace(/(\r?\n)[ \t]*(\r?\n)[ \t]*(\r?\n)+/g, '$1$2');
    return part;
  }).join('');
}

for (const f of fichiers) {
  const avant = readFileSync(f, 'utf8');
  const apres = nettoyerHorsScript(avant, f);
  if (apres !== avant) {
    fichiersModifies++;
    if (!apercu) writeFileSync(f, apres, 'utf8');
  }
}

if (apercu) retires.forEach(l => console.log(l));
console.log(`${apercu ? '[apercu] ' : ''}${fichiersModifies} fichiers, ${totalHtml} commentaires HTML et ${totalCss} commentaires CSS ${apercu ? 'seraient retires' : 'retires'}.`);
