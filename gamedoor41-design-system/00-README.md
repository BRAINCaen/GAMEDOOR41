# 🎨 GAMEDOOR·41 — Kit de configuration design system

Ce kit contient tout le nécessaire pour configurer un design system GAMEDOOR·41 dans Claude (ou tout autre outil compatible : Figma Tokens, Style Dictionary, Tailwind, etc.).

---

## 📋 Sommaire des fichiers

| Fichier | Quand l'utiliser | Format |
|---------|------------------|--------|
| `01-DESCRIPTIF-ENTREPRISE.md` | À copier-coller dans le champ **"Nom et descriptif"** | Texte |
| `02-design-tokens.css` | À uploader dans le champ **"Code / fichiers"** (source CSS principale) | CSS |
| `03-design-tokens.json` | Alternative ou complément — pour Figma Tokens, Style Dictionary | JSON |
| `04-tailwind-preset.js` | Si le projet utilise Tailwind CSS | JavaScript |
| `05-component-showcase.html` | À uploader avec les CSS — donne à l'IA des exemples concrets | HTML |
| `06-NOTES-SUPPLEMENTAIRES.md` | À copier-coller dans le champ **"D'autres remarques"** | Texte / Markdown |
| `07-CHECKLIST-ASSETS-A-UPLOADER.md` | Liste des polices, logos, ressources à joindre | Texte |

---

## 🚀 Procédure rapide — étape par étape

### Étape 1 — "Nom de l'entreprise et descriptif"
Ouvre `01-DESCRIPTIF-ENTREPRISE.md` → copie la **version courte** dans le champ.

### Étape 2 — "Code / fichiers de design system"
Glisse-dépose ces 4 fichiers ensemble :
1. `02-design-tokens.css` (la source de vérité CSS)
2. `03-design-tokens.json` (la source de vérité tokens)
3. `04-tailwind-preset.js` (preset Tailwind, optionnel mais utile)
4. `05-component-showcase.html` (exemples de composants en action — **TRÈS important**, c'est ce qui donne à l'IA les bons patterns)

### Étape 3 — "Polices, logos, ressources"
Voir `07-CHECKLIST-ASSETS-A-UPLOADER.md` — tu dois joindre :
- Le dossier `/img/logo/` complet (les 14 SVG du logotype)
- Les polices Barlow Condensed et DM Sans (ou pointer vers Google Fonts)
- La charte graphique source (`CHARTE-GRAPHIQUE-GAMEDOOR41-V2.html`)

### Étape 4 — "D'autres remarques"
Ouvre `06-NOTES-SUPPLEMENTAIRES.md` → copie le bloc encadré dans le champ. Ce texte donne à Claude les **garde-fous critiques** (ce qu'il doit faire, ce qu'il ne doit JAMAIS faire).

---

## ✅ Pourquoi cette structure

Un design system efficace pour piloter une IA repose sur **3 piliers** :

1. **Les tokens** (les valeurs : couleurs, fonts, spacings)
   → fichiers CSS / JSON

2. **Les patterns** (à quoi ça ressemble en composé)
   → fichier showcase HTML

3. **Les garde-fous** (ce qui est interdit, l'aesthetic direction)
   → notes supplémentaires

Sans le pilier 3, l'IA dérive vers du générique. Sans le pilier 2, elle ne sait pas comment combiner. Sans le pilier 1, elle hallucine des valeurs.

---

## 🔄 Maintenance

Quand la charte évolue (V2 → V3) :
1. Mettre à jour les tokens dans `02-design-tokens.css` ET `03-design-tokens.json`.
2. Régénérer le preset Tailwind (`04`) à partir du JSON.
3. Mettre à jour le showcase HTML (`05`) si de nouveaux composants apparaissent.
4. Mettre à jour le bloc "Autres remarques" (`06`) si la stratégie change.
5. Bumper la version dans le `$metadata` du JSON.

---

## 📞 Contact

Allan Boehme — gérant SARL La Boehme
allan@gamedoor41.fr — 02 31 53 07 51
41 bis rue Pasteur, 14120 Mondeville (Caen)
INPI n° 5247839
