#!/usr/bin/env node
// Architecture de marque du site (audit du 23/11/2026).
//
//   SARL BOEHME            = la société (devis, factures, mentions légales, CGV)
//   GAMEDOOR·41            = l'enseigne de l'établissement de Mondeville
//   BRAIN Escape Game      = les escape games, exploités sous licence
//   Buzz Your Brain        = le quiz, exploité sous licence
//   Death Zone, événements = créations propres, jamais sous la marque BRAIN ou Buzz
//
// Ce script remplace partout les formules qui laissaient croire que BRAIN et Buzz Your Brain
// « sont devenus » GAMEDOOR·41 ou lui appartiennent, pose la ligne de marques du pied de page,
// et corrige les pages signalées par l'audit (accueil, page de transition, escape, quiz, CGV,
// mentions légales, Mondeville, devis, références, FAQ, réservation…).
//
// Les textes communs sont les constantes MARQUES ci-dessous : c'est là qu'on les change.
// Le script est relançable sans risque : une correction déjà faite est ignorée.
// Contrôle après coup : node scripts/verifier-marques.mjs
//
// Usage : node scripts/appliquer-architecture-marques.mjs [--apercu]

import fs from 'node:fs';
import { execSync } from 'node:child_process';

const APERCU = process.argv.includes('--apercu');

// ---------------------------------------------------------------------------------------
// Textes communs
// ---------------------------------------------------------------------------------------
const MARQUES = {
  bandeau: 'GAMEDOOR·41 réunit les Escape Games BRAIN et le Quiz Buzz Your Brain sous un même toit',
  lienContinuite: 'Vous nous connaissiez sous Brain Caen ou Buzz Your Brain Caen&nbsp;?',
  lienMenu: 'Vous cherchiez Brain Caen&nbsp;?',
  cartoucheEscape: 'Expérience BRAIN Escape Game · Exploitée sous licence chez GAMEDOOR·41',
  cartoucheQuiz: 'Concept Buzz Your Brain · Exploité sous licence chez GAMEDOOR·41',
  piedDePage: "GAMEDOOR·41 est l'enseigne de l'établissement de Mondeville exploité par SARL BOEHME. Les expériences BRAIN Escape Game et Buzz Your Brain y sont exploitées sous licence. Marques et contenus protégés&nbsp;: propriété de leurs titulaires respectifs.",
  faqQuestion: 'Est-ce que BRAIN a changé de nom ?',
  faqReponse: "Non. C'est notre établissement de Mondeville qui a adopté l'enseigne GAMEDOOR·41. Les Escape Games BRAIN et le Quiz Buzz Your Brain continuent d'être proposés sous leurs marques, dans le cadre des licences correspondantes.",
  reservation: 'Vous réservez auprès de SARL BOEHME, enseigne GAMEDOOR·41. Les expériences BRAIN Escape Game et Buzz Your Brain sont exploitées sous licence.',
};

// ---------------------------------------------------------------------------------------
// Outils
// ---------------------------------------------------------------------------------------
const PAGES = execSync('git ls-files "*.html"', { encoding: 'utf8' }).split('\n').filter(Boolean)
  .filter((f) => !/^(editeur|editeur-src|signatures|node_modules)\//.test(f));

const fichiers = new Map(); // chemin → { texte (fins de ligne LF), crlf, origine }
function lire(f) {
  if (!fichiers.has(f)) { const brut = fs.readFileSync(f, 'utf8'); fichiers.set(f, { texte: brut.replace(/\r\n/g, '\n'), crlf: brut.includes('\r\n'), origine: brut }); }
  return fichiers.get(f);
}
const bilan = { faites: 0, dejaFaites: 0, erreurs: [] };
const echapper = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const compter = (texte, motif) => texte.split(motif).length - 1;

/** Remplace `ancien` par `nouveau`. attendu : nombre d'occurrences attendu, ou 'tous' (au moins une). */
function rempl(f, ancien, nouveau, attendu = 1) {
  const d = lire(f);
  if (nouveau && nouveau.includes(ancien) && d.texte.includes(nouveau)) { bilan.dejaFaites++; return; }
  const n = compter(d.texte, ancien);
  if (n === 0) { if (nouveau && d.texte.includes(nouveau)) bilan.dejaFaites++; else bilan.erreurs.push(`${f} : introuvable « ${ancien.slice(0, 70)} »`); return; }
  if (attendu !== 'tous' && n !== attendu) { bilan.erreurs.push(`${f} : « ${ancien.slice(0, 70)} » trouvé ${n} fois, attendu ${attendu}`); return; }
  d.texte = d.texte.split(ancien).join(nouveau); bilan.faites += n;
}
/** Même chose avec une expression régulière. `fait` : texte dont la présence prouve que c'est déjà fait. */
function rx(f, regex, nouveau, fait, attendu = 1) {
  const d = lire(f);
  // « Déjà fait » se teste AVANT de chercher l'ancien texte : un ajout laisse l'ancien en place et serait posé deux fois.
  if (typeof fait === 'function' ? fait(d.texte) : fait && d.texte.includes(fait)) { bilan.dejaFaites++; return; }
  const n = regex.global ? (d.texte.match(regex) || []).length : (regex.test(d.texte) ? 1 : 0);
  if (n === 0) { bilan.erreurs.push(`${f} : introuvable ${String(regex).slice(0, 80)}`); return; }
  if (attendu !== 'tous' && n !== attendu) { bilan.erreurs.push(`${f} : ${String(regex).slice(0, 80)} trouvé ${n} fois, attendu ${attendu}`); return; }
  d.texte = d.texte.replace(regex, nouveau); bilan.faites += n;
}
/** Texte tolérant aux retours à la ligne et aux attributs des balises simples (<strong style="…">). */
const souple = (s) => new RegExp(echapper(s).replace(/\s+/g, '\\s+').replace(/<(strong|p|em|li|span|h2|h3)>/g, '<$1[^>]*>'), 'g');
/** Remplacement partout où la formule existe, sans exiger qu'elle soit présente. */
function partout(ancien, nouveau, liste = PAGES) {
  for (const f of liste) { const d = lire(f); const n = compter(d.texte, ancien); if (n) { d.texte = d.texte.split(ancien).join(nouveau); bilan.faites += n; } }
}

// ---------------------------------------------------------------------------------------
// 1. Toutes les pages
// ---------------------------------------------------------------------------------------
partout('<strong>Brain Escape Game + Buzz Your Brain = GAMEDOOR·41</strong>', `<strong>${MARQUES.bandeau}</strong>`);
partout('>Anciennement Brain Escape Game &amp; Buzz Your Brain</a>', `>${MARQUES.lienContinuite}</a>`);
partout('>Brain devient GAMEDOOR·41</a>', `>${MARQUES.lienMenu}</a>`);
partout('© 2026 GAMEDOOR·41 — ', '© 2026 SARL BOEHME · GAMEDOOR·41 — ');
partout('&copy; 2026 GAMEDOOR·41 &mdash; ', '&copy; 2026 SARL BOEHME &middot; GAMEDOOR·41 &mdash; ');
partout('plus de 2&nbsp;100 avis', 'plus de 2&nbsp;300 avis');

// Textes alternatifs des photos : les salles sont des escape games BRAIN joués chez GAMEDOOR·41.
for (const f of PAGES) {
  const d = lire(f);
  d.texte = d.texte.replace(/alt="[^"]*"/g, (alt) => alt.replace(/([Ee]scape [Gg]ame) GAMEDOOR·41/g, (m, eg) => { bilan.faites++; return `${eg} BRAIN chez GAMEDOOR·41`; }));
}

// Ligne de marques en bas du pied de page (une seule par page).
const LIGNE_PIED = `<p class="footer-marques" style="flex-basis:100%;width:100%;max-width:none;margin:10px 0 0;font-size:.8rem;line-height:1.55;color:var(--grey, #8a847b);">${MARQUES.piedDePage}</p>`;
const sansPied = [];
for (const f of PAGES) {
  const d = lire(f);
  if (d.texte.includes('class="footer-marques"')) { bilan.dejaFaites++; continue; }
  const debut = d.texte.lastIndexOf('<footer'), fin = d.texte.indexOf('</footer>', debut);
  if (debut < 0 || fin < 0) { sansPied.push(f); continue; }
  const pied = d.texte.slice(debut, fin);
  // Ancre : le paragraphe des liens légaux (celui qui mène aux mentions légales), sur une ou plusieurs lignes.
  const ancres = [...pied.matchAll(/<p[^>]*>(?:(?!<\/p>)[\s\S])*href="\/mentions-legales\/"(?:(?!<\/p>)[\s\S])*<\/p>/g)];
  if (!ancres.length) { sansPied.push(f); continue; }
  const a = ancres[ancres.length - 1], ou = debut + a.index, apres = ou + a[0].length;
  const retrait = d.texte.slice(d.texte.lastIndexOf('\n', ou) + 1, ou).match(/^[ \t]*/)[0];
  d.texte = d.texte.slice(0, apres) + '\n' + retrait + LIGNE_PIED + d.texte.slice(apres); bilan.faites++;
}

// « (anciennement Brain Escape Game) » accolé au nom du lieu : le lieu s'appelle GAMEDOOR·41, BRAIN reste le nom des escape games.
rempl('escape-game-mondeville/index.html', "c'est GAMEDOOR·41 (anciennement Brain Escape Game) : 41 bis rue Pasteur", "c'est GAMEDOOR·41, où se jouent les escape games BRAIN : 41 bis rue Pasteur");
rempl('escape-game-mondeville/index.html', 'GAMEDOOR·41 (anciennement Brain Escape Game et Buzz Your Brain) est au', "GAMEDOOR·41 (l'établissement que vous connaissiez sous les noms Brain Escape Game et Buzz Your Brain) est au", 2);
partout(' (anciennement Brain Escape Game)', '');

// ---------------------------------------------------------------------------------------
// 2. Accueil
// ---------------------------------------------------------------------------------------
{
  const f = 'index.html';
  rempl(f, 'GAMEDOOR·41, anciennement <em style="color:#E07020;">Brain Escape Game Caen</em> et <em style="color:#9D4EDD;">Buzz Your Brain</em>', 'GAMEDOOR·41 réunit les <em style="color:#E07020;">Escape Games BRAIN</em> et le quiz <em style="color:#9D4EDD;">Buzz Your Brain</em>');
  rempl(f, 'Vous êtes au bon endroit. Depuis avril 2026, nos deux enseignes historiques ont fusionné sous une nouvelle marque : <strong>GAMEDOOR·41</strong>. Même équipe,', "Vous êtes au bon endroit. Depuis avril 2026, notre établissement de Mondeville vous accueille sous une enseigne commune&nbsp;: <strong>GAMEDOOR·41</strong>. Les Escape Games BRAIN et le quiz Buzz Your Brain y sont toujours proposés sous leurs marques, exploitées sous licence. Même équipe,");
  rempl(f, "Brain Escape Game Caen, c'était (et c'est toujours) <strong>3 univers immersifs</strong>", 'Les Escape Games BRAIN à Caen, ce sont toujours <strong>3 univers immersifs</strong>');
  rempl(f, "Buzz Your Brain Caen, c'était (et c'est toujours) le <strong>quiz géant type plateau TV</strong>", "Buzz Your Brain à Caen, c'est toujours le <strong>quiz géant type plateau TV</strong>");
  rempl(f, 'Pourquoi le changement de nom&nbsp;? Pour réunir nos deux activités sous une seule marque, plus simple à mémoriser,', "Pourquoi une nouvelle enseigne&nbsp;? Pour réunir nos activités sous une seule porte d'entrée, plus simple à mémoriser,");
  rempl(f, "<strong>Rien n'a changé pour vous, sauf le nom au-dessus de la porte.</strong>", "<strong>Même équipe, même adresse, mêmes expériences&nbsp;: seule l'enseigne au-dessus de la porte est nouvelle.</strong>");
  rx(f, /(<span class="brand-badge escape"[^>]*>)Escape Game(<\/span>)/g, '$1Escape Games BRAIN$2', 'Escape Games BRAIN</span>');
  // Données structurées : la société, et la marque de chaque expérience.
  if (!lire(f).texte.includes('"legalName"')) rempl(f, '    "name": "GAMEDOOR·41",\n    "alternateName"', '    "name": "GAMEDOOR·41",\n    "legalName": "SARL BOEHME",\n    "alternateName"');
  rempl(f, '            "name": "Escape Game à Caen",\n', '            "name": "Escape Game à Caen",\n            "brand": { "@type": "Brand", "name": "BRAIN Escape Game" },\n');
  rempl(f, '            "name": "Quiz Buzz Your Brain à Caen",\n', '            "name": "Quiz Buzz Your Brain à Caen",\n            "brand": { "@type": "Brand", "name": "Buzz Your Brain" },\n');
}

// ---------------------------------------------------------------------------------------
// 3. Page de transition /brain-devient-gamedoor41/ (adresse conservée pour Google)
// ---------------------------------------------------------------------------------------
{
  const f = 'brain-devient-gamedoor41/index.html';
  rempl(f, '<title>Brain Caen est devenu GAMEDOOR·41 — Escape Game &amp; Quiz</title>', "<title>Brain Caen : l'établissement s'appelle GAMEDOOR·41 — Escape Game &amp; Quiz</title>");
  rempl(f, "content=\"Brain Escape Game et Buzz Your Brain Caen s'appellent désormais GAMEDOOR·41 : même équipe, même adresse, mêmes salles. Réservation en ligne.\"", "content=\"L'établissement Brain Caen de Mondeville s'appelle désormais GAMEDOOR·41. Les escape games BRAIN et le quiz Buzz Your Brain y sont toujours proposés : même équipe, même adresse, mêmes salles.\"");
  rempl(f, 'content="Brain Caen est devenu GAMEDOOR·41"', "content=\"Brain Caen : l'établissement s'appelle GAMEDOOR·41\"", 2);
  rempl(f, 'content="Brain Escape Game + Buzz Your Brain = GAMEDOOR·41. ', `content="${MARQUES.bandeau}. `, 2);
  rempl(f, '"name": "Brain devient GAMEDOOR·41"', '"name": "Brain Caen et GAMEDOOR·41"');
  rempl(f, '<span>Brain devient GAMEDOOR·41</span>', '<span>Brain Caen et GAMEDOOR·41</span>');
  rempl(f, '"description": "Escape game et quiz game à Caen-Mondeville depuis 2017. Anciennement Brain Escape Game et Buzz Your Brain, réunis sous le nom GAMEDOOR·41 en 2026."', "\"description\": \"Établissement de loisirs à Caen-Mondeville depuis 2017, sous l'enseigne GAMEDOOR·41 depuis 2026. On y joue les escape games BRAIN et le quiz Buzz Your Brain, exploités sous licence.\"");
  // Haut de page
  rempl(f, 'BRAIN CAEN · NOUVEAU NOM', 'BRAIN CAEN · NOUVELLE ENSEIGNE');
  rempl(f, 'sont devenus GAMEDOOR·41</span></h1>', 'se jouent chez GAMEDOOR·41</span></h1>');
  rempl(f, '— seul le nom a changé.</p>', "— seule l'enseigne de l'établissement a changé.</p>");
  rx(f, souple("étaient deux enseignes du même établissement, à la même adresse, tenues par la même équipe. Depuis 2026, elles portent un seul nom :"), "partagent depuis toujours le même établissement, la même adresse et la même équipe.\n          Depuis 2026, cet établissement porte une enseigne commune :", 'cet établissement porte une enseigne commune');
  rx(f, souple("</strong>. Rien n'a fermé, rien n'a déménagé,"), "</strong>. BRAIN et Buzz Your Brain restent les noms des expériences, exploitées sous licence.\n          Rien n'a fermé, rien n'a déménagé,", 'restent les noms des expériences, exploitées sous licence');
  // Ce qui change / ne change pas
  rx(f, /^([ \t]*)<li><strong([^>]*)>Le quiz<\/strong> — le plateau Buzz Your Brain est toujours là, sous son nom\.<\/li>$/m, "$1<li><strong$2>Le quiz</strong> — le plateau Buzz Your Brain est toujours là, sous son nom.</li>\n$1<li><strong$2>Les marques</strong> — BRAIN pour les escape games, Buzz Your Brain pour le quiz&nbsp;: elles restent les noms des expériences, exploitées sous licence.</li>", '>Les marques</strong>');
  rempl(f, 'Le nom</strong> — un seul, GAMEDOOR·41, au lieu de deux enseignes séparées.', "L'enseigne</strong> — une seule pour tout l'établissement, GAMEDOOR·41, au lieu de deux noms séparés.");
  rempl(f, '— le nouveau nom laisse la place aux univers à venir, sans avoir à créer une troisième enseigne.', '— la nouvelle enseigne laisse la place à nos propres créations à venir, sans avoir à inventer un troisième nom.');
  // Table de correspondance
  rempl(f, '>Ancien nom</th>', '>Vous cherchiez</th>');
  rempl(f, ">Aujourd'hui</th>", ">C'est ici</th>");
  rempl(f, '>Escape Game Caen — GAMEDOOR·41</a>', '>Escape Games BRAIN chez GAMEDOOR·41</a>');
  rempl(f, '— la toute première salle de Brain.', "— la toute première salle de l'établissement.");
  // Pourquoi
  rempl(f, 'Pourquoi avoir changé de nom', 'Pourquoi une nouvelle enseigne', 3);
  rempl(f, 'Un changement de nom, pas un changement de maison.', "Un changement d'enseigne, pas un changement de maison.");
  rx(f, /FAQ Brain (→|&rarr;|&#8594;) GAMEDOOR·41/g, 'FAQ Brain Caen &amp; GAMEDOOR·41', 'FAQ Brain Caen &amp; GAMEDOOR·41');
  rempl(f, 'Le nom a changé, <span', "L'enseigne a changé, <span");
  // Questions
  rempl(f, "\"text\": \"Non. Brain Escape Game n'a jamais fermé : l'enseigne a changé de nom et s'appelle GAMEDOOR·41 depuis 2026. Même équipe, même adresse au 41 bis rue Pasteur à Mondeville, mêmes salles. Seul le nom et le site internet ont changé.\"", "\"text\": \"Non. Rien n'a fermé : c'est notre établissement de Mondeville qui a adopté l'enseigne GAMEDOOR·41 en 2026. Les escape games BRAIN s'y jouent toujours, avec la même équipe, à la même adresse (41 bis rue Pasteur à Mondeville), dans les mêmes salles. Seuls l'enseigne et le site internet ont changé.\"");
  rx(f, /Non\. <strong([^>]*)>Brain Escape Game n'a jamais fermé<\/strong> : l'enseigne a changé de nom et s'appelle GAMEDOOR·41 depuis 2026\. Même équipe, même adresse au 41 bis rue Pasteur à Mondeville, mêmes salles\. Seuls le nom et le site internet ont changé\./g, "Non. <strong$1>Rien n'a fermé</strong> : c'est notre établissement de Mondeville qui a adopté l'enseigne GAMEDOOR·41 en 2026. Les escape games BRAIN s'y jouent toujours, avec la même équipe, à la même adresse (41 bis rue Pasteur à Mondeville), dans les mêmes salles. Seuls l'enseigne et le site internet ont changé.", ">Rien n'a fermé</strong> : c'est notre établissement");
  rempl(f, 'Quel est le nouveau nom de Brain Caen ?', 'Brain Caen a-t-il changé de nom ?', 2);
  rempl(f, '"text": "GAMEDOOR·41. Les deux enseignes historiques — Brain Escape Game pour les salles d\'escape et Buzz Your Brain pour le quiz — sont désormais réunies sous ce seul nom. Le site officiel est gamedoor41.fr."', `"text": "${MARQUES.faqReponse} Le site officiel de l'établissement est gamedoor41.fr."`);
  rx(f, /<strong([^>]*)>GAMEDOOR·41\.<\/strong> Les deux enseignes historiques — Brain Escape Game pour les salles d'escape et Buzz Your Brain pour le quiz — sont désormais réunies sous ce seul nom\. Le site officiel est (<a [^>]*>gamedoor41\.fr<\/a>)\./g, `<strong$1>Non.</strong> ${MARQUES.faqReponse.replace(/^Non\. /, '')} Le site officiel de l'établissement est $2.`, "Le site officiel de l'établissement est <a");
  rempl(f, 'Buzz Your Brain reste le nom de notre émission de quiz game sur plateau TV :', 'Buzz Your Brain reste le nom du quiz game sur plateau TV, que nous proposons sous licence :', 2);
  rempl(f, "Le plateau n'a pas bougé, il fait partie de GAMEDOOR·41.", "Le plateau n'a pas bougé, il se trouve chez GAMEDOOR·41.", 2);
  rempl(f, "qu'à l'époque Brain.", "qu'avant le changement d'enseigne.", 2);
}
rempl('404.html', 'Même équipe · Même lieu · Nouvelle marque', 'Même équipe · Même lieu · Nouvelle enseigne');

// ---------------------------------------------------------------------------------------
// 4. Escape games
// ---------------------------------------------------------------------------------------
{
  const f = 'escape-game-caen/index.html';
  rx(f, /(<h1 class="gd-hero-h1">[\s\S]*?>)Escape Game à Caen(<\/span>\s*<\/h1>)/, '$1Escape Game à Caen&nbsp;: 3 univers BRAIN chez GAMEDOOR·41$2', '3 univers BRAIN chez GAMEDOOR·41</span>');
  // Le sous-titre tient désormais sur deux ou trois lignes au téléphone : interligne explicite.
  rempl(f, 'margin-top:10px;">Escape Game à Caen&nbsp;: 3 univers BRAIN chez GAMEDOOR·41</span>', 'margin-top:10px;line-height:1.25;">Escape Game à Caen&nbsp;: 3 univers BRAIN chez GAMEDOOR·41</span>');
  rempl(f, "C'est ce qui rend notre escape game à Caen unique en Normandie.", "C'est ce qui fait la particularité de nos escape games à Caen.", 2);
  rempl(f, 'avec game master acteur. Anciennement Brain Escape Game."', 'avec game master acteur. Escape games BRAIN, exploités sous licence chez GAMEDOOR·41."');
}
for (const salle of ['psychiatric', 'garde-a-vue', 'back-to-the-80s']) rempl(`escape-game-caen/${salle}/index.html`, '>BRAIN · Caen</p>', `>${MARQUES.cartoucheEscape}</p>`);
rempl('escape-game-caen/garde-a-vue/index.html', 'à Caen Mondeville, signature GAMEDOOR·41"', 'à Caen Mondeville, expérience BRAIN exploitée chez GAMEDOOR·41"');

// ---------------------------------------------------------------------------------------
// 5. Quiz
// ---------------------------------------------------------------------------------------
{
  const f = 'quiz-game-caen/index.html';
  rempl(f, '<p class="qh-kicker">Quiz game &amp; blind test · Caen</p>', `<p class="qh-kicker">${MARQUES.cartoucheQuiz}</p>`);
  rempl(f, '<h1 id="qh-titre" class="qh-h1">Le quiz <span>comme à la télé</span></h1>', '<h1 id="qh-titre" class="qh-h1">Buzz Your Brain&nbsp;: <span>le quiz game comme à la télé, à Caen</span></h1>');
  rempl(f, '#1 sur Caen depuis 2022', 'Sur le plateau depuis 2022');
  rempl(f, 'avec un quiz plateau TV interactif et 100% animé.', "avec un quiz plateau TV interactif&nbsp;: un chauffeur de salle vous accueille et lance l'émission, qui se déroule ensuite sur écran.");
  rempl(f, 'Anciennement Buzz Your Brain Caen, désormais GAMEDOOR·41 — même équipe, même adresse, plus de jeux.', 'Le quiz Buzz Your Brain, exploité sous licence, se joue désormais chez GAMEDOOR·41 — même équipe, même adresse, plus de jeux.');
  rempl(f, 'dès 8 ans. Anciennement Buzz Your Brain."', 'dès 8 ans. Concept Buzz Your Brain, exploité sous licence chez GAMEDOOR·41."');
}

// ---------------------------------------------------------------------------------------
// 6. Mondeville, contact, références, devis, tarifs, avis, flux du magazine, articles
// ---------------------------------------------------------------------------------------
{
  const f = 'escape-game-mondeville/index.html';
  rempl(f, '<title>Escape Game Mondeville (14120) — GAMEDOOR·41, 41 bis rue Pasteur, ex-Brain | 5 min de Caen</title>', '<title>Escape Game Mondeville (14120) — GAMEDOOR·41, escape games BRAIN, 41 bis rue Pasteur | 5 min de Caen</title>');
  rempl(f, '41 bis rue Pasteur (ex-Brain Escape Game)"', '41 bis rue Pasteur (escape games BRAIN)"');
  rempl(f, 'parking privé. Anciennement Brain Escape Game."', 'parking privé. Les escape games BRAIN se jouent ici."');
  rempl(f, 'parking privé. Ex-Brain Escape Game."', 'parking privé. Les escape games BRAIN se jouent ici."');
  rempl(f, 'Anciennement Brain Escape Game &amp; Buzz Your Brain. 41 bis rue Pasteur', 'Ici se jouent les escape games BRAIN et le quiz Buzz Your Brain. 41 bis rue Pasteur');
  rx(f, /Votre GPS connaît peut-être encore notre ancien nom, (<strong[^>]*>Brain Escape Game<\/strong>) : c'est bien ici/g, "Votre GPS affiche peut-être encore $1 : c'est bien ici", 'Votre GPS affiche peut-être encore');
  rempl(f, "\"text\": \"Oui : Brain Escape Game et le quiz Buzz Your Brain sont devenus GAMEDOOR·41 en 2026, même équipe, même adresse au 41 bis rue Pasteur, mêmes salles (Garde à Vue, l'ancienne In Prison, Psychiatric, Back to the 80's) et le plateau quiz. Seul le nom a changé.\"", "\"text\": \"Oui. Notre établissement s'appelle GAMEDOOR·41 depuis 2026 et propose toujours les escape games BRAIN et le quiz Buzz Your Brain, exploités sous licence : même équipe, même adresse au 41 bis rue Pasteur, mêmes salles (Garde à Vue, l'ancienne In Prison, Psychiatric, Back to the 80's) et le plateau quiz. Seule l'enseigne au-dessus de la porte a changé.\"");
  rx(f, /Oui : Brain Escape Game et le quiz Buzz Your Brain sont <a ([^>]*)>devenus GAMEDOOR·41 en 2026<\/a>, même équipe, même adresse au 41 bis rue Pasteur, mêmes salles \(([^)]*)\) et le plateau quiz\. Seul le nom a changé\./g, "Oui. Notre établissement <a $1>s'appelle GAMEDOOR·41 depuis 2026</a> et propose toujours les escape games BRAIN et le quiz Buzz Your Brain, exploités sous licence&nbsp;: même équipe, même adresse au 41 bis rue Pasteur, mêmes salles ($2) et le plateau quiz. Seule l'enseigne au-dessus de la porte a changé.", ">s'appelle GAMEDOOR·41 depuis 2026</a>");
}
rempl('contact/index.html', 'Ancien nom&nbsp;: Brain Escape Game.', "Vous nous connaissiez peut-être à cette adresse sous le nom Brain Caen&nbsp;: pour un escape game BRAIN ou un quiz Buzz Your Brain, l'accueil se fait chez GAMEDOOR·41.");
{
  const f = 'references-entreprises-caen/index.html';
  rempl(f, 'dans un cadre immersif unique en centre-ville.', 'dans un cadre immersif, à Mondeville, à 5 minutes de Caen.');
  rempl(f, 'situé au 41 bis rue Pasteur en centre-ville,', 'situé au 41 bis rue Pasteur à Mondeville, à 5 minutes de Caen,');
}
{
  // Mêmes règles que les CGV, article 8.2 (acompte à la signature, solde au plus tard la veille) et même délai partout (48 h ouvrées).
  const f = 'devis/index.html';
  rempl(f, 'règlement à 30&nbsp;jours sur RIB,', 'acompte de 30&nbsp;% à la signature puis solde au plus tard la veille de la prestation, par carte ou par virement (bon de commande Chorus Pro pour les services publics),');
  rempl(f, 'Nous répondons en moyenne sous 4 heures ouvrées', 'Nous répondons sous 48 heures ouvrées');
}
{
  const f = 'tarifs/index.html';
  rx(f, /(<p class="kicker"[^>]*>)Brain Escape Game(<\/p>)/g, '$1Escape Games BRAIN · exploités sous licence$2', 'Escape Games BRAIN · exploités sous licence</p>');
  rx(f, /(<p class="kicker"[^>]*>)Buzz Your Brain(<\/p>)/g, '$1Buzz Your Brain · exploité sous licence$2', 'Buzz Your Brain · exploité sous licence</p>');
}
rempl('avis/index.html', 'Anciennement <a href="/brain-devient-gamedoor41/"><em>Brain Escape Game</em></a> · Escape · Quiz · Events depuis 2017', 'Escape games <a href="/brain-devient-gamedoor41/"><em>BRAIN</em></a> · Quiz Buzz Your Brain · Events depuis 2017');
rempl('post/buzz-your-brain-jeu-televise-realiste-caen/index.html', "Buzz Your Brain est né chez <strong>Brain Escape Game</strong>, l'enseigne historique de Mondeville ouverte en 2017 — devenue GAMEDOOR·41. Même équipe, même adresse&nbsp;: seul le nom sur la porte a changé.", "À Mondeville, Buzz Your Brain s'est installé en 2022 dans l'établissement qui accueillait déjà les escape games <strong>BRAIN</strong> depuis 2017, et qui s'appelle aujourd'hui GAMEDOOR·41. Même équipe, même adresse&nbsp;: seule l'enseigne sur la porte a changé.");
for (const s of ['evjf', 'mariage']) rx(`${s}-caen/index.html`, /<span class="num"([^>]*)>N°1<\/span>(\s*)<span class="label"([^>]*)>(?:EVJF|Mariage) à Caen<\/span>/g, '<span class="num"$1>69 000<small>+</small></span>$2<span class="label"$3>joueurs depuis 2017</span>', '>joueurs depuis 2017</span>');
{
  // Flux du magazine (hors de la liste des pages).
  const f = 'blog-feed.xml'; lire(f);
  rempl(f, 'à Caen. Anciennement Brain Escape Game. ]]>', 'à Caen. Escape games BRAIN et quiz Buzz Your Brain, exploités sous licence chez GAMEDOOR·41. ]]>');
}

// ---------------------------------------------------------------------------------------
// 7. FAQ et réservation
// ---------------------------------------------------------------------------------------
{
  const f = 'faq/index.html';
  const q = MARQUES.faqQuestion, r = MARQUES.faqReponse;
  rempl(f, "C'est la continuité de Brain Escape Game et Buzz Your Brain, à la même adresse, avec la même équipe, depuis 2017.\"}},", `Les escape games BRAIN et le quiz Buzz Your Brain y sont exploités sous licence, à la même adresse, avec la même équipe, depuis 2017."}},\n      {"@type": "Question", "name": "${q}", "acceptedAnswer": {"@type": "Answer", "text": "${r}"}},`);
  rx(f, /C'est la continuité de Brain Escape Game et Buzz Your Brain — même adresse, même équipe, depuis 2017\.<\/div>\n([ \t]*)<\/details>/, `Les escape games BRAIN et le quiz Buzz Your Brain y sont exploités sous licence — même adresse, même équipe, depuis 2017.</div>\n$1</details>\n\n$1<details class="faq-item" style="border:1px solid var(--dark-border);border-radius:var(--radius);margin-bottom:12px;padding:0;background:var(--dark-card);">\n$1  <summary style="cursor:pointer;padding:18px 20px;font-weight:700;font-size:1.05rem;color:var(--white);list-style:none;">${q}</summary>\n$1  <div style="padding:0 20px 18px;color:var(--grey-light);line-height:1.65;">${r} <a href="/brain-devient-gamedoor41/" style="color:var(--orange);">Tout comprendre en une page</a>.</div>\n$1</details>`, `>${q}</summary>`);
}
rx('reserver/index.html', /^([ \t]*)(<p[^>]*>Le module de réservation s'ouvre ci-dessus\.[^\n]*<\/p>)$/m, `$1$2\n$1<p style="margin-top:14px;font-size:.9rem;color:var(--grey, #8a847b);">${MARQUES.reservation}</p>`, MARQUES.reservation);

// ---------------------------------------------------------------------------------------
// 8. Pages légales
// ---------------------------------------------------------------------------------------
{
  const f = 'termes-conditions/index.html';
  rempl(f, 'Dernière mise à jour : 4 novembre 2026', 'Dernière mise à jour : 23 novembre 2026');
  rempl(f, 'entre GAMEDOOR·41 et le client (ci-après « le Client »)', "entre la société SARL BOEHME, qui exploite l'établissement sous l'enseigne GAMEDOOR·41 (ci-après « GAMEDOOR·41 »), et le client (ci-après « le Client »)");
  rempl(f, 'escape game (Brain Escape Game), quiz game (Buzz Your Brain),', 'escape games BRAIN et quiz game Buzz Your Brain (expériences exploitées sous licence),');
  // Paiement : aligné sur la page /moyens-de-paiement/ (faits vérifiés le 06/11/2026).
  rempl(f, "La réservation n'est définitive qu'après paiement intégral en ligne par carte bancaire.", "La réservation n'est définitive qu'après paiement intégral en ligne, par l'un des moyens de paiement acceptés (article 2.3).");
  rx(f, souple('<strong>Particuliers</strong> : carte bancaire en ligne, chèques ANCV, chèques cadeau partenaires acceptés selon les conventions en vigueur.'), '<strong>Particuliers</strong> : en ligne, par carte bancaire, Google Pay ou PayPal ; le paiement partagé entre participants («&nbsp;On partage l\'addition&nbsp;») est proposé lorsque les conditions sont réunies. Cartes cadeaux, Chèques-Vacances ANCV et bons partenaires acceptés selon les conventions en vigueur. Le détail de chaque moyen de paiement figure sur la page <a href="/moyens-de-paiement/">Moyens de paiement</a>.', 'Le détail de chaque moyen de paiement figure sur la page');
  rx(f, souple("<strong>Exception</strong> : un complément peut être dû et payable sur place uniquement si"), "<strong>Exceptions</strong> : les Chèques-Vacances ANCV papier se remettent à l'accueil, après une réservation en ligne faite avec le code ANCV ; et un complément peut être dû et payable sur place uniquement si", "<strong>Exceptions</strong> : les Chèques-Vacances ANCV papier");
  // Article 12 : les marques et scénarios sous licence n'appartiennent pas à GAMEDOOR·41.
  rx(f, souple("<p>Les scénarios, décors, éléments graphiques, marques, logos et tout contenu présent dans les salles ou sur le plateau quiz sont la propriété exclusive de GAMEDOOR·41. Toute reproduction, captation vidéo des énigmes ou divulgation publique des scénarios est interdite.</p>"), "<p>Les marques, logos, scénarios, concepts, logiciels et autres éléments protégés exploités au sein de l'établissement demeurent la propriété de leurs titulaires respectifs. Les expériences BRAIN Escape Game et Buzz Your Brain sont proposées par SARL BOEHME dans le cadre de contrats de licence. Les éléments propres à l'enseigne GAMEDOOR·41 et les créations originales demeurent soumis aux droits de leurs titulaires respectifs.</p>\n        <p>Toute reproduction ou diffusion non autorisée d'éléments protégés est interdite, sous réserve des exceptions prévues par la loi&nbsp;; sont notamment interdites la captation vidéo des énigmes et la divulgation publique des scénarios.</p>", 'demeurent la propriété de leurs titulaires respectifs. Les expériences BRAIN Escape Game');
  // Article 14 : la plateforme européenne de règlement en ligne des litiges est fermée depuis le 20 juillet 2025.
  rx(f, /\n[ \t]*<p>Plateforme européenne de Règlement en Ligne des Litiges :[^\n]*<\/p>/, '', (t) => !t.includes('ec.europa.eu'));
}
{
  const f = 'mentions-legales/index.html';
  rempl(f, 'Dernière mise à jour : 5 mai 2026', 'Dernière mise à jour : 23 novembre 2026');
  rx(f, souple("<p>SARL BOEHME exploite sous l'enseigne <strong>GAMEDOOR·41</strong> les marques commerciales <strong>Brain Escape Game</strong> (escape game) et <strong>Buzz Your Brain</strong> (quiz game), à la ZAC de Calix, 41 bis rue Pasteur à Mondeville (14120).</p>"), "<p>SARL BOEHME exploite, sous l'enseigne commerciale <strong>GAMEDOOR·41</strong>, un établissement de loisirs situé ZAC de Calix, 41 bis rue Pasteur à Mondeville (14120). Elle y propose notamment les escape games <strong>BRAIN Escape Game</strong> et le quiz <strong>Buzz Your Brain</strong>, exploités dans le cadre de contrats de licence, ainsi que ses propres activités et événements.</p>", "sous l'enseigne commerciale <strong>GAMEDOOR·41</strong>");
  rempl(f, 'est la propriété exclusive de GAMEDOOR·41 ou de ses partenaires et est protégé', 'est la propriété de SARL BOEHME ou de ses concédants et partenaires, chacun pour ce qui le concerne, et est protégé');
  rx(f, /<p>Les marques <strong>GAMEDOOR·41<\/strong>[\s\S]*?de son auteur\.<\/p>/, "<p><strong>GAMEDOOR·41</strong> est l'enseigne sous laquelle SARL BOEHME exploite son établissement. Les marques, logos, scénarios, concepts et logiciels <strong>BRAIN Escape Game</strong> et <strong>Buzz Your Brain</strong> demeurent la propriété de leurs titulaires respectifs&nbsp;; SARL BOEHME les exploite dans le cadre de contrats de licence. Toute exploitation non autorisée de ces éléments est interdite et susceptible de constituer une contrefaçon engageant la responsabilité civile et pénale de son auteur.</p>", "est l'enseigne sous laquelle SARL BOEHME exploite son établissement");
  rx(f, /\n[ \t]*<p>Conformément au règlement \(UE\) n°524\/2013[^\n]*<\/p>/, '', (t) => !t.includes('ec.europa.eu'));
  rempl(f, 'équipe interne GAMEDOOR·41 (Brain Caen).', 'équipe interne GAMEDOOR·41.');
}
// Outil de mesure réellement installé : Google Analytics 4 (plus de « ou équivalent »).
rempl('politique-confidentialite/index.html', 'Google Analytics ou équivalent — voir politique cookies', 'Google Analytics 4 — voir politique cookies');
rempl('politique-cookies/index.html', ' ou équivalent — durée maximale 13 mois.', ' 4 — durée maximale 13 mois.');

// ---------------------------------------------------------------------------------------
// 9. Distinction de Back to the 80's : on cite l'organisme et l'année
//    Source (lue le 23/11/2026) : https://www.the-escapers.com/goldenscapes/2025/meilleure-salle
//    « Back to the 80's - GameDoor 41 (Caen) » : 70ᵉ du classement « Meilleure salle » des Goldenscapes 2025
//    (92ᵉ l'année précédente). On n'écrit plus « Top 100 France » sans source ni « nommée ».
// ---------------------------------------------------------------------------------------
const ESCAPERS = 'https://www.the-escapers.com/goldenscapes/2025/meilleure-salle';
const TOP100 = 'Top 100 The Escapers 2025';
const RANG = '70ᵉ du classement «&nbsp;Meilleure salle&nbsp;» des Goldenscapes 2025';
{
  const f = 'escape-game-caen/back-to-the-80s/index.html';
  rempl(f, '"award": "Nomination — Top 100 France des meilleures salles (classement communautaire The Escapers)"', '"award": "70ᵉ du classement « Meilleure salle » des Goldenscapes 2025 (The Escapers)"');
  rempl(f, '<span class="label">France · The Escapers</span>', '<span class="label">The Escapers · Goldenscapes 2025</span>');
  rempl(f, '<h3>Nommée TOP 100 France</h3>', `<h3>${TOP100}</h3>`);
  rempl(f, 'Sélectionnée parmi les 100 meilleures salles francophones par la communauté The Escapers (France, Belgique, Suisse) sur retours joueurs.', `${RANG}, établi par les votes de la communauté The Escapers (92ᵉ l'année précédente). <a href="${ESCAPERS}" target="_blank" rel="noopener">Voir le classement</a>.`);
  rempl(f, 'elle est nommée parmi les meilleures salles francophones par la communauté The Escapers (TOP 100 France).', 'elle est classée 70ᵉ meilleure salle aux Goldenscapes 2025, le classement de la communauté The Escapers.');
}
{
  const f = 'post/canicule-caen-escape-game-climatise/index.html';
  rempl(f, "Le classement TOP 100 France récompense la qualité du scénario, des décors et l'authenticité de l'immersion années 80.", 'Elle est 70ᵉ du classement « Meilleure salle » des Goldenscapes 2025, établi par les votes de la communauté The Escapers.', 'tous');
  // La salle a ouvert en 2021 (et non 2017, année d'ouverture de l'établissement).
  rempl(f, '12 000 joueurs depuis 2017', '12 000 joueurs depuis 2021', 2);
}
rempl('avis/index.html', '<strong>TOP 100 France</strong> grâce à vos retours.', "Back to the 80's est <strong>70ᵉ meilleure salle</strong> aux Goldenscapes 2025 de The Escapers, grâce à vos votes.");
rempl('brain-devient-gamedoor41/index.html', 'une nomination au Top 100 France des meilleures salles.', 'une 70ᵉ place au classement «&nbsp;Meilleure salle&nbsp;» des Goldenscapes 2025 (The Escapers).');
{
  const tout = [...PAGES, 'blog-feed.xml'];
  partout('TOP 100 des escape games de France', TOP100, tout);
  partout('TOP 100 des meilleurs escape games de France', TOP100, tout);
  for (const f of tout) {
    const d = lire(f);
    d.texte = d.texte
      .replace(/\b([Nn])ommé(e?) (?:au )?(?:TOP|Top) 100 France/g, (m, n, e) => { bilan.faites++; return `${n === 'N' ? 'C' : 'c'}lassé${e} ${TOP100}`; })
      .replace(/(?:TOP|Top) 100 France/g, () => { bilan.faites++; return TOP100; });
  }
}

// ---------------------------------------------------------------------------------------
// Écriture
// ---------------------------------------------------------------------------------------
let modifies = 0;
for (const [f, d] of fichiers) {
  const sortie = d.crlf ? d.texte.replace(/\n/g, '\r\n') : d.texte;
  if (sortie !== d.origine) { modifies++; if (!APERCU) fs.writeFileSync(f, sortie); }
}
console.log(`${modifies} fichier(s) ${APERCU ? 'à modifier' : 'modifié(s)'} · ${bilan.faites} remplacement(s) · ${bilan.dejaFaites} déjà fait(s)`);
if (sansPied.length) console.log(`Sans ligne de marques (pas de pied de page standard) : ${sansPied.join(', ')}`);
if (bilan.erreurs.length) { console.error(`\n${bilan.erreurs.length} point(s) à regarder :\n- ` + bilan.erreurs.join('\n- ')); process.exit(1); }
