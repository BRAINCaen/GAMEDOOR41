// Essai 4 : tour visuel de tous les panneaux et fenêtres (captures)
import { lancerChrome, attendre } from './cdp.mjs';

const SORTIE = process.argv[2] || '.';
const c = await lancerChrome({ port: 9346 });
const clic = (expr) => c.eval('(() => { const b = ' + expr + '; if (b) b.click(); return !!b; })()');
const panneau = (nom) => clic('[...document.querySelectorAll(".rail button")].find(b => b.textContent.includes(' + JSON.stringify(nom) + '))');
const cadre = 'const f=[...document.querySelectorAll(".scene-principale .gdx-cadre")].find(f=>f.style.visibility==="visible");';
try {
  await c.taille(1600, 1000);
  await c.aller('http://localhost:8941/editeur/?essai=allan#/escape-game-caen/psychiatric/');
  await c.attendreQue('[...document.querySelectorAll(".scene-principale .gdx-cadre")].some(f => f.style.visibility === "visible" && f.contentDocument.querySelector("[data-gdx]"))', 30000);
  await attendre(2500);
  // sélection d'un titre pour l'inspecteur
  await c.eval('(() => {' + cadre + 'const el=f.contentDocument.querySelector("h2"); el.scrollIntoView({block:"center"}); el.click(); })()');
  await attendre(800);
  for (const [nom, fichier] of [['Calques', '10-calques'], ['Pages', '11-pages'], ['Médias', '12-medias'], ['Google', '13-google'], ['Vérifier', '14-verifier'], ['Assistant', '15-assistant'], ['Historique', '16-historique']]) {
    await panneau(nom);
    await attendre(nom === 'Pages' ? 2500 : 900);
    await c.ecran(SORTIE + '/' + fichier + '.png');
  }
  // recherche sur tout le site
  await panneau('Rechercher');
  await attendre(300);
  await c.eval('(() => { const i=document.querySelector(".recherche input[type=search]"); i.focus(); })()');
  await c.taper('1h30');
  await clic('[...document.querySelectorAll(".recherche button")].find(b=>/Chercher/.test(b.textContent))');
  await c.attendreQue('document.querySelector(".res-page") || /0 résultat/.test(document.querySelector(".recherche").textContent)', 60000);
  await attendre(500);
  await c.ecran(SORTIE + '/17-recherche.png');
  // inspecteur : style et avancé
  await clic('[...document.querySelectorAll(".insp-tete .onglets button")].find(b=>b.textContent==="Style")');
  await attendre(500);
  await c.ecran(SORTIE + '/18-style.png');
  await clic('[...document.querySelectorAll(".insp-tete .onglets button")].find(b=>b.textContent==="Avancé")');
  await attendre(500);
  await c.ecran(SORTIE + '/19-avance.png');
  // menu contextuel
  await c.eval('window.__gdxEtat && (() => { const e = window.__gdxEtat; })()');
  await clic('document.querySelector(".barre-flottante button[title=\\"Plus d’actions\\"]")');
  await attendre(400);
  await c.ecran(SORTIE + '/20-menu.png');
  await c.touche('Escape', 'Escape', 27);
  // fenêtres
  await c.eval('document.body.dispatchEvent(new MouseEvent("mousedown", {bubbles:true}))');
  await panneau('Pages');
  await attendre(400);
  await clic('[...document.querySelectorAll(".pages button")].find(b=>/Créer une nouvelle page/.test(b.textContent))');
  await attendre(500);
  await c.ecran(SORTIE + '/21-nouvelle-page.png');
  await c.touche('Escape', 'Escape', 27);
  await attendre(300);
  await clic('document.querySelector(".avatar")');
  await attendre(200);
  await clic('[...document.querySelectorAll(".menu-compte button")].find(b=>/Réglages/.test(b.textContent))');
  await attendre(800);
  await c.ecran(SORTIE + '/22-reglages.png');
  await c.touche('Escape', 'Escape', 27);
  await attendre(300);
  await c.envoyer('Input.dispatchKeyEvent', { type: 'keyDown', key: 'k', code: 'KeyK', windowsVirtualKeyCode: 75, modifiers: 2 });
  await c.envoyer('Input.dispatchKeyEvent', { type: 'keyUp', key: 'k', code: 'KeyK', windowsVirtualKeyCode: 75, modifiers: 2 });
  await attendre(400);
  await c.taper('tarif');
  await attendre(300);
  await c.ecran(SORTIE + '/23-palette.png');
  await c.touche('Escape', 'Escape', 27);
  // éditeur sur téléphone
  await c.taille(390, 844, true);
  await attendre(1500);
  await c.ecran(SORTIE + '/24-editeur-telephone.png', { largeur: 390, hauteur: 844, mobile: true });
  const erreurs = c.journal.filter((l) => /EXCEPTION|error/i.test(l));
  console.log(erreurs.length ? erreurs.slice(0, 10).join('\n') : 'Aucune erreur dans la console');
} catch (e) {
  console.error('ÉCHEC', e.message);
  try { await c.ecran(SORTIE + '/zz-echec-tour.png'); } catch (_) { /* rien */ }
} finally { c.fermer(); }
