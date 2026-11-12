#!/usr/bin/env node
// ==========================================================================
// Construit l'éditeur du site (à lancer après toute modification des sources) :
//   node editeur-src/construire.mjs        (depuis la racine du dépôt ou d'ici)
//
//   app/        → editeur/editeur.js + editeur/editeur.css + editeur/index.html
//   serveur/    → netlify/functions/editeur*.mjs (tout est inclus : aucune
//                 dépendance à installer chez Netlify)
// Le site reste « sans étape de build » côté Netlify : les fichiers construits
// sont commités.
// ==========================================================================
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, '..');
const SORTIE = join(RACINE, 'editeur');
const FONCTIONS = join(RACINE, 'netlify', 'functions');
mkdirSync(SORTIE, { recursive: true });
mkdirSync(FONCTIONS, { recursive: true });

const empreinte = (f) => createHash('sha1').update(readFileSync(f)).digest('hex').slice(0, 8);
const ko = (f) => (statSync(f).size / 1024).toFixed(0) + ' Ko';

// Empreintes des fichiers communs des blocs (mêmes que scripts/perf-assets.mjs, sur le contenu du dépôt)
function empreinteDepot(chemin) {
  try { return createHash('sha1').update(readFileSync(join(RACINE, chemin), 'utf8').replace(/\r\n/g, '\n')).digest('hex').slice(0, 8); } catch (_) { return null; }
}

// ---- navigateur
await build({
  entryPoints: [join(ICI, 'app', 'index.jsx')],
  outfile: join(SORTIE, 'editeur.js'),
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2020', 'chrome100', 'firefox100', 'safari15'],
  jsx: 'automatic',
  jsxImportSource: 'preact',
  legalComments: 'none',
  define: { 'process.env.NODE_ENV': '"production"' },
  logLevel: 'warning',
});
await build({
  entryPoints: [join(ICI, 'app', 'editeur.css')],
  outfile: join(SORTIE, 'editeur.css'),
  bundle: true,
  minify: true,
  logLevel: 'warning',
});

const v = { js: empreinte(join(SORTIE, 'editeur.js')), css: empreinte(join(SORTIE, 'editeur.css')) };
writeFileSync(join(SORTIE, 'index.html'), `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>Éditeur du site — GAMEDOOR·41</title>
  <link rel="icon" type="image/svg+xml" href="/img/logo/favicon.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=DM+Sans:ital,wght@0,400;0,500;0,700;1,400&display=swap">
  <link rel="stylesheet" href="/editeur/editeur.css?v=${v.css}">
</head>
<body>
  <div id="editeur"></div>
  <noscript>L’éditeur du site a besoin de JavaScript.</noscript>
  <script defer src="/editeur/editeur.js?v=${v.js}"></script>
</body>
</html>
`);

// ---- serveur : un cœur regroupé (tout inclus, aucune dépendance à installer chez Netlify)
// + trois points d'entrée écrits en clair (Netlify lit « export const config » dans le fichier)
const COEUR = join(RACINE, 'netlify', 'editeur-coeur.mjs');
await build({
  entryPoints: [join(ICI, 'serveur', 'coeur.mjs')],
  outfile: COEUR,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  minify: false,
  legalComments: 'none',
  banner: { js: '// Fichier construit par editeur-src/construire.mjs — ne pas modifier à la main.' },
  logLevel: 'warning',
});
const entetes = `// Point d’entrée de l’éditeur du site — écrit par editeur-src/construire.mjs.
`;
writeFileSync(join(FONCTIONS, 'editeur.mjs'), entetes + `import { gerer } from '../editeur-coeur.mjs';

export default async (req) => gerer(req);

export const config = { path: '/api/editeur/*' };
`);
writeFileSync(join(FONCTIONS, 'editeur-travail-background.mjs'), entetes + `// Fonction « de fond » (jusqu’à 15 min) : aperçu, publication, assistant.
import { executerTravail } from '../editeur-coeur.mjs';

export default async (req) => {
  await executerTravail(req);
};
`);
writeFileSync(join(FONCTIONS, 'editeur-programmation.mjs'), entetes + `// Fonction planifiée : publie les modifications programmées.
import { publierProgrammes } from '../editeur-coeur.mjs';

export default async () => {
  const r = await publierProgrammes();
  if (r && r.publies) console.log('Publications programmées mises en ligne : ' + r.publies);
};

export const config = { schedule: '*/5 * * * *' };
`);

console.log('Éditeur construit :');
console.log('  editeur/editeur.js   ' + ko(join(SORTIE, 'editeur.js')) + '  (v=' + v.js + ')');
console.log('  editeur/editeur.css  ' + ko(join(SORTIE, 'editeur.css')) + '  (v=' + v.css + ')');
console.log('  netlify/editeur-coeur.mjs  ' + ko(COEUR) + '  + 3 points d’entrée dans netlify/functions/');
console.log('  blocs : css ' + empreinteDepot('css/editeur-blocs.css') + ' · js ' + empreinteDepot('js/editeur-blocs.js'));
