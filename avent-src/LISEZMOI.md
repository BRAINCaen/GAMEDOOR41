# Calendrier de l'Avent 2026 — « Les 24 portes de GAMEDOOR·41 »

Page publique : `/calendrier-de-l-avent/` · écran de l'équipe : `/calendrier-de-l-avent/equipe/`.

## Ce que fait le serveur

- **Inscription sans mot de passe** : prénom + adresse mail, une seule fois. Une adresse = une personne
  (les variantes Gmail avec des points ou un « +quelquechose » sont reconnues).
- **Une réponse par porte et par personne**, vérifiée ici. La bonne réponse n'est envoyée au navigateur
  que le lendemain à midi, avec le résultat.
- **Dates à l'heure de Paris** : la porte du jour s'ouvre à minuit, les portes passées restent ouvertes
  « en rattrapage » jusqu'au 24 décembre à 23 h 59.
- **Tickets** : 1 par porte ouverte le jour même, 1 de plus si la réponse est juste (compté à l'affichage
  du résultat), 1 pour une porte ouverte en retard.
- **Tirages** : chaque jour à midi, un gagnant parmi celles et ceux qui ont joué la veille le jour même ;
  le 25 à midi, le grand tirage (un ticket = une chance) et le tirage des 24 portes ouvertes.
  Fonction planifiée `avent-tirage` + rattrapage automatique à la première visite après midi.
- **Un seul gain par personne** (décision d'Allan du 26/11/2026) : à chaque tirage, ceux qui ont déjà gagné un
  autre tirage sont écartés et on tire parmi les autres ; s'il ne reste personne d'autre, on tire parmi tous.
  Le tirage garde le nombre de joueurs écartés (`dejaGagnants`), affiché dans l'écran de l'équipe.
- **Pas de perdant** : le 25 à midi, après les deux tirages de la fin, chaque joueur qui n'a gagné aucun tirage
  reçoit 1 place de quiz pour 1 joueur (fiches `pas-de-perdant/<id>`), par mail, avec un code de quiz de la
  réserve. Jamais de mail sans code : on attend que l'équipe en ajoute. Envoi par paquets de 60 toutes les
  demi-heures, 6 à la fois. Pas de lot de consolation pour les tirages du jour.
- **Codes** : chaque code donné est d'abord réservé (`codes-pris/<code>`, écriture « seulement si absent ») :
  même deux passages en même temps ne donnent jamais le même code à deux personnes.
- **Garde-fous** : adresses mail jetables refusées, 8 inscriptions par connexion et par jour.

## Ce qui se fait tout seul

- **Lots** : `lots-2026.mjs` est la seule source (1 place de quiz POUR 1 JOUEUR chaque jour, 1 place d'escape
  game pour 1 joueur les jours à étoile, un cadeau en plus 12 jours dont la DeLorean le 24, grand tirage =
  session d'escape game complète, tirage des 24 portes = session de quiz complète). Après une modification :
  `node avent-src/ecrire-lots.mjs` (rubrique « Les lots » + règlement de la page) puis
  `node avent-src/visuels/fabriquer.mjs` (visuels des réseaux sociaux), et `construire.mjs`.
- **Mail au gagnant** (`messages.mjs`, `courrier.mjs`) : dans la demi-heure qui suit le tirage, avec son lot
  et un code pris dans la **réserve de codes** (collés par l'équipe dans son écran : quiz, escape, session de
  quiz, session d'escape game).
  Un gagnant n'est servi qu'une fois ; en cas de panne, nouvel essai à chaque passage (6 au plus) ;
  si la réserve est vide, le mail part quand même et le code suit dès qu'on en ajoute.
  Il faut la variable **`BREVO_API_KEY`** sur le site Netlify. Sans elle, rien ne part : l'équipe prévient
  les gagnants à la main (bouton « Écrire au gagnant »).
- **Bilan du jour** : un mail à l'équipe après chaque tirage (joueurs, gagnant, code, jeu à mettre de côté,
  réserve de codes, questions en attente, et ce qui demande une action).
- **Questions et réclamations** : `POST /api/avent/question` (formulaire de la page). Gardées, transmises à
  l'équipe par mail (« Répondre » écrit à la personne), accusé de réception automatique.
- **Réseaux sociaux** : `GET /api/avent/annonces` donne le fil des 49 publications (story à 8 h, publication
  à 12 h 15 avec le gagnant de la veille, publication de fin le 25). Chaque publication a un identifiant
  fixe, une heure, un visuel (`/img/avent/…jpg`), une légende et `pret` (faux tant que le tirage attendu
  n'a pas eu lieu). L'Espace Com de Synergia lit ce fil et publie sur Instagram et Facebook.
- Fonction planifiée `avent-tirage` : toutes les demi-heures ; elle ne fait rien hors décembre.

Variables Netlify du site : `BREVO_API_KEY` (secrète, obligatoire pour les mails), et si besoin
`AVENT_CONTACT` (adresse de l'équipe, par défaut contact@gamedoor41.fr) et `AVENT_EXPEDITEUR`.

## Où sont les données

Netlify Blobs. Le vrai site écrit dans le magasin `avent-2026`, les aperçus (deploy-preview…) dans
`avent-2026-apercu` : un essai ne touche jamais aux vrais joueurs. Sur un aperçu seulement, la page
affiche un bandeau « Page test » qui permet de simuler un jour et de rejouer comme un nouveau joueur.

## Les 24 défis ne sont pas dans ce dépôt

Le dépôt est public : les réponses n'y figurent pas. Les défis sont déposés dans le magasin avec le
code de l'équipe :

    POST /api/avent/equipe/defis   (en-tête x-avent-code)   corps : { "defis": [ …24 défis… ] }

Le code de l'équipe est choisi une fois pour toutes au premier appel de
`POST /api/avent/equipe/initialiser` (corps : `{ "code": "…" }`, 12 caractères au moins).
Il n'est écrit nulle part dans le dépôt.

## Travailler dessus

    node --test avent-src/tests/coeur.test.mjs avent-src/tests/automate.test.mjs   # essais du moteur
    node avent-src/dev/serveur.mjs                 # site + moteur en local, en mémoire
    node avent-src/construire.mjs                  # refabrique netlify/avent-coeur.mjs et les 2 fonctions

Après toute modification de `avent-src/*.mjs`, relancer `construire.mjs` et commiter le résultat :
Netlify n'installe rien, il sert `netlify/avent-coeur.mjs` tel quel.
