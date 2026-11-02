/* GAMEDOOR·41 — mesure GA4 des clics « Réserver » sur les pages qui ne chargent pas /js/main.js.
 *
 * /js/main.js envoie l'événement GA4 « begin_checkout » à chaque clic sur un lien de réservation
 * (braincaen.4escape.io/booking). Mais main.js n'est pas chargé sur l'accueil, le magazine, les articles
 * /post/…, /avis/ et /restauration-seminaire/ : sans ce fichier, les clics « Réserver » de ces pages
 * n'étaient pas comptés dans GA4.
 *
 * Ce script fait exactement la même mesure que main.js : mêmes liens, même événement, mêmes paramètres
 * (source = data-track du lien, sinon « booking_link » ; page_path = chemin de la page), envoyée par gtag
 * s'il est présent. Si la page charge déjà /js/main.js, il ne fait rien : pas de double comptage.
 *
 * Le poser sur une nouvelle page sans main.js : node scripts/ajouter-suivi-reservation.mjs
 * Après toute modification de ce fichier : node scripts/perf-assets.mjs
 */
(function () {
  'use strict';

  // Chargé deux fois par erreur sur la même page : un seul branchement.
  if (window.gdSuiviReservation) return;
  window.gdSuiviReservation = true;

  // La page charge-t-elle déjà /js/main.js ? Alors c'est lui qui mesure.
  function mainJsPresent() {
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
      if (/\/js\/main\.js(?:[?#]|$)/.test(scripts[i].src || '')) return true;
    }
    return false;
  }

  // Identique à trackEvent() de main.js.
  function trackEvent(eventName, params) {
    if (typeof gtag === 'function') {
      gtag('event', eventName, params);
    }
  }

  // Identique au suivi « booking link clicks » de main.js.
  function brancher() {
    if (mainJsPresent()) return;
    var liens = document.querySelectorAll('a[href*="4escape.io/booking"]');
    Array.prototype.forEach.call(liens, function (el) {
      el.addEventListener('click', function () {
        trackEvent('begin_checkout', {
          source: el.getAttribute('data-track') || 'booking_link',
          page_path: window.location.pathname
        });
      });
    });
  }

  // Comme main.js, on attend que la page soit construite (chargé en defer, elle l'est déjà).
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', brancher);
  } else {
    brancher();
  }
})();
