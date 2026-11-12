// ==========================================================================
// CANEVAS : la vraie page dans un cadre (iframe srcdoc, même origine).
//  - double tampon : la nouvelle version se dessine dans un cadre caché, puis
//    remplace l'ancienne au même endroit de défilement (aucun clignotement) ;
//  - chaque élément publié porte data-gdx="<id>" (ajouté au rendu seulement) ;
//  - calque de sélection dans le cadre (Shadow DOM, insensible au CSS du site) ;
//  - édition de texte en place (contenteditable), glisser-déposer.
// Les scripts de mesure (Google Analytics) et la fenêtre promo sont neutralisés
// dans le canevas : l'éditeur ne fausse pas les statistiques du site.
// ==========================================================================

import { attr } from '../noyau/arbre.mjs';

const NEUTRES = /googletagmanager|google-analytics|promo-popup|consentement|mesure\.js|hotjar|clarity/i;
const BLOCS_DE_TEXTE = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'td', 'th', 'dt', 'dd', 'figcaption', 'blockquote', 'summary', 'label', 'caption']);
const INLINES = new Set(['a', 'span', 'strong', 'em', 'b', 'i', 'u', 's', 'small', 'mark', 'sup', 'sub', 'abbr', 'code', 'time', 'q', 'cite', 'br', 'img', 'picture', 'svg', 'button', 'kbd', 'del', 'ins']);

let compteur = 0;
const prets = new Map();
window.__gdxPret = (jeton) => { const f = prets.get(jeton); if (f) { prets.delete(jeton); f(); } };

/** HTML du canevas pour une page (annoté, scripts de mesure neutralisés). */
export function htmlCanevas(page, chemin, { jeton, editable = true } = {}) {
  const dossier = chemin.replace(/index\.html$/, '').replace(/[^/]*$/, '');
  const base = location.origin + '/' + dossier;
  const filtre = (el) => {
    if (el.tag === 'script') {
      const src = attr(el, 'src') || '';
      if (NEUTRES.test(src)) return 'neutraliser';
      const txt = el.enfants.map((k) => k.t === 'txt' ? k.buf.slice(k.s, k.e) : '').join('');
      if (!src && /gtag\(|dataLayer|fbq\(|_paq/.test(txt) && !/application\/ld\+json/.test(attr(el, 'type') || '')) return 'neutraliser';
    }
    if (el.tag === 'base') return 'neutraliser';
    return 'garder';
  };
  const css = [
    '.fade-in,[class*="fade-in"],.reveal,[data-aos]{opacity:1!important;transform:none!important;transition:none!important}',
    'html{scroll-behavior:auto!important}',
    editable ? '[data-gdx]{cursor:default}[contenteditable="true"]{outline:2px solid #ff6b00!important;outline-offset:3px;cursor:text!important;caret-color:#ff6b00}' : '',
    editable ? 'a,button,summary,label{cursor:default!important}' : '',
    '[data-gdx-depot]{outline:2px dashed #22c55e!important;outline-offset:-2px}',
  ].join('');
  return page.html({
    annoter: true,
    filtre,
    injections: {
      debutTete: '<base href="' + base + '" data-gdx-ignorer>',
      finTete: '<style data-gdx-ignorer>' + css + '</style><script data-gdx-ignorer>window.__GDX_EDITEUR__=true;window.dataLayer=[];window.gtag=function(){};document.documentElement.setAttribute(\"data-gdb-apercu\",\"\");</script>',
      finCorps: '<script data-gdx-ignorer>(function(){var f=function(){setTimeout(function(){try{parent.__gdxPret(' + JSON.stringify(jeton) + ')}catch(e){}},0)};if(document.readyState!=="loading")f();else document.addEventListener("DOMContentLoaded",f);})();</script>',
    },
  });
}

export class Canevas {
  /**
   * @param {HTMLElement} hote
   * @param {object} o  { editable, surSelection, surSurvol, surDoubleClic, surMenu, surDepot, surClavier, surEditionFin, surRendu, nomDe(id) }
   */
  constructor(hote, o = {}) {
    this.hote = hote;
    this.o = o;
    this.cadres = [this.creerCadre(), this.creerCadre()];
    this.actif = 0;
    this.selection = null;
    this.survol = null;
    this.depot = null;
    this.edition = null;
    this.echelle = 1;
    this.boucle = null;
    this.html = null;
    this.enCours = null;
    this.cadres[0].style.visibility = 'visible';
  }

  creerCadre() {
    const f = document.createElement('iframe');
    f.className = 'gdx-cadre';
    f.setAttribute('title', 'Aperçu de la page');
    f.style.visibility = 'hidden';
    this.hote.appendChild(f);
    return f;
  }

  get cadre() { return this.cadres[this.actif]; }
  get doc() { try { return this.cadre.contentDocument; } catch (_) { return null; } }
  get win() { try { return this.cadre.contentWindow; } catch (_) { return null; } }

  dimensionner({ largeur, hauteur, echelle }) {
    this.echelle = echelle;
    for (const f of this.cadres) {
      f.style.width = largeur + 'px';
      f.style.height = Math.max(200, hauteur / echelle) + 'px';
      f.style.transform = 'scale(' + echelle + ')';
    }
  }

  /** Dessine une nouvelle version (double tampon). */
  rendre(fabrique, { garder = true } = {}) {
    const jeton = 'g' + (++compteur);
    const html = fabrique(jeton);
    if (html === this.html) return Promise.resolve();
    this.html = html;
    const prochain = 1 - this.actif;
    const cible = this.cadres[prochain];
    const ancien = this.cadres[this.actif];
    let defX = 0;
    let defY = 0;
    if (garder) { try { defX = ancien.contentWindow.scrollX; defY = ancien.contentWindow.scrollY; } catch (_) { /* rien */ } }
    this.finEdition(false, true);
    return new Promise((resolve) => {
      const premier = !this.dejaRendu;
      const fin = () => {
        if (this.html !== html) return resolve(); // une version plus récente est en route
        try { cible.contentWindow.scrollTo(defX, defY); } catch (_) { /* rien */ }
        this.brancher(cible);
        cible.style.visibility = 'visible';
        cible.style.zIndex = '1';
        ancien.style.visibility = 'hidden';
        ancien.style.zIndex = '0';
        this.actif = prochain;
        // le clavier suit le nouveau rendu (sinon raccourcis perdus dans l'ancien cadre)
        if (document.activeElement === ancien) { try { cible.contentWindow.focus(); } catch (_) { /* rien */ } }
        this.dejaRendu = true;
        this.majCalque();
        if (this.o.surRendu) this.o.surRendu(premier);
        // l'ancien cadre est vidé (mémoire, vidéos), sauf si un nouveau rendu l'utilise déjà
        const genAncien = ancien.__gen;
        setTimeout(() => { if (ancien.__gen === genAncien && this.cadres[this.actif] !== ancien) { ancien.__gen = -1; ancien.srcdoc = '<!doctype html><title>.</title>'; } }, 400);
        resolve();
      };
      prets.set(jeton, fin);
      setTimeout(() => { if (prets.has(jeton)) { prets.delete(jeton); fin(); } }, 6000);
      cible.__gen = jeton;
      cible.srcdoc = html;
    });
  }

  // ------------------------------------------------------------ événements
  cible(n) {
    let el = n && n.nodeType === 1 ? n : n && n.parentElement;
    if (!el) return null;
    const svg = el.closest && el.closest('svg[data-gdx]');
    if (svg) return svg;
    return el.closest ? el.closest('[data-gdx]') : null;
  }

  idDe(n) {
    const el = this.cible(n);
    return el ? el.getAttribute('data-gdx') : null;
  }

  brancher(cadre) {
    const doc = cadre.contentDocument;
    const win = cadre.contentWindow;
    if (!doc || doc.__gdxBranche) return;
    doc.__gdxBranche = true;
    this.creerCalque(doc);
    const o = this.o;
    const versParent = (e) => {
      const r = cadre.getBoundingClientRect();
      return { x: r.left + e.clientX * this.echelle, y: r.top + e.clientY * this.echelle };
    };
    doc.addEventListener('mousemove', (e) => {
      if (this.edition) return;
      const id = this.idDe(e.target);
      if (id !== this.survol) { this.survol = id; this.majCalque(); if (o.surSurvol) o.surSurvol(id); }
    }, true);
    doc.addEventListener('mouseleave', () => { this.survol = null; this.majCalque(); if (o.surSurvol) o.surSurvol(null); });
    doc.addEventListener('click', (e) => {
      if (this.edition && this.edition.el.contains(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      if (this.edition) this.finEdition(true);
      const el = this.cible(e.target);
      if (el && el.tagName === 'SUMMARY' && el.parentElement) el.parentElement.open = !el.parentElement.open;
      if (o.surSelection) o.surSelection(el ? el.getAttribute('data-gdx') : null, { shift: e.shiftKey, alt: e.altKey });
    }, true);
    doc.addEventListener('dblclick', (e) => {
      if (this.edition) return;
      e.preventDefault();
      const id = this.idDe(e.target);
      if (id && o.surDoubleClic) o.surDoubleClic(id, { x: e.clientX, y: e.clientY });
    }, true);
    doc.addEventListener('contextmenu', (e) => {
      if (this.edition) return;
      e.preventDefault();
      const id = this.idDe(e.target);
      if (o.surMenu) o.surMenu(id, versParent(e));
    }, true);
    doc.addEventListener('submit', (e) => e.preventDefault(), true);
    doc.addEventListener('auxclick', (e) => e.preventDefault(), true);
    doc.addEventListener('keydown', (e) => { if (!this.edition && o.surClavier) o.surClavier(e); }, true);
    win.addEventListener('scroll', () => this.majCalque(), { passive: true });
    win.addEventListener('resize', () => this.majCalque(), { passive: true });
    // glisser-déposer (blocs, médias, déplacement)
    doc.addEventListener('dragover', (e) => {
      if (!o.surDepot) return;
      e.preventDefault();
      const d = this.calculerDepot(e);
      this.depot = d;
      this.majCalque();
    }, true);
    doc.addEventListener('dragleave', (e) => { if (!e.relatedTarget) { this.depot = null; this.majCalque(); } }, true);
    doc.addEventListener('drop', (e) => {
      if (!o.surDepot) return;
      e.preventDefault();
      const d = this.depot || this.calculerDepot(e);
      this.depot = null;
      this.majCalque();
      let donnees = null;
      try { donnees = JSON.parse(e.dataTransfer.getData('application/x-gdx') || e.dataTransfer.getData('text/plain') || 'null'); } catch (_) { /* rien */ }
      const fichiers = e.dataTransfer.files && e.dataTransfer.files.length ? [...e.dataTransfer.files] : null;
      if (d) o.surDepot({ donnees, fichiers, id: d.id, position: d.position });
    }, true);
  }

  /** Où déposer : avant/après un élément de niveau bloc, ou à la fin d'un conteneur vide. */
  calculerDepot(e) {
    const doc = this.doc;
    let el = this.cible(e.target) || doc.body;
    while (el && el !== doc.body && INLINES.has(el.tagName.toLowerCase())) {
      const p = el.parentElement && el.parentElement.closest('[data-gdx]');
      if (!p) break;
      el = p;
    }
    if (!el || !el.getAttribute) return null;
    const id = el.getAttribute('data-gdx');
    if (!id) return null;
    const r = el.getBoundingClientRect();
    const tag = el.tagName.toLowerCase();
    const conteneur = !BLOCS_DE_TEXTE.has(tag) && !INLINES.has(tag) && tag !== 'body';
    const vide = conteneur && !el.querySelector('[data-gdx]');
    if (tag === 'body' || (vide && e.clientY > r.top + 8 && e.clientY < r.bottom - 8)) return { id, position: 'fin', el };
    return { id, position: e.clientY < r.top + r.height / 2 ? 'avant' : 'apres', el };
  }

  // ------------------------------------------------------------ calque
  creerCalque(doc) {
    const hote = doc.createElement('gdx-calque');
    hote.setAttribute('data-gdx-ignorer', '');
    hote.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;z-index:2147483647;pointer-events:none;display:block';
    doc.documentElement.appendChild(hote);
    const ombre = hote.attachShadow({ mode: 'open' });
    ombre.innerHTML = '<style>'
      + '.b{position:absolute;box-sizing:border-box;pointer-events:none;display:none}'
      + '.h{border:1px dashed #ff6b00;background:rgba(255,107,0,.04)}'
      + '.s{border:2px solid #ff6b00;box-shadow:0 0 0 1px rgba(0,0,0,.6)}'
      + '.s.n{border-color:#22c55e}'
      + '.l{position:absolute;display:none;font:600 11px/18px system-ui,sans-serif;background:#ff6b00;color:#111;padding:0 7px;border-radius:4px 4px 0 0;white-space:nowrap;transform:translateY(-100%);max-width:320px;overflow:hidden;text-overflow:ellipsis}'
      + '.l.n{background:#22c55e}'
      + '.d{position:absolute;display:none;height:4px;background:#22c55e;border-radius:3px;box-shadow:0 0 0 3px rgba(34,197,94,.25)}'
      + '.f{position:absolute;display:none;box-sizing:border-box;border:2px dashed #22c55e;background:rgba(34,197,94,.08)}'
      + '</style><div class="b h"></div><div class="b s"></div><div class="l"></div><div class="d"></div><div class="f"></div>';
    this.calque = { doc, h: ombre.querySelector('.h'), s: ombre.querySelector('.s'), l: ombre.querySelector('.l'), d: ombre.querySelector('.d'), f: ombre.querySelector('.f') };
  }

  elementDe(id) {
    const doc = this.doc;
    if (!doc || id == null) return null;
    return doc.querySelector('[data-gdx="' + CSS.escape(String(id)) + '"]');
  }

  boite(el) {
    const win = this.win;
    const r = el.getBoundingClientRect();
    return { x: r.left + win.scrollX, y: r.top + win.scrollY, w: r.width, h: r.height, r };
  }

  majCalque() {
    if (this.boucle) return;
    this.boucle = requestAnimationFrame(() => {
      this.boucle = null;
      const c = this.calque;
      if (!c || c.doc !== this.doc) return;
      const placer = (n, b) => { if (!b) { n.style.display = 'none'; return; } Object.assign(n.style, { display: 'block', left: b.x + 'px', top: b.y + 'px', width: b.w + 'px', height: b.h + 'px' }); };
      const elH = this.survol && this.survol !== this.selection ? this.elementDe(this.survol) : null;
      placer(c.h, elH ? this.boite(elH) : null);
      const elS = this.selection ? this.elementDe(this.selection) : null;
      const bS = elS ? this.boite(elS) : null;
      placer(c.s, bS);
      const nouveau = this.selection && String(this.selection).includes('.');
      c.s.classList.toggle('n', !!nouveau);
      c.l.classList.toggle('n', !!nouveau);
      if (bS && !this.edition) {
        c.l.textContent = (this.o.nomDe ? this.o.nomDe(this.selection) : '') + (nouveau ? ' · ajouté' : '');
        Object.assign(c.l.style, { display: c.l.textContent ? 'block' : 'none', left: bS.x + 'px', top: Math.max(18, bS.y) + 'px' });
      } else c.l.style.display = 'none';
      c.d.style.display = 'none';
      c.f.style.display = 'none';
      if (this.depot && this.depot.el && this.depot.el.isConnected) {
        const b = this.boite(this.depot.el);
        if (this.depot.position === 'fin') placer(c.f, b);
        else Object.assign(c.d.style, { display: 'block', left: b.x + 'px', width: Math.max(40, b.w) + 'px', top: (this.depot.position === 'avant' ? b.y - 3 : b.y + b.h - 1) + 'px' });
      }
      if (this.o.surCalque) this.o.surCalque();
    });
  }

  selectionner(id, { defiler = false } = {}) {
    this.selection = id;
    const el = this.elementDe(id);
    if (el) {
      for (let p = el.parentElement; p; p = p.parentElement) if (p.tagName === 'DETAILS' && !p.open) p.open = true;
      if (defiler) {
        const r = el.getBoundingClientRect();
        const h = this.win.innerHeight;
        if (r.top < 40 || r.bottom > h - 40) el.scrollIntoView({ block: r.height > h * 0.8 ? 'start' : 'center' });
      }
    }
    this.majCalque();
  }

  survoler(id) { this.survol = id; this.majCalque(); }

  /** Rectangle d'un élément dans la fenêtre de l'éditeur (pour la barre d'outils flottante). */
  rectangle(id) {
    const el = this.elementDe(id);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const c = this.cadre.getBoundingClientRect();
    return { x: c.left + r.left * this.echelle, y: c.top + r.top * this.echelle, w: r.width * this.echelle, h: r.height * this.echelle, visible: r.bottom > 0 && r.top < this.win.innerHeight };
  }

  // ------------------------------------------------------------ texte
  editerTexte(id, { riche = false, point = null } = {}) {
    this.finEdition(true);
    const el = this.elementDe(id);
    if (!el) return false;
    const doc = this.doc;
    this.edition = { id, el, avant: el.innerHTML, riche, figes: [] };
    if (!riche) {
      for (const k of el.querySelectorAll('*')) {
        const t = k.tagName.toLowerCase();
        if (['svg', 'img', 'picture', 'video', 'iframe', 'br'].includes(t) || k.matches('[data-gdx]') && !k.textContent.trim()) {
          k.setAttribute('contenteditable', 'false');
          this.edition.figes.push(k);
        }
      }
    }
    el.setAttribute('contenteditable', 'true');
    el.setAttribute('spellcheck', 'true');
    el.focus({ preventScroll: true });
    try {
      const sel = doc.getSelection();
      let range = null;
      if (point && doc.caretRangeFromPoint) range = doc.caretRangeFromPoint(point.x, point.y);
      else if (point && doc.caretPositionFromPoint) { const p = doc.caretPositionFromPoint(point.x, point.y); if (p) { range = doc.createRange(); range.setStart(p.offsetNode, p.offset); } }
      if (!range || !el.contains(range.startContainer)) { range = doc.createRange(); range.selectNodeContents(el); range.collapse(false); }
      sel.removeAllRanges();
      sel.addRange(range);
    } catch (_) { /* rien */ }
    const touche = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); this.finEdition(false); return; }
      if (e.key === 'Enter') {
        if (riche && e.shiftKey) { e.preventDefault(); doc.execCommand('insertLineBreak'); return; }
        e.preventDefault();
        this.finEdition(true);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && !riche && ['b', 'i', 'u'].includes(e.key.toLowerCase())) e.preventDefault();
      e.stopPropagation();
    };
    const coller = (e) => {
      e.preventDefault();
      const t = (e.clipboardData && e.clipboardData.getData('text/plain')) || '';
      doc.execCommand('insertText', false, t.replace(/\r?\n+/g, ' '));
    };
    const quitter = () => setTimeout(() => { if (this.edition && this.edition.el === el && doc.activeElement !== el) this.finEdition(true); }, 120);
    el.addEventListener('keydown', touche);
    el.addEventListener('paste', coller);
    el.addEventListener('blur', quitter);
    el.addEventListener('drop', (e) => e.preventDefault());
    this.edition.retirer = () => { el.removeEventListener('keydown', touche); el.removeEventListener('paste', coller); el.removeEventListener('blur', quitter); };
    this.majCalque();
    return true;
  }

  finEdition(valider, silencieux = false) {
    const ed = this.edition;
    if (!ed) return;
    this.edition = null;
    ed.retirer();
    ed.el.removeAttribute('contenteditable');
    ed.el.removeAttribute('spellcheck');
    for (const k of ed.figes) k.removeAttribute('contenteditable');
    if (!valider) ed.el.innerHTML = ed.avant;
    if (!silencieux && this.o.surEditionFin) this.o.surEditionFin(ed.id, ed.el, valider, ed.avant, ed.riche);
    this.majCalque();
  }

  commande(nom, valeur = null) {
    if (!this.edition) return;
    this.edition.el.focus({ preventScroll: true });
    this.doc.execCommand(nom, false, valeur);
  }

  /** Styles calculés d'un élément (valeurs affichées dans l'inspecteur). */
  stylesCalcules(id) {
    const el = this.elementDe(id);
    if (!el) return null;
    return this.win.getComputedStyle(el);
  }

  /** Applique un style provisoire (pendant qu'on fait glisser un curseur), sans opération. */
  stylePasser(id, props) {
    const el = this.elementDe(id);
    if (!el) return;
    for (const [p, v] of Object.entries(props)) el.style.setProperty(p, v, 'important');
    this.majCalque();
  }

  detruire() {
    for (const f of this.cadres) f.remove();
  }
}
