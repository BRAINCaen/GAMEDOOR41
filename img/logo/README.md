# Logos GAMEDOOR·41 — Kit complet

Charte graphique v1.0 · Marque INPI n° 5247839

## Fichiers disponibles (27 SVG)

### Logos horizontaux — 900×180

| Fichier | Usage |
|---|---|
| `logo-horizontal.svg` | **Principal** — fond sombre |
| `logo-horizontal-light-bg.svg` | Fond crème clair |
| `logo-horizontal-white-bg.svg` | Fond blanc (administratif) |
| `logo-horizontal-mono-white.svg` | Monochrome blanc (gravure) |
| `logo-horizontal-mono-black.svg` | Monochrome noir (N&B, tampons) |
| `logo-horizontal-orange-bg.svg` | Fond orange (merch) |
| `logo-no-accent.svg` | Sans point médian (technique) |
| `logo-watermark.svg` | Filigrane transparent |

### Logos empilés — 500×280

| Fichier | Usage |
|---|---|
| `logo-stacked.svg` | Vertical (signalétique, enseigne) |
| `logo-stacked-tagline.svg` | Avec tagline "Escape · Quiz · Action" |

### Icônes et avatars — 512×512

| Fichier | Usage |
|---|---|
| `logo-icon.svg` | Icône `·41` (app, RS) |
| `logo-icon-g.svg` | Icône `G·` (favicon carré) |
| `logo-avatar-square.svg` | Avatar carré (Insta, FB, TikTok) |
| `logo-badge-round.svg` | Badge rond orange |
| `favicon.svg` | Favicon 32×32 |

### Sous-marques — 900×240

| Fichier | Accent |
|---|---|
| `logo-escape.svg` | Rouge #c62828 — Brain Escape Game |
| `logo-quiz.svg` | Cyan #00e5ff — Buzz Your Brain |
| `logo-action.svg` | Vert #76ff03 — Action Game |
| `logo-events.svg` | Or #FFD740 — Events & Réceptions |

### Bannières & thumbnails

| Fichier | Dimensions | Usage |
|---|---|---|
| `youtube-banner.svg` | 2560×1440 | Bannière YouTube |
| `youtube-thumbnail.svg` | 1280×720 | Thumbnail générique |
| `youtube-thumbnail-escape.svg` | 1280×720 | Thumbnail Escape (rouge) |
| `youtube-thumbnail-quiz.svg` | 1280×720 | Thumbnail Quiz (cyan) |
| `linkedin-banner.svg` | 1584×396 | Bannière LinkedIn |
| `facebook-cover.svg` | 1640×624 | Cover Facebook |
| `instagram-post-template.svg` | 1080×1080 | Post Insta carré |
| `instagram-story-template.svg` | 1080×1920 | Story Insta vertical |
| `email-signature.svg` | 600×160 | Signature email |

## Spécifications techniques

- **Police** : Barlow Condensed (Google Fonts) — fallback Arial Narrow/Arial
- **Weights** : 300 (DOOR), 500 (tagline), 900 (GAME, 41)
- **Couleur principale** : Orange #E07020
- **Texte clair** : Crème #F0EBE2
- **Fond sombre** : Noir chaud #0C0800

## Utilisation

### Sur le site web (HTML)

Utiliser `<object>` plutôt que `<img>` pour que la police s'affiche correctement :

```html
<!-- Méthode recommandée (font Barlow correct) -->
<object type="image/svg+xml" data="/img/logo/logo-horizontal.svg" aria-label="GAMEDOOR 41"></object>

<!-- Méthode simple (fallback Arial si Barlow indispo) -->
<img src="/img/logo/logo-horizontal.svg" alt="GAMEDOOR 41" width="280">
```

### Sur une page qui charge Google Fonts
Si ta page charge déjà Barlow Condensed, même `<img>` affichera parfaitement :
```html
<head>
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;900&display=swap" rel="stylesheet">
</head>
```

### Conversion SVG → PNG

**Outil gratuit** : https://cloudconvert.com/svg-to-png

**Tailles PNG recommandées** :
| Usage | Dimensions |
|---|---|
| Logo web responsive | 1024×180 |
| Avatar RS | 512×512 |
| App icon | 256×256 |
| Favicon | 32×32 |
| YouTube banner | 2560×1440 |
| Thumbnail YouTube | 1280×720 |
| Cover Facebook | 1640×624 |
| Bannière LinkedIn | 1584×396 |
| Post Instagram | 1080×1080 |
| Story Instagram | 1080×1920 |

### Conversion PNG haute résolution pour print

1. Ouvrir le SVG dans **Inkscape** (gratuit) ou **Illustrator**
2. Fichier > Exporter > PNG
3. Résolution : **300 DPI** pour print professionnel
4. Formats : RVB pour écran, CMJN pour imprimerie

### Import dans Canva

1. Dans un design Canva → "Importer" → sélectionner le SVG
2. Le logo s'intègre en vectoriel modifiable
3. Attention : Canva peut ne pas reconnaître la police Barlow Condensed — vérifier le rendu et remplacer par Barlow Condensed si nécessaire

### Conversion texte en paths (pour print professionnel)

Pour garantir le rendu sur tous les systèmes (imprimerie, broderie, gravure) :

1. Ouvrir le SVG dans **Adobe Illustrator** ou **Inkscape**
2. Sélectionner tous les textes
3. Menu **Type > Create Outlines** (Illustrator) ou **Chemin > Objet en chemin** (Inkscape)
4. Enregistrer sous nouveau nom : `logo-horizontal-outlined.svg`

## Règles d'usage

- **Respecter le contraste GAME/DOOR** : 900 (gras) vs 300 (fin). Jamais inversé.
- **Utiliser le point médian (·)** Unicode U+00B7, pas un point classique (.)
- **Zone de protection** : minimum hauteur du point médian autour du logo
- **Taille minimum** : 14px en digital, 25mm en print
- **Ne pas déformer** (pas de stretch vertical/horizontal)
- **Ne pas changer les couleurs** (utiliser les variantes fournies)

## Nomenclature

`logo-[type]-[variante]-[fond/accent].svg`

Exemples :
- `logo-horizontal-mono-white.svg`
- `logo-stacked-tagline.svg`
- `logo-escape.svg` (sous-marque)
- `youtube-thumbnail-quiz.svg` (format × sous-marque)

## Support

- Marque déposée INPI : **GAMEDOOR 41** — N° 5247839
- Exploitant : **SARL BOEHME** — 41 bis rue Pasteur, 14120 Mondeville
- Contact : contact@gamedoor41.fr · 02 31 53 07 51
