// Cœur du serveur de l'éditeur, regroupé dans netlify/editeur-coeur.mjs par construire.mjs.
// Les fonctions Netlify (netlify/functions/editeur*.mjs) ne sont que de courts points d'entrée.
import { instance } from './instance.mjs';

export const gerer = async (req) => (await instance()).gerer(req);
export const executerTravail = async (req) => (await instance()).executerTravail(req);
export const publierProgrammes = async () => (await instance()).publierProgrammes();
