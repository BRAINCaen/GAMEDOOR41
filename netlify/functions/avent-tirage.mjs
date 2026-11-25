// Calendrier de l’Avent — écrit par avent-src/construire.mjs.
// Fonction planifiée, toutes les demi-heures : tirage de la veille dès midi, mail au gagnant, bilan à l'équipe.
import { tirageDuJour } from '../avent-coeur.mjs';

export default async () => { await tirageDuJour(); };

export const config = { schedule: '1,31 * * * *' };
