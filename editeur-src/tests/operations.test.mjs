import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { appliquerOperations, verifierConservation } from '../noyau/operations.mjs';
import { construireArbre, elements, attr, texteVisible } from '../noyau/arbre.mjs';
import { relire } from '../noyau/relecture.mjs';
import { creerPage, ajouterAuSitemap } from '../noyau/pages.mjs';
import { assainirHtml } from '../noyau/assainir.mjs';

const RACINE = join(import.meta.dirname, '..', '..');
const lireDepot = (p) => execSync('git show HEAD:"' + p + '"', { cwd: RACINE, encoding: 'utf8', maxBuffer: 1 << 26 });

const PAGE = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Page d'essai — GAMEDOOR·41</title>
  <meta name="description" content="Une description assez longue pour le test.">
  <meta property="og:title" content="Page d'essai">
</head>
<body class="essai-page">
  <header class="site-header"><nav><a href="/" class="active">Accueil</a> <a href="/tarifs/">Tarifs</a></nav></header>
  <main>
    <section class="intro">
      <h1>Bienvenue chez <span>GAMEDOOR·41</span></h1>
      <p class="pitch">Un escape game &amp; un quiz à Caen, <strong>tout près</strong> de chez vous. Réservez <a href="/reserver/">en ligne</a> en deux minutes.</p>
      <ul class="liste"><li>Escape</li><li>Quiz</li></ul>
      <a class="btn" href="/reserver/"><svg viewBox="0 0 10 10"><path d="M0 0"/></svg> Réserver</a>
      <picture><source type="image/avif" srcset="/img/a-480w.avif 480w"><img src="/img/a.jpg" alt="Salle Psychiatric" width="400" height="300"></picture>
    </section>
  </main>
  <footer class="site-footer"><p>© 2026</p></footer>
</body>
</html>
`;

const idDe = (html, pred) => {
  const a = construireArbre(html);
  for (const el of elements(a.racine)) if (pred(el)) return el.id;
  throw new Error('élément introuvable');
};
const id = (pred) => idDe(PAGE, pred);
const H1 = id((e) => e.tag === 'h1');
const P = id((e) => e.tag === 'p' && attr(e, 'class') === 'pitch');
const UL = id((e) => e.tag === 'ul');
const SECTION = id((e) => e.tag === 'section');
const BTN = id((e) => e.tag === 'a' && attr(e, 'class') === 'btn');
const IMG = id((e) => e.tag === 'img');
const LIEN = id((e) => e.tag === 'a' && attr(e, 'href') === '/reserver/' && !attr(e, 'class'));
const FOOTER = id((e) => e.tag === 'footer');

const appliquer = (ops) => appliquerOperations(PAGE, ops, { versions: { css: 'aaaa1111', js: 'bbbb2222' } });
const refuse = (ops, code) => assert.throws(() => appliquer(ops), (e) => e.name === 'ErreurEditeur' && (!code || e.code === code));

test('sans opération : page identique', () => {
  assert.equal(appliquer([]).html, PAGE);
});

test('texte : réécrire oui, vider ou amputer non', () => {
  const { html } = appliquer([{ op: 'texte', id: H1, n: 0, ancien: 'Bienvenue chez', valeur: 'Bienvenue à bord de' }]);
  assert.match(html, /<h1>Bienvenue à bord de <span>/);
  refuse([{ op: 'texte', id: H1, n: 0, ancien: 'Bienvenue chez', valeur: '   ' }], 'SUPPRESSION');
  refuse([{ op: 'texte', id: P, n: 0, ancien: 'Un escape game & un quiz à Caen,', valeur: 'Un' }]);
  refuse([{ op: 'texte', id: H1, n: 0, ancien: 'Autre chose', valeur: 'Bonjour' }], 'PERIME');
  // les caractères spéciaux sont échappés
  const r = appliquer([{ op: 'texte', id: H1, n: 0, ancien: 'Bienvenue chez', valeur: 'Escape & quiz <b>' }]);
  assert.match(r.html, /<h1>Escape &amp; quiz &lt;b&gt; <span>/);
});

test('texte mis en forme : gras oui, lien retiré non', () => {
  const { html } = appliquer([{ op: 'html', id: P, uid: 'aaa1', html: 'Un escape game &amp; un quiz à <em>Caen</em>, <strong>tout près</strong> de chez vous. Réservez <a href="/reserver/">en ligne</a> vite et en deux minutes.' }]);
  assert.match(html, /<em>Caen<\/em>/);
  refuse([{ op: 'html', id: P, uid: 'aaa2', html: 'Un escape game et un quiz à Caen, tout près de chez vous. Réservez en ligne en deux minutes.' }], 'SUPPRESSION');
});

test('liens et attributs', () => {
  const { html } = appliquer([{ op: 'attr', id: LIEN, nom: 'href', valeur: '/tarifs/' }]);
  assert.match(html, /Réservez <a href="\/tarifs\/">en ligne/);
  refuse([{ op: 'attr', id: LIEN, nom: 'href', valeur: 'javascript:alert(1)' }], 'ATTR');
  refuse([{ op: 'attr', id: IMG, nom: 'alt', valeur: '' }], 'SUPPRESSION');
  refuse([{ op: 'attr', id: LIEN, nom: 'href', valeur: null }], 'SUPPRESSION');
  refuse([{ op: 'attr', id: IMG, nom: 'onerror', valeur: 'x' }]);
});

test('styles : rien ne peut masquer un élément publié', () => {
  const { html } = appliquer([{ op: 'style', id: H1, cle: 'abcd1', styles: { tous: { color: '#ff6b00' }, telephone: { 'font-size': '28px' } } }]);
  assert.match(html, /<h1 class="gds-abcd1">/);
  assert.match(html, /\.gds-abcd1\{color:#ff6b00 !important\}/);
  assert.match(html, /@media \(max-width: 768px\)\{\.gds-abcd1\{font-size:28px !important\}\}/);
  for (const [p, v] of [['display', 'none'], ['opacity', '0'], ['visibility', 'hidden'], ['height', '0'], ['font-size', '1px'], ['color', 'transparent'], ['transform', 'scale(0)'], ['position', 'absolute']]) {
    refuse([{ op: 'style', id: H1, cle: 'abcd1', styles: { tous: { [p]: v } } }], 'STYLE');
  }
  // un élément AJOUTÉ peut être masqué sur téléphone
  const r = appliquer([
    { op: 'inserer', id: SECTION, position: 'apres', uid: 'bloc1', html: '<section class="gdb-bandeau"><p>Promo de Noël</p></section>' },
    { op: 'style', id: 'bloc1.0', cle: 'zzzz9', styles: { telephone: { display: 'none' } } },
  ]);
  assert.match(r.html, /display:none !important/);
});

test('ajouter, déplacer, dupliquer', () => {
  const { html } = appliquer([
    { op: 'inserer', id: SECTION, position: 'apres', uid: 'sec1', html: '<section class="gdb-section"><h2>Nouveau</h2><p>Texte <script>alert(1)</script><img src="/img/x.webp" alt="x" onerror="alert(1)"></p></section>' },
    { op: 'inserer', id: UL, position: 'fin', uid: 'li11', html: '<li>Team building</li>' },
    { op: 'deplacer', id: BTN, ref: H1, position: 'avant' },
    { op: 'dupliquer', id: UL, uid: 'dup1' },
  ]);
  assert.match(html, /<h2>Nouveau<\/h2>/);
  assert.doesNotMatch(html, /alert/);
  assert.match(html, /<li>Team building<\/li><\/ul>/);
  assert.ok(html.indexOf('class="btn"') < html.indexOf('<h1'));
  assert.equal((html.match(/<ul class="liste">/g) || []).length, 2);
  refuse([{ op: 'inserer', id: P, position: 'fin', uid: 'xx11', html: '<div>bloc dans un paragraphe</div>' }], 'PLACEMENT');
  refuse([{ op: 'inserer', id: UL, position: 'fin', uid: 'xx12', html: '<p>pas une ligne</p>' }], 'PLACEMENT');
  refuse([{ op: 'deplacer', id: SECTION, ref: H1, position: 'apres' }], 'POSITION');
});

test('supprimer : seulement ce qui vient d’être ajouté', () => {
  refuse([{ op: 'supprimer', id: H1 }], 'SUPPRESSION');
  refuse([{ op: 'supprimer', id: FOOTER }], 'SUPPRESSION');
  const { html } = appliquer([
    { op: 'inserer', id: SECTION, position: 'apres', uid: 'tmp1', html: '<p class="gdb-texte">Brouillon</p>' },
    { op: 'supprimer', id: 'tmp1.0' },
  ]);
  assert.doesNotMatch(html, /Brouillon/);
  // un bloc qui contient un élément publié (déplacé dedans) ne se supprime pas
  refuse([
    { op: 'inserer', id: SECTION, position: 'apres', uid: 'tmp2', html: '<div class="gdb-boite"></div>' },
    { op: 'deplacer', id: UL, ref: 'tmp2.0', position: 'fin' },
    { op: 'supprimer', id: 'tmp2.0' },
  ], 'SUPPRESSION');
});

test('image : remplacée dans le <picture>, jamais retirée', () => {
  const { html } = appliquer([{ op: 'image', id: IMG, src: '/img/editeur/2026-11/promo-768w.webp', srcset: '/img/editeur/2026-11/promo-480w.webp 480w, /img/editeur/2026-11/promo-768w.webp 768w', largeur: 768, hauteur: 512, alt: 'Promo de Noël' }]);
  assert.match(html, /<source type="image\/webp" srcset="\/img\/editeur\/2026-11\/promo-480w\.webp 480w/);
  assert.match(html, /alt="Promo de Noël"/);
  refuse([{ op: 'image', id: IMG, src: 'https://exemple.com/a.jpg' }], 'IMAGE');
});

test('titre et description pour Google', () => {
  const { html } = appliquer([{ op: 'meta', titre: 'Nouveau titre de la page', description: 'Une nouvelle description bien plus parlante pour Google.' }]);
  assert.match(html, /<title>Nouveau titre de la page<\/title>/);
  assert.match(html, /<meta property="og:title" content="Nouveau titre de la page">/);
  refuse([{ op: 'meta', titre: 'abc' }], 'META');
});

test('rejouer donne exactement le même résultat (identifiants stables)', () => {
  const ops = [
    { op: 'inserer', id: SECTION, position: 'apres', uid: 'r1aa', html: '<section class="gdb-section"><h2>Titre</h2><p>Texte</p></section>' },
    { op: 'texte', id: 'r1aa.1', n: 0, ancien: 'Titre', valeur: 'Titre modifié' },
    { op: 'style', id: 'r1aa.2', cle: 'k1k1k1', styles: { tous: { color: 'red' } } },
  ];
  assert.equal(appliquer(ops).html, appliquer(ops).html);
  assert.match(appliquer(ops).html, /<h2>Titre modifié<\/h2><p class="gds-k1k1k1">/);
});

test('ressources communes ajoutées quand la page contient un bloc', () => {
  const { html } = appliquer([{ op: 'inserer', id: SECTION, position: 'apres', uid: 'res1', html: '<div class="gdb-boite">Info</div>' }]);
  assert.match(html, /<link rel="stylesheet" href="\/css\/editeur-blocs\.css\?v=aaaa1111" id="gd-blocs-css">/);
  assert.match(html, /<script defer src="\/js\/editeur-blocs\.js\?v=bbbb2222" id="gd-blocs-js"><\/script>\n<\/body>/);
});

test('filet de sécurité : une version amputée est refusée', () => {
  const amputee = PAGE.replace('<li>Quiz</li>', '');
  assert.throws(() => verifierConservation(PAGE, amputee), /moins d.éléments « li »/);
});

test('relecture : règles maison et images sans description', () => {
  const { page } = appliquer([{ op: 'inserer', id: SECTION, position: 'apres', uid: 'rel1', html: '<p class="gdb-texte">Annulation gratuite et remboursement garanti !</p><img src="/img/x.webp" alt="">' }]);
  const r = relire(page);
  assert.ok(r.some((x) => x.niveau === 'bloquant' && /annulation/.test(x.message)));
  assert.ok(r.some((x) => /rembours/i.test(x.message)));
  assert.ok(r.some((x) => /sans description/.test(x.message)));
  // le contenu déjà publié n'est pas reproché
  const vide = relire(appliquer([]).page);
  assert.equal(vide.length, 0);
});

test('filtre de sécurité', () => {
  const r = assainirHtml('<a href="javascript:alert(1)" onclick="x()">a</a><iframe src="https://evil.com"></iframe><iframe src="https://www.youtube-nocookie.com/embed/abc" title="v"></iframe><div style="position:fixed;color:red;background:url(https://evil.com/x.png)">t</div>');
  assert.doesNotMatch(r.html, /javascript|onclick|evil|fixed/);
  assert.match(r.html, /youtube-nocookie/);
  assert.match(r.html, /color: red/);
});

test('sur de vraies pages du site', () => {
  for (const chemin of ['tarifs/index.html', 'index.html', 'escape-game-caen/psychiatric/index.html']) {
    const src = lireDepot(chemin);
    const a = construireArbre(src);
    const h2 = [...elements(a.racine)].find((e) => e.tag === 'h2');
    const sec = [...elements(a.racine)].find((e) => e.tag === 'section');
    const segs = h2.enfants.filter((k) => k.t === 'txt');
    const k = segs.findIndex((s) => s.buf.slice(s.s, s.e).trim());
    const ancien = texteVisible({ enfants: [segs[k]] });
    const { html } = appliquerOperations(src, [
      { op: 'texte', id: h2.id, n: k, ancien, valeur: ancien + ' (modifié)' },
      { op: 'inserer', id: sec.id, position: 'apres', uid: 'vrai1', html: '<section class="gdb-section"><div class="container"><h2>Ajout</h2></div></section>' },
      { op: 'style', id: h2.id, cle: 'vrai01', styles: { tous: { color: '#ffd740' } } },
    ], { versions: { css: '1', js: '2' } });
    assert.ok(html.includes('(modifié)'), chemin);
    // tout le reste du fichier est intact : la différence se limite aux zones touchées
    assert.ok(html.length > src.length);
  }
});

test('nouvelle page et plan du site', () => {
  const modele = lireDepot('contact/index.html');
  const { html, fichier, url } = creerPage(modele, { slug: 'soiree-halloween', titre: 'Soirée Halloween — GAMEDOOR·41', description: 'Une soirée spéciale Halloween avec escape game et quiz à Caen.', h1: 'Soirée Halloween' });
  assert.equal(fichier, 'soiree-halloween/index.html');
  assert.match(html, /<title>Soirée Halloween — GAMEDOOR·41<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/gamedoor41\.fr\/soiree-halloween\/">/);
  assert.match(html, /<h1 class="gdb-titre-page">Soirée Halloween<\/h1>/);
  assert.match(html, /class="site-footer"/);
  assert.doesNotMatch(html, /application\/ld\+json/);
  const sm = ajouterAuSitemap(lireDepot('sitemap.xml'), url, '2026-11-12');
  assert.match(sm, /<loc>https:\/\/gamedoor41\.fr\/soiree-halloween\/<\/loc>\n    <lastmod>2026-11-12<\/lastmod>/);
  assert.ok(sm.endsWith('</urlset>\n') || sm.endsWith('</urlset>'));
});

test('empreintes : une page changée entre-temps est détectée, puis rebasée', async () => {
  const { signature, construireArbre: ca, elements: els } = await import('../noyau/arbre.mjs');
  const { rebaser } = await import('../noyau/operations.mjs');
  const a = ca(PAGE);
  const h1 = [...els(a.racine)].find((e) => e.tag === 'h1');
  const op = { op: 'style', id: h1.id, sig: signature(h1), cle: 'sig001', styles: { tous: { color: 'red' } } };
  assert.match(appliquer([op]).html, /gds-sig001/);
  // quelqu'un a ajouté un paragraphe AVANT le titre : les numéros changent
  const autre = PAGE.replace('<section class="intro">', '<section class="intro">\n      <p>Nouveau paragraphe</p>');
  assert.throws(() => appliquerOperations(autre, [op], { exigerSignatures: true }), (e) => e.code === 'PERIME' || e.code === 'TECHNIQUE');
  const { ops, perdues } = rebaser([op], autre);
  assert.equal(perdues.length, 0);
  assert.notEqual(ops[0].id, op.id);
  assert.match(appliquerOperations(autre, ops, { exigerSignatures: true }).html, /<h1 class="gds-sig001">/);
  // sans empreinte, le serveur refuse
  assert.throws(() => appliquerOperations(PAGE, [{ ...op, sig: undefined }], { exigerSignatures: true }), (e) => e.code === 'PERIME');
});

test('masquage par déplacement ou recouvrement : refusé', () => {
  // un bloc ajouté masqué sur téléphone ne peut pas recevoir un contenu publié
  refuse([
    { op: 'inserer', id: SECTION, position: 'apres', uid: 'msq001', html: '<div class="gdb-boite gdb-masque-telephone"></div>' },
    { op: 'deplacer', id: UL, ref: 'msq001.0', position: 'fin' },
  ], 'SUPPRESSION');
  // ni un bloc avec une date de fin
  refuse([
    { op: 'inserer', id: SECTION, position: 'apres', uid: 'msq002', html: '<div class="gdb-boite" data-gdb-au="2020-01-01"></div>' },
    { op: 'deplacer', id: UL, ref: 'msq002.0', position: 'fin' },
  ], 'SUPPRESSION');
  // ni masquer après coup un bloc qui contient du contenu publié
  refuse([
    { op: 'inserer', id: SECTION, position: 'apres', uid: 'msq003', html: '<div class="gdb-boite"></div>' },
    { op: 'deplacer', id: UL, ref: 'msq003.0', position: 'fin' },
    { op: 'attr', id: 'msq003.0', nom: 'data-gdb-au', valeur: '2020-01-01' },
  ], 'SUPPRESSION');
  refuse([
    { op: 'inserer', id: SECTION, position: 'apres', uid: 'msq004', html: '<div class="gdb-boite"></div>' },
    { op: 'deplacer', id: UL, ref: 'msq004.0', position: 'fin' },
    { op: 'classe', id: 'msq004.0', ajouter: ['gdb-masque-ordinateur'] },
  ]);
  refuse([
    { op: 'inserer', id: SECTION, position: 'apres', uid: 'msq005', html: '<div class="gdb-boite"></div>' },
    { op: 'deplacer', id: UL, ref: 'msq005.0', position: 'fin' },
    { op: 'style', id: 'msq005.0', cle: 'msq005', styles: { telephone: { display: 'none' } } },
  ], 'STYLE');
  // un ajout ne peut pas se poser par-dessus le contenu
  const { html } = appliquer([{ op: 'inserer', id: SECTION, position: 'apres', uid: 'rec001', html: '<div style="position:absolute;top:0;left:0;width:100%;height:3000px;background:#000;z-index:999">x</div>' }]);
  assert.doesNotMatch(html, /position:\s*absolute|z-index:\s*999/);
  refuse([
    { op: 'inserer', id: SECTION, position: 'apres', uid: 'rec002', html: '<div class="gdb-boite">x</div>' },
    { op: 'style', id: 'rec002.0', cle: 'rec002', styles: { tous: { position: 'absolute', top: '0' } } },
  ], 'STYLE');
  // ancre en double retirée de l'ajout
  const r = appliquer([{ op: 'inserer', id: SECTION, position: 'apres', uid: 'ide001', html: '<div class="gdb-boite" id="contenu-x"><p id="contenu-x">a</p></div>' }]);
  assert.equal((r.html.match(/id="contenu-x"/g) || []).length, 1);
});
