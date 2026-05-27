/**
 * fix-nav-dropdown.mjs
 * Remplace le lien composite "EVJF · EVG · Anniversaire" / "Mariage & Anniversaire"
 * par un vrai dropdown desktop "Privatiser" contenant EVJF, EVG, Anniversaire, Mariage.
 * Ajoute Mariage dans la version mobile partout.
 * Gere Menu A (home + posts, class="nav-link nav-link-desktop") et Menu B (autres pages, class="desktop-only").
 * Gere la classe "active" selon la page courante.
 */
import { readdir, readFile, writeFile } from 'fs/promises';
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

function detectPageId(relPath) {
  if (relPath.includes('mariage-caen')) return 'mariage';
  if (relPath.includes('evjf-caen')) return 'evjf';
  if (relPath.includes('evg-caen')) return 'evg';
  if (relPath.includes('anniversaire-caen')) return 'anniversaire';
  return null;
}

function activeIf(cond) { return cond ? ' active' : ''; }
function activeClassIf(cond) { return cond ? ' class="active"' : ''; }

function buildMenuB(pageId, indent = '        ') {
  const isAny = ['mariage', 'evjf', 'evg', 'anniversaire'].includes(pageId);
  const toggleActive = isAny ? ' active' : '';
  const dropdownItems = [
    `<a href="/evjf-caen/" role="menuitem"${activeClassIf(pageId === 'evjf')}>&#x1F496; EVJF</a>`,
    `<a href="/evg-caen/" role="menuitem"${activeClassIf(pageId === 'evg')}>&#x1F496; EVG</a>`,
    `<a href="/anniversaire-caen/" role="menuitem"${activeClassIf(pageId === 'anniversaire')}>&#x1F382; Anniversaire</a>`,
    `<a href="/mariage-caen/" role="menuitem"${activeClassIf(pageId === 'mariage')}>&#x1F48D; Mariage</a>`,
  ].map(s => indent + '    ' + s).join('\n');

  const dropdown =
    `<div class="nav-dropdown desktop-only">\n` +
    `${indent}  <button type="button" class="nav-dropdown-toggle${toggleActive}" aria-expanded="false" aria-haspopup="true">Événements</button>\n` +
    `${indent}  <div class="nav-dropdown-menu" role="menu">\n` +
    `${dropdownItems}\n` +
    `${indent}  </div>\n` +
    `${indent}</div>`;

  const mobileLinks = [
    `<a href="/mariage-caen/" class="mobile-only${activeIf(pageId === 'mariage')}">Mariage</a>`,
    `<a href="/evjf-caen/" class="mobile-only${activeIf(pageId === 'evjf')}">EVJF Caen</a>`,
    `<a href="/evg-caen/" class="mobile-only${activeIf(pageId === 'evg')}">EVG Caen</a>`,
    `<a href="/anniversaire-caen/" class="mobile-only${activeIf(pageId === 'anniversaire')}">Anniversaire Caen</a>`,
  ].map(s => indent + s).join('\n');

  return `${dropdown}\n${mobileLinks}`;
}

function buildMenuA(pageId, indent = '        ') {
  const isAny = ['mariage', 'evjf', 'evg', 'anniversaire'].includes(pageId);
  const toggleActive = isAny ? ' active' : '';
  const dropdownItems = [
    `<a href="/evjf-caen/" role="menuitem"${activeClassIf(pageId === 'evjf')}>&#x1F496; EVJF</a>`,
    `<a href="/evg-caen/" role="menuitem"${activeClassIf(pageId === 'evg')}>&#x1F496; EVG</a>`,
    `<a href="/anniversaire-caen/" role="menuitem"${activeClassIf(pageId === 'anniversaire')}>&#x1F382; Anniversaire</a>`,
    `<a href="/mariage-caen/" role="menuitem"${activeClassIf(pageId === 'mariage')}>&#x1F48D; Mariage</a>`,
  ].map(s => indent + '    ' + s).join('\n');

  const dropdown =
    `<div class="nav-dropdown nav-link-desktop">\n` +
    `${indent}  <button type="button" class="nav-link nav-dropdown-toggle${toggleActive}" aria-expanded="false" aria-haspopup="true">Événements</button>\n` +
    `${indent}  <div class="nav-dropdown-menu" role="menu">\n` +
    `${dropdownItems}\n` +
    `${indent}  </div>\n` +
    `${indent}</div>`;

  const mobileLinks = [
    `<a href="/mariage-caen/" class="nav-link nav-link-mobile${activeIf(pageId === 'mariage')}" data-icon="\u{1F48D}">Mariage Caen</a>`,
    `<a href="/evjf-caen/" class="nav-link nav-link-mobile${activeIf(pageId === 'evjf')}" data-icon="\u{1F496}">EVJF Caen</a>`,
    `<a href="/evg-caen/" class="nav-link nav-link-mobile${activeIf(pageId === 'evg')}" data-icon="\u{1F496}">EVG Caen</a>`,
    `<a href="/anniversaire-caen/" class="nav-link nav-link-mobile${activeIf(pageId === 'anniversaire')}" data-icon="\u{1F382}">Anniversaire Caen</a>`,
  ].map(s => indent + s).join('\n');

  return `${dropdown}\n${mobileLinks}`;
}

// Patterns -----------------------------------------------------------------
// Menu B variant 1 (la plupart) : "EVJF · EVG · Anniversaire" + 3 mobile (sans Mariage)
const RE_B_V1 = /<a href="\/evjf-caen\/" class="desktop-only">EVJF · EVG · Anniversaire<\/a>\s*\n\s*<a href="\/evjf-caen\/" class="mobile-only">EVJF Caen<\/a>\s*\n\s*<a href="\/evg-caen\/" class="mobile-only">EVG Caen<\/a>\s*\n\s*<a href="\/anniversaire-caen\/" class="mobile-only">Anniversaire Caen<\/a>/g;

// Menu B variant 2 (sur pages event) : "Mariage & Anniversaire" + 4 mobile (avec Mariage), avec ou sans 'active'
const RE_B_V2 = /<a href="\/mariage-caen\/" class="desktop-only( active)?">Mariage &amp; Anniversaire<\/a>\s*\n\s*<a href="\/mariage-caen\/" class="mobile-only( active)?">Mariage<\/a>\s*\n\s*<a href="\/evjf-caen\/" class="mobile-only( active)?">EVJF Caen<\/a>\s*\n\s*<a href="\/evg-caen\/" class="mobile-only( active)?">EVG( Caen)?<\/a>\s*\n\s*<a href="\/anniversaire-caen\/" class="mobile-only( active)?">Anniversaire Caen<\/a>/g;

// Menu A (home + posts + magazine)
const RE_A = /<a href="\/evjf-caen\/" class="nav-link nav-link-desktop"[^>]*>EVJF · EVG · Anniversaire<\/a>\s*\n\s*<a href="\/evjf-caen\/" class="nav-link nav-link-mobile"[^>]*>EVJF Caen<\/a>\s*\n\s*<a href="\/evg-caen\/" class="nav-link nav-link-mobile"[^>]*>EVG Caen<\/a>\s*\n\s*<a href="\/anniversaire-caen\/" class="nav-link nav-link-mobile"[^>]*>Anniversaire Caen<\/a>/g;

async function processFile(file) {
  const html = await readFile(file, 'utf8');
  const rel = file.replace(ROOT, '').replace(/\\/g, '/');
  const pageId = detectPageId(rel);

  let updated = html;
  let touched = [];

  if (RE_B_V1.test(updated)) {
    updated = updated.replace(RE_B_V1, buildMenuB(pageId));
    touched.push('B_V1');
  }
  if (RE_B_V2.test(updated)) {
    updated = updated.replace(RE_B_V2, buildMenuB(pageId));
    touched.push('B_V2');
  }
  if (RE_A.test(updated)) {
    updated = updated.replace(RE_A, buildMenuA(pageId));
    touched.push('A');
  }

  if (touched.length) {
    await writeFile(file, updated, 'utf8');
    console.log(`+ ${rel}  [${touched.join(',')}]  (page=${pageId || '-'})`);
    return true;
  }
  return false;
}

const files = await findHtml(ROOT);
console.log(`Found ${files.length} HTML files\n`);

let modified = 0, skipped = 0;
for (const f of files) {
  const rel = f.replace(ROOT, '').replace(/\\/g, '/');
  if (rel.includes('.bak.') || rel.includes('_archive') || rel.includes('extracted-v33') ||
      rel.includes('index.v33-working') || rel.includes('Home V3.3 (standalone)') ||
      rel.includes('preview-bandeau-wix') || rel.includes('CHARTE-GRAPHIQUE') ||
      rel.includes('PHASE-2-GOOGLE') || rel.includes('Architecture SEO')) {
    console.log(`- skip: ${rel}`);
    continue;
  }
  try {
    const ok = await processFile(f);
    if (ok) modified++; else skipped++;
  } catch (e) {
    console.error(`x ${rel}: ${e.message}`);
  }
}
console.log(`\nDone. ${modified} modified, ${skipped} unchanged.`);
