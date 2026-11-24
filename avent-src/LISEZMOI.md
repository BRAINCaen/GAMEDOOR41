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
- **Garde-fous** : adresses mail jetables refusées, 8 inscriptions par connexion et par jour.

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

    node --test avent-src/tests/coeur.test.mjs     # essais du moteur
    node avent-src/dev/serveur.mjs                 # site + moteur en local, en mémoire
    node avent-src/construire.mjs                  # refabrique netlify/avent-coeur.mjs et les 2 fonctions

Après toute modification de `avent-src/*.mjs`, relancer `construire.mjs` et commiter le résultat :
Netlify n'installe rien, il sert `netlify/avent-coeur.mjs` tel quel.
