// Ajoute sur toutes les pages :
//  1. dans chaque FAQ (balisage visible + donnees structurees FAQPage) la question
//     « J'ai un code promo ou une carte de reduction : comment l'utiliser ? » ;
//  2. dans le pied de page, un lien « Codes promo » a cote de « Tarifs ».
//
// Usage : node scripts/ajouter-code-promo-partout.mjs [--apercu]
// Le script est rejouable : une page deja traitee est laissee telle quelle.

import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const apercu = process.argv.includes('--apercu');
const pages = execSync('git ls-files --cached --others --exclude-standard "*.html"', { encoding: 'utf8' })
  .split('\n').map((s) => s.trim()).filter((f) => f && !f.startsWith('signatures/') && f !== '404.html');

const QUESTION = "J'ai un code promo ou une carte de réduction : comment l'utiliser ?";
const REPONSE_HTML = "Réservez en ligne comme d'habitude. Sur la page « Récapitulatif de Commande », juste au-dessus du montant, saisissez votre code (par exemple <strong>CEZAM</strong>) dans le champ <strong>« Code promo ou Bon cadeau »</strong> et cliquez sur <strong>Appliquer</strong> : la remise se déduit avant le paiement. Le jour J, présentez le justificatif correspondant à l'accueil (carte, attestation, tickets…) : <strong>sans justificatif, la différence avec le tarif normal est à régler sur place avant de jouer</strong>. <a href=\"/code-promo/\" style=\"color:var(--orange);\">Tous les codes et les justificatifs demandés →</a>";
const REPONSE_TEXTE = "Réservez en ligne comme d'habitude. Sur la page « Récapitulatif de Commande », juste au-dessus du montant, saisissez votre code (par exemple CEZAM) dans le champ « Code promo ou Bon cadeau » et cliquez sur Appliquer : la remise se déduit avant le paiement. Le jour J, présentez le justificatif correspondant à l'accueil (carte, attestation, tickets…) : sans justificatif, la différence avec le tarif normal est à régler sur place avant de jouer. Liste complète des codes et des justificatifs : gamedoor41.fr/code-promo/";

// Pages ou la question doit suivre une question precise plutot que fermer la FAQ
const ANCRES = {
  'tarifs/index.html': { apres: 'Quelles cartes de réduction sont acceptées ?' },
  'faq/index.html': { apres: 'Y a-t-il un tarif étudiant ?' },
};

const STYLE_BORDE = 'margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid var(--dark-border);';

const norm = (s) => String(s)
  .replace(/<[^>]+>/g, '')
  .replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&apos;|&rsquo;|’/g, "'").replace(/&quot;/g, '"')
  .replace(/\s+/g, ' ').trim().toLowerCase();

const rapport = [];
let modifiees = 0;

for (const page of pages) {
  const avant = readFileSync(page, 'utf8');
  let html = avant;
  const notes = [];

  // ---------- 1. FAQ ----------
  const blocsLd = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  const faqLd = blocsLd.find((m) => /"@type"\s*:\s*"FAQPage"/.test(m[1]));
  if (faqLd) {
    let data = null;
    try { data = JSON.parse(faqLd[1]); } catch (e) { notes.push('JSON FAQ illisible'); }
    const questions = data && Array.isArray(data.mainEntity) ? data.mainEntity.map((q) => q.name) : [];
    if (questions.some((q) => /code promo/i.test(q))) {
      notes.push('FAQ : deja presente');
    } else if (questions.length) {
      const modeApres = !!ANCRES[page];
      // element visible portant la question ancre (h3 ou summary) : la question demandee, sinon la derniere
      // question des donnees structurees qui soit visible dans la page (certaines pages affichent moins
      // de questions que leur balisage FAQPage)
      const titres = [...html.matchAll(/<(h3|summary)\b([^>]*)>([\s\S]*?)<\/\1>/g)];
      const candidats = ANCRES[page] ? [ANCRES[page].apres] : [...questions].reverse();
      let ancre = null, cible = null;
      // correspondance exacte, sinon titre visible = debut de la question (certaines pages affichent une
      // version raccourcie : « … proposez-vous ? » pour « … proposez-vous à Caen ? »)
      const sansPonct = (s) => norm(s).replace(/\s*\?$/, '');
      for (const q of candidats) { cible = titres.find((m) => norm(m[3]) === norm(q)); if (cible) { ancre = q; break; } }
      if (!cible) for (const q of candidats) { cible = titres.find((m) => sansPonct(m[3]).length >= 20 && sansPonct(q).startsWith(sansPonct(m[3]))); if (cible) { ancre = q; break; } }
      if (!cible) {
        notes.push('FAQ : aucune question des donnees structurees n\'est visible en h3/summary — page non modifiee');
      } else {
        if (!ANCRES[page] && ancre !== questions[questions.length - 1]) notes.push('ancre = « ' + ancre + ' »');
        const pos = cible.index;
        let insertion = null, ou = null, patron = null;
        if (cible[1] === 'summary') {
          const debut = html.lastIndexOf('<details', pos);
          const finIdx = html.indexOf('</details>', pos) + '</details>'.length;
          const bloc = html.slice(debut, finIdx);
          const ouvDetails = bloc.match(/^<details\b[^>]*>/)[0];
          const ouvSummary = cible[0].match(/^<summary\b[^>]*>/)[0];
          const reste = bloc.slice(bloc.indexOf('</summary>') + '</summary>'.length, bloc.length - '</details>'.length);
          const m = reste.match(/^(\s*)<(p|div)\b([^>]*)>([\s\S]*)<\/\2>(\s*)$/);
          if (!m) { notes.push('FAQ : reponse du bloc details non reconnue'); }
          else {
            const indent = (html.slice(0, debut).match(/\n([ \t]*)$/) || ['', ''])[1];
            const neuf = `${ouvDetails}${ouvSummary}${QUESTION}</summary>${m[1]}<${m[2]}${m[3]}>${REPONSE_HTML}</${m[2]}>${m[5]}</details>`;
            insertion = '\n\n' + indent + neuf; ou = finIdx; patron = 'details';
          }
        } else {
          // h3 : soit dans un <div> dedie (pattern des pages), soit directement dans l'article (pattern des posts)
          const ouvH3 = cible[0].match(/^<h3\b[^>]*>/)[0];
          const finP = html.indexOf('</p>', pos);
          const ouvPIdx = html.indexOf('<p', pos);
          const ouvP = (html.slice(ouvPIdx).match(/^<p\b[^>]*>/) || ['<p>'])[0];
          const divIdx = html.lastIndexOf('<div', pos);
          const divFin = html.indexOf('>', divIdx) + 1;
          const dansDiv = divIdx !== -1 && /^\s*$/.test(html.slice(divFin, pos));
          if (dansDiv && finP !== -1) {
            const finDiv = html.indexOf('</div>', finP) + '</div>'.length;
            let ouvDiv = html.slice(divIdx, divFin);
            if (!modeApres && /^<div\s*>$/.test(ouvDiv)) ouvDiv = `<div style="${STYLE_BORDE}">`;
            const indentDiv = (html.slice(0, divIdx).match(/\n([ \t]*)$/) || ['', ''])[1];
            const indentH3 = (html.slice(0, pos).match(/\n([ \t]*)$/) || ['', indentDiv + '  '])[1];
            const neuf = `${ouvDiv}\n${indentH3}${ouvH3}${QUESTION}</h3>\n${indentH3}${ouvP}${REPONSE_HTML}</p>\n${indentDiv}</div>`;
            if (modeApres) { insertion = '\n\n' + indentDiv + neuf; ou = finDiv; }
            else { insertion = neuf + '\n\n' + indentDiv; ou = divIdx; }
            patron = 'div';
          } else if (finP !== -1) {
            const indentH3 = (html.slice(0, pos).match(/\n([ \t]*)$/) || ['', ''])[1];
            insertion = `\n\n${indentH3}${ouvH3}${QUESTION}</h3>\n${indentH3}${ouvP}${REPONSE_HTML}</p>`;
            ou = finP + '</p>'.length; patron = 'article';
          } else {
            notes.push('FAQ : structure du dernier bloc non reconnue');
          }
        }
        if (insertion !== null) {
          html = html.slice(0, ou) + insertion + html.slice(ou);
          // donnees structurees : ajout en fin de mainEntity
          const ldDebut = html.indexOf(faqLd[0]);
          const ldTexte = faqLd[1];
          const mainIdx = ldTexte.indexOf('"mainEntity"');
          const crochet = ldTexte.indexOf('[', mainIdx);
          let prof = 0, fermant = -1;
          for (let i = crochet; i < ldTexte.length; i++) {
            const ch = ldTexte[i];
            if (ch === '"') { i++; while (i < ldTexte.length && ldTexte[i] !== '"') { if (ldTexte[i] === '\\') i++; i++; } continue; }
            if (ch === '[') prof++;
            else if (ch === ']') { prof--; if (prof === 0) { fermant = i; break; } }
          }
          if (fermant === -1) { notes.push('FAQ : mainEntity non reconnu'); }
          else {
            let dernier = fermant - 1; while (/\s/.test(ldTexte[dernier])) dernier--;
            const ligneDerniereQ = ldTexte.lastIndexOf('{"@type": "Question"', fermant);
            const indent = ligneDerniereQ !== -1 ? (ldTexte.slice(0, ligneDerniereQ).match(/\n([ \t]*)$/) || ['', '      '])[1] : '      ';
            const entree = `,\n${indent}{"@type": "Question", "name": ${JSON.stringify(QUESTION)}, "acceptedAnswer": {"@type": "Answer", "text": ${JSON.stringify(REPONSE_TEXTE)}}}`;
            const ldNeuf = ldTexte.slice(0, dernier + 1) + entree + ldTexte.slice(dernier + 1);
            let ok = false;
            try { const d = JSON.parse(ldNeuf); ok = d.mainEntity.length === questions.length + 1; } catch (e) { ok = false; }
            if (!ok) { notes.push('FAQ : donnees structurees invalides apres ajout — page non modifiee'); html = avant; }
            else {
              html = html.slice(0, ldDebut) + faqLd[0].replace(ldTexte, ldNeuf) + html.slice(ldDebut + faqLd[0].length);
              notes.push('FAQ ajoutee (' + patron + ')');
            }
          }
        }
      }
    }
  }

  // ---------- 2. pied de page ----------
  const footIdx = html.indexOf('<footer');
  const footFin = html.indexOf('</footer>', footIdx);
  if (footIdx !== -1 && footFin !== -1) {
    const foot = html.slice(footIdx, footFin);
    if (foot.includes('href="/code-promo/"')) notes.push('pied de page : deja present');
    else {
      let neuf = foot;
      if (foot.includes('<li><a href="/tarifs/">Tarifs</a></li>')) neuf = foot.replace('<li><a href="/tarifs/">Tarifs</a></li>', '<li><a href="/tarifs/">Tarifs</a></li><li><a href="/code-promo/">Codes promo</a></li>');
      else if (foot.includes('<a href="/tarifs/">Tarifs</a>')) neuf = foot.replace('<a href="/tarifs/">Tarifs</a>', '<a href="/tarifs/">Tarifs</a><a href="/code-promo/">Codes promo</a>');
      if (neuf !== foot) { html = html.slice(0, footIdx) + neuf + html.slice(footFin); notes.push('pied de page : lien ajoute'); }
      else notes.push('pied de page : pas de lien Tarifs, rien ajoute');
    }
  }

  if (html !== avant) { modifiees++; if (!apercu) writeFileSync(page, html, 'utf8'); }
  if (notes.length) rapport.push(page + ' — ' + notes.join(' ; '));
}

rapport.forEach((l) => console.log(l));
console.log(`${apercu ? '[apercu] ' : ''}${modifiees} page(s) modifiee(s).`);
