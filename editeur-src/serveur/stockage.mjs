// ==========================================================================
// Éditeur du site — PETIT STOCKAGE (brouillons partagés, historique,
// réglages, travaux en cours, programmations, médias déposés)
// En ligne : Netlify Blobs (magasin « editeur », lecture forte), ouvert au
// premier besoin. En local (tests) : mémoire.
// ==========================================================================

export function stockageMemoire() {
  const m = new Map();
  return {
    async lire(cle) { return m.has(cle) ? JSON.parse(m.get(cle)) : null; },
    async ecrire(cle, val) { m.set(cle, JSON.stringify(val)); },
    async supprimer(cle) { m.delete(cle); },
    async lister(prefixe) { return [...m.keys()].filter((k) => k.startsWith(prefixe)).sort(); },
  };
}

export async function stockageNetlify() {
  let store = null;
  const magasin = async () => {
    if (!store) {
      const { getStore } = await import('@netlify/blobs');
      store = getStore({ name: 'editeur', consistency: 'strong' });
    }
    return store;
  };
  return {
    async lire(cle) {
      try { return await (await magasin()).get(cle, { type: 'json' }); } catch (_) { return null; }
    },
    async ecrire(cle, val) { await (await magasin()).setJSON(cle, val); },
    async supprimer(cle) { await (await magasin()).delete(cle); },
    async lister(prefixe) {
      const { blobs } = await (await magasin()).list({ prefix: prefixe });
      return blobs.map((b) => b.key).sort();
    },
  };
}
