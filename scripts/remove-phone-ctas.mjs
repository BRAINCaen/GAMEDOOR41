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

// Patterns to replace : phone CTAs → email CTAs (or remove)
// Footer info text patterns kept as-is.

const REPLACEMENTS = [
  // Pattern 1 : Hero/CTA outline phone button avec numéro affiché
  {
    re: /<a href="tel:\+33231530751" class="btn btn-outline"><img src="\/img\/icons\/phone\.svg" class="gd-icon" alt="" aria-hidden="true"> 02 31 53 07 51<\/a>/g,
    to: '<a href="mailto:contact@gamedoor41.fr" class="btn btn-outline">Nous écrire</a>'
  },
  // Pattern 2 : Hero/CTA outline phone button sans icône
  {
    re: /<a href="tel:\+33231530751" class="btn btn-outline">02 31 53 07 51<\/a>/g,
    to: '<a href="mailto:contact@gamedoor41.fr" class="btn btn-outline">Nous écrire</a>'
  },
  // Pattern 3 : Sticky CTA "Appeler" avec icône
  {
    re: /<a href="tel:\+33231530751" class="btn btn-outline" style="border-color:var\(--grey\);"><img src="\/img\/icons\/phone\.svg" class="gd-icon" alt="" aria-hidden="true"> Appeler<\/a>/g,
    to: '<a href="mailto:contact@gamedoor41.fr" class="btn btn-outline" style="border-color:var(--grey);">Nous écrire</a>'
  },
  // Pattern 4 : Sticky CTA "Appeler" sans icône
  {
    re: /<a href="tel:\+33231530751" class="btn btn-outline" style="border-color:var\(--grey\);">Appeler<\/a>/g,
    to: '<a href="mailto:contact@gamedoor41.fr" class="btn btn-outline" style="border-color:var(--grey);">Nous écrire</a>'
  },
  // Pattern 5 : Cadeau "Commander au 02 31 53 07 51" CTA primary
  {
    re: /<a href="tel:\+33231530751" class="btn btn-primary" data-track="cta-cadeau"><img src="\/img\/icons\/phone\.svg" class="gd-icon" alt="" aria-hidden="true"> Commander au 02 31 53 07 51<\/a>/g,
    to: '<a href="mailto:contact@gamedoor41.fr?subject=Commande%20carte%20cadeau%20GAMEDOOR%C2%B741" class="btn btn-primary" data-track="cta-cadeau">Commander par email</a>'
  },
  // Pattern 6 : Cadeau "Commander" buttons quiz/escape (tel:)
  {
    re: /<a href="tel:\+33231530751" class="btn btn-quiz" style="width:100%;" data-track="cta-cadeau-quiz">Commander<\/a>/g,
    to: '<a href="mailto:contact@gamedoor41.fr?subject=Commande%20carte%20cadeau%20Quiz" class="btn btn-quiz" style="width:100%;" data-track="cta-cadeau-quiz">Commander par email</a>'
  },
  {
    re: /<a href="tel:\+33231530751" class="btn btn-primary" style="width:100%;" data-track="cta-cadeau-escape">Commander<\/a>/g,
    to: '<a href="mailto:contact@gamedoor41.fr?subject=Commande%20carte%20cadeau%20Escape" class="btn btn-primary" style="width:100%;" data-track="cta-cadeau-escape">Commander par email</a>'
  },
  // Pattern 7 : Cadeau "02 31 53 07 51" CTA primary fin de page
  {
    re: /<a href="tel:\+33231530751" class="btn btn-primary" data-track="cta-cadeau"><img src="\/img\/icons\/phone\.svg" class="gd-icon" alt="" aria-hidden="true"> 02 31 53 07 51<\/a>/g,
    to: '<a href="mailto:contact@gamedoor41.fr?subject=Commande%20carte%20cadeau%20GAMEDOOR%C2%B741" class="btn btn-primary" data-track="cta-cadeau">Commander par email</a>'
  },
  // Pattern 8 : Contact page — bouton "Appeler" outline
  {
    re: /<a href="tel:\+33231530751" class="btn btn-outline"><img src="\/img\/icons\/phone\.svg" class="gd-icon" alt="" aria-hidden="true"> Appeler<\/a>/g,
    to: '<a href="mailto:contact@gamedoor41.fr" class="btn btn-outline">Nous écrire</a>'
  },
];

let totalReplacements = 0;
const files = await findHtml(ROOT);

for (const file of files) {
  const rel = file.replace(ROOT, '').replace(/\\/g, '/');
  if (rel.includes('.bak.') || rel.includes('Architecture SEO') || rel.includes('preview-') || rel.includes('CHARTE-GRAPHIQUE') || rel.includes('PHASE-2-') || rel.includes('PHASE-3-') || rel.includes('GAMEDOOR41 - Home V3.3')) continue;

  let html = await readFile(file, 'utf8');
  let count = 0;
  for (const { re, to } of REPLACEMENTS) {
    const matches = html.match(re);
    if (matches) {
      html = html.replace(re, to);
      count += matches.length;
    }
  }
  if (count > 0) {
    await writeFile(file, html, 'utf8');
    console.log(`+ ${rel}  (${count} replacements)`);
    totalReplacements += count;
  }
}
console.log(`\nDone. ${totalReplacements} CTAs téléphone remplacés par email.`);
