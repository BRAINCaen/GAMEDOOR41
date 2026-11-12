#!/usr/bin/env node
// ==========================================================================
// Serveur d'ESSAI local de l'éditeur (jamais en ligne) :
//   node editeur-src/dev/serveur.mjs [port]
// - sert la racine du dépôt (le site) et l'éditeur construit (/editeur/) ;
// - /api/editeur/* et la fonction de fond tournent avec le VRAI code serveur,
//   mais avec un faux GitHub (lecture du dépôt local, écritures en mémoire)
//   et une fausse connexion (?essai=prenom dans l'adresse de l'éditeur) ;
// - GET /__dev/etat : publications simulées (fichiers « publiés » en mémoire).
// ==========================================================================
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join, dirname, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { creerApi } from '../serveur/api.mjs';
import { stockageMemoire } from '../serveur/stockage.mjs';
import { RefusAcces } from '../serveur/auth.mjs';
import { creerFauxGithub } from './faux-github.mjs';

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, '..', '..');
const PORT = Number(process.argv[2] || 8941);
const git = (...args) => execFileSync('git', args, { cwd: RACINE, encoding: 'buffer', maxBuffer: 1 << 28 });

// ---------------------------------------------------------------- faux GitHub
const FG = creerFauxGithub(RACINE, { port: PORT });
const { fauxGithub, blobs, prs } = FG;
/** Contenu « publié » (version simulée du site après les fusions). */
async function fichierPublie(chemin) {
  if (!FG.commits.has(FG.teteMain)) return null;
  const a = await fauxGithub.arbre(FG.teteMain);
  const e = a.get(chemin);
  return e && blobs.has(e.sha) ? blobs.get(e.sha) : null;
}

// ---------------------------------------------------------------- fausse connexion + faux assistant
const identifierFn = async (req) => {
  const m = /^Bearer essai:([a-z0-9-]+)$/i.exec(req.headers.get('authorization') || '');
  if (!m) throw new RefusAcces('Connexion requise (mode essai : ?essai=prenom).', 401, 'CONNEXION');
  return { uid: 'essai-' + m[1], email: m[1] + '@gamedoor41.fr', nom: m[1][0].toUpperCase() + m[1].slice(1), admin: m[1] !== 'stagiaire' };
};
const fauxIa = async (p) => ({
  explication: 'Mode essai : je propose d’ajouter un encadré d’information sous l’élément sélectionné.',
  questions: ['Quelle est la date exacte de l’offre ?'],
  operations: [{ op: 'inserer', id: (/\[([\w.]+)\]/.exec(p.selection || '') || [])[1] || null, position: 'apres', html: '<div class="gdb-encadre" data-gdb="encadre-info"><p data-gdb-exemple="">Texte proposé par l’assistant (essai).</p></div>', libelle: 'Ajouter un encadré d’information' }],
});

const api = creerApi({ github: fauxGithub, stockage: stockageMemoire(), identifierFn, ia: fauxIa, env: { ANTHROPIC_API_KEY: 'essai' } });

// ---------------------------------------------------------------- serveur HTTP
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif', '.json': 'application/json', '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.woff2': 'font/woff2', '.xml': 'application/xml' };

async function versRequete(req) {
  const morceaux = [];
  for await (const c of req) morceaux.push(c);
  const corps = Buffer.concat(morceaux);
  return new Request('http://localhost:' + PORT + req.url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : corps });
}

async function repondre(res, reponse) {
  res.writeHead(reponse.status, Object.fromEntries(reponse.headers));
  res.end(Buffer.from(await reponse.arrayBuffer()));
}

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/api/editeur/')) return repondre(res, await api.gerer(await versRequete(req)));
    if (url.pathname === '/.netlify/functions/editeur-travail-background') {
      const r = await versRequete(req);
      setTimeout(() => api.executerTravail(r).catch((e) => console.error('travail', e)), 50);
      res.writeHead(202); res.end(); return;
    }
    if (url.pathname === '/__dev/etat') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ teteMain: FG.teteMain, prs: [...prs.values()].map((p) => ({ n: p.number, titre: p.title, fusionne: p.merged, corps: p.body })) }, null, 2));
      return;
    }
    let chemin = decodeURIComponent(url.pathname);
    if (chemin.startsWith('/__dev/apercu/')) chemin = chemin.replace(/^\/__dev\/apercu\/\d+/, '') || '/';
    if (chemin.endsWith('/')) chemin += 'index.html';
    // version « publiée » simulée en priorité (après une publication d'essai)
    const publie = await fichierPublie(chemin.slice(1));
    if (publie) { res.writeHead(200, { 'Content-Type': TYPES[extname(chemin)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(publie); return; }
    const f = normalize(join(RACINE, chemin));
    if (!f.startsWith(RACINE)) { res.writeHead(403); res.end(); return; }
    let s;
    try { s = await stat(f); } catch (_) { res.writeHead(404); res.end('introuvable'); return; }
    if (s.isDirectory()) { res.writeHead(301, { Location: url.pathname + '/' }); res.end(); return; }
    let contenu = await readFile(f);
    // les pages du dépôt local sont en CRLF (autocrlf) : on sert la version du dépôt (LF), comme Netlify
    if (extname(f) === '.html' || extname(f) === '.css' || extname(f) === '.js') contenu = Buffer.from(contenu.toString('utf8').replace(/\r\n/g, '\n'));
    res.writeHead(200, { 'Content-Type': TYPES[extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(contenu);
  } catch (e) {
    console.error(e);
    res.writeHead(500); res.end(String(e && e.stack || e));
  }
}).listen(PORT, () => console.log('Éditeur (essai) : http://localhost:' + PORT + '/editeur/?essai=allan'));
