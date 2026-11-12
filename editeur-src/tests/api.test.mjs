// Le serveur face à un navigateur « tricheur » : il rejoue tout et refuse ce qui supprime,
// ce qui touche un fichier interdit, ce qui écrase un fichier, ce qui n'a pas d'empreinte.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { creerApi } from '../serveur/api.mjs';
import { stockageMemoire } from '../serveur/stockage.mjs';
import { creerFauxGithub } from '../dev/faux-github.mjs';
import { construireArbre, elements, signature, attr } from '../noyau/arbre.mjs';

const RACINE = join(import.meta.dirname, '..', '..');
const FG = creerFauxGithub(RACINE);
const stockage = stockageMemoire();
const api = creerApi({ github: FG.fauxGithub, stockage, identifierFn: async () => ({ uid: 'u1', email: 'lea@gamedoor41.fr', nom: 'Léa', admin: false }) });

let n = 0;
async function lancer(type, lot, extra = {}) {
  const id = 'essai-' + (++n) + '-' + Date.now();
  await api.executerTravail(new Request('http://x/', { method: 'POST', headers: { Authorization: 'Bearer x', 'Content-Type': 'application/json' }, body: JSON.stringify({ id, type, lot, ...extra }) }));
  return stockage.lire('travail:' + id);
}

async function source(chemin) {
  const a = await FG.fauxGithub.arbre(FG.teteMain);
  return FG.fauxGithub.blobTexte(a.get(chemin).sha);
}

test('publication normale : PR fusionnée, contenu à jour', async () => {
  const src = await source('contact/index.html');
  const arbre = construireArbre(src);
  const h1 = [...elements(arbre.racine)].find((e) => e.tag === 'h1');
  const sec = [...elements(arbre.racine)].find((e) => e.tag === 'section');
  const base = FG.teteMain;
  const t = await lancer('publier', { base, message: 'essai', pages: [{ chemin: 'contact/index.html', ops: [
    { op: 'style', id: h1.id, sig: signature(h1), cle: 'abcd12', styles: { tous: { color: '#FFD740' } } },
    { op: 'inserer', id: sec.id, sig: signature(sec), position: 'apres', uid: 'aj0001', html: '<section class="gdb-section" data-gdb="essai"><div class="container"><p>Ajout de test</p></div></section>' },
  ] }] });
  assert.equal(t.etat, 'termine', JSON.stringify(t));
  assert.ok(t.resultat.commit);
  assert.notEqual(FG.teteMain, base);
  const apres = await source('contact/index.html');
  assert.match(apres, /Ajout de test/);
  assert.match(apres, /gd-blocs-css/);
  const sm = await source('sitemap.xml');
  assert.match(sm, /contact\/<\/loc>\s*<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);
});

test('suppression déguisée : refusée par le serveur', async () => {
  const src = await source('tarifs/index.html');
  const arbre = construireArbre(src);
  const h1 = [...elements(arbre.racine)].find((e) => e.tag === 'h1');
  const p = [...elements(arbre.racine)].find((e) => e.tag === 'p' && attr(e, 'class') === 'tfh-pitch');
  const base = FG.teteMain;
  for (const ops of [
    [{ op: 'supprimer', id: h1.id, sig: signature(h1) }],
    [{ op: 'style', id: h1.id, sig: signature(h1), cle: 'zz0001', styles: { tous: { display: 'none' } } }],
    [{ op: 'style', id: p.id, sig: signature(p), cle: 'zz0002', styles: { telephone: { visibility: 'hidden' } } }],
    [{ op: 'classe', id: h1.id, sig: signature(h1), ajouter: ['gdb-masque-telephone'] }],
    [{ op: 'texte', id: p.id, sig: signature(p), n: 0, ancien: null, valeur: ' ' }],
    [{ op: 'attr', id: h1.id, sig: signature(h1), nom: 'hidden', valeur: '' }],
  ]) {
    const t = await lancer('publier', { base, message: 'triche', pages: [{ chemin: 'tarifs/index.html', ops }] });
    assert.equal(t.etat, 'erreur', ops[0].op + ' aurait dû être refusé : ' + JSON.stringify(t).slice(0, 300));
  }
});

test('opération sans empreinte ou avec une empreinte d’un autre élément : refusée', async () => {
  const src = await source('tarifs/index.html');
  const arbre = construireArbre(src);
  const [a, b] = [...elements(arbre.racine)].filter((e) => e.tag === 'h2');
  const t1 = await lancer('publier', { base: FG.teteMain, message: 'x', pages: [{ chemin: 'tarifs/index.html', ops: [{ op: 'style', id: a.id, cle: 'nosig1', styles: { tous: { color: 'red' } } }] }] });
  assert.equal(t1.etat, 'erreur');
  const t2 = await lancer('publier', { base: FG.teteMain, message: 'x', pages: [{ chemin: 'tarifs/index.html', ops: [{ op: 'style', id: a.id, sig: signature(b), cle: 'badsig', styles: { tous: { color: 'red' } } }] }] });
  assert.equal(t2.etat, 'erreur');
});

test('fichiers interdits et médias inconnus : refusés', async () => {
  const base = FG.teteMain;
  for (const chemin of ['netlify.toml', '../index.html', 'editeur/index.html', 'signatures/signature-allan.html', 'scripts/perf-assets.mjs']) {
    const t = await lancer('publier', { base, message: 'x', pages: [{ chemin, ops: [{ op: 'meta', titre: 'Titre de test assez long' }] }] });
    assert.equal(t.etat, 'erreur', chemin);
  }
  const src = await source('contact/index.html');
  const sec = [...elements(construireArbre(src).racine)].find((e) => e.tag === 'section');
  const op = { op: 'inserer', id: sec.id, sig: signature(sec), position: 'apres', uid: 'med001', html: '<p class="gdb-texte">x</p>' };
  // média jamais déposé
  let t = await lancer('publier', { base, message: 'x', pages: [{ chemin: 'contact/index.html', ops: [op] }], medias: [{ chemin: 'img/editeur/2026-11/faux-768w.webp', sha: '0'.repeat(40) }] });
  assert.equal(t.etat, 'erreur');
  // écraser un fichier existant
  t = await lancer('publier', { base, message: 'x', pages: [{ chemin: 'contact/index.html', ops: [op] }], medias: [{ chemin: 'img/logo/favicon.png', sha: '0'.repeat(40) }] });
  assert.equal(t.etat, 'erreur');
});

test('nouvelle page : créée, ajoutée au plan du site ; adresse réservée refusée', async () => {
  const t = await lancer('publier', { base: FG.teteMain, message: 'page', pages: [], nouvellesPages: [{ slug: 'page-essai-editeur', titre: 'Page d’essai — GAMEDOOR·41', description: 'Une page créée pendant les tests automatiques de l’éditeur.', h1: 'Page d’essai', intro: 'Une page de test.', modele: 'contact/index.html', ops: [] }] });
  assert.equal(t.etat, 'termine', JSON.stringify(t).slice(0, 400));
  assert.match(await source('page-essai-editeur/index.html'), /<h1 class="gdb-titre-page">Page d’essai<\/h1>/);
  assert.match(await source('sitemap.xml'), /page-essai-editeur/);
  const t2 = await lancer('publier', { base: FG.teteMain, message: 'page', pages: [], nouvellesPages: [{ slug: 'editeur', titre: 'Réservée — GAMEDOOR·41', description: 'Cette adresse est réservée au fonctionnement du site.', modele: 'contact/index.html', ops: [] }] });
  assert.equal(t2.etat, 'erreur');
});

test('relecture bloquante : publication refusée', async () => {
  const src = await source('contact/index.html');
  const sec = [...elements(construireArbre(src).racine)].find((e) => e.tag === 'section');
  const t = await lancer('publier', { base: FG.teteMain, message: 'x', pages: [{ chemin: 'contact/index.html', ops: [
    { op: 'inserer', id: sec.id, sig: signature(sec), position: 'apres', uid: 'rel001', html: '<p class="gdb-texte">Annulation gratuite jusqu’à la veille !</p>' },
  ] }] });
  assert.equal(t.etat, 'refuse');
  assert.ok(t.relecture.some((r) => r.niveau === 'bloquant'));
});
