// Connexion Google (compte @gamedoor41.fr) avec le projet Firebase de Synergia.
// Le serveur revérifie TOUT (jeton, domaine, compte actif) : ce fichier ne sert
// qu'à obtenir le jeton. Mode essai (local uniquement) : ?essai=nom
const CONFIG = {
  apiKey: 'AIzaSyD7uBuAQaOhZ02owkZEuMKC5Vji6PrB2f8',
  authDomain: 'synergia-app-f27e7.firebaseapp.com',
  projectId: 'synergia-app-f27e7',
  appId: '1:201912738922:web:2fcc1e49293bb632899613',
};
const BASE = 'https://www.gstatic.com/firebasejs/11.0.0/';

const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
const essai = local ? new URLSearchParams(location.search).get('essai') : null;

let charge = null;
async function charger() {
  if (!charge) {
    charge = (async () => {
      const urlApp = BASE + 'firebase-app.js';
      const urlAuth = BASE + 'firebase-auth.js';
      const [app, a] = await Promise.all([import(/* @vite-ignore */ urlApp), import(/* @vite-ignore */ urlAuth)]);
      const instance = app.initializeApp(CONFIG, 'editeur-site');
      const auth = a.getAuth(instance);
      await a.setPersistence(auth, a.browserLocalPersistence);
      try { await a.getRedirectResult(auth); } catch (_) { /* rien */ }
      return { a, auth };
    })();
  }
  return charge;
}

export async function surChangement(cb) {
  if (essai) { setTimeout(() => cb({ email: essai + '@gamedoor41.fr', displayName: essai }), 0); return () => {}; }
  const { a, auth } = await charger();
  return a.onAuthStateChanged(auth, cb);
}

export async function connecter() {
  if (essai) return;
  const { a, auth } = await charger();
  const p = new a.GoogleAuthProvider();
  p.setCustomParameters({ hd: 'gamedoor41.fr', prompt: 'select_account' });
  try {
    await a.signInWithPopup(auth, p);
  } catch (e) {
    if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment')) return a.signInWithRedirect(auth, p);
    throw e;
  }
}

export async function deconnecter() {
  if (essai) { location.search = ''; return; }
  const { a, auth } = await charger();
  await a.signOut(auth);
}

export async function jeton(forcer = false) {
  if (essai) return 'essai:' + essai;
  const { auth } = await charger();
  const u = auth.currentUser;
  return u ? u.getIdToken(forcer) : null;
}

/** Message clair pour les erreurs de connexion Firebase. */
export function messageErreur(e) {
  const c = e && e.code;
  if (c === 'auth/unauthorized-domain') return 'Ce site n’est pas encore autorisé à utiliser la connexion de Synergia. Allan doit ajouter « gamedoor41.fr » dans les domaines autorisés (console Firebase › Authentication › Paramètres).';
  if (c === 'auth/popup-closed-by-user' || c === 'auth/cancelled-popup-request') return 'Fenêtre de connexion fermée.';
  if (c === 'auth/network-request-failed') return 'Pas de connexion internet.';
  return 'Connexion impossible : ' + (e && e.message ? e.message : String(e));
}
