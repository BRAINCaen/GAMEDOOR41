// Panneau « Vérifier » : relecture automatique de ce qui a été ajouté ou modifié
import { useEtat, docCourant, etat } from '../etat.js';
import { selectionner } from '../actions.js';
import { Icone } from '../ui/icones.jsx';
import { Vide } from '../ui/base.jsx';
import { elements, attr } from '../../noyau/arbre.mjs';

/** Contraste WCAG entre deux couleurs « rgb(a) » calculées par le navigateur. */
function luminance(c) {
  const m = /rgba?\(([^)]+)\)/.exec(c || '');
  if (!m) return null;
  const [r, g, b, a] = m[1].split(/[\s,/]+/).map(Number);
  if (a === 0) return null;
  const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function fondDe(el, win) {
  for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
    const s = win.getComputedStyle(n);
    if (s.backgroundImage && s.backgroundImage !== 'none') return null; // image ou dégradé : on ne juge pas
    const l = luminance(s.backgroundColor);
    if (l != null) return l;
  }
  return luminance('rgb(10,10,10)');
}

export function controlesContraste(page) {
  const c = window.__gdxCanevas;
  if (!c || !c.win) return [];
  const res = [];
  const corps = page.corps();
  if (!corps) return res;
  for (const el of elements(corps)) {
    if (!el.nouveau && !(el.attrs.some((a) => a.nom === 'class' && /gds-/.test(a.val)))) continue;
    if (!el.enfants.some((k) => k.t === 'txt' && k.buf.slice(k.s, k.e).trim())) continue;
    const dom = c.elementDe(el.id);
    if (!dom) continue;
    const s = c.win.getComputedStyle(dom);
    const lt = luminance(s.color);
    const lf = fondDe(dom, c.win);
    if (lt == null || lf == null) continue;
    const ratio = (Math.max(lt, lf) + 0.05) / (Math.min(lt, lf) + 0.05);
    const grand = parseFloat(s.fontSize) >= 24 || (parseFloat(s.fontSize) >= 18.6 && Number(s.fontWeight) >= 700);
    if (ratio < (grand ? 3 : 4.5)) res.push({ niveau: 'attention', message: 'Texte peu lisible (contraste ' + ratio.toFixed(1) + ':1, minimum ' + (grand ? '3' : '4,5') + ':1).', id: el.id });
  }
  return res;
}

export function PanneauVerifier() {
  useEtat((e) => e.rev);
  const d = docCourant();
  if (!d) return null;
  const pagesExistantes = new Set(etat.pages.filter((p) => p.chemin.endsWith('index.html')).map((p) => '/' + p.chemin.replace(/index\.html$/, '')));
  for (const x of Object.values(etat.docs)) if (x.nouvelle) pagesExistantes.add('/' + x.nouvelle.slug + '/');
  const liste = [...d.relecture({ regles: etat.reglages && etat.reglages.regles, pagesExistantes }), ...controlesContraste(d.page)];
  const ordre = { bloquant: 0, attention: 1, info: 2 };
  liste.sort((a, b) => ordre[a.niveau] - ordre[b.niveau]);
  if (!d.modifie) return <Vide icone="verifier">Aucune modification sur cette page pour l’instant. La relecture automatique porte uniquement sur ce que vous ajoutez ou modifiez.</Vide>;
  if (!liste.length) return <Vide icone="ok">Rien à signaler sur vos modifications de cette page.</Vide>;
  return (
    <div class="verifier">
      <p class="aide-ligne">« Bloquant » empêche la publication. Cliquez sur un point pour aller à l’élément.</p>
      <ul class="liste-relecture">
        {liste.map((r) => (
          <li class={'rl-' + r.niveau}>
            <button type="button" onClick={() => r.id && selectionner(r.id)}>
              <Icone nom={r.niveau === 'bloquant' ? 'interdit' : r.niveau === 'attention' ? 'alerte' : 'info'} taille={15} />
              <span><strong>{r.niveau === 'bloquant' ? 'Bloquant' : r.niveau === 'attention' ? 'À vérifier' : 'Conseil'}</strong> — {r.message}{r.extrait ? <em> {r.extrait}</em> : null}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
