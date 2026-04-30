#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

// On ne touche pas aux fichiers d'archive / standalone / .bak
const SKIP = [
  'index.brain.bak.html',
  'index.v33-working.html',
  'GAMEDOOR41 - Home V3.3 (standalone).html',
  'Architecture SEO V2-print.html',
  'extracted-v33/',
  'gamedoor41-design-system/',
  'node_modules/',
  '.git/',
];

// Remplacements (ordre = priorité — plus spécifique d'abord)
const REPLACEMENTS = [
  // Variantes "payez sur place" / "Payez sur place"
  { from: /Payez sur place\b/g, to: 'Payez en ligne en réservant' },
  { from: /payez sur place\b/g, to: 'payez en ligne en réservant' },
  // Variantes "Paiement sur place" / "paiement sur place"
  { from: /Paiement sur place\.?/g, to: 'Paiement en ligne sécurisé.' },
  { from: /paiement sur place\.?/gi, to: 'paiement en ligne sécurisé.' },
  // "régler sur place" si présent
  { from: /régler sur place\b/gi, to: 'régler en ligne en réservant' },
];

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative('.', full);
    if (SKIP.some((s) => rel.startsWith(s) || rel.includes(s))) continue;
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

const files = walk('.');
let totalChanges = 0;
const report = [];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;
  let fileChanges = 0;
  for (const { from, to } of REPLACEMENTS) {
    const matches = content.match(from);
    if (matches) {
      fileChanges += matches.length;
      content = content.replace(from, to);
    }
  }
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    report.push({ file: path.relative('.', file), changes: fileChanges });
    totalChanges += fileChanges;
  }
}

console.log(`\n=== Remplacements ===`);
report.forEach((r) => console.log(`  ${r.file.padEnd(60)} ${r.changes}`));
console.log(`\nTotal: ${totalChanges} remplacements dans ${report.length} fichiers.`);

// Sanity check: rester d'occurrences ?
console.log(`\n=== Sanity check (occurrences restantes après remplacement) ===`);
let leftover = 0;
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const m = content.match(/sur place/gi);
  if (m) {
    leftover += m.length;
    console.log(`  ${path.relative('.', file)}: ${m.length} "sur place" restants (à vérifier manuellement si lié au paiement)`);
  }
}
if (leftover === 0) console.log('  ✓ Aucune occurrence de "sur place" restante.');
