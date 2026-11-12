// Chronologie détaillée de 4 rendus successifs (états du cadre caché)
import { lancerChrome, attendre } from './cdp.mjs';

const c = await lancerChrome({ port: 9345 });
try {
  await c.taille(1600, 1000);
  await c.aller('http://localhost:8941/editeur/?essai=bea#/index.html');
  await c.attendreQue('[...document.querySelectorAll(".scene-principale .gdx-cadre")].some(f => f.style.visibility === "visible" && f.contentDocument.querySelector("[data-gdx]"))', 30000);
  await attendre(2500);
  for (let i = 0; i < 4; i++) {
    const t = await c.eval(`(async () => {
      const cadres = [...document.querySelectorAll('.scene-principale .gdx-cadre')];
      const vis = () => cadres.findIndex(f => f.style.visibility === 'visible');
      const v0 = vis();
      const cache = cadres[1 - v0];
      const ev = [];
      const t0 = performance.now();
      const orig = window.__gdxPret;
      window.__gdxPret = (j) => { ev.push('signal ' + j + ' @' + Math.round(performance.now() - t0)); return orig(j); };
      [...document.querySelectorAll('.carte-bloc')][${i + 4}].click();
      let rs = null, sw = null;
      while (performance.now() - t0 < 8000 && sw === null) {
        await new Promise(r => setTimeout(r, 15));
        let x; try { x = cache.contentDocument.readyState + (cache.contentDocument.body ? '+corps' : ''); } catch (e) { x = 'err'; }
        if (x !== rs) { ev.push(x + ' @' + Math.round(performance.now() - t0)); rs = x; }
        if (vis() !== v0) sw = Math.round(performance.now() - t0);
      }
      window.__gdxPret = orig;
      return { sw, ev };
    })()`);
    console.log('Rendu ' + (i + 1) + ' : bascule à ' + t.sw + ' ms · ' + t.ev.join(' · '));
  }
} finally { c.fermer(); }
