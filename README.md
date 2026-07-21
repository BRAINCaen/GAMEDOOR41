# GAMEDOOR41 — site gamedoor41.fr

Le code du site est ici. **Ce dépôt est la seule version qui fait foi.**
Ce qui est envoyé ici part directement en ligne sur gamedoor41.fr.

---

## Premier jour sur un nouveau PC

**1. Installer les deux outils** (à faire une fois par PC)

- Git : https://git-scm.com/download/win → installer, cliquer *Suivant* partout
- Visual Studio Code : https://code.visualstudio.com → installer

**2. Récupérer le site**

Ouvrir VS Code → menu **Terminal → Nouveau terminal**, puis copier-coller :

```bash
cd ~/Projets
git clone https://github.com/BRAINCaen/GAMEDOOR41.git
```

Une fenêtre GitHub s'ouvre pour se connecter : utiliser **le compte du taf**. Cette
connexion n'est demandée qu'une seule fois par PC.

**3. Ouvrir le dossier**

Dans VS Code : **Fichier → Ouvrir le dossier…** → `Projets/gamedoor41`.

C'est tout. Claude Code lit automatiquement le fichier `CLAUDE.md` du dossier : il sait
déjà comment le site est construit, ce qu'il ne faut pas casser et comment publier.
**Aucune explication à lui redonner.**

---

## Chaque fois que tu travailles sur le site

| Quand | Quoi | Pourquoi |
|---|---|---|
| **Avant** de commencer | `git pull` | récupérer le travail des autres — et celui du robot qui met à jour les avis Google chaque nuit |
| Pendant | tu modifies, ou tu demandes à Claude | — |
| **Après** | `git push` | **publie le site en ligne immédiatement** |

Le plus simple : demander à Claude « récupère les dernières modifs » en arrivant, et
« publie » en partant. Il s'occupe des commandes.

> **La règle qui évite 90 % des problèmes : `git pull` avant, `git push` après.**
> Si tu oublies le `pull`, ton envoi sera refusé — ce n'est pas grave, demande à Claude
> de régler ça, c'est une manipulation de dix secondes.

---

## Les 4 choses à savoir avant de toucher au site

**1. Il n'y a pas de brouillon.** Un `git push` publie en ligne, tout de suite, pour tout
le monde. Pas de bouton « aperçu » ni de validation. Si tu n'es pas sûr, demande à Claude
de préparer une *pull request* : ça crée une adresse de test privée, à valider avant
publication.

**2. Tout fichier ajouté ici devient une page publique.** N'y dépose jamais un document
interne, un export comptable, un devis, une capture d'écran. En cas de doute : demande.

**3. Ne jamais supprimer de redirection** dans `netlify.toml`. Chacune récupère un lien
Google de l'ancien site. En supprimer une, c'est perdre des visiteurs.

**4. Les prix et horaires ne s'inventent pas.** La référence est la grille réelle
4escape. Si l'information manque, il faut la demander, pas la deviner.

---

## Voir le site avant de publier

**Ne double-clique pas sur `index.html`** : la page s'affichera, mais tous les liens
internes (`/tarifs/`, `/contact/`…) seront cassés. Ce n'est pas représentatif.

La bonne méthode, une fois pour toutes : installer l'extension **Live Server** dans
VS Code (elle est proposée automatiquement à l'ouverture du dossier — accepter). Ensuite,
clic droit sur `index.html` → **Open with Live Server**. Le site s'ouvre dans le
navigateur et se rafraîchit à chaque modification enregistrée.

---

## En cas de pépin

- **« Mon envoi est refusé »** → quelqu'un a publié avant toi. Demande à Claude de
  récupérer les modifications et de renvoyer.
- **« J'ai cassé quelque chose en ligne »** → tout est réversible, rien n'est jamais perdu.
  Demande à Claude de revenir à la version précédente, ou remets en ligne un ancien
  déploiement depuis Netlify : https://app.netlify.com/projects/gamedoor41 → *Deploys* →
  choisir un déploiement → *Publish deploy*.
- **« Je ne comprends pas ce qu'on me demande »** → demande à Claude d'expliquer en
  français simple. C'est prévu pour.

---

## Pour les curieux : comment c'est fait

Site **statique** — HTML, CSS et JavaScript écrits à la main, sans framework et sans
compilation. Hébergement Netlify, branché sur ce dépôt.
Le détail technique est dans [CLAUDE.md](CLAUDE.md).
