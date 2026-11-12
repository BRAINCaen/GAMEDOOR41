// Essai 3 : temps entre une modification et son affichage dans le canevas (ordinateur + téléphone)
import { lancerChrome, attendre } from './cdp.mjs';

const c = await lancerChrome({ port: 9343 });
try {
  await c.taille(1600, 1000);
  await c.aller('http://localhost:8941/editeur/?essai=bea#/index.html');
  await c.attendreQue('[...document.querySelectorAll(".scene-principale .gdx-cadre")].some(f => f.style.visibility === "visible" && f.contentDocument.querySelector("[data-gdx]"))', 30000);
  await c.eval('[...document.querySelectorAll(".segments button")].find(b=>/PC \\+ mobile/.test(b.textContent)).click()');
  await attendre(3000);
  for (let i = 0; i < 4; i++) {
    const t = await c.eval(`(async () => {
      const visible = (sel) => [...document.querySelectorAll(sel + ' .gdx-cadre')].find(f => f.style.visibility === 'visible');
      const avantPC = visible('.scene-principale'); const avantTel = visible('.scene-tel');
      const debut = performance.now();
      [...document.querySelectorAll('.carte-bloc')][${i}].click();
      let pc = null, tel = null;
      while (performance.now() - debut < 10000 && (pc === null || tel === null)) {
        await new Promise(r => setTimeout(r, 20));
        if (pc === null && visible('.scene-principale') !== avantPC) pc = Math.round(performance.now() - debut);
        if (tel === null && visible('.scene-tel') !== avantTel) tel = Math.round(performance.now() - debut);
      }
      return { pc, tel };
    })()`);
    console.log('Ajout ' + (i + 1) + ' : affiché sur ordinateur en ' + t.pc + ' ms, sur téléphone en ' + t.tel + ' ms');
  }
} finally { c.fermer(); }
