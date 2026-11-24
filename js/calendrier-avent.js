/* Les 24 portes de GAMEDOOR·41 : calendrier de l'Avent 2026.
   PAGE TEST : tout reste dans le navigateur (rien n'est envoyé, aucun tirage réel).
   La version en ligne enverra l'inscription et la réponse au serveur, qui vérifiera
   la réponse, la date et l'unicité de la participation. */
(function () {
  'use strict';

  var DEFIS = window.AVENT_DEFIS || [];
  var racine = document.getElementById('av-app');
  if (!racine || !DEFIS.length) return;

  var TEST = racine.hasAttribute('data-test');
  var CLE = 'gd41_avent_2026' + (TEST ? '_test' : '');
  var ANNEE = 2026;
  var JOURS_SEMAINE = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

  var UNIVERS = {
    gav: { nom: 'Garde à Vue', genre: 'Escape game', lien: '/escape-game-caen/garde-a-vue/' },
    psy: { nom: 'Psychiatric', genre: 'Escape game', lien: '/escape-game-caen/psychiatric/' },
    '80s': { nom: 'Back to the 80’s', genre: 'Escape game', lien: '/escape-game-caen/back-to-the-80s/' },
    quiz: { nom: 'Buzz Your Brain', genre: 'Quiz game', lien: '/quiz-game-caen/' },
    final: { nom: 'GAMEDOOR·41', genre: 'La dernière porte', lien: '/' }
  };

  /* ---------- état du joueur (dans ce navigateur) ---------- */
  var etat = lire();
  function lire() {
    try {
      var brut = JSON.parse(localStorage.getItem(CLE) || '{}');
      if (!brut || typeof brut !== 'object') brut = {};
      if (!brut.reponses || typeof brut.reponses !== 'object') brut.reponses = {};
      return brut;
    } catch (e) { return { reponses: {} }; }
  }
  function ecrire() { try { localStorage.setItem(CLE, JSON.stringify(etat)); } catch (e) { /* stockage refusé : on joue quand même */ } }

  /* ---------- quel jour sommes-nous ? ---------- */
  function maintenantParis() {
    var p = {};
    try {
      new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', hour12: false })
        .formatToParts(new Date()).forEach(function (x) { p[x.type] = parseInt(x.value, 10); });
    } catch (e) { var d = new Date(); p = { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), hour: d.getHours() }; }
    return p;
  }
  /* 0 = pas commencé ; 1 à 24 = jour du calendrier ; 25 = terminé */
  function jourCourant() {
    if (TEST) return Math.min(25, Math.max(0, parseInt(etat.jourSimule, 10) || 5));
    var p = maintenantParis();
    if (p.year < ANNEE || (p.year === ANNEE && p.month < 12)) return 0;
    if (p.year > ANNEE) return 25;
    return Math.min(25, p.day);
  }
  function resultatVisible(j) {
    var auj = jourCourant();
    if (TEST) return auj > j;
    if (auj > j + 1) return true;
    return auj === j + 1 && maintenantParis().hour >= 12;
  }
  function dateTexte(j) { return JOURS_SEMAINE[new Date(ANNEE, 11, j).getDay()] + ' ' + (j === 1 ? '1er' : j) + ' décembre'; }

  function defi(j) { for (var i = 0; i < DEFIS.length; i++) if (DEFIS[i].j === j) return DEFIS[i]; return null; }
  function tickets() {
    var n = 0;
    Object.keys(etat.reponses).forEach(function (k) { var r = etat.reponses[k]; n += 1 + (r.juste && r.leJour ? 1 : 0); });
    return n;
  }
  function nbJoues() { return Object.keys(etat.reponses).length; }

  /* ---------- petits outils d'affichage ---------- */
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
    etoile: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-3-5.4 3 1.1-6L3.200 9.400l6.100-.800Z" fill="currentColor"/></svg>',
    son: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 6v12l-4.500-3.500H4Z" fill="currentColor"/><path d="M15.500 9a4.200 4.200 0 0 1 0 6M18 6.500a7.700 7.700 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
  };
  function suivre(nom, params) { if (!TEST && typeof window.gtag === 'function') window.gtag('event', nom, params || {}); }

  /* ---------- la grille des 24 portes ---------- */
  var grille = document.getElementById('av-grille');
  var bandeau = document.getElementById('av-joueur');

  function etatPorte(j) {
    var auj = jourCourant();
    var r = etat.reponses[j];
    if (r) return resultatVisible(j) ? 'resultat' : 'jouee';
    if (j > auj) return 'verrou';
    if (j === auj) return 'jour';
    return 'rattrapage';
  }
  var LIBELLES = { verrou: '', jour: 'Jouer', jouee: 'Joué', resultat: 'Résultat', rattrapage: 'Rattrapage' };

  function dessinerGrille() {
    grille.innerHTML = '';
    DEFIS.forEach(function (d) {
      var e = etatPorte(d.j);
      var u = UNIVERS[d.univers];
      var texteEtat = e === 'verrou' ? 'fermée jusqu’au ' + dateTexte(d.j) : LIBELLES[e].toLowerCase();
      var porte = el('button', {
        type: 'button', class: 'av-porte av-porte--' + d.univers + ' is-' + e + (d.gros ? ' is-gros' : ''),
        'aria-label': 'Porte ' + d.j + ', ' + u.nom + ', ' + texteEtat + (d.gros ? ', gros lot' : ''),
        'data-libelle': d.j + ' · ' + LIBELLES[e],
        onclick: function () { ouvrir(d.j, porte); }
      }, [
        el('span', { class: 'av-porte-fond', 'aria-hidden': 'true' }),
        el('span', { class: 'av-porte-battant', 'aria-hidden': 'true' }, [
          d.gros ? el('span', { class: 'av-porte-gros', html: ICONES.etoile }) : null,
          el('span', { class: 'av-porte-num', text: String(d.j) }),
          el('span', { class: 'av-porte-etat', html: e === 'verrou' ? ICONES.cadenas : (e === 'jouee' || e === 'resultat' ? ICONES.coche : '') + '<b>' + LIBELLES[e] + '</b>' }),
          el('span', { class: 'av-porte-poignee' })
        ])
      ]);
      grille.appendChild(porte);
    });
    dessinerJoueur();
  }

  function dessinerJoueur() {
    var auj = jourCourant();
    var t = tickets();
    bandeau.innerHTML = '';
    var message;
    if (auj === 0) message = 'La première porte s’ouvre le mardi 1er décembre.';
    else if (auj >= 25) message = 'Le calendrier est terminé. Merci d’avoir joué !';
    else if (etat.reponses[auj]) message = 'Porte du jour jouée. Résultat demain à midi, et une nouvelle porte dès minuit.';
    else message = 'La porte ' + auj + ' vous attend : un défi d’une minute.';
    bandeau.appendChild(el('p', { class: 'av-joueur-msg' }, [etat.prenom ? el('strong', { text: 'Bonjour ' + etat.prenom + '. ' }) : null, message]));
    bandeau.appendChild(el('p', { class: 'av-joueur-compte' }, [
      el('span', {}, [el('b', { text: String(nbJoues()) }), ' porte' + (nbJoues() > 1 ? 's' : '') + ' ouverte' + (nbJoues() > 1 ? 's' : '') + ' sur 24']),
      el('span', {}, [el('b', { text: String(t) }), ' ticket' + (t > 1 ? 's' : '') + ' pour le grand tirage'])
    ]));
    if (auj >= 1 && auj <= 24 && !etat.reponses[auj]) {
      bandeau.appendChild(el('button', { type: 'button', class: 'btn btn-primary av-joueur-btn', text: 'Ouvrir la porte ' + auj, onclick: function () { ouvrir(auj); } }));
    }
  }

  /* ---------- la fenêtre du défi ---------- */
  var dialogue = document.getElementById('av-dialogue');
  var corps = document.getElementById('av-dialogue-corps');
  var retourFocus = null;
  var minuteur = null;
  document.getElementById('av-dialogue-fermer').addEventListener('click', fermer);
  dialogue.addEventListener('click', function (ev) { if (ev.target === dialogue) fermer(); });
  dialogue.addEventListener('close', function () { arreterSon(); if (minuteur) { clearInterval(minuteur); minuteur = null; } if (retourFocus && retourFocus.focus) retourFocus.focus(); });
  function fermer() { if (dialogue.open) dialogue.close(); }
  function montrer(noeuds, classe) {
    corps.className = 'av-dialogue-corps' + (classe ? ' ' + classe : '');
    corps.innerHTML = '';
    noeuds.forEach(function (n) { if (n) corps.appendChild(n); });
    if (!dialogue.open) { if (dialogue.showModal) dialogue.showModal(); else dialogue.setAttribute('open', ''); }
    corps.scrollTop = 0;
  }
  function entete(d, sousTitre) {
    var u = UNIVERS[d.univers];
    return el('header', { class: 'av-defi-tete av-teinte--' + d.univers }, [
      el('p', { class: 'av-defi-surtitre' }, [el('span', { class: 'av-pastille', text: 'Porte ' + d.j }), ' ' + u.genre + ' · ' + u.nom]),
      el('h2', { class: 'av-defi-titre', id: 'av-dialogue-titre', text: d.titre }),
      sousTitre ? el('p', { class: 'av-defi-sous', text: sousTitre }) : null
    ]);
  }

  function ouvrir(j, origine) {
    var d = defi(j);
    if (!d) return;
    retourFocus = origine || document.activeElement;
    var e = etatPorte(j);
    suivre('avent_porte', { jour: j, etat: e });
    if (e === 'verrou') {
      return montrer([entete(d), el('div', { class: 'av-info' }, [
        el('div', { class: 'av-info-ico', html: ICONES.cadenas }),
        el('p', { class: 'av-info-fort', text: 'Cette porte s’ouvre le ' + dateTexte(j) + '.' }),
        el('p', { text: 'Une porte par jour, du 1er au 24 décembre. Revenez ce jour-là : le défi dure une minute.' })
      ]), boutonFermer('D’accord')]);
    }
    if (e === 'jouee') return ecranAttente(d);
    if (e === 'resultat') return ecranResultat(d);
    ecranDefi(d, e === 'rattrapage');
  }
  function boutonFermer(texte) { return el('div', { class: 'av-actions' }, [el('button', { type: 'button', class: 'btn btn-outline', text: texte || 'Fermer', onclick: fermer })]); }

  /* --- visuels des défis --- */
  function visuel(d) {
    var v = d.visuel;
    if (v === 'indices') return el('ul', { class: 'av-indices' }, d.indices.map(function (i) {
      return el('li', {}, [el('span', { class: 'av-indices-code' }, i[0].split(' ').map(function (c) { return el('b', { text: c }); })), el('span', { class: 'av-indices-note', text: i[1] })]);
    }));
    if (v === 'rebus') return el('p', { class: 'av-rebus', role: 'img', 'aria-label': 'Quatre dessins : un fantôme, un panneau d’interdiction, un camion de pompiers, une ville' }, d.rebus.map(function (r) { return el('span', { text: r }); }));
    if (v === 'paroles') return el('ul', { class: 'av-paroles' }, d.paroles.map(function (p) { return el('li', {}, [el('b', { text: p[0] }), el('span', { text: p[1] })]); }));
    if (v === 'liste') return el('ol', { class: 'av-liste' }, d.liste.map(function (l) { return el('li', { text: l }); }));
    if (v === 'suite') return el('p', { class: 'av-suite' }, d.suite.map(function (s) { return el('span', { class: s === '?' ? 'is-vide' : '', text: s }); }));
    if (v === 'mot') return el('p', { class: 'av-mot', 'aria-label': d.mot.split('').join(' ') }, d.mot.split('').map(function (c) { return el('span', { text: c }); }));
    if (v === 'miroir') return el('div', { class: 'av-miroir' }, [el('p', { 'aria-label': 'Un message écrit à l’envers, comme vu dans un miroir', text: d.miroir })]);
    if (v === 'photo') return el('figure', { class: 'av-photo' }, [el('img', { src: d.photo.src, alt: d.photo.alt, loading: 'lazy', decoding: 'async' })]);
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
        '<line x1="50" y1="50" x2="50" y2="26" class="petite" transform="rotate(255 50 50)"/><line x1="50" y1="50" x2="50" y2="16" class="grande" transform="rotate(180 50 50)"/><circle cx="50" cy="50" r="3.200" class="axe"/></svg>' +
        '<span>Vue dans le miroir</span>' });
    }
    if (v === 'morse') {
      var lettres = d.morse.mot.split('');
      var codes = {}; d.morse.table.forEach(function (t) { codes[t[0]] = t[1]; });
      return el('div', { class: 'av-morse' }, [
        el('p', { class: 'av-morse-message', 'aria-label': 'Le message en morse, cinq lettres' }, lettres.map(function (l) { return el('span', { text: codes[l] }); })),
        el('ul', { class: 'av-morse-table', 'aria-label': 'Alphabet morse utile' }, d.morse.table.map(function (t) { return el('li', {}, [el('b', { text: t[0] }), el('span', { text: t[1] })]); }))
      ]);
    }
    return null;
  }

  /* --- son fabriqué par la page (aucun enregistrement) --- */
  var ctxAudio = null, sonEnCours = [];
  var FREQ = { C: 261.63, D: 293.66, E: 329.63, F: 349.23, G: 392.0, A: 440.0 };
  var MORSE = { B: '-...', E: '.', I: '..', L: '.-..', R: '.-.', T: '-', U: '..-', V: '...-' };
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
    if (!ctxAudio) ctxAudio = new AC();
    if (ctxAudio.state === 'suspended') ctxAudio.resume();
    arreterSon();
    var t = ctxAudio.currentTime + 0.08, t0 = t;
    if (a.genre === 'melodie') {
      var temps = 0.27;
      a.notes.forEach(function (n) { bip(FREQ[n[0]] * 2, t, n[1] * temps * 0.92, 'triangle', 0.28); t += n[1] * temps; });
    } else {
      var u = 0.085;
      a.mot.split('').forEach(function (l) {
        MORSE[l].split('').forEach(function (s) { var d = s === '.' ? u : u * 3; bip(640, t, d, 'sine', 0.3); t += d + u; });
        t += u * 2.4;
      });
    }
    return (t - t0) * 1000;
  }
  function boutonSon(d) {
    var b = el('button', { type: 'button', class: 'av-son' });
    function repos() { b.innerHTML = ICONES.son + '<span>' + (b.dataset.ecoute ? 'Réécouter' : 'Écouter') + '</span>'; b.disabled = false; }
    b.addEventListener('click', function () {
      var ms = jouerSon(d.audio);
      if (!ms) { b.innerHTML = '<span>Le son ne fonctionne pas sur cet appareil.</span>'; return; }
      b.dataset.ecoute = '1'; b.disabled = true; b.innerHTML = ICONES.son + '<span>Écoute en cours…</span>';
      setTimeout(repos, ms + 150);
    });
    repos();
    return b;
  }

  /* --- le défi --- */
  function ecranDefi(d, rattrapage) {
    if (d.memoire && !(etat.vus && etat.vus[d.j])) return ecranMemoire(d, rattrapage);
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
      if (!etat.email) return ecranInscription(d, reponse, rattrapage);
      enregistrer(d, reponse, rattrapage);
    });
    montrer([
      entete(d, rattrapage ? 'Porte en rattrapage : 1 ticket pour le grand tirage.' : null),
      el('p', { class: 'av-defi-intro', text: d.intro }),
      visuel(d),
      d.audio ? boutonSon(d) : null,
      el('p', { class: 'av-defi-question', text: d.question }),
      zone,
      el('p', { class: 'av-defi-regle', text: 'Une seule réponse par porte. Prenez votre temps.' }),
      el('div', { class: 'av-actions av-actions--colle' }, [valider]),
      ficheEquipe(d)
    ], 'av-teinte--' + d.univers);
  }

  function ecranMemoire(d, rattrapage) {
    var m = d.memoire;
    var lancer = el('button', { type: 'button', class: 'btn btn-primary', text: 'Je suis prêt' });
    lancer.addEventListener('click', function () {
      etat.vus = etat.vus || {}; etat.vus[d.j] = true; ecrire();
      var reste = m.secondes;
      var compteur = el('span', { text: String(reste) });
      var contenu = m.photo
        ? el('figure', { class: 'av-photo av-photo--haute' }, [el('img', { src: m.photo.src, alt: m.photo.alt })])
        : el('dl', { class: 'av-dossier' }, m.lignes.reduce(function (acc, l) { acc.push(el('dt', { text: l[0] }), el('dd', { text: l[1] })); return acc; }, []));
      montrer([entete(d), el('p', { class: 'av-chrono', 'aria-live': 'polite' }, ['Mémorisez : encore ', compteur, ' s']), el('div', { class: 'av-chrono-barre' }, [el('i', { style: 'animation-duration:' + m.secondes + 's' })]), contenu], 'av-teinte--' + d.univers);
      minuteur = setInterval(function () {
        reste--; compteur.textContent = String(Math.max(0, reste));
        if (reste <= 0) { clearInterval(minuteur); minuteur = null; ecranDefi(d, rattrapage); }
      }, 1000);
    });
    montrer([
      entete(d),
      el('p', { class: 'av-defi-intro', text: d.intro }),
      el('div', { class: 'av-info' }, [el('p', { class: 'av-info-fort', text: m.secondes + ' secondes, une seule fois.' }), el('p', { text: 'Ensuite, l’image disparaît et la question arrive.' })]),
      el('div', { class: 'av-actions' }, [lancer]),
      ficheEquipe(d)
    ], 'av-teinte--' + d.univers);
  }

  /* --- l'inscription (une seule fois) --- */
  function ecranInscription(d, reponse, rattrapage) {
    var prenom = el('input', { type: 'text', id: 'av-prenom', name: 'prenom', autocomplete: 'given-name', maxlength: '30', required: true });
    var email = el('input', { type: 'email', id: 'av-email', name: 'email', autocomplete: 'email', inputmode: 'email', maxlength: '120', required: true });
    var reglement = el('input', { type: 'checkbox', id: 'av-reglement', required: true });
    var nouvelles = el('input', { type: 'checkbox', id: 'av-nouvelles' });
    var erreur = el('p', { class: 'av-erreur', role: 'alert', hidden: true });
    var form = el('form', { class: 'av-form', novalidate: true }, [
      el('label', { for: 'av-prenom', text: 'Votre prénom' }), prenom,
      el('label', { for: 'av-email', text: 'Votre adresse mail' }), email,
      el('p', { class: 'av-form-aide', text: 'Elle sert à vous prévenir si vous gagnez, et à retrouver vos tickets chaque jour. Aucun mot de passe.' }),
      el('label', { class: 'av-case', for: 'av-reglement' }, [reglement, el('span', { html: 'J’ai lu et j’accepte le <a href="#av-reglement-bloc">règlement du jeu</a>. J’ai 18 ans ou plus.' })]),
      el('label', { class: 'av-case', for: 'av-nouvelles' }, [nouvelles, el('span', { text: 'Je veux bien recevoir les nouvelles de GAMEDOOR·41 par mail (si vous voulez, sans effet sur vos chances).' })]),
      erreur,
      el('div', { class: 'av-actions' }, [el('button', { type: 'submit', class: 'btn btn-primary', text: 'Enregistrer ma réponse' })]),
      TEST ? el('p', { class: 'av-note-test', text: 'Page test : rien n’est envoyé, tout reste sur cet appareil.' }) : null
    ]);
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var p = prenom.value.trim(), m = email.value.trim().toLowerCase();
      var souci = p.length < 2 ? 'Indiquez votre prénom.' : !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(m) ? 'Cette adresse mail ne semble pas complète.' : !reglement.checked ? 'Cochez la case du règlement pour participer.' : '';
      if (souci) { erreur.textContent = souci; erreur.hidden = false; return; }
      etat.prenom = p; etat.email = m; etat.nouvelles = nouvelles.checked;
      suivre('avent_inscription', { nouvelles: nouvelles.checked ? 'oui' : 'non' });
      enregistrer(d, reponse, rattrapage);
    });
    montrer([entete(d, 'Dernière étape avant de valider'), el('p', { class: 'av-defi-intro', text: 'Votre réponse est prête. Dites-nous à qui l’attribuer : c’est demandé une seule fois.' }), form], 'av-teinte--' + d.univers);
    prenom.focus();
  }

  function estJuste(d, reponse) { return d.type === 'qcm' ? reponse === d.bonne : String(reponse) === d.code; }
  function enregistrer(d, reponse, rattrapage) {
    etat.reponses[d.j] = { reponse: reponse, juste: estJuste(d, reponse), leJour: !rattrapage, jourJoue: jourCourant() };
    ecrire();
    suivre('avent_reponse', { jour: d.j, rattrapage: rattrapage ? 'oui' : 'non' });
    dessinerGrille();
    ecranAttente(d, true);
  }

  /* --- après avoir joué --- */
  function appelAction(d) {
    var cadeau = d.j <= 18 || d.j === 24;
    var u = UNIVERS[d.univers];
    return el('aside', { class: 'av-suite-bloc' }, [
      el('p', { class: 'av-suite-titre', text: cadeau ? 'Une idée cadeau qui ne finit pas dans un placard' : 'Les vacances commencent : venez jouer pour de vrai' }),
      el('p', { text: cadeau ? 'La carte cadeau GAMEDOOR·41 arrive tout de suite par mail. Escape game ou quiz, valable 12 mois.' : u.nom + ', 60 minutes, à Mondeville. Les créneaux des vacances partent vite.' }),
      el('div', { class: 'av-actions' }, [
        el('a', { class: 'btn btn-primary', href: cadeau ? '/cadeau/' : 'https://gamedoor41.fr/reserver/', text: cadeau ? 'Offrir une carte cadeau' : 'Réserver une session', onclick: function () { suivre('avent_clic', { cible: cadeau ? 'cadeau' : 'reserver', jour: d.j }); } }),
        d.univers !== 'final' ? el('a', { class: 'btn btn-outline', href: u.lien, text: 'Découvrir ' + u.nom }) : null
      ])
    ]);
  }
  function partage() {
    var b = el('button', { type: 'button', class: 'av-partage', text: 'Défier un ami' });
    b.addEventListener('click', function () {
      var donnees = { title: 'Les 24 portes de GAMEDOOR·41', text: 'Une porte par jour, un défi d’une minute, des lots à gagner jusqu’au 24 décembre.', url: location.origin + location.pathname };
      if (navigator.share) navigator.share(donnees).catch(function () {});
      else if (navigator.clipboard) navigator.clipboard.writeText(donnees.url).then(function () { b.textContent = 'Lien copié'; });
      suivre('avent_partage', {});
    });
    return b;
  }
  function ecranAttente(d, vientDeJouer) {
    var r = etat.reponses[d.j];
    montrer([
      entete(d),
      el('div', { class: 'av-info av-info--ok' }, [
        el('div', { class: 'av-info-ico', html: ICONES.coche }),
        el('p', { class: 'av-info-fort', text: (vientDeJouer ? 'C’est noté' : 'Déjà joué') + (etat.prenom ? ', ' + etat.prenom : '') + ' !' }),
        el('p', { text: r.leJour ? 'La bonne réponse et le gagnant du jour seront affichés demain à midi, derrière cette porte.' : 'Porte ouverte en rattrapage : la réponse s’affiche dès demain midi.' }),
        el('p', { class: 'av-info-tickets' }, [el('b', { text: String(tickets()) }), ' ticket' + (tickets() > 1 ? 's' : '') + ' pour le grand tirage du 24 décembre.'])
      ]),
      el('p', { class: 'av-defi-regle', text: r.leJour ? 'Chaque porte ouverte le jour même donne 1 ticket, et 1 de plus si la réponse est juste.' : 'Une porte ouverte en retard donne 1 ticket.' }),
      appelAction(d),
      el('div', { class: 'av-actions av-actions--bas' }, [partage(), el('button', { type: 'button', class: 'btn btn-outline', text: 'Retour au calendrier', onclick: fermer })]),
      TEST ? el('div', { class: 'av-actions' }, [el('button', { type: 'button', class: 'av-lien-test', text: 'Page test : voir tout de suite l’écran du lendemain', onclick: function () { ecranResultat(d); } })]) : null
    ], 'av-teinte--' + d.univers);
  }
  function ecranResultat(d) {
    var r = etat.reponses[d.j];
    var bonne = d.type === 'qcm' ? d.choix[d.bonne] : d.code.split('').join(' ');
    var donnee = d.type === 'qcm' ? d.choix[r.reponse] : String(r.reponse).split('').join(' ');
    montrer([
      entete(d, 'Le résultat'),
      el('div', { class: 'av-resultat ' + (r.juste ? 'is-juste' : 'is-faux') }, [
        el('p', { class: 'av-resultat-etiquette', text: 'La bonne réponse' }),
        el('p', { class: 'av-resultat-reponse', text: bonne }),
        el('p', { class: 'av-resultat-explication', text: d.explication }),
        el('p', { class: 'av-resultat-vous' }, [r.juste ? 'Bien vu : c’était votre réponse.' : 'Vous aviez répondu : ' + donnee + '.'])
      ]),
      el('div', { class: 'av-gagnant' }, [
        el('p', { class: 'av-resultat-etiquette', text: 'Le gagnant du jour' }),
        el('p', { class: 'av-gagnant-nom', text: TEST ? 'Prénom + initiale du gagnant' : 'Tirage en cours' }),
        el('p', { text: TEST ? 'Page test : ici s’afficheront le prénom du gagnant tiré au sort et son lot. Il est prévenu par mail.' : 'Le gagnant est prévenu par mail.' })
      ]),
      appelAction(d),
      boutonFermer('Retour au calendrier')
    ], 'av-teinte--' + d.univers);
  }

  /* --- fiche pour l'équipe (page test seulement) --- */
  function ficheEquipe(d) {
    if (!TEST) return null;
    var bonne = d.type === 'qcm' ? d.choix[d.bonne] : d.code;
    return el('details', { class: 'av-fiche' }, [
      el('summary', { text: 'Fiche pour l’équipe (page test)' }),
      el('p', {}, [el('b', { text: 'Réponse : ' }), bonne]),
      el('p', {}, [el('b', { text: 'Explication affichée le lendemain : ' }), d.explication]),
      el('p', {}, [el('b', { text: 'À préparer par la com : ' }), d.prod])
    ]);
  }

  /* ---------- outils de la page test ---------- */
  var selecteur = document.getElementById('av-test-jour');
  if (TEST && selecteur) {
    selecteur.innerHTML = '';
    selecteur.appendChild(el('option', { value: '0', text: 'Avant le 1er décembre' }));
    for (var j = 1; j <= 24; j++) selecteur.appendChild(el('option', { value: String(j), text: dateTexte(j) }));
    selecteur.appendChild(el('option', { value: '25', text: 'Après le 24 décembre' }));
    selecteur.value = String(jourCourant());
    selecteur.addEventListener('change', function () { etat.jourSimule = parseInt(selecteur.value, 10); ecrire(); dessinerGrille(); });
    var raz = document.getElementById('av-test-raz');
    if (raz) raz.addEventListener('click', function () { var s = etat.jourSimule; etat = { reponses: {}, jourSimule: s }; ecrire(); dessinerGrille(); });
    var tableau = document.getElementById('av-test-tableau');
    if (tableau) DEFIS.forEach(function (d) {
      tableau.appendChild(el('tr', {}, [
        el('td', { text: dateTexte(d.j) + (d.gros ? ' ★' : '') }),
        el('td', { text: UNIVERS[d.univers].nom }),
        el('td', {}, [el('b', { text: d.titre }), el('br'), d.question]),
        el('td', { text: d.type === 'qcm' ? d.choix[d.bonne] : d.code }),
        el('td', { text: d.prod })
      ]));
    });
  }

  dessinerGrille();
})();
