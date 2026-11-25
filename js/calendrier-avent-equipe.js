/* Les 24 portes de GAMEDOOR·41 : écran de l'équipe (participants, gagnants, lots). */
(function () {
  'use strict';
  var CLE = 'gd41_avent_2026_code';
  var JOURS_SEMAINE = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  var UNIVERS = { gav: 'Garde à Vue', psy: 'Psychiatric', '80s': 'Back to the 80’s', quiz: 'Quiz Buzz Your Brain', final: 'La dernière porte' };
  var code = '';
  try { code = sessionStorage.getItem(CLE) || ''; } catch (e) { /* rien */ }
  var $ = function (id) { return document.getElementById(id); };

  function el(balise, attrs, enfants) {
    var n = document.createElement(balise);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else if (k.indexOf('on') === 0) n.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== false && attrs[k] != null) n.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
    });
    (enfants || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  function api(methode, chemin, donnees) {
    var entetes = { 'x-avent-code': code };
    /* sur un aperçu d'essai seulement : suit le jour simulé choisi sur la page du calendrier (le vrai site l'ignore) */
    try { var essai = JSON.parse(localStorage.getItem('gd41_avent_2026') || '{}'); if (essai && essai.jourSimule != null) entetes['x-avent-jour'] = String(essai.jourSimule); } catch (e) { /* rien */ }
    if (donnees) entetes['content-type'] = 'application/json';
    return fetch('/api/avent/equipe/' + chemin, { method: methode, headers: entetes, body: donnees ? JSON.stringify(donnees) : undefined, cache: 'no-store' })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (c) { return { statut: r.status, corps: c }; }); })
      .catch(function () { return { statut: 0, corps: { message: 'Connexion impossible.' } }; });
  }
  function dateTexte(j) { return JOURS_SEMAINE[new Date(2026, 11, j).getDay()] + ' ' + (j === 1 ? '1er' : j) + ' décembre'; }

  function entrer() {
    $('entrer').disabled = true;
    api('GET', 'bilan').then(function (r) {
      $('entrer').disabled = false;
      if (r.statut !== 200) {
        $('acces').hidden = false; $('ecran').hidden = true;
        if (code) { $('acces-erreur').textContent = r.statut === 401 ? 'Code incorrect.' : (r.corps.message || 'Le serveur ne répond pas.'); $('acces-erreur').hidden = false; }
        return;
      }
      try { sessionStorage.setItem(CLE, code); } catch (e) { /* rien */ }
      $('acces').hidden = true; $('ecran').hidden = false;
      dessiner(r.corps);
    });
  }
  $('entrer').addEventListener('click', function () { code = $('code').value.trim(); entrer(); });
  $('code').addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { code = $('code').value.trim(); entrer(); } });
  $('actualiser').addEventListener('click', entrer);
  $('export').addEventListener('click', function (ev) {
    ev.preventDefault();
    fetch('/api/avent/equipe/export', { headers: { 'x-avent-code': code }, cache: 'no-store' }).then(function (r) { return r.blob(); }).then(function (b) {
      var a = el('a', { href: URL.createObjectURL(b), download: 'avent-2026-nouvelles.csv' });
      document.body.appendChild(a); a.click(); a.remove();
    });
  });

  function chiffre(n, texte) { return el('div', { class: 'chiffre' }, [el('b', { text: String(n) }), el('span', { text: texte })]); }

  function mailGagnant(t, lot, quoi) {
    var sujet = 'Vous avez gagné au calendrier de l’Avent de GAMEDOOR·41 !';
    var corps = 'Bonjour ' + t.gagnant.prenom + ',\n\nBravo : vous avez été tiré(e) au sort ' + quoi + ' de notre calendrier de l’Avent « Les 24 portes ».\n\nVotre lot : ' + (lot || '[LOT À PRÉCISER]') + '\n\n[Si c’est une place offerte : votre code est XXXX, à saisir à la réservation sur gamedoor41.fr, valable 12 mois.]\n[Si c’est un jeu : il vous attend à l’accueil, 41 bis rue Pasteur à Mondeville, aux heures d’ouverture.]\n\nMerci de nous répondre pour confirmer la bonne réception de ce message.\n\nÀ très vite,\nL’équipe GAMEDOOR·41';
    return 'mailto:' + encodeURIComponent(t.gagnant.email) + '?subject=' + encodeURIComponent(sujet) + '&body=' + encodeURIComponent(corps);
  }

  function blocTirage(cle, t, lotPrevu, quoi) {
    if (!t) return el('p', { class: 'note', text: 'Tirage pas encore fait (le lendemain à midi).' });
    if (!t.gagnant) return el('p', { class: 'note', text: 'Tirage fait : aucun participant.' });
    var lot = t.lot || lotPrevu || '';
    var champ = el('input', { type: 'text', value: lot, placeholder: 'Lot de ce gagnant (affiché sur le site)', maxlength: '200', 'aria-label': 'Lot de ce gagnant' });
    function action(donnees, bouton) {
      bouton.disabled = true;
      api('POST', 'tirage', donnees).then(function (r) { if (r.statut !== 200) { bouton.disabled = false; alerte.textContent = r.corps.message || 'Échec.'; alerte.hidden = false; } else entrer(); });
    }
    var alerte = el('p', { class: 'alerte', hidden: true });
    return el('div', { class: 'gagnant' }, [
      el('p', { style: 'margin:0 0 4px;' }, [el('strong', { text: t.gagnant.prenom }), ' ', el('span', { class: 'etiquette ' + (t.prevenu ? 'ok' : 'attente'), text: t.prevenu ? 'Prévenu' : 'À prévenir' })]),
      el('p', { class: 'mail', style: 'margin:0;' , text: t.gagnant.email }),
      el('p', { class: 'note', text: 'Tiré au sort parmi ' + (t.billets != null && cle === 'grand' ? t.billets + ' tickets (' + t.participants + ' joueurs)' : t.participants + ' participant' + (t.participants > 1 ? 's' : '')) + '. Affiché sur le site : ' + t.gagnant.etiquette }),
      el('div', { class: 'lot' }, [champ, el('button', { type: 'button', text: 'Enregistrer le lot', onclick: function (ev) { action({ cle: cle, action: 'lot', valeur: champ.value }, ev.currentTarget); } })]),
      el('div', { class: 'ligne', style: 'margin-top:10px;' }, [
        el('a', { href: mailGagnant(t, champ.value, quoi), class: 'bouton-mail', role: 'button', style: 'display:inline-flex;align-items:center;min-height:46px;padding:8px 16px;border-radius:9px;background:#ff6b00;color:#000;font-weight:700;text-decoration:none;', text: 'Écrire au gagnant', onclick: function (ev) { ev.currentTarget.href = mailGagnant(t, champ.value, quoi); } }),
        el('button', { type: 'button', text: t.prevenu ? 'Remettre « à prévenir »' : 'Marquer « prévenu »', onclick: function (ev) { action({ cle: cle, action: 'prevenu', valeur: !t.prevenu }, ev.currentTarget); } }),
        el('button', { type: 'button', text: 'Tirer un autre gagnant', onclick: function (ev) { if (window.confirm('Remplacer ' + t.gagnant.prenom + ' par un autre gagnant ? À faire seulement s’il ne répond pas ou ne peut pas recevoir son lot.')) action({ cle: cle, action: 'retirer', raison: 'remplacé par l’équipe' }, ev.currentTarget); } })
      ]),
      t.anciens && t.anciens.length ? el('p', { class: 'note', text: 'Gagnants remplacés : ' + t.anciens.map(function (a) { return a.prenom + ' (' + a.email + ')'; }).join(', ') }) : null,
      alerte
    ]);
  }

  function dessiner(b) {
    $('sous-titre').textContent = (b.essai ? 'APERÇU D’ESSAI (faux joueurs) · ' : '') + (b.cal < 1 ? 'Le jeu commence le 1er décembre.' : b.cal > 24 ? 'Le jeu est terminé.' : 'Aujourd’hui : porte ' + b.cal + '.') + (b.pret ? '' : ' ATTENTION : les 24 défis ne sont pas chargés.');
    var c = $('chiffres'); c.innerHTML = '';
    c.appendChild(chiffre(b.inscrits, 'inscrits'));
    c.appendChild(chiffre(b.actifs, 'ont joué'));
    c.appendChild(chiffre(b.participations, 'participations'));
    c.appendChild(chiffre(b.nouvelles, 'veulent nos nouvelles'));
    c.appendChild(chiffre(b.assidus, 'ont ouvert les 24 portes'));

    var f = $('finaux'); f.innerHTML = '';
    if (b.finaux.grand || b.finaux.assidus) {
      f.appendChild(el('section', { class: 'carte jour gros' }, [el('h2', { text: 'Grand tirage du 24 décembre' }), blocTirage('grand', b.finaux.grand, b.lots.grand, 'au grand tirage')]));
      f.appendChild(el('section', { class: 'carte jour gros' }, [el('h2', { text: 'Tirage des 24 portes ouvertes' }), blocTirage('assidus', b.finaux.assidus, b.lots.assidus, 'au tirage des joueurs qui ont ouvert les 24 portes')]));
    }
    var zone = $('jours'); zone.innerHTML = '';
    var ordre = b.jours.slice().sort(function (x, y) { return y.j - x.j; }).filter(function (x) { return x.j <= Math.max(b.cal, 1); });
    ordre.forEach(function (x) {
      zone.appendChild(el('section', { class: 'carte jour' + (x.j === b.cal ? ' auj' : '') + (x.gros ? ' gros' : '') }, [
        el('h2', { text: 'Porte ' + x.j + ' · ' + dateTexte(x.j) + (x.gros ? ' ★' : '') }),
        x.lot ? el('p', { class: 'meta', style: 'color:#ffd740;', text: 'Lot prévu : ' + x.lot }) : null,
        el('p', { class: 'meta', text: (UNIVERS[x.univers] || '') + ' · « ' + x.titre + ' » · ' + x.leJour + ' joueur' + (x.leJour > 1 ? 's' : '') + ' le jour même' + (x.joues > x.leJour ? ' (+ ' + (x.joues - x.leJour) + ' en rattrapage)' : '') + ' · ' + x.justes + ' bonne' + (x.justes > 1 ? 's' : '') + ' réponse' + (x.justes > 1 ? 's' : '') }),
        x.j >= b.cal && b.cal <= 24 ? el('p', { class: 'note', text: x.j === b.cal ? 'Porte du jour : le tirage se fait demain à midi.' : '' }) : blocTirage(x.j, x.tirage, x.lot, 'pour la porte ' + x.j + ' (' + dateTexte(x.j) + ')')
      ]));
    });
    if (!ordre.length) zone.appendChild(el('p', { class: 'note', text: 'Rien à afficher avant le 1er décembre.' }));
  }

  if (code) entrer();
})();
