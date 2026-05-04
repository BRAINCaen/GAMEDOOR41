import { readdir, readFile, writeFile, stat } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Find all index.html files (skip node_modules)
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

// Patterns à remplacer
// Variant 1 — sub-pages avec .desktop-only / .mobile-only sans nav-link
//   <a href="/evjf-caen/" class="desktop-only [active]">EVJF & Anniversaire</a>
//   <a href="/evjf-caen/" class="mobile-only [active]">EVJF</a>
//   <a href="/evg-caen/" class="mobile-only">EVG</a>
//   <a href="/anniversaire-caen/" class="mobile-only">Anniversaire</a>
//
// Variant 2 — home avec .nav-link en plus
//   <a href="/evjf-caen/" class="nav-link desktop-only">EVJF & Anniversaire</a>
//   <a href="/evjf-caen/" class="nav-link mobile-only">EVJF</a>
//   <a href="/evg-caen/" class="nav-link mobile-only">EVG</a>
//   <a href="/anniversaire-caen/" class="nav-link mobile-only">Anniversaire</a>
//
// Variant 3 — magazine / post (avec class="nav-link" sans desktop/mobile, plus simple)
//   <a href="/evjf-caen/" class="nav-link">EVJF</a>

// Pour les détecter, regex multilignes.
const RE_SUBPAGE = /<a href="\/evjf-caen\/" class="desktop-only( active)?">EVJF &(amp;)? Anniversaire<\/a>\s*<a href="\/evjf-caen\/" class="mobile-only( active)?">EVJF<\/a>\s*<a href="\/evg-caen\/" class="mobile-only( active)?">EVG<\/a>\s*<a href="\/anniversaire-caen\/" class="mobile-only( active)?">Anniversaire<\/a>/g;

const RE_HOME = /<a href="\/evjf-caen\/" class="nav-link desktop-only">EVJF &(amp;)? Anniversaire<\/a>\s*<a href="\/evjf-caen\/" class="nav-link mobile-only">EVJF<\/a>\s*<a href="\/evg-caen\/" class="nav-link mobile-only">EVG<\/a>\s*<a href="\/anniversaire-caen\/" class="nav-link mobile-only">Anniversaire<\/a>/g;

function buildReplacement(pageId, withNavLink) {
  // pageId = 'mariage' | 'evjf' | 'evg' | 'anniversaire' | null
  const cls = (extra) => withNavLink ? `nav-link ${extra}` : extra;
  const isMariageActive = pageId === 'mariage';
  const isEvjfActive = pageId === 'evjf';
  const isEvgActive = pageId === 'evg';
  const isAnnivActive = pageId === 'anniversaire';
  // Sur EVJF/EVG/Anniversaire pages, on met aussi "active" sur le lien desktop Mariage (parent)
  const desktopActive = (isMariageActive || isEvjfActive || isEvgActive || isAnnivActive) ? ' active' : '';

  return `<a href="/mariage-caen/" class="${cls('desktop-only')}${desktopActive}">Mariage &amp; Anniversaire</a>\n        <a href="/mariage-caen/" class="${cls('mobile-only')}${isMariageActive ? ' active' : ''}">Mariage</a>\n        <a href="/evjf-caen/" class="${cls('mobile-only')}${isEvjfActive ? ' active' : ''}">EVJF</a>\n        <a href="/evg-caen/" class="${cls('mobile-only')}${isEvgActive ? ' active' : ''}">EVG</a>\n        <a href="/anniversaire-caen/" class="${cls('mobile-only')}${isAnnivActive ? ' active' : ''}">Anniversaire</a>`;
}

function detectPageId(relPath) {
  if (relPath.includes('mariage-caen')) return 'mariage';
  if (relPath.includes('evjf-caen')) return 'evjf';
  if (relPath.includes('evg-caen')) return 'evg';
  if (relPath.includes('anniversaire-caen')) return 'anniversaire';
  return null;
}

async function processFile(file) {
  const html = await readFile(file, 'utf8');
  const rel = file.replace(ROOT, '').replace(/\\/g, '/');
  const pageId = detectPageId(rel);

  let updated = html;
  let touched = false;

  // Variant 2 (home with nav-link)
  if (RE_HOME.test(updated)) {
    updated = updated.replace(RE_HOME, () => buildReplacement(pageId, true));
    touched = true;
  }
  // Variant 1 (sub-pages)
  if (RE_SUBPAGE.test(updated)) {
    updated = updated.replace(RE_SUBPAGE, () => buildReplacement(pageId, false));
    touched = true;
  }

  if (touched) {
    await writeFile(file, updated, 'utf8');
    console.log(`+ ${rel}  (page=${pageId || '-'})`);
  } else {
    console.log(`= ${rel}  (no menu match)`);
  }
}

const files = await findHtml(ROOT);
console.log(`Found ${files.length} HTML files`);

for (const f of files) {
  // Skip backup files and architecture preview
  const rel = f.replace(ROOT, '').replace(/\\/g, '/');
  if (rel.includes('.bak.') || rel.includes('Architecture SEO') || rel.includes('preview-bandeau-wix') || rel.includes('CHARTE-GRAPHIQUE') || rel.includes('PHASE-2-GOOGLE') || rel.includes('GAMEDOOR41 - Home V3.3')) {
    console.log(`- skip: ${rel}`);
    continue;
  }
  try { await processFile(f); }
  catch (e) { console.error(`x ${rel}: ${e.message}`); }
}
console.log('\nDone.');
