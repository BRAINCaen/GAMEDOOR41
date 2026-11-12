// ==========================================================================
// Tests de la bibliothèque de blocs (app/blocs/catalogue.js)
// + feuille css/editeur-blocs.css + script js/editeur-blocs.js
// Lancer depuis editeur-src : node --test tests/blocs.test.mjs
// ==========================================================================
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import vm from 'node:vm';
import { parseFragment } from 'parse5';
import { CATEGORIES, BLOCS } from '../app/blocs/catalogue.js';
import { assainirHtml } from '../noyau/assainir.mjs';
import { appliquerOperations } from '../noyau/operations.mjs';
import { construireArbre, elements, attr } from '../noyau/arbre.mjs';
import { relire, REGLES_DEFAUT } from '../noyau/relecture.mjs';

const RACINE = join(import.meta.dirname, '..', '..');
const CSS = readFileSync(join(RACINE, 'css', 'editeur-blocs.css'), 'utf8');
const JS = readFileSync(join(RACINE, 'js', 'editeur-blocs.js'), 'utf8');
const IMAGES_DEPOT = new Set(execFileSync('git', ['ls-files', '-z', 'img'], { cwd: RACINE, encoding: 'utf8', maxBuffer: 1 << 26 }).split('\0').filter(Boolean));

// Classes du site utilisables sans règle dans editeur-blocs.css
const CLASSES_SITE = new Set(['container', 'btn', 'btn-primary', 'btn-outline', 'btn-arrow', 'section', 'fade-in', 'text-orange', 'text-cyan', 'text-red', 'text-grey']);
// Balises « de texte » (placement dans un paragraphe)
const BALISES_TEXTE = new Set(['a', 'strong', 'b', 'em', 'i', 'u', 's', 'small', 'mark', 'sup', 'sub', 'br', 'span', 'abbr', 'code', 'time', 'q', 'del', 'ins', 'kbd', 'wbr', 'cite',
  'svg', 'g', 'path', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'rect', 'title', 'desc', 'use']);
const BALISES_SVG = new Set(['svg', 'g', 'path', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'rect']);
const TYPES_REGLAGE = new Set(['texte', 'url', 'nombre', 'date', 'datetime', 'case', 'choix', 'youtube', 'vimeo', 'carte']);
// Textes réels (ni prix, ni horaire, ni nom inventé) : seuls textes permis hors data-gdb-exemple
const TEXTES_REELS = new Set([
  'Bon à savoir', 'Important', 'Réserver en ligne', 'Réserver', 'Nous écrire', 'Écrire sur WhatsApp', 'contact@gamedoor41.fr',
  'Lire la vidéo', 'FAQ', 'Questions fréquentes', 'Lire tous les avis', 'Lire les avis',
  'Découvrez ce que nos joueurs racontent après leur partie.', 'Contact', 'Une question ?', 'E-mail', 'WhatsApp',
  'Écrire un message', 'Adresse', '41 bis rue Pasteur, 14120 Mondeville', 'Votre code', 'Copier le code',
  '00', 'jours', 'heures', 'minutes', 'secondes', 'Cette offre est terminée.', 'Il reste', 'Nouveau', 'Offre limitée',
  'Carte cadeau', 'Offrez une expérience', 'Voir la carte cadeau',
  'Un escape game ou une émission du quiz, à offrir à qui vous voulez. La carte cadeau est valable 12 mois.',
  'Horaires', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche',
  'Nous trouver', 'GAMEDOOR·41', '41 bis rue Pasteur', '14120 Mondeville', 'Préparer l’itinéraire',
  'En voiture', 'Se garer', 'En transports en commun', 'Durée', 'Joueurs', 'Âge', 'Niveau',
]);
// Images réelles (non marquées « exemple ») : photo de la carte cadeau et façade de l'entrée
const IMAGES_REELLES = new Set(['/img/magazine/cartes-cadeau-quiz-neon-768w.jpg', '/img/escape/facade-41-bis-rue-pasteur-mondeville-1024w.webp']);
const MOTS_INTERDITS = /annulation|rembours|facultati|appelez[- ]nous|t[ée]l[ée]phonez|\btel:|lorem|ipsum/i;

// --------------------------------------------------------------------------
// Outils : arbre parse5
// --------------------------------------------------------------------------
const estEl = (n) => !!n.tagName;
const attrs = (n) => Object.fromEntries((n.attrs || []).map((a) => [(a.prefix ? a.prefix + ':' : '') + a.name, a.value]));
const classesDe = (n) => (attrs(n).class || '').split(/\s+/).filter(Boolean);
function* parcourir(n) {
  for (const k of n.childNodes || []) {
    yield k;
    yield* parcourir(k);
  }
}
function racineDe(html) {
  const frag = parseFragment(html);
  const tops = frag.childNodes.filter((k) => estEl(k) || (k.nodeName === '#text' && k.value.trim()));
  return { frag, tops };
}
const norm = (s) => String(s).replace(/[\s  ]+/g, ' ').trim();

/** Sélecteur simple : tag, .classe, [attr], [attr="v"] (composés, éventuellement séparés par des espaces). */
function compose(s) {
  const m = /^([a-z][a-z0-9]*)?((?:\.[\w-]+|\[[\w-]+(?:="[^"]*")?\])*)$/i.exec(s);
  if (!m) throw new Error('Sélecteur non pris en charge : ' + s);
  const parts = [...m[2].matchAll(/\.([\w-]+)|\[([\w-]+)(?:="([^"]*)")?\]/g)];
  return {
    tag: m[1] ? m[1].toLowerCase() : null,
    classes: parts.filter((p) => p[1]).map((p) => p[1]),
    attrs: parts.filter((p) => p[2]).map((p) => [p[2], p[3]]),
  };
}
function correspond(n, c) {
  if (!estEl(n)) return false;
  if (c.tag && n.tagName !== c.tag) return false;
  const cl = classesDe(n);
  const at = attrs(n);
  return c.classes.every((x) => cl.includes(x)) && c.attrs.every(([k, v]) => k in at && (v === undefined || at[k] === v));
}
function chercher(racine, sel) {
  if (!sel.trim()) return [racine];
  const chaine = sel.trim().split(/\s+/).map(compose);
  const dernier = chaine.pop();
  const out = [];
  const ancetres = [];
  const visiter = (n) => {
    for (const k of n.childNodes || []) {
      if (!estEl(k)) continue;
      if (correspond(k, dernier)) {
        let i = chaine.length - 1;
        for (let a = ancetres.length - 1; a >= 0 && i >= 0; a--) if (correspond(ancetres[a], chaine[i])) i--;
        if (i < 0) out.push(k);
      }
      ancetres.push(k);
      visiter(k);
      ancetres.pop();
    }
  };
  ancetres.push(racine);
  visiter(racine);
  return out;
}

// --------------------------------------------------------------------------
// Outils : CSS
// --------------------------------------------------------------------------
function selecteursCss(css) {
  const sans = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out = [];
  const lire = (txt) => {
    let i = 0;
    while (i < txt.length) {
      const ouv = txt.indexOf('{', i);
      if (ouv < 0) break;
      const tete = txt.slice(i, ouv).trim();
      let prof = 1;
      let j = ouv + 1;
      while (j < txt.length && prof) { if (txt[j] === '{') prof++; else if (txt[j] === '}') prof--; j++; }
      const corps = txt.slice(ouv + 1, j - 1);
      if (/^@(media|supports)/.test(tete)) lire(corps);
      else if (!/^@/.test(tete)) out.push(...tete.split(',').map((s) => s.trim()).filter(Boolean));
      i = j;
    }
  };
  lire(sans);
  return out;
}
const SELECTEURS = selecteursCss(CSS);
const CLASSES_CSS = new Set(SELECTEURS.flatMap((s) => [...s.matchAll(/\.([A-Za-z_][\w-]*)/g)].map((m) => m[1])));

// --------------------------------------------------------------------------
// Page d'essai pour l'insertion réelle par le noyau de l'éditeur
// --------------------------------------------------------------------------
const PAGE = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Page d'essai des blocs — GAMEDOOR·41</title>
  <meta name="description" content="Une description assez longue pour l'essai des blocs.">
</head>
<body>
  <header class="site-header"><nav><a href="/">Accueil</a></nav></header>
  <main>
    <section class="section essai"><div class="container"><p class="intro">Un paragraphe existant de la page.</p><ul class="essai-liste"><li>Ligne existante</li></ul></div></section>
  </main>
  <footer class="site-footer"><p>© 2026</p></footer>
</body>
</html>
`;
const idDe = (pred) => { for (const el of elements(construireArbre(PAGE).racine)) if (pred(el)) return el.id; throw new Error('introuvable'); };
const ID_CONTENEUR = idDe((e) => e.tag === 'div' && attr(e, 'class') === 'container');
const ID_P = idDe((e) => e.tag === 'p' && attr(e, 'class') === 'intro');
const ID_UL = idDe((e) => e.tag === 'ul');
const ID_MAIN = idDe((e) => e.tag === 'main');

// ==========================================================================
// Catalogue
// ==========================================================================
test('catalogue : catégories et nombre de blocs', () => {
  assert.ok(CATEGORIES.length >= 6);
  const ids = CATEGORIES.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length, 'catégorie en double');
  for (const c of CATEGORIES) assert.ok(c.nom && /^[a-z-]+$/.test(c.id), 'catégorie mal formée : ' + c.id);
  assert.ok(BLOCS.length >= 45, 'au moins 45 blocs (' + BLOCS.length + ')');
  for (const c of CATEGORIES) assert.ok(BLOCS.some((b) => b.categorie === c.id), 'catégorie vide : ' + c.id);
});

test('catalogue : identifiants uniques', () => {
  const ids = BLOCS.map((b) => b.id);
  const doublons = ids.filter((x, i) => ids.indexOf(x) !== i);
  assert.deepEqual(doublons, []);
});

for (const b of BLOCS) {
  describe('bloc ' + b.id, () => {
    const html = b.html();
    const { frag, tops } = racineDe(html);
    const racine = tops[0];

    test('fiche complète', () => {
      assert.match(b.id, /^[a-z0-9]+(-[a-z0-9]+)*$/);
      assert.ok(CATEGORIES.some((c) => c.id === b.categorie), 'catégorie inconnue : ' + b.categorie);
      assert.ok(b.nom && b.nom.length <= 48, 'nom manquant ou trop long');
      assert.ok(b.description && b.description.length >= 15, 'description manquante');
      assert.ok(Array.isArray(b.motsCles) && b.motsCles.length >= 2, 'mots-clés manquants');
      assert.ok(['flux', 'texte', 'liste'].includes(b.placement), 'placement inconnu');
      assert.equal(typeof b.html, 'function');
      assert.equal(b.html(), html, 'le HTML doit être identique à chaque appel');
    });

    test('icône SVG valide', () => {
      const { tops: t } = racineDe(b.icone);
      assert.equal(t.length, 1);
      const svg = t[0];
      assert.equal(svg.tagName, 'svg');
      const a = attrs(svg);
      assert.equal(a.viewBox, '0 0 24 24');
      assert.equal(a.width, '24');
      assert.equal(a.height, '24');
      assert.equal(a.fill, 'none');
      assert.equal(a.stroke, 'currentColor');
      assert.equal(a['stroke-width'], '2');
      const dessins = [...parcourir(svg)].filter(estEl);
      assert.ok(dessins.length >= 1, 'icône vide');
      for (const d of dessins) assert.ok(BALISES_SVG.has(d.tagName), 'balise d’icône inattendue : ' + d.tagName);
      assert.deepEqual(assainirHtml(b.icone).retires, []);
    });

    test('rien n’est perdu au filtre de sécurité', () => {
      assert.deepEqual(assainirHtml(html).retires, []);
    });

    test('racine unique avec data-gdb et classe gdb-', () => {
      assert.equal(tops.length, 1, 'un seul élément racine');
      assert.ok(estEl(racine));
      assert.equal(attrs(racine)['data-gdb'], b.id);
      assert.ok(classesDe(racine).some((c) => c.startsWith('gdb-')), 'classe gdb- manquante');
      if (racine.tagName === 'section') {
        assert.ok(classesDe(racine).includes('gdb-section'), 'une section porte la classe gdb-section');
        assert.ok(racine.childNodes.some((k) => estEl(k) && k.tagName === 'div' && classesDe(k).includes('container')), 'section sans div.container');
      }
    });

    test('placement respecté', () => {
      const tous = [racine, ...parcourir(racine)].filter(estEl);
      if (b.placement === 'texte') for (const n of tous) assert.ok(BALISES_TEXTE.has(n.tagName), 'balise non textuelle : ' + n.tagName);
      if (b.placement === 'liste') assert.equal(racine.tagName, 'li');
      if (b.placement === 'flux') assert.ok(!['li', 'tr', 'td', 'th', 'dt', 'dd'].includes(racine.tagName));
    });

    test('aucun identifiant, aucun mot interdit, aucun lien téléphone', () => {
      for (const n of parcourir(frag)) if (estEl(n)) assert.ok(!('id' in attrs(n)), 'attribut id interdit (bloc réutilisable)');
      assert.doesNotMatch(html, MOTS_INTERDITS);
      assert.doesNotMatch(b.nom + ' ' + b.description, MOTS_INTERDITS);
    });

    test('textes et images d’exemple marqués data-gdb-exemple', () => {
      const exemple = (n) => { for (let p = n; p && p.nodeName !== '#document-fragment'; p = p.parentNode) if (estEl(p) && 'data-gdb-exemple' in attrs(p)) return true; return false; };
      // un exemple « à régler » (vidéo, date…) est la cible d'un réglage et n'a pas de texte à lui
      const ciblesReglages = new Set((b.reglages || []).flatMap((r) => chercher(racine, r.cible)));
      let nbExemples = 0;
      for (const n of [racine, ...parcourir(racine)]) {
        if (estEl(n) && 'data-gdb-exemple' in attrs(n)) {
          nbExemples++;
          assert.equal(attrs(n)['data-gdb-exemple'], '', 'data-gdb-exemple doit être vide');
          // le plus petit élément possible : pas d'exemple dans un exemple de texte
          for (let p = n.parentNode; p && p.nodeName !== '#document-fragment'; p = p.parentNode) {
            if (!(estEl(p) && 'data-gdb-exemple' in attrs(p))) continue;
            assert.ok(ciblesReglages.has(p), 'exemple imbriqué dans un autre exemple : ' + n.tagName);
            assert.ok(!p.childNodes.some((k) => k.nodeName === '#text' && k.value.trim()), 'un exemple de réglage ne porte pas de texte');
          }
        }
        if (n.nodeName === '#text' && n.value.trim()) {
          let dansSvg = false;
          for (let p = n.parentNode; p; p = p.parentNode) if (p.tagName === 'svg') dansSvg = true;
          if (dansSvg) continue;
          assert.ok(exemple(n) || TEXTES_REELS.has(norm(n.value)), 'texte ni réel ni marqué « exemple » : « ' + norm(n.value) + ' »');
        }
        if (estEl(n) && n.tagName === 'img') {
          const a = attrs(n);
          assert.ok((a.alt || '').trim(), 'image sans texte alternatif');
          assert.ok('data-gdb-exemple' in a || IMAGES_REELLES.has(a.src), 'image d’exemple non marquée : ' + a.src);
          assert.ok(a.width && a.height, 'image sans dimensions');
        }
      }
      const aDuTexte = [...parcourir(racine)].some((n) => n.nodeName === '#text' && n.value.trim() && !TEXTES_REELS.has(norm(n.value)));
      if (aDuTexte) assert.ok(nbExemples > 0, 'texte d’exemple sans data-gdb-exemple');
    });

    test('images présentes dans le dépôt', () => {
      for (const n of parcourir(racine)) {
        if (!estEl(n) || !['img', 'source'].includes(n.tagName)) continue;
        const a = attrs(n);
        const chemins = [a.src, ...String(a.srcset || '').split(',').map((c) => c.trim().split(/\s+/)[0])].filter(Boolean);
        for (const c of chemins) {
          assert.ok(IMAGES_DEPOT.has(c.replace(/^\//, '')), 'image absente du dépôt : ' + c);
          // un SVG mal formé (« & » brut…) ne s'affiche pas du tout dans le navigateur
          if (c.endsWith('.svg')) assert.doesNotMatch(readFileSync(join(RACINE, c), 'utf8'), /&(?![a-zA-Z]+;|#\d+;|#x[\da-fA-F]+;)/, 'SVG invalide : ' + c);
        }
      }
    });

    test('chaque classe a sa règle dans editeur-blocs.css', () => {
      for (const n of [racine, ...parcourir(racine)]) {
        if (!estEl(n) || BALISES_SVG.has(n.tagName) && n.tagName !== 'svg') continue;
        for (const c of classesDe(n)) {
          if (CLASSES_SITE.has(c)) continue;
          assert.ok(c.startsWith('gdb-'), 'classe hors préfixe gdb- : ' + c);
          assert.ok(CLASSES_CSS.has(c), 'classe sans règle CSS : ' + c);
        }
      }
    });

    test('réglages cohérents (cible trouvée, valeurs acceptées par le filtre)', () => {
      const cles = new Set();
      for (const r of b.reglages || []) {
        assert.ok(r.cle && !cles.has(r.cle), 'clé de réglage manquante ou en double : ' + r.cle);
        cles.add(r.cle);
        assert.ok(r.libelle, 'libellé manquant');
        assert.ok(TYPES_REGLAGE.has(r.type), 'type de réglage inconnu : ' + r.type);
        assert.equal(typeof r.cible, 'string');
        assert.ok(r.attribut, 'attribut manquant');
        const cibles = chercher(racine, r.cible);
        assert.equal(cibles.length, 1, 'cible « ' + r.cible + ' » trouvée ' + cibles.length + ' fois');
        const cible = cibles[0];
        const a = attrs(cible);
        if (r.type === 'choix') {
          assert.ok(Array.isArray(r.options) && r.options.length >= 2, 'choix sans options');
          const valeurs = r.options.map((o) => o.valeur);
          assert.ok(valeurs.includes(r.defaut), 'valeur par défaut absente des options');
          for (const o of r.options) assert.ok(o.libelle, 'option sans libellé');
          if (r.attribut === 'class') {
            for (const v of valeurs.filter(Boolean)) {
              assert.match(v, /^gdb-[a-z0-9-]+$/, 'variante hors préfixe : ' + v);
              assert.ok(CLASSES_CSS.has(v), 'variante sans règle CSS : ' + v);
            }
            const presentes = valeurs.filter((v) => v && classesDe(cible).includes(v));
            assert.deepEqual(presentes, r.defaut ? [r.defaut] : [], 'classes de variante présentes ≠ défaut');
          }
        } else if (r.type === 'case') {
          assert.equal(typeof r.defaut, 'boolean');
          assert.equal(r.attribut in a, r.defaut, 'présence de l’attribut ≠ défaut de la case');
          assert.deepEqual(assainirHtml(`<${cible.tagName} ${r.attribut}=""></${cible.tagName}>`).retires, []);
        } else {
          assert.notEqual(r.attribut, 'class');
          if (r.defaut) {
            assert.equal(a[r.attribut], r.defaut, 'valeur par défaut ≠ HTML pour ' + r.attribut);
            const echappe = String(r.defaut).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
            assert.deepEqual(assainirHtml(`<${cible.tagName} ${r.attribut}="${echappe}"></${cible.tagName}>`).retires, [], 'valeur refusée par le filtre');
          }
          if (r.type === 'date' || r.type === 'datetime') assert.match(r.attribut, /^data-gdb-(du|au|fin)$/);
        }
      }
    });

    test('insertion réelle par le noyau de l’éditeur + relecture', () => {
      const id = b.placement === 'texte' ? ID_P : b.placement === 'liste' ? ID_UL : (racine.tagName === 'section' || racine.tagName === 'aside') ? ID_MAIN : ID_CONTENEUR;
      const { page, html: sortie, avertissements } = appliquerOperations(PAGE, [{ op: 'inserer', id, position: 'fin', html, uid: 'blc' + BLOCS.indexOf(b) }], { versions: { css: 'c1', js: 'j1' } });
      assert.ok(!avertissements.some((a) => /Retiré/.test(a.message)), 'contenu retiré à l’insertion');
      assert.equal((sortie.match(/editeur-blocs\.css\?v=c1/g) || []).length, 1, 'feuille des blocs non ajoutée');
      assert.equal((sortie.match(/editeur-blocs\.js\?v=j1/g) || []).length, 1, 'script des blocs non ajouté');
      const res = relire(page);
      const exemples = res.filter((r) => r.niveau === 'bloquant' && /d’exemple pas encore remplacée?/.test(r.message));
      const autresBloquants = res.filter((r) => r.niveau === 'bloquant' && !exemples.includes(r));
      assert.deepEqual(autresBloquants, [], 'relecture : blocage inattendu');
      const messagesRegles = new Set(REGLES_DEFAUT.map((r) => r.message));
      assert.deepEqual(res.filter((r) => messagesRegles.has(r.message)), [], 'relecture : consigne maison signalée');
      const aDesExemples = /data-gdb-exemple/.test(html);
      assert.equal(exemples.length > 0, aDesExemples, 'la publication doit être bloquée tant qu’il reste un exemple');
      if (racine.tagName !== 'h1' && !html.includes('<h1')) assert.ok(!res.some((r) => /H1/.test(r.message)));
    });
  });
}

// ==========================================================================
// Feuille de style
// ==========================================================================
test('CSS : classes « masqué sur ordinateur / tablette / téléphone » de l’inspecteur', () => {
  const sans = CSS.replace(/\/\*[\s\S]*?\*\//g, '');
  const tranches = { ordinateur: '(min-width: 1025px)', tablette: '(min-width: 769px) and (max-width: 1024px)', telephone: '(max-width: 768px)' };
  for (const [appareil, media] of Object.entries(tranches)) {
    const i = sans.indexOf('@media ' + media + ' {\n  .gdb-masque-' + appareil);
    assert.ok(i >= 0, 'règle @media ' + media + ' absente pour gdb-masque-' + appareil);
    const bloc = sans.slice(i, sans.indexOf('\n}', i));
    assert.ok(bloc.includes('.gdb-masque-' + appareil + ':not(:is([data-gdb-apercu] *)) { display: none !important; }'), 'masquage absent : ' + appareil);
    assert.match(bloc, new RegExp('\\.gdb-masque-' + appareil + ':is\\(\\[data-gdb-apercu\\] \\*\\)::before \\{ content: "Masqué sur '), 'étiquette d’aperçu absente : ' + appareil);
    assert.ok(CLASSES_CSS.has('gdb-masque-' + appareil));
  }
});

test('CSS : chaque sélecteur commence par une classe .gdb-', () => {
  assert.ok(SELECTEURS.length > 100);
  const fautifs = SELECTEURS.filter((s) => !/^\.gdb-[a-z0-9-]/.test(s));
  assert.deepEqual(fautifs, []);
});

test('CSS : aucune police externe, aucun import, mouvement réduit respecté', () => {
  assert.doesNotMatch(CSS, /@import|@font-face|url\(\s*['"]?https?:/i);
  assert.match(CSS, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(CSS, /var\(--orange, #FF6B00\)/);
});

test('CSS : classes des pages créées par l’éditeur (noyau/pages.mjs)', () => {
  const pages = readFileSync(join(RACINE, 'editeur-src', 'noyau', 'pages.mjs'), 'utf8');
  const classes = [...pages.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/)).filter((c) => c.startsWith('gdb-'));
  assert.ok(classes.length >= 3);
  for (const c of classes) assert.ok(CLASSES_CSS.has(c), 'classe de page sans règle : ' + c);
});

// ==========================================================================
// Script
// ==========================================================================
test('JS : léger, sans appel réseau, syntaxe valide', () => {
  assert.ok(Buffer.byteLength(JS) < 15 * 1024, 'script trop lourd : ' + Buffer.byteLength(JS) + ' octets');
  assert.doesNotMatch(JS, /\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|import\s*\(|\beval\s*\(|new Function/);
  execFileSync(process.execPath, ['--check', join(RACINE, 'js', 'editeur-blocs.js')]);
});

test('JS : une seule variable globale (window.GD41Blocs), init idempotente', () => {
  const ecouteurs = [];
  const bac = {
    document: {
      readyState: 'loading',
      documentElement: { classList: { add() {} }, hasAttribute: () => false },
      addEventListener: (type, f) => ecouteurs.push([type, f]),
    },
  };
  bac.window = bac;
  const avant = new Set(Object.keys(bac));
  vm.runInNewContext(JS, bac);
  const ajoutes = Object.keys(bac).filter((k) => !avant.has(k));
  assert.deepEqual(ajoutes, ['GD41Blocs']);
  assert.equal(typeof bac.GD41Blocs.init, 'function');
  assert.deepEqual(ecouteurs.map((e) => e[0]), ['DOMContentLoaded']);
  // second chargement : rien n'est redéfini
  const premier = bac.GD41Blocs;
  vm.runInNewContext(JS, bac);
  assert.equal(bac.GD41Blocs, premier);
});

test('JS : chaque classe posée par le script a sa règle CSS', () => {
  const classes = new Set();
  for (const m of JS.matchAll(/(?:creer\('\w+',\s*|bouton\(\s*|classList\.(?:add|toggle|remove|contains)\(\s*|className = )'([^']+)'/g)) m[1].split(/\s+/).forEach((c) => classes.add(c));
  for (const m of JS.matchAll(/class="([^"]+)"/g)) m[1].split(/\s+/).filter((c) => /^gdb-[a-z0-9-]+$/.test(c)).forEach((c) => classes.add(c));
  assert.ok(classes.size >= 15, 'classes du script trouvées : ' + [...classes].join(', '));
  for (const c of classes) assert.ok(CLASSES_CSS.has(c), 'classe du script sans règle CSS : ' + c);
});

test('JS : chaque comportement attendu est branché', () => {
  for (const sel of ['[data-gdb-du],[data-gdb-au]', '[data-gdb-compte-a-rebours]', '[data-gdb-carrousel]', '[data-gdb-onglets]', '[data-gdb-compteur]',
    '[data-gdb-copier]', '[data-gdb-galerie]', '[data-gdb-youtube]', '[data-gdb-accordeon-unique]', '[data-gdb-fermable]']) {
    assert.ok(JS.includes("'" + sel + "'"), 'sélecteur non traité : ' + sel);
    // et au moins un bloc s'en sert
    const attrPrincipal = sel.match(/\[([\w-]+)\]/)[1];
    assert.ok(BLOCS.some((b) => b.html().includes(attrPrincipal)), 'aucun bloc n’utilise ' + attrPrincipal);
  }
  assert.match(JS, /youtube-nocookie\.com\/embed\//);
});
