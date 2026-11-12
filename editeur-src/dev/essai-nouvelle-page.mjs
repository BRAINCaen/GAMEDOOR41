// Essai 6 : nouvelle page (formulaire → bloc → relecture → publication → plan du site)
import { lancerChrome, attendre } from './cdp.mjs';

const SORTIE = process.argv[2] || '.';
const c = await lancerChrome({ port: 9349 });
const etat = (expr) => c.eval('(() => { const e = window.__gdxEtat; return ' + expr + '; })()');
const verifier = (ok, msg) => { console.log((ok ? '  ✔ ' : '  ✖ ') + msg); if (!ok) process.exitCode = 1; };
const saisir = async (sel, texte) => { await c.eval('document.querySelector(' + JSON.stringify(sel) + ').focus()'); await c.taper(texte); };
try {
  await c.taille(1600, 1000);
  await c.aller('http://localhost:8941/editeur/?essai=eva#/index.html');
  await c.attendreQue('[...document.querySelectorAll(".scene-principale .gdx-cadre")].some(f => f.style.visibility === "visible" && f.contentDocument.querySelector("[data-gdx]"))', 30000);
  await attendre(2500);
  await c.eval('[...document.querySelectorAll(".rail button")].find(b=>b.textContent.includes("Pages")).click()');
  await attendre(400);
  await c.eval('[...document.querySelectorAll(".pages button")].find(b=>/Créer une nouvelle page/.test(b.textContent)).click()');
  await attendre(400);
  await saisir('.modale input[placeholder^="Ex. Soirée"]', 'Soirée enquête de Noël');
  await saisir('.modale textarea', 'Une soirée enquête spéciale Noël à Mondeville, près de Caen : escape game et quiz entre amis ou collègues.');
  await attendre(300);
  const adresse = await c.eval('document.querySelector(".modale .adresse input").value');
  verifier(adresse === 'soiree-enquete-de-noel', 'adresse proposée : ' + adresse);
  await c.eval('[...document.querySelectorAll(".modale-pied button")].find(b=>/Créer la page/.test(b.textContent)).click()');
  await c.attendreQue('window.__gdxEtat.courant === "soiree-enquete-de-noel/index.html"', 15000);
  await c.attendreQue('[...document.querySelectorAll(".scene-principale .gdx-cadre")].some(f => f.style.visibility === "visible" && f.contentDocument.querySelector("h1.gdb-titre-page"))', 20000);
  verifier(true, 'nouvelle page ouverte dans l’éditeur');
  // phrase d'introduction (texte d'exemple) remplacée depuis l'inspecteur
  await c.eval('(() => { const f=[...document.querySelectorAll(".scene-principale .gdx-cadre")].find(f=>f.style.visibility==="visible"); f.contentDocument.querySelector("p.gdb-texte").click(); })()');
  await attendre(500);
  const ri = await c.eval('(() => { const t=document.querySelector(".inspecteur textarea"); const b=t.getBoundingClientRect(); return {x:b.left+20,y:b.top+12}; })()');
  await c.cliquer(ri.x, ri.y);
  await c.eval('document.querySelector(".inspecteur textarea").select()');
  await c.taper('Le 19 décembre, enquêtez en équipe dans nos salles puis affrontez-vous sur le plateau du quiz.');
  await c.eval('document.querySelector(".inspecteur textarea").blur()');
  await attendre(800);
  await c.eval('[...document.querySelectorAll(".carte-bloc")].find(b=>/Encadré « Bon/.test(b.textContent)).click()');
  await attendre(1200);
  await c.ecran(SORTIE + '/40-nouvelle-page.png');
  // le bloc contient un texte d'exemple : la publication doit être bloquée tant qu'il n'est pas remplacé
  await c.eval('[...document.querySelectorAll(".barre-haut button")].find(b=>/Publier/.test(b.textContent)).click()');
  await attendre(600);
  verifier(await c.eval('!!document.querySelector(".modale .note-erreur")'), 'texte d’exemple : publication bloquée');
  await c.touche('Escape', 'Escape', 27);
  await attendre(300);
  // remplir le texte du bloc via l'inspecteur (champ par champ)
  const n = await c.eval('document.querySelectorAll(".inspecteur textarea").length');
  for (let i = 0; i < n; i++) {
    const r = await c.eval('(() => { const t=document.querySelectorAll(".inspecteur textarea")[' + i + ']; if (!t) return null; t.scrollIntoView(); const b=t.getBoundingClientRect(); return {x:b.left+20,y:b.top+12}; })()');
    if (!r) continue;
    await c.cliquer(r.x, r.y);
    await c.eval('document.querySelectorAll(".inspecteur textarea")[' + i + '].select()');
    await c.taper(i === 0 ? 'Bon à savoir' : 'Les dates seront annoncées ici dès qu’elles seront fixées.');
    await c.eval('document.querySelectorAll(".inspecteur textarea")[' + i + '].blur()');
    await attendre(700);
  }
  const reste = await etat('e.docs[e.courant].relecture({}).filter(r => r.niveau === "bloquant").map(r => r.message).join(" | ")');
  verifier(!reste, 'plus de point bloquant' + (reste ? ' : ' + reste : ''));
  await c.eval('[...document.querySelectorAll(".barre-haut button")].find(b=>/Publier/.test(b.textContent)).click()');
  await attendre(500);
  await saisir('.modale input[placeholder^="Ex. Ajout"]', 'Nouvelle page soirée enquête de Noël');
  await attendre(300);
  await c.eval('[...document.querySelectorAll(".modale-pied button")].find(b=>/Publier maintenant/.test(b.textContent)).click()');
  await c.attendreQue('/C’est publié/.test(document.querySelector(".modale-tete h2") && document.querySelector(".modale-tete h2").textContent) || document.querySelector(".modale .note-erreur")', 60000);
  verifier(await c.eval('/C’est publié/.test(document.querySelector(".modale-tete h2").textContent)'), 'publication réussie' + (await c.eval('document.querySelector(".modale .note-erreur") ? document.querySelector(".modale .note-erreur").textContent : ""')));
  const page = await (await fetch('http://localhost:8941/soiree-enquete-de-noel/')).text();
  verifier(/Soirée enquête de Noël/.test(page) && /Les dates seront annoncées/.test(page) && /editeur-blocs\.css/.test(page), 'la nouvelle page est en ligne avec son bloc');
  const sm = await (await fetch('http://localhost:8941/sitemap.xml')).text();
  verifier(/soiree-enquete-de-noel/.test(sm), 'ajoutée au plan du site');
  const erreurs = c.journal.filter((l) => /EXCEPTION|error/i.test(l));
  verifier(!erreurs.length, 'aucune erreur dans la console' + (erreurs.length ? ' :\n' + erreurs.slice(0, 10).join('\n') : ''));
} catch (e) {
  console.error('ÉCHEC', e.message);
  process.exitCode = 1;
  try { await c.ecran(SORTIE + '/zz-echec-np.png'); } catch (_) { /* rien */ }
} finally { c.fermer(); }
