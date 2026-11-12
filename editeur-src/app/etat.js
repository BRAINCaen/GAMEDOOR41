// État global de l'éditeur (petit magasin + abonnement Preact par sélecteur)
import { useEffect, useReducer, useRef } from 'preact/hooks';

const abonnes = new Set();

export const etat = {
  qui: null,              // { uid, email, nom, admin }
  connexion: 'attente',   // attente | deconnecte | connecte | refus
  erreurConnexion: null,
  config: null,           // { github, ia, commit, depot }
  commit: null,           // version du site chargée
  pages: [],              // [{ chemin, sha, taille }]
  medias: [],             // [{ chemin, sha, taille }]
  versions: {},           // empreintes des fichiers communs des blocs
  titres: {},             // chemin → titre (<title>)
  docs: {},               // chemin → DocumentEdition
  courant: null,          // chemin de la page ouverte
  selection: null,        // id data-gdx
  survol: null,
  edition: null,          // id en cours d'édition de texte
  appareil: 'ordinateur', // ordinateur | tablette | telephone | cote
  zoom: 'ajuste',
  appareilStyle: 'tous',  // tous | tablette | telephone | survol
  panneau: 'ajouter',
  panneauOuvert: true,
  inspecteurOuvert: true,
  ongletInspecteur: 'contenu',
  modale: null,           // { type, ...données }
  menu: null,             // menu contextuel { x, y, id }
  toasts: [],
  presences: [],
  brouillonsServeur: [],
  apercuPlein: false,
  reglages: null,
  rev: 0,                 // révision : change à chaque modification d'un document
  presse: null,           // élément copié (HTML)
};

export function maj(partiel) {
  Object.assign(etat, typeof partiel === 'function' ? partiel(etat) : partiel);
  for (const f of [...abonnes]) f();
}

export const toucher = () => maj({ rev: etat.rev + 1 });

function egal(a, b) {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (const k of ka) if (a[k] !== b[k]) return false;
  return true;
}

/** Hook : relit l'état choisi et ne redessine que s'il a changé. */
export function useEtat(selecteur) {
  const [, forcer] = useReducer((x) => x + 1, 0);
  const sel = useRef(selecteur);
  sel.current = selecteur;
  const valeur = selecteur(etat);
  const derniere = useRef(valeur);
  derniere.current = valeur;
  useEffect(() => {
    const f = () => {
      const v = sel.current(etat);
      if (!egal(v, derniere.current)) forcer();
    };
    abonnes.add(f);
    return () => abonnes.delete(f);
  }, []);
  return valeur;
}

let idToast = 0;
export function toast(message, type = 'info', duree = 4500) {
  const id = ++idToast;
  maj({ toasts: [...etat.toasts, { id, message, type }] });
  if (duree) setTimeout(() => maj({ toasts: etat.toasts.filter((t) => t.id !== id) }), duree);
  return id;
}

export const docCourant = () => (etat.courant ? etat.docs[etat.courant] : null);
