/* Les 24 portes de GAMEDOOR·41 : calendrier de l'Avent 2026 (côté joueur).
   Le serveur (/api/avent/…) garde les réponses, vérifie les dates et fait les tirages.
   Cette page n'apprend la bonne réponse d'une porte que le lendemain midi. */
(function () {
  'use strict';

  var racine = document.getElementById('av-app');
  if (!racine) return;
  var grille = document.getElementById('av-grille');
  var bandeau = document.getElementById('av-joueur');
  var dialogue = document.getElementById('av-dialogue');
  var corps = document.getElementById('av-dialogue-corps');
  var zoneTest = document.getElementById('av-test');

  var CLE = 'gd41_avent_2026';
  var ANNEE = 2026;
  var JOURS_SEMAINE = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  var UNIVERS = {
    gav: { nom: 'Garde à Vue', genre: 'Escape game', lien: '/escape-game-caen/garde-a-vue/' },
    psy: { nom: 'Psychiatric', genre: 'Escape game', lien: '/escape-game-caen/psychiatric/' },
    '80s': { nom: 'Back to the 80’s', genre: 'Escape game', lien: '/escape-game-caen/back-to-the-80s/' },
    quiz: { nom: 'Buzz Your Brain', genre: 'Quiz game', lien: '/quiz-game-caen/' },
    final: { nom: 'GAMEDOOR·41', genre: 'La dernière porte', lien: '/' }
  };

  /* ---------- ce que ce téléphone retient (le reste est chez nous) ---------- */
  var local = lire();
  function lire() {
    try { var b = JSON.parse(localStorage.getItem(CLE) || '{}'); return b && typeof b === 'object' ? b : {}; } catch (e) { return {}; }
  }
  function ecrire() { try { localStorage.setItem(CLE, JSON.stringify(local)); } catch (e) { /* navigation privée : on joue quand même */ } }

  var etat = null;          /* réponse de /api/avent/etat */
  var defis = {};           /* défis déjà chargés */
  var fiches = null;        /* page test + code de l'équipe : réponses et notes */
  var codeEquipe = '';
  try { codeEquipe = sessionStorage.getItem(CLE + '_code') || ''; } catch (e) { /* rien */ }

  /* ---------- appels au serveur ---------- */
  function api(methode, chemin, donnees) {
    var entetes = { 'accept': 'application/json' };
    if (local.jeton) entetes['x-avent-jeton'] = local.jeton;
    if (local.jourSimule != null) entetes['x-avent-jour'] = String(local.jourSimule);
    if (codeEquipe && chemin.indexOf('equipe/') === 0) entetes['x-avent-code'] = codeEquipe;
    if (donnees) entetes['content-type'] = 'application/json';
    var controle = window.AbortController ? new AbortController() : null;
    var minuterie = setTimeout(function () { if (controle) controle.abort(); }, 15000);
    return fetch('/api/avent/' + chemin, { method: methode, headers: entetes, body: donnees ? JSON.stringify(donnees) : undefined, signal: controle ? controle.signal : undefined, cache: 'no-store' })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (c) { return { statut: r.status, corps: c }; }); })
      .catch(function () { return { statut: 0, corps: { message: 'Connexion impossible. Vérifiez votre réseau, puis réessayez.' } }; })
      .then(function (r) { clearTimeout(minuterie); return r; });
  }

  /* ---------- petits outils ---------- */
  function el(balise, attrs, enfants) {
    var n = document.createElement(balise);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else if (k.indexOf('on') === 0) n.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== false && attrs[k] != null) n.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
    });
    (enfants || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  var ICONES = {
    cadenas: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2" fill="currentColor"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    coche: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    etoile: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-3-5.4 3 1.1-6-4.5-4.2 6.1-.8Z" fill="currentColor"/></svg>',
    cadeau: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 8.5h17v4h-17zM5 12.5h14V21H5z" fill="currentColor"/><path d="M12 8.5V21" stroke="rgba(0,0,0,.5)" stroke-width="2.4"/><path d="M12 8.2C10.2 3.6 5.6 4 6.2 6.6 6.7 8.4 9.6 8.3 12 8.2Zm0 0c1.8-4.6 6.4-4.2 5.8-1.6-.5 1.8-3.4 1.7-5.8 1.6Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/></svg>',
    son: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4Z" fill="currentColor"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.7 7.7 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    alerte: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4 2.5 20h19Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M12 10v4.5M12 17.2v.3" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>'
  };
  function suivre(nom, params) { if (etat && !etat.essai && typeof window.gtag === 'function') window.gtag('event', nom, params || {}); }
  function dateTexte(j) { return JOURS_SEMAINE[new Date(ANNEE, 11, j).getDay()] + ' ' + (j === 1 ? '1er' : j) + ' décembre'; }
  function pluriel(n, mot) { return n + ' ' + mot + (n > 1 ? 's' : ''); }
  function porteDe(j) { for (var i = 0; i < etat.portes.length; i++) if (etat.portes[i].j === j) return etat.portes[i]; return null; }
  function maReponse(j) { return etat.moi && etat.moi.reponses ? etat.moi.reponses[j] : null; }

  /* ---------- chargement ---------- */
  function charger(silencieux) {
    if (!silencieux && !etat) {
      grille.innerHTML = '';
      for (var i = 1; i <= 24; i++) grille.appendChild(el('span', { class: 'av-porte av-porte--attente', 'aria-hidden': 'true' }));
      bandeau.innerHTML = ''; bandeau.appendChild(el('p', { class: 'av-joueur-msg', text: 'Ouverture du calendrier…' }));
    }
    return api('GET', 'etat').then(function (r) {
      if (r.statut !== 200) {
        if (silencieux && etat) return;
        grille.innerHTML = ''; bandeau.innerHTML = '';
        bandeau.appendChild(el('p', { class: 'av-joueur-msg', text: r.statut === 503 ? 'Le calendrier se prépare. Revenez très vite !' : (r.corps.message || 'Le calendrier ne répond pas pour le moment.') }));
        bandeau.appendChild(el('button', { type: 'button', class: 'btn btn-primary av-joueur-btn', text: 'Réessayer', onclick: function () { charger(); } }));
        return;
      }
      etat = r.corps; etat.recuLe = Date.now();
      dessiner();
      outilsTest();
    });
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden && etat && Date.now() - etat.recuLe > 120000 && !dialogue.open) charger(true); });

  /* ---------- la grille ---------- */
  function etatPorte(j) {
    var r = maReponse(j), visible = !!etat.resultats[j];
    if (r) return visible ? 'resultat' : 'jouee';
    if (j > etat.cal) return 'verrou';
    if (etat.cal > 24) return visible ? 'resultat' : 'jouee';   /* calendrier terminé : on ne joue plus, on regarde */
    if (j === etat.cal) return 'jour';
    return 'rattrapage';
  }
  var LIBELLES = { verrou: '', jour: 'Jouer', jouee: 'Joué', resultat: 'Résultat', rattrapage: 'Rattrapage' };

  function dessiner() {
    grille.innerHTML = '';
    etat.portes.forEach(function (p) {
      var e = etatPorte(p.j), u = UNIVERS[p.univers] || UNIVERS.final;
      var libelle = e === 'jouee' && !maReponse(p.j) ? 'Fermée' : LIBELLES[e];
      var porte = el('button', {
        type: 'button', class: 'av-porte av-porte--' + p.univers + ' is-' + e + (p.gros ? ' is-gros' : '') + (p.jeu ? ' is-jeu' : ''),
        'aria-label': 'Porte ' + p.j + ', ' + u.nom + ', ' + (e === 'verrou' ? 'fermée jusqu’au ' + dateTexte(p.j) : libelle.toLowerCase()) + (p.lot ? ', à gagner : ' + p.lot : p.gros ? ', jour à étoile' : ''),
        'data-libelle': p.j + ' · ' + libelle,
        onclick: function () { ouvrir(p.j, porte); }
      }, [
        el('span', { class: 'av-porte-fond', 'aria-hidden': 'true' }),
        el('span', { class: 'av-porte-battant', 'aria-hidden': 'true' }, [
          p.gros ? el('span', { class: 'av-porte-gros', html: ICONES.etoile }) : null,
          p.jeu ? el('span', { class: 'av-porte-jeu', html: ICONES.cadeau }) : null,
          el('span', { class: 'av-porte-num', text: String(p.j) }),
          el('span', { class: 'av-porte-etat', html: e === 'verrou' ? ICONES.cadenas : '<b>' + libelle + '</b>' }),
          el('span', { class: 'av-porte-poignee' })
        ])
      ]);
      grille.appendChild(porte);
    });
    dessinerJoueur();
    dessinerGagnants();
  }

  /* ---------- les gagnants (liste publique, les plus récents en haut) ---------- */
  function dessinerGagnants() {
    var bloc = document.getElementById('av-gagnants-bloc'), liste = document.getElementById('av-gagnants');
    if (!bloc || !liste) return;
    liste.innerHTML = '';
    function ligne(teinte, quand, nom, lot) {
      liste.appendChild(el('li', { class: 'av-gagnant-ligne av-teinte--' + teinte }, [
        el('span', { class: 'av-gagnant-quand', text: quand }),
        el('span', { class: 'av-gagnant-qui', text: nom }),
        lot ? el('span', { class: 'av-gagnant-lot', text: lot }) : null
      ]));
    }
    var f = etat.finaux || {};
    if (f.assidus && f.assidus.gagnant) ligne('final', 'Tirage des 24 portes ouvertes', f.assidus.gagnant, f.assidus.lot);
    if (f.grand && f.grand.gagnant) ligne('final', 'Grand tirage', f.grand.gagnant, f.grand.lot);
    etat.portes.slice().sort(function (a, b) { return b.j - a.j; }).forEach(function (p) {
      var r = etat.resultats[p.j];
      if (r && r.tire && r.gagnant) ligne(p.univers, 'Porte ' + p.j + ' · ' + dateTexte(p.j), r.gagnant, r.lot);
    });
    bloc.hidden = !liste.children.length;
  }

  /* ---------- une question, une réclamation ---------- */
  (function () {
    var form = document.getElementById('av-ecrire');
    if (!form) return;
    var prenom = document.getElementById('av-q-prenom'), email = document.getElementById('av-q-email'), message = document.getElementById('av-q-message');
    var piege = document.getElementById('av-q-site'), erreur = document.getElementById('av-q-erreur'), ok = document.getElementById('av-q-ok'), bouton = document.getElementById('av-q-envoyer');
    var enCours = false;
    prenom.addEventListener('focus', function () { if (!prenom.value && etat && etat.moi) prenom.value = etat.moi.prenom; });
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (enCours) return;
      var pr = prenom.value.trim(), m = email.value.trim().toLowerCase(), texte = message.value.trim();
      var souci = pr.length < 2 ? 'Indiquez votre prénom.' : !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(m) ? 'Cette adresse mail ne semble pas complète.' : texte.length < 10 ? 'Écrivez votre question en quelques mots.' : '';
      ok.hidden = true; erreur.hidden = true;
      if (souci) { erreur.textContent = souci; erreur.hidden = false; erreur.scrollIntoView({ block: 'nearest' }); return; }
      enCours = true; bouton.disabled = true; bouton.textContent = 'Envoi…';
      api('POST', 'question', { prenom: pr, email: m, message: texte, site: piege.value }).then(function (r) {
        enCours = false; bouton.disabled = false; bouton.textContent = 'Envoyer mon message';
        if (r.statut === 200) {
          message.value = '';
          ok.textContent = 'Message bien reçu, ' + pr + '. Nous vous répondons par mail sous 48 heures.';
          ok.hidden = false; ok.scrollIntoView({ block: 'nearest' });
          suivre('avent_question', {});
        } else {
          erreur.textContent = (r.corps && r.corps.message) || 'Un souci de notre côté. Réessayez dans un instant.';
          erreur.hidden = false; erreur.scrollIntoView({ block: 'nearest' });
        }
      });
    });
  })();

  function dessinerJoueur() {
    var auj = etat.cal, moi = etat.moi, nb = moi ? Object.keys(moi.reponses).length : 0;
    bandeau.innerHTML = '';
    var message;
    if (auj < 1) message = 'La première porte s’ouvre le mardi 1er décembre. Revenez ce jour-là !';
    else if (auj > 24) message = 'Le calendrier est terminé. Merci d’avoir joué !';
    else if (maReponse(auj)) message = 'Porte du jour jouée. Résultat demain à midi, et une nouvelle porte dès minuit.';
    else message = 'La porte ' + auj + ' vous attend : un défi d’une minute.';
    /* le lot du jour, sous le message : ce qu'on peut gagner en ouvrant la porte */
    var porteLot = porteDe(auj < 1 ? 1 : auj), repJour = maReponse(auj);
    var quandLot = auj < 1 ? 'À gagner dès le 1er : ' : auj > 24 ? null : !repJour ? 'À gagner aujourd’hui : ' : repJour.leJour ? 'Au tirage de demain midi : ' : null;
    bandeau.appendChild(el('p', { class: 'av-joueur-msg' }, [
      moi ? el('strong', { text: 'Bonjour ' + moi.prenom + '. ' }) : null, message,
      quandLot && porteLot && porteLot.lot ? el('span', { class: 'av-joueur-lot' + (porteLot.image ? ' a-image' : '') }, porteLot.image
        ? [el('img', { class: 'av-joueur-lot-img', src: porteLot.image, alt: '', width: '54', height: '54', decoding: 'async' }), el('span', {}, [el('b', { text: quandLot }), porteLot.lot])]
        : [el('i', { html: ICONES.cadeau }), el('b', { text: quandLot }), porteLot.lot]) : null
    ]));
    if (moi) bandeau.appendChild(el('p', { class: 'av-joueur-compte' }, [
      el('span', {}, [el('b', { text: String(nb) }), (nb > 1 ? 'portes ouvertes' : 'porte ouverte') + ' sur 24']),
      el('span', {}, [el('b', { text: String(moi.tickets) }), (moi.tickets > 1 ? 'tickets' : 'ticket') + ' pour le grand tirage'])
    ]));
    if (auj >= 1 && auj <= 24 && !maReponse(auj)) {
      bandeau.appendChild(el('button', { type: 'button', class: 'btn btn-primary av-joueur-btn', text: 'Ouvrir la porte ' + auj, onclick: function () { ouvrir(auj); } }));
    }
    if (etat.finaux && (etat.finaux.grand || etat.finaux.assidus)) {
      var f = etat.finaux;
      bandeau.appendChild(el('p', { class: 'av-joueur-finaux' }, [
        f.grand ? el('span', {}, [el('b', { text: 'Grand tirage : ' }), f.grand.gagnant ? f.grand.gagnant + (f.grand.lot ? ' gagne ' + f.grand.lot : '') : 'aucun participant']) : null,
        f.assidus ? el('span', {}, [el('b', { text: 'Tirage des 24 portes : ' }), f.assidus.gagnant ? f.assidus.gagnant + (f.assidus.lot ? ' gagne ' + f.assidus.lot : '') : 'personne n’a ouvert les 24 portes']) : null,
        moi && moi.pasDePerdant ? el('span', {}, [el('b', { text: 'Pas de perdant : ' }), 'vous recevez 1 place de quiz pour 1 joueur' + (moi.pasDePerdant.envoye ? ', partie par mail.' : ', elle arrive par mail.')]) : null
      ]));
    }
  }

  /* ---------- la fenêtre ---------- */
  var retourFocus = null, minuteur = null, dansHistorique = false;
  document.getElementById('av-dialogue-fermer').addEventListener('click', fermer);
  dialogue.addEventListener('click', function (ev) { if (ev.target === dialogue) fermer(); });
  dialogue.addEventListener('cancel', function (ev) { ev.preventDefault(); fermer(); });
  window.addEventListener('popstate', function () { if (dansHistorique) { dansHistorique = false; fermerVraiment(); } });
  function fermer() { if (dansHistorique) { history.back(); } else fermerVraiment(); }
  function fermerVraiment() {
    arreterSon();
    if (minuteur) { clearInterval(minuteur); minuteur = null; }
    if (dialogue.open) { if (dialogue.close) dialogue.close(); else dialogue.removeAttribute('open'); }
    document.documentElement.classList.remove('av-fige');
    if (retourFocus && retourFocus.focus && document.contains(retourFocus)) retourFocus.focus({ preventScroll: true });
  }
  function montrer(noeuds, teinte) {
    corps.className = 'av-dialogue-corps' + (teinte ? ' av-teinte--' + teinte : '');
    corps.innerHTML = '';
    noeuds.forEach(function (n) { if (n) corps.appendChild(n); });
    if (!dialogue.open) {
      if (dialogue.showModal) dialogue.showModal(); else dialogue.setAttribute('open', '');
      document.documentElement.classList.add('av-fige');
      if (!dansHistorique && history.pushState) { history.pushState({ avent: 1 }, ''); dansHistorique = true; }
    }
    corps.scrollTop = 0;
    var titre = corps.querySelector('.av-defi-titre');
    if (titre) { titre.setAttribute('tabindex', '-1'); titre.focus({ preventScroll: true }); }
  }
  function entete(p, sousTitre) {
    var u = UNIVERS[p.univers] || UNIVERS.final;
    return el('header', { class: 'av-defi-tete av-teinte--' + p.univers }, [
      el('p', { class: 'av-defi-surtitre' }, [el('span', { class: 'av-pastille', text: 'Porte ' + p.j }), ' ' + u.genre + ' · ' + u.nom]),
      el('h2', { class: 'av-defi-titre', id: 'av-dialogue-titre', text: p.titre || 'Porte ' + p.j }),
      sousTitre ? el('p', { class: 'av-defi-sous', text: sousTitre }) : null
    ]);
  }
  function bandeLot(p, quand) {
    if (!p.lot) return null;
    return el('p', { class: 'av-lot-jour' + (p.image ? ' a-image' : '') }, [
      p.image ? el('img', { class: 'av-lot-jour-img', src: p.image, alt: '', width: '54', height: '54', decoding: 'async' }) : el('i', { html: ICONES.cadeau }),
      el('span', {}, [el('b', { text: quand }), p.lot])
    ]);
  }
  function actions(noeuds, classe) { return el('div', { class: 'av-actions' + (classe ? ' ' + classe : '') }, noeuds); }
  function boutonFermer(texte) { return actions([el('button', { type: 'button', class: 'btn btn-outline', text: texte || 'Fermer', onclick: fermer })]); }
  function ecranMessage(p, icone, fort, texte, bouton) {
    montrer([entete(p), el('div', { class: 'av-info' }, [
      el('div', { class: 'av-info-ico', html: ICONES[icone] }),
      el('p', { class: 'av-info-fort', text: fort }),
      texte ? el('p', { text: texte }) : null
    ]), bouton || boutonFermer('Retour au calendrier')], p.univers);
  }

  function ouvrir(j, origine) {
    if (!etat) return;
    var p = porteDe(j);
    if (!p) return;
    retourFocus = origine || document.activeElement;
    var e = etatPorte(j);
    suivre('avent_porte', { jour: j, etat: e });
    if (e === 'verrou') return ecranMessage(p, 'cadenas', 'Cette porte s’ouvre le ' + dateTexte(j) + '.', 'Une porte par jour, du 1er au 24 décembre. Revenez ce jour-là : le défi dure une minute.', boutonFermer('D’accord'));
    if (e === 'resultat') return ecranResultat(p);
    if (e === 'jouee') return maReponse(j) ? ecranAttente(p) : ecranMessage(p, 'cadenas', 'Le résultat arrive à midi.', 'Le calendrier est terminé : la réponse de cette porte s’affiche le lendemain à midi.');
    chargerDefi(p, e === 'rattrapage');
  }

  function chargerDefi(p, rattrapage) {
    if (defis[p.j]) return ecranDefi(p, defis[p.j], rattrapage);
    montrer([entete(p), el('div', { class: 'av-info' }, [el('p', { class: 'av-info-fort', text: 'La porte s’ouvre…' })])], p.univers);
    api('GET', 'defi?j=' + p.j).then(function (r) {
      if (!dialogue.open) return;
      if (r.statut !== 200) return ecranMessage(p, 'alerte', 'La porte est coincée.', r.corps.message || 'Réessayez dans un instant.', actions([el('button', { type: 'button', class: 'btn btn-primary', text: 'Réessayer', onclick: function () { chargerDefi(p, rattrapage); } }), el('button', { type: 'button', class: 'btn btn-outline', text: 'Fermer', onclick: fermer })]));
      defis[p.j] = r.corps.defi;
      ecranDefi(p, defis[p.j], rattrapage);
    });
  }

  /* --- visuels des défis --- */
  function visuel(d) {
    var v = d.visuel;
    if (v === 'indices') return el('ul', { class: 'av-indices' }, d.indices.map(function (i) {
      return el('li', {}, [el('span', { class: 'av-indices-code' }, i[0].split(' ').map(function (c) { return el('b', { text: c }); })), el('span', { class: 'av-indices-note', text: i[1] })]);
    }));
    if (v === 'rebus') return el('p', { class: 'av-rebus', role: 'img', 'aria-label': 'Une suite de dessins' }, d.rebus.map(function (r) { return el('span', { text: r }); }));
    if (v === 'paroles') return el('ul', { class: 'av-paroles' }, d.paroles.map(function (p) { return el('li', {}, [el('b', { text: p[0] }), el('span', { text: p[1] })]); }));
    if (v === 'liste') return el('ol', { class: 'av-liste' }, d.liste.map(function (l) { return el('li', { text: l }); }));
    if (v === 'suite') return el('p', { class: 'av-suite' }, d.suite.map(function (s) { return el('span', { class: s === '?' ? 'is-vide' : '', text: s }); }));
    if (v === 'mot') return el('p', { class: 'av-mot', 'aria-label': d.mot.split('').join(' ') }, d.mot.split('').map(function (c) { return el('span', { text: c }); }));
    if (v === 'miroir') return el('div', { class: 'av-miroir' }, [el('p', { 'aria-label': 'Un message écrit à l’envers, comme vu dans un miroir', text: d.miroir })]);
    if (v === 'photo') return el('figure', { class: 'av-photo' }, [el('img', { src: d.photo.src, alt: d.photo.alt, decoding: 'async' })]);
    if (v === 'zoom') return el('div', { class: 'av-zoom', role: 'img', 'aria-label': d.zoom.alt, style: 'background-image:url(' + d.zoom.src + ');background-size:' + d.zoom.taille + ';background-position:' + d.zoom.position }, []);
    if (v === 'cube') {
      var couleurs = ['#E0243C', '#FFD740', '#3D5DC0', '#F0EBE2', '#2FA84F', '#FF7A1A', '#FFD740', '#E0243C', '#3D5DC0'];
      return el('div', { class: 'av-cube', role: 'img', 'aria-label': 'Une face de Rubik’s Cube : 9 carrés de couleur' }, couleurs.map(function (c) { return el('span', { style: 'background:' + c }); }));
    }
    if (v === 'tetris') {
      var pieces = [['1111'], ['11', '11'], ['010', '111'], ['100', '111'], ['011', '110']];
      var teintes = ['#35C8F0', '#FFD740', '#9D4EDD', '#FF7A1A', '#2FA84F'];
      return el('div', { class: 'av-tetris', role: 'img', 'aria-label': 'Cinq pièces de Tetris' }, pieces.map(function (p, i) {
        return el('span', { class: 'av-tetris-piece', style: 'grid-template-columns:repeat(' + p[0].length + ',1fr);color:' + teintes[i] },
          p.join('').split('').map(function (c) { return el('i', { class: c === '1' ? 'on' : '' }); }));
      }));
    }
    if (v === 'horloge') {
      var traits = '';
      for (var h = 0; h < 12; h++) traits += '<line x1="50" y1="8" x2="50" y2="' + (h % 3 === 0 ? 17 : 13) + '" transform="rotate(' + (h * 30) + ' 50 50)"/>';
      return el('div', { class: 'av-horloge', role: 'img', 'aria-label': 'Une horloge sans chiffres vue dans un miroir : la petite aiguille est entre le 8 et le 9, la grande est en bas', html:
        '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" class="cadran"/><g class="traits">' + traits + '</g>' +
        '<line x1="50" y1="50" x2="50" y2="26" class="petite" transform="rotate(255 50 50)"/><line x1="50" y1="50" x2="50" y2="16" class="grande" transform="rotate(180 50 50)"/><circle cx="50" cy="50" r="3.2" class="axe"/></svg>' +
        '<span>Vue dans le miroir</span>' });
    }
    if (v === 'morse') {
      var codes = {}; d.morse.table.forEach(function (t) { codes[t[0]] = t[1]; });
      return el('div', { class: 'av-morse' }, [
        el('p', { class: 'av-morse-message', 'aria-label': 'Le message en morse' }, d.morse.mot.split('').map(function (l) { return el('span', { text: codes[l] }); })),
        el('ul', { class: 'av-morse-table', 'aria-label': 'Alphabet morse utile' }, d.morse.table.map(function (t) { return el('li', {}, [el('b', { text: t[0] }), el('span', { text: t[1] })]); }))
      ]);
    }
    return null;
  }

  /* --- son fabriqué par la page (aucun enregistrement) --- */
  var ctxAudio = null, sonEnCours = [];
  var FREQ = { C: 261.63, D: 293.66, E: 329.63, F: 349.23, G: 392.0, A: 440.0, B: 493.88 };
  var MORSE = { A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..' };
  function arreterSon() { sonEnCours.forEach(function (o) { try { o.stop(); } catch (e) { /* déjà arrêté */ } }); sonEnCours = []; }
  function bip(freq, debut, duree, forme, volume) {
    var o = ctxAudio.createOscillator(), g = ctxAudio.createGain();
    o.type = forme; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, debut);
    g.gain.exponentialRampToValueAtTime(volume, debut + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, debut + duree);
    o.connect(g); g.connect(ctxAudio.destination);
    o.start(debut); o.stop(debut + duree + 0.03);
    sonEnCours.push(o);
  }
  function jouerSon(a) {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return 0;
    try {
      if (!ctxAudio) ctxAudio = new AC();
      if (ctxAudio.state === 'suspended') ctxAudio.resume();
      arreterSon();
      var t = ctxAudio.currentTime + 0.1, t0 = t;
      if (a.genre === 'melodie') {
        var temps = 0.27;
        a.notes.forEach(function (n) { if (FREQ[n[0]]) bip(FREQ[n[0]] * 2, t, n[1] * temps * 0.92, 'triangle', 0.3); t += n[1] * temps; });
      } else {
        var u = 0.085;
        a.mot.split('').forEach(function (l) {
          (MORSE[l] || '').split('').forEach(function (s) { var d = s === '.' ? u : u * 3; bip(640, t, d, 'sine', 0.32); t += d + u; });
          t += u * 2.4;
        });
      }
      return (t - t0) * 1000;
    } catch (e) { return 0; }
  }
  function blocSon(d) {
    var b = el('button', { type: 'button', class: 'av-son' });
    var aide = el('p', { class: 'av-son-aide', text: 'Pas de son ? Montez le volume et retirez le mode silencieux du téléphone.' });
    /* secours : personne ne doit rester bloqué parce que son téléphone est muet */
    var NOMS = { C: 'Do', D: 'Ré', E: 'Mi', F: 'Fa', G: 'Sol', A: 'La', B: 'Si' };
    var secours = d.audio.genre === 'melodie'
      ? el('p', { class: 'av-son-notes', hidden: true }, [el('b', { text: 'Les notes : ' }), d.audio.notes.map(function (n) { return (NOMS[n[0]] || '?') + (n[1] >= 2 ? ' —' : ''); }).join(' · ')])
      : el('p', { class: 'av-son-notes', hidden: true, text: 'Le message est aussi écrit juste au-dessus, avec les points et les traits.' });
    var sans = el('button', { type: 'button', class: 'av-son-sans', text: 'Je ne peux pas mettre le son' });
    function montrerSecours() { secours.hidden = false; sans.hidden = true; }
    sans.addEventListener('click', montrerSecours);
    function repos() { b.innerHTML = ICONES.son + '<span>' + (b.getAttribute('data-ecoute') ? 'Réécouter' : 'Écouter') + '</span>'; b.disabled = false; }
    b.addEventListener('click', function () {
      var ms = jouerSon(d.audio);
      if (!ms) { aide.textContent = 'Le son ne fonctionne pas sur cet appareil.'; montrerSecours(); return; }
      b.setAttribute('data-ecoute', '1'); b.disabled = true; b.innerHTML = ICONES.son + '<span>Écoute en cours…</span>';
      setTimeout(repos, ms + 150);
    });
    repos();
    return el('div', { class: 'av-son-bloc' }, [b, aide, sans, secours]);
  }

  /* --- le défi --- */
  function ecranDefi(p, d, rattrapage) {
    if (d.memoire && !(local.vus && local.vus[p.j])) return ecranMemoire(p, d, rattrapage);
    var choisi = null, chiffres = [];
    var valider = el('button', { type: 'button', class: 'btn btn-primary', text: 'Valider ma réponse', disabled: d.type === 'qcm' });
    var zone;
    if (d.type === 'qcm') {
      zone = el('div', { class: 'av-choix', role: 'radiogroup', 'aria-label': d.question }, d.choix.map(function (c, i) {
        var b = el('button', { type: 'button', class: 'av-choix-btn', role: 'radio', 'aria-checked': 'false' }, [el('span', { class: 'av-choix-lettre', text: 'ABCD'[i] }), el('span', { text: c })]);
        b.addEventListener('click', function () {
          choisi = i; valider.disabled = false;
          Array.prototype.forEach.call(zone.children, function (x, k) { x.classList.toggle('is-choisi', k === i); x.setAttribute('aria-checked', k === i ? 'true' : 'false'); });
        });
        return b;
      }));
    } else {
      for (var k = 0; k < d.longueur; k++) chiffres.push(0);
      zone = el('div', { class: 'av-cadenas', role: 'group', 'aria-label': 'Cadenas à ' + d.longueur + ' chiffres' }, chiffres.map(function (_, i) {
        var affichage = el('output', { class: 'av-cadenas-chiffre', text: '0', 'aria-live': 'polite' });
        function tourner(pas) { chiffres[i] = (chiffres[i] + pas + 10) % 10; affichage.textContent = String(chiffres[i]); }
        return el('div', { class: 'av-cadenas-roue' }, [
          el('button', { type: 'button', 'aria-label': 'Chiffre ' + (i + 1) + ' : plus', text: '▲', onclick: function () { tourner(1); } }),
          affichage,
          el('button', { type: 'button', 'aria-label': 'Chiffre ' + (i + 1) + ' : moins', text: '▼', onclick: function () { tourner(-1); } })
        ]);
      }));
    }
    valider.addEventListener('click', function () {
      var reponse = d.type === 'qcm' ? choisi : chiffres.join('');
      if (reponse === null) return;
      if (!etat.moi) return ecranInscription(p, reponse);
      envoyer(p, { j: p.j, reponse: reponse }, valider);
    });
    montrer([
      entete(p, rattrapage ? 'Porte en rattrapage : 1 ticket pour le grand tirage.' : null),
      rattrapage ? null : bandeLot(p, 'À gagner aujourd’hui : '),
      el('p', { class: 'av-defi-intro', text: d.intro }),
      visuel(d),
      d.audio ? blocSon(d) : null,
      el('p', { class: 'av-defi-question', text: d.question }),
      zone,
      el('p', { class: 'av-defi-regle', text: 'Une seule réponse par porte. Prenez votre temps.' }),
      actions([valider], 'av-actions--colle'),
      ficheEquipe(p.j)
    ], p.univers);
  }

  function ecranMemoire(p, d, rattrapage) {
    var m = d.memoire;
    var lancer = el('button', { type: 'button', class: 'btn btn-primary', text: 'Je suis prêt' });
    function demarrer(contenu) {
      local.vus = local.vus || {}; local.vus[p.j] = true; ecrire();
      var reste = m.secondes;
      var compteur = el('span', { text: String(reste) });
      montrer([entete(p), el('p', { class: 'av-chrono', 'aria-live': 'polite' }, ['Mémorisez : encore ', compteur, ' s']), el('div', { class: 'av-chrono-barre' }, [el('i', { style: 'animation-duration:' + m.secondes + 's' })]), contenu], p.univers);
      minuteur = setInterval(function () {
        reste--; compteur.textContent = String(Math.max(0, reste));
        if (reste <= 0) { clearInterval(minuteur); minuteur = null; if (dialogue.open) ecranDefi(p, d, rattrapage); }
      }, 1000);
    }
    lancer.addEventListener('click', function () {
      if (!m.photo) return demarrer(el('dl', { class: 'av-dossier' }, m.lignes.reduce(function (acc, l) { acc.push(el('dt', { text: l[0] }), el('dd', { text: l[1] })); return acc; }, [])));
      /* la photo doit être arrivée AVANT que le compte à rebours parte (réseau lent) */
      lancer.disabled = true; lancer.textContent = 'Chargement de la photo…';
      var img = new Image();
      img.alt = m.photo.alt;
      img.onload = function () { if (dialogue.open) demarrer(el('figure', { class: 'av-photo av-photo--haute' }, [img])); };
      img.onerror = function () { lancer.disabled = false; lancer.textContent = 'Réessayer'; };
      img.src = m.photo.src;
    });
    montrer([
      entete(p),
      rattrapage ? null : bandeLot(p, 'À gagner aujourd’hui : '),
      el('p', { class: 'av-defi-intro', text: d.intro }),
      el('div', { class: 'av-info' }, [el('p', { class: 'av-info-fort', text: m.secondes + ' secondes, une seule fois.' }), el('p', { text: 'Ensuite, l’image disparaît et la question arrive.' })]),
      actions([lancer], 'av-actions--colle'),
      ficheEquipe(p.j)
    ], p.univers);
  }

  /* --- l'inscription (une seule fois) --- */
  function ecranInscription(p, reponse) {
    var prenom = el('input', { type: 'text', id: 'av-prenom', name: 'given-name', autocomplete: 'given-name', autocapitalize: 'words', maxlength: '30', enterkeyhint: 'next', required: true });
    var email = el('input', { type: 'email', id: 'av-email', name: 'email', autocomplete: 'email', inputmode: 'email', autocapitalize: 'none', autocorrect: 'off', spellcheck: 'false', maxlength: '120', enterkeyhint: 'done', required: true });
    var reglement = el('input', { type: 'checkbox', id: 'av-reglement', required: true });
    var nouvelles = el('input', { type: 'checkbox', id: 'av-nouvelles' });
    var erreur = el('p', { class: 'av-erreur', role: 'alert', hidden: true });
    var bouton = el('button', { type: 'submit', class: 'btn btn-primary', text: 'Enregistrer ma réponse' });
    var form = el('form', { class: 'av-form', novalidate: true }, [
      el('label', { for: 'av-prenom', text: 'Votre prénom' }), prenom,
      el('label', { for: 'av-email', text: 'Votre adresse mail' }), email,
      el('p', { class: 'av-form-aide', text: 'Elle sert à vous prévenir si vous gagnez, et à retrouver vos tickets. Aucun mot de passe.' }),
      el('label', { class: 'av-case', for: 'av-reglement' }, [reglement, el('span', { html: 'J’ai lu et j’accepte le <a href="/calendrier-de-l-avent/#av-reglement-bloc" target="_blank" rel="noopener">règlement du jeu</a>. J’ai 18 ans ou plus.' })]),
      el('label', { class: 'av-case', for: 'av-nouvelles' }, [nouvelles, el('span', { text: 'Je veux bien recevoir les nouvelles de GAMEDOOR·41 par mail (si vous voulez, sans effet sur vos chances).' })]),
      erreur,
      actions([bouton], 'av-actions--colle')
    ]);
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var pr = prenom.value.trim(), m = email.value.trim().toLowerCase();
      var souci = pr.length < 2 ? 'Indiquez votre prénom.' : !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(m) ? 'Cette adresse mail ne semble pas complète.' : !reglement.checked ? 'Cochez la case du règlement pour participer.' : '';
      if (souci) { erreur.textContent = souci; erreur.hidden = false; erreur.scrollIntoView({ block: 'nearest' }); return; }
      erreur.hidden = true;
      envoyer(p, { j: p.j, reponse: reponse, prenom: pr, email: m, reglement: true, nouvelles: nouvelles.checked }, bouton, erreur);
    });
    montrer([entete(p, 'Dernière étape avant de valider'), el('p', { class: 'av-defi-intro', text: 'Votre réponse est prête. Dites-nous à qui l’attribuer : c’est demandé une seule fois.' }), form], p.univers);
  }

  var envoiEnCours = false;
  function envoyer(p, donnees, bouton, zoneErreur) {
    if (envoiEnCours) return;
    envoiEnCours = true;
    var texte = bouton.textContent;
    bouton.disabled = true; bouton.textContent = 'Envoi…';
    api('POST', 'jouer', donnees).then(function (r) {
      envoiEnCours = false;
      if (r.corps && r.corps.jeton) { local.jeton = r.corps.jeton; ecrire(); }
      if (r.corps && r.corps.moi) etat.moi = r.corps.moi;
      if (r.statut === 200 || r.statut === 409) {
        if (r.statut === 200) suivre('avent_reponse', { jour: p.j });
        if (donnees.email && r.statut === 200) suivre('avent_inscription', { nouvelles: donnees.nouvelles ? 'oui' : 'non' });
        dessiner();
        return etat.resultats[p.j] ? ecranResultat(p) : ecranAttente(p, r.statut === 200);
      }
      bouton.disabled = false; bouton.textContent = texte;
      var message = (r.corps && r.corps.message) || 'Un souci de notre côté. Réessayez dans un instant.';
      if (r.statut === 401 && !donnees.email) { delete local.jeton; ecrire(); etat.moi = null; return ecranInscription(p, donnees.reponse); }
      if (r.statut === 403) { charger(true); return ecranMessage(p, 'cadenas', message, ''); }
      if (zoneErreur) { zoneErreur.textContent = message; zoneErreur.hidden = false; zoneErreur.scrollIntoView({ block: 'nearest' }); }
      else {
        var alerte = corps.querySelector('.av-erreur') || corps.insertBefore(el('p', { class: 'av-erreur', role: 'alert' }), corps.querySelector('.av-actions--colle'));
        alerte.textContent = message + ' Votre réponse est toujours là : appuyez de nouveau sur Valider.';
      }
    });
  }

  /* --- après avoir joué --- */
  function appelAction(p) {
    var cadeau = p.j <= 18 || p.j === 24;
    var u = UNIVERS[p.univers] || UNIVERS.final;
    return el('aside', { class: 'av-suite-bloc' }, [
      el('p', { class: 'av-suite-titre', text: cadeau ? 'Une idée cadeau qui ne finit pas dans un placard' : 'Les vacances commencent : venez jouer pour de vrai' }),
      el('p', { text: cadeau ? 'La carte cadeau GAMEDOOR·41 arrive tout de suite par mail. Escape game ou quiz, valable 12 mois.' : u.nom + ', 60 minutes, à Mondeville. Les créneaux des vacances partent vite.' }),
      actions([
        el('a', { class: 'btn btn-primary', href: cadeau ? '/cadeau/' : 'https://gamedoor41.fr/reserver/', text: cadeau ? 'Offrir une carte cadeau' : 'Réserver une session', onclick: function () { suivre('avent_clic', { cible: cadeau ? 'cadeau' : 'reserver', jour: p.j }); } }),
        p.univers !== 'final' ? el('a', { class: 'btn btn-outline', href: u.lien, text: 'Découvrir ' + u.nom }) : null
      ])
    ]);
  }
  function partage() {
    var b = el('button', { type: 'button', class: 'av-partage', text: 'Défier un ami' });
    b.addEventListener('click', function () {
      var donnees = { title: 'Les 24 portes de GAMEDOOR·41', text: 'Une porte par jour, un défi d’une minute, des lots à gagner jusqu’au 24 décembre.', url: location.origin + location.pathname };
      if (navigator.share) navigator.share(donnees).catch(function () {});
      else if (navigator.clipboard) navigator.clipboard.writeText(donnees.url).then(function () { b.textContent = 'Lien copié'; }, function () {});
      suivre('avent_partage', {});
    });
    return b;
  }
  function ecranAttente(p, vientDeJouer) {
    var r = maReponse(p.j), moi = etat.moi;
    montrer([
      entete(p),
      el('div', { class: 'av-info av-info--ok' }, [
        el('div', { class: 'av-info-ico', html: ICONES.coche }),
        el('p', { class: 'av-info-fort', text: (vientDeJouer ? 'C’est noté, ' : 'Déjà joué, ') + moi.prenom + ' !' }),
        el('p', { text: r.leJour ? 'La bonne réponse et le gagnant du jour seront affichés demain à midi, derrière cette porte.' : 'Porte ouverte en rattrapage : la réponse s’affiche le lendemain du jour de la porte, à midi.' }),
        el('p', { class: 'av-info-tickets' }, [el('b', { text: String(moi.tickets) }), ' ' + (moi.tickets > 1 ? 'tickets' : 'ticket') + ' pour le grand tirage du 24 décembre.'])
      ]),
      r.leJour ? bandeLot(p, 'Vous êtes dans le tirage de demain midi : ') : null,
      el('p', { class: 'av-defi-regle', text: r.leJour ? 'Si votre réponse est juste, un ticket de plus s’ajoutera demain midi, avec le résultat.' : 'Une porte ouverte en retard donne 1 ticket.' }),
      appelAction(p),
      actions([el('button', { type: 'button', class: 'btn btn-outline', text: 'Retour au calendrier', onclick: fermer }), partage()], 'av-actions--bas')
    ], p.univers);
  }
  function ecranResultat(p) {
    var r = maReponse(p.j), res = etat.resultats[p.j], d = defis[p.j];
    var donnee = r ? (d && d.type === 'qcm' && d.choix ? d.choix[r.reponse] : null) : null;
    var bonne = /^\d+$/.test(res.bonne) ? res.bonne.split('').join(' ') : res.bonne;
    var vous = !r ? 'Vous n’aviez pas joué cette porte.' : r.juste ? 'Bien vu : c’était votre réponse.' + (r.leJour ? ' Un ticket de plus pour vous.' : '') : 'Ce n’était pas votre réponse' + (donnee ? ' (' + donnee + ')' : '') + '. Vous gardez votre ticket.';
    montrer([
      entete(p, 'Le résultat'),
      el('div', { class: 'av-resultat ' + (r && r.juste ? 'is-juste' : 'is-faux') }, [
        el('p', { class: 'av-resultat-etiquette', text: 'La bonne réponse' }),
        el('p', { class: 'av-resultat-reponse', text: bonne }),
        el('p', { class: 'av-resultat-explication', text: res.explication }),
        el('p', { class: 'av-resultat-vous', text: vous })
      ]),
      el('div', { class: 'av-gagnant' }, [
        el('p', { class: 'av-resultat-etiquette', text: 'Le gagnant du jour' }),
        el('p', { class: 'av-gagnant-nom', text: !res.tire ? 'Tirage en cours…' : res.gagnant || 'Pas de gagnant' }),
        el('p', { text: !res.tire ? 'Revenez dans un instant.' : res.gagnant ? (res.lot ? 'Lot : ' + res.lot + '. ' : '') + 'Tiré au sort parmi ' + pluriel(res.participants, 'joueur') + ' du jour, et prévenu par mail.' : 'Personne n’a joué cette porte le jour même.' })
      ]),
      appelAction(p),
      boutonFermer('Retour au calendrier')
    ], p.univers);
  }

  /* ---------- outils de la page test (aperçus seulement, jamais sur le vrai site) ---------- */
  function ficheEquipe(j) {
    if (!fiches) return null;
    var d = fiches[j - 1];
    if (!d) return null;
    return el('details', { class: 'av-fiche' }, [
      el('summary', { text: 'Fiche pour l’équipe (page test)' }),
      el('p', {}, [el('b', { text: 'Réponse : ' }), d.type === 'qcm' ? d.choix[d.bonne] : d.code]),
      el('p', {}, [el('b', { text: 'Explication affichée le lendemain : ' }), d.explication]),
      el('p', {}, [el('b', { text: 'À préparer par la com : ' }), d.prod || 'Rien.'])
    ]);
  }
  var outilsPoses = false;
  function outilsTest() {
    if (!zoneTest || !etat.essai || outilsPoses) return;
    outilsPoses = true;
    zoneTest.hidden = false;
    var selecteur = document.getElementById('av-test-jour');
    selecteur.innerHTML = '';
    selecteur.appendChild(el('option', { value: '', text: 'la vraie date d’aujourd’hui' }));
    selecteur.appendChild(el('option', { value: '0', text: 'avant le 1er décembre' }));
    for (var j = 1; j <= 24; j++) selecteur.appendChild(el('option', { value: String(j), text: dateTexte(j) }));
    selecteur.appendChild(el('option', { value: '25', text: 'le 25 décembre (terminé)' }));
    selecteur.value = local.jourSimule == null ? '' : String(local.jourSimule);
    selecteur.addEventListener('change', function () {
      if (selecteur.value === '') delete local.jourSimule; else local.jourSimule = parseInt(selecteur.value, 10);
      ecrire(); defis = {}; charger(true);
    });
    document.getElementById('av-test-raz').addEventListener('click', function () {
      api('POST', 'essai/effacer').then(function () { delete local.jeton; delete local.vus; ecrire(); defis = {}; charger(true); });
    });
    var champ = document.getElementById('av-test-code'), tableau = document.getElementById('av-test-tableau'), bloc = document.getElementById('av-test-relecture');
    function chargerFiches() {
      if (!codeEquipe) return;
      api('GET', 'equipe/defis').then(function (r) {
        if (r.statut !== 200 || !r.corps.defis) { champ.value = ''; champ.placeholder = 'Code incorrect'; codeEquipe = ''; return; }
        fiches = r.corps.defis;
        try { sessionStorage.setItem(CLE + '_code', codeEquipe); } catch (e) { /* rien */ }
        champ.value = ''; champ.placeholder = 'Code accepté';
        tableau.innerHTML = '';
        fiches.forEach(function (d) {
          tableau.appendChild(el('tr', {}, [
            el('td', { text: dateTexte(d.j) + (d.gros ? ' ★' : '') }),
            el('td', { text: (UNIVERS[d.univers] || UNIVERS.final).nom }),
            el('td', {}, [el('b', { text: d.titre }), el('br'), d.question]),
            el('td', { text: d.type === 'qcm' ? d.choix[d.bonne] : d.code }),
            el('td', { text: d.prod || '' })
          ]));
        });
        bloc.hidden = false;
      });
    }
    document.getElementById('av-test-code-ok').addEventListener('click', function () { codeEquipe = champ.value.trim(); chargerFiches(); });
    chargerFiches();
  }

  charger();
})();
