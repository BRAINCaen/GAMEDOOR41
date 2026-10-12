// Met a jour la date <lastmod> du sitemap pour les pages dont le contenu vient de changer.
// Usage : node scripts/sitemap-lastmod.mjs AAAA-MM-JJ /chemin1/ /chemin2/ ...
//   (ou, sans chemin : toutes les pages qui contiennent la FAQ « code promo »)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const date = process.argv[2];
if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) { console.error('date attendue : AAAA-MM-JJ'); process.exit(1); }
let chemins = process.argv.slice(3);
if (!chemins.length) {
  const pages = execSync('git ls-files "*.html"', { encoding: 'utf8' }).split('\n').map((s) => s.trim())
    .filter((p) => p && !p.startsWith('signatures/') && existsSync(p));
  chemins = pages
    .filter((p) => readFileSync(p, 'utf8').includes('code promo ou une carte de r'))
    .map((p) => '/' + p.replace(/index\.html$/, ''));
  chemins.push('/code-promo/');
}
const urls = new Set(chemins.map((c) => 'https://gamedoor41.fr' + c.replace(/^\/+/, '/')));

let xml = readFileSync('sitemap.xml', 'utf8');
const nl = xml.includes('\r\n') ? '\r\n' : '\n';
let maj = 0, ajout = 0, absents = [];
for (const u of urls) {
  const loc = `<loc>${u}</loc>`;
  const i = xml.indexOf(loc);
  if (i === -1) { absents.push(u); continue; }
  const finUrl = xml.indexOf('</url>', i);
  const bloc = xml.slice(i, finUrl);
  const indent = (xml.slice(0, i).match(/[ \t]*$/) || [''])[0];
  let neuf;
  if (bloc.includes('<lastmod>')) { neuf = bloc.replace(/<lastmod>[^<]*<\/lastmod>/, `<lastmod>${date}</lastmod>`); maj++; }
  else { neuf = bloc.replace(loc, `${loc}${nl}${indent}<lastmod>${date}</lastmod>`); ajout++; }
  xml = xml.slice(0, i) + neuf + xml.slice(finUrl);
}
writeFileSync('sitemap.xml', xml, 'utf8');
console.log(`lastmod ${date} : ${maj} mis a jour, ${ajout} ajoutes, ${urls.size} demandes.`);
if (absents.length) console.log('absents du sitemap :', absents.join(' '));
