# Éditeur du site — gamedoor41.fr/editeur/

Éditeur visuel réservé à l'équipe : on modifie les pages en direct, on voit le
résultat sur ordinateur, tablette et téléphone, puis on publie. **On peut tout
ajouter et tout modifier ; on ne supprime jamais un contenu publié** (règle
d'Allan, 12/11/2026). Cette règle est appliquée dans l'interface ET sur le
serveur, qui rejoue chaque modification avant d'écrire dans le dépôt.

## Qui peut entrer

Compte Google **@gamedoor41.fr** + fiche **active** dans Synergia
(`users/{uid}`, sinon fiche dont `email` = l'adresse ; règle « compte actif »
de Synergia). Admins de l'éditeur (réglages, signalements) : allan@gamedoor41.fr,
admins Synergia, variable Netlify `EDITEUR_ADMINS`. Code : `serveur/auth.mjs`.

## Configuration Netlify (site gamedoor41, portée Functions, secrètes)

| Variable | Rôle |
|---|---|
| `EDITEUR_GITHUB_TOKEN` | jeton GitHub « fine-grained » limité à BRAINCaen/GAMEDOOR41 : Contents, Pull requests (lecture/écriture), Commit statuses (lecture) |
| `ANTHROPIC_API_KEY` | facultative : active l'assistant (modèle, effort, plafond/jour réglables par un admin) |
| `EDITEUR_ADMINS` | facultative : adresses admins en plus d'Allan |

Firebase (projet Synergia `synergia-app-f27e7`) : `gamedoor41.fr` doit être
dans Authentication › Paramètres › Domaines autorisés.

## Organisation

| Dossier | Contenu |
|---|---|
| `noyau/` | code PUR partagé navigateur + serveur : arbre fidèle à la source (`arbre.mjs`), opérations et filet anti-suppression (`operations.mjs`), filtre de sécurité (`assainir.mjs`), styles (`css.mjs`), nouvelles pages + sitemap (`pages.mjs`), relecture (`relecture.mjs`) |
| `app/` | interface (Preact) : canevas (`canevas.js`), moteur d'édition (`moteur.js`), actions, panneaux, inspecteur, catalogue des blocs (`blocs/catalogue.js`) |
| `serveur/` | API `/api/editeur/*`, travaux de fond (aperçu, publication, assistant), GitHub, Netlify Blobs, assistant Claude |
| `dev/` | serveur d'essai local (faux GitHub, fausse connexion `?essai=prenom`) et pilotes Chrome |
| `tests/` | `node --test tests/*.test.mjs` |

Fichiers construits et commités : `editeur/` (page, JS, CSS) et
`netlify/functions/editeur*.mjs`. Fichiers communs des blocs publiés :
`css/editeur-blocs.css`, `js/editeur-blocs.js` (ajoutés automatiquement aux
pages qui contiennent un bloc ; empreinte `?v=` = sha1 du contenu du dépôt).

## Travailler sur l'éditeur

```bash
cd editeur-src
npm install                    # une fois
node --test tests/*.test.mjs   # 40+ tests (aller-retour sur toutes les pages, opérations, accès, serveur)
node construire.mjs            # reconstruit editeur/ et netlify/functions/
node dev/serveur.mjs 8941      # puis http://localhost:8941/editeur/?essai=allan
node dev/essai-parcours.mjs <dossier>   # parcours complet dans Chrome (captures)
```

Après une modification de `css/editeur-blocs.css` ou `js/editeur-blocs.js` :
les pages déjà publiées gardent l'ancienne empreinte `?v=` ; mettre à jour
avec `node scripts/perf-assets.mjs` (attention : sur un clone en CRLF,
l'empreinte diffère de celle de GitHub — voir CLAUDE.md du dépôt).

## Comment ça marche (résumé)

1. Une page = son HTML publié + une liste d'**opérations** (texte, html, attr,
   classe, style, inserer, deplacer, dupliquer, supprimer [ajouts seulement],
   image, meta). Chaque opération qui vise un élément publié porte son
   **empreinte** (`sig`) : si la page a changé entre-temps, rien ne s'applique
   au mauvais endroit (rebasage automatique quand c'est possible).
2. Le navigateur rejoue la liste pour l'aperçu (canevas = iframe `srcdoc`,
   double tampon) ; le serveur la rejoue sur le fichier du dépôt, relit
   (règles maison réglables), vérifie qu'aucun contenu n'a disparu
   (`verifierConservation`), crée une branche `editeur/…` + une pull request
   (aperçu Netlify `deploy-preview-N`), puis fusionne (publication) ou
   programme (fonction planifiée toutes les 5 min).
3. Brouillons : sur l'appareil (localStorage) et sur le serveur (Netlify
   Blobs, magasin `editeur`), partagés avec l'équipe.
