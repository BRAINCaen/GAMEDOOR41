// Point d’entrée de l’éditeur du site — écrit par editeur-src/construire.mjs.
// Fonction planifiée : publie les modifications programmées.
import { publierProgrammes } from '../editeur-coeur.mjs';

export default async () => {
  const r = await publierProgrammes();
  if (r && r.publies) console.log('Publications programmées mises en ligne : ' + r.publies);
};

export const config = { schedule: '*/5 * * * *' };
