// Diagnostic : qu'est-ce qui retarde le chargement d'un rendu du canevas ?
import { lancerChrome, attendre } from './cdp.mjs';

const c = await lancerChrome({ port: 9344 });
try {
  await c.taille(1600, 1000);
  await c.aller('http://localhost:8941/editeur/?essai=bea#/index.html');
  await c.attendreQue('[...document.querySelectorAll(".scene-principale .gdx-cadre")].some(f => f.style.visibility === "visible" && f.contentDocument.querySelector("[data-gdx]"))', 30000);
  await attendre(1500);
  const r = await c.eval(`(async () => {
    const base = window.__gdxCanevas.html;
    const variantes = {
      original: base,
      sansExternes: base.replace(/<link[^>]+https?:\\/\\/[^>]+>/g, ''),
      sansScriptsDefer: base.replace(/<script defer[^>]*><\\/script>/g, ''),
      sansStyleCss: base.replace(/<link rel="stylesheet" href="\\/css\\/[^>]+>/g, ''),
      sansImages: base.replace(/<img[^>]*>/g, '').replace(/<source[^>]*>/g, '').replace(/<video[\\s\\S]*?<\\/video>/g, ''),
    };
    const out = {};
    for (const [nom, html] of Object.entries(variantes)) {
      const f = document.createElement('iframe');
      f.style.cssText = 'position:fixed;left:0;top:0;width:800px;height:600px;visibility:hidden';
      document.body.appendChild(f);
      const t0 = performance.now();
      f.srcdoc = html;
      let dcl = null;
      while (performance.now() - t0 < 12000 && dcl === null) {
        await new Promise((r) => setTimeout(r, 20));
        try { if (f.contentDocument && f.contentDocument.readyState !== 'loading' && f.contentDocument.body && f.contentDocument.body.childElementCount) dcl = Math.round(performance.now() - t0); } catch (e) {}
      }
      out[nom] = dcl;
      f.remove();
    }
    return out;
  })()`);
  console.log(JSON.stringify(r, null, 2));
} finally { c.fermer(); }
