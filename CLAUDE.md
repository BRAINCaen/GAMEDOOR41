# GAMEDOOR·41 — site gamedoor41.fr

Site vitrine de GAMEDOOR·41 (escape game & quiz game, Caen).
Site **statique** : du HTML/CSS/JS écrit à la main, **aucune étape de build**.

## Avec qui tu travailles

Les personnes qui utilisent ce dépôt **ne sont pas développeuses**. Elles connaissent le
métier (les salles, les tarifs, les clients), pas git ni le HTML. En conséquence :

- Réponds **en français**, sans jargon. Si un terme technique est indispensable, explique-le
  en une demi-phrase.
- **Fais le travail, ne le décris pas.** Ne réponds pas « voici les commandes à taper » :
  exécute-les. Ne demande une intervention humaine que lorsque c'est techniquement
  impossible autrement (se connecter à un compte, cliquer dans une interface web).
- Quand tu dois poser une question, pose une **question de métier**, pas une question
  technique. « On garde l'ancien tarif affiché ou on met le nouveau ? » plutôt que
  « je fais un rebase ou un merge ? ».
- Décide seul de tout ce qui est technique et réversible. Signale ce que tu as fait après.

## ⚠️ La règle à ne jamais oublier

`netlify.toml` contient `publish = "."` : **la racine du dépôt EST le site web.**
Tout fichier commité et poussé devient une URL publique sur gamedoor41.fr, et Google peut
l'indexer. C'est déjà vérifiable : `gamedoor41.fr/README.md` répond `200`.

Donc **avant tout `git add`, vérifie ce que tu ajoutes** :

- jamais de note interne, d'export, de brouillon, de capture, de PDF, de tableur ;
- jamais une variante de travail d'une page (`index-v2.html`, `*.bak.html`) : Google la
  verrait comme du contenu dupliqué et pénaliserait le site ;
- en cas de doute, ajoute le fichier au `.gitignore` plutôt qu'au commit.

Le `.gitignore` documente déjà une liste de fichiers écartés pour cette raison précise
(audit du 13/07/2026) — lis ses commentaires avant d'y toucher.

## Déploiement

**Netlify est branché sur ce dépôt. Un `git push` sur `main` met le site en production
immédiatement.** Il n'y a pas de validation intermédiaire, pas de bouton « publier ».

- Il n'y a **rien à compiler** : pas de `npm run build`, pas de serveur à lancer.
  `package.json` ne sert qu'à `sharp`, utilisé par les scripts de traitement d'images.
- Une **pull request** génère une preview Netlify sur une URL temporaire. C'est la
  bonne approche pour une refonte visuelle : ça permet de faire valider avant publication.
- Tableau de bord : https://app.netlify.com/projects/gamedoor41

## Un robot pousse sur `main` toutes les nuits

`.github/workflows/update-google-reviews.yml` tourne vers **00h20** (heure de Paris) :
il récupère la note et le nombre d'avis Google, met à jour `data/google-reviews.json`
et les pages HTML, puis commite (`chore(reviews): sync Google rating …`).

Conséquence pratique : **`git pull` avant chaque session de travail**, sinon le `push`
sera refusé et la personne en face ne comprendra pas pourquoi. En cas de refus, un
`git pull --rebase` puis `git push` règle le cas — fais-le sans poser de question.

## Structure

| Chemin | Rôle |
|---|---|
| `index.html` | page d'accueil |
| `tarifs/`, `contact/`, `evjf-caen/`… | **une page = un dossier + un `index.html`** (l'URL est `/tarifs/`) |
| `escape-game-caen/<salle>/` | les 3 salles : `garde-a-vue`, `psychiatric`, `back-to-the-80s` |
| `post/<slug>/` | articles du magazine ; index dans `magazine/` |
| `css/`, `js/` | styles et scripts |
| `img/` | images, en déclinaisons `480w` / `768w` / `1024w` × `avif` / `webp` / `jpg` |
| `video/` | vidéos de fond |
| `data/google-reviews.json` | avis Google (généré, ne pas éditer à la main) |
| `scripts/` | scripts Node/Python de maintenance en masse |
| `apps-script/` | Google Apps Script (hors site) |
| `netlify.toml` | 61 redirections 301 + en-têtes |
| `sitemap.xml`, `robots.txt`, `blog-feed.xml` | SEO |

## Règles de travail

**Ajouter une page** — créer `<slug>/index.html`, puis penser à : l'ajouter au
`sitemap.xml`, la relier depuis la navigation, et lui donner `<title>` + meta description
+ URL canonique. Une page absente du sitemap ne sera pas indexée.

**Images** — ne jamais déposer un JPEG brut de 4 Mo. Les déclinaisons responsive sont
générées par les scripts (`scripts/generate-*-variants.mjs`, `optimize-images.mjs`, via
`sharp`). Utilise-les plutôt que de bricoler à la main.

**Redirections** — `netlify.toml` contient 61 redirections 301 héritées de la migration
depuis l'ancien site Wix. **Ne jamais en supprimer** : chacune préserve un lien Google
existant. Si une page change d'URL, ajouter une redirection de l'ancienne vers la nouvelle.

**Modifications en masse** — pour une correction répétée sur les 47 pages, écris un script
dans `scripts/` plutôt que d'éditer les fichiers un par un. C'est la convention du dépôt.

**Tarifs et informations pratiques** — la référence est la grille réelle 4escape
(réservations : `braincaen.4escape.io`). Ne jamais inventer un prix, un horaire ou une
capacité : demande la valeur exacte plutôt que de supposer.

## Vérifier son travail avant de pousser

Il n'y a pas de tests automatisés. Le minimum avant un `push` :

```bash
git status    # rien d'inattendu dans la liste ?
git diff      # les modifications sont bien celles voulues ?
```

Pour un aperçu, il faut un serveur local : ouvrir `index.html` en `file://` casse tous
les liens internes (`/tarifs/`). **Ne suppose pas que `python` est disponible** — sur les
postes Windows de l'équipe, `python` n'est souvent que le raccourci vide du Microsoft
Store, qui échoue avec un message trompeur. L'extension VS Code **Live Server**
(recommandée dans `.vscode/extensions.json`) est la méthode fiable. Vérifie l'outil avant
de le proposer à quelqu'un.

Filet de sécurité : si `netlify.toml` est syntaxiquement invalide, Netlify **refuse** le
déploiement et le site reste sur la version précédente. Une erreur de configuration ne
met donc jamais le site hors ligne — mais elle bloque les publications suivantes tant
qu'elle n'est pas corrigée.

## Messages de commit

En français, à l'impératif, préfixés par le type — la convention déjà en place dans
l'historique : `fix(tarifs): …`, `feat(magazine): …`, `chore(reviews): …`, `seo(post): …`.
