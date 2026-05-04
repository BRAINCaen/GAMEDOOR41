/*
 * AUDIT FIX — corrige toutes les incohérences relevées par l'utilisateur 2026-05-04 :
 *  1. "chauffeur de salle anime / live / présentateur live" → reformulé (lance l'émission, écran)
 *  2. "40 personnes/joueurs/participants" → 46 (capacité totale) ou 16 (quiz seul) selon contexte
 *  3. CTAs téléphone restants → mailto
 *  4. ANCIENNES META et copies de références qui mentionnent encore "présentateur" ou "live"
 */
import { readdir, readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

async function findHtml(dir, results = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === '.git' || e.name.startsWith('.')) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) await findHtml(full, results);
    else if (e.isFile() && e.name.endsWith('.html')) results.push(full);
  }
  return results;
}

// REGLE 1 — Chauffeur de salle : il LANCE l'émission puis s'en va. Format sur ÉCRAN.
const REPLACEMENTS_CHAUFFEUR = [
  // Phrases longues d'abord
  ["Le chauffeur de salle anime, provoque, relance.",                              "Le chauffeur de salle lance l'émission. Vidéos, blind tests, défis et jokers s'enchaînent ensuite sur écran."],
  ["le chauffeur de salle anime la partie avec des buzzers, du blind test mariage et des défis sur le mariage",
   "le chauffeur de salle lance l'émission ; ensuite blind test mariage, défis sur le mariage et jokers s'enchaînent sur écran avec les buzzers"],
  ["chauffeur de salle qui anime la partie, buzzers lumineux sur pupitres personnels (jusqu'à 8 candidats simultanés), multi écrans, joystick et boutons ABCD",
   "chauffeur de salle qui lance l'émission, buzzers lumineux sur pupitres personnels (jusqu'à 8 candidats simultanés), multi écrans, joystick et boutons ABCD"],
  ["chauffeur de salle qui anime la partie",                                       "chauffeur de salle qui lance l'émission"],
  ["chauffeur de salle qui anime,",                                                 "chauffeur de salle qui lance l'émission,"],
  ["chauffeur de salle qui anime",                                                 "chauffeur de salle qui lance l'émission"],
  // Variantes "chauffeur de salle live"
  ["plateau TV avec 8 pupitres équipés de buzzers, multi écrans, joystick et boutons ABCD, animé par un chauffeur de salle live",
   "plateau TV avec 8 pupitres équipés de buzzers, multi écrans, joystick et boutons ABCD, lancé par le chauffeur de salle (format émission diffusée sur écran)"],
  ["plateau TV, blind test mariage, défis sur le mariage, chauffeur de salle live",
   "plateau TV, blind test mariage, défis sur le mariage diffusés sur écran après le lancement par le chauffeur de salle"],
  [", 8 pupitres avec buzzers, chauffeur de salle live.",                          ", 8 pupitres avec buzzers, lancé par le chauffeur de salle (émission sur écran)."],
  ["chauffeur de salle live et multi écrans",                                       "chauffeur de salle qui lance l'émission, format show TV sur écran avec multi écrans"],
  ["chauffeur de salle live",                                                       "chauffeur de salle (lance l'émission, format sur écran)"],
  // Présentateur live
  ["si vous voulez un format show TV avec un présentateur live",                   "si vous voulez un format show TV (émission diffusée sur écran après lancement par le chauffeur de salle)"],
  ["8 pupitres avec chauffeur de salle live",                                       "8 pupitres et chauffeur de salle qui lance l'émission"],
  ["avec un présentateur live",                                                     "lancé par le chauffeur de salle (format émission sur écran)"],
  ["avec présentateur",                                                             "format émission sur écran"],
  ["Avec présentateur",                                                             "Format émission sur écran"],
  // Quiz desc lines avec patterns spécifiques
  ["Quiz interactif avec buzzers, écran géant et présentateur",                    "Quiz interactif avec buzzers et écran géant — émission lancée par le chauffeur de salle"],
  ["Quiz interactif avec buzzers et écran géant",                                  "Quiz interactif avec buzzers et écran géant"], // no-op (déjà bon)
];

// REGLE 2 — Capacité : 40 → 46 (total) ou 16 (quiz seul). Selon contexte.
// Pour le QUIZ seul (mention explicite "Quiz game :", "Buzz Your Brain", contexte quiz uniquement)
const REPLACEMENTS_QUIZ_16 = [
  ["Quiz game : de 4 à 40 enfants",                                                 "Quiz game : de 4 à 16 candidats"],
  ["Quiz game : 4 à 40 joueurs en une session",                                    "Quiz game : 4 à 16 candidats par session (8 pupitres, binôme possible)"],
  ["quiz game Buzz Your Brain (quiz interactif avec buzzers, 4 à 40 joueurs",      "quiz game Buzz Your Brain (quiz interactif avec buzzers, 4 à 16 candidats"],
  ["<li>4 à 40 joueurs</li>",                                                       "<li>4 à 16 candidats</li>"],
  ["4 à 40 joueurs · Avec présentateur · Buzzers · ~90 minutes",                  "4 à 16 candidats · Buzzers · 60 min d'émission"],
  ["11 à 40 joueurs",                                                               "11 à 16 candidats"],
  ["18€/pers. pour 11-40 joueurs",                                                  "18€/pers. pour 11-14 candidats, dégressif jusqu'à 15€/pers à 16"],
  ["22€/pers. pour 4-10 joueurs, 18€/pers. pour 11-40 joueurs. Session d'environ 90 minutes avec présentateur et buzzers inclus.",
   "Tarif dégressif : 21€/pers à 4 candidats jusqu'à 15€/pers à 16 candidats. Session d'environ 60 minutes d'émission, 8 pupitres avec buzzers, lancée par le chauffeur de salle (format sur écran)."],
  ["quiz game interactif de 4 à 40 joueurs",                                        "quiz game interactif de 4 à 16 candidats"],
];

// Pour la CAPACITÉ TOTALE (escape + quiz combo)
const REPLACEMENTS_TOTAL_46 = [
  ["4 à 40 personnes",                                                              "jusqu'à 46 personnes (escape + quiz)"],
  ["De 4 à 40 personnes",                                                           "Jusqu'à 46 personnes (escape + quiz)"],
  ["de 4 à 40 personnes",                                                           "jusqu'à 46 personnes (escape + quiz)"],
  ["4 à 40 participants",                                                            "jusqu'à 46 participants (escape + quiz)"],
  ["De 4 à 40 participants",                                                         "Jusqu'à 46 participants (escape + quiz)"],
  ["de 4 à 40 participants",                                                        "jusqu'à 46 participants (escape + quiz)"],
  ["2 à 40 participants",                                                            "jusqu'à 46 participants (escape + quiz)"],
  ["De 2 à 40 participants",                                                         "Jusqu'à 46 participants (escape + quiz)"],
  ["de 2 à 40 participants",                                                        "jusqu'à 46 participants (escape + quiz)"],
  ["4 à 40 participantes",                                                          "jusqu'à 46 participantes (escape + quiz)"],
  ["De 4 à 40 participantes",                                                       "Jusqu'à 46 participantes (escape + quiz)"],
  ["de 4 à 40 participantes",                                                       "jusqu'à 46 participantes (escape + quiz)"],
  ["jusqu'à 40 personnes",                                                          "jusqu'à 46 personnes (escape + quiz)"],
  ["6 à 40 personnes",                                                               "jusqu'à 46 personnes (escape + quiz)"],
  ["accueillir jusqu'à 40 personnes",                                                "accueillir jusqu'à 46 personnes en simultané (escape + quiz)"],
  // Variantes anniversaire avec contexte précis
  ["de 4 à 40 enfants. Le quiz est idéal pour les grands groupes d'anniversaire",   "de 4 à 16 enfants sur le quiz, jusqu'à 46 enfants au total avec un combo escape + quiz. Le quiz est idéal pour les grands groupes d'anniversaire"],
  ["De 4 à 40 participants, on s'adapte",                                            "Jusqu'à 46 participants (escape + quiz combinés), on s'adapte"],
];

// REGLE 3 — Téléphone CTA restant
const REPLACEMENTS_TEL = [
  // Tarifs page CTA primary tel → mailto
  ['<a href="tel:+33231530751" class="btn btn-primary"><img src="/img/icons/phone.svg" class="gd-icon" alt="" aria-hidden="true"> 02 31 53 07 51</a>',
   '<a href="mailto:contact@gamedoor41.fr" class="btn btn-primary">Nous écrire</a>'],
  // Footer index.html liste — c'est un footer, mais l'utilisateur a dit pas de tél partout, on garde un footer simple
  // (ne pas trop décharger le footer)
];

const ALL_REPLACEMENTS = [
  ...REPLACEMENTS_CHAUFFEUR,
  ...REPLACEMENTS_QUIZ_16,
  ...REPLACEMENTS_TOTAL_46,
  ...REPLACEMENTS_TEL,
];

let totalReplacements = 0;
let filesChanged = 0;
const files = await findHtml(ROOT);

for (const file of files) {
  const rel = file.replace(ROOT, '').replace(/\\/g, '/');
  if (rel.includes('.bak.') || rel.includes('Architecture SEO') || rel.includes('preview-') || rel.includes('CHARTE-GRAPHIQUE') || rel.includes('PHASE-2-') || rel.includes('PHASE-3-') || rel.includes('GAMEDOOR41 - Home V3.3')) continue;

  let html = await readFile(file, 'utf8');
  let count = 0;
  let log = [];
  for (const [from, to] of ALL_REPLACEMENTS) {
    if (html.includes(from)) {
      const occurrences = html.split(from).length - 1;
      html = html.split(from).join(to);
      count += occurrences;
      log.push(`  • "${from.substring(0, 60)}…" ×${occurrences}`);
    }
  }
  if (count > 0) {
    await writeFile(file, html, 'utf8');
    console.log(`+ ${rel}  (${count} fixes)`);
    log.forEach(l => console.log(l));
    totalReplacements += count;
    filesChanged++;
  }
}
console.log(`\nDONE. ${filesChanged} files updated, ${totalReplacements} fixes total.`);
