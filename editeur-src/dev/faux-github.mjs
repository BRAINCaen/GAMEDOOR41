// Faux GitHub pour les essais : lit le dépôt local, écrit en mémoire.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

export function creerFauxGithub(RACINE, { port = 8941 } = {}) {
  const git = (...args) => execFileSync('git', args, { cwd: RACINE, encoding: 'buffer', maxBuffer: 1 << 28 });
  const blobs = new Map();   // sha → Buffer (créés pendant l'essai)
  const arbresCrees = new Map(); // sha → Map
  const commits = new Map(); // sha → { tree, parent, message }
  const refs = new Map();    // branche → sha
  const prs = new Map();
  let teteMain = git('rev-parse', 'HEAD').toString().trim();
  let numeroPR = 900;
  const shaDe = (s) => createHash('sha1').update(String(s) + Math.random()).digest('hex');
  
  const fauxGithub = {
    depot: 'essai/local', branche: 'main',
    async teteBranche() { return teteMain; },
    async commit(sha) { if (commits.has(sha)) return { tree: { sha: commits.get(sha).tree } }; return { tree: { sha: git('rev-parse', sha + '^{tree}').toString().trim() } }; },
    async arbre(commitSha) {
      if (commits.has(commitSha)) { const c = commits.get(commitSha); const m = new Map(arbresCrees.get(c.tree)); m.treeSha = c.tree; return m; }
      const m = new Map();
      for (const ligne of git('ls-tree', '-r', '-l', commitSha).toString().split('\n')) {
        const x = /^\d+ (\w+) ([0-9a-f]+)\s+(\S+)\t(.+)$/.exec(ligne);
        if (x) m.set(x[4], { sha: x[2], taille: Number(x[3]) || 0, type: x[1] });
      }
      m.treeSha = git('rev-parse', commitSha + '^{tree}').toString().trim();
      arbresCrees.set(m.treeSha, m);
      return m;
    },
    async blobTexte(sha) { return (blobs.get(sha) || git('cat-file', 'blob', sha)).toString('utf8'); },
    async blobOctets(sha) { return blobs.get(sha) || git('cat-file', 'blob', sha); },
    async creerBlob(contenu, encodage = 'utf-8') { const sha = shaDe(contenu); blobs.set(sha, encodage === 'base64' ? Buffer.from(contenu, 'base64') : Buffer.from(contenu, 'utf8')); return sha; },
    async creerArbre(baseTree, entrees) { const m = new Map(arbresCrees.get(baseTree)); for (const e of entrees) m.set(e.chemin, { sha: e.sha, taille: 0, type: 'blob' }); const sha = shaDe('arbre'); arbresCrees.set(sha, m); return sha; },
    async creerCommit(message, tree, parent) { const sha = shaDe(message); commits.set(sha, { tree, parent, message }); return sha; },
    async creerBranche(nom, sha) { refs.set(nom, sha); },
    async supprimerBranche(nom) { refs.delete(nom); },
    async comparer(base, tete) { return { status: base === tete ? 'identical' : 'ahead' }; },
    async creerPR({ titre, corps, tete }) { const n = ++numeroPR; prs.set(n, { number: n, title: titre, body: corps, state: 'open', merged: false, head: { ref: tete, sha: refs.get(tete) }, cree: Date.now() }); return { numero: n, url: 'http://localhost/pr/' + n, sha: refs.get(tete) }; },
    async pr(n) { return prs.get(Number(n)); },
    async fusionner(n, { titre }) {
      const p = prs.get(Number(n));
      p.merged = true; p.state = 'closed'; p.merge_commit_sha = p.head.sha; p.titreFusion = titre;
      teteMain = p.head.sha;
      return p.head.sha;
    },
    async statuts(sha) {
      const p = [...prs.values()].find((x) => x.head.sha === sha);
      if (!p) return [];
      const pret = Date.now() - p.cree > 3000;
      return [{ context: 'netlify/gamedoor41/deploy-preview', state: pret ? 'success' : 'pending', target_url: 'http://localhost:' + port + '/__dev/apercu/' + p.number }];
    },
  };
  
    return { fauxGithub, blobs, prs, commits, get teteMain() { return teteMain; } };
}
