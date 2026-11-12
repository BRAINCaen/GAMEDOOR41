/*
 * Créneaux du jour (« Plus que 2 sessions aujourd'hui »), demande d'Allan du 12/11/2026.
 *
 * Pour jouer sur l'impulsivité du jour : les jours de forte affluence (samedi, dimanche, fériés, ponts, vacances scolaires), un petit
 * bloc en haut de la page d'une salle (sous le titre) quand il reste PEU d'horaires à ce thème AUJOURD'HUI (moins de 3 par défaut),
 * avec ces horaires. Un horaire touché ouvre la page de réservation directement sur la dernière étape (salle et heure déjà choisies).
 * Jamais sur l'accueil.
 *
 * Tout vient du Hub (Paramétrage › Créneaux du jour) : jours, seuil, textes, horaires réellement vendables à cet instant. Le bloc reste
 * caché tant que le Hub ne répond pas « actif » avec au moins un thème concerné : jamais « 0 session », jamais un horaire inventé.
 *
 * Dans une page : <div data-gd41-dm data-activite="psy" data-page="salles" hidden></div>
 *   data-activite : psy, gav, 80s, quiz (une salle) ou escape (les salles d'escape, une ligne par salle).
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
  var POLICE = '"Barlow Condensed","Oswald",sans-serif';

  var css = '' +
    '.gd41-dm{box-sizing:border-box;display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;width:fit-content;max-width:100%;margin:14px 0 2px;padding:8px 10px 8px 12px;border:1px solid rgba(224,112,32,.7);border-left:4px solid #E07020;border-radius:10px;background:rgba(12,8,0,.86);box-shadow:0 0 18px rgba(224,112,32,.25);color:#F0EBE2;text-align:left;font-family:"DM Sans",sans-serif;text-shadow:none}' +
    '.gd41-dm[hidden]{display:none!important}' +
    '.gd41-dm.multi{flex-direction:column;align-items:stretch;gap:6px}' +
    '.gd41-dm .gd41-dm-apercu{flex-basis:100%;margin:0;max-width:none;font-size:.7rem;color:#FFD740}' +
    '.gd41-dm .gd41-dm-msg{margin:0;max-width:none;display:inline-flex;align-items:center;gap:6px;font-size:1rem;font-weight:700;line-height:1.2;color:#F0EBE2}' +
    '.gd41-dm.multi .gd41-dm-msg{font-size:.72rem;letter-spacing:.16em;text-transform:uppercase;color:#F5A05A}' +
    '.gd41-dm .gd41-dm-msg svg{width:18px;height:18px;flex:none;color:#E07020}' +
    '.gd41-dm.dernier .gd41-dm-msg svg{color:#FF5A4F;animation:gd41-dm-pouls 1.4s ease-in-out infinite}' +
    '.gd41-dm .gd41-dm-ligne{display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px}' +
    '.gd41-dm .gd41-dm-pastille{width:10px;height:10px;border-radius:50%;flex:none}' +
    '.gd41-dm .gd41-dm-nom{font-family:' + POLICE + ';font-weight:700;font-size:1rem;text-transform:uppercase;letter-spacing:.03em}' +
    '.gd41-dm .gd41-dm-reste{font-size:.78rem;font-weight:700;color:#F5A05A}' +
    '.gd41-dm .gd41-dm-reste.dernier{color:#FF5A4F}' +
    '.gd41-dm .gd41-dm-heures{display:flex;flex-wrap:wrap;gap:6px}' +
    '.gd41-dm a.gd41-dm-h{display:inline-flex;align-items:center;min-height:38px;padding:0 12px;border-radius:7px;background:#E07020;color:#0C0800;font-family:' + POLICE + ';font-weight:700;font-size:1.1rem;letter-spacing:.02em;text-transform:none;text-decoration:none;transition:background .2s}' +
    '.gd41-dm a.gd41-dm-h:hover,.gd41-dm a.gd41-dm-h:focus-visible{background:#F0EBE2;color:#0C0800;outline:none}' +
    '@keyframes gd41-dm-pouls{0%,100%{transform:scale(1)}50%{transform:scale(1.25)}}' +
    '@media (prefers-reduced-motion:reduce){.gd41-dm.dernier .gd41-dm-msg svg{animation:none}.gd41-dm a.gd41-dm-h{transition:none}}';
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var FLAMME = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>';

  function echapper(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function heureAffichee(h) { return String(h || '').replace(':', 'h'); }
  function lien(s, d, h) {
    var q = 'activite=' + encodeURIComponent(s.cle) + '&jour=' + encodeURIComponent(d.jour) + '&heure=' + encodeURIComponent(h.heure);
    if (apercu) q += '&dm=apercu&dm_jour=' + encodeURIComponent(d.jour);
    return '/reserver/?' + q + '#reservation';
  }
  function boutons(s, d) {
    return '<span class="gd41-dm-heures">' + (s.horaires || []).map(function (h) {
      return '<a class="gd41-dm-h" href="' + echapper(lien(s, d, h)) + '" data-track="derniere-minute-' + echapper(s.cle) + '" aria-label="Réserver ' + echapper(s.nom) + ' aujourd’hui à ' + echapper(heureAffichee(h.heure)) + '">' + echapper(heureAffichee(h.heure)) + '</a>';
    }).join('') + '</span>';
  }

  function rendre(bloc, d) {
    var page = bloc.getAttribute('data-page') || 'salles';
    var activite = bloc.getAttribute('data-activite') || '';
    if (!d || d.actif !== true || !d.emplacements || d.emplacements[page] !== true || !Array.isArray(d.salles)) { bloc.hidden = true; return; }
    // Le Hub n'envoie que les thèmes à qui il reste peu d'horaires (seuil) ; la page garde le sien (ou les salles d'escape).
    var salles = d.salles.filter(function (s) { return s.nb > 0 && (s.cle === activite || (activite === 'escape' && s.famille === 'escape')); });
    if (!salles.length) { bloc.hidden = true; bloc.innerHTML = ''; return; }
    var html = d.apercu ? '<p class="gd41-dm-apercu">Aperçu : ' + (d.affiche ? 'visible des clients aujourd’hui.' : 'pas encore visible des clients.') + '</p>' : '';
    var multi = activite === 'escape';
    var dernier = salles.every(function (s) { return s.nb === 1; });
    if (!multi) {
      var s = salles[0];
      html += '<p class="gd41-dm-msg">' + FLAMME + '<span>' + echapper(s.texte_page) + '</span></p>' + boutons(s, d);
    } else {
      html += '<p class="gd41-dm-msg">' + FLAMME + '<span>' + echapper(d.titre) + '</span></p>';
      salles.forEach(function (s) {
        html += '<div class="gd41-dm-ligne"><span class="gd41-dm-pastille" style="background:' + echapper(s.couleur || '#E07020') + '"></span>' +
          '<span class="gd41-dm-nom">' + echapper(s.nom) + '</span><span class="gd41-dm-reste' + (s.nb === 1 ? ' dernier' : '') + '">' + echapper(s.texte) + '</span>' + boutons(s, d) + '</div>';
      });
    }
    bloc.className = 'gd41-dm' + (multi ? ' multi' : '') + (dernier ? ' dernier' : '');
    bloc.setAttribute('role', 'region');
    bloc.setAttribute('aria-label', multi ? (d.titre || 'Dernières places aujourd’hui') : salles[0].texte_page);
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
