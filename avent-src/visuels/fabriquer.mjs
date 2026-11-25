#!/usr/bin/env node
// Fabrique les visuels des réseaux sociaux du calendrier de l'Avent : img/avent/post-JJ.jpg et story-JJ.jpg.
//   node avent-src/visuels/fabriquer.mjs            tous les visuels
//   node avent-src/visuels/fabriquer.mjs 4 13 25    seulement ces jours
// Il faut Google Chrome sur le poste (variable CHROME pour un autre chemin) et un accès à Google Fonts.
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { visuel, FORMATS } from './gabarit.mjs';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SORTIE = path.join(RACINE, 'img', 'avent');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 8957, PORT_CHROME = 9367;
const TYPES = { '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.png': 'image/png' };
const jours = process.argv.slice(2).map(Number).filter(Boolean);
const liste = [];
for (let j = 1; j <= 25; j++) if (!jours.length || jours.includes(j)) { liste.push([j, 'post']); if (j <= 24) liste.push([j, 'story']); }
fs.mkdirSync(SORTIE, { recursive: true });

const serveur = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/visuel') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(visuel(Number(url.searchParams.get('j')), url.searchParams.get('f'))); }
  const f = path.join(RACINE, decodeURIComponent(url.pathname));
  if (!f.startsWith(path.join(RACINE, 'img')) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(PORT);
const profil = fs.mkdtempSync(path.join(os.tmpdir(), 'avent-visuels-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT_CHROME}`, `--user-data-dir=${profil}`, '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
let ws, n = 0; const attente = new Map();
const cdp = (m, p = {}) => { const id = ++n; ws.send(JSON.stringify({ id, method: m, params: p })); return new Promise((ok) => attente.set(id, ok)); };
const js = async (e) => (await cdp('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value;
let erreurs = 0;
try {
  let cible;
  for (let i = 0; i < 80 && !cible; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT_CHROME}/json/new?about:blank`, { method: 'PUT' }); if (r.ok) cible = await r.json(); } catch {} await pause(250); }
  if (!cible) throw new Error('Chrome ne démarre pas (' + CHROME + ').');
  ws = new WebSocket(cible.webSocketDebuggerUrl);
  await new Promise((ok, ko) => { ws.onopen = ok; ws.onerror = ko; });
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && attente.has(d.id)) { attente.get(d.id)(d); attente.delete(d.id); } };
  await cdp('Page.enable'); await cdp('Runtime.enable');
  for (const [j, format] of liste) {
    const { l, h } = FORMATS[format];
    await cdp('Emulation.setDeviceMetricsOverride', { width: l, height: h, deviceScaleFactor: 1, mobile: false });
    await cdp('Page.navigate', { url: `http://localhost:${PORT}/visuel?j=${j}&f=${format}` });
    let pret = false;
    for (let i = 0; i < 80 && !pret; i++) { await pause(150); pret = await js(`document.readyState === 'complete' && document.fonts.status === 'loaded' && document.fonts.check('700 40px Oswald') && document.fonts.check('400 30px "DM Sans"') && [...document.images].every((x) => x.complete && x.naturalWidth > 0)`); }
    // rien ne doit sortir du cadre ni se chevaucher : sinon on le dit et on ne garde pas un visuel raté sans prévenir
    const souci = await js(`(() => { const s = []; if (!${pret}) s.push('polices ou images pas chargées'); const cadre = document.querySelector('.cadre').getBoundingClientRect(); document.querySelectorAll('.cadre *').forEach((e) => { const r = e.getBoundingClientRect(); if (r.width && (r.left < -1 || r.right > ${l} + 1 || r.bottom > ${h} + 1)) s.push('sort du cadre : ' + e.className); if (e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).display !== 'inline') s.push('texte trop large : ' + e.className); }); const b = document.querySelector('.bande').getBoundingClientRect(), nt = document.querySelector('.note'); if (nt && nt.getBoundingClientRect().bottom > b.top + 1) s.push('la note touche la bande'); if (${h} > 1500 && b.bottom > ${h} - 250) s.push('la bande descend dans la zone des boutons d’Instagram'); const d = document.querySelector('.duo'); if (d) { const dr = d.getBoundingClientRect(); [...d.children].forEach((e) => { const r = e.getBoundingClientRect(); if (r.top < dr.top - 40 || r.bottom > dr.bottom + 40) s.push('déborde de la zone centrale : ' + e.className); }); } return s.join(' ; '); })()`);
    const r = await cdp('Page.captureScreenshot', { format: 'jpeg', quality: 86 });
    const nom = format + '-' + String(j).padStart(2, '0') + '.jpg';
    fs.writeFileSync(path.join(SORTIE, nom), Buffer.from(r.result.data, 'base64'));
    if (souci) { erreurs++; console.log('SOUCI ' + nom + ' : ' + souci); }
  }
  console.log(liste.length + ' visuels écrits dans img/avent/' + (erreurs ? ' — ' + erreurs + ' À REVOIR' : ', tous contrôlés.'));
  ws.close();
} finally { chrome.kill(); serveur.close(); await pause(300); fs.rmSync(profil, { recursive: true, force: true, maxRetries: 3 }); }
process.exit(erreurs ? 1 : 0);
