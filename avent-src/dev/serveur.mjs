#!/usr/bin/env node
// Serveur d'essai local : le site + le moteur du calendrier, en mémoire (rien n'est gardé).
//   node avent-src/dev/serveur.mjs [port] [fichier des défis .json]
//   → http://localhost:8948/calendrier-de-l-avent/   (code de l'équipe : code-equipe-essai)
// Variable LENT=800 : ajoute 800 ms à chaque réponse du serveur (réseau de téléphone).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { creerMoteur } from '../coeur.mjs';
import { stockageMemoire } from '../stockage.mjs';
import { lotsPrevus } from '../lots-2026.mjs';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const port = Number(process.argv[2]) || 8948;
const fichier = process.argv[3];
const lent = Number(process.env.LENT) || 0;
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon' };

const stockage = stockageMemoire();
const moteur = creerMoteur({ stockage, contexte: 'apercu', lotsPrevus: lotsPrevus() });
let defis;
if (fichier) defis = JSON.parse(fs.readFileSync(fichier, 'utf8'));
else defis = (await import('../tests/defis-essai.mjs')).defisDEssai();
if (defis) await stockage.ecrire('config/defis', defis);
await moteur.gerer(new Request('http://localhost/api/avent/equipe/initialiser', { method: 'POST', body: JSON.stringify({ code: 'code-equipe-essai' }) }));

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:' + port);
  if (url.pathname.startsWith('/api/avent/')) {
    const morceaux = [];
    for await (const m of req) morceaux.push(m);
    const corps = Buffer.concat(morceaux);
    const r = await moteur.gerer(new Request(url, { method: req.method, headers: req.headers, body: corps.length ? corps : undefined }), { ip: req.socket.remoteAddress });
    if (lent) await new Promise((ok) => setTimeout(ok, lent));
    res.writeHead(r.status, Object.fromEntries(r.headers));
    return res.end(Buffer.from(await r.arrayBuffer()));
  }
  let p = decodeURIComponent(url.pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(RACINE, p);
  if (!f.startsWith(RACINE) || /[\\/](avent-src|editeur-src|netlify|\.git)[\\/]/.test(f) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('404'); }
  if (lent && /\.(jpg|png|webp|avif)$/.test(f)) await new Promise((ok) => setTimeout(ok, lent));
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(port, () => console.log('Essai : http://localhost:' + port + '/calendrier-de-l-avent/' + (defis ? '' : '  (aucun défi chargé)')));
