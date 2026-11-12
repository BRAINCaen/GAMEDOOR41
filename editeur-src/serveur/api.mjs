// ==========================================================================
// Éditeur du site — API (/api/editeur/*) et TRAVAUX DE FOND
//
// Toutes les routes exigent un membre actif de l'équipe (auth.mjs).
// Les travaux longs (aperçu, publication, assistant IA) tournent dans une
// fonction « de fond » Netlify (jusqu'à 15 min) : le navigateur lance le
// travail puis suit son avancement (GET /api/editeur/travail?id=…).
//
// Le serveur REJOUE les opérations sur le fichier du dépôt avant toute
// publication : la règle « on ne supprime jamais de contenu » est appliquée
// ici, quoi qu'envoie le navigateur.
// ==========================================================================

import { createHash } from 'node:crypto';
import { identifier, RefusAcces } from './auth.mjs';
import { ErreurGithub } from './github.mjs';
import { appliquerOperations } from '../noyau/operations.mjs';
import { ErreurEditeur } from '../noyau/arbre.mjs';
import { relire, REGLES_DEFAUT, aDesBloquants } from '../noyau/relecture.mjs';
import { creerPage, ajouterAuSitemap, majDateSitemap, urlDeFichier, verifierChemin } from '../noyau/pages.mjs';
import { resumerOperation } from '../noyau/resume.mjs';

export const EXCLUS = /^(signatures|editeur|editeur-src|apps-script|scripts|netlify|node_modules|_archive|_wip|\.github|\.claude|\.vscode)\//;
const MEDIA_RE = /^img\/editeur\/\d{4}-\d{2}\/[a-z0-9][a-z0-9-]{0,90}\.(webp|jpg|jpeg|png|gif|avif|mp4|webm)$/;
const TYPES_MEDIA = {
  webp: (b) => b.slice(0, 4).toString('latin1') === 'RIFF' && b.slice(8, 12).toString('latin1') === 'WEBP',
  jpg: (b) => b[0] === 0xff && b[1] === 0xd8, jpeg: (b) => b[0] === 0xff && b[1] === 0xd8,
  png: (b) => b.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  gif: (b) => b.slice(0, 4).toString('latin1') === 'GIF8',
  avif: (b) => b.slice(4, 12).toString('latin1').startsWith('ftypavi'),
  mp4: (b) => b.slice(4, 8).toString('latin1') === 'ftyp',
  webm: (b) => b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3,
};
const TAILLE_MAX_MEDIA = 4.4 * 1024 * 1024;
const empreinte8 = (txt) => createHash('sha1').update(txt).digest('hex').slice(0, 8);
const sha256 = (txt) => createHash('sha256').update(txt, 'utf8').digest('hex');
const aujourdhui = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });

const json = (donnee, statut = 200) => new Response(JSON.stringify(donnee), {
  status: statut,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
});

function erreurVersReponse(e) {
  if (e instanceof RefusAcces) return json({ erreur: e.message, code: e.code }, e.statut);
  if (e instanceof ErreurEditeur) return json({ erreur: e.message, code: e.code, details: e.details }, 422);
  if (e instanceof ErreurGithub) return json({ erreur: e.message, code: 'GITHUB', statut: e.statut }, 502);
  if (e && e.name === 'TimeoutError') return json({ erreur: 'Un service extérieur ne répond pas. Réessayez dans un instant.', code: 'DELAI' }, 504);
  return json({ erreur: 'Erreur inattendue : ' + (e && e.message ? e.message : String(e)), code: 'INTERNE' }, 500);
}

export const REGLAGES_DEFAUT = {
  regles: REGLES_DEFAUT,
  ia: { active: true, modele: 'claude-opus-5-5', effort: 'medium', plafondJour: 40 },
};

export function creerApi({ github, stockage, env = process.env, fetchFn = fetch, identifierFn = identifier, ia = null, lancerTravail = null }) {
  const qui = (req) => identifierFn(req, env, { fetchFn });
  const exigerGithub = () => {
    if (!github) throw new RefusAcces('L’éditeur n’est pas encore relié au dépôt du site (jeton GitHub absent). Prévenez Allan.', 503, 'NON_CONFIGURE');
    return github;
  };

  async function reglages() {
    const r = await stockage.lire('reglages');
    return { ...REGLAGES_DEFAUT, ...(r || {}), ia: { ...REGLAGES_DEFAUT.ia, ...((r && r.ia) || {}) } };
  }

  async function versions(gh, arbre) {
    const v = {};
    for (const [cle, chemin] of [['css', 'css/editeur-blocs.css'], ['js', 'js/editeur-blocs.js']]) {
      const e = arbre.get(chemin);
      if (e) v[cle] = empreinte8(await gh.blobOctets(e.sha));
    }
    return v;
  }
  const cacheVersions = new Map();
  async function versionsEnCache(gh, commit, arbre) {
    if (!cacheVersions.has(commit)) { if (cacheVersions.size > 10) cacheVersions.clear(); cacheVersions.set(commit, await versions(gh, arbre)); }
    return cacheVersions.get(commit);
  }

  // ------------------------------------------------------------------ travaux
  async function majTravail(id, champs) {
    const t = (await stockage.lire('travail:' + id)) || {};
    await stockage.ecrire('travail:' + id, { ...t, ...champs, maj: new Date().toISOString() });
  }

  /** Applique un lot de modifications sur le commit `base` (aucune écriture). */
  async function preparer(gh, lot, regl, etape) {
    const pages = Array.isArray(lot.pages) ? lot.pages : [];
    const nouvelles = Array.isArray(lot.nouvellesPages) ? lot.nouvellesPages : [];
    const medias = Array.isArray(lot.medias) ? lot.medias : [];
    if (!pages.length && !nouvelles.length) throw new ErreurEditeur('Aucune modification à publier.', 'VIDE');
    if (pages.length > 80 || nouvelles.length > 10 || medias.length > 80) throw new ErreurEditeur('Lot trop gros : publiez en plusieurs fois.', 'TROP');
    const total = pages.reduce((s, p) => s + ((p.ops && p.ops.length) || 0), 0);
    if (total > 4000) throw new ErreurEditeur('Trop de modifications d’un coup : publiez en plusieurs fois.', 'TROP');

    await etape('Lecture de la version publiée');
    const tete = await gh.teteBranche();
    const base = String(lot.base || '');
    if (!/^[0-9a-f]{40}$/.test(base)) throw new ErreurEditeur('Version de départ inconnue : rechargez l’éditeur.', 'BASE');
    if (base !== tete) {
      const c = await gh.comparer(base, tete);
      if (!['ahead', 'identical'].includes(c.status)) throw new ErreurEditeur('La version de départ n’est plus celle du site : rechargez l’éditeur.', 'BASE');
    }
    const arbre = await gh.arbre(base);
    const vers = await versionsEnCache(gh, base, arbre);

    // médias déposés pendant la modification (jamais à la place d'un fichier existant)
    const connus = new Set([...arbre.keys()].filter((p) => /^(img|video)\//.test(p)).map((p) => '/' + p));
    const entreesMedias = [];
    for (const m of medias) {
      const chemin = String(m.chemin || '');
      if (!MEDIA_RE.test(chemin)) throw new ErreurEditeur('Nom de fichier média invalide : ' + chemin, 'MEDIA');
      if (arbre.has(chemin)) throw new ErreurEditeur('Un fichier existe déjà à cet emplacement : ' + chemin, 'MEDIA');
      const fiche = await stockage.lire('media:' + m.sha);
      if (!fiche || fiche.chemin !== chemin) throw new ErreurEditeur('Média inconnu : déposez-le de nouveau (' + chemin + ').', 'MEDIA');
      connus.add('/' + chemin);
      entreesMedias.push({ chemin, sha: m.sha });
    }

    await etape('Application et contrôle des modifications');
    const fichiers = [];
    const relecture = [];
    const resume = [];
    const ctx = { versions: vers, medias: connus, exigerSignatures: true };
    const pagesExistantes = new Set([...arbre.keys()].filter((p) => p.endsWith('index.html') && !EXCLUS.test(p)).map((p) => '/' + p.replace(/index\.html$/, '')));
    for (const np of nouvelles) pagesExistantes.add('/' + String(np.slug || '').replace(/^\/+|\/+$/g, '') + '/');
    for (const p of pages) {
      const chemin = String(p.chemin || '');
      if (!chemin.endsWith('.html') || EXCLUS.test(chemin) || !arbre.has(chemin)) throw new ErreurEditeur('Page introuvable ou non modifiable : ' + chemin, 'PAGE');
      if (!Array.isArray(p.ops) || !p.ops.length) continue;
      const avant = await gh.blobTexte(arbre.get(chemin).sha);
      let res;
      try { res = appliquerOperations(avant, p.ops, ctx); } catch (e) { if (e instanceof ErreurEditeur) e.message = '/' + chemin.replace(/index\.html$/, '') + ' : ' + e.message; throw e; }
      for (const r of relire(res.page, { regles: regl.regles, pagesExistantes })) relecture.push({ ...r, chemin });
      for (const op of p.ops) resume.push({ chemin, texte: resumerOperation(op) });
      if (res.html !== avant) fichiers.push({ chemin, contenu: res.html });
    }
    let sitemap = arbre.has('sitemap.xml') ? await gh.blobTexte(arbre.get('sitemap.xml').sha) : null;
    const sitemapAvant = sitemap;
    for (const np of nouvelles) {
      const { fichier, url } = verifierChemin(np.slug, new Set(arbre.keys()));
      const modele = String(np.modele || 'contact/index.html');
      if (!arbre.has(modele) || EXCLUS.test(modele) || !modele.endsWith('.html')) throw new ErreurEditeur('Page modèle introuvable : ' + modele, 'MODELE');
      const cree = creerPage(await gh.blobTexte(arbre.get(modele).sha), np);
      const res = appliquerOperations(cree.html, Array.isArray(np.ops) ? np.ops : [], { ...ctx, nouvellePage: true });
      for (const r of relire(res.page, { regles: regl.regles, pagesExistantes })) relecture.push({ ...r, chemin: fichier });
      resume.push({ chemin: fichier, texte: 'Nouvelle page créée : ' + url });
      fichiers.push({ chemin: fichier, contenu: res.html, nouvelle: true });
      if (sitemap) sitemap = ajouterAuSitemap(sitemap, url, aujourdhui());
    }
    if (sitemap) {
      for (const f of fichiers) if (!f.nouvelle && f.chemin.endsWith('index.html')) sitemap = majDateSitemap(sitemap, urlDeFichier(f.chemin), aujourdhui());
      if (sitemap !== sitemapAvant) fichiers.push({ chemin: 'sitemap.xml', contenu: sitemap });
    }
    if (!fichiers.length && !entreesMedias.length) throw new ErreurEditeur('Ces modifications ne changent rien à la page publiée.', 'VIDE');
    return { base, tete, arbre, fichiers, entreesMedias, relecture, resume };
  }

  const nomBranche = (q) => 'editeur/' + new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14) + '-' + (q.nom || 'equipe').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 20);

  function titreCommit(lot, q, fichiers) {
    const pages = [...new Set(fichiers.filter((f) => f.chemin !== 'sitemap.xml').map((f) => f.chemin === 'index.html' ? 'accueil' : f.chemin.replace(/\/index\.html$/, '')))];
    const portee = pages.length > 2 ? pages.length + ' pages' : pages.join(', ');
    const msg = String(lot.message || '').replace(/\s+/g, ' ').trim().slice(0, 90) || 'mise à jour du contenu';
    return 'contenu(' + portee + '): ' + msg + ' — ' + q.nom + ' via l’éditeur';
  }

  function corpsPR(lot, q, prep) {
    const lignes = ['Modification préparée dans l’éditeur du site (gamedoor41.fr/editeur/) par **' + q.nom + '** (' + q.email + ').', ''];
    if (lot.message) lignes.push('> ' + String(lot.message).slice(0, 500), '');
    lignes.push('### Ce qui change');
    for (const r of prep.resume.slice(0, 120)) lignes.push('- `/' + r.chemin.replace(/index\.html$/, '') + '` : ' + r.texte);
    if (prep.resume.length > 120) lignes.push('- … et ' + (prep.resume.length - 120) + ' autres modifications');
    if (prep.entreesMedias.length) lignes.push('', prep.entreesMedias.length + ' image(s) ou vidéo(s) ajoutée(s).');
    const att = prep.relecture.filter((r) => r.niveau !== 'info');
    if (att.length) { lignes.push('', '### Relecture automatique'); for (const r of att.slice(0, 40)) lignes.push('- ' + (r.niveau === 'bloquant' ? '⛔ ' : '⚠️ ') + r.message); }
    lignes.push('', 'Règle de l’éditeur : aucun contenu publié n’a été retiré (contrôlé par le serveur).');
    return lignes.join('\n');
  }

  async function ecrireVersion(gh, prep, lot, q, etape) {
    await etape('Préparation de la nouvelle version');
    const entrees = [...prep.entreesMedias];
    for (const f of prep.fichiers) entrees.push({ chemin: f.chemin, sha: await gh.creerBlob(f.contenu, 'utf-8') });
    const tree = await gh.creerArbre(prep.arbre.treeSha, entrees);
    const titre = titreCommit(lot, q, prep.fichiers);
    const commit = await gh.creerCommit(titre + '\n\n' + prep.resume.slice(0, 60).map((r) => '- ' + r.texte).join('\n'), tree, prep.base, { nom: q.nom + ' (éditeur du site)', email: q.email });
    const branche = nomBranche(q);
    await gh.creerBranche(branche, commit);
    await etape('Création de l’aperçu en ligne');
    const pr = await gh.creerPR({ titre: 'Éditeur : ' + (String(lot.message || '').trim().slice(0, 80) || 'mise à jour du contenu') + ' (' + q.nom + ')', corps: corpsPR(lot, q, prep), tete: branche });
    await stockage.ecrire('pr:' + pr.numero, { numero: pr.numero, branche, commit, titre, auteur: { nom: q.nom, email: q.email, uid: q.uid }, empreinte: lot.empreinte || null, fichiers: prep.fichiers.map((f) => ({ chemin: f.chemin, sha256: sha256(f.contenu) })), date: new Date().toISOString() });
    return { ...pr, branche, commit, titre };
  }

  async function journaliser(entree) {
    const id = new Date().toISOString() + '-' + Math.random().toString(36).slice(2, 7);
    await stockage.ecrire('journal:' + id, { id, date: new Date().toISOString(), ...entree });
    return id;
  }

  async function mettreEnLigne(gh, numero, q, { programme = false } = {}) {
    const fiche = await stockage.lire('pr:' + numero);
    if (!fiche) throw new ErreurEditeur('Aperçu inconnu : relancez la publication.', 'PR');
    const pr = await gh.pr(numero);
    if (pr.merged) return { deja: true, commit: pr.merge_commit_sha, fiche };
    if (pr.state !== 'open') throw new ErreurEditeur('Cet aperçu a été fermé : relancez la publication.', 'PR');
    if (!/^editeur\//.test(pr.head.ref)) throw new ErreurEditeur('Seuls les aperçus créés par l’éditeur se publient d’ici.', 'PR');
    if (pr.head.sha !== fiche.commit) throw new ErreurEditeur('L’aperçu a été modifié en dehors de l’éditeur : publication refusée par sécurité.', 'PR');
    const commit = await gh.fusionner(numero, { titre: fiche.titre, message: 'Publié depuis l’éditeur du site par ' + q.nom + ' (' + q.email + ')' + (programme ? ' — publication programmée' : '') + '.', sha: fiche.commit });
    try { await gh.supprimerBranche(fiche.branche); } catch (_) { /* sans gravité */ }
    await stockage.ecrire('pr:' + numero, { ...fiche, publie: new Date().toISOString(), commitPublie: commit, publiePar: q.nom });
    return { commit, fiche };
  }

  /** Travail de fond : aperçu, publication, programmation, assistant. */
  async function executerTravail(req) {
    let id = null;
    try {
      const corps = await req.json();
      id = String(corps.id || '');
      if (!/^[a-z0-9-]{8,64}$/.test(id)) return json({ erreur: 'Travail sans identifiant.' }, 400);
      const q = await qui(req);
      await stockage.ecrire('travail:' + id, { id, type: corps.type, uid: q.uid, etat: 'en_cours', etapes: [], debut: new Date().toISOString() });
      const etapes = [];
      const etape = async (texte) => { etapes.push({ texte, date: new Date().toISOString() }); await majTravail(id, { etapes }); };

      if (corps.type === 'ia') {
        if (!ia) throw new ErreurEditeur('L’assistant n’est pas disponible.', 'IA');
        const regl = await reglages();
        if (!regl.ia.active) throw new ErreurEditeur('L’assistant a été désactivé par un admin.', 'IA');
        const jour = aujourdhui();
        const compteur = (await stockage.lire('ia-compteur:' + jour)) || { n: 0 };
        if (compteur.n >= Number(regl.ia.plafondJour || 40)) throw new ErreurEditeur('Plafond du jour atteint pour l’assistant (' + regl.ia.plafondJour + ' demandes). Il revient demain.', 'IA_PLAFOND');
        await stockage.ecrire('ia-compteur:' + jour, { n: compteur.n + 1 });
        await etape('L’assistant réfléchit');
        const resultat = await ia({ ...corps, qui: q, reglages: regl, env });
        await majTravail(id, { etat: 'termine', resultat, etapes });
        return json({ ok: true }, 200);
      }

      const gh = exigerGithub();
      const regl = await reglages();
      const lot = corps.lot || {};
      if (corps.type === 'publier' && corps.pr) {
        // publication d'un aperçu déjà prêt, si c'est bien le même lot
        const fiche = await stockage.lire('pr:' + Number(corps.pr));
        if (fiche && fiche.empreinte && fiche.empreinte === lot.empreinte) {
          await etape('Mise en ligne');
          const r = await mettreEnLigne(gh, Number(corps.pr), q);
          await journaliser({ type: 'publication', auteur: { nom: q.nom, email: q.email }, message: lot.message || '', pr: Number(corps.pr), commit: r.commit, fichiers: fiche.fichiers });
          await majTravail(id, { etat: 'termine', resultat: { pr: Number(corps.pr), commit: r.commit, fichiers: fiche.fichiers.map((f) => ({ ...f, url: f.chemin.endsWith('.html') ? urlDeFichier(f.chemin) : null })) }, etapes });
          return json({ ok: true });
        }
      }
      const prep = await preparer(gh, lot, regl, etape);
      if (aDesBloquants(prep.relecture)) {
        await majTravail(id, { etat: 'refuse', relecture: prep.relecture, erreur: 'La relecture automatique bloque la publication : corrigez les points signalés.', etapes });
        return json({ ok: false });
      }
      const pr = await ecrireVersion(gh, prep, lot, q, etape);
      const fichiers = prep.fichiers.map((f) => ({ chemin: f.chemin, sha256: sha256(f.contenu), url: f.chemin.endsWith('.html') ? urlDeFichier(f.chemin) : null }));
      if (corps.type === 'apercu') {
        await journaliser({ type: 'apercu', auteur: { nom: q.nom, email: q.email }, message: lot.message || '', pr: pr.numero, fichiers });
        await majTravail(id, { etat: 'termine', resultat: { pr: pr.numero, branche: pr.branche, fichiers, relecture: prep.relecture, resume: prep.resume }, etapes });
      } else if (corps.type === 'programmer') {
        const quand = new Date(corps.quand);
        if (isNaN(quand) || quand.getTime() < Date.now() + 60e3) throw new ErreurEditeur('Choisissez une date de publication dans le futur.', 'DATE');
        await stockage.ecrire('programme:' + pr.numero, { pr: pr.numero, quand: quand.toISOString(), auteur: { nom: q.nom, email: q.email, uid: q.uid }, message: lot.message || '', fichiers });
        await journaliser({ type: 'programmation', auteur: { nom: q.nom, email: q.email }, message: lot.message || '', pr: pr.numero, quand: quand.toISOString(), fichiers });
        await majTravail(id, { etat: 'termine', resultat: { pr: pr.numero, quand: quand.toISOString(), fichiers, relecture: prep.relecture }, etapes });
      } else {
        await etape('Mise en ligne');
        const r = await mettreEnLigne(gh, pr.numero, q);
        await journaliser({ type: 'publication', auteur: { nom: q.nom, email: q.email }, message: lot.message || '', pr: pr.numero, commit: r.commit, fichiers, resume: prep.resume.slice(0, 80) });
        await majTravail(id, { etat: 'termine', resultat: { pr: pr.numero, commit: r.commit, fichiers, relecture: prep.relecture }, etapes });
      }
      return json({ ok: true });
    } catch (e) {
      const rep = erreurVersReponse(e);
      if (id) {
        let msg = 'Erreur';
        try { msg = (await rep.clone().json()).erreur; } catch (_) { /* rien */ }
        await majTravail(id, { etat: 'erreur', erreur: msg, code: e && e.code, details: e && e.details });
      }
      return rep;
    }
  }

  /** Publications programmées arrivées à échéance (fonction planifiée). */
  async function publierProgrammes() {
    if (!github) return { publies: 0 };
    let publies = 0;
    for (const cle of await stockage.lister('programme:')) {
      const p = await stockage.lire(cle);
      if (!p || p.erreur || new Date(p.quand).getTime() > Date.now()) continue;
      try {
        const r = await mettreEnLigne(github, p.pr, { nom: p.auteur.nom, email: p.auteur.email }, { programme: true });
        await journaliser({ type: 'publication', auteur: p.auteur, message: (p.message || '') + ' (programmée)', pr: p.pr, commit: r.commit, fichiers: p.fichiers });
        await stockage.supprimer(cle);
        publies++;
      } catch (e) {
        await stockage.ecrire(cle, { ...p, erreur: e.message || String(e) });
      }
    }
    // aperçus en ligne jamais publiés depuis 7 jours : refermés (une fois par heure au plus)
    const dernier = await stockage.lire('menage');
    if (!dernier || Date.now() - new Date(dernier.date).getTime() > 3600e3) {
      await stockage.ecrire('menage', { date: new Date().toISOString() });
      const programmes = new Set((await stockage.lister('programme:')).map((c) => c.slice('programme:'.length)));
      for (const cle of await stockage.lister('pr:')) {
        const f = await stockage.lire(cle);
        if (!f || f.publie || programmes.has(String(f.numero)) || Date.now() - new Date(f.date).getTime() < 7 * 86400e3) continue;
        try {
          const pr = await github.pr(f.numero);
          if (pr && pr.state === 'open' && !pr.merged && /^editeur\//.test(pr.head.ref) && typeof github.fermerPR === 'function') {
            await github.fermerPR(f.numero);
            await github.supprimerBranche(f.branche);
          }
          await stockage.supprimer(cle);
        } catch (_) { /* on réessaiera */ }
      }
    }
    return { publies };
  }

  // ------------------------------------------------------------------ routes
  const routes = {
    'GET moi': async (req, q) => {
      const regl = await reglages();
      let commit = null;
      if (github) { try { commit = await github.teteBranche(); } catch (_) { /* affiché côté client */ } }
      return json({ qui: q, github: !!github, depot: github ? github.depot : null, commit, ia: !!ia && regl.ia.active && !!env.ANTHROPIC_API_KEY });
    },

    'GET pages': async (req) => {
      const gh = exigerGithub();
      const commit = new URL(req.url).searchParams.get('commit') || await gh.teteBranche();
      const arbre = await gh.arbre(commit);
      const pages = [];
      const medias = [];
      for (const [chemin, e] of arbre) {
        if (e.type !== 'blob') continue;
        if (chemin.endsWith('.html') && !EXCLUS.test(chemin) && !/(^|\/)(index-v\d|.*\.bak)\.html$/.test(chemin)) pages.push({ chemin, sha: e.sha, taille: e.taille });
        else if (/^(img|video)\/.+\.(webp|avif|jpe?g|png|gif|svg|mp4|webm)$/i.test(chemin)) medias.push({ chemin, sha: e.sha, taille: e.taille });
      }
      return json({ commit, pages, medias, versions: await versionsEnCache(gh, commit, arbre) });
    },

    'POST fichiers': async (req) => {
      const gh = exigerGithub();
      const { commit, chemins } = await req.json();
      if (!Array.isArray(chemins) || chemins.length > 30) throw new ErreurEditeur('30 pages au plus par demande.', 'TROP');
      const arbre = await gh.arbre(commit || await gh.teteBranche());
      const out = [];
      const file = [...chemins];
      const travailleur = async () => {
        while (file.length) {
          const chemin = String(file.shift());
          const e = arbre.get(chemin);
          if (!e || EXCLUS.test(chemin) || !/\.(html|xml)$/.test(chemin)) { out.push({ chemin, erreur: 'introuvable' }); continue; }
          out.push({ chemin, sha: e.sha, contenu: await gh.blobTexte(e.sha) });
        }
      };
      await Promise.all([travailleur(), travailleur(), travailleur(), travailleur(), travailleur(), travailleur()]);
      return json({ fichiers: out });
    },

    'POST media': async (req, q) => {
      const gh = exigerGithub();
      const { chemin, donnees } = await req.json();
      if (!MEDIA_RE.test(String(chemin || ''))) throw new ErreurEditeur('Nom de fichier invalide.', 'MEDIA');
      const octets = Buffer.from(String(donnees || ''), 'base64');
      if (!octets.length) throw new ErreurEditeur('Fichier vide.', 'MEDIA');
      if (octets.length > TAILLE_MAX_MEDIA) throw new ErreurEditeur('Fichier trop lourd (4 Mo au plus après compression).', 'MEDIA');
      const ext = chemin.split('.').pop();
      if (!TYPES_MEDIA[ext] || !TYPES_MEDIA[ext](octets)) throw new ErreurEditeur('Le contenu du fichier ne correspond pas à une image ou une vidéo valide.', 'MEDIA');
      const sha = await gh.creerBlob(octets.toString('base64'), 'base64');
      await stockage.ecrire('media:' + sha, { chemin, taille: octets.length, auteur: q.nom, date: new Date().toISOString() });
      return json({ sha, chemin });
    },

    'GET media': async (req) => {
      const gh = exigerGithub();
      const sha = new URL(req.url).searchParams.get('sha') || '';
      const fiche = /^[0-9a-f]{40}$/.test(sha) ? await stockage.lire('media:' + sha) : null;
      if (!fiche) return json({ erreur: 'Média inconnu.' }, 404);
      const octets = await gh.blobOctets(sha);
      const ext = fiche.chemin.split('.').pop();
      const types = { webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', avif: 'image/avif', mp4: 'video/mp4', webm: 'video/webm' };
      return new Response(octets, { headers: { 'Content-Type': types[ext] || 'application/octet-stream', 'Cache-Control': 'private, max-age=86400' } });
    },

    'GET brouillons': async () => {
      const out = [];
      for (const cle of await stockage.lister('brouillon:')) {
        const b = await stockage.lire(cle);
        if (b) out.push({ chemin: b.chemin, auteur: b.auteur, maj: b.maj, nbEtapes: (b.etapes || []).length, base: b.base, nouvelle: !!b.nouvelle });
      }
      return json({ brouillons: out });
    },
    'GET brouillon': async (req) => {
      const chemin = new URL(req.url).searchParams.get('chemin') || '';
      return json({ brouillon: await stockage.lire('brouillon:' + chemin) });
    },
    'PUT brouillon': async (req, q) => {
      const b = await req.json();
      const chemin = String(b.chemin || '');
      if (!/^[a-z0-9/_.-]+\.html$/.test(chemin) || EXCLUS.test(chemin)) throw new ErreurEditeur('Page invalide.', 'PAGE');
      if (JSON.stringify(b).length > 3e6) throw new ErreurEditeur('Brouillon trop gros.', 'TROP');
      const brouillon = { chemin, base: b.base, sha: b.sha || null, etapes: Array.isArray(b.etapes) ? b.etapes : [], medias: Array.isArray(b.medias) ? b.medias : [], nouvelle: b.nouvelle || null, auteur: { nom: q.nom, email: q.email }, maj: new Date().toISOString() };
      await stockage.ecrire('brouillon:' + chemin, brouillon);
      return json({ ok: true, maj: brouillon.maj });
    },
    'DELETE brouillon': async (req) => {
      const chemin = new URL(req.url).searchParams.get('chemin') || '';
      await stockage.supprimer('brouillon:' + chemin);
      return json({ ok: true });
    },

    'POST presence': async (req, q) => {
      const { chemin } = await req.json();
      await stockage.ecrire('presence:' + q.uid, { nom: q.nom, chemin: String(chemin || '').slice(0, 200), date: new Date().toISOString() });
      return json({ ok: true });
    },
    'GET presence': async (req, q) => {
      const out = [];
      for (const cle of await stockage.lister('presence:')) {
        const p = await stockage.lire(cle);
        if (p && Date.now() - new Date(p.date).getTime() < 120e3 && cle !== 'presence:' + q.uid) out.push(p);
      }
      return json({ presences: out });
    },

    'GET journal': async () => {
      const cles = (await stockage.lister('journal:')).reverse().slice(0, 60);
      const entrees = (await Promise.all(cles.map((c) => stockage.lire(c)))).filter(Boolean);
      const programmes = [];
      for (const c of await stockage.lister('programme:')) { const p = await stockage.lire(c); if (p) programmes.push(p); }
      return json({ entrees, programmes });
    },

    'GET reglages': async () => json({ reglages: await reglages() }),
    'PUT reglages': async (req, q) => {
      if (!q.admin) throw new RefusAcces('Réservé aux admins de l’éditeur.', 403, 'ADMIN');
      const r = await req.json();
      const actuel = await reglages();
      const regles = Array.isArray(r.regles) ? r.regles.slice(0, 200).map((x) => ({ motif: String(x.motif || '').slice(0, 300), niveau: ['bloquant', 'attention', 'info'].includes(x.niveau) ? x.niveau : 'attention', message: String(x.message || '').slice(0, 300) })).filter((x) => { try { new RegExp(x.motif, 'i'); return !!x.motif; } catch (_) { return false; } }) : actuel.regles;
      const iaR = r.ia || {};
      const modeles = ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5'];
      const nouveau = {
        regles,
        ia: {
          active: iaR.active == null ? actuel.ia.active : !!iaR.active,
          modele: modeles.includes(iaR.modele) ? iaR.modele : actuel.ia.modele,
          effort: ['low', 'medium', 'high'].includes(iaR.effort) ? iaR.effort : actuel.ia.effort,
          plafondJour: Math.max(0, Math.min(500, Number(iaR.plafondJour == null ? actuel.ia.plafondJour : iaR.plafondJour) || 0)),
        },
        maj: new Date().toISOString(), majPar: q.nom,
      };
      await stockage.ecrire('reglages', nouveau);
      return json({ reglages: nouveau });
    },

    'GET travail': async (req, q) => {
      const id = new URL(req.url).searchParams.get('id') || '';
      const t = await stockage.lire('travail:' + id);
      if (!t) return json({ etat: 'attente' });
      if (t.uid && t.uid !== q.uid && !q.admin) throw new RefusAcces('Ce travail appartient à quelqu’un d’autre.', 403);
      return json(t);
    },

    'GET statut': async (req) => {
      const gh = exigerGithub();
      const numero = Number(new URL(req.url).searchParams.get('pr'));
      const fiche = await stockage.lire('pr:' + numero);
      if (!fiche) return json({ erreur: 'Aperçu inconnu.' }, 404);
      const pr = await gh.pr(numero);
      let apercu = { etat: 'en_cours', url: null };
      try {
        const st = (await gh.statuts(pr.head.sha)).find((s) => /netlify/i.test(s.context) && /deploy/i.test(s.context));
        if (st) apercu = { etat: st.state === 'success' ? 'pret' : st.state === 'pending' ? 'en_cours' : 'echec', url: st.target_url || null };
      } catch (_) { /* statut pas encore là */ }
      if (!apercu.url) apercu.urlPrevue = 'https://deploy-preview-' + numero + '--gamedoor41.netlify.app/';
      return json({ pr: numero, ouvert: pr.state === 'open', fusionne: !!pr.merged, apercu, fiche });
    },

    'DELETE programmer': async (req, q) => {
      const numero = Number(new URL(req.url).searchParams.get('pr'));
      const p = await stockage.lire('programme:' + numero);
      if (!p) return json({ ok: true });
      if (p.auteur && p.auteur.uid !== q.uid && !q.admin) throw new RefusAcces('Seule la personne qui a programmé (ou un admin) peut annuler.', 403);
      await stockage.supprimer('programme:' + numero);
      await journaliser({ type: 'programmation-annulee', auteur: { nom: q.nom, email: q.email }, pr: numero });
      return json({ ok: true });
    },

    'POST signaler': async (req, q) => {
      const { chemin, message } = await req.json();
      const m = String(message || '').trim().slice(0, 2000);
      if (m.length < 5) throw new ErreurEditeur('Décrivez le problème en quelques mots.', 'VIDE');
      await journaliser({ type: 'signalement', auteur: { nom: q.nom, email: q.email }, chemin: String(chemin || '').slice(0, 200), message: m });
      return json({ ok: true });
    },
  };

  async function gerer(req) {
    const url = new URL(req.url);
    const nom = url.pathname.replace(/^.*\/api\/editeur\/?/, '').replace(/\/$/, '');
    const route = routes[req.method + ' ' + nom];
    if (!route) return json({ erreur: 'Adresse inconnue : ' + nom }, 404);
    try {
      const q = await qui(req);
      return await route(req, q);
    } catch (e) {
      return erreurVersReponse(e);
    }
  }

  return { gerer, executerTravail, publierProgrammes, preparer, reglages };
}
