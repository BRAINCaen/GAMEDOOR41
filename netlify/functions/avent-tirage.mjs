// Calendrier de l’Avent — écrit par avent-src/construire.mjs.
// Fonction planifiée : tirage au sort de la veille, tous les jours à midi (11 h UTC = midi à Paris en hiver).
import { tirageDuJour } from '../avent-coeur.mjs';

export default async () => { await tirageDuJour(); };

export const config = { schedule: '0 11 * * *' };
