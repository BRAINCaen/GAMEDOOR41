// Stockage du calendrier de l'Avent.
// En ligne : Netlify Blobs (lecture forte). Le vrai site et les aperçus ont
// chacun leur magasin : un essai sur un aperçu ne touche jamais aux vrais joueurs.
// En local (tests) : mémoire.

export function stockageMemoire() {
  const m = new Map();
  return {
    async lire(cle) { return m.has(cle) ? JSON.parse(m.get(cle)) : null; },
    async ecrire(cle, val, { siAbsent = false } = {}) { if (siAbsent && m.has(cle)) return false; m.set(cle, JSON.stringify(val)); return true; },
    async supprimer(cle) { m.delete(cle); },
    async lister(prefixe) { return [...m.keys()].filter((k) => k.startsWith(prefixe)).sort(); },
  };
}

export function stockageNetlify(nom) {
  let store = null;
  const magasin = async () => {
    if (!store) {
      const { getStore } = await import('@netlify/blobs');
      store = getStore({ name: nom, consistency: 'strong' });
    }
    return store;
  };
  return {
    async lire(cle) { return (await magasin()).get(cle, { type: 'json' }); },
    async ecrire(cle, val, { siAbsent = false } = {}) {
      const r = await (await magasin()).setJSON(cle, val, siAbsent ? { onlyIfNew: true } : undefined);
      return siAbsent ? !!(r && r.modified) : true;
    },
    async supprimer(cle) { await (await magasin()).delete(cle); },
    async lister(prefixe) {
      const { blobs } = await (await magasin()).list({ prefix: prefixe });
      return blobs.map((b) => b.key).sort();
    },
  };
}
