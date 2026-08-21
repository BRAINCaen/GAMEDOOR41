# Signatures email GAMEDOOR·41 — mode d'emploi

Huit signatures, une par personne. Elles sont **déjà fabriquées** : les photos
et le logo sont en ligne, il n'y a rien à uploader. Il ne reste qu'à les coller
dans Gmail.

## Installer sa signature dans Gmail

1. Ouvrir le fichier `signature-<prénom>.html` dans un navigateur
   (double-clic sur le fichier, ou clic droit → Ouvrir avec → Chrome / Edge)
2. Tout sélectionner (**Ctrl+A**) puis copier (**Ctrl+C**)
3. Gmail → Paramètres → Voir tous les paramètres → onglet Général → Signature
4. Coller (**Ctrl+V**) dans le champ, puis **Enregistrer les modifications** en bas de page

Ne pas passer par le Bloc-notes ou Word : la mise en forme et les liens seraient perdus.

Les fichiers disponibles :

| Fichier | Personne | Rôle |
|---|---|---|
| `signature-polar.html` | Polar | Responsable de site |
| `signature-red.html` | Red | Chef de projet & Event |
| `signature-lwiz.html` | Lwiz | RH & Community Manager |
| `signature-lily-rose.html` | Lily-Rose | Ambassadrice GAMEDOOR·41 |
| `signature-quentin.html` | Quentin | Graphiste & Event |
| `signature-makalu.html` | Makalù | Communication & Graphiste |
| `signature-jules.html` | Jules | Chargé d'affaires |
| `signature-allan.html` | Allan | Gestionnaire |

## Ce qui est cliquable

- le **téléphone** → appel direct depuis un mobile
- l'**email** → ouvre un nouveau message
- l'**adresse** → ouvre la fiche Google Maps de GAMEDOOR·41
- la **photo**, le **logo** et **gamedoor41.fr** → ouvrent le site

## Coordonnées utilisées

- Téléphone : **06 31 46 93 22** (le numéro du site, aussi WhatsApp)
- Emails : `prénom@gamedoor41.fr` — polar, red, lwiz, lily-rose, quentin,
  makalu (sans accent), jules, allan
- Adresse : 41 bis rue Pasteur, 14120 Mondeville

## Il manque encore la photo de Jules

Jules est arrivé après la séance photo : il n'a pas de visuel dans le dossier
Drive *Cadre photo / fini*. Sa signature affiche pour l'instant l'icône **G·**
de la marque à la place du portrait — c'est propre, mais moins personnel.

Dès que son visuel existe, il suffit de le dire : deux minutes de travail, et
lui seul aura à recoller sa signature.

## Refaire les signatures (si un numéro, un rôle ou une photo change)

Ne pas modifier les huit fichiers HTML à la main : ils sont **générés**, la
prochaine régénération effacerait la correction. Tout se règle dans un seul
fichier, `scripts/generate-email-signatures.mjs` (le téléphone, l'adresse et la
liste de l'équipe sont en haut, bien visibles), puis :

```bash
node scripts/generate-email-signatures.mjs
```

Les huit fichiers HTML et les neuf images sont refaits. Chaque personne
concernée doit ensuite **recoller sa signature dans Gmail** : Gmail garde une
copie du texte, il ne se met pas à jour tout seul. Les photos, elles, sont
chargées depuis le site : les changer suffit, sans rien recoller.

## Pourquoi ce dossier n'est pas publié

`netlify.toml` renvoie `/signatures/*` en 404 : ces fichiers contiennent les
huit adresses email de l'équipe, et une page publique qui liste huit adresses
est ramassée en quelques jours par les robots à spam. Les **images**, elles,
sont bien publiques (`/img/signature/`) — c'est indispensable : une signature
email ne transporte pas ses images, elle va les chercher sur gamedoor41.fr à
chaque ouverture du message.
