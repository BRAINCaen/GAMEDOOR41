// ==========================================================================
// Éditeur du site — ACCÈS AU DÉPÔT GITHUB (BRAINCaen/GAMEDOOR41)
//
// Jeton : variable Netlify EDITEUR_GITHUB_TOKEN (jeton « fine-grained » limité
// à ce dépôt : Contents + Pull requests en lecture/écriture). Jamais renvoyé
// au navigateur, jamais journalisé.
// Chaque appel a un délai maximal (AbortSignal) : une fonction Netlify qui
// attend sans fin est tuée sans pouvoir expliquer pourquoi.
// ==========================================================================

export class ErreurGithub extends Error {
  constructor(message, statut, detail) {
    super(message);
    this.statut = statut;
    this.detail = detail;
  }
}

export function creerGithub({ jeton, depot = 'BRAINCaen/GAMEDOOR41', branche = 'main', fetchFn = fetch, delaiMs = 8000 } = {}) {
  if (!jeton) return null;
  const api = 'https://api.github.com/repos/' + depot;
  const appel = async (methode, chemin, corps, { accepter = [], brut = false } = {}) => {
    const r = await fetchFn(api + chemin, {
      method: methode,
      headers: {
        Authorization: 'Bearer ' + jeton,
        Accept: brut ? 'application/vnd.github.raw' : 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'gamedoor41-editeur',
        ...(corps ? { 'Content-Type': 'application/json' } : {}),
      },
      body: corps ? JSON.stringify(corps) : undefined,
      signal: AbortSignal.timeout(delaiMs),
    });
    if (accepter.includes(r.status)) return { statut: r.status, json: null };
    if (!r.ok) {
      let detail = '';
      try { detail = (await r.json()).message || ''; } catch (_) { /* rien */ }
      const msg = r.status === 401 ? 'Le jeton GitHub de l’éditeur est refusé (expiré ?). Prévenez Allan.'
        : r.status === 403 ? 'GitHub refuse l’opération (droits du jeton ou limite d’appels).'
          : 'GitHub a répondu ' + r.status + (detail ? ' : ' + detail : '');
      throw new ErreurGithub(msg, r.status, detail);
    }
    if (r.status === 204) return { statut: 204, json: null };
    return { statut: r.status, json: brut ? await r.text() : await r.json() };
  };

  const arbres = new Map();
  return {
    depot,
    branche,
    async teteBranche() {
      const { json } = await appel('GET', '/git/ref/heads/' + branche);
      return json.object.sha;
    },
    async commit(sha) {
      const { json } = await appel('GET', '/git/commits/' + sha);
      return json;
    },
    /** Arbre complet d'un commit : Map chemin → { sha, taille, type } (mis en cache). */
    async arbre(commitSha) {
      if (arbres.has(commitSha)) return arbres.get(commitSha);
      const c = await this.commit(commitSha);
      const { json } = await appel('GET', '/git/trees/' + c.tree.sha + '?recursive=1');
      const m = new Map();
      for (const e of json.tree) m.set(e.path, { sha: e.sha, taille: e.size || 0, type: e.type });
      m.treeSha = c.tree.sha;
      if (arbres.size > 6) arbres.clear();
      arbres.set(commitSha, m);
      return m;
    },
    async blobTexte(sha) {
      const { json } = await appel('GET', '/git/blobs/' + sha);
      return Buffer.from(json.content, 'base64').toString('utf8');
    },
    async blobOctets(sha) {
      const { json } = await appel('GET', '/git/blobs/' + sha);
      return Buffer.from(json.content, 'base64');
    },
    async creerBlob(contenu, encodage = 'utf-8') {
      const { json } = await appel('POST', '/git/blobs', { content: contenu, encoding: encodage });
      return json.sha;
    },
    async creerArbre(baseTree, entrees) {
      const { json } = await appel('POST', '/git/trees', { base_tree: baseTree, tree: entrees.map((e) => ({ path: e.chemin, mode: '100644', type: 'blob', sha: e.sha })) });
      return json.sha;
    },
    async creerCommit(message, tree, parent, auteur) {
      const { json } = await appel('POST', '/git/commits', { message, tree, parents: [parent], ...(auteur ? { author: { name: auteur.nom, email: auteur.email, date: new Date().toISOString() } } : {}) });
      return json.sha;
    },
    async creerBranche(nom, sha) {
      await appel('POST', '/git/refs', { ref: 'refs/heads/' + nom, sha });
    },
    async supprimerBranche(nom) {
      // une branche de travail de l'éditeur (jamais main) : ce n'est pas du contenu du site
      if (!/^editeur\//.test(nom)) return;
      await appel('DELETE', '/git/refs/heads/' + nom, null, { accepter: [404, 422] });
    },
    async comparer(base, tete) {
      const { json } = await appel('GET', '/compare/' + base + '...' + tete);
      return json;
    },
    async creerPR({ titre, corps, tete }) {
      const { json } = await appel('POST', '/pulls', { title: titre, head: tete, base: branche, body: corps, maintainer_can_modify: true });
      try { await appel('POST', '/issues/' + json.number + '/labels', { labels: ['editeur'] }); } catch (_) { /* étiquette facultative */ }
      return { numero: json.number, url: json.html_url, sha: json.head.sha };
    },
    /** Ferme un aperçu jamais publié (copie de travail : rien n'est retiré du site). */
    async fermerPR(numero) {
      await appel('PATCH', '/pulls/' + numero, { state: 'closed' }, { accepter: [404, 422] });
    },
    async pr(numero) {
      const { json } = await appel('GET', '/pulls/' + numero);
      return json;
    },
    async fusionner(numero, { titre, message, sha }) {
      const { statut, json } = await appel('PUT', '/pulls/' + numero + '/merge', { merge_method: 'squash', commit_title: titre, commit_message: message, sha }, { accepter: [405, 409] });
      if (statut === 405 || statut === 409) throw new ErreurGithub('Cette modification ne peut pas être fusionnée automatiquement : la page a changé entre-temps sur le site. Rechargez la page et refaites la modification.', statut, 'conflit');
      return json.sha;
    },
    async statuts(sha) {
      const { json } = await appel('GET', '/commits/' + sha + '/status');
      return json.statuses || [];
    },
  };
}
