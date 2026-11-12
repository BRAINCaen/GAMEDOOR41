// Vérifie sur TOUTES les pages du site :
//  1. lire puis réécrire une page sans modification redonne le fichier à l'octet près ;
//  2. l'arbre de l'éditeur correspond à l'arbre du navigateur (mêmes éléments, mêmes textes)
//     pour chaque élément éditable — c'est ce qui permet de retrouver un texte modifié dans le canevas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { parse } from 'parse5';
import { construireArbre, serialiser, elements, texteDecode } from '../noyau/arbre.mjs';

const RACINE = join(import.meta.dirname, '..', '..');
const pages = execSync('git ls-files "*.html"', { cwd: RACINE, encoding: 'utf8' }).split('\n').filter(Boolean);

test('aller-retour identique sur toutes les pages', () => {
  assert.ok(pages.length > 50, 'pages trouvées : ' + pages.length);
  for (const p of pages) {
    const src = execSync('git show HEAD:"' + p + '"', { cwd: RACINE, encoding: 'utf8', maxBuffer: 1 << 26 });
    const arbre = construireArbre(src);
    assert.equal(serialiser(arbre), src, 'réécriture différente : ' + p);
  }
});

// Enfants « navigateur » d'un nœud parse5 : éléments écrits + textes fusionnés + commentaires
function enfantsP5(n) {
  const kids = n.nodeName === 'template' ? n.content.childNodes : n.childNodes;
  const out = [];
  const ajouter = (liste) => {
    for (const k of liste) {
      if (k.nodeName === '#text') {
        if (out.length && out[out.length - 1].t === 'txt') out[out.length - 1].v += k.value;
        else out.push({ t: 'txt', v: k.value });
      } else if (k.nodeName === '#comment') out.push({ t: 'com' });
      else if (k.tagName) {
        if (k.sourceCodeLocation && k.sourceCodeLocation.startTag) out.push({ t: 'el', s: k.sourceCodeLocation.startOffset });
        else ajouter(k.childNodes); // élément implicite (tbody…) : ses enfants remontent, comme dans le canevas
      }
    }
  };
  ajouter(kids);
  return out;
}
function enfantsEditeur(el) {
  const out = [];
  for (const k of el.enfants) {
    if (k.t === 'txt') {
      const v = texteDecode(k);
      if (out.length && out[out.length - 1].t === 'txt') out[out.length - 1].v += v;
      else out.push({ t: 'txt', v });
    } else if (k.t === 'com') out.push({ t: 'com' });
    else out.push({ t: 'el', s: k.s });
  }
  return out;
}

test('l’arbre de l’éditeur correspond à celui du navigateur', () => {
  const rapport = [];
  for (const p of pages) {
    const src = execSync('git show HEAD:"' + p + '"', { cwd: RACINE, encoding: 'utf8', maxBuffer: 1 << 26 });
    const arbre = construireArbre(src);
    const doc = parse(src, { sourceCodeLocationInfo: true });
    const p5parS = new Map();
    const tous = (n) => {
      if (n.tagName && n.sourceCodeLocation && n.sourceCodeLocation.startTag) p5parS.set(n.sourceCodeLocation.startOffset, n);
      const kids = n.nodeName === 'template' ? n.content.childNodes : n.childNodes;
      if (kids) kids.forEach(tous);
    };
    tous(doc);
    let ecarts = 0;
    for (const el of elements(arbre.racine)) {
      if (['html', 'head', 'body', 'script', 'style', 'noscript'].includes(el.tag)) continue;
      const p5 = p5parS.get(el.s);
      if (!p5) { ecarts++; rapport.push(p + ' : élément sans équivalent ' + el.tag + '@' + el.s); continue; }
      const a = JSON.stringify(enfantsEditeur(el));
      const b = JSON.stringify(enfantsP5(p5));
      if (a !== b) {
        ecarts++;
        if (rapport.length < 40) rapport.push(p + ' : ' + el.tag + '@' + el.s + '\n   éditeur  ' + a.slice(0, 300) + '\n   navigateur ' + b.slice(0, 300));
      }
    }
    if (arbre.conflits.length) rapport.push(p + ' : ' + arbre.conflits.length + ' balises mal imbriquées ' + JSON.stringify(arbre.conflits.slice(0, 3)));
  }
  if (rapport.length) console.log(rapport.join('\n'));
  assert.equal(rapport.length, 0, rapport.length + ' écarts');
});
