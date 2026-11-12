/*
 * Créneaux du jour (« Dernières places aujourd'hui »), demande d'Allan du 12/11/2026.
 *
 * Les jours de forte affluence (samedi, dimanche, fériés, ponts, vacances scolaires), le haut de l'accueil, des pages des salles et du
 * quiz montre les horaires encore libres AUJOURD'HUI, avec « Plus que 2 sessions aujourd'hui ». Un horaire touché ouvre la page de
 * réservation directement sur la dernière étape (salle et heure déjà choisies : joueurs, options, coordonnées, paiement).
 *
 * Tout vient du Hub (Paramétrage › Créneaux du jour) : jours, textes, emplacements, horaires réellement vendables à cet instant.
 * Le bloc reste caché tant que le Hub ne répond pas « actif » avec au moins un horaire : jamais « 0 session », jamais un horaire inventé.
 *
 * Dans une page : <div data-gd41-dm data-activite="psy" data-page="salles" hidden></div>
 *   data-activite : psy, gav, 80s, quiz (une salle), escape (les salles d'escape), vide (tout) ; data-page : accueil ou salles.
 * Aperçu (même un jour ordinaire, même décoché dans le Hub) : ajouter ?dm=apercu à l'adresse (et &dm_jour=AAAA-MM-JJ).
 */
(function () {
  'use strict';
  var blocs = document.querySelectorAll('[data-gd41-dm]');
  if (!blocs.length || !window.fetch) return;
  var API = 'https://synergia-hub.netlify.app/api/tunnel/aujourdhui';
  var params = new URLSearchParams(window.location.search);
  var apercu = params.get('dm') === 'apercu';
  var jourApercu = /^\d{4}-\d{2}-\d{2}$/.test(params.get('dm_jour') || '') ? params.get('dm_jour') : '';
  var url = API + (apercu ? '?apercu=1' + (jourApercu ? '&jour=' + jourApercu : '') : '');

  var css = '' +
    '.gd41-dm{box-sizing:border-box;width:100%;min-width:0;margin:18px 0 8px;max-width:760px;border:2px solid #E07020;border-radius:12px;padding:14px 14px 12px;background:linear-gradient(180deg,rgba(224,112,32,.24) 0%,rgba(12,8,0,.94) 60%);box-shadow:0 0 34px rgba(224,112,32,.28);text-align:left;color:#F0EBE2;font-family:var(--font-body,"DM Sans",sans-serif);text-shadow:none}' +
    '.gd41-dm[hidden]{display:none!important}' +
    '.gd41-dm .gd41-dm-apercu{margin:0 0 6px;max-width:none;font-size:.72rem;color:#FFD740}' +
    '.gd41-dm .gd41-dm-tete{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 12px}' +
    '.gd41-dm .gd41-dm-kicker{margin:0;max-width:none;display:flex;align-items:center;gap:6px;font-size:.72rem;letter-spacing:.18em;text-transform:uppercase;color:#F5A05A}' +
    '.gd41-dm .gd41-dm-kicker svg{width:15px;height:15px;flex:none}' +
    '.gd41-dm .gd41-dm-titre{margin:3px 0 0;font-family:"Barlow Condensed","Oswald",sans-serif;font-weight:700;font-size:clamp(1.3rem,4.8vw,1.75rem);line-height:1.05;letter-spacing:.02em;text-transform:uppercase;color:#F0EBE2;text-shadow:none}' +
    '.gd41-dm .gd41-dm-badge{display:inline-block;border-radius:999px;padding:6px 13px;font-weight:700;font-size:.92rem;line-height:1.2;background:#F0EBE2;color:#0C0800}' +
    '.gd41-dm .gd41-dm-badge.peu{background:#E07020;color:#0C0800}' +
    '.gd41-dm .gd41-dm-badge.dernier{background:#C62828;color:#fff;animation:gd41-dm-pouls 1.6s ease-in-out infinite}' +
    '.gd41-dm .gd41-dm-sous{margin:8px 0 10px;max-width:none;font-size:.86rem;line-height:1.45;color:#C8C2B8}' +
    '.gd41-dm .gd41-dm-salles{display:grid;grid-template-columns:minmax(0,1fr);gap:8px}' +
    '@media (min-width:760px){.gd41-dm .gd41-dm-salles.multi{grid-template-columns:repeat(2,minmax(0,1fr))}}' +
    '.gd41-dm .gd41-dm-salle{min-width:0;background:rgba(12,8,0,.78);border:1px solid #2E2820;border-radius:10px;padding:10px}' +
    '.gd41-dm .gd41-dm-salle-tete{display:flex;align-items:center;gap:8px;margin-bottom:8px}' +
    '.gd41-dm .gd41-dm-pastille{width:12px;height:12px;border-radius:50%;flex:none}' +
    '.gd41-dm .gd41-dm-nom{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:"Barlow Condensed","Oswald",sans-serif;font-size:1.05rem;text-transform:uppercase;letter-spacing:.03em}' +
    '.gd41-dm .gd41-dm-reste{white-space:nowrap;font-size:.76rem;font-weight:700;color:#F5A05A}' +
    '.gd41-dm .gd41-dm-reste.libre{color:#C8C2B8}' +
    '.gd41-dm .gd41-dm-heures{display:flex;flex-wrap:wrap;gap:8px}' +
    '.gd41-dm a.gd41-dm-h{display:inline-flex;align-items:center;gap:6px;min-height:46px;padding:0 14px;border-radius:8px;background:#F0EBE2;color:#0C0800;font-family:"Barlow Condensed","Oswald",sans-serif;font-weight:700;font-size:1.2rem;letter-spacing:.02em;text-transform:none;text-decoration:none;transition:background .2s,transform .2s}' +
    '.gd41-dm a.gd41-dm-h:hover,.gd41-dm a.gd41-dm-h:focus-visible{background:#E07020;color:#0C0800;transform:translateY(-1px);outline:none}' +
    '.gd41-dm a.gd41-dm-h svg{width:15px;height:15px;flex:none}' +
    '@keyframes gd41-dm-pouls{0%,100%{box-shadow:0 0 0 0 rgba(198,40,40,.65)}50%{box-shadow:0 0 0 8px rgba(198,40,40,0)}}' +
    '@media (prefers-reduced-motion:reduce){.gd41-dm .gd41-dm-badge.dernier{animation:none}.gd41-dm a.gd41-dm-h{transition:none}}' +
    '@media (max-width:480px){.gd41-dm{padding:12px 10px 10px}.gd41-dm a.gd41-dm-h{padding:0 11px;font-size:1.1rem}}';
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var FLAMME = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>';
  var HORLOGE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>';

  function echapper(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  // Même règle que le Hub : 1 → « Plus qu'une… », jusqu'au seuil → « Plus que {n}… », au-delà → « {n} … encore libres ».
  function reste(n, t) {
    var modele = n === 1 ? t.un : n <= t.seuil ? t.peu : t.libres;
    return String(modele || '').replace(/\{n\}/g, n);
  }
  function urgence(n, seuil) { return n === 1 ? 'dernier' : n <= seuil ? 'peu' : 'libre'; }
  function heureAffichee(h) { return String(h || '').replace(':', 'h'); }
  function lien(s, d, h) {
    var q = 'activite=' + encodeURIComponent(s.cle) + '&jour=' + encodeURIComponent(d.jour) + '&heure=' + encodeURIComponent(h.heure);
    if (apercu) q += '&dm=apercu&dm_jour=' + encodeURIComponent(d.jour);
    return '/reserver/?' + q + '#reservation';
  }

  function rendre(bloc, d) {
    var page = bloc.getAttribute('data-page') || 'accueil';
    var activite = bloc.getAttribute('data-activite') || '';
    if (!d || d.actif !== true || !d.emplacements || d.emplacements[page] === false || !Array.isArray(d.salles)) { bloc.hidden = true; return; }
    var salles = d.salles.filter(function (s) { return s.nb > 0 && (!activite || s.cle === activite || s.famille === activite); });
    var total = salles.reduce(function (a, s) { return a + s.nb; }, 0);
    if (!total) { bloc.hidden = true; return; }
    var t = d.textes_reste || { un: '', peu: '', libres: '', seuil: 3 };
    var une = salles.length === 1;
    var html = '';
    if (d.apercu) html += '<p class="gd41-dm-apercu">Aperçu : ' + (d.affiche ? 'ce bloc est visible des clients aujourd’hui.' : 'pas encore visible des clients.') + '</p>';
    html += '<div class="gd41-dm-tete"><div><p class="gd41-dm-kicker">' + FLAMME + '<span>' + echapper(d.etiquette) + '</span></p>' +
      '<p class="gd41-dm-titre" role="heading" aria-level="2">' + echapper(d.titre) + '</p></div>' +
      '<span class="gd41-dm-badge ' + urgence(total, t.seuil) + '">' + echapper(reste(total, t)) + '</span></div>' +
      '<p class="gd41-dm-sous">' + echapper(d.sous_titre) + '</p>' +
      '<div class="gd41-dm-salles' + (une ? '' : ' multi') + '">';
    salles.forEach(function (s) {
      html += '<div class="gd41-dm-salle">';
      if (!une || !activite) {
        html += '<div class="gd41-dm-salle-tete"><span class="gd41-dm-pastille" style="background:' + echapper(s.couleur || '#E07020') + '"></span>' +
          '<span class="gd41-dm-nom">' + echapper(s.nom) + '</span>' +
          '<span class="gd41-dm-reste' + (s.urgence === 'libre' ? ' libre' : '') + '">' + echapper(s.texte) + '</span></div>';
      }
      html += '<div class="gd41-dm-heures">';
      (s.horaires || []).forEach(function (h) {
        html += '<a class="gd41-dm-h" href="' + echapper(lien(s, d, h)) + '" data-track="derniere-minute-' + echapper(s.cle) + '" aria-label="Réserver ' + echapper(s.nom) + ' aujourd’hui à ' + echapper(heureAffichee(h.heure)) + '">' + HORLOGE + echapper(heureAffichee(h.heure)) + '</a>';
      });
      html += '</div></div>';
    });
    html += '</div>';
    bloc.className = 'gd41-dm';
    bloc.setAttribute('role', 'region');
    bloc.setAttribute('aria-label', d.titre || 'Dernières places aujourd’hui');
    bloc.innerHTML = html;
    bloc.hidden = false;
  }

  var enCours = false;
  function charger() {
    if (enCours || document.visibilityState === 'hidden') return;
    enCours = true;
    fetch(url, { credentials: 'omit' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { for (var i = 0; i < blocs.length; i++) rendre(blocs[i], d); })
      .catch(function () { /* Hub injoignable : bloc laissé tel quel (caché au départ) */ })
      .then(function () { enCours = false; });
  }
  charger();
  // « En temps réel » : relu toutes les minutes tant que la page est affichée, et au retour sur l'onglet.
  setInterval(charger, 60000);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') charger(); });
})();
