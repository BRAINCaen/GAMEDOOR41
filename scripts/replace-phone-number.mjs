#!/usr/bin/env node
/**
 * Remplace un numéro de téléphone par un autre sur l'ensemble du site
 * (pages, blog, scripts, docs).
 *
 * Passage du 02 55 99 19 37 au 06 31 46 93 22 effectué le 03/08/2026.
 * Les numéros sont volontairement écrits en morceaux (voir OLD / NEW ci-dessous)
 * pour que le script ne se réécrive pas lui-même quand il balaie scripts/.
 *
 * Couvre tous les formats rencontrés dans le dépôt :
 *   +33XXXXXXXXX   (liens tel: et JSON-LD "telephone")
 *   0X XX XX XX XX (texte affiché)
 *   variantes collée / points / tirets, par sécurité
 *
 * Usage : node scripts/replace-phone-number.mjs
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');

// Découpés en fragments : évite que le script se modifie lui-même.
const OLD = ['02', '55', '99', '19', '37'];
const NEW = ['06', '31', '46', '93', '22'];

const SKIP_DIRS = new Set(['.git', 'node_modules', 'video']);
const EXTENSIONS = ['.html', '.htm', '.js', '.mjs', '.cjs', '.json', '.md', '.xml', '.txt', '.toml', '.css', '.py'];

const pairs = (sep2) => [OLD.join(sep2), NEW.join(sep2)];

// Ordre important : les formats les plus longs / spécifiques d'abord.
const REPLACEMENTS = [
  ['+33' + OLD.join('').slice(1), '+33' + NEW.join('').slice(1)],
  ['+33 ' + OLD[0].slice(1) + ' ' + OLD.slice(1).join(' '), '+33 ' + NEW[0].slice(1) + ' ' + NEW.slice(1).join(' ')],
  pairs(' '),
  pairs('.'),
  pairs('-'),
  pairs(''),
];

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, files);
    } else if (EXTENSIONS.some((ext) => entry.toLowerCase().endsWith(ext))) {
      files.push(full);
    }
  }
  return files;
}

let touched = 0;
let total = 0;

for (const file of walk(ROOT)) {
  const before = readFileSync(file, 'utf8');
  let after = before;
  let count = 0;

  for (const [from, to] of REPLACEMENTS) {
    const occurrences = after.split(from).length - 1;
    if (occurrences > 0) {
      after = after.split(from).join(to);
      count += occurrences;
    }
  }

  if (count > 0) {
    writeFileSync(file, after, 'utf8');
    touched += 1;
    total += count;
    console.log(`  ${relative(ROOT, file).split(sep).join('/')} — ${count} remplacement(s)`);
  }
}

console.log(`\n${total} remplacement(s) dans ${touched} fichier(s).`);
