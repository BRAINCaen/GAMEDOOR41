// ============================================================
// RAPPORT SEO GAMEDOOR·41 — alimentation du poste de pilotage
// ============================================================
//
// Ce script tourne chaque nuit sur les serveurs de Google. Il interroge
// Search Console (et Google Analytics si une propriete est configuree),
// puis ecrit le resultat dans un fichier Google Drive : gamedoor41-seo.json
//
// Le poste de pilotage (artifact claude.ai) lit ce fichier via le connecteur
// Google Drive. C'est le seul chemin possible : une page publiee sur claude.ai
// n'a pas le droit d'appeler un site externe, elle ne peut passer que par les
// connecteurs autorises par la personne qui la consulte.
//
//   Search Console ─┐
//                   ├─> Apps Script (cette nuit) ─> Drive ─> poste de pilotage
//   Analytics ──────┘
//
// MISE EN ROUTE — voir INSTALLATION.md dans ce dossier.
// Rien a modifier ici : les reglages vivent dans les proprietes du script.
// ============================================================

/** Nom du fichier ecrit sur le Drive. Le poste de pilotage cherche ce nom exact. */
var NOM_FICHIER = 'gamedoor41-seo.json';

/** Nombre de jours d'historique quotidien a recuperer (Search Console en garde 16 mois). */
var JOURS_HISTORIQUE = 480;

/** Fenetre detaillee pour les requetes et les pages. */
var JOURS_DETAIL = 90;

// ------------------------------------------------------------
// Point d'entree : c'est cette fonction qu'il faut declencher
// ------------------------------------------------------------
function majRapportSeo() {
  var debut = new Date();
  var rapport = {
    schema: 1,
    site: 'gamedoor41.fr',
    genere: new Date().toISOString(),
    source: 'Apps Script rapport-seo-gamedoor41',
    gsc: null,
    ga4: null,
    erreurs: []
  };

  try {
    rapport.gsc = collecterSearchConsole();
  } catch (e) {
    rapport.erreurs.push('Search Console : ' + e.message);
  }

  // L'ancienne propriete (brain-escapegame-caen.fr) reste interrogeable : elle
  // porte l'historique d'avant la bascule, en valeurs exactes. Les e-mails ne
  // donnaient que des valeurs arrondies, et il leur manquait des mois entiers.
  try {
    rapport.histo = collecterHistorique(rapport.gsc ? rapport.gsc.propriete : null);
  } catch (e) {
    rapport.erreurs.push('Historique : ' + e.message);
  }

  try {
    rapport.ga4 = collecterAnalytics();
  } catch (e) {
    rapport.erreurs.push('Analytics : ' + e.message);
  }

  try {
    rapport.audit = auditTechnique();
    var bloquants = rapport.audit.controles.filter(function (c) { return c.etat === 'bloquant'; });
    Logger.log('Audit technique : ' + rapport.audit.controles.length + ' controles, ' +
      (bloquants.length ? bloquants.length + ' BLOQUANT(S) — ' +
        bloquants.map(function (c) { return c.titre; }).join(', ')
        : 'aucun point bloquant'));
  } catch (e) {
    rapport.erreurs.push('Audit technique : ' + e.message);
  }

  // Lu AVANT d'ecrire : sert a calculer les ecarts d'avis d'une nuit sur
  // l'autre, et a retrouver l'identifiant de la fiche si le quota Google est
  // atteint.
  var precedent = lireRapportPrecedent();
  try {
    rapport.concurrence = veilleConcurrence(precedent);
    Logger.log('Concurrence : ' + (rapport.concurrence.configure
      ? rapport.concurrence.enseignes.length + ' enseignes relevees'
      : 'non configuree (PLACES_API_KEY absente)'));
    if (rapport.concurrence && rapport.concurrence.echecs && rapport.concurrence.echecs.length) {
      rapport.erreurs.push('Concurrence : ' + rapport.concurrence.echecs.join(' | '));
    }
  } catch (e) {
    rapport.erreurs.push('Concurrence : ' + e.message);
  }

  try {
    rapport.fiche = collecterFicheGoogle(precedent);
    if (rapport.fiche && rapport.fiche.messages && rapport.fiche.messages.length) {
      rapport.erreurs.push('Fiche Google : ' + rapport.fiche.messages.join(' | '));
    }
  } catch (e) {
    rapport.erreurs.push('Fiche Google : ' + e.message);
  }

  ecrireSurDrive(rapport);

  var duree = Math.round((new Date() - debut) / 1000);
  Logger.log('Rapport ecrit en ' + duree + ' s. Erreurs : ' +
    (rapport.erreurs.length ? rapport.erreurs.join(' | ') : 'aucune'));
  return rapport;
}

// ------------------------------------------------------------
// Search Console
// ------------------------------------------------------------
function collecterSearchConsole() {
  var site = trouverPropriete();
  var fin = decalerJours(new Date(), -2);   // GSC a 2 a 3 jours de retard
  var debutHisto = decalerJours(fin, -JOURS_HISTORIQUE);
  var debutDetail = decalerJours(fin, -JOURS_DETAIL);

  var jours = interrogerGsc(site, debutHisto, fin, ['date'], 25000)
    .map(function (r) {
      return {
        d: r.keys[0],
        c: r.clicks,
        i: r.impressions,
        ctr: arrondir(r.ctr * 100, 2),
        p: arrondir(r.position, 2)
      };
    });

  var requetes = interrogerGsc(site, debutDetail, fin, ['query'], 1000)
    .map(function (r) {
      return {
        q: r.keys[0],
        c: r.clicks,
        i: r.impressions,
        ctr: arrondir(r.ctr * 100, 2),
        p: arrondir(r.position, 2)
      };
    });

  var pages = interrogerGsc(site, debutDetail, fin, ['page'], 500)
    .map(function (r) {
      return {
        u: String(r.keys[0]).replace(/^https?:\/\/(www\.)?gamedoor41\.fr/, '') || '/',
        c: r.clicks,
        i: r.impressions,
        ctr: arrondir(r.ctr * 100, 2),
        p: arrondir(r.position, 2)
      };
    });

  var appareils = interrogerGsc(site, debutDetail, fin, ['device'], 10)
    .map(function (r) {
      return { a: r.keys[0], c: r.clicks, i: r.impressions, ctr: arrondir(r.ctr * 100, 2), p: arrondir(r.position, 2) };
    });

  // Totaux mensuels, calcules a partir du quotidien (pas d'arrondi Google ici)
  var parMois = {};
  jours.forEach(function (j) {
    var m = j.d.slice(0, 7);
    if (!parMois[m]) parMois[m] = { mois: m, c: 0, i: 0, jours: 0 };
    parMois[m].c += j.c;
    parMois[m].i += j.i;
    parMois[m].jours++;
  });
  var mois = Object.keys(parMois).sort().map(function (m) {
    var x = parMois[m];
    x.ctr = x.i ? arrondir(x.c / x.i * 100, 2) : 0;
    return x;
  });

  var totC = jours.reduce(function (s, j) { return s + j.c; }, 0);
  var totI = jours.reduce(function (s, j) { return s + j.i; }, 0);

  return {
    propriete: site,
    periode: { debut: fmtDate(debutHisto), fin: fmtDate(fin) },
    periodeDetail: { debut: fmtDate(debutDetail), fin: fmtDate(fin) },
    resume: { clics: totC, impressions: totI, ctr: totI ? arrondir(totC / totI * 100, 2) : 0 },
    jours: jours,
    mois: mois,
    requetes: requetes,
    pages: pages,
    appareils: appareils,
    fenetres: collecterFenetres(site, fin)
  };
}

/**
 * Trois fenetres de 28 jours strictement comparables, sur les requetes et les
 * pages : les 28 derniers jours, les 28 precedents, et les 28 memes jours il y
 * a un an.
 *
 * Pourquoi : le bloc "requetes" ci-dessus est un cumul unique sur 90 jours. Il
 * dit qui est present, jamais qui MONTE ou qui DESCEND. Or c'est exactement ce
 * qu'un suivi quotidien doit reperer — une requete qui decroche se rattrape en
 * une semaine, pas en trois mois.
 *
 * La fenetre "an dernier" sert a l'anticipation saisonniere : sur une activite
 * de loisir, comparer a la periode precedente confond la tendance reelle avec
 * le calendrier scolaire.
 *
 * Six appels supplementaires par nuit, tres en dessous des quotas.
 */
function collecterFenetres(site, fin) {
  var mapper = function (r) {
    return { k: r.keys[0], c: r.clicks, i: r.impressions,
      ctr: arrondir(r.ctr * 100, 2), p: arrondir(r.position, 2) };
  };
  var fenetre = function (finF, jours) {
    var debutF = decalerJours(finF, -jours);
    var res = { debut: fmtDate(debutF), fin: fmtDate(finF), requetes: [], pages: [] };
    try {
      res.requetes = interrogerGsc(site, debutF, finF, ['query'], 500).map(mapper);
      res.pages = interrogerGsc(site, debutF, finF, ['page'], 300).map(function (r) {
        var m = mapper(r);
        m.k = String(m.k).replace(/^https?:\/\/(www\.)?gamedoor41\.fr/, '') || '/';
        return m;
      });
    } catch (e) {
      Logger.log('Fenetre ' + res.debut + ' impossible : ' + e.message);
    }
    return res;
  };

  var finPrecedente = decalerJours(fin, -29);          // la veille du debut courant
  return {
    courante: fenetre(fin, 28),
    precedente: fenetre(finPrecedente, 28),
    anDernier: fenetre(decalerJours(fin, -364), 28)    // meme jour de semaine
  };
}

/**
 * Historique des autres proprietes de la meme activite (l'ancien domaine).
 * On ne recupere que les totaux par jour et par mois : le detail des requetes
 * ne sert a rien sur un domaine qui ne recoit plus de trafic, et ca garde le
 * fichier leger.
 */
function collecterHistorique(proprietePrincipale) {
  var rep = appelGoogle('https://www.googleapis.com/webmasters/v3/sites');
  var candidates = (rep.siteEntry || []).filter(function (s) {
    // meme activite, proprietes verifiees uniquement, et pas celle deja traitee
    return /brain-escapegame-caen|buzzyourbrain-caen|gamedoor41/.test(s.siteUrl) &&
      s.permissionLevel !== 'siteUnverifiedUser' &&
      s.siteUrl !== proprietePrincipale;
  });

  // Un meme domaine peut exister sous deux formes : propriete de domaine
  // (sc-domain:) et prefixe d'URL (https://www...). Elles n'ont PAS le meme
  // historique — Search Console ne remplit une propriete qu'a partir de sa
  // validation. On interroge donc toutes les formes et on garde celle qui
  // remonte le plus loin, au lieu de parier sur un type.
  var formes = {};
  candidates.forEach(function (s) {
    var cle = s.siteUrl.replace(/^sc-domain:/, '').replace(/^https?:\/\/(www\.)?/, '').replace(/\/+$/, '');
    if (!formes[cle]) formes[cle] = [];
    formes[cle].push(s.siteUrl);
  });

  var fin = decalerJours(new Date(), -2);
  var debut = decalerJours(fin, -JOURS_HISTORIQUE);
  var out = [];

  Object.keys(formes).forEach(function (cle) {
    var meilleur = null;
    formes[cle].forEach(function (candidat) {
      try {
        var lignes = interrogerGsc(candidat, debut, fin, ['date'], 25000);
        Logger.log('  ' + candidat + ' : ' + lignes.length + ' jours');
        if (!meilleur || lignes.length > meilleur.lignes.length) {
          meilleur = { site: candidat, lignes: lignes };
        }
      } catch (e) {
        Logger.log('  ' + candidat + ' inaccessible : ' + e.message);
      }
    });
    if (!meilleur) return;

    var site = meilleur.site;
    try {
      var jours = meilleur.lignes.map(function (r) {
        return { d: r.keys[0], c: r.clicks, i: r.impressions,
          ctr: arrondir(r.ctr * 100, 2), p: arrondir(r.position, 2) };
      });
      if (!jours.length) { Logger.log('Historique ' + site + ' : aucune donnee'); return; }

      var parMois = {};
      jours.forEach(function (j) {
        var m = j.d.slice(0, 7);
        if (!parMois[m]) parMois[m] = { mois: m, c: 0, i: 0, jours: 0 };
        parMois[m].c += j.c; parMois[m].i += j.i; parMois[m].jours++;
      });
      var mois = Object.keys(parMois).sort().map(function (m) {
        var x = parMois[m];
        x.ctr = x.i ? arrondir(x.c / x.i * 100, 2) : 0;
        return x;
      });

      out.push({ propriete: site, domaine: cle, jours: jours, mois: mois });
      Logger.log('Historique ' + site + ' : ' + jours.length + ' jours, ' + mois.length + ' mois');
    } catch (e) {
      Logger.log('Historique ' + site + ' impossible : ' + e.message);
    }
  });
  return out;
}

// ------------------------------------------------------------
// Fiche Google (Business Profile) — la couche locale
// ------------------------------------------------------------
// Search Console dit ce qui se passe sur le SITE. La fiche Google dit ce qui
// se passe sur la FICHE : combien de fois elle est apparue dans Maps et dans
// la recherche, combien de personnes ont demande l'itineraire, appele, ou
// clique vers le site. Et surtout : LES MOTS QUE LES GENS ONT TAPES pour
// tomber dessus, ce que Search Console ne montre jamais.
//
// C'est la donnee que les outils de suivi local facturent. Elle est fournie
// gratuitement par Google a qui possede la fiche.
//
// Trois API distinctes sont necessaires :
//   1. Account Management  — trouver le compte
//   2. Business Information — trouver la fiche dans ce compte
//   3. Business Performance — les chiffres
//
// Chaque etape est isolee : si l'une echoue, le message brut de Google est
// conserve dans le rapport. C'est volontaire — l'acces aux API Business
// Profile doit parfois etre demande a Google, et seul le message exact permet
// de savoir laquelle des trois manque.
function collecterFicheGoogle(precedent) {
  var out = { configure: false, messages: [] };
  var note = function (m) { out.messages.push(m); Logger.log('Fiche Google : ' + m); };
  var props = PropertiesService.getScriptProperties();

  // Les API Business Profile ont un quota par MINUTE tres bas — deux lancements
  // rapproches suffisent a declencher un HTTP 429. La decouverte du compte puis
  // de la fiche coute deux appels a chaque fois, pour un identifiant qui ne
  // change jamais. On le retient donc definitivement des la premiere reussite,
  // et on retombe sur celui du rapport de la veille si le quota est atteint.
  var force = props.getProperty('GBP_LOCATION')
    || (precedent && precedent.fiche && precedent.fiche.location) || null;
  var location = force ? String(force).replace(/^locations\//, '') : null;
  if (location && !props.getProperty('GBP_LOCATION')) {
    props.setProperty('GBP_LOCATION', location);   // repris du rapport precedent
  }

  if (!location) {
    var comptes;
    try {
      comptes = appelGoogle('https://mybusinessaccountmanagement.googleapis.com/v1/accounts');
    } catch (e) {
      note('impossible de lister les comptes — ' + e.message);
      return out;
    }
    var listeComptes = comptes.accounts || [];
    if (!listeComptes.length) { note('aucun compte Business Profile visible par ce compte Google'); return out; }

    for (var i = 0; i < listeComptes.length && !location; i++) {
      try {
        var rep = appelGoogle('https://mybusinessbusinessinformation.googleapis.com/v1/' +
          listeComptes[i].name + '/locations?readMask=name,title&pageSize=100');
        var fiches = rep.locations || [];
        for (var j = 0; j < fiches.length; j++) {
          // On vise GAMEDOOR·41 ; a defaut la premiere fiche du compte.
          if (/gamedoor|brain|buzz/i.test(fiches[j].title || '')) {
            location = String(fiches[j].name).replace(/^locations\//, '');
            out.titre = fiches[j].title;
            break;
          }
        }
        if (!location && fiches.length) {
          location = String(fiches[0].name).replace(/^locations\//, '');
          out.titre = fiches[0].title;
          note('aucune fiche au nom attendu : on prend « ' + out.titre + ' »');
        }
      } catch (e2) {
        note('comptes listes mais fiches inaccessibles — ' + e2.message);
      }
    }
  }

  if (!location) { note('aucune fiche trouvee'); return out; }
  out.location = location;
  // Retenu pour de bon : les prochaines nuits n'appelleront plus la decouverte.
  if (props.getProperty('GBP_LOCATION') !== location) props.setProperty('GBP_LOCATION', location);

  var fin = decalerJours(new Date(), -2);
  var debut = decalerJours(fin, -90);
  var partsDate = function (prefixe, d) {
    return prefixe + '.year=' + d.getUTCFullYear() +
      '&' + prefixe + '.month=' + (d.getUTCMonth() + 1) +
      '&' + prefixe + '.day=' + d.getUTCDate();
  };

  var METRIQUES = ['BUSINESS_IMPRESSIONS_MOBILE_SEARCH', 'BUSINESS_IMPRESSIONS_MOBILE_MAPS',
    'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH', 'BUSINESS_IMPRESSIONS_DESKTOP_MAPS',
    'WEBSITE_CLICKS', 'CALL_CLICKS', 'BUSINESS_DIRECTION_REQUESTS', 'BUSINESS_BOOKINGS'];

  try {
    var url = 'https://businessprofileperformance.googleapis.com/v1/locations/' + location +
      ':fetchMultiDailyMetricsTimeSeries?' +
      METRIQUES.map(function (m) { return 'dailyMetrics=' + m; }).join('&') +
      '&' + partsDate('dailyRange.startDate', debut) +
      '&' + partsDate('dailyRange.endDate', fin);
    var rep2 = appelGoogle(url);
    var series = {};
    (rep2.multiDailyMetricTimeSeries || []).forEach(function (bloc) {
      (bloc.dailyMetricTimeSeries || []).forEach(function (s) {
        var pts = ((s.timeSeries || {}).datedValues || []).map(function (v) {
          var d = v.date || {};
          return {
            d: d.year + '-' + ('0' + d.month).slice(-2) + '-' + ('0' + d.day).slice(-2),
            v: Number(v.value || 0)
          };
        });
        series[s.dailyMetric] = pts;
      });
    });
    out.series = series;
    out.periode = { debut: fmtDate(debut), fin: fmtDate(fin) };
    out.configure = true;
  } catch (e3) {
    note('metriques quotidiennes refusees — ' + e3.message);
  }

  // Les mots reellement tapes, mois par mois. Google plafonne a 12 mois et
  // masque les volumes faibles derriere un seuil ("moins de N").
  try {
    var finM = new Date();
    var debutM = new Date(finM.getFullYear(), finM.getMonth() - 5, 1);
    var urlK = 'https://businessprofileperformance.googleapis.com/v1/locations/' + location +
      '/searchkeywords/impressions/monthly' +
      '?monthlyRange.startMonth.year=' + debutM.getFullYear() +
      '&monthlyRange.startMonth.month=' + (debutM.getMonth() + 1) +
      '&monthlyRange.endMonth.year=' + finM.getFullYear() +
      '&monthlyRange.endMonth.month=' + (finM.getMonth() + 1) +
      '&pageSize=100';
    var rep3 = appelGoogle(urlK);
    out.motsCles = (rep3.searchKeywordsCounts || []).map(function (k) {
      var v = k.insightsValue || {};
      return {
        mot: k.searchKeyword,
        n: Number(v.value || v.threshold || 0),
        approx: v.value == null            // true = Google donne un seuil, pas le chiffre exact
      };
    }).sort(function (a, b) { return b.n - a.n; });
    out.motsClesPeriode = { debut: debutM.getFullYear() + '-' + ('0' + (debutM.getMonth() + 1)).slice(-2),
      fin: finM.getFullYear() + '-' + ('0' + (finM.getMonth() + 1)).slice(-2) };
  } catch (e4) {
    note('mots-cles de la fiche refuses — ' + e4.message);
  }

  return out;
}

// ------------------------------------------------------------
// Veille concurrentielle — relevee chaque nuit
// ------------------------------------------------------------
// Le tableau des concurrents etait un releve fige au 5 aout 2026. Les notes et
// les volumes d'avis, eux, bougent toutes les semaines : ce sont les seuls
// chiffres qui disent qui accelere et qui decroche.
//
// Ce qui est mesure ici est mesurable : note et nombre d'avis, via l'API
// Places, plus l'ecart avec le releve precedent. Ce qui reste ecrit a la main
// dans le poste de pilotage (nombre de salles, positionnement, "ce qu'ils font
// que nous ne faisons pas") releve de l'analyse, pas de la mesure.
//
// Necessite une cle Places dans les proprietes du script : PLACES_API_KEY.
var CONCURRENTS = [
  { nom: 'GAMEDOOR·41', requete: 'GAMEDOOR 41 escape game 41 bis rue Pasteur Mondeville', nous: true },
  { nom: 'Buzz Your Brain', requete: 'Buzz Your Brain quiz game Mondeville', nous: true },
  { nom: 'Escape Yourself Caen', requete: 'Escape Yourself Caen Mondeville' },
  { nom: 'Prison Island Caen', requete: 'Prison Island Caen Mondeville' },
  { nom: 'Quiz Room Caen', requete: 'Quiz Room Caen' },
  { nom: 'Laser Game Evolution — Les Carandes', requete: 'Laser Game Evolution Caen Mondeville Les Carandes' },
  { nom: 'Get Out Caen', requete: 'Get Out escape game Caen' },
  { nom: 'Lock Quest', requete: 'Lock Quest escape game Bretteville-sur-Odon' },
  { nom: 'Atome Game', requete: 'Atome Game escape game Caen' },
  { nom: 'SENSAS Caen', requete: 'SENSAS Caen' },
  { nom: 'Lasergames Bretteville', requete: 'Lasergames Bretteville-sur-Odon' },
  { nom: 'Gameside Caen', requete: 'Gameside Caen' },
  { nom: 'Les Mondes d\'Ailleurs', requete: 'Les Mondes d\'Ailleurs escape game Ifs' }
];

function veilleConcurrence(precedent) {
  var cle = PropertiesService.getScriptProperties().getProperty('PLACES_API_KEY');
  if (!cle) {
    return { configure: false,
      message: 'Aucune cle Places. Ajoutez PLACES_API_KEY dans les proprietes du script pour relever notes et avis des concurrents chaque nuit.' };
  }

  // Releve precedent, pour calculer les ecarts d'une nuit sur l'autre.
  var avant = {};
  ((precedent && precedent.concurrence && precedent.concurrence.enseignes) || []).forEach(function (e) {
    avant[e.nom] = e;
  });

  var enseignes = [], echecs = [];
  CONCURRENTS.forEach(function (c) {
    try {
      var rep = UrlFetchApp.fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'post',
        headers: {
          'X-Goog-Api-Key': cle,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.rating,places.userRatingCount,places.formattedAddress'
        },
        contentType: 'application/json',
        payload: JSON.stringify({ textQuery: c.requete, maxResultCount: 3, languageCode: 'fr', regionCode: 'FR' }),
        muteHttpExceptions: true
      });
      if (rep.getResponseCode() !== 200) {
        echecs.push(c.nom + ' : HTTP ' + rep.getResponseCode());
        return;
      }
      var lieux = (JSON.parse(rep.getContentText()).places || [])
        .filter(function (p) { return typeof p.userRatingCount === 'number'; });
      if (!lieux.length) { echecs.push(c.nom + ' : aucune fiche trouvee'); return; }

      var p = lieux[0];
      var a = avant[c.nom];
      enseignes.push({
        nom: c.nom,
        nous: !!c.nous,
        titre: (p.displayName && p.displayName.text) || c.nom,
        adresse: p.formattedAddress || '',
        note: p.rating,
        avis: p.userRatingCount,
        deltaAvis: a && typeof a.avis === 'number' ? p.userRatingCount - a.avis : null,
        deltaNote: a && typeof a.note === 'number' ? arrondir(p.rating - a.note, 2) : null
      });
    } catch (e) {
      echecs.push(c.nom + ' : ' + e.message);
    }
    Utilities.sleep(120);   // on reste poli avec l'API
  });

  enseignes.sort(function (x, y) { return y.avis - x.avis; });
  var nous = enseignes.filter(function (e) { return e.nous; })[0] || null;
  var rang = nous ? enseignes.indexOf(nous) + 1 : null;

  return {
    configure: true,
    releve: new Date().toISOString(),
    reference: (precedent && precedent.concurrence && precedent.concurrence.releve) || null,
    enseignes: enseignes,
    rang: rang,
    total: enseignes.length,
    echecs: echecs
  };
}

/** Relit le rapport de la veille, pour pouvoir calculer des ecarts. */
function lireRapportPrecedent() {
  try {
    var f = DriveApp.getFilesByName(NOM_FICHIER);
    if (!f.hasNext()) return null;
    return JSON.parse(f.next().getBlob().getDataAsString());
  } catch (e) {
    Logger.log('Rapport precedent illisible : ' + e.message);
    return null;
  }
}

// ------------------------------------------------------------
// Audit technique — refait EN VRAI chaque nuit
// ------------------------------------------------------------
// Le poste de pilotage affichait un audit ecrit a la main le 5 aout 2026. Il
// annoncait encore comme bloquants des points corriges depuis. Un constat fige
// vieillit et finit par mentir : ces controles sont donc rejoues a chaque
// execution, et remplacent le texte fige.
//
// On teste ce qui est testable depuis un serveur : codes HTTP, chaines de
// redirection, presence et validite du balisage. Pas d'interpretation.
var URLS_AUDIT = {
  anciensDomaines: [
    'https://www.brain-escapegame-caen.fr/',
    'https://www.brain-escapegame-caen.fr/alternance/',
    'https://brain-escapegame-caen.fr/tarifs/',
    'https://www.braincaen.fr/',
    'https://gamedoor41.com/',
    'https://www.gamedoor41.fr/'
  ],
  pagesCles: [
    'https://gamedoor41.fr/',
    'https://gamedoor41.fr/escape-game-caen/',
    'https://gamedoor41.fr/quiz-game-caen/',
    'https://gamedoor41.fr/tarifs/',
    'https://gamedoor41.fr/contact/',
    'https://gamedoor41.fr/escape-game-caen/psychiatric/',
    'https://gamedoor41.fr/escape-game-caen/garde-a-vue/',
    'https://gamedoor41.fr/escape-game-caen/back-to-the-80s/'
  ],
  fichiers: [
    'https://gamedoor41.fr/sitemap.xml',
    'https://gamedoor41.fr/robots.txt'
  ]
};

/** Suit une chaine de redirection a la main pour la decrire, pas seulement l'aboutir. */
function suivreChaine(url) {
  var sauts = [];
  var courant = url;
  for (var i = 0; i < 6; i++) {
    var rep;
    try {
      rep = UrlFetchApp.fetch(courant, { followRedirects: false, muteHttpExceptions: true,
        validateHttpsCertificates: true });
    } catch (e) {
      return { sauts: sauts, erreur: String(e.message).slice(0, 160), final: courant };
    }
    var code = rep.getResponseCode();
    var dest = rep.getHeaders()['Location'] || rep.getHeaders()['location'] || null;
    sauts.push({ url: courant, code: code, vers: dest });
    if (code >= 300 && code < 400 && dest) {
      courant = dest.indexOf('http') === 0 ? dest : courant.replace(/^(https?:\/\/[^\/]+).*$/, '$1') + dest;
      continue;
    }
    return { sauts: sauts, final: courant, code: code };
  }
  return { sauts: sauts, final: courant, erreur: 'plus de 6 sauts' };
}

function auditTechnique() {
  var controles = [];
  var ajoute = function (etat, titre, detail) { controles.push({ etat: etat, titre: titre, detail: detail }); };

  // 1. Les anciens domaines doivent tous rediriger, jamais servir de contenu.
  var vivants = [], chaines = [];
  URLS_AUDIT.anciensDomaines.forEach(function (u) {
    var c = suivreChaine(u);
    if (c.erreur) { chaines.push(u + ' : ' + c.erreur); return; }
    if (c.code === 200 && c.sauts.length === 1) { vivants.push(u); return; }
    var temporaire = c.sauts.some(function (s) { return s.code === 302 || s.code === 307; });
    if (c.sauts.length > 2 || temporaire) {
      chaines.push(u + ' : ' + c.sauts.length + ' saut(s)' + (temporaire ? ', dont une redirection temporaire' : ''));
    }
  });
  ajoute(vivants.length ? 'bloquant' : 'ok',
    'Anciens domaines',
    vivants.length
      ? vivants.length + ' URL repondent encore 200 au lieu de rediriger : ' + vivants.join(', ')
      : URLS_AUDIT.anciensDomaines.length + ' URL testees, toutes redirigent vers gamedoor41.fr.');
  if (chaines.length) ajoute('attention', 'Chaines de redirection', chaines.join(' · '));

  // 2. Les pages cles doivent repondre 200 directement.
  var cassees = [], detournees = [];
  URLS_AUDIT.pagesCles.concat(URLS_AUDIT.fichiers).forEach(function (u) {
    var c = suivreChaine(u);
    if (c.erreur || (c.code !== 200)) { cassees.push(u + ' → ' + (c.erreur || c.code)); return; }
    if (c.sauts.length > 1) detournees.push(u);
  });
  ajoute(cassees.length ? 'bloquant' : 'ok', 'Pages cles',
    cassees.length ? cassees.join(' · ')
      : (URLS_AUDIT.pagesCles.length + URLS_AUDIT.fichiers.length) + ' URL testees, toutes en 200.');
  if (detournees.length) ajoute('attention', 'Pages cles redirigees',
    'Ces URL passent par une redirection au lieu de repondre directement : ' + detournees.join(', '));

  // 3. Balisage : on rejoue les regles qui ont declenche les alertes de juin
  //    et d'aout — note d'etablissement recopiee, avis multiples sans note.
  var soucis = [], pagesLues = 0;
  URLS_AUDIT.pagesCles.forEach(function (u) {
    var html;
    try { html = UrlFetchApp.fetch(u, { muteHttpExceptions: true }).getContentText(); }
    catch (e) { soucis.push(u + ' illisible'); return; }
    pagesLues++;
    var blocs = html.match(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g) || [];
    blocs.forEach(function (b) {
      var json = b.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '');
      var o;
      try { o = JSON.parse(json); } catch (e) { soucis.push(u + ' : bloc JSON-LD invalide'); return; }
      if (!o || o['@type'] !== 'Product') return;
      var avis = (o.review || []).length;
      var note = o.aggregateRating;
      if (avis > 1 && !note) soucis.push(u + ' : ' + avis + ' avis sans note agregee');
      if (note && String(note.reviewCount) !== String(avis)) {
        soucis.push(u + ' : note agregee sur ' + note.reviewCount + ' avis alors que la page en porte ' + avis);
      }
      var of = o.offers || {};
      if (of['@type'] === 'Offer' && (of.lowPrice || of.highPrice)) {
        soucis.push(u + ' : Offer avec lowPrice/highPrice (invalide)');
      }
    });
  });
  ajoute(soucis.length ? 'bloquant' : 'ok', 'Balisage des pages salles',
    soucis.length ? soucis.join(' · ')
      : pagesLues + ' pages relues, aucune anomalie sur les fiches Product.');

  return { genere: new Date().toISOString(), controles: controles };
}

/** Choisit la propriete Search Console a interroger. */
function trouverPropriete() {
  var force = PropertiesService.getScriptProperties().getProperty('GSC_SITE');
  if (force) return force;

  var rep = appelGoogle('https://www.googleapis.com/webmasters/v3/sites');
  var sites = (rep.siteEntry || [])
    .filter(function (s) { return /gamedoor41/.test(s.siteUrl); })
    // une propriete de domaine (sc-domain:) couvre tous les sous-domaines : on la prefere
    .sort(function (a, b) { return (b.siteUrl.indexOf('sc-domain:') === 0) - (a.siteUrl.indexOf('sc-domain:') === 0); });

  if (!sites.length) {
    throw new Error('aucune propriete gamedoor41 accessible. Proprietes vues : ' +
      ((rep.siteEntry || []).map(function (s) { return s.siteUrl; }).join(', ') || 'aucune'));
  }
  return sites[0].siteUrl;
}

// ------------------------------------------------------------
// Servir le rapport a d'autres outils (application Synergia)
// ------------------------------------------------------------
// Le poste de pilotage claude.ai lit le fichier Drive par un connecteur. Aucun
// autre outil ne peut faire pareil : le connecteur n'existe que dans le
// visualiseur de claude.ai. Pour qu'une autre application affiche ces donnees,
// il faut une URL classique.
//
// Ce script publie donc le rapport en "application web". Protection : un jeton
// dans l'URL, genere par creerJetonWeb(). C'est suffisant ici — la donnee est
// une photographie du referencement, pas un fichier client.
//
//   .../exec?jeton=XXXX              -> le rapport complet (fichier lourd)
//   .../exec?jeton=XXXX&vue=resume   -> l'essentiel, ~30 fois plus leger
//
// ContentService ne sait pas renvoyer de code d'erreur HTTP : une requete
// refusee repond quand meme 200, avec ok:false. C'est a l'appelant de lire ce
// champ plutot que le code HTTP.
function doGet(e) {
  var params = (e && e.parameter) || {};
  var repondre = function (obj) {
    return ContentService.createTextOutput(JSON.stringify(obj))
      .setMimeType(ContentService.MimeType.JSON);
  };

  var attendu = PropertiesService.getScriptProperties().getProperty('JETON_WEB');
  if (!attendu) {
    return repondre({ ok: false, erreur: 'jeton_absent',
      message: 'Lancez creerJetonWeb() une fois dans l editeur Apps Script.' });
  }
  if (String(params.jeton || '') !== attendu) {
    return repondre({ ok: false, erreur: 'jeton_invalide' });
  }

  var rapport = lireRapportPrecedent();
  if (!rapport) {
    return repondre({ ok: false, erreur: 'rapport_absent',
      message: 'Aucun ' + NOM_FICHIER + ' sur le Drive. Lancez majRapportSeo().' });
  }

  return repondre(params.vue === 'resume'
    ? { ok: true, vue: 'resume', resume: resumerRapport(rapport) }
    : { ok: true, vue: 'complet', rapport: rapport });
}

/**
 * Version compacte du rapport : ce qu'il faut pour afficher un tableau de bord,
 * sans les 480 jours d'historique ni les 1000 requetes. Quelques dizaines de
 * kilo-octets au lieu de plusieurs mega — ce qui compte sur un telephone.
 */
function resumerRapport(r) {
  var gsc = r.gsc || {};
  var sommeFenetre = function (f) {
    var reqs = (f && f.requetes) || [];
    return {
      debut: f && f.debut, fin: f && f.fin,
      clics: reqs.reduce(function (s, x) { return s + (x.c || 0); }, 0),
      impressions: reqs.reduce(function (s, x) { return s + (x.i || 0); }, 0)
    };
  };
  var fen = gsc.fenetres || {};
  var courante = sommeFenetre(fen.courante);
  var anDernier = sommeFenetre(fen.anDernier);

  var evolution = null;
  if (anDernier.clics > 0) {
    evolution = arrondir((courante.clics - anDernier.clics) / anDernier.clics * 100, 1);
  }

  var conc = r.concurrence || {};
  return {
    genere: r.genere,
    site: r.site,
    periode: { debut: courante.debut, fin: courante.fin },
    trafic: {
      clics: courante.clics,
      impressions: courante.impressions,
      ctr: courante.impressions ? arrondir(courante.clics / courante.impressions * 100, 2) : 0,
      clicsAnDernier: anDernier.clics,
      evolutionAnDernier: evolution        // en %, null si l'an dernier est vide
    },
    requetes: ((fen.courante && fen.courante.requetes) || []).slice(0, 20),
    pages: ((fen.courante && fen.courante.pages) || []).slice(0, 15),
    audit: (r.audit && r.audit.controles) || [],
    concurrence: {
      rang: conc.rang || null,
      total: conc.total || 0,
      releve: conc.releve || null,
      enseignes: (conc.enseignes || []).map(function (x) {
        return { nom: x.nom, nous: x.nous, note: x.note, avis: x.avis, deltaAvis: x.deltaAvis };
      })
    },
    fiche: r.fiche && r.fiche.configure ? {
      titre: r.fiche.titre || null,
      motsCles: (r.fiche.motsCles || []).slice(0, 15)
    } : null,
    erreurs: r.erreurs || []
  };
}

/** A lancer une fois : cree le jeton de l'application web et l'affiche. */
function creerJetonWeb() {
  var props = PropertiesService.getScriptProperties();
  var jeton = props.getProperty('JETON_WEB');
  if (!jeton) {
    jeton = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 8);
    props.setProperty('JETON_WEB', jeton);
    Logger.log('Jeton cree.');
  } else {
    Logger.log('Un jeton existait deja, il est conserve.');
  }
  Logger.log('JETON_WEB = ' + jeton);
  Logger.log('');
  Logger.log('Deployer > Nouveau deploiement > Application web');
  Logger.log('   Executer en tant que : moi');
  Logger.log('   Qui a acces : tout le monde');
  Logger.log('Puis appeler :  <URL du deploiement>?jeton=' + jeton + '&vue=resume');
  Logger.log('');
  Logger.log('Ce jeton est un mot de passe : il ne se colle ni dans une conversation,');
  Logger.log('ni dans du code envoye sur GitHub. Il vit dans une variable d environnement.');
  return jeton;
}

function interrogerGsc(site, debut, fin, dimensions, limite) {
  var url = 'https://www.googleapis.com/webmasters/v3/sites/' +
    encodeURIComponent(site) + '/searchAnalytics/query';
  var rep = appelGoogle(url, {
    startDate: fmtDate(debut),
    endDate: fmtDate(fin),
    dimensions: dimensions,
    rowLimit: limite,
    dataState: 'final'
  });
  return rep.rows || [];
}

// ------------------------------------------------------------
// Google Analytics 4 — ignore tant qu'aucune propriete n'est configuree
// ------------------------------------------------------------
// Identifiant de la propriete Analytics « gamedoor41.fr », releve le
// 06/08/2026 dans l'URL de l'interface : .../a99289365p460078442/...
// Il est ecrit ici pour eviter d'avoir a le saisir a la main dans les
// proprietes du script. Une propriete GA4_PROPERTY_ID definie dans
// l'editeur reste prioritaire, si un jour il faut viser une autre propriete.
var GA4_PROPERTY_ID_PAR_DEFAUT = '460078442';

function collecterAnalytics() {
  var id = PropertiesService.getScriptProperties().getProperty('GA4_PROPERTY_ID')
    || GA4_PROPERTY_ID_PAR_DEFAUT;
  if (!id) {
    return { configure: false,
      message: 'Aucune propriete Analytics configuree. Renseignez GA4_PROPERTY_ID dans les proprietes du script une fois la propriete creee et la balise posee.' };
  }

  var fin = new Date();
  var debut = decalerJours(fin, -JOURS_DETAIL);
  var url = 'https://analyticsdata.googleapis.com/v1beta/properties/' + id + ':runReport';

  var parJour = appelGoogle(url, {
    dateRanges: [{ startDate: fmtDate(debut), endDate: fmtDate(fin) }],
    dimensions: [{ name: 'date' }],
    metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'engagedSessions' },
              { name: 'conversions' }, { name: 'averageSessionDuration' }],
    limit: 400
  });

  var parSource = appelGoogle(url, {
    dateRanges: [{ startDate: fmtDate(debut), endDate: fmtDate(fin) }],
    dimensions: [{ name: 'sessionDefaultChannelGroup' }],
    metrics: [{ name: 'sessions' }, { name: 'conversions' }],
    limit: 20
  });

  var parPage = appelGoogle(url, {
    dateRanges: [{ startDate: fmtDate(debut), endDate: fmtDate(fin) }],
    dimensions: [{ name: 'pagePath' }],
    metrics: [{ name: 'screenPageViews' }, { name: 'sessions' }],
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: 100
  });

  return {
    configure: true,
    propriete: id,
    periode: { debut: fmtDate(debut), fin: fmtDate(fin) },
    jours: lignesGa4(parJour),
    canaux: lignesGa4(parSource),
    pages: lignesGa4(parPage)
  };
}

function lignesGa4(rep) {
  var dims = (rep.dimensionHeaders || []).map(function (h) { return h.name; });
  var mets = (rep.metricHeaders || []).map(function (h) { return h.name; });
  return (rep.rows || []).map(function (r) {
    var o = {};
    dims.forEach(function (d, i) { o[d] = r.dimensionValues[i].value; });
    mets.forEach(function (m, i) {
      var v = parseFloat(r.metricValues[i].value);
      o[m] = isNaN(v) ? r.metricValues[i].value : arrondir(v, 2);
    });
    return o;
  });
}

// ------------------------------------------------------------
// Ecriture sur le Drive
// ------------------------------------------------------------
function ecrireSurDrive(rapport) {
  var contenu = JSON.stringify(rapport);
  var f = null;
  var trouves = DriveApp.getFilesByName(NOM_FICHIER);
  if (trouves.hasNext()) {
    f = trouves.next();
    f.setContent(contenu);
    // S'il existe des doublons, on les met a la corbeille : le poste de
    // pilotage doit trouver un seul fichier de ce nom.
    while (trouves.hasNext()) trouves.next().setTrashed(true);
    Logger.log('Fichier mis a jour : ' + f.getUrl());
  } else {
    f = DriveApp.createFile(NOM_FICHIER, contenu, 'application/json');
    Logger.log('Fichier cree : ' + f.getUrl());
  }

  // Le script tourne peut-etre sous un compte Google different de celui que
  // claude.ai utilise pour son connecteur Drive (par exemple le script sous
  // le compte Gmail historique de l'équipe, et le connecteur sous une autre
  // adresse). Dans ce cas le fichier doit etre partage, sinon le poste de
  // pilotage ne le voit pas.
  var aPartager = (PropertiesService.getScriptProperties().getProperty('PARTAGER_AVEC') ||
    'contact@gamedoor41.fr').split(',');
  aPartager.forEach(function (mail) {
    mail = String(mail).trim();
    if (!mail) return;
    try {
      f.addViewer(mail);
      Logger.log('Partage en lecture avec ' + mail);
    } catch (e) {
      // Cas normal quand l adresse est celle du proprietaire du fichier.
      Logger.log('Partage non necessaire ou impossible avec ' + mail + ' : ' + e.message);
    }
  });
  return f;
}

// ------------------------------------------------------------
// Utilitaires
// ------------------------------------------------------------
function appelGoogle(url, corps) {
  var options = {
    method: corps ? 'post' : 'get',
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    contentType: 'application/json',
    muteHttpExceptions: true
  };
  if (corps) options.payload = JSON.stringify(corps);

  var rep = UrlFetchApp.fetch(url, options);
  var code = rep.getResponseCode();
  var texte = rep.getContentText();
  if (code < 200 || code >= 300) {
    var detail = texte;
    try { detail = JSON.parse(texte).error.message; } catch (e) { }
    throw new Error('HTTP ' + code + ' — ' + detail);
  }
  return JSON.parse(texte);
}

function decalerJours(d, n) {
  var x = new Date(d.getTime());
  x.setDate(x.getDate() + n);
  return x;
}

function fmtDate(d) {
  return Utilities.formatDate(d, 'UTC', 'yyyy-MM-dd');
}

function arrondir(v, n) {
  var f = Math.pow(10, n);
  return Math.round(v * f) / f;
}

// ------------------------------------------------------------
// A lancer une seule fois pour programmer l'execution nocturne
// ------------------------------------------------------------
function installerDeclencheur() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'majRapportSeo') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('majRapportSeo').timeBased().everyDays(1).atHour(5).create();
  Logger.log('Declencheur installe : chaque jour vers 5 h (heure de Paris).');
}

/**
 * Diagnostic a lancer en cas d'erreur 403.
 * Distingue les deux causes possibles, qui n'ont pas le meme remede :
 *   - "API has not been used in project"  -> l'API n'est pas activee (Cloud)
 *   - "insufficient authentication scopes" -> les permissions du manifeste ne
 *     sont pas dans le jeton, il faut re-autoriser le script
 */
function verifierAutorisations() {
  try {
    Logger.log('Compte qui execute : ' + Session.getEffectiveUser().getEmail());
  } catch (e) {
    Logger.log('Compte qui execute : inconnu (permission userinfo.email absente)');
  }

  var info = ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL);
  Logger.log('Etat de l autorisation : ' + info.getAuthorizationStatus());
  var url = info.getAuthorizationUrl();
  if (url) {
    Logger.log('>>> AUTORISATION A REFAIRE. Ouvrir ce lien puis accepter :');
    Logger.log(url);
  } else {
    Logger.log('Le script se dit deja autorise pour les permissions declarees.');
  }

  // On demande a Google quelles permissions le jeton porte VRAIMENT.
  // C'est la reponse decisive : inutile de relire le manifeste a la main.
  // (le jeton lui-meme n'est jamais affiche)
  try {
    var ti = UrlFetchApp.fetch(
      'https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=' +
      encodeURIComponent(ScriptApp.getOAuthToken()), { muteHttpExceptions: true });
    var accordes = String((JSON.parse(ti.getContentText()).scope || '')).split(' ').filter(String);
    Logger.log('--- Permissions reellement accordees (' + accordes.length + ') ---');
    accordes.forEach(function (s) { Logger.log('   ' + s); });
    var attendues = ['webmasters.readonly', 'analytics.readonly', 'business.manage',
      'auth/drive', 'script.external_request', 'script.scriptapp', 'userinfo.email'];
    attendues.forEach(function (a) {
      var present = accordes.some(function (s) { return s.indexOf(a) !== -1; });
      Logger.log((present ? 'PRESENT  ' : 'MANQUANT ') + a);
    });
    if (!accordes.some(function (s) { return s.indexOf('webmasters') !== -1; })) {
      Logger.log('>>> DIAGNOSTIC : le jeton ne porte pas la permission Search Console.');
      Logger.log('    Le fichier appsscript.json n a pas ete enregistre avec ses oauthScopes,');
      Logger.log('    ou l autorisation date d avant. Corriger le manifeste, l enregistrer,');
      Logger.log('    puis retirer l acces sur myaccount.google.com/permissions et relancer.');
    }
  } catch (e) {
    Logger.log('Lecture des permissions impossible : ' + e.message);
  }

  // Test reel, permission par permission
  var essais = [
    ['Search Console', 'https://www.googleapis.com/webmasters/v3/sites'],
    ['Drive', 'https://www.googleapis.com/drive/v3/about?fields=user']
  ];
  essais.forEach(function (e) {
    try {
      appelGoogle(e[1]);
      Logger.log('OK   ' + e[0]);
    } catch (err) {
      Logger.log('ECHEC ' + e[0] + ' : ' + err.message);
    }
  });

  Logger.log('Si Search Console echoue avec "insufficient authentication scopes" : ' +
    'verifier que appsscript.json contient bien les 4 lignes oauthScopes ET est enregistre, ' +
    'puis retirer l acces du script sur myaccount.google.com/permissions et relancer.');
}

/**
 * Diagnostic du HTTP 429 sur la fiche Google.
 *
 * Point important : la fiche Google n'est pas UNE API mais TROIS, chacune avec
 * son propre quota. Le 429 rencontre porte sur la premiere seulement —
 * mybusinessaccountmanagement, qui ne sert qu'a DECOUVRIR l'identifiant de la
 * fiche. Les chiffres, eux, viennent de businessprofileperformance.
 *
 * Autrement dit : si on renseigne GBP_LOCATION a la main, on ne touche plus
 * jamais au service sature et les statistiques peuvent tres bien passer.
 * Cette fonction verifie les trois separement pour le confirmer.
 */
function diagnosticFicheGoogle() {
  var props = PropertiesService.getScriptProperties();
  var location = props.getProperty('GBP_LOCATION');
  Logger.log('GBP_LOCATION enregistre : ' + (location || '(aucun)'));
  Logger.log('');

  Logger.log('--- 1. Decouverte des comptes (mybusinessaccountmanagement) ---');
  var comptes = null;
  try {
    comptes = appelGoogle('https://mybusinessaccountmanagement.googleapis.com/v1/accounts');
    var liste = comptes.accounts || [];
    Logger.log('OK — ' + liste.length + ' compte(s)');
    liste.forEach(function (c) { Logger.log('   ' + c.name + '  ' + (c.accountName || '')); });
  } catch (e) {
    Logger.log('ECHEC — ' + e.message);
    if (/429|Quota/i.test(e.message)) {
      Logger.log('   >>> Quota sature sur CE service uniquement. Contournement : renseigner');
      Logger.log('       GBP_LOCATION a la main (voir plus bas), le script ne l appellera plus.');
    }
  }

  Logger.log('');
  Logger.log('--- 2. Fiches du compte (mybusinessbusinessinformation) ---');
  if (comptes && (comptes.accounts || []).length) {
    try {
      var rep = appelGoogle('https://mybusinessbusinessinformation.googleapis.com/v1/' +
        comptes.accounts[0].name + '/locations?readMask=name,title&pageSize=100');
      (rep.locations || []).forEach(function (l) {
        Logger.log('   ' + l.name + '   « ' + l.title + ' »');
      });
      if (!(rep.locations || []).length) Logger.log('   aucune fiche dans ce compte');
    } catch (e) {
      Logger.log('ECHEC — ' + e.message);
    }
  } else {
    Logger.log('   non testable : etape 1 en echec');
  }

  Logger.log('');
  Logger.log('--- 3. Statistiques (businessprofileperformance) ---');
  if (!location) {
    Logger.log('   non testable : aucun GBP_LOCATION enregistre.');
    Logger.log('');
    Logger.log('   POUR LE TROUVER SANS PASSER PAR L API :');
    Logger.log('   ouvrir la fiche sur business.google.com, regarder l adresse du navigateur.');
    Logger.log('   Elle contient .../dashboard/l/CHIFFRES — ce sont ces chiffres.');
    Logger.log('   Les coller dans Parametres du projet > Proprietes du script > GBP_LOCATION');
  } else {
    var fin = decalerJours(new Date(), -2);
    var debut = decalerJours(fin, -7);
    var p = function (prefixe, d) {
      return prefixe + '.year=' + d.getUTCFullYear() +
        '&' + prefixe + '.month=' + (d.getUTCMonth() + 1) +
        '&' + prefixe + '.day=' + d.getUTCDate();
    };
    try {
      var url = 'https://businessprofileperformance.googleapis.com/v1/locations/' + location +
        ':fetchMultiDailyMetricsTimeSeries?dailyMetrics=WEBSITE_CLICKS' +
        '&' + p('dailyRange.startDate', debut) + '&' + p('dailyRange.endDate', fin);
      var r3 = appelGoogle(url);
      var n = ((((r3.multiDailyMetricTimeSeries || [])[0] || {}).dailyMetricTimeSeries || [])[0] || {});
      Logger.log('OK — le service repond. Points recus : ' +
        ((((n.timeSeries || {}).datedValues) || []).length));
      Logger.log('   >>> Les statistiques de la fiche sont accessibles : le 429 de l etape 1');
      Logger.log('       n empeche rien tant que GBP_LOCATION est renseigne.');
    } catch (e) {
      Logger.log('ECHEC — ' + e.message);
      if (/SERVICE_DISABLED|has not been used/i.test(e.message)) {
        Logger.log('   >>> L API n est pas activee. Console Cloud > Bibliotheque >');
        Logger.log('       « Business Profile Performance API » > Activer.');
      }
      if (/429|Quota/i.test(e.message)) {
        Logger.log('   >>> Quota a zero sur le projet. Il faut demander un relevement a Google');
        Logger.log('       (formulaire Business Profile APIs), en citant le numero de projet.');
      }
    }
  }
  Logger.log('');
  Logger.log('Numero de projet Cloud a citer si Google demande : voir le message d erreur 429.');
}

/** Diagnostic : liste les proprietes Search Console visibles par ce compte. */
function listerProprietes() {
  var rep = appelGoogle('https://www.googleapis.com/webmasters/v3/sites');
  (rep.siteEntry || []).forEach(function (s) {
    Logger.log(s.siteUrl + '  —  ' + s.permissionLevel);
  });
  if (!(rep.siteEntry || []).length) Logger.log('Aucune propriete visible par ce compte Google.');
}
