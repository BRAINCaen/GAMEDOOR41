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

const SKIP = ['.bak.', 'preview-bandeau-wix', 'Architecture SEO', 'CHARTE-GRAPHIQUE', 'PHASE-2-GOOGLE', 'GAMEDOOR41 - Home V3.3', 'extracted-v33', '.v33-working'];
const SENTINEL = 'class="footer-legal-links"';

const LEGAL_LINKS_HTML = '\n      <p class="footer-legal-links"><a href="/mentions-legales/">Mentions légales</a> · <a href="/politique-confidentialite/">Confidentialité</a> · <a href="/termes-conditions/">CGV / CGU</a> · <a href="/politique-cookies/">Cookies</a></p>';

const files = await findHtml(ROOT);
let added = 0, already = 0, noFooter = 0;

for (const f of files) {
  const rel = f.replace(ROOT, '').replace(/\\/g, '/');
  if (SKIP.some(s => rel.includes(s))) continue;
  let html = await readFile(f, 'utf8');

  if (html.includes(SENTINEL)) { already++; continue; }

  // Cherche le pattern <div class="footer-bottom"> ... </div> et insère AVANT </div>
  const reFooterBottom = /(<div class="footer-bottom">[\s\S]*?)(\s*<\/div>)/;
  if (!reFooterBottom.test(html)) { noFooter++; continue; }

  html = html.replace(reFooterBottom, (_m, content, closing) => {
    return `${content}${LEGAL_LINKS_HTML}${closing}`;
  });

  await writeFile(f, html, 'utf8');
  console.log(`+ ${rel}`);
  added++;
}

console.log(`\nDONE. ${added} ajoutés · ${already} déjà OK · ${noFooter} sans footer-bottom`);
