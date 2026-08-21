#!/usr/bin/env node
// Portraits de la page /equipe/ : fabrique les images affichees sur la page,
// a partir des memes sources que les signatures email.
//
// POURQUOI 480 px
//   La page affiche les portraits dans une grille, autour de 240 px de large.
//   On sert donc du 480 : deux fois la taille d'affichage, net sur les ecrans
//   de telephone (d'ou viennent 87 % des visites). Inutile d'aller au-dela,
//   ce serait du poids pour rien.
//
// TROIS FORMATS
//   avif (le plus leger), webp (bien supporte partout), jpg (filet de securite
//   pour les vieux clients). La page les propose dans cet ordre avec <picture>,
//   le navigateur prend le premier qu'il sait lire. C'est la convention du
//   depot, voir img/escape/.
//
// La liste de l'equipe vit dans generate-email-signatures.mjs : ce script la
// relit, pour qu'une personne ajoutee la-bas apparaisse ici sans rien oublier.
//
// Idempotent : relancer ne fait rien de plus.
//
// Usage : node scripts/generate-equipe-photos.mjs [--dry-run]

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { EQUIPE, AVATAR_DEFAUT } from './generate-email-signatures.mjs';

const ROOT = process.cwd();
const dryRun = process.argv.includes('--dry-run');
const DOSSIER = 'img/Team';
const COTE = 480;

const dossier = path.join(ROOT, DOSSIER);
if (!dryRun) fs.mkdirSync(dossier, { recursive: true });

for (const membre of EQUIPE) {
  const source = path.join(ROOT, membre.photo ?? AVATAR_DEFAUT);
  if (!fs.existsSync(source)) {
    console.error(`  !! introuvable : ${membre.photo} (${membre.slug})`);
    process.exitCode = 1;
    continue;
  }

  const image = sharp(source, { density: 600 });
  const { width, height } = await image.metadata();
  const cadrage = membre.photo ? membre.cadrage : null;
  const cote = cadrage ? cadrage.side : Math.min(width, height);
  const carre = cadrage
    ? { left: cadrage.left, top: cadrage.top }
    : { left: Math.round((width - cote) / 2), top: Math.round((height - cote) / 2) };

  const base = image
    .extract({ left: carre.left, top: carre.top, width: cote, height: cote })
    .resize(COTE, COTE, { fit: 'cover' });

  const nom = path.join(dossier, `equipe-${membre.slug}`);
  if (!dryRun) {
    await base.clone().avif({ quality: 60 }).toFile(`${nom}.avif`);
    await base.clone().webp({ quality: 80 }).toFile(`${nom}.webp`);
    await base.clone().jpeg({ quality: 82, mozjpeg: true }).toFile(`${nom}.jpg`);
  }
  console.log(`  equipe-${membre.slug}  (source ${cote}px)`);
}

console.log(`\n${EQUIPE.length} portraits en ${COTE}x${COTE}, trois formats${dryRun ? ' (simulation)' : ''}.`);
