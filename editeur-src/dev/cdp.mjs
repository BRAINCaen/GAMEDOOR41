// Petit pilote de Chrome (protocole DevTools) pour les essais de l'éditeur — sans dépendance.
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

export async function lancerChrome({ port = 9333, visible = false } = {}) {
  const profil = mkdtempSync(join(tmpdir(), 'gdx-chrome-'));
  const args = ['--remote-debugging-port=' + port, '--user-data-dir=' + profil, '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--window-size=1600,1000', '--lang=fr-FR'];
  if (!visible) args.push('--headless=new');
  const p = spawn(CHROME, [...args, 'about:blank'], { stdio: 'ignore' });
  let version = null;
  for (let i = 0; i < 60 && !version; i++) {
    try { version = await (await fetch('http://127.0.0.1:' + port + '/json/version')).json(); } catch (_) { await attendre(250); }
  }
  if (!version) throw new Error('Chrome ne répond pas');
  const cibles = await (await fetch('http://127.0.0.1:' + port + '/json')).json();
  const page = cibles.find((c) => c.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r, e) => { ws.onopen = r; ws.onerror = e; });
  let id = 0;
  const attente = new Map();
  const ecouteurs = [];
  const journal = [];
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && attente.has(d.id)) { const { res, rej } = attente.get(d.id); attente.delete(d.id); if (d.error) rej(new Error(d.error.message)); else res(d.result); }
    else if (d.method) {
      if (d.method === 'Runtime.consoleAPICalled') journal.push('[console.' + d.params.type + '] ' + d.params.args.map((a) => a.value ?? a.description ?? '').join(' '));
      if (d.method === 'Runtime.exceptionThrown') journal.push('[EXCEPTION] ' + (d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text));
      for (const f of ecouteurs) f(d);
    }
  };
  const envoyer = (method, params = {}) => new Promise((res, rej) => { const n = ++id; attente.set(n, { res, rej }); ws.send(JSON.stringify({ id: n, method, params })); });
  await envoyer('Page.enable');
  await envoyer('Runtime.enable');
  const c = {
    envoyer, journal,
    async aller(url) { await envoyer('Page.navigate', { url }); await attendre(300); await c.attendreQue('document.readyState === "complete"', 20000); },
    async eval(expr, { attendrePromesse = true } = {}) {
      const r = await envoyer('Runtime.evaluate', { expression: expr, awaitPromise: attendrePromesse, returnByValue: true });
      if (r.exceptionDetails) throw new Error('eval : ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
      return r.result.value;
    },
    async attendreQue(expr, delai = 15000) {
      const fin = Date.now() + delai;
      for (;;) {
        let ok = false;
        try { ok = await c.eval('!!(' + expr + ')'); } catch (_) { /* rien */ }
        if (ok) return true;
        if (Date.now() > fin) throw new Error('Délai dépassé : ' + expr);
        await attendre(200);
      }
    },
    async ecran(fichier, { largeur = 1600, hauteur = 1000, mobile = false } = {}) {
      await envoyer('Emulation.setDeviceMetricsOverride', { width: largeur, height: hauteur, deviceScaleFactor: 1, mobile });
      await attendre(400);
      const r = await envoyer('Page.captureScreenshot', { format: 'png' });
      writeFileSync(fichier, Buffer.from(r.data, 'base64'));
      return fichier;
    },
    async taille(largeur, hauteur, mobile = false) { await envoyer('Emulation.setDeviceMetricsOverride', { width: largeur, height: hauteur, deviceScaleFactor: 1, mobile }); },
    async cliquer(x, y, { double = false } = {}) {
      for (const type of ['mousePressed', 'mouseReleased']) await envoyer('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
      if (double) for (const type of ['mousePressed', 'mouseReleased']) await envoyer('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 2 });
    },
    async taper(texte) { await envoyer('Input.insertText', { text: texte }); },
    async touche(key, code, keyCode, modifiers = 0) {
      await envoyer('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: keyCode, modifiers });
      await envoyer('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: keyCode, modifiers });
    },
    fermer() { try { ws.close(); } catch (_) { /* rien */ } p.kill(); },
  };
  return c;
}

export { attendre };
