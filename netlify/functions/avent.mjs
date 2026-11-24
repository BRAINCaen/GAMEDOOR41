// Calendrier de l’Avent — écrit par avent-src/construire.mjs.
import { gererAvent } from '../avent-coeur.mjs';

export default async (req, context) => gererAvent(req, context);

export const config = { path: '/api/avent/*' };
