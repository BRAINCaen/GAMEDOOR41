// Défi de Noël des entreprises 2026 — point d'entrée. Toute la logique est dans ../defi-noel-coeur.mjs.
import { gererDefi } from '../defi-noel-coeur.mjs';

export default async (req) => gererDefi(req);

export const config = { path: '/api/defi-noel/*' };
