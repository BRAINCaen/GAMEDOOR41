import { readFile, writeFile, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

async function findHtml(dir, results = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === '.git' || e.name.startsWith('.')) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) await findHtml(full, results);
    else if (e.isFile() && e.name.endsWith('.html')) results.push(full);
  }
  return results;
}

const SKIP = ['.bak.', 'preview-bandeau-wix', 'Architecture SEO', 'CHARTE-GRAPHIQUE', 'PHASE-2-GOOGLE', 'GAMEDOOR41 - Home V3.3'];

const files = await findHtml(ROOT);
let cnt = { menu: 0, footer: 0, home: 0 };

for (const f of files) {
  const rel = f.replace(ROOT, '').replace(/\\/g, '/');
  if (SKIP.some(s => rel.includes(s))) continue;
  let html = await readFile(f, 'utf8');
  let touched = false;

  // 1. Sub-pages (site-header) — retirer mobile-only sur lien cadeau pour le rendre visible desktop ET mobile
  //    Pattern : <a href="/cadeau/" class="mobile-only [active]">Carte Cadeau</a>
  const reSubpage = /<a href="\/cadeau\/" class="mobile-only( active)?">Carte Cadeau<\/a>/g;
  if (reSubpage.test(html)) {
    html = html.replace(reSubpage, (_m, active) => {
      const cls = active ? 'active' : '';
      return `<a href="/cadeau/"${cls ? ` class="${cls}"` : ''}>🎁 Carte Cadeau</a>`;
    });
    cnt.menu++;
    touched = true;
  }

  // 2. Home page — ajouter le lien dans la nav avant Tarifs
  //    Pattern : avant <a href="/tarifs/" class="nav-link">Tarifs</a>
  if (rel === '/index.html') {
    const reHomeNav = /(\s+<a href="\/mariage-caen\/" class="nav-link">Mariage &amp; Anniversaire<\/a>)\n(\s+<a href="\/tarifs\/" class="nav-link">Tarifs<\/a>)/;
    if (reHomeNav.test(html)) {
      html = html.replace(reHomeNav, (_m, mariage, tarifs) => {
        return `${mariage}\n${mariage.match(/^\s*/)[0]}<a href="/cadeau/" class="nav-link">🎁 Carte Cadeau</a>\n${tarifs}`;
      });
      cnt.home++;
      touched = true;
    }
  }

  // 3. Footer — ajouter lien cadeau dans la colonne "Activités" (après Quiz Game, avant Tarifs)
  //    Patterns multiples possibles selon les versions :
  //    Version sub-pages : <div class="footer-col"><h4>Activités</h4><a href="/escape-game-caen/">Escape Game</a><a href="/quiz-game-caen/">Quiz Game</a><a href="/tarifs/">Tarifs</a></div>
  const reFooterAct = /(<a href="\/quiz-game-caen\/">Quiz Game<\/a>)(<a href="\/tarifs\/">Tarifs<\/a>)/g;
  if (reFooterAct.test(html)) {
    html = html.replace(reFooterAct, '$1<a href="/cadeau/">🎁 Carte Cadeau</a>$2');
    cnt.footer++;
    touched = true;
  }

  if (touched) {
    await writeFile(f, html, 'utf8');
    console.log(`+ ${rel}`);
  }
}

console.log(`\nDONE. ${cnt.menu} menus + ${cnt.home} home nav + ${cnt.footer} footers.`);
