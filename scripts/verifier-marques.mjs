#!/usr/bin/env node
// Contrôle des pages après l'audit des marques du 23/11/2026 : aucune formule interdite, aucune
// valeur commerciale périmée, une ligne de marques dans chaque pied de page.
// À lancer avant chaque publication qui touche les textes : node scripts/verifier-marques.mjs
// Sortie 1 s'il reste quelque chose (rien n'est modifié par ce script).

import fs from 'node:fs';
import { execSync } from 'node:child_process';

const PAGES = execSync('git ls-files "*.html" "blog-feed.xml"', { encoding: 'utf8' }).split('\n').filter(Boolean)
  .filter((f) => !/^(editeur|editeur-src|signatures|node_modules)\//.test(f));

// [nom de la règle, expression, explication]
const INTERDITS = [
  ['fusion des marques', /fusionn/i, 'BRAIN et Buzz Your Brain n’ont pas fusionné : l’établissement a pris l’enseigne GAMEDOOR·41.'],
  ['« devenu GAMEDOOR »', /(sont|est) devenue?s? GAMEDOOR|devenue? GAMEDOOR·41|Brain devient GAMEDOOR/i, 'Les marques ne sont pas devenues GAMEDOOR·41.'],
  ['équation des marques', /= ?GAMEDOOR·41/, '« Brain + Buzz = GAMEDOOR·41 » est remplacé par « GAMEDOOR·41 réunit… ».'],
  ['« anciennement Brain/Buzz »', /anciennement (<[^>]+>)*(Brain|Buzz|B\.R\.A\.I\.N)/i, 'BRAIN et Buzz Your Brain restent les noms des expériences.'],
  ['« ex-Brain »', /\bex[- ]Brain/i, 'Même raison.'],
  ['nouvelle marque / nouveau nom', /nouvelle marque|nouveau nom de Brain/i, 'GAMEDOOR·41 est une enseigne, pas le nouveau nom de BRAIN.'],
  ['propriété exclusive', /propriété exclusive de GAMEDOOR/i, 'Les marques et scénarios sous licence appartiennent à leurs titulaires.'],
  ['signature GAMEDOOR sur une salle', /signature GAMEDOOR|signée? GAMEDOOR|créée? par GAMEDOOR/i, 'Les escape games sont des expériences BRAIN.'],
  ['plateforme européenne fermée', /ec\.europa\.eu\/consumers\/odr/i, 'Service arrêté le 20 juillet 2025.'],
  ['validité illimitée', /validité illimitée|valable à vie|sans date limite/i, 'Cartes cadeaux : 12 mois.'],
  ['quiz à 40', /4 ?(-|–|à) ?40 (candidat|joueur|enfant|personne)/i, 'Quiz : 4 à 16 candidats par session.'],
  ['40 joueurs max', /40 joueurs max/i, 'Capacité : 30 en escape + 16 au quiz = 46.'],
  ['quiz 15 € HT', /15 ?€ ?HT/i, 'Quiz pro : 15 € TTC, soit 13,64 € HT.'],
  ['adresse « en centre-ville »', /rue Pasteur en centre-ville|unique en centre-ville/i, 'L’établissement est à Mondeville, ZAC Calix.'],
  ['« N°1 » sans source', /N°1<|#1 sur Caen|numéro 1 (à|de|sur) Caen/i, 'Pas de classement sans source datée.'],
  ['« unique en Normandie »', /unique en Normandie/i, 'Pas d’allégation absolue sans source.'],
  ['vieux compteur d’avis', /plus de 2(&nbsp;| )?[0-2]00 avis/i, 'Compteur Google dépassé.'],
];

let soucis = 0;
for (const f of PAGES) {
  const t = fs.readFileSync(f, 'utf8');
  for (const [nom, re, pourquoi] of INTERDITS) {
    const m = t.match(re);
    if (!m) continue;
    const i = m.index, extrait = t.slice(Math.max(0, i - 60), i + m[0].length + 60).replace(/\s+/g, ' ');
    console.log(`✗ ${f} — ${nom} : « …${extrait}… »\n    ${pourquoi}`);
    soucis++;
  }
  if (f.endsWith('.html')) {
    const n = t.split('class="footer-marques"').length - 1;
    if (n !== 1) { console.log(`✗ ${f} — ${n} ligne(s) de marques dans le pied de page (attendu : 1)`); soucis++; }
    if (/<script type="application\/ld\+json">/.test(t)) {
      for (const bloc of t.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
        try { JSON.parse(bloc[1]); } catch (e) { console.log(`✗ ${f} — données structurées illisibles : ${e.message}`); soucis++; }
      }
    }
  }
}
console.log(soucis ? `\n${soucis} point(s) à corriger sur ${PAGES.length} fichiers.` : `✓ ${PAGES.length} fichiers contrôlés : aucune formule interdite, une ligne de marques par page, données structurées lisibles.`);
process.exit(soucis ? 1 : 0);
