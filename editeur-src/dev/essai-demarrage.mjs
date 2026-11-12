// Essai 1 : l'éditeur démarre, affiche la page d'accueil dans le canevas, sans erreur.
import { lancerChrome, attendre } from './cdp.mjs';

const SORTIE = process.argv[2] || '.';
const c = await lancerChrome({ port: 9341 });
try {
  await c.taille(1600, 1000);
  await c.aller('http://localhost:8941/editeur/?essai=allan#/tarifs/');
  await c.attendreQue('document.querySelector(".zone-canevas")', 20000);
  await c.attendreQue('[...document.querySelectorAll(".gdx-cadre")].some(f => f.style.visibility === "visible" && f.contentDocument && f.contentDocument.querySelector("[data-gdx]"))', 30000);
  await attendre(1500);
  console.log('Titre page :', await c.eval('document.querySelector(".choix-page-titre").textContent'));
  console.log('Éléments annotés :', await c.eval('[...document.querySelectorAll(".gdx-cadre")].find(f=>f.style.visibility==="visible").contentDocument.querySelectorAll("[data-gdx]").length'));
  await c.ecran(SORTIE + '/01-demarrage.png');
  console.log(c.journal.filter((l) => /EXCEPTION|error/i.test(l)).slice(0, 20).join('\n') || 'Aucune erreur dans la console');
} finally { c.fermer(); }
