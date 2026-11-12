// Essai 5 : texte mis en forme (gras) dans la page, assistant (mode essai), aperçu plein écran
import { lancerChrome, attendre } from './cdp.mjs';

const SORTIE = process.argv[2] || '.';
const c = await lancerChrome({ port: 9347 });
const etat = (expr) => c.eval('(() => { const e = window.__gdxEtat; return ' + expr + '; })()');
const cadre = 'const f=[...document.querySelectorAll(".scene-principale .gdx-cadre")].find(f=>f.style.visibility==="visible");';
const verifier = (ok, msg) => { console.log((ok ? '  ✔ ' : '  ✖ ') + msg); if (!ok) process.exitCode = 1; };
try {
  await c.taille(1600, 1000);
  await c.aller('http://localhost:8941/editeur/?essai=chloe#/contact/');
  await c.attendreQue('[...document.querySelectorAll(".scene-principale .gdx-cadre")].some(f => f.style.visibility === "visible" && f.contentDocument.querySelector("[data-gdx]"))', 30000);
  await attendre(2000);
  const chemin = await etat('e.courant');

  console.log('1. Gras dans un paragraphe');
  // premier paragraphe de texte simple (sans élément enfant)
  const p = await c.eval('(() => {' + cadre + 'const el=[...f.contentDocument.querySelectorAll("body p")].find(x => x.children.length === 0 && x.textContent.trim().length > 40); el.setAttribute("data-essai", "1"); el.scrollIntoView({block:"center"}); const r=el.getBoundingClientRect(); const k=f.getBoundingClientRect(); const s=k.width/f.offsetWidth; return {x:k.left+(r.left+30)*s, y:k.top+(r.top+8)*s, id: el.getAttribute("data-gdx")}; })()');
  await attendre(300);
  await c.cliquer(p.x, p.y);
  await attendre(200);
  await c.cliquer(p.x, p.y, { double: true });
  await attendre(500);
  verifier(await etat('e.edition') === p.id, 'édition du paragraphe ' + p.id);
  const riche = await c.eval('!!document.querySelector(".barre-texte button[title^=\\"Gras\\"]")');
  verifier(riche, 'barre de mise en forme affichée');
  await c.eval('(() => {' + cadre + 'const d=f.contentDocument; const el=d.querySelector("[data-essai]"); const t=el.firstChild; const r=d.createRange(); r.setStart(t, 0); r.setEnd(t, Math.min(12, t.length)); const s=d.getSelection(); s.removeAllRanges(); s.addRange(r); })()');
  await c.eval('document.querySelector(".barre-texte button[title^=\\"Gras\\"]").dispatchEvent(new MouseEvent("mousedown", {bubbles:true}))');
  await attendre(200);
  await c.eval('document.querySelector(".barre-texte .valider").dispatchEvent(new MouseEvent("mousedown", {bubbles:true}))');
  await attendre(1200);
  console.log('   messages : ' + await c.eval('[...document.querySelectorAll(".toast")].map(t=>t.textContent).join(" | ")'));
  console.log('   édition : ' + await etat('e.edition'));
  const derniere = await etat('JSON.stringify(e.docs[e.courant].etapes[e.docs[e.courant].etapes.length-1])');
  verifier(/"op":"html"/.test(derniere) && /<strong>/.test(derniere), 'opération « html » avec <strong> : ' + (derniere || '').slice(0, 160));
  try { await c.attendreQue('(() => {' + cadre + 'const el=f.contentDocument.querySelector("[data-gdx=\\"' + p.id + '\\"]"); return el && /<strong/.test(el.innerHTML) })()', 8000); } catch (_) { /* vérifié juste après */ }
  const gras = await c.eval('(() => {' + cadre + 'const el=f.contentDocument.querySelector("[data-gdx=\\"' + p.id + '\\"]"); return el ? el.innerHTML.slice(0, 120) : null })()');
  verifier(/<strong/.test(gras || ''), 'le canevas affiche le gras : ' + gras);

  console.log('2. Assistant (mode essai)');
  await c.eval('[...document.querySelectorAll(".rail button")].find(b=>b.textContent.includes("Assistant")).click()');
  await attendre(400);
  await c.eval('document.querySelector(".assistant textarea").focus()');
  await c.taper('Ajoute un encadré d’information sous ce paragraphe');
  await attendre(200);
  await c.eval('[...document.querySelectorAll(".assistant button")].find(b=>/Demander/.test(b.textContent)).click()');
  await c.attendreQue('document.querySelector(".echange .reponse") || document.querySelector(".echange .note-erreur")', 30000);
  await c.ecran(SORTIE + '/30-assistant.png');
  const avant = await etat('e.docs[e.courant].etapes.length');
  await c.eval('[...document.querySelectorAll(".echange button")].find(b=>/Appliquer/.test(b.textContent)).click()');
  await attendre(1000);
  verifier(await etat('e.docs[e.courant].etapes.length') === avant + 1, 'proposition appliquée comme une étape annulable');

  console.log('3. Annuler / rétablir');
  await c.eval('document.querySelector(".barre-haut button[title^=\\"Annuler\\"]").click()');
  await attendre(600);
  verifier(await etat('e.docs[e.courant].position') === avant, 'annulé');
  await c.eval('document.querySelector(".barre-haut button[title^=\\"Rétablir\\"]").click()');
  await attendre(600);
  verifier(await etat('e.docs[e.courant].position') === avant + 1, 'rétabli');

  console.log('4. Aperçu plein écran');
  await c.eval('[...document.querySelectorAll(".barre-haut button")].find(b=>/Aperçu/.test(b.textContent)).click()');
  await c.attendreQue('[...document.querySelectorAll(".scene-tel .gdx-cadre")].some(f => f.style.visibility === "visible" && f.contentDocument.querySelector("[data-gdx]"))', 20000);
  await attendre(1500);
  await c.ecran(SORTIE + '/31-apercu-plein.png');
  verifier(await c.eval('!document.querySelector(".inspecteur") && !document.querySelector(".rail")'), 'panneaux masqués pendant l’aperçu');
  await c.eval('[...document.querySelectorAll(".bandeau-apercu button")][0].click()');
  await attendre(500);
  console.log('   page : ' + chemin);
  const erreurs = c.journal.filter((l) => /EXCEPTION|error/i.test(l));
  verifier(!erreurs.length, 'aucune erreur dans la console' + (erreurs.length ? ' :\n' + erreurs.slice(0, 10).join('\n') : ''));
} catch (e) {
  console.error('ÉCHEC', e.message);
  process.exitCode = 1;
  try { await c.ecran(SORTIE + '/zz-echec-avance.png'); } catch (_) { /* rien */ }
} finally { c.fermer(); }
