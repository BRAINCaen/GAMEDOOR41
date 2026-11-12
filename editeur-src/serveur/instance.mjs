// Instance unique de l'API pour les fonctions Netlify (réutilisée d'un appel à l'autre)
import { creerApi } from './api.mjs';
import { creerGithub } from './github.mjs';
import { stockageNetlify } from './stockage.mjs';
import { demanderAssistant } from './ia.mjs';

let promesse = null;
export function instance() {
  if (!promesse) {
    promesse = (async () => creerApi({
      github: creerGithub({
        jeton: process.env.EDITEUR_GITHUB_TOKEN,
        depot: process.env.EDITEUR_DEPOT || 'BRAINCaen/GAMEDOOR41',
        branche: process.env.EDITEUR_BRANCHE || 'main',
      }),
      stockage: await stockageNetlify(),
      ia: demanderAssistant,
    }))();
  }
  return promesse;
}
