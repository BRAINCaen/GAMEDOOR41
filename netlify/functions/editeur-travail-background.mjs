// Point d’entrée de l’éditeur du site — écrit par editeur-src/construire.mjs.
// Fonction « de fond » (jusqu’à 15 min) : aperçu, publication, assistant.
import { executerTravail } from '../editeur-coeur.mjs';

export default async (req) => {
  await executerTravail(req);
};
