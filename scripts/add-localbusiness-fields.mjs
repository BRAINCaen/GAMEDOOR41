/**
 * add-localbusiness-fields.mjs
 * Ajoute les champs recommandés "image" + "priceRange" a chaque bloc
 * EntertainmentBusiness (Local Business) du Schema.org, pour lever les
 * avertissements "non critiques" du Rich Results Test.
 * Idempotent : ne touche pas un bloc qui a deja priceRange.
 */
import { readdir, readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const IMAGE = 'https://gamedoor41.fr/img/og/og-default.jpg';
const PRICE_RANGE = '15-50 €'; // 15-50 €

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

// Capture: "@type": "EntertainmentBusiness", <newline+indent> "name": "...",
// Groupe 1 = tout le match ; Groupe 2 = indentation de la ligne "name"
const RE = /("@type":\s*"EntertainmentBusiness",\s*\n(\s*)"name":\s*"[^"]*",)/g;

async function processFile(file) {
  const html = await readFile(file, 'utf8');
  const rel = file.replace(ROOT, '').replace(/\\/g, '/');

  let count = 0;
  const updated = html.replace(RE, (match, full, indent, offset) => {
    // Idempotence : si priceRange est deja present dans les ~250 chars suivants, on ne touche pas
    const lookahead = html.slice(offset, offset + 350);
    if (lookahead.includes('"priceRange"') || lookahead.includes('"image"')) {
      return match;
    }
    count++;
    return full + `\n${indent}"image": "${IMAGE}",\n${indent}"priceRange": "${PRICE_RANGE}",`;
  });

  if (count > 0) {
    await writeFile(file, updated, 'utf8');
    console.log(`+ ${rel}  (${count} bloc(s) EntertainmentBusiness enrichi(s))`);
    return true;
  }
  return false;
}

const files = await findHtml(ROOT);
let modified = 0;
for (const f of files) {
  const rel = f.replace(ROOT, '').replace(/\\/g, '/');
  if (rel.includes('.bak.') || rel.includes('_archive') || rel.includes('extracted-v33') ||
      rel.includes('index.v33-working') || rel.includes('Home V3.3 (standalone)') ||
      rel.includes('Architecture SEO') || rel.includes('CHARTE-') || rel.includes('PHASE-')) {
    continue;
  }
  try {
    if (await processFile(f)) modified++;
  } catch (e) {
    console.error(`x ${rel}: ${e.message}`);
  }
}
console.log(`\nDone. ${modified} fichier(s) modifie(s).`);
