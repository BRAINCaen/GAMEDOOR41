#!/usr/bin/env node
// Fabrique les fonctions serveur du calendrier de l'Avent.
//   node avent-src/construire.mjs
// Tout est regroupé dans netlify/avent-coeur.mjs (aucune dépendance à installer chez Netlify).
// Les outils (esbuild, @netlify/blobs) sont ceux de l'éditeur : editeur-src/node_modules.
import { writeFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, '..');
const OUTILS = join(RACINE, 'editeur-src', 'node_modules');
const { build } = await import(pathToFileURL(join(OUTILS, 'esbuild', 'lib', 'main.js')).href);

const COEUR = join(RACINE, 'netlify', 'avent-coeur.mjs');
await build({
  entryPoints: [join(ICI, 'entree.mjs')],
  outfile: COEUR,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  nodePaths: [OUTILS],
  minify: false,
  legalComments: 'none',
  banner: { js: '// Fichier construit par avent-src/construire.mjs — ne pas modifier à la main.' },
  logLevel: 'warning',
});
const tete = '// Calendrier de l’Avent — écrit par avent-src/construire.mjs.\n';
writeFileSync(join(RACINE, 'netlify', 'functions', 'avent.mjs'), tete + `import { gererAvent } from '../avent-coeur.mjs';

export default async (req, context) => gererAvent(req, context);

export const config = { path: '/api/avent/*' };
`);
writeFileSync(join(RACINE, 'netlify', 'functions', 'avent-tirage.mjs'), tete + `// Fonction planifiée, toutes les demi-heures : tirage de la veille dès midi, mail au gagnant, bilan à l'équipe.
import { tirageDuJour } from '../avent-coeur.mjs';

export default async () => { await tirageDuJour(); };

export const config = { schedule: '1,31 * * * *' };
`);
console.log('Calendrier de l’Avent construit : netlify/avent-coeur.mjs (' + Math.round(statSync(COEUR).size / 1024) + ' Ko) + 2 fonctions.');
