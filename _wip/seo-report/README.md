# Rapport SEO hebdomadaire — gamedoor41.fr

Système de rapport SEO automatique hébergé en Netlify Function.
Tourne chaque lundi 8h (cron), génère un rapport HTML à partir de
**Google Search Console + Google Analytics 4 + PageSpeed Insights**,
et l'envoie par email.

Remplace l'ancien rapport "Brain Games" (script Apps Script
`Trigger automatique lundi` + Netlify site `brain-seo-report.netlify.app`),
qui scannait les anciens domaines redirigés et ne renvoyait que des zéros.

## Architecture

```
netlify/functions/seo-report/
├── index.js          # entry point Netlify (handler scheduled function)
├── lib/
│   ├── gsc.js        # client Google Search Console API
│   ├── ga4.js        # client Google Analytics Data API
│   ├── lighthouse.js # PageSpeed Insights (public, pas d'auth)
│   ├── insights.js   # moteur de règles (alerte / opportunité)
│   ├── calendar.js   # calendrier saisonnier Caen + suggestions d'articles
│   ├── template.js   # template HTML de l'email
│   ├── mailer.js     # envoi via Brevo / Resend
│   └── storage.js    # historique JSON dans le repo (comparaisons W-1)
├── data/
│   └── history/      # snapshots hebdo (commités via PR auto)
└── package.json      # dépendances
```

## Credentials nécessaires (à configurer côté Netlify > Site settings > Environment variables)

### 1. Service Account Google (pour GSC + GA4)

À créer **une seule fois**, puis le JSON est utilisé partout.

**Étapes** :
1. Aller sur https://console.cloud.google.com/ — créer un projet "gamedoor41-seo-report"
2. Activer ces APIs (APIs & Services > Library) :
   - **Search Console API**
   - **Google Analytics Data API**
   - **PageSpeed Insights API**
3. IAM & Admin > Service Accounts > Create
   - Nom : `seo-report-reader`
   - Rôle : aucun (on accordera l'accès directement dans GSC et GA4)
4. Sur le service account créé : Keys > Add Key > Create new key > JSON
   → télécharge un fichier `gamedoor41-seo-report-XXXXX.json`
5. **Accorder l'accès à la propriété GSC** :
   - Search Console (gamedoor41.fr) > Paramètres > Utilisateurs et autorisations
   - Ajouter l'email du service account (du type `seo-report-reader@xxx.iam.gserviceaccount.com`)
   - Permission : Restreint (lecture suffit)
6. **Accorder l'accès à la propriété GA4** :
   - Google Analytics > Admin > Property access management
   - Ajouter l'email du service account
   - Rôle : Viewer

→ Le contenu du JSON sera collé dans la variable d'env Netlify `GOOGLE_SERVICE_ACCOUNT_JSON`.

### 2. Compte d'envoi email

**Option A — Brevo (recommandé, l'user a déjà un compte)** :
- https://app.brevo.com/ > SMTP & API > API Keys > Create new
- Nom : `gamedoor41-seo-report`
- Permission : `transactional emails` suffit
- → coller la clé dans `BREVO_API_KEY`

**Option B — Resend (alternative, 100 emails/jour gratuit)** :
- https://resend.com/ > API Keys > Create
- → coller dans `RESEND_API_KEY`

### 3. Variables d'environnement Netlify

À configurer dans Netlify > Site settings > Build & deploy > Environment :

| Variable                       | Description                                  |
|--------------------------------|----------------------------------------------|
| `GOOGLE_SERVICE_ACCOUNT_JSON`  | Contenu complet du JSON service account      |
| `GSC_SITE_URL`                 | `sc-domain:gamedoor41.fr` (depuis GSC URL)   |
| `GA4_PROPERTY_ID`              | ID propriété GA4 (chiffres, ex: `499876543`) |
| `BREVO_API_KEY`                | API key Brevo (si option A)                  |
| `EMAIL_RECIPIENT`              | `brain.caen@gmail.com`                       |
| `EMAIL_SENDER`                 | `seo-report@gamedoor41.fr` (à configurer DNS)|

## Déclencheur (cron)

Le déclenchement est configuré via `netlify.toml` en tant que **Scheduled Function** :

```toml
[functions."seo-report"]
schedule = "0 6 * * 1"   # tous les lundis 8h heure de Paris (= 6h UTC)
```

→ Pas besoin d'Apps Script comme l'ancien système. Netlify déclenche tout seul.

## Test manuel

```bash
# En local (nécessite netlify-cli)
netlify dev
curl http://localhost:8888/.netlify/functions/seo-report

# En live (après déploiement)
curl https://gamedoor41.fr/.netlify/functions/seo-report
```

## Historique

Chaque rapport sauvegarde un snapshot JSON dans `data/history/YYYY-MM-DD.json`
pour permettre des comparaisons W-1, M-1, Y-1.
Stocké dans le repo via auto-commit (GitHub Actions).
