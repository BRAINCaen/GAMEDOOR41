// Point d’entrée de l’éditeur du site — écrit par editeur-src/construire.mjs.
import { gerer } from '../editeur-coeur.mjs';

export default async (req) => gerer(req);

export const config = { path: '/api/editeur/*' };
