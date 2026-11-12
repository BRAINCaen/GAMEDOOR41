/* GAMEDOOR·41 — comportements des blocs de l'éditeur (styles : editeur-blocs.css), sans dépendance ni appel réseau. */
(() => {
if (window.GD41Blocs) return;
const doc = document, html = doc.documentElement, vus = {}, etats = new WeakMap(), etat = { apercu: false };
let periodes = [], rebours = [], carrousels = [], tic = null, numero = 0, vis = null;
html.classList.add('gdb-js');

// -- outils
const nouveau = (type, el) => { const s = vus[type] || (vus[type] = new WeakSet()); return !s.has(el) && !!s.add(el); };
const $$ = (r, sel) => [...r.querySelectorAll(sel)];
const sur = (el, type, f, o) => el.addEventListener(type, f, o);
const lire = (el, nom) => el.getAttribute(nom);
const poser = (el, a) => { for (const k in a) el.setAttribute(k, a[k]); };
const branches = (l) => l.filter((e) => e.isConnected);
const reduit = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const creer = (tag, cls, contenu) => { const e = doc.createElement(tag); e.className = cls; e.innerHTML = contenu; return e; };
// bouton créé (icône dessinée en CSS, nom lu par les lecteurs d'écran)
const bouton = (cls, nom) => '<button type="button" class="' + cls + '" aria-label="' + nom + '"></button>';

// -- dates en heure de Paris (« 2026-12-24 » ou « 2026-12-24T18:30 ») ; vide : NaN
let fmt = null;
const decalageParis = (t) => {
  try {
    const p = {};
    fmt = fmt || new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' });
    fmt.formatToParts(t).forEach((x) => { p[x.type] = x.value; });
    return Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute) - t + t % 6e4;
  } catch (e) { return 36e5; }
};
// finJour : une date seule vaut jusqu'à minuit
function instantParis(texte, finJour) {
  const m = /^(\d{4})-(\d\d)-(\d\d)(?:[T ](\d\d):(\d\d))?/.exec(String(texte || '').trim());
  if (!m) return NaN;
  const mur = Date.UTC(m[1], m[2] - 1, +m[3] + (!m[4] && finJour ? 1 : 0), m[4] || 0, m[5] || 0);
  return mur - decalageParis(mur - decalageParis(mur));
}

// -- période d'affichage (date vide : sans limite)
function majPeriode(el, t) {
  const dehors = t < instantParis(lire(el, 'data-gdb-du')) || t >= instantParis(lire(el, 'data-gdb-au'), true);
  el.classList.toggle('gdb-hors-periode', dehors && !etat.apercu);
  el.classList.toggle('gdb-hors-periode-apercu', dehors && etat.apercu);
}

// -- compte à rebours
function majRebours(el, t) {
  const fin = instantParis(lire(el, 'data-gdb-fin'), true), s = Math.floor(Math.max(0, fin - t || 0) / 1000);
  [['j', s / 86400], ['h', s % 86400 / 3600], ['m', s % 3600 / 60], ['s', s % 60]].forEach(([k, n]) => {
    const c = el.querySelector('[data-gdb-' + k + ']'), x = String(Math.floor(n)).padStart(2, '0');
    if (c && c.textContent !== x) c.textContent = x;
  });
  const fini = el.parentNode.querySelector('[data-gdb-fini]');
  el.hidden = fin <= t && !!fini;
  if (fini) fini.hidden = !(fin <= t);
}

// -- carrousel (data-gdb-auto : défilement en secondes)
function aller(c, i) {
  const d = etats.get(c), l = d.piste.children;
  if (!l.length) return;
  d.i = i = (i + l.length) % l.length;
  d.piste.scrollTo({ left: l[i].offsetLeft, behavior: reduit() ? 'auto' : 'smooth' });
  d.dernier = Date.now();
  marquer(d);
}
function marquer(d) { [...d.points.children].forEach((b, k) => b.setAttribute('aria-current', k === d.i)); }
function carrousel(c) {
  const piste = c.querySelector('[data-gdb-piste]');
  if (!piste) return;
  if (nouveau('carrousel', c)) {
    const cmd = creer('div', 'gdb-carrousel-commandes', bouton('gdb-carrousel-btn gdb-carrousel-btn--prec', 'Photo précédente')
      + '<div class="gdb-carrousel-points"></div>' + bouton('gdb-carrousel-btn', 'Photo suivante'));
    const [prec, points, suiv] = cmd.children, d = { piste, points, i: 0, pause: 0, dernier: Date.now() };
    let attente = null;
    c.append(cmd);
    etats.set(c, d);
    sur(prec, 'click', () => aller(c, d.i - 1));
    sur(suiv, 'click', () => aller(c, d.i + 1));
    sur(points, 'click', (e) => { const b = e.target.closest('button'); if (b) aller(c, [...points.children].indexOf(b)); });
    // photo courante = celle calée à gauche (au doigt, au clavier)
    sur(piste, 'scroll', () => {
      clearTimeout(attente);
      attente = setTimeout(() => {
        const l = piste.children, pas = l.length > 1 ? l[1].offsetLeft - l[0].offsetLeft : 1;
        d.i = piste.scrollLeft >= piste.scrollWidth - piste.clientWidth - 2 ? l.length - 1 : Math.round(piste.scrollLeft / pas);
        marquer(d);
      }, 90);
    }, { passive: true });
    // pause au survol, au clavier, au doigt
    [['mouseenter', 1], ['mouseleave', 0], ['focusin', 1], ['focusout', 0], ['touchstart', 1]].forEach(([type, p]) =>
      sur(c, type, () => { d.pause = !!p; d.dernier = Date.now(); }, { passive: true }));
    carrousels.push(c);
  }
  // un point par photo (recalculés si une photo change)
  const d = etats.get(c), n = piste.children.length;
  if (d.points.children.length !== n) d.points.innerHTML = Array.from({ length: n }, (_, k) => bouton('gdb-carrousel-point', 'Photo ' + (k + 1) + ' sur ' + n)).join('');
  d.points.parentNode.hidden = n < 2;
  d.i = Math.min(d.i, Math.max(0, n - 1));
  marquer(d);
}

// -- onglets (sans JS : tous les panneaux visibles)
function onglets(o) {
  const liste = o.firstElementChild; // la liste des onglets, puis un panneau par onglet
  const panneaux = [...o.children].filter((x) => x !== liste), tabs = liste ? $$(liste, 'button').slice(0, panneaux.length) : [];
  if (!tabs.length) return;
  o.classList.add('gdb-onglets--actif');
  liste.setAttribute('role', 'tablist');
  tabs.forEach((b, i) => {
    const p = panneaux[i];
    b.id = b.id || 'gdb-onglet-' + ++numero;
    p.id = p.id || 'gdb-panneau-' + ++numero;
    poser(b, { role: 'tab', 'aria-controls': p.id });
    poser(p, { role: 'tabpanel', 'aria-labelledby': b.id, tabindex: 0 });
  });
  const choisir = (i, focus) => {
    tabs.forEach((b, k) => { poser(b, { 'aria-selected': k === i, tabindex: k === i ? 0 : -1 }); panneaux[k].hidden = k !== i; });
    if (focus) tabs[i].focus();
  };
  choisir(Math.max(0, tabs.findIndex((b) => lire(b, 'aria-selected') === 'true')));
  etats.set(o, { choisir, tabs });
  if (!nouveau('onglets', o)) return;
  sur(liste, 'click', (e) => {
    const d = etats.get(o), i = d.tabs.indexOf(e.target.closest('[role="tab"]'));
    if (i >= 0) d.choisir(i);
  });
  sur(liste, 'keydown', (e) => {
    const d = etats.get(o), n = d.tabs.length, i = d.tabs.indexOf(doc.activeElement);
    const cible = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: n - 1 }[e.key];
    if (i < 0 || cible === undefined) return;
    e.preventDefault();
    d.choisir((cible + n) % n, true);
  });
}

// -- compteur animé : le nombre écrit dans le texte, quand il devient visible
function compteur(el) {
  if (!nouveau('compteur', el) || etat.apercu || reduit() || el.children.length) return;
  // « 2 319 », « 4,9 », « +150 % » : seul le nombre défile
  const texte = el.textContent, m = /\d[\d\s.]*(?:,\d+)?/.exec(texte), brut = m && m[0].trimEnd();
  const cible = brut && parseFloat(brut.replace(/[\s.]/g, '').replace(',', '.')), dec = brut ? (brut.split(',')[1] || '').length : 0;
  if (!(cible > 0)) return;
  const ecrire = (v) => { el.textContent = texte.slice(0, m.index) + v.toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + texte.slice(m.index + brut.length); };
  ecrire(0);
  const io = new IntersectionObserver((entrees) => {
    if (!entrees.some((x) => x.isIntersecting)) return;
    io.disconnect();
    const debut = performance.now(), pas = (t) => {
      const x = Math.min(1, (t - debut) / 1600);
      if (x < 1) { ecrire(cible * (1 - Math.pow(1 - x, 3))); requestAnimationFrame(pas); } else el.textContent = texte;
    };
    requestAnimationFrame(pas);
  }, { threshold: 0.4 });
  io.observe(el);
}

// -- bouton copier (valeur vide : texte du [data-gdb-code] du bloc)
function copier(b) {
  if (!nouveau('copier', b)) return;
  const lib = b.querySelector('.gdb-copier-libelle') || b, initial = lib.textContent;
  let minuterie = null;
  lib.setAttribute('aria-live', 'polite');
  sur(b, 'click', () => {
    const source = (b.closest('[data-gdb]') || b.parentNode).querySelector('[data-gdb-code]');
    const valeur = (lire(b, 'data-gdb-copier') || (source ? source.textContent : '')).trim();
    if (!valeur) return;
    const fin = (ok) => {
      lib.textContent = ok ? 'Copié !' : 'Copiez le code à la main';
      b.classList.toggle('gdb-copier--fait', ok);
      if (!ok && source) getSelection().selectAllChildren(source);
      clearTimeout(minuterie);
      minuterie = setTimeout(() => { lib.textContent = initial; b.classList.remove('gdb-copier--fait'); }, 2400);
    };
    Promise.resolve().then(() => navigator.clipboard.writeText(valeur)).then(() => fin(true), () => fin(false));
  });
}

// -- galerie : visionneuse plein écran (<dialog> : focus gardé, Échap)
function grandeImage(a) { // plus grande variante de la vignette
  const img = a.querySelector('img');
  let url = img && lire(img, 'src'), w = 0;
  (img && lire(img, 'srcset') || '').split(',').forEach((c) => {
    const [u, l] = c.trim().split(/\s+/);
    if (parseInt(l, 10) > w) { w = parseInt(l, 10); url = u; }
  });
  return url || lire(a, 'href');
}
function creerVisionneuse() {
  const r = creer('dialog', 'gdb-visionneuse', '<figure class="gdb-visionneuse-figure"><img class="gdb-visionneuse-img" alt=""><figcaption class="gdb-visionneuse-legende" aria-live="polite"></figcaption></figure>'
    + bouton('gdb-visionneuse-prec', 'Photo précédente') + bouton('gdb-visionneuse-suiv', 'Photo suivante')
    + bouton('gdb-visionneuse-fermer', 'Fermer'));
  const [fig, prec, suiv, fermer] = r.children;
  r.setAttribute('aria-label', 'Photo en grand');
  doc.body.append(r);
  vis = { r, img: fig.firstChild, leg: fig.lastChild, prec, suiv, fermer, liens: [], i: 0 };
  sur(prec, 'click', () => montrer(vis.i - 1));
  sur(suiv, 'click', () => montrer(vis.i + 1));
  sur(r, 'click', (e) => { if (e.target === r || e.target === fig || e.target === fermer) r.close(); });
  sur(r, 'keydown', (e) => { const k = { ArrowLeft: -1, ArrowRight: 1 }[e.key]; if (k) montrer(vis.i + k); });
  sur(r, 'close', () => {
    vis.img.removeAttribute('src');
    html.classList.remove('gdb-sans-defilement');
    if (vis.retour.isConnected) vis.retour.focus();
  });
}
function montrer(i) {
  const n = vis.liens.length, a = vis.liens[vis.i = (i + n) % n], fig = a.closest('figure'), vignette = a.querySelector('img');
  vis.img.src = grandeImage(a);
  vis.leg.textContent = (fig && fig.querySelector('figcaption') || {}).textContent || (vignette && lire(vignette, 'alt')) || '';
  vis.leg.hidden = !vis.leg.textContent;
  vis.prec.hidden = vis.suiv.hidden = n < 2;
}
function galerie(g) {
  if (!nouveau('galerie', g)) return;
  sur(g, 'click', (e) => {
    // navigateur ancien, aperçu, clic spécial : le lien ouvre la photo
    if (etat.apercu || !window.HTMLDialogElement || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href]'), liens = $$(g, 'a[href]').filter((x) => x.querySelector('img')), i = liens.indexOf(a);
    if (i < 0) return;
    e.preventDefault();
    if (!vis || !vis.r.isConnected) creerVisionneuse();
    Object.assign(vis, { liens, retour: a });
    montrer(i);
    vis.r.showModal();
    html.classList.add('gdb-sans-defilement');
    vis.fermer.focus();
  });
}

// -- vidéo YouTube chargée au clic (identifiant ou lien)
function youtube(f) {
  if (!nouveau('youtube', f)) return;
  sur(f, 'click', () => {
    const v = (lire(f, 'data-gdb-youtube') || '').trim(), vignette = f.querySelector('img');
    const m = /^[\w-]{11}$/.test(v) ? [0, v] : /(?:youtu\.be\/|v=|\/(?:embed|shorts|live)\/)([\w-]{11})/.exec(v);
    if (etat.apercu || !m || f.classList.contains('gdb-youtube--lance')) return;
    const ifr = Object.assign(doc.createElement('iframe'), { className: 'gdb-video-iframe', allowFullscreen: true,
      src: 'https://www.youtube-nocookie.com/embed/' + m[1] + '?autoplay=1&rel=0', allow: 'autoplay; encrypted-media; picture-in-picture',
      title: (vignette && lire(vignette, 'alt')) || 'Vidéo YouTube' });
    f.classList.add('gdb-youtube--lance');
    f.textContent = '';
    f.append(ifr);
    ifr.focus();
  });
}

// -- accordéon : une seule réponse ouverte
function accordeon(a) {
  if (nouveau('accordeon', a)) sur(a, 'toggle', (e) => {
    const d = e.target;
    if (d.open && a.hasAttribute('data-gdb-accordeon-unique')) $$(a, 'details[open]').forEach((x) => { if (x !== d && x.parentNode === d.parentNode) x.open = false; });
  }, true);
}

// -- bandeau fermable, mémorisé pour la visite
const cle = (b) => 'gdb-ferme:' + (lire(b, 'data-gdb-fermable') || b.textContent.replace(/\s+/g, ' ').trim()).slice(0, 160);
function fermable(b) {
  let ferme = false;
  try { ferme = sessionStorage.getItem(cle(b)) === '1'; } catch (e) { /* stockage bloqué */ }
  b.classList.toggle('gdb-ferme', ferme && !etat.apercu);
  if (nouveau('fermable', b)) sur(b, 'click', (e) => {
    if (!e.target.closest('[data-gdb-fermer]') || etat.apercu || !b.hasAttribute('data-gdb-fermable')) return;
    try { sessionStorage.setItem(cle(b), '1'); } catch (er) { /* idem */ }
    b.classList.add('gdb-ferme');
  });
}

// -- minuterie commune (chaque seconde)
function majDates() {
  const t = Date.now();
  (rebours = branches(rebours)).forEach((e) => majRebours(e, t));
  (periodes = branches(periodes)).forEach((e) => majPeriode(e, t));
  return t;
}
function tiquer() {
  const t = majDates();
  if (etat.apercu || doc.hidden || reduit()) return;
  (carrousels = branches(carrousels)).forEach((c) => {
    const s = parseFloat(lire(c, 'data-gdb-auto')), d = etats.get(c);
    if (s > 0 && !d.pause && t - d.dernier >= Math.max(2, s) * 1000) aller(c, d.i + 1);
  });
}

// -- point d'entrée, à rappeler après chaque mise à jour de la page ;
// en aperçu (apercu: true ou <html data-gdb-apercu>), rien n'est masqué, animé ni lancé
const COMPORTEMENTS = {
  '[data-gdb-du],[data-gdb-au]': (e) => periodes.includes(e) || periodes.push(e),
  '[data-gdb-compte-a-rebours]': (e) => rebours.includes(e) || rebours.push(e),
  '[data-gdb-carrousel]': carrousel, '[data-gdb-onglets]': onglets, '[data-gdb-compteur]': compteur, '[data-gdb-copier]': copier,
  '[data-gdb-galerie]': galerie, '[data-gdb-youtube]': youtube, '[data-gdb-accordeon-unique]': accordeon, '[data-gdb-fermable]': fermable,
};
function init(racine, options) {
  racine = racine && racine.querySelectorAll ? racine : doc;
  etat.apercu = options && 'apercu' in options ? !!options.apercu : html.hasAttribute('data-gdb-apercu');
  for (const sel in COMPORTEMENTS) (racine.matches && racine.matches(sel) ? [racine] : []).concat($$(racine, sel)).forEach(COMPORTEMENTS[sel]);
  majDates();
  if (!tic && (periodes.length || rebours.length || carrousels.length)) tic = setInterval(tiquer, 1000);
  return racine;
}

window.GD41Blocs = { init };
if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', () => init(doc));
else init(doc);
})();
