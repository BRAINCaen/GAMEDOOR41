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
// PHOTOS MANQUANTES
//   Quatre visuels du dossier "Cadre photo / fini !" ne sont pas dans le depot
//   (Lily-Rose, Quentin, Makalu, Jules). Leur signature utilise en attendant
//   l'avatar carre GAMEDOOR-41. Pour mettre la vraie photo : deposer le JPG
//   dans img/Team/, renseigner "photo" dans EQUIPE ci-dessous, relancer.
//
// Idempotent : relancer ne fait rien de plus.
//
// Usage : node scripts/generate-email-signatures.mjs [--dry-run]

import fs from 'node:fs';
import path from 'node:path';
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
const BASELINE = 'Escape Game &amp; Quiz Game';

// --- charte --------------------------------------------------------------

const ORANGE = '#E07020';
const NOIR = '#0C0800';
const GRIS = '#6B6459';
const FILET = '#E3DDD2';

// --- l'equipe ------------------------------------------------------------
// slug : sert au nom de fichier, au nom d'image ET a l'adresse email.

const EQUIPE = [
  { slug: 'polar',     prenom: 'Polar',     role: 'Responsable de site',        photo: 'img/Team/Polar Caron Caen.jpg' },
  { slug: 'red',       prenom: 'Red',       role: 'Chef de projet &amp; Event', photo: 'img/Team/Red Houlette Caen.jpg' },
  { slug: 'lwiz',      prenom: 'Lwiz',      role: 'RH &amp; Community Manager', photo: 'img/Team/Lwiz Carré Caen.jpg' },
  { slug: 'lily-rose', prenom: 'Lily-Rose', role: 'Ambassadrice GAMEDOOR&#183;41', photo: null },
  { slug: 'quentin',   prenom: 'Quentin',   role: 'Graphiste &amp; Event',      photo: null },
  { slug: 'makalu',    prenom: 'Makal&ugrave;', role: 'Communication &amp; Graphiste', photo: null },
  { slug: 'jules',     prenom: 'Jules',     role: "Charg&eacute; d'affaires",   photo: null },
  { slug: 'allan',     prenom: 'Allan',     role: 'Gestionnaire',               photo: 'img/Team/Allan-brain-caen-escape-game-quiz-game2025_.jpg' },
];

// L'avatar carre de la charte, utilise tant que la vraie photo manque.
const AVATAR_DEFAUT = 'img/logo/logo-avatar-square.svg';
// Logo pose sous la signature. Version "fond blanc" : Gmail compose sur blanc.
const LOGO_SOURCE = 'img/logo/logo-horizontal-white-bg.svg';

const DOSSIER_IMG = 'img/signature';
const DOSSIER_HTML = 'signatures';

// --- images --------------------------------------------------------------

// 240x240 : deux fois la taille d'affichage (120 px), pour rester net sur les
// ecrans retina. Les visuels "Cadre photo" font 386x376, quasi carres : on
// recadre au centre, on ne deforme jamais.
async function fabriquerPhoto(source, destination) {
  const image = sharp(source, { density: 600 });
  const { width, height } = await image.metadata();
  const cote = Math.min(width, height);
  return image
    .extract({
      left: Math.round((width - cote) / 2),
      top: Math.round((height - cote) / 2),
      width: cote,
      height: cote,
    })
    .resize(240, 240, { fit: 'cover' })
    .png({ compressionLevel: 9 })
    .toFile(destination);
}

// Logo 1000x180 -> 450x81, affiche en 150x27.
async function fabriquerLogo(destination) {
  return sharp(path.join(ROOT, LOGO_SOURCE), { density: 600 })
    .resize(450, 81, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(destination);
}

// --- gabarit HTML --------------------------------------------------------
//
// Tout est en tableaux et en styles "inline" : c'est la seule mise en forme
// qu'Outlook, Gmail et Apple Mail respectent tous les trois. Pas de CSS dans
// l'en-tete (Gmail le supprime au collage), pas de flexbox, pas de police
// exotique (Arial est la seule presente partout).

function ligneContact(libelle, lien, texte) {
  return `          <tr>
            <td style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;color:${ORANGE};letter-spacing:0.5px;padding:0 12px 5px 0;white-space:nowrap;vertical-align:top;">${libelle}</td>
            <td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:18px;padding:0 0 5px 0;vertical-align:top;"><a href="${lien}" style="color:${NOIR};text-decoration:none;">${texte}</a></td>
          </tr>`;
}

function signature({ slug, prenom, role }) {
  const email = `${slug}@gamedoor41.fr`;
  // Le prenom sert de texte alternatif : si le destinataire bloque les images
  // (Outlook le fait par defaut), il lit le prenom a la place du cadre vide.
  const prenomTexte = prenom.replace(/&#183;/g, '.').replace(/&ugrave;/g, 'u');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex, nofollow">
<title>Signature email — ${prenomTexte} — GAMEDOOR·41</title>
</head>
<body style="margin:24px;background:#ffffff;">
<!-- Tout selectionner (Ctrl+A), copier (Ctrl+C), coller dans Gmail :
     Parametres > Voir tous les parametres > General > Signature.
     Ne rien ajouter sur cette page : ce qui est ici est ce qui sera colle. -->
<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;color:${NOIR};">
  <tr>
    <td style="vertical-align:top;padding:0 18px 0 0;">
      <img src="${SITE}/${DOSSIER_IMG}/${slug}.png" alt="${prenomTexte}" width="120" height="120" style="display:block;width:120px;height:120px;border:0;border-radius:10px;">
    </td>
    <td style="vertical-align:top;padding:2px 0 0 18px;border-left:3px solid ${ORANGE};">
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:19px;font-weight:bold;line-height:23px;color:${NOIR};">${prenom}</div>
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;line-height:16px;color:${ORANGE};letter-spacing:0.6px;text-transform:uppercase;padding-top:3px;">${role}</div>
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:16px;color:${GRIS};padding-top:2px;">GAMEDOOR&#183;41 &mdash; ${BASELINE}</div>
      <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;margin-top:12px;">
${ligneContact('T&Eacute;L', `tel:${TEL_LIEN}`, TEL_AFFICHE)}
${ligneContact('EMAIL', `mailto:${email}`, email)}
${ligneContact('ADRESSE', MAPS, ADRESSE)}
      </table>
    </td>
  </tr>
  <tr>
    <td colspan="2" style="padding:16px 0 0 0;">
      <table cellpadding="0" cellspacing="0" border="0" role="presentation" width="100%" style="border-collapse:collapse;">
        <tr>
          <td style="border-top:1px solid ${FILET};padding:12px 0 0 0;vertical-align:middle;">
            <a href="${SITE}/" style="text-decoration:none;"><img src="${SITE}/${DOSSIER_IMG}/logo-gamedoor41.png" alt="GAMEDOOR·41" width="150" height="27" style="display:block;width:150px;height:27px;border:0;"></a>
          </td>
          <td align="right" style="border-top:1px solid ${FILET};padding:12px 0 0 0;vertical-align:middle;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:18px;">
            <a href="${SITE}/" style="color:${ORANGE};text-decoration:none;font-weight:bold;">gamedoor41.fr</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>
`;
}

// --- execution -----------------------------------------------------------

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
  if (!dryRun) await fabriquerPhoto(source, destination);
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
