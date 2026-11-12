// Essai 2 : parcours complet d'une personne de l'équipe
//  sélection → texte modifié dans la page → suppression refusée → bloc ajouté → texte du bloc
//  → style → PC + mobile → publication (aperçu puis mise en ligne) → vérification du fichier publié
import { lancerChrome, attendre } from './cdp.mjs';

const SORTIE = process.argv[2] || '.';
const c = await lancerChrome({ port: 9342 });
const etat = (expr) => c.eval('(() => { const e = window.__gdxEtat; return ' + expr + '; })()');
const cadre = 'const f=[...document.querySelectorAll(".scene-principale .gdx-cadre")].find(f=>f.style.visibility==="visible");';
const point = (sel, decal = 10) => c.eval('(() => {' + cadre + 'const el=f.contentDocument.querySelector(' + JSON.stringify(sel) + '); if(!el) return null; el.scrollIntoView({block:"center"}); const r=el.getBoundingClientRect(); const k=f.getBoundingClientRect(); const s=k.width/f.offsetWidth; return {x:k.left+(r.left+Math.min(r.width/2, 40))*s, y:k.top+(r.top+' + decal + ')*s}; })()');
const verifier = (ok, msg) => { console.log((ok ? '  ✔ ' : '  ✖ ') + msg); if (!ok) process.exitCode = 1; };

try {
  await c.taille(1600, 1000);
  await c.aller('http://localhost:8941/editeur/?essai=allan#/tarifs/');
  await c.attendreQue('[...document.querySelectorAll(".scene-principale .gdx-cadre")].some(f => f.style.visibility === "visible" && f.contentDocument.querySelector("[data-gdx]"))', 30000);
  await attendre(800);

  console.log('1. Sélection');
  let p = await point('.tfh-pitch');
  await attendre(300);
  p = await point('.tfh-pitch');
  await c.cliquer(p.x, p.y);
  await attendre(400);
  const sel = await etat('e.selection');
  const nomInsp = await c.eval('document.querySelector(".insp-titre strong") && document.querySelector(".insp-titre strong").textContent');
  verifier(sel && nomInsp === 'Paragraphe', 'paragraphe sélectionné (' + sel + ', ' + nomInsp + ')');

  console.log('2. Texte modifié dans la page');
  await c.cliquer(p.x, p.y, { double: true });
  await attendre(400);
  verifier(await etat('e.edition') === sel, 'édition en cours');
  await c.eval('(() => {' + cadre + 'const d=f.contentDocument; const el=d.querySelector(".tfh-pitch"); const r=d.createRange(); r.selectNodeContents(el); const s=d.getSelection(); s.removeAllRanges(); s.addRange(r); })()');
  await c.taper('Le prix dépend du nombre de joueurs : plus vous êtes nombreux, moins c’est cher. Tout est inclus, sans aucun supplément caché.');
  await c.touche('Enter', 'Enter', 13);
  await attendre(900);
  const etapes = await etat('e.docs["tarifs/index.html"].etapes.length');
  verifier(etapes === 1, 'une étape enregistrée (' + etapes + ') : ' + await etat('JSON.stringify(e.docs["tarifs/index.html"].etapes[0] && e.docs["tarifs/index.html"].etapes[0].libelle)'));
  const texteCanevas = await c.eval('(() => {' + cadre + 'return f.contentDocument.querySelector(".tfh-pitch").textContent })()');
  verifier(/sans aucun supplément caché/.test(texteCanevas), 'le canevas affiche le nouveau texte');

  console.log('3. Suppression d’un contenu publié refusée');
  await c.touche('Delete', 'Delete', 46);
  await attendre(500);
  const toastTxt = await c.eval('[...document.querySelectorAll(".toast")].map(t=>t.textContent).join(" | ")');
  verifier(/Interdit/.test(toastTxt), 'message « Interdit » affiché');
  verifier(await etat('e.docs["tarifs/index.html"].etapes.length') === 1, 'aucune étape ajoutée');

  console.log('4. Ajout d’un bloc');
  await c.eval('[...document.querySelectorAll(".carte-bloc")].find(b => /Encadré « Bon/.test(b.textContent) || /Titre de section/.test(b.textContent)).click()');
  await attendre(900);
  const selBloc = await etat('e.selection');
  verifier(selBloc && selBloc.includes('.'), 'nouveau bloc sélectionné (' + selBloc + ')');
  await c.ecran(SORTIE + '/02-bloc-ajoute.png');

  console.log('5. Texte du bloc depuis l’inspecteur');
  const nbChamps = await c.eval('document.querySelectorAll(".inspecteur textarea").length');
  verifier(nbChamps > 0, nbChamps + ' champ(s) de texte dans l’inspecteur');
  const r5 = await c.eval('(() => { const t=document.querySelector(".inspecteur textarea"); t.scrollIntoView(); const r=t.getBoundingClientRect(); return {x:r.left+20,y:r.top+12}; })()');
  await c.cliquer(r5.x, r5.y);
  await c.eval('document.querySelector(".inspecteur textarea").select()');
  await c.taper('Nouveau : réservez en ligne en deux minutes, 7 jours sur 7.');
  await attendre(200);
  await c.eval('document.querySelector(".inspecteur textarea").blur()');
  await attendre(900);
  const libs = await etat('e.docs["tarifs/index.html"].etapes.map(x=>x.libelle).join(" / ")');
  verifier((libs.match(/Texte modifié/g) || []).length === 2, 'texte du bloc enregistré : ' + libs);

  console.log('6. Style (couleur)');
  await c.eval('[...document.querySelectorAll(".insp-tete .onglets button")].find(b=>b.textContent==="Style").click()');
  await attendre(400);
  const nuancier = await c.eval('!!document.querySelector(".inspecteur .nuancier button[title=\\"Orange GAMEDOOR\\"]")');
  verifier(nuancier, 'nuancier affiché');
  await c.eval('document.querySelector(".inspecteur .nuancier button[title=\\"Orange GAMEDOOR\\"]").click()');
  await attendre(900);
  console.log('   étapes : ' + await etat('e.docs["tarifs/index.html"].etapes.map(x=>x.libelle).join(" / ")'));
  console.log('   messages : ' + await c.eval('[...document.querySelectorAll(".toast")].map(t=>t.textContent).join(" | ")'));
  const cssOk = await c.eval('(() => {' + cadre + 'const s=f.contentDocument.querySelector("#gd-editeur"); return s ? s.textContent : "(pas de bloc)" })()');
  verifier(/color:#FF6B00 !important/i.test(cssOk), 'style posé dans le bloc de styles de la page : ' + cssOk.slice(0, 160));

  console.log('7. Ordinateur + téléphone');
  await c.eval('[...document.querySelectorAll(".segments button")].find(b=>/PC \\+ mobile/.test(b.textContent)).click()');
  await c.attendreQue('[...document.querySelectorAll(".scene-tel .gdx-cadre")].some(f => f.style.visibility === "visible" && f.contentDocument.querySelector("[data-gdx]"))', 20000);
  await attendre(1200);
  const telTexte = await c.eval('[...document.querySelectorAll(".scene-tel .gdx-cadre")].find(f=>f.style.visibility==="visible").contentDocument.body.textContent.includes("sans aucun supplément caché")');
  verifier(telTexte, 'l’aperçu téléphone montre la modification');
  await c.ecran(SORTIE + '/03-pc-mobile.png');

  console.log('8. Publication');
  await c.eval('[...document.querySelectorAll(".barre-haut button")].find(b=>/Publier/.test(b.textContent)).click()');
  await attendre(600);
  await c.eval('(() => { const i=document.querySelector(".modale input[placeholder^=\\"Ex. Ajout\\"]"); i.value="Essai de l’éditeur sur la page tarifs"; i.dispatchEvent(new Event("input",{bubbles:true})); })()');
  await attendre(400);
  await c.ecran(SORTIE + '/04-publier.png');
  const bloquant = await c.eval('!!document.querySelector(".modale .note-erreur")');
  verifier(!bloquant, 'aucun point bloquant');
  await c.eval('[...document.querySelectorAll(".modale-pied button")].find(b=>/Aperçu en ligne/.test(b.textContent)).click()');
  await c.attendreQue('document.querySelector(".modale .qr") || document.querySelector(".modale .note-erreur")', 60000);
  verifier(await c.eval('!!document.querySelector(".modale .qr")'), 'aperçu en ligne prêt avec code QR');
  await c.ecran(SORTIE + '/05-apercu.png');
  await c.eval('[...document.querySelectorAll(".modale-pied button")].find(b=>/Publier cet aperçu/.test(b.textContent)).click()');
  await c.attendreQue('/C’est publié/.test(document.querySelector(".modale-tete h2") && document.querySelector(".modale-tete h2").textContent) || document.querySelector(".modale .note-erreur")', 60000);
  verifier(await c.eval('/C’est publié/.test(document.querySelector(".modale-tete h2").textContent)'), 'publication réussie');
  await c.attendreQue('/Vérifié|Mise en ligne en cours/.test(document.querySelector(".modale").textContent)', 90000);
  console.log('   ' + await c.eval('document.querySelector(".modale .note") ? document.querySelector(".modale .note").textContent : ""'));
  const publie = await (await fetch('http://localhost:8941/tarifs/')).text();
  verifier(publie.includes('sans aucun supplément caché') && publie.includes('7 jours sur 7') && publie.includes('gd-editeur'), 'le fichier publié contient les modifications');
  const avant = (await (await fetch('http://localhost:8941/__dev/etat')).json());
  console.log('   PR : ' + JSON.stringify(avant.prs.map((x) => ({ n: x.n, fusionne: x.fusionne, titre: x.titre }))));
  await c.ecran(SORTIE + '/06-publie.png');
  const erreurs = c.journal.filter((l) => /EXCEPTION|error/i.test(l));
  verifier(!erreurs.length, 'aucune erreur dans la console' + (erreurs.length ? ' :\n' + erreurs.slice(0, 10).join('\n') : ''));
} catch (e) {
  console.error('ÉCHEC', e.message);
  process.exitCode = 1;
  try { await c.ecran(SORTIE + '/zz-echec.png'); } catch (_) { /* rien */ }
  console.log(c.journal.slice(-15).join('\n'));
} finally { c.fermer(); }
