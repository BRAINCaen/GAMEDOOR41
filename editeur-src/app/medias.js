// ==========================================================================
// MÉDIAS : préparation des images dans le navigateur avant envoi
//  - redimensionnées en plusieurs largeurs (480 / 768 / 1200 / 1600 px,
//    jamais agrandies), compressées en WebP (JPEG si le navigateur ne sait
//    pas faire de WebP) — jamais de fichier brut de 4 Mo sur le site ;
//  - nom de fichier propre : img/editeur/AAAA-MM/<nom>-<largeur>w.webp ;
//  - les fichiers sont envoyés au dépôt tout de suite (stockés à part), et ne
//    deviennent visibles sur le site qu'à la publication.
// Vidéos : MP4/WebM de moins de 4 Mo seulement (sinon : YouTube / Vimeo).
// ==========================================================================

import { appel } from './api.js';
import { slugifier } from '../noyau/pages.mjs';

export const LARGEURS = [480, 768, 1200, 1600];
const memoire = new Map(); // chemin du site → URL locale (blob:) pour l'aperçu avant publication

export const urlLocale = (chemin) => memoire.get(chemin) || null;
export const urlsLocales = () => memoire;

async function enBase64(blob) {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let s = '';
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
  return btoa(s);
}

async function encoder(bitmap, largeur, type, qualite) {
  const h = Math.round(bitmap.height * largeur / bitmap.width);
  let canvas;
  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(largeur, h);
  } else {
    canvas = document.createElement('canvas');
    canvas.width = largeur;
    canvas.height = h;
  }
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, largeur, h);
  const blob = canvas.convertToBlob
    ? await canvas.convertToBlob({ type, quality: qualite })
    : await new Promise((r) => canvas.toBlob(r, type, qualite));
  return { blob, largeur, hauteur: h };
}

let webpOk = null;
async function webpPossible() {
  if (webpOk != null) return webpOk;
  try {
    const c = document.createElement('canvas');
    c.width = c.height = 2;
    webpOk = c.toDataURL('image/webp').startsWith('data:image/webp');
  } catch (_) { webpOk = false; }
  return webpOk;
}

const moisCourant = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' }).slice(0, 7);

/**
 * Prépare et envoie une image.
 * @param {File} fichier
 * @param {(t: string) => void} [suivi]
 * @returns {Promise<{ src, srcset, sizes, largeur, hauteur, medias: {chemin, sha}[], nom }>}
 */
export async function envoyerImage(fichier, suivi = () => {}) {
  if (!/^image\/(jpeg|png|webp|gif|avif|bmp|heic|heif)$/i.test(fichier.type) && !/\.(jpe?g|png|webp|gif|avif|bmp|heic)$/i.test(fichier.name)) {
    throw new Error('Format non pris en charge : utilisez une photo (JPG, PNG, WebP…).');
  }
  suivi('Lecture de l’image…');
  let bitmap;
  try { bitmap = await createImageBitmap(fichier); } catch (_) { throw new Error('Cette image ne peut pas être lue (format HEIC d’iPhone ? Exportez-la en JPG).'); }
  if (bitmap.width < 200) throw new Error('Image trop petite (200 px de large au minimum).');
  const webp = await webpPossible();
  const type = webp ? 'image/webp' : 'image/jpeg';
  const ext = webp ? 'webp' : 'jpg';
  const base = slugifier(fichier.name.replace(/\.[a-z0-9]+$/i, '')) || 'image';
  const suffixe = Math.random().toString(36).slice(2, 6);
  const dossier = 'img/editeur/' + moisCourant() + '/';
  const largeurs = LARGEURS.filter((l) => l < bitmap.width);
  if (!largeurs.length || bitmap.width <= 1600 && !largeurs.includes(bitmap.width)) largeurs.push(Math.min(bitmap.width, 1600));
  const variantes = [];
  for (const l of [...new Set(largeurs)].sort((a, b) => a - b)) {
    suivi('Compression ' + l + ' px…');
    const v = await encoder(bitmap, l, type, 0.8);
    if (v.blob.size > 4.2 * 1024 * 1024) continue;
    variantes.push({ ...v, chemin: dossier + base + '-' + suffixe + '-' + l + 'w.' + ext });
  }
  if (!variantes.length) throw new Error('Image trop lourde même compressée.');
  const medias = [];
  for (const v of variantes) {
    suivi('Envoi ' + v.largeur + ' px…');
    const r = await appel('media', { methode: 'POST', corps: { chemin: v.chemin, donnees: await enBase64(v.blob) } });
    medias.push({ chemin: v.chemin, sha: r.sha });
    memoire.set('/' + v.chemin, URL.createObjectURL(v.blob));
  }
  const defaut = variantes.find((v) => v.largeur >= 768) || variantes[variantes.length - 1];
  return {
    src: '/' + defaut.chemin,
    srcset: variantes.map((v) => '/' + v.chemin + ' ' + v.largeur + 'w').join(', '),
    sizes: '(max-width: 768px) 100vw, 1200px',
    largeur: defaut.largeur,
    hauteur: defaut.hauteur,
    medias,
    nom: fichier.name,
  };
}

export async function envoyerVideo(fichier, suivi = () => {}) {
  const ext = /webm/i.test(fichier.type) ? 'webm' : 'mp4';
  if (!/^video\/(mp4|webm)$/i.test(fichier.type)) throw new Error('Vidéo : formats MP4 ou WebM seulement.');
  if (fichier.size > 4.2 * 1024 * 1024) throw new Error('Vidéo trop lourde (4 Mo au plus). Pour une vidéo plus longue, publiez-la sur YouTube et ajoutez le bloc « Vidéo YouTube ».');
  const chemin = 'img/editeur/' + moisCourant() + '/' + (slugifier(fichier.name.replace(/\.[a-z0-9]+$/i, '')) || 'video') + '-' + Math.random().toString(36).slice(2, 6) + '.' + ext;
  suivi('Envoi de la vidéo…');
  const r = await appel('media', { methode: 'POST', corps: { chemin, donnees: await enBase64(fichier) } });
  memoire.set('/' + chemin, URL.createObjectURL(fichier));
  return { src: '/' + chemin, medias: [{ chemin, sha: r.sha }] };
}

/** Recharge l'aperçu d'un média pas encore publié (brouillon ouvert sur un autre appareil). */
export async function rechargerMedia(m) {
  if (memoire.has('/' + m.chemin)) return;
  try {
    const blob = await appel('media?sha=' + m.sha, { binaire: true });
    memoire.set('/' + m.chemin, URL.createObjectURL(blob));
  } catch (_) { /* l'image s'affichera après publication */ }
}

/** Remplace, dans le HTML du canevas, les médias pas encore publiés par leur copie locale. */
export function remplacerMediasLocaux(html) {
  if (!memoire.size) return html;
  return html.replace(/(["\s,])(\/img\/editeur\/[^"\s,]+)/g, (t, avant, chemin) => (memoire.has(chemin) ? avant + memoire.get(chemin) : t));
}

/** Regroupe les déclinaisons d'une même image (-480w, -768w…) pour la médiathèque. */
export function regrouperImages(medias) {
  const groupes = new Map();
  for (const m of medias) {
    if (!/^img\//.test(m.chemin) || /\.(mp4|webm)$/.test(m.chemin)) continue;
    const cle = m.chemin.replace(/-(\d{3,4})w(?=\.)/, '').replace(/\.(webp|avif|jpe?g|png|gif|svg)$/i, '');
    const largeur = Number((/-(\d{3,4})w\./.exec(m.chemin) || [])[1] || 0);
    if (!groupes.has(cle)) groupes.set(cle, { cle, nom: cle.split('/').pop(), dossier: cle.split('/').slice(1, -1).join('/'), variantes: [] });
    groupes.get(cle).variantes.push({ ...m, largeur, format: m.chemin.split('.').pop().toLowerCase() });
  }
  const out = [];
  for (const g of groupes.values()) {
    const webp = g.variantes.filter((v) => v.format === 'webp' && v.largeur).sort((a, b) => a.largeur - b.largeur);
    const toutes = webp.length ? webp : g.variantes.filter((v) => v.largeur).sort((a, b) => a.largeur - b.largeur);
    const seule = g.variantes.find((v) => ['webp', 'jpg', 'jpeg', 'png', 'svg', 'gif'].includes(v.format)) || g.variantes[0];
    const vignette = (toutes.find((v) => v.largeur >= 400) || toutes[0] || seule).chemin;
    const defaut = (toutes.find((v) => v.largeur >= 768) || toutes[toutes.length - 1] || seule).chemin;
    out.push({
      ...g,
      vignette: '/' + vignette,
      src: '/' + defaut,
      srcset: toutes.length > 1 ? toutes.map((v) => '/' + v.chemin + ' ' + v.largeur + 'w').join(', ') : null,
    });
  }
  return out.sort((a, b) => a.cle.localeCompare(b.cle));
}
