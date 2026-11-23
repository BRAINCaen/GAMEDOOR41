// Connexion avec le compte Synergia (projet Firebase de Synergia) : Google (adresse
// @gamedoor41.fr ou compte Google habituel de Synergia) ou adresse + mot de passe de
// Synergia (comme dans l'appli Android). Allan, 23/11/2026 : « tous les membres actifs ».
// Le serveur revérifie TOUT (jeton, domaine, compte actif) : ce fichier ne sert
// qu'à obtenir le jeton. Mode essai (local uniquement) : ?essai=nom
//
// 23/11/2026 (Makalu bloqué au premier clic) :
//  - le module Firebase est INCLUS dans l'éditeur (plus de téléchargement à la
//    volée depuis gstatic, que bloqueurs de pub et certains réseaux coupent) ;
//  - la fenêtre Google s'ouvre DANS le clic, sans attente avant (Safari sur
//    iPhone bloque une fenêtre ouverte après une attente) ;
//  - plus de repli « pleine page » automatique (cassé sur Safari quand le
//    domaine de connexion n'est pas celui du site) : message clair à la place ;
//  - navigateurs intégrés (appli Gmail, Facebook, Instagram…) détectés : Google
//    y refuse la connexion, on invite à ouvrir la page dans Chrome ou Safari ;
//  - chaque erreur affiche son code technique (capture d'écran = diagnostic).
import { initializeApp } from 'firebase/app';
import {
  initializeAuth, browserLocalPersistence, indexedDBLocalPersistence, browserPopupRedirectResolver,
  GoogleAuthProvider, signInWithPopup, signInWithRedirect, onAuthStateChanged, signOut,
  signInWithEmailAndPassword, sendPasswordResetEmail,
} from 'firebase/auth';

const CONFIG = {
  apiKey: 'AIzaSyD7uBuAQaOhZ02owkZEuMKC5Vji6PrB2f8',
  authDomain: 'synergia-app-f27e7.firebaseapp.com',
  projectId: 'synergia-app-f27e7',
  appId: '1:201912738922:web:2fcc1e49293bb632899613',
};

const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
const essai = local ? new URLSearchParams(location.search).get('essai') : null;

let auth = null;
let erreurInit = null;
try {
  const app = initializeApp(CONFIG, 'editeur-site');
  auth = initializeAuth(app, {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence],
    popupRedirectResolver: browserPopupRedirectResolver,
  });
} catch (e) { erreurInit = e; }

const fournisseur = () => {
  const p = new GoogleAuthProvider();
  // pas de « hd » : le compte Google habituel de Synergia (même perso) doit pouvoir être choisi
  p.setCustomParameters({ prompt: 'select_account' });
  return p;
};

/** Navigateur intégré à une application (Google y refuse la connexion). */
export function navigateurIntegre() {
  const ua = navigator.userAgent || '';
  if (/GSA\//.test(ua)) return 'l’application Google';
  if (/FBAN|FBAV|FB_IAB/.test(ua)) return 'Facebook';
  if (/Instagram/.test(ua)) return 'Instagram';
  if (/LinkedInApp/.test(ua)) return 'LinkedIn';
  if (/Snapchat/.test(ua)) return 'Snapchat';
  if (/TikTok|musical_ly|BytedanceWebview/i.test(ua)) return 'TikTok';
  if (/WhatsApp/i.test(ua)) return 'WhatsApp';
  if (/Gmail|GmailWebView/i.test(ua)) return 'Gmail';
  if (/; wv\)/.test(ua)) return 'une application';
  if (/(iPhone|iPad|iPod).*AppleWebKit(?!.*Safari)/.test(ua)) return 'une application';
  return null;
}

export async function surChangement(cb) {
  if (essai) { setTimeout(() => cb({ email: essai + '@gamedoor41.fr', displayName: essai }), 0); return () => {}; }
  if (!auth) throw erreurInit || new Error('Connexion indisponible');
  return onAuthStateChanged(auth, cb);
}

/** À appeler DIRECTEMENT dans le clic (aucune attente avant l'ouverture de la fenêtre). */
export function connecter() {
  if (essai) return Promise.resolve();
  if (!auth) return Promise.reject(erreurInit || new Error('Connexion indisponible'));
  return signInWithPopup(auth, fournisseur());
}

/** Adresse + mot de passe du compte Synergia. */
export function connecterMotDePasse(adresse, motDePasse) {
  if (essai) return Promise.resolve();
  if (!auth) return Promise.reject(erreurInit || new Error('Connexion indisponible'));
  return signInWithEmailAndPassword(auth, String(adresse || '').trim(), String(motDePasse || ''));
}

/** Lien « choisir un nouveau mot de passe » envoyé par Synergia (même compte). */
export function motDePasseOublie(adresse) {
  if (essai) return Promise.resolve();
  if (!auth) return Promise.reject(erreurInit || new Error('Connexion indisponible'));
  auth.languageCode = 'fr';
  return sendPasswordResetEmail(auth, String(adresse || '').trim());
}

/** Connexion en pleine page (proposée seulement si la fenêtre est bloquée). */
export function connecterPleinePage() {
  if (!auth) return Promise.reject(erreurInit || new Error('Connexion indisponible'));
  return signInWithRedirect(auth, fournisseur());
}

export async function deconnecter() {
  if (essai) { location.search = ''; return; }
  if (auth) await signOut(auth);
}

export async function jeton(forcer = false) {
  if (essai) return 'essai:' + essai;
  const u = auth && auth.currentUser;
  return u ? u.getIdToken(forcer) : null;
}

/** Message clair pour les erreurs de connexion, toujours avec le code technique. */
export function messageErreur(e) {
  const c = (e && e.code) || '';
  const code = c ? ' (code : ' + c + ')' : (e && e.message ? ' (' + String(e.message).slice(0, 120) + ')' : '');
  const appli = navigateurIntegre();
  if (appli && /popup|operation-not-supported|web-storage|internal-error|network/.test(c)) {
    return 'Vous êtes dans le navigateur intégré ' + (appli === 'une application' ? 'd’une application' : 'de ' + appli) + ', où Google refuse la connexion. Ouvrez gamedoor41.fr/editeur/ dans Chrome ou Safari, ou connectez-vous avec l’adresse et le mot de passe de Synergia.' + code;
  }
  switch (c) {
    case 'auth/unauthorized-domain': return 'Cette adresse n’est pas autorisée pour la connexion : utilisez https://gamedoor41.fr/editeur/' + code;
    case 'auth/popup-blocked': return 'Le navigateur a bloqué la fenêtre de connexion Google. Autorisez les fenêtres pop-up pour gamedoor41.fr (ou essayez la connexion en pleine page ci-dessous).' + code;
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request': return 'La fenêtre de connexion a été fermée avant la fin. Réessayez.' + code;
    case 'auth/network-request-failed': return 'Google ne répond pas : vérifiez la connexion internet, ou désactivez le bloqueur de publicité pour gamedoor41.fr.' + code;
    case 'auth/web-storage-unsupported': return 'Votre navigateur bloque le stockage nécessaire à la connexion (navigation privée, cookies bloqués ou bloqueur). Ouvrez la page dans Chrome ou Safari, en navigation normale.' + code;
    case 'auth/operation-not-supported-in-this-environment': return 'Ce navigateur ne permet pas la connexion Google. Ouvrez gamedoor41.fr/editeur/ dans Chrome ou Safari.' + code;
    case 'auth/internal-error': return 'Erreur de connexion côté Google. Réessayez dans Chrome ou Safari ; si cela recommence, envoyez une capture de ce message à Allan.' + code;
    case 'auth/admin-restricted-operation': return 'Synergia n’accepte pas encore ce compte Google : connectez-vous avec le compte que vous utilisez pour Synergia (Google, ou adresse et mot de passe).' + code;
    case 'auth/account-exists-with-different-credential': return 'Cette adresse est liée à un autre mode de connexion dans Synergia : connectez-vous ici avec l’adresse et le mot de passe de Synergia, ou avec le compte Google que vous utilisez pour Synergia.' + code;
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
    case 'auth/wrong-password':
    case 'auth/user-not-found': return 'Adresse ou mot de passe incorrect : utilisez ceux de votre compte Synergia (ou « Mot de passe oublié »).' + code;
    case 'auth/invalid-email':
    case 'auth/missing-email': return 'Adresse e-mail invalide : vérifiez-la.' + code;
    case 'auth/missing-password': return 'Saisissez votre mot de passe Synergia.' + code;
    case 'auth/user-disabled': return 'Ce compte est désactivé dans Synergia.' + code;
    case 'auth/too-many-requests': return 'Trop de tentatives : patientez quelques minutes puis réessayez.' + code;
    default: return 'Connexion impossible. Envoyez une capture de ce message à Allan.' + code;
  }
}
