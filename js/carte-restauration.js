/* GAMEDOOR·41 — Carte restauration (traiteurs Grandsire + Fromagerie Conquérant, douceurs sucrées maison/Picard).
   UNE SEULE SOURCE pour deux pages : /restauration-seminaire/ (commande de repas) et /devis/ (simulateur).
   Prix en euros HT, TVA en %. Modifier ici, puis lancer : node scripts/perf-assets.mjs
   (sinon les visiteurs déjà venus gardent l'ancienne carte en cache pendant un an). */
window.CARTE_RESTAURATION = {
  // Salle d'accueil : 20 personnes assises (déjeuner), 40 debout (accueil café, apéritif)
  capacite: { assis: 20, debout: 40 },
  // En dessous de ce nombre de personnes, pas de commande chez Grandsire Traiteur (plateaux-repas, plateaux cocktail) :
  // il reste l'accueil café, le buffet Les Conquérants (servi debout), les douceurs sucrées et les boissons.
  // Chaque article porte son "fournisseur" : grandsire (soumis au seuil), conquerant, maison, picard.
  // Boissons en "maison" (consigne d'Alan du 08/10/2026) : pas concernées par le seuil, même si elles viennent de la carte Grandsire.
  // "note" d'une catégorie de boissons : affichée sous son titre (bouteilles données à titre d'exemple).
  seuilTraiteur: 20,
  // menu : la composition rangée par service (cat = entree, plat, fromage, dessert, viennoiserie, chaud, boisson)
  // highlights : les pictogrammes affichés sur la carte
  catalog: {
    "accueil": [
      {
        "id": "accueil-express",
        "name": "Express",
        "tag": "Accueil café",
        "price": 4.5,
        "tva": 10,
        "unit": "/ pers.",
        "subtitle": "Le minimum efficace",
        "highlights": [
          {
            "icon": "croissant",
            "cat": "viennoiserie",
            "text": "1 viennoiserie"
          },
          {
            "icon": "coffee",
            "cat": "chaud",
            "text": "Café & thé"
          },
          {
            "icon": "glass-water",
            "cat": "boisson",
            "text": "Eau plate"
          }
        ],
        "menu": [
          {
            "cat": "viennoiserie",
            "label": "Viennoiserie",
            "items": [
              "1 mini-croissant ou mini-pain au chocolat ou mini-pain aux raisins (au choix selon dispo)"
            ]
          },
          {
            "cat": "chaud",
            "label": "Café & thé",
            "items": [
              "Café Senseo capsules en libre service",
              "Bouilloire électrique + sélection de thés (Earl Grey, vert, infusion)"
            ]
          },
          {
            "cat": "boisson",
            "label": "À boire",
            "items": [
              "Eau plate 50 cl"
            ]
          }
        ],
        "info": {
          "allergenes": "Viennoiseries : gluten, œufs, lait. Sur demande : version sans gluten possible.",
          "min": "8 personnes minimum"
        },
        "fournisseur": "maison"
      },
      {
        "id": "accueil-complete",
        "name": "Complète",
        "tag": "Accueil café · Signature",
        "price": 7.5,
        "tva": 10,
        "unit": "/ pers.",
        "recommended": true,
        "subtitle": "Notre format signature",
        "highlights": [
          {
            "icon": "croissant",
            "cat": "viennoiserie",
            "text": "2 viennoiseries"
          },
          {
            "icon": "coffee",
            "cat": "chaud",
            "text": "Café & thé"
          },
          {
            "icon": "cup-soda",
            "cat": "boisson",
            "text": "Jus de fruits"
          },
          {
            "icon": "glass-water",
            "cat": "boisson",
            "text": "Eau plate"
          }
        ],
        "menu": [
          {
            "cat": "viennoiserie",
            "label": "Viennoiseries",
            "items": [
              "2 viennoiseries variées par personne (mini-croissant, mini-pain chocolat, mini-pain aux raisins, brioche)"
            ]
          },
          {
            "cat": "chaud",
            "label": "Café & thé",
            "items": [
              "Café Senseo capsules en libre service",
              "Bouilloire électrique + sélection de thés"
            ]
          },
          {
            "cat": "boisson",
            "label": "À boire",
            "items": [
              "Jus de fruits en carafe au choix : pomme, orange ou multivitaminé",
              "Eau plate"
            ]
          }
        ],
        "info": {
          "allergenes": "Viennoiseries : gluten, œufs, lait. Sur demande : alternatives sans gluten.",
          "min": "8 personnes minimum"
        },
        "fournisseur": "maison"
      }
    ],
    "dejeuner": [
      {
        "id": "dej-pouce",
        "name": "Sur le pouce",
        "tag": "Essentiel",
        "price": 13,
        "tva": 10,
        "unit": "/ pers.",
        "subtitle": "Wrap ou pasta box froide",
        "highlights": [
          {
            "icon": "sandwich",
            "cat": "plat",
            "text": "Wrap ou pasta box"
          },
          {
            "icon": "cake-slice",
            "cat": "dessert",
            "text": "Dessert"
          },
          {
            "icon": "glass-water",
            "cat": "boisson",
            "text": "Eau 50 cl"
          }
        ],
        "menu": [
          {
            "cat": "plat",
            "label": "Wrap",
            "choix": true,
            "items": [
              "Jambon fumé de la Manche, mimolette d'Isigny, fromage frais et salade",
              "Poulet et crudités, oignons frits, tomates confites, fromage frais et ciboulette",
              "Saumon, guacamole épicé, concombre et salade",
              "Brie, crème de chorizo et salade",
              "Poulet croustillant (nuggets), salade et fromage frais sauce César",
              "Thon à la marmelade de yuzu",
              "Légumes tex-mex",
              "Wrap et son fish & chips, sauce tartare"
            ]
          },
          {
            "cat": "plat",
            "label": "Ou pasta box froide",
            "choix": true,
            "items": [
              "Penne au salami et légumes, billes de mozzarella, olives noires et basilic",
              "Salade de tagliatelles fraîches, jambon fumé, emmental, parmesan et pesto",
              "Salade de fusilli au thon, poivrons, tomates et œuf, mayonnaise curry-citron vert"
            ]
          },
          {
            "cat": "dessert",
            "label": "Dessert",
            "choix": true,
            "items": [
              "Grande brochette de fruits frais",
              "Tartelette citron",
              "Muffin chocolat noisette",
              "Brownie"
            ]
          }
        ],
        "extras": [
          "Bouteille d'eau 50 cl et serviette, en valisette isotherme (avec couverts en bois et boule de pain pour la formule wrap)"
        ],
        "info": {
          "allergenes": "Selon la recette choisie : gluten, lait, œufs, poisson possibles. Signalez allergies et régimes dans votre demande.",
          "min": "4 formules minimum par composition",
          "fournisseur": "Grandsire Traiteur"
        },
        "fournisseur": "grandsire"
      },
      {
        "id": "dej-box",
        "name": "Box burger ou bagel",
        "tag": "Box isotherme",
        "price": 15,
        "tva": 10,
        "unit": "/ pers.",
        "subtitle": "Burger ou bagel froid",
        "highlights": [
          {
            "icon": "hamburger",
            "cat": "plat",
            "text": "Burger ou bagel"
          },
          {
            "icon": "salad",
            "cat": "entree",
            "text": "Chips ou salade"
          },
          {
            "icon": "cake-slice",
            "cat": "dessert",
            "text": "Dessert"
          },
          {
            "icon": "glass-water",
            "cat": "boisson",
            "text": "Eau 50 cl"
          }
        ],
        "menu": [
          {
            "cat": "plat",
            "label": "Burger froid",
            "choix": true,
            "items": [
              "Chicken burger (graine de courge, poulet croustillant, oignons rouges, tomme de Savoie, sauce crémeuse aux herbes)",
              "Burger façon asiatique (effiloché de bœuf, coriandre, petits légumes, houmous de patate douce)"
            ]
          },
          {
            "cat": "plat",
            "label": "Ou bagel froid",
            "choix": true,
            "items": [
              "Norvégien (courgettes grillées, chèvre, noix, pomme)",
              "Nordique (saumon fumé, ricotta, pousses d'épinard, crevettes, citron vert)",
              "Volaille (poulet, bacon, oignons frits, tomate, salade, sauce barbecue)"
            ]
          },
          {
            "cat": "entree",
            "label": "Accompagnement",
            "choix": true,
            "items": [
              "Paquet de chips",
              "Salade italienne"
            ]
          },
          {
            "cat": "dessert",
            "label": "Dessert",
            "choix": true,
            "items": [
              "Grande brochette de fruits frais",
              "Tartelette citron",
              "Muffin chocolat noisette",
              "Brownie"
            ]
          }
        ],
        "extras": [
          "Bouteille d'eau 50 cl et serviette"
        ],
        "info": {
          "allergenes": "Selon la recette choisie : gluten, lait, œufs, poisson, crustacés possibles. Signalez allergies et régimes dans votre demande.",
          "min": "4 box minimum par composition",
          "fournisseur": "Grandsire Traiteur"
        },
        "fournisseur": "grandsire"
      },
      {
        "id": "dej-figue",
        "name": "Plateau Figue",
        "tag": "Confort · Essentiel",
        "price": 16.5,
        "tva": 10,
        "unit": "/ pers.",
        "subtitle": "4 services · gamme essentielle",
        "highlights": [
          {
            "icon": "salad",
            "cat": "entree",
            "text": "Entrée"
          },
          {
            "icon": "drumstick",
            "cat": "plat",
            "text": "Plat froid"
          },
          {
            "icon": "cheese",
            "cat": "fromage",
            "text": "Fromage"
          },
          {
            "icon": "cake-slice",
            "cat": "dessert",
            "text": "Dessert"
          }
        ],
        "menu": [
          {
            "cat": "entree",
            "label": "Entrée",
            "choix": true,
            "items": [
              "Terrine de poissons aux légumes d'automne, coulis balsamique",
              "Terrine de campagne, chutney de tomates et échalotes",
              "Quiche au butternut rôti, guacamole et crème de parmesan",
              "Quiche à la sardine, poireaux et tomme de Normandie",
              "Entrée du jour"
            ]
          },
          {
            "cat": "plat",
            "label": "Plat froid",
            "choix": true,
            "items": [
              "Filet de poulet croustillant (cacahuètes, sarrasin), penne et potimarron rôti",
              "Filet de maquereau, salade de riz aux légumes de saison",
              "Émincé de bœuf laqué au soja et citronnelle, nouilles chinoises et légumes",
              "Saumon au citron vert et quinoa au curry, petits légumes",
              "Plat du jour"
            ]
          },
          {
            "cat": "fromage",
            "label": "Fromage",
            "choix": false,
            "items": []
          },
          {
            "cat": "dessert",
            "label": "Dessert",
            "choix": true,
            "items": [
              "Clafoutis banane",
              "Tarte fine cannelle, caramel",
              "Riz au lait, coulis du moment",
              "Sablé myrtille, tonka (végan)",
              "Dessert du jour"
            ]
          }
        ],
        "extras": [
          "Couverts en bois, gobelet recyclable, assiette compostable, serviette et boule de pain"
        ],
        "info": {
          "allergenes": "Selon les recettes choisies : gluten, arachide (poulet aux cacahuètes), poissons, soja, lait, œufs, sulfites (coulis balsamique) possibles. Signalez allergies et régimes dans votre demande.",
          "min": "4 plateaux minimum par composition",
          "options": "Couverts inox au lieu du bois : + 1,00 € HT / plateau",
          "fournisseur": "Grandsire Traiteur · certifié ISO 20121"
        },
        "fournisseur": "grandsire"
      },
      {
        "id": "dej-marron",
        "name": "Plateau Marron",
        "tag": "Confort · Premium",
        "price": 19,
        "tva": 10,
        "unit": "/ pers.",
        "recommended": true,
        "subtitle": "4 services · gamme premium",
        "highlights": [
          {
            "icon": "salad",
            "cat": "entree",
            "text": "Entrée"
          },
          {
            "icon": "drumstick",
            "cat": "plat",
            "text": "Plat froid"
          },
          {
            "icon": "cheese",
            "cat": "fromage",
            "text": "Fromage"
          },
          {
            "icon": "cake-slice",
            "cat": "dessert",
            "text": "Dessert"
          }
        ],
        "menu": [
          {
            "cat": "entree",
            "label": "Entrée",
            "choix": true,
            "items": [
              "Quiche au potiron et fourme d'Ambert",
              "Terrine de lentilles et légumes, coulis balsamique",
              "Burrata, crémeux de butternut au parmesan et croûtons à l'ail",
              "Saumon fumé et houmous de butternut au sésame",
              "Entrée du jour"
            ]
          },
          {
            "cat": "plat",
            "label": "Plat froid",
            "choix": true,
            "items": [
              "Filet de volaille rôti au miel, salade de penne au potiron et poire",
              "Lieu noir rôti au beurre noisette, légumes d'automne et crémeux de patate douce",
              "Émincé de veau, salade d'épeautre aux légumes et coulis de mâche",
              "Dorade royale aux noix, blé et crème de potiron",
              "Plat du jour"
            ]
          },
          {
            "cat": "fromage",
            "label": "Fromage",
            "choix": false,
            "items": []
          },
          {
            "cat": "dessert",
            "label": "Dessert",
            "choix": true,
            "items": [
              "Feuilleté amandes, banane, chocolat",
              "Crumble pommes",
              "Cookie garni chocolat, pécan, praliné",
              "Riz au lait vanille, coulis mangue (végan)",
              "Dessert du jour"
            ]
          }
        ],
        "extras": [
          "Couverts en bois, gobelet recyclable, assiette compostable, serviette et boule de pain"
        ],
        "info": {
          "allergenes": "Selon les recettes choisies : gluten, poissons, sésame, lait, œufs, fruits à coque (noix, amandes, noisettes, pécan), sulfites (coulis balsamique) possibles. Signalez allergies et régimes dans votre demande.",
          "min": "4 plateaux minimum par composition",
          "options": "Couverts inox au lieu du bois : + 1,00 € HT / plateau",
          "fournisseur": "Grandsire Traiteur · certifié ISO 20121"
        },
        "fournisseur": "grandsire"
      },
      {
        "id": "dej-vege",
        "name": "Plateau Végétarien",
        "tag": "Confort · Végétarien",
        "price": 19,
        "tva": 10,
        "unit": "/ pers.",
        "subtitle": "4 services · végétarien",
        "highlights": [
          {
            "icon": "salad",
            "cat": "entree",
            "text": "Entrée"
          },
          {
            "icon": "leaf",
            "cat": "plat",
            "text": "Plat froid"
          },
          {
            "icon": "cheese",
            "cat": "fromage",
            "text": "Fromage"
          },
          {
            "icon": "cake-slice",
            "cat": "dessert",
            "text": "Dessert"
          }
        ],
        "menu": [
          {
            "cat": "entree",
            "label": "Entrée",
            "choix": true,
            "items": [
              "Tartine de houmous, citron confit et cumin, mini pita toastée",
              "Taboulé de boulgour, tomates, concombres et feta",
              "Wrap d'épeautre, potimarron grillé, oignons rouges en pickles",
              "Entrée du jour"
            ]
          },
          {
            "cat": "plat",
            "icon": "leaf",
            "label": "Plat froid",
            "choix": true,
            "items": [
              "Salade de lentilles corail, carottes rôties au miel, noisette et vinaigrette",
              "Focaccia au caviar d'aubergine, tzatziki",
              "Plat du jour"
            ]
          },
          {
            "cat": "fromage",
            "label": "Fromage",
            "choix": false,
            "items": []
          },
          {
            "cat": "dessert",
            "label": "Dessert",
            "choix": true,
            "items": [
              "Riz au lait vanille, coulis mangue (végan)",
              "Tiramisu coco, passion (végan)",
              "Sablé myrtille, tonka (végan)",
              "Dessert du jour"
            ]
          }
        ],
        "extras": [
          "Couverts en bois, gobelet recyclable, assiette compostable, serviette et boule de pain"
        ],
        "info": {
          "allergenes": "Selon les recettes choisies : gluten, sésame, lait, fruits à coque (noisette) possibles. Signalez allergies et régimes dans votre demande.",
          "min": "4 plateaux minimum par composition",
          "options": "Couverts inox au lieu du bois : + 1,00 € HT / plateau",
          "fournisseur": "Grandsire Traiteur · certifié ISO 20121"
        },
        "fournisseur": "grandsire"
      },
      {
        "id": "dej-pomme",
        "name": "Plateau Pomme",
        "tag": "Premium · Gastronomique",
        "price": 24.8,
        "tva": 10,
        "unit": "/ pers.",
        "subtitle": "4 services · gastronomique",
        "highlights": [
          {
            "icon": "salad",
            "cat": "entree",
            "text": "Entrée"
          },
          {
            "icon": "drumstick",
            "cat": "plat",
            "text": "Plat froid"
          },
          {
            "icon": "cheese",
            "cat": "fromage",
            "text": "Fromage"
          },
          {
            "icon": "cake-slice",
            "cat": "dessert",
            "text": "Dessert"
          }
        ],
        "menu": [
          {
            "cat": "entree",
            "label": "Entrée",
            "choix": true,
            "items": [
              "Foie gras de canard et confit d'échalotes au porto rouge",
              "Trio de Saint-Jacques et crémeux de patate douce à l'orange",
              "Tartare de saumon et gambas aux agrumes",
              "Entrée du jour"
            ]
          },
          {
            "cat": "plat",
            "label": "Plat froid",
            "choix": true,
            "items": [
              "Filet de bœuf aux 5 baies, tagliatelles fraîches aux morilles et crème de beaufort",
              "Filet de bar rôti, panais et topinambour, sauce vierge",
              "Brochette de Saint-Jacques et gambas, risotto aux légumes, noix et copeaux de mimolette",
              "Filet de canette, boulgour à la figue et potiron, sauce miel et moutarde",
              "Plat du jour"
            ]
          },
          {
            "cat": "fromage",
            "label": "Fromage",
            "choix": false,
            "items": []
          },
          {
            "cat": "dessert",
            "label": "Dessert",
            "choix": true,
            "items": [
              "Chocolat citron",
              "Moelleux chocolat, cœur Nutella",
              "Tiramisu coco, passion (végan)",
              "Tartelette croustillante fruit de saison",
              "Dessert du jour"
            ]
          }
        ],
        "extras": [
          "Couverts en bois, gobelet recyclable, assiette compostable, serviette et boule de pain"
        ],
        "info": {
          "allergenes": "Selon les recettes choisies : gluten, poissons, crustacés, mollusques, lait, œufs, soja (moelleux cœur Nutella), fruits à coque, moutarde possibles. Signalez allergies et régimes dans votre demande.",
          "min": "4 plateaux minimum par composition",
          "options": "Couverts inox au lieu du bois : + 1,00 € HT / plateau",
          "fournisseur": "Grandsire Traiteur · certifié ISO 20121"
        },
        "fournisseur": "grandsire"
      }
    ],
    "apero": [
      {
        "id": "apero-conquerant",
        "name": "Les Conquérants",
        "tag": "Apéro terroir normand",
        "price": 9,
        "tva": 10,
        "unit": "/ pers.",
        "subtitle": "Notre signature locale · 200 g / pers.",
        "highlights": [
          {
            "icon": "cheese",
            "cat": "fromage",
            "text": "Fromages au lait cru"
          },
          {
            "icon": "ham",
            "cat": "plat",
            "text": "Charcuterie fine"
          },
          {
            "icon": "wheat",
            "cat": "entree",
            "text": "Pain de campagne"
          }
        ],
        "menu": [
          {
            "cat": "fromage",
            "label": "Fromages affinés au lait cru (5-6 variétés selon saison)",
            "items": [
              "Camembert au lait cru",
              "Livarot",
              "Pont-l'évêque",
              "Neufchâtel",
              "Brie de Meaux",
              "Comté affiné"
            ]
          },
          {
            "cat": "plat",
            "label": "Charcuteries fines (3-4 variétés)",
            "items": [
              "Jambon sec",
              "Saucisson sec",
              "Rosette",
              "Terrine maison",
              "Rillettes locales"
            ]
          },
          {
            "cat": "entree",
            "label": "Avec",
            "items": [
              "Pain de campagne tranché",
              "Beurre demi-sel, cornichons, condiments",
              "Présentation en planche bois ou carton premium"
            ]
          }
        ],
        "extras": [
          "Plateau Gourmand Mixte Fromagerie Conquérant",
          "200 g de produits par personne"
        ],
        "info": {
          "allergenes": "Lait cru (fromages), porc (charcuterie), gluten (pain). Allergie lait : prévenir. Cette formule n'est pas adaptée aux femmes enceintes (lait cru).",
          "min": "4 personnes minimum",
          "options": "À compléter avec cidre brut normand 5 € HT/75 cl ou crémant de Loire 10 € HT/75 cl pour un apéro complet",
          "fournisseur": "Fromagerie Conquérant · Caen · <a href=\"https://fromagerie-conquerant.com/products/plateau-gourmand-mixte\" target=\"_blank\" rel=\"noopener\">Voir le produit</a>"
        },
        "fournisseur": "conquerant"
      }
    ],
    "plateauxFroids": {
      "title": "Plateaux cocktail froids · Grandsire Traiteur",
      "items": [
        {
          "id": "pc-wraps",
          "name": "Plateau de 30 wraps",
          "vol": "30 pièces",
          "price": 36.36,
          "tva": 10,
          "desc": "Jambon fumé et mimolette · poulet crudités · saumon guacamole · fish & chips sauce tartare · thon au yuzu",
          "icon": "sandwich",
          "short": "30 wraps",
          "pieces": 30,
          "fournisseur": "grandsire"
        },
        {
          "id": "pc-savouris",
          "name": "Plateau de 30 savouris froids",
          "vol": "30 pièces",
          "price": 36.36,
          "tva": 10,
          "desc": "Dôme de volaille teriyaki · sablé de hareng fumé · briochin rillette de thon · rouleau de printemps · wrap saumon guacamole · brochette melon et jambon fumé",
          "icon": "utensils",
          "short": "30 savouris froids",
          "pieces": 30,
          "fournisseur": "grandsire"
        },
        {
          "id": "pc-fraicheur",
          "name": "Plateau de 30 pièces fraîcheurs",
          "vol": "30 pièces",
          "price": 36.36,
          "tva": 10,
          "desc": "Macaron de magret à l'orange · cheesecake aux petits pois · navette de jambon de volaille · brochette crevettes-ananas · chaud-froid de volaille (recette froide) · wrap fish & chips",
          "icon": "leaf",
          "short": "30 pièces fraîcheurs",
          "pieces": 30,
          "fournisseur": "grandsire"
        },
        {
          "id": "pc-boulangeres",
          "name": "Plateau de 30 boulangères et mini-clubs",
          "vol": "30 pièces",
          "price": 36.36,
          "tva": 10,
          "desc": "Navette de volaille miel-épices · briochin Neufchâtel et pomme · mini-clubs saumon fumé, bœuf sauce tartare, crudités · bruschetta légumes-anchois",
          "icon": "croissant",
          "short": "30 boulangères & mini-clubs",
          "pieces": 30,
          "fournisseur": "grandsire"
        },
        {
          "id": "pc-pain-surprise",
          "name": "Pain surprise",
          "vol": "50 pièces",
          "price": 40,
          "tva": 10,
          "desc": "Au choix : charcuterie, poisson, ou mixte charcuterie-poisson-crudités",
          "icon": "wheat",
          "short": "Pain surprise",
          "pieces": 50,
          "fournisseur": "grandsire"
        },
        {
          "id": "pc-fours-finesse",
          "name": "Plateau de 30 fours frais « Finesse »",
          "vol": "30 pièces · sucré",
          "price": 36.36,
          "tva": 10,
          "desc": "Choux banane · brownie crémeux · coque coco-passion · tartelette fruits de saison · sablé cappuccino · carré de pain d'épices",
          "icon": "cupcake",
          "short": "30 fours « Finesse »",
          "pieces": 30,
          "sucre": true,
          "fournisseur": "grandsire"
        },
        {
          "id": "pc-fours-saveurs",
          "name": "Plateau de 30 fours frais « Saveurs »",
          "vol": "30 pièces · sucré",
          "price": 36.36,
          "tva": 10,
          "desc": "Sablé ananas · macarons · sablé exotique · cup pécan-chocolat-cannelle · petite tartelette tatin · cube coco-chocolat",
          "icon": "donut",
          "short": "30 fours « Saveurs »",
          "pieces": 30,
          "sucre": true,
          "fournisseur": "grandsire"
        }
      ]
    },
    "douceurs": {
      "title": "Douceurs sucrées",
      "items": [
        {
          "id": "d-chouquettes",
          "name": "12 chouquettes",
          "vol": "12 pièces",
          "price": 2.91,
          "desc": "Petits choux au sucre perlé",
          "icon": "cupcake",
          "short": "12 chouquettes",
          "pieces": 12,
          "tva": 10,
          "sucre": true,
          "fournisseur": "picard"
        },
        {
          "id": "d-tartinettes",
          "name": "12 tartinettes amande",
          "vol": "12 pièces",
          "price": 3.91,
          "desc": "Fines brioches feuilletées aux amandes",
          "icon": "croissant",
          "short": "12 tartinettes amande",
          "pieces": 12,
          "tva": 10,
          "sucre": true,
          "fournisseur": "picard"
        },
        {
          "id": "d-tartinettes-choco",
          "name": "12 tartinettes amande-chocolat",
          "vol": "12 pièces",
          "price": 4,
          "desc": "Fines brioches feuilletées amande et chocolat",
          "icon": "croissant",
          "short": "12 tartinettes choco",
          "pieces": 12,
          "tva": 10,
          "sucre": true,
          "fournisseur": "picard"
        },
        {
          "id": "d-viennoiseries",
          "name": "12 petites viennoiseries",
          "vol": "12 pièces",
          "price": 6.36,
          "desc": "Mini-croissants, mini-pains au chocolat, mini-pains aux raisins",
          "icon": "croissant",
          "short": "12 mini-viennoiseries",
          "pieces": 12,
          "tva": 10,
          "sucre": true,
          "fournisseur": "picard"
        },
        {
          "id": "d-pack-gourmand",
          "name": "Pack petit-déjeuner gourmand",
          "vol": "36 pièces",
          "price": 11.82,
          "desc": "Assortiment de 36 mini-viennoiseries et douceurs du matin",
          "icon": "croissant",
          "short": "Pack gourmand 36 pièces",
          "pieces": 36,
          "tva": 10,
          "sucre": true,
          "fournisseur": "picard"
        },
        {
          "id": "d-macarons-12",
          "name": "Assortiment 12 macarons",
          "vol": "12 pièces",
          "price": 6,
          "desc": "Macarons assortis, parfums variés",
          "icon": "donut",
          "short": "12 macarons",
          "pieces": 12,
          "tva": 10,
          "sucre": true,
          "fournisseur": "picard"
        },
        {
          "id": "d-macarons-16",
          "name": "Assortiment 16 macarons",
          "vol": "16 pièces",
          "price": 6.5,
          "desc": "Macarons assortis, parfums variés",
          "icon": "donut",
          "short": "16 macarons",
          "pieces": 16,
          "tva": 10,
          "sucre": true,
          "fournisseur": "picard"
        },
        {
          "id": "d-mignardises-16",
          "name": "Mignardises",
          "vol": "16 pièces",
          "price": 10,
          "desc": "Mini-pâtisseries assorties",
          "icon": "cake-slice",
          "short": "16 mignardises",
          "pieces": 16,
          "tva": 10,
          "sucre": true,
          "fournisseur": "picard"
        },
        {
          "id": "d-petits-fours-16",
          "name": "Assortiment 16 petits fours sucrés",
          "vol": "16 pièces",
          "price": 11,
          "desc": "Petits fours sucrés assortis",
          "icon": "cupcake",
          "short": "16 petits fours sucrés",
          "pieces": 16,
          "tva": 10,
          "sucre": true,
          "fournisseur": "picard"
        }
      ]
    },
    "boissons": {
      "soft": {
        "title": "Eaux, softs & café",
        "items": [
          {
            "id": "b-eau-50",
            "name": "Eau plate Cristaline",
            "vol": "50 cl",
            "price": 0.9,
            "tva": 10,
            "fournisseur": "maison"
          },
          {
            "id": "b-eau-150",
            "name": "Eau plate Cristaline",
            "vol": "1,5 L",
            "price": 1.5,
            "tva": 10,
            "fournisseur": "maison"
          },
          {
            "id": "b-badoit",
            "name": "Eau gazeuse Badoit",
            "vol": "1 L",
            "price": 1.5,
            "tva": 10,
            "fournisseur": "maison"
          },
          {
            "id": "b-coca",
            "name": "Coca-Cola",
            "vol": "1,25 L",
            "price": 3,
            "tva": 10,
            "fournisseur": "maison"
          },
          {
            "id": "b-jus-or",
            "name": "Jus d'orange",
            "vol": "1 L",
            "price": 3,
            "tva": 10,
            "fournisseur": "maison"
          },
          {
            "id": "b-jus-po",
            "name": "Jus de pomme artisanal",
            "vol": "1 L",
            "price": 3.5,
            "tva": 10,
            "fournisseur": "maison"
          },
          {
            "id": "b-cafe",
            "name": "Thermos de café",
            "vol": "1 L",
            "price": 15,
            "tva": 10,
            "fournisseur": "maison"
          }
        ],
        "icon": "cup-soda"
      },
      "cidre": {
        "title": "Cidre & bière",
        "items": [
          {
            "id": "b-cidre",
            "name": "Cidre normand",
            "vol": "75 cl",
            "price": 5,
            "tva": 20,
            "fournisseur": "maison"
          },
          {
            "id": "b-biere",
            "name": "Bière",
            "vol": "25 cl",
            "price": 1.25,
            "tva": 20,
            "fournisseur": "maison"
          }
        ],
        "icon": "beer"
      },
      "vins": {
        "title": "Vins",
        "note": "Bouteilles données à titre d'exemple : selon les disponibilités, nous pouvons vous servir un autre cépage, une autre appellation ou une autre maison.",
        "items": [
          {
            "id": "b-sauvignon",
            "name": "Sauvignon de Touraine",
            "vol": "75 cl",
            "price": 8,
            "tva": 20,
            "fournisseur": "maison"
          },
          {
            "id": "b-rose",
            "name": "Rosé de Provence",
            "vol": "75 cl",
            "price": 8,
            "tva": 20,
            "fournisseur": "maison"
          },
          {
            "id": "b-bordeaux",
            "name": "Bordeaux rouge",
            "vol": "75 cl",
            "price": 8,
            "tva": 20,
            "fournisseur": "maison"
          },
          {
            "id": "b-st-emilion",
            "name": "Saint-Émilion",
            "vol": "75 cl",
            "price": 14,
            "tva": 20,
            "fournisseur": "maison"
          }
        ],
        "icon": "wine"
      },
      "apero": {
        "title": "Bulles & apéritifs",
        "note": "Bouteilles données à titre d'exemple : selon les disponibilités, nous pouvons vous servir une autre appellation ou une autre maison.",
        "items": [
          {
            "id": "b-cremant",
            "name": "Crémant de Loire",
            "vol": "75 cl",
            "price": 10,
            "tva": 20,
            "fournisseur": "maison"
          },
          {
            "id": "b-methode",
            "name": "Méthode traditionnelle",
            "vol": "75 cl",
            "price": 7,
            "tva": 20,
            "fournisseur": "maison"
          },
          {
            "id": "b-champ",
            "name": "Champagne",
            "vol": "75 cl",
            "price": 18,
            "tva": 20,
            "fournisseur": "maison"
          },
          {
            "id": "b-cassis",
            "name": "Crème de cassis",
            "vol": "1 L",
            "price": 11,
            "tva": 20,
            "fournisseur": "maison"
          }
        ],
        "icon": "party-popper"
      }
    }
  }
};
