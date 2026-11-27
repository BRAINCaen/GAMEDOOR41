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
    var corps = 'Bonjour ' + t.gagnant.prenom + ',\n\nBravo : vous avez été tiré(e) au sort ' + quoi + ' de notre calendrier de l’Avent « Les 24 portes ».\n\nVotre lot : ' + (lot || '[LOT À PRÉCISER]') + '\n\n[Si c’est une place offerte : votre code est XXXX, à saisir à la réservation sur gamedoor41.fr, valable sans limite de durée.]\n[Si c’est un jeu : il vous attend à l’accueil, 41 bis rue Pasteur à Mondeville, aux heures d’ouverture.]\n\nMerci de nous répondre pour confirmer la bonne réception de ce message.\n\nÀ très vite,\nL’équipe GAMEDOOR·41';
    return 'mailto:' + encodeURIComponent(t.gagnant.email) + '?subject=' + encodeURIComponent(sujet) + '&body=' + encodeURIComponent(corps);
  }

  function quandTexte(iso) { try { return new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
  function etatMail(t) {
    var code = t.code ? ' · code ' + t.code : '';
    if (t.mail && t.mail.etat === 'envoye') return 'Mail automatique envoyé le ' + quandTexte(t.mail.le) + code + (t.mail.sansCode ? ' · SANS CODE : la réserve était vide, le code partira dès que vous en ajoutez.' : '.');
    if (t.mail && t.mail.etat === 'echec') return 'Le mail automatique n’est pas parti (' + (t.mail.erreur || 'erreur') + '), essai ' + t.mail.essais + ' sur 6' + code + '. Un nouvel essai part tout seul ; sinon « Écrire au gagnant ».';
    if (t.prevenu) return 'Prévenu à la main par l’équipe.';
    return bilanCourant && bilanCourant.courrier ? 'Le mail automatique part dans la demi-heure.' : 'Mails automatiques pas branchés : utilisez « Écrire au gagnant ».';
  }
  var bilanCourant = null;

  function blocTirage(cle, t, lotPrevu, quoi) {
    if (!t) return el('p', { class: 'note', text: 'Tirage pas encore fait (le lendemain à midi).' });
    if (!t.gagnant) return el('p', { class: 'note', text: t.dejaGagnants ? 'Tirage fait, sans gagnant : la seule personne possible a déjà gagné l’autre session complète (une session par personne).' : 'Tirage fait : aucun participant.' });
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
      el('p', { class: 'note', style: 'color:' + (t.mail && t.mail.etat === 'envoye' && !t.mail.sansCode ? '#39c26b' : '#ffd740') + ';', text: etatMail(t) }),
      el('p', { class: 'note', text: 'Tiré au sort parmi ' + (t.billets != null && cle === 'grand' ? t.billets + ' tickets (' + t.participants + ' joueurs)' : t.participants + ' participant' + (t.participants > 1 ? 's' : '')) + (t.dejaGagnants ? ', sans ' + t.dejaGagnants + ' qui avai' + (t.dejaGagnants > 1 ? 'ent' : 't') + ' déjà gagné' : '') + '. Affiché sur le site : ' + t.gagnant.etiquette }),
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

  function dessinerAuto(b) {
    $('auto-etat').textContent = b.courrier
      ? 'Mails automatiques : branchés (ils partent par le Hub, avec la clé Brevo commune). Le gagnant reçoit son lot et son code par mail dans la demi-heure qui suit le tirage de midi, et le bilan du jour arrive à ' + b.contact + '.' + (b.essai ? ' Sur cette page test, seuls les mails vers une adresse @gamedoor41.fr partent vraiment.' : '')
      : 'Mails automatiques : PAS branchés sur ce site (il manque la clé du relais du Hub, variable AVENT_RELAIS_CLE). Les tirages et l’affichage des gagnants se font tout seuls, mais les gagnants sont à prévenir avec « Écrire au gagnant ».';
    $('auto-etat').style.color = b.courrier ? '#39c26b' : '#ff5a6b';
    $('bilan-mail').hidden = !b.courrier;
    var noms = { quiz: 'Places de quiz (1 joueur)', escape: 'Places d’escape game (1 joueur)', session: 'Session de quiz complète (tirage des 24 portes)', sessionEscape: 'Session d’escape game complète (grand tirage)' };
    var zone = $('codes-etat'); zone.innerHTML = '';
    var pdp = b.pasDePerdant || { joueurs: 0 };
    ['quiz', 'escape', 'session', 'sessionEscape'].forEach(function (t) {
      var reste = b.codes[t] || 0, besoin = b.besoins[t] || 0, manque = Math.max(0, besoin - reste);
      var dont = t === 'quiz' && pdp.aDonner ? ' (dont ' + pdp.aDonner + ' pour « pas de perdant »' + (pdp.estimation ? ', à ce jour' : '') + ')' : '';
      zone.appendChild(el('p', { class: manque ? 'manque' : '', text: noms[t] + ' : ' + reste + ' en réserve, ' + besoin + ' encore à donner d’ici la fin' + dont + (manque ? ' → IL EN MANQUE ' + manque + '.' : ' → c’est bon.') }));
    });
    zone.appendChild(el('p', { class: 'note', text: pdp.fait
      ? 'Pas de perdant : ' + pdp.joueurs + ' joueur(s) sans aucun gain reçoivent 1 place de quiz pour 1 joueur · ' + pdp.envoyees + ' mail(s) parti(s)' + (pdp.attendentCode ? ' · ' + pdp.attendentCode + ' attendent un code' : '') + (pdp.echecs ? ' · ' + pdp.echecs + ' mail(s) en échec, nouvel essai tout seul' : '') + '.'
      : 'Pas de perdant : le 25 décembre à midi, chaque joueur qui n’a gagné aucun tirage recevra 1 place de quiz pour 1 joueur, par mail, tout seul. À ce jour : ' + pdp.joueurs + ' joueur(s) concerné(s). Prévoyez autant de codes de quiz en plus.' }));
    var q = $('questions'); q.innerHTML = '';
    var ouvertes = b.questions.filter(function (x) { return x.etat === 'ouverte'; }).length;
    q.appendChild(el('p', { class: 'note', style: 'margin-top:0;', text: b.questions.length ? ouvertes + ' en attente sur ' + b.questions.length + '. Chaque message arrive aussi par mail à ' + b.contact + ' : « Répondre » écrit directement à la personne.' : 'Aucun message pour le moment. Ils arriveront ici et par mail à ' + b.contact + '.' }));
    b.questions.forEach(function (x) {
      var lien = 'mailto:' + encodeURIComponent(x.email) + '?subject=' + encodeURIComponent('Votre message sur le calendrier de l’Avent GAMEDOOR·41') + '&body=' + encodeURIComponent('Bonjour ' + x.prenom + ',\n\n\n\nL’équipe GAMEDOOR·41\n\n— Votre message du ' + quandTexte(x.le) + ' —\n' + x.message);
      q.appendChild(el('div', { class: 'question' + (x.etat === 'ouverte' ? '' : ' traitee') }, [
        el('p', { style: 'margin:0;' }, [el('strong', { text: x.prenom }), ' · ', el('span', { class: 'mail', style: 'color:#ffd740;word-break:break-all;', text: x.email }), ' · ' + quandTexte(x.le) + ' ', el('span', { class: 'etiquette ' + (x.etat === 'ouverte' ? 'attente' : 'ok'), text: x.etat === 'ouverte' ? 'En attente' : 'Traitée' })]),
        el('blockquote', { text: x.message }),
        el('p', { class: 'note', style: 'margin:0 0 10px;', text: x.fiche + (x.accuse ? ' Accusé de réception envoyé.' : ' Pas d’accusé de réception envoyé.') }),
        el('div', { class: 'ligne' }, [
          el('a', { class: 'bouton-lien', href: lien, role: 'button', text: 'Répondre' }),
          el('button', { type: 'button', text: x.etat === 'ouverte' ? 'Marquer « traitée »' : 'Remettre « en attente »', onclick: function (ev) { ev.currentTarget.disabled = true; api('POST', 'question', { id: x.id, etat: x.etat === 'ouverte' ? 'traitee' : 'ouverte' }).then(entrer); } })
        ])
      ]));
    });
  }
  $('bilan-mail').addEventListener('click', function () {
    var b = $('bilan-mail'), note = $('auto-note');
    b.disabled = true;
    api('POST', 'rapport', {}).then(function (r) { b.disabled = false; note.hidden = false; note.textContent = r.statut === 200 ? 'Bilan envoyé à ' + r.corps.a + '.' : (r.corps.message || 'Échec.'); });
  });
  $('codes-ajouter').addEventListener('click', function () {
    var b = $('codes-ajouter'), retour = $('codes-retour');
    if (!$('codes-liste').value.trim()) return;
    b.disabled = true;
    api('POST', 'codes', { type: $('codes-type').value, codes: $('codes-liste').value }).then(function (r) {
      b.disabled = false; retour.hidden = false;
      if (r.statut !== 200) { retour.textContent = r.corps.message || 'Échec.'; return; }
      retour.textContent = r.corps.ajoutes + ' code(s) ajouté(s).' + (r.corps.refuses.length ? ' Refusés (caractères non permis) : ' + r.corps.refuses.join(', ') + '.' : '') + ' Un code déjà connu n’est pas repris.';
      $('codes-liste').value = '';
      entrer();
    });
  });

  /* aperçu des publications des réseaux sociaux : le fil public que lit Synergia */
  var fil = null;
  function dessinerReseaux(jour) {
    var zone = $('reseaux'); zone.innerHTML = '';
    if (!fil) { zone.appendChild(el('p', { class: 'note', text: 'Le fil des publications ne répond pas.' })); return; }
    fil.publications.filter(function (p) { return p.jour === jour; }).forEach(function (p) {
      zone.appendChild(el('div', { class: 'reseau' }, [
        el('p', { style: 'margin:0;' }, [el('strong', { text: (p.format === 'story' ? 'Story' : 'Publication') + ' · ' + quandTexte(p.quand) }), ' ', el('span', { class: 'etiquette ' + (p.pret ? 'ok' : 'attente'), text: p.pret ? 'Prête' : 'Attend le tirage de midi' })]),
        el('img', { src: p.image, alt: 'Visuel de la ' + (p.format === 'story' ? 'story' : 'publication') + ' du ' + p.jour + ' décembre', loading: 'lazy' }),
        p.format === 'story' ? el('p', { class: 'note', text: 'Une story n’a pas de légende.' }) : el('pre', { text: p.texte })
      ]));
    });
  }
  function chargerReseaux(cal) {
    var entetes = {};
    try { var essai = JSON.parse(localStorage.getItem('gd41_avent_2026') || '{}'); if (essai && essai.jourSimule != null) entetes['x-avent-jour'] = String(essai.jourSimule); } catch (e) { /* rien */ }
    fetch('/api/avent/annonces', { headers: entetes, cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }).then(function (f) {
      fil = f;
      var choix = $('reseaux-jour');
      if (!choix.options.length) {
        for (var j = 1; j <= 25; j++) choix.appendChild(el('option', { value: String(j), text: j === 25 ? 'vendredi 25 décembre (fin du jeu)' : dateTexte(j) }));
        choix.value = String(Math.min(25, Math.max(1, cal)));
        choix.addEventListener('change', function () { dessinerReseaux(parseInt(choix.value, 10)); });
      }
      dessinerReseaux(parseInt(choix.value, 10));
    });
  }

  function dessiner(b) {
    bilanCourant = b;
    dessinerAuto(b);
    chargerReseaux(b.cal);
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
