# Apps Script — déploiement via clasp

Ce dossier contient les scripts Google Apps Script du projet, déployés
sur script.google.com via [`@google/clasp`](https://github.com/google/clasp).

## Setup initial (une seule fois)

1. Installer clasp globalement : `npm install -g @google/clasp`
   (sur Windows, si erreur SSL : `NODE_OPTIONS=--use-system-ca npm install -g @google/clasp`)
2. Se connecter à Google : `clasp login` (ouvre le navigateur, autorise l'accès)
3. Cloner un projet Apps Script existant : `clasp clone <SCRIPT_ID>`
   (le SCRIPT_ID est visible dans l'URL `script.google.com/d/SCRIPT_ID/edit`)

## Workflow

- **Pull** (récupérer la version live) : `clasp pull`
- **Push** (déployer le code local) : `clasp push`
- **Logs récents** : `clasp logs`
- **Ouvrir l'éditeur web** : `clasp open`

## ⚠️ Limitation

Les **triggers** (déclencheurs time-based, on edit, etc.) ne sont **pas** gérés
par clasp. Ils se modifient uniquement dans l'éditeur web :
script.google.com → icône ⏰ Déclencheurs (menu gauche).

## Projets gérés

- `forms-unread/` — script `markFormsUnread` qui remet en non-lu les emails
  des formulaires du site (alternance/devis/restauration via EmailJS).
  Voir aussi memoire `reference_apps_script_forms_unread.md`.
