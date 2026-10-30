/* GAMEDOOR·41 — fenêtre promotionnelle (pop-up) affichée à l'arrivée sur le site.
 *
 * Promotion en cours : HORROR QUIZ, la nouvelle émission du quiz Buzz Your Brain (30/10/2026).
 *
 * - s'ouvre quelques secondes après l'arrivée, sur toutes les pages sauf l'article de la promo et les pages légales ;
 * - se ferme avec la croix, un clic à côté ou la touche Échap ; elle ne revient alors pas avant PAUSE_JOURS ;
 * - mesure dans GA4 : événement « promo_popup » (action = affichee, reserver, decouvrir, fermee).
 *
 * Changer de promotion : modifier l'objet PROMO (nouvel id = la pop-up se remontre à tout le monde).
 * Arrêter la promotion : mettre `actif: false`, ou une date de fin dans `fin` (AAAA-MM-JJ, exclue).
 * Après toute modification de ce fichier : node scripts/perf-assets.mjs
 */
(function () {
  'use strict';

  var PROMO = {
    actif: true,
    id: 'horror-quiz-2026-10',
    fin: null,
    article: '/post/horror-quiz-caen/',
    reserver: 'https://braincaen.4escape.io/booking',
    image: '/img/promo/horror-quiz',
    alt: 'HORROR QUIZ, la nouvelle émission du quiz Buzz Your Brain : jumpscares, méchants cultes et plateau rouge sang. 4 à 16 joueurs, 60 min, dès 15 € par personne, à Mondeville près de Caen.',
    kicker: 'Nouvelle émission · Buzz Your Brain',
    texte: 'Le jeu télé qui fait vraiment peur : jumpscares, méchants cultes et plateau rouge sang. Oserez-vous buzzer ?',
    bouton: 'Réserver le HORROR QUIZ',
    lien: 'Découvrir l’émission'
  };
  var DELAI_MS = 3500;
  var PAUSE_JOURS = 3;
  var PAGES_SANS_POPUP = /^\/(mentions-legales|politique-confidentialite|politique-cookies|termes-conditions|signatures)(\/|$)/;

  var cle = 'gd-promo-' + PROMO.id;

  function stockageLire() {
    try { return window.localStorage.getItem(cle); } catch (e) { return null; }
  }
  function stockageEcrire(valeur) {
    try { window.localStorage.setItem(cle, valeur); } catch (e) { /* navigation privée : tant pis */ }
  }
  function mesurer(action) {
    try { if (typeof window.gtag === 'function') window.gtag('event', 'promo_popup', { promo: PROMO.id, action: action }); } catch (e) { /* GA4 absent */ }
  }

  function doitSafficher() {
    if (!PROMO.actif) return false;
    if (PROMO.fin && new Date() >= new Date(PROMO.fin + 'T00:00:00')) return false;
    var chemin = window.location.pathname;
    if (chemin.indexOf(PROMO.article) === 0 || PAGES_SANS_POPUP.test(chemin)) return false;
    if (document.querySelector('[aria-modal="true"]')) return false;
    var dernier = parseInt(stockageLire() || '0', 10);
    return !(dernier && Date.now() - dernier < PAUSE_JOURS * 86400000);
  }

  var CSS = [
    '.gdp-fond{position:fixed;inset:0;z-index:10050;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(8,0,0,.78);opacity:0;transition:opacity .25s ease;}',
    '.gdp-fond.gdp-ouvert{opacity:1;}',
    '.gdp{position:relative;width:min(760px,100%);max-height:calc(100vh - 32px);overflow:auto;background:#0d0404;color:#F0EBE2;border:1px solid rgba(227,16,28,.55);border-radius:14px;box-shadow:0 0 0 1px rgba(0,0,0,.6),0 24px 80px rgba(0,0,0,.7),0 0 60px rgba(227,16,28,.25);transform:translateY(14px) scale(.98);transition:transform .25s ease;}',
    '.gdp-fond.gdp-ouvert .gdp{transform:none;}',
    '.gdp-image{display:block;line-height:0;}',
    '.gdp-image img{display:block;width:100%;height:auto;aspect-ratio:16/9;border-radius:13px 13px 0 0;}',
    '.gdp-corps{padding:18px 22px 22px;}',
    '.gdp-kicker{margin:0 0 6px;font-family:var(--gd-font-display,"Barlow Condensed"),sans-serif;font-weight:700;font-size:15px;letter-spacing:.18em;text-transform:uppercase;color:#ff6b6b;}',
    '.gdp-texte{margin:0 0 16px;font-size:16px;line-height:1.5;color:#F0EBE2;}',
    '.gdp-actions{display:flex;flex-wrap:wrap;align-items:center;gap:12px 20px;}',
    '.gdp-btn{display:inline-block;padding:13px 24px 12px;background:#e3101c;color:#fff !important;border-radius:8px;font-family:var(--gd-font-display,"Barlow Condensed"),sans-serif;font-weight:800;font-size:19px;letter-spacing:.06em;text-transform:uppercase;text-decoration:none;box-shadow:0 0 24px rgba(227,16,28,.45);}',
    '.gdp-btn:hover,.gdp-btn:focus-visible{background:#ff2330;}',
    '.gdp-lien{color:#F0EBE2 !important;font-weight:600;text-decoration:underline;text-underline-offset:3px;}',
    '.gdp-fermer{position:absolute;top:10px;right:10px;z-index:1;width:42px;height:42px;display:flex;align-items:center;justify-content:center;border:1px solid rgba(240,235,226,.35);border-radius:50%;background:rgba(0,0,0,.6);color:#F0EBE2;font-size:26px;line-height:1;cursor:pointer;}',
    '.gdp-fermer:hover,.gdp-fermer:focus-visible{background:#e3101c;border-color:#e3101c;}',
    '.gdp a:focus-visible,.gdp button:focus-visible{outline:3px solid #F0EBE2;outline-offset:3px;}',
    '.gdp-cache{position:absolute !important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;}',
    '@media (max-width:520px){.gdp-corps{padding:14px 16px 18px;}.gdp-texte{font-size:15px;margin-bottom:14px;}.gdp-actions{flex-direction:column;align-items:stretch;text-align:center;}.gdp-btn{font-size:18px;}}',
    '@media (prefers-reduced-motion:reduce){.gdp-fond,.gdp{transition:none;}}'
  ].join('\n');

  function sources(format) {
    return [480, 768, 1024, 1600].map(function (w) { return PROMO.image + '-' + w + 'w.' + format + ' ' + w + 'w'; }).join(', ');
  }

  function ouvrir() {
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    var fond = document.createElement('div');
    fond.className = 'gdp-fond';
    fond.innerHTML =
      '<div class="gdp" role="dialog" aria-modal="true" aria-labelledby="gdp-titre">' +
        '<button type="button" class="gdp-fermer" aria-label="Fermer">×</button>' +
        '<h2 id="gdp-titre" class="gdp-cache">HORROR QUIZ, la nouvelle émission</h2>' +
        '<a class="gdp-image" href="' + PROMO.article + '" data-action="decouvrir">' +
          '<picture>' +
            '<source type="image/avif" srcset="' + sources('avif') + '" sizes="(max-width:800px) 92vw, 760px">' +
            '<source type="image/webp" srcset="' + sources('webp') + '" sizes="(max-width:800px) 92vw, 760px">' +
            '<img src="' + PROMO.image + '-768w.jpg" srcset="' + sources('jpg') + '" sizes="(max-width:800px) 92vw, 760px" width="1024" height="576" alt="' + PROMO.alt + '" decoding="async">' +
          '</picture>' +
        '</a>' +
        '<div class="gdp-corps">' +
          '<p class="gdp-kicker">' + PROMO.kicker + '</p>' +
          '<p class="gdp-texte">' + PROMO.texte + '</p>' +
          '<div class="gdp-actions">' +
            '<a class="gdp-btn" href="' + PROMO.reserver + '" target="_blank" rel="noopener" data-action="reserver">' + PROMO.bouton + '</a>' +
            '<a class="gdp-lien" href="' + PROMO.article + '" data-action="decouvrir">' + PROMO.lien + '</a>' +
          '</div>' +
        '</div>' +
      '</div>';

    var boite = fond.querySelector('.gdp');
    var fermerBtn = fond.querySelector('.gdp-fermer');
    var focusAvant = document.activeElement;
    var debordementAvant = document.documentElement.style.overflow;

    function fermer(action) {
      stockageEcrire(String(Date.now()));
      if (action) mesurer(action);
      document.removeEventListener('keydown', clavier, true);
      document.documentElement.style.overflow = debordementAvant;
      fond.classList.remove('gdp-ouvert');
      window.setTimeout(function () { if (fond.parentNode) fond.parentNode.removeChild(fond); }, 260);
      if (focusAvant && typeof focusAvant.focus === 'function') { try { focusAvant.focus(); } catch (e) { /* rien */ } }
    }

    function clavier(e) {
      if (e.key === 'Escape') { e.preventDefault(); fermer('fermee'); return; }
      if (e.key !== 'Tab') return;
      var f = boite.querySelectorAll('a[href], button');
      var premier = f[0], dernier = f[f.length - 1];
      if (e.shiftKey && document.activeElement === premier) { e.preventDefault(); dernier.focus(); }
      else if (!e.shiftKey && document.activeElement === dernier) { e.preventDefault(); premier.focus(); }
    }

    fermerBtn.addEventListener('click', function () { fermer('fermee'); });
    fond.addEventListener('click', function (e) { if (e.target === fond) fermer('fermee'); });
    Array.prototype.forEach.call(fond.querySelectorAll('[data-action]'), function (a) {
      a.addEventListener('click', function () { fermer(a.getAttribute('data-action')); });
    });
    document.addEventListener('keydown', clavier, true);

    document.body.appendChild(fond);
    document.documentElement.style.overflow = 'hidden';
    window.requestAnimationFrame(function () { fond.classList.add('gdp-ouvert'); });
    fermerBtn.focus({ preventScroll: true });
    stockageEcrire(String(Date.now()));
    mesurer('affichee');
  }

  function programmer() {
    if (!doitSafficher()) return;
    window.setTimeout(function () { if (doitSafficher()) ouvrir(); }, DELAI_MS);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', programmer);
  else programmer();
})();
