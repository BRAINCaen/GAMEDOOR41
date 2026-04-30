# 📦 CHECKLIST — Polices, logos, ressources à uploader

Ce fichier liste tout ce que tu dois joindre dans le champ **"Ajoutez des polices, des logos et des ressources"** du formulaire.

---

## 🔤 1. POLICES

### Source officielle : Google Fonts (gratuit, OFL license)

Deux familles à inclure :

| Famille | Poids requis | Usage |
|---------|--------------|-------|
| **Barlow Condensed** | 300, 400, 500, 600, 700, 800, 900 | Logo, titres, kickers, chiffres, CTA |
| **DM Sans** | 400, 500, 700 | Body, paragraphes, formulaires, UI |

### Comment fournir les polices

**Option A — Pointer vers Google Fonts** (recommandé, déjà inclus dans le CSS) :
```html
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;500;600;700;800;900&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
```

**Option B — Uploader les fichiers** (si l'outil le demande) :
1. Aller sur https://fonts.google.com/specimen/Barlow+Condensed → "Download family" → décompresser
2. Aller sur https://fonts.google.com/specimen/DM+Sans → "Download family" → décompresser
3. Garder uniquement les fichiers `.ttf` (ou les convertir en `.woff2` pour le web)
4. Uploader dans un dossier `/fonts/` joint au kit

### Fallbacks (si Google Fonts indisponible)
- Barlow Condensed → **Oswald** (Google Fonts) → `system-ui, sans-serif`
- DM Sans → **Inter** (Google Fonts) → `system-ui, sans-serif`

---

## 🎯 2. LOGOS — 14 variantes SVG

Tous les fichiers sont au format SVG, dans le dossier `/img/logo/` de ton site/projet.

### Logos horizontaux (le plus commun)
- [ ] `logo-horizontal.svg` — fond sombre (défaut)
- [ ] `logo-horizontal-light-bg.svg` — fond crème
- [ ] `logo-horizontal-white-bg.svg` — fond blanc pur
- [ ] `logo-horizontal-mono-white.svg` — monochrome blanc (pour fonds photo)
- [ ] `logo-horizontal-mono-black.svg` — monochrome noir (pour gravure, tampon)
- [ ] `logo-horizontal-orange-bg.svg` — sur fond orange

### Logos empilés (formats carrés / verticaux)
- [ ] `logo-stacked.svg`
- [ ] `logo-stacked-tagline.svg` — avec baseline "Entrez · Jouez · Vivez"

### Logos icônes / favicons
- [ ] `logo-icon.svg` — icône complète
- [ ] `logo-icon-g.svg` — juste le G, pour favicon
- [ ] `logo-avatar-square.svg` — pour avatars sociaux (Instagram, LinkedIn…)
- [ ] `logo-badge-round.svg` — badge rond style sceau

### Logos spéciaux
- [ ] `logo-no-accent.svg` — sans le · (pour gravure laser, tailles très petites)
- [ ] `logo-watermark.svg` — filigrane (pour photos, vidéos)

### Logos sous-marques
- [ ] `logo-escape.svg` — déclinaison Escape Game (rouge #C62828)
- [ ] `logo-quiz.svg` — déclinaison Quiz Game (cyan #00E5FF)
- [ ] `logo-action.svg` — déclinaison Action (vert #76FF03)
- [ ] `logo-events.svg` — déclinaison Events (or #FFD740)

---

## 🖼️ 3. AUTRES RESSOURCES À JOINDRE

### Indispensable
- [ ] **`CHARTE-GRAPHIQUE-GAMEDOOR41-V2.html`** — la charte graphique source complète. C'est la référence canonique.

### Utile si disponible
- [ ] **Photos du lieu** — façade 41 bis rue Pasteur, salles, accueil (au moins 5 photos, format paysage 16:9, haute résolution)
- [ ] **Photos de l'équipe en action** — pour donner le ton humain de la marque
- [ ] **Mockups print** — flyers, cartes de visite, signalétique du lieu (si déjà produits)
- [ ] **Fichier .ase** — palette Adobe Swatch Exchange (à exporter depuis Illustrator)
- [ ] **Fichier .fig** — Figma library (si la marque a un fichier Figma maître)

### Documents légaux
- [ ] Certificat INPI n° 5247839 (preuve de marque déposée — utile pour les outils légaux)

---

## 🚫 À NE PAS UPLOADER

- ❌ Anciens logos de Brain Escape Game ou Buzz Your Brain — la marque est unifiée sous GAMEDOOR·41
- ❌ Photos personnelles non maîtrisées
- ❌ Logos d'autres marques / de fournisseurs
- ❌ Documents en format non standard (Word avec mises en page custom, PDF non vectoriels…)

---

## 📁 Structure de dossier recommandée pour l'upload

```
gamedoor41-brand-kit/
├── README.md                                  ← le 00-README.md de ce kit
├── design-tokens.css                          ← 02-design-tokens.css
├── design-tokens.json                         ← 03-design-tokens.json
├── tailwind-preset.js                         ← 04-tailwind-preset.js
├── component-showcase.html                    ← 05-component-showcase.html
├── notes.md                                   ← 06-NOTES-SUPPLEMENTAIRES.md
├── CHARTE-GRAPHIQUE-GAMEDOOR41-V2.html
├── img/
│   └── logo/
│       ├── logo-horizontal.svg
│       ├── logo-horizontal-light-bg.svg
│       ├── ... (les 14 variantes)
└── fonts/  (optionnel, si Google Fonts indisponible)
    ├── BarlowCondensed-Light.ttf
    ├── BarlowCondensed-Regular.ttf
    ├── ... (les 7 poids)
    ├── DMSans-Regular.ttf
    ├── DMSans-Medium.ttf
    └── DMSans-Bold.ttf
```

---

## ✅ Validation avant upload

Avant de soumettre, vérifie :
- [ ] Tous les SVG s'ouvrent correctement (test rapide : drag dans un navigateur)
- [ ] Le fichier `02-design-tokens.css` se charge sans erreur dans `05-component-showcase.html`
- [ ] La charte HTML s'affiche correctement (les polices Google chargent)
- [ ] Le contenu de `06-NOTES-SUPPLEMENTAIRES.md` reflète bien la stratégie actuelle
