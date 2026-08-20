# Brancher Search Console et Analytics sur le poste de pilotage

Ce script va chercher les chiffres chez Google chaque nuit et les dépose dans un
fichier de votre Drive. Le poste de pilotage lit ce fichier. Il n'y a pas d'autre
chemin possible : une page publiée sur claude.ai n'a pas le droit d'appeler un
site externe, elle ne peut passer que par les connecteurs que vous autorisez.

```
Search Console ─┐
                ├─> ce script (chaque nuit) ─> Drive ─> poste de pilotage
Analytics ──────┘
```

---

## ⚠️ La question du compte Google — à trancher en premier

Deux comptes sont en jeu dans cette maison : **le compte Gmail historique de l'équipe** (celui de
tous les scripts) et **contact@gamedoor41.fr**. Le script s'exécute sous le
compte qui l'a créé, et écrit sur **le Drive de ce compte**.

Le plus simple est donc d'utiliser **le même compte des deux côtés** : celui du
script, et celui du connecteur Google Drive dans claude.ai.

Si ce n'est pas possible, le script partage automatiquement son fichier en
lecture avec `contact@gamedoor41.fr`, et le poste de pilotage sait aller chercher
un fichier reçu en partage. Pour partager avec une autre adresse, renseigner la
propriété de script `PARTAGER_AVEC` (plusieurs adresses séparées par des virgules).

Dans tous les cas, **le compte utilisé pour activer les API dans Google Cloud
doit être celui qui possède le script** — c'est la cause d'échec la plus
fréquente, voir l'étape 2.

---

## Étape 1 — Autoriser les connecteurs dans claude.ai (2 min)

Sur **claude.ai** → votre avatar en bas à gauche → **Réglages** → **Connecteurs**.
Activez :

- **Gmail** — remplit le journal des alertes et l'historique mensuel
- **Google Drive** — lit le fichier de chiffres produit par ce script

Choisissez le compte **contact@gamedoor41.fr** (c'est lui qui reçoit les e-mails
Search Console et qui possède le Drive).

Rechargez le poste de pilotage : le voyant en haut à droite doit passer au vert.

---

## Étape 2 — Installer le script (10 min, une seule fois)

### Le plus simple : par le navigateur

1. Aller sur **script.google.com** (connecté en `contact@gamedoor41.fr`)
2. **Nouveau projet**, le renommer « Rapport SEO GAMEDOOR41 »
3. Coller tout le contenu de `Code.js` dans l'éditeur, à la place de ce qui s'y trouve
4. Menu de gauche → **⚙ Paramètres du projet** → cocher
   **« Afficher le fichier manifeste appsscript.json »**
5. Revenir à **Éditeur**, ouvrir `appsscript.json`, coller le contenu du fichier
   `appsscript.json` de ce dossier
6. Choisir la fonction **`listerProprietes`** dans la liste déroulante, puis
   **Exécuter**. Google demande l'autorisation : accepter.

   **À ce stade, une erreur `HTTP 403` est normale** et ressemble à ceci :

   > Google Search Console API has not been used in project **649288476368**
   > before or it is disabled. Enable it by visiting …

   Chaque projet Apps Script est rattaché à un projet Google Cloud, dans lequel
   les API doivent être activées une fois. **Le message contient le lien exact
   à ouvrir** — il suffit de cliquer, puis d'appuyer sur **Activer**.

   > **Le piège, et c'est presque toujours lui quand l'erreur persiste :** la
   > console Google Cloud s'ouvre avec le compte **par défaut du navigateur**,
   > pas avec celui qui possède le script. Sur la page qui s'ouvre, vérifiez
   > l'avatar en haut à droite : il doit afficher le compte du script
   > (**le compte Gmail historique de l'équipe** ici). Sinon vous activez l'API dans le projet d'un
   > autre compte, et l'erreur reste rigoureusement identique.
   > Au besoin, ouvrir le lien dans une fenêtre de navigation privée et se
   > connecter avec le bon compte.
   >
   > Contrôle : après avoir cliqué **Activer**, rechargez la page. Elle doit
   > afficher **« API activée »** et un bouton *Gérer*. Si elle propose encore
   > *Activer*, rien n'a été fait.

   Alternative sans passer par la console : dans l'éditeur, panneau de gauche →
   **`Services`** → **`+`** → ajouter **Search Console API**. L'ajout active
   l'API dans le bon projet, sans risque de se tromper de compte.

   Profitez-en pour activer les deux API d'un coup (remplacez le numéro par
   celui de *votre* message d'erreur s'il diffère) :

   - Search Console : `console.developers.google.com/apis/api/searchconsole.googleapis.com/overview?project=649288476368`
   - Analytics, pour l'étape 4 : `console.developers.google.com/apis/api/analyticsdata.googleapis.com/overview?project=649288476368`

   Attendre **1 à 2 minutes** (Google le précise : l'activation met un moment à
   se propager), puis relancer `listerProprietes`.

   → Le journal doit maintenant lister vos propriétés Search Console. Si la
   liste est vide alors que l'API est activée, c'est l'étape 3 qui manque.
7. Choisir **`majRapportSeo`** et **Exécuter**. Le journal indique
   « Fichier créé » ou « Fichier mis à jour » avec un lien.
8. Choisir **`installerDeclencheur`** et **Exécuter** une seule fois.
   → Le script tournera désormais tout seul chaque nuit vers 5 h.

### Si vous préférez la ligne de commande

Depuis ce dossier :

```
clasp login
clasp create-script --title "Rapport SEO GAMEDOOR41" --rootDir .
clasp push
```

Puis ouvrir `clasp open` et faire les étapes 6 à 8 ci-dessus (les autorisations et
les déclencheurs ne se pilotent que depuis l'éditeur web).

---

## Étape 3 — Donner accès à Search Console

Le script s'exécute avec le compte Google qui l'a créé. Il ne voit donc que les
propriétés auxquelles **ce compte** a accès.

**Or la propriété Search Console de gamedoor41.fr appartient à
le compte Gmail historique de l'équipe**, alors que le script tourne sous
`contact@gamedoor41.fr`. Il faut donc partager la propriété — une seule fois :

1. Se connecter à **search.google.com/search-console** avec
   **le compte Gmail historique de l'équipe** (le propriétaire)
2. Sélectionner la propriété **gamedoor41.fr**
3. **Paramètres** (roue dentée, en bas du menu de gauche) →
   **Utilisateurs et autorisations**
4. **Ajouter un utilisateur** → `contact@gamedoor41.fr` → autorisation
   **Complète** ou **Restreinte** (la lecture suffit pour ce script)

La fonction `listerProprietes` est le test : si elle affiche
`sc-domain:gamedoor41.fr`, c'est bon. Si elle affiche « Aucune propriété visible
par ce compte Google » **sans erreur**, c'est que ce partage manque.

> Alternative : recréer le script sous le compte Gmail historique de l'équipe, qui possède déjà
> l'accès. Mais il faut alors que le fichier Drive soit partagé avec le compte du
> connecteur claude.ai — c'est prévu (voir `PARTAGER_AVEC`), mais ça fait une
> pièce mobile de plus. Partager la propriété est plus simple.

> **À faire sans attendre.** Search Console ne garde que **16 mois**. Les mois
> d'avril, mai et juin 2026 — la fenêtre de la bascule de domaine, aujourd'hui
> absente de tout relevé — expireront courant 2027. Dès la première exécution, le
> script les récupère et le trou se comble.

---

## Étape 4 — Analytics : il faut d'abord le remettre en service

**Attention, ce n'est pas qu'un branchement.** L'ancien suivi est mort depuis le
**30 septembre 2025** et il mesurait le site Wix, pas gamedoor41.fr. Il n'existe
donc aucune donnée d'audience à lire. Il faut recréer la mesure, et elle ne
commencera à compter **qu'à partir du jour de son installation** — Analytics ne
reconstitue jamais le passé.

1. Sur **analytics.google.com** → **Administration** → **Créer** → **Propriété**
   → nommer « gamedoor41.fr », fuseau Paris, devise euro
2. Créer un **flux de données Web** sur `https://gamedoor41.fr` → noter
   l'identifiant de mesure `G-XXXXXXXXXX`
3. Relever aussi l'**identifiant de la propriété** (un nombre à 9 chiffres,
   dans Administration → Détails de la propriété)
4. Poser la balise sur le site : me le demander, c'est une modification du dépôt
   que je peux faire (elle touche les 49 pages, donc elle passe par un script)
5. **Mesure inter-domaines** — l'étape que tout le monde oublie : la réservation
   part vers `braincaen.4escape.io`. Sans cette étape, une réservation apparaît
   comme une visite perdue puis un visiteur inconnu. Dans le flux de données →
   **Configurer les paramètres de balise** → **Configurer vos domaines** →
   ajouter `gamedoor41.fr` **et** `braincaen.4escape.io`
6. Définir les conversions : clic vers la réservation, envoi du formulaire
   `/devis/`, clic sur le numéro de téléphone
7. ~~Enfin, dans le script : **⚙ Paramètres du projet** → **Propriétés du script**
   → ajouter `GA4_PROPERTY_ID`~~ — **déjà fait, rien à saisir.** L'identifiant
   `460078442` est écrit en dur dans `Code.js`
   (`GA4_PROPERTY_ID_PAR_DEFAUT`). Une propriété `GA4_PROPERTY_ID` définie dans
   l'éditeur resterait prioritaire, mais elle n'est plus nécessaire.

**Point de situation au 06/08/2026** — étapes 1, 2 et 4 faites :
la propriété `gamedoor41.fr` (460078442) existe, un nouveau flux de données a
été créé, et sa balise `G-RHVR0C2M0J` est posée sur les 53 pages du site avec
la mesure inter-domaines vers `braincaen.4escape.io`.

L'ancien identifiant `G-2ENESBTXTE` était **mort** : `googletagmanager.com`
répondait 404 pour lui, alors qu'il répond 200 pour n'importe quel identifiant
inventé. La balise chargeait donc une page d'erreur au lieu du script — d'où
l'absence totale de données depuis le 30/09/2025, malgré une balise
correctement posée.

---

## Réglages disponibles

Dans **⚙ Paramètres du projet → Propriétés du script** :

| Propriété | Effet |
|---|---|
| `GSC_SITE` | Force une propriété précise, par ex. `sc-domain:gamedoor41.fr`. Sans elle, le script choisit tout seul la propriété gamedoor41 et privilégie celle de type domaine. |
| `GA4_PROPERTY_ID` | Identifiant numérique de la propriété Analytics. Absent = Analytics ignoré. |

## En cas de problème

- **`HTTP 403 … API has not been used in project … or it is disabled`** →
  l'API n'est pas activée dans le projet Google Cloud du script. Cliquer le lien
  contenu dans le message, appuyer sur **Activer**, attendre deux minutes.
  C'est le cas le plus fréquent au premier lancement, voir étape 2 point 6.
- **`listerProprietes` ne renvoie rien** (sans erreur) → le compte n'a pas accès
  à Search Console : étape 3.
- **`HTTP 403` avec un autre message** → l'autorisation a été refusée, ou la
  propriété n'est pas partagée avec ce compte.
- **Le poste de pilotage ne voit pas le fichier** → vérifier que le connecteur
  Google Drive est actif dans claude.ai et qu'il porte sur le même compte Google
  que le script.
- **Voir ce que le script a fait** → dans l'éditeur, menu de gauche →
  **Exécutions**.
