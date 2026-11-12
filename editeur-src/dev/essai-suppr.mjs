// Essai : touche Suppr sur un contenu publié (avant et après une édition de texte)
import { lancerChrome, attendre } from './cdp.mjs';

const c = await lancerChrome({ port: 9348 });
const cadre = 'const f=[...document.querySelectorAll(".scene-principale .gdx-cadre")].find(f=>f.style.visibility==="visible");';
const point = (sel) => c.eval('(() => {' + cadre + 'const el=f.contentDocument.querySelector(' + JSON.stringify(sel) + '); el.scrollIntoView({block:"center"}); const r=el.getBoundingClientRect(); const k=f.getBoundingClientRect(); const s=k.width/f.offsetWidth; return {x:k.left+(r.left+30)*s, y:k.top+(r.top+10)*s}; })()');
const toasts = () => c.eval('[...document.querySelectorAll(".toast")].map(t=>t.textContent.slice(0,40)).join(" | ")');
const focus = () => c.eval('(() => { const a = document.activeElement; return a ? a.tagName + (a.className ? "." + a.className : "") : "-"; })()');
try {
  await c.taille(1600, 1000);
  await c.aller('http://localhost:8941/editeur/?essai=dan#/contact/');
  await c.attendreQue('[...document.querySelectorAll(".scene-principale .gdx-cadre")].some(f => f.style.visibility === "visible" && f.contentDocument.querySelector("[data-gdx]"))', 30000);
  await attendre(3000);
  let p = await point('h1');
  await c.cliquer(p.x, p.y);
  await attendre(400);
  console.log('focus après clic :', await focus());
  await c.touche('Delete', 'Delete', 46);
  await attendre(400);
  console.log('A. Suppr après simple clic :', await toasts() || '(aucun message)');
  await c.eval('document.querySelectorAll(".toast button").forEach(b => b.click())');
  p = await point('h1');
  await c.cliquer(p.x, p.y, { double: true });
  await attendre(400);
  await c.taper(' !');
  await c.touche('Enter', 'Enter', 13);
  await attendre(1500);
  console.log('focus après validation :', await focus());
  await c.touche('Delete', 'Delete', 46);
  await attendre(400);
  console.log('B. Suppr après édition :', await toasts() || '(aucun message)');
} finally { c.fermer(); }
