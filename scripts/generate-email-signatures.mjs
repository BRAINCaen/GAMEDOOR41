#!/usr/bin/env node
// Signatures email GAMEDOOR-41 : genere les 8 fichiers HTML de signature
// et les images qui vont avec.
//
// POURQUOI UN SCRIPT
//   Huit signatures identiques a la virgule pres, sauf trois lignes (prenom,
//   role, email). Le jour ou le numero de telephone ou l'adresse change, une
//   seule ligne est a corriger ici, puis "node scripts/generate-email-signatures.mjs"
//   remet les huit fichiers d'aplomb. Editer huit fichiers a la main garantit
//   qu'il en restera un avec l'ancien numero.
//
// CE QUE LE SCRIPT PRODUIT
//   signatures/signature-<prenom>.html  -> a ouvrir dans un navigateur,
//                                          Ctrl+A / Ctrl+C, coller dans Gmail
//   img/signature/<prenom>.png          -> la photo, carree, 240x240
//   img/signature/logo-gamedoor41.png   -> le logo de la signature
//
// LES IMAGES DOIVENT ETRE EN LIGNE
//   Une signature email n'embarque pas ses images : elle pointe vers des URL.
//   C'est pour cela que les PNG vont dans /img/signature/ (public, servi par
//   gamedoor41.fr) alors que les fichiers HTML vont dans /signatures/ (renvoye
//   en 404 par netlify.toml : les huit adresses email de l'equipe n'ont rien a
//   faire sur une page publique, les robots a spam les ramassent).
//
// D'OU VIENNENT LES PHOTOS
//   Du Drive partage : TEAM GAMEDOOR-41 > Communication > Quentin et makalu >
//   Cadre photo > fini. Ce sont les portraits serres prepares par la comm.
//
// PHOTO MANQUANTE
//   Jules est arrive apres la seance photo : il n'a pas de visuel dans ce
//   dossier. Sa signature utilise en attendant
//   l'avatar carre GAMEDOOR-41. Pour mettre la vraie photo : deposer le JPG
//   dans img/Team/, renseigner "photo" dans EQUIPE ci-dessous, relancer.
//
// Idempotent : relancer ne fait rien de plus.
//
// Usage : node scripts/generate-email-signatures.mjs [--dry-run]

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

const ROOT = process.cwd();
const dryRun = process.argv.includes('--dry-run');

// --- coordonnees communes ------------------------------------------------
// Reference : la fiche de contact du site (contact/index.html). Ne rien
// inventer ici : un mauvais numero part dans tous les emails de l'equipe.

const SITE = 'https://gamedoor41.fr';
const TEL_AFFICHE = '06 31 46 93 22';
const TEL_LIEN = '+33631469322';
const ADRESSE = '41 bis rue Pasteur, 14120 Mondeville';
const MAPS = 'https://www.google.com/maps/place/?q=place_id:ChIJD_Yw80FoCkgRiwEBVG0aGK8';
const TAGLINE = 'ESCAPE <span style="color:#FF8228;">&#183;</span> QUIZ <span style="color:#FF8228;">&#183;</span> ACTION';

// --- charte --------------------------------------------------------------
// Signature sur fond sombre, comme le maquettage valide par l'equipe.
// ORANGE sert au filet de la photo, ORANGE_VIF au texte (plus lisible sur
// fond noir que le #E07020 de la charte print).

const FOND = '#0C0800';
const ORANGE = '#E07020';
const ORANGE_VIF = '#FF8228';
const CREME = '#F0EBE2';
const GRIS_CLAIR = '#B9B0A2';

// Barlow Condensed est la police de la marque, mais aucune messagerie ne la
// telechargera : Arial Narrow prend le relais (presente sur Windows et Mac),
// puis Arial. Le rendu reste condense et proche de la charte.
const POLICE = "'Barlow Condensed','Arial Narrow',Arial,Helvetica,sans-serif";

// --- l'equipe ------------------------------------------------------------
// slug : sert au nom de fichier, au nom d'image ET a l'adresse email.
//
// cadrage : facultatif, { left, top, side } en pixels du fichier source. Les
// portraits de signature du Drive (dossier partage TEAM GAMEDOOR-41 > Communication
// > Quentin et makalu > Cadre photo > fini) sont deja serres et quasi carres :
// le recadrage automatique au centre suffit. Le champ reste la pour un visuel
// en pied, ou un carre centre couperait la tete.

export const EQUIPE = [
  { slug: 'polar',     prenom: 'POLAR',     role: 'RESPONSABLE DE SITE',        photo: 'img/Team/Polar.jpg' },
  { slug: 'red',       prenom: 'RED',       role: 'CHEF DE PROJET &amp; EVENT', photo: 'img/Team/Red.jpg' },
  { slug: 'lwiz',      prenom: 'LWIZ',      role: 'RH &amp; COMMUNITY MANAGER', photo: 'img/Team/Lwiz.jpg' },
  { slug: 'lily-rose', prenom: 'LILY-ROSE', role: 'AMBASSADRICE GAMEDOOR&#183;41', photo: 'img/Team/Lily-Rose.jpg' },
  { slug: 'quentin',   prenom: 'QUENTIN',   role: 'GRAPHISTE &amp; EVENT',      photo: 'img/Team/Quentin.jpg' },
  { slug: 'makalu',    prenom: 'MAKAL&Ugrave;', role: 'COMMUNICATION &amp; GRAPHISTE', photo: 'img/Team/Makalu.jpg' },
  { slug: 'jules',     prenom: 'JULES',     role: 'CHARG&Eacute; D&#x27;AFFAIRES', photo: null },
  // Portrait en pied comme Lily-Rose, Quentin et Makalu : cadrage explicite.
  { slug: 'allan',     prenom: 'ALLAN',     role: 'GESTIONNAIRE',               photo: 'img/Team/Allan.jpg', cadrage: { left: 235, top: 176, side: 560 } },
];

// L'icone "G·" de la charte, utilisee tant que la vraie photo manque : elle
// tient le carre sans repeter le logo complet, deja present a droite.
export const AVATAR_DEFAUT = 'img/logo/logo-icon-g.svg';
// Logo du bloc de droite. Version claire sur fond transparent : la signature
// est posee sur le noir chaud de la marque.
const LOGO_SOURCE = 'img/logo/logo-horizontal.svg';
const LOGO_LARGEUR = 200;
const LOGO_HAUTEUR = 30;

const DOSSIER_IMG = 'img/signature';
const DOSSIER_HTML = 'signatures';

// --- images --------------------------------------------------------------

// 240x240 : deux fois la taille d'affichage (120 px), pour rester net sur les
// ecrans retina. On recadre en carre, on ne deforme jamais.
async function fabriquerPhoto(source, destination, cadrage) {
  const image = sharp(source, { density: 600 });
  const { width, height } = await image.metadata();
  const cote = cadrage ? cadrage.side : Math.min(width, height);
  const carre = cadrage
    ? { left: cadrage.left, top: cadrage.top }
    : { left: Math.round((width - cote) / 2), top: Math.round((height - cote) / 2) };

  if (carre.left + cote > width || carre.top + cote > height) {
    throw new Error(`cadrage hors de l'image pour ${source}`);
  }

  return image
    .extract({ left: carre.left, top: carre.top, width: cote, height: cote })
    .resize(240, 240, { fit: 'cover' })
    .png({ compressionLevel: 9 })
    .toFile(destination);
}

// Logo rendu au double de sa taille d'affichage, marges transparentes du SVG
// enlevees (trim) pour que les 200x30 annonces soient bien du logo et non du
// vide. fit "contain" : jamais d'etirement, la charte l'interdit.
async function fabriquerLogo(destination) {
  const rendu = await sharp(path.join(ROOT, LOGO_SOURCE), { density: 600 })
    .png()
    .toBuffer();
  return sharp(rendu)
    .trim()
    .resize(LOGO_LARGEUR * 2, LOGO_HAUTEUR * 2, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toFile(destination);
}

// --- gabarit HTML --------------------------------------------------------
//
// Tout est en tableaux et en styles "inline" : c'est la seule mise en forme
// qu'Outlook, Gmail et Apple Mail respectent tous les trois. Pas de CSS dans
// l'en-tete (Gmail le supprime au collage), pas de flexbox, pas de classe.
//
// Trois colonnes : la photo, l'identite et les contacts, le bloc de marque.

function ligneContact(symbole, lien, texte, couleur) {
  return `<a href="${lien}" style="color:${couleur};text-decoration:none;"><span style="color:${ORANGE_VIF};font-weight:900;">${symbole}</span>&nbsp; ${texte}</a>`;
}

function signature({ slug, prenom, role }) {
  const email = `${slug}@gamedoor41.fr`;
  // Le prenom sert de texte alternatif : si le destinataire bloque les images
  // (Outlook le fait par defaut), il lit le prenom a la place du cadre vide.
  const prenomTexte = prenom
    .replace(/&#183;/g, '.')
    .replace(/&Ugrave;/g, 'U')
    .replace(/&Eacute;/g, 'E')
    .replace(/&#x27;/g, "'");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex, nofollow">
<title>Signature email — ${prenomTexte} — GAMEDOOR·41</title>
</head>
<body style="margin:0;padding:24px;background:#ffffff;">
<!-- Tout selectionner (Ctrl+A), copier (Ctrl+C), coller dans Gmail :
     Parametres > Voir tous les parametres > General > Signature.
     Ne rien ajouter sur cette page : ce qui est ici est ce qui sera colle. -->
<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;background-color:${FOND};font-family:${POLICE};">
<tr>
  <!-- photo -->
  <td width="132" valign="middle" style="padding:18px 0 18px 18px;">
    <a href="${SITE}" style="text-decoration:none;">
      <img src="${SITE}/${DOSSIER_IMG}/${slug}.png" width="120" height="120" alt="${prenomTexte}"
           style="display:block;width:120px;height:120px;border:3px solid ${ORANGE};border-radius:16px;background-color:#1a130a;">
    </a>
  </td>

  <!-- identite + contacts -->
  <td valign="middle" style="padding:18px 26px 18px 20px;">
    <div style="font-family:${POLICE};font-size:26px;font-weight:900;color:${CREME};letter-spacing:.5px;line-height:1.1;">${prenom}</div>
    <div style="font-family:${POLICE};font-size:15px;font-weight:600;color:${ORANGE_VIF};letter-spacing:1.2px;line-height:1.3;padding-top:2px;">${role}</div>
    <div style="height:10px;line-height:10px;font-size:0;">&nbsp;</div>
    <div style="font-family:${POLICE};font-size:14px;line-height:1.75;color:${CREME};">
      ${ligneContact('&#9742;', `tel:${TEL_LIEN}`, TEL_AFFICHE, CREME)}<br>
      ${ligneContact('&#9993;', `mailto:${email}`, email, CREME)}<br>
      ${ligneContact('&#8962;', MAPS, ADRESSE, GRIS_CLAIR)}
    </div>
  </td>

  <!-- bloc marque -->
  <td width="230" valign="middle" align="center" style="padding:18px 22px 18px 22px;border-left:2px solid rgba(224,112,32,.5);">
    <a href="${SITE}" style="text-decoration:none;">
      <img src="${SITE}/${DOSSIER_IMG}/logo-gamedoor41.png" width="${LOGO_LARGEUR}" height="${LOGO_HAUTEUR}" alt="GAMEDOOR 41" style="display:block;border:0;width:${LOGO_LARGEUR}px;height:${LOGO_HAUTEUR}px;">
    </a>
    <div style="font-family:${POLICE};font-size:12px;font-weight:600;letter-spacing:3px;color:${CREME};padding-top:10px;white-space:nowrap;">${TAGLINE}</div>
    <div style="padding-top:8px;"><a href="${SITE}" style="font-family:${POLICE};font-size:15px;font-weight:600;color:${ORANGE_VIF};text-decoration:none;">gamedoor41.fr</a></div>
  </td>
</tr>
</table>
</body>
</html>
`;
}

// --- execution -----------------------------------------------------------
//
// La liste EQUIPE est exportee : scripts/generate-equipe-photos.mjs la relit
// pour fabriquer les portraits de la page /equipe/. On ne genere donc les
// signatures que si ce fichier est lance directement, pas quand il est importe.

if (import.meta.url !== pathToFileURL(process.argv[1]).href) {
  // Importe par un autre script : on s'arrete la, seules les donnees servent.
} else {

const dossierImg = path.join(ROOT, DOSSIER_IMG);
const dossierHtml = path.join(ROOT, DOSSIER_HTML);
if (!dryRun) {
  fs.mkdirSync(dossierImg, { recursive: true });
  fs.mkdirSync(dossierHtml, { recursive: true });
}

let images = 0;
let pages = 0;
const sansPhoto = [];

for (const membre of EQUIPE) {
  const source = path.join(ROOT, membre.photo ?? AVATAR_DEFAUT);
  if (!fs.existsSync(source)) {
    console.error(`  !! introuvable : ${membre.photo} (${membre.slug})`);
    process.exitCode = 1;
    continue;
  }
  if (!membre.photo) sansPhoto.push(membre.slug);

  const destination = path.join(dossierImg, `${membre.slug}.png`);
  if (!dryRun) await fabriquerPhoto(source, destination, membre.photo ? membre.cadrage : null);
  images++;

  const fichier = path.join(dossierHtml, `signature-${membre.slug}.html`);
  if (!dryRun) fs.writeFileSync(fichier, signature(membre), 'utf8');
  pages++;
  console.log(`  ${membre.slug.padEnd(10)} ${membre.photo ? 'photo' : 'AVATAR PAR DEFAUT'}`);
}

if (!dryRun) await fabriquerLogo(path.join(dossierImg, 'logo-gamedoor41.png'));

console.log(`\n${pages} signatures, ${images + 1} images${dryRun ? ' (simulation)' : ''}.`);
if (sansPhoto.length) {
  console.log(`Photo a fournir pour : ${sansPhoto.join(', ')} — avatar GAMEDOOR-41 en attendant.`);
}
}
