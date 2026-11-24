/* Les 24 portes de GAMEDOOR·41 : les 24 défis (PROPOSITIONS à valider par l'équipe).
   PAGE TEST : les réponses sont dans ce fichier pour que l'équipe puisse relire.
   Pour la vraie mise en ligne, les réponses seront vérifiées côté serveur et
   ne seront plus envoyées au navigateur. */
window.AVENT_DEFIS = [
  {
    j: 1, univers: 'gav', titre: 'Le cadenas du commissariat', type: 'code', longueur: 3, code: '042',
    intro: 'Le coffre des pièces à conviction est fermé par un cadenas à 3 chiffres. Le brigadier a laissé cinq essais ratés, avec ses notes.',
    visuel: 'indices',
    indices: [
      ['6 8 2', 'un chiffre est bon et bien placé'],
      ['6 1 4', 'un chiffre est bon mais mal placé'],
      ['2 0 6', 'deux chiffres sont bons mais mal placés'],
      ['7 3 8', 'aucun chiffre n’est bon'],
      ['7 8 0', 'un chiffre est bon mais mal placé']
    ],
    question: 'Quel est le code du cadenas ?',
    explication: 'Le 7, le 3 et le 8 sont exclus. Le 6 aussi (sinon il serait bien placé dans « 6 1 4 »). Reste le 2 à la fin, le 0 au début, le 4 au milieu : 0 4 2.',
    prod: 'Rien à produire. Option : 15 s de vidéo du policier qui pose le cadenas sur le bureau.'
  },
  {
    j: 2, univers: 'quiz', titre: 'Question à un buzzer', type: 'qcm', bonne: 0,
    intro: 'Première question du plateau, main sur le buzzer.',
    question: 'Dans la chanson « Petit Papa Noël », que ne faut-il surtout pas oublier ?',
    choix: ['Mon petit soulier', 'Mon petit sapin', 'Ma grande cheminée', 'Mes jolis jouets'],
    explication: '« … n’oublie pas mon petit soulier. »',
    prod: 'Rien à produire.'
  },
  {
    j: 3, univers: '80s', titre: 'Le film en rébus', type: 'qcm', bonne: 2,
    intro: 'Un film culte des années 80 se cache derrière ces quatre dessins.',
    visuel: 'rebus', rebus: ['👻', '🚫', '🚒', '🏙️'],
    question: 'De quel film s’agit-il ?',
    choix: ['Gremlins', 'Beetlejuice', 'S.O.S. Fantômes', 'Les Goonies'],
    explication: 'S.O.S. Fantômes, sorti en 1984 : des fantômes, un panneau d’interdiction, une ancienne caserne de pompiers, New York.',
    prod: 'Rien à produire.'
  },
  {
    j: 4, univers: 'psy', titre: 'Le dossier du patient', type: 'qcm', bonne: 1,
    intro: 'L’infirmière a laissé un dossier ouvert sur le chariot. Vous avez 8 secondes pour le lire avant qu’elle revienne.',
    memoire: {
      secondes: 8,
      lignes: [['Patient', 'n° 4127'], ['Chambre', '13, lit B'], ['Admis à', '23 h 41'], ['Régime', 'sans sel'], ['Visites', 'interdites']]
    },
    question: 'À quelle heure le patient a-t-il été admis ?',
    choix: ['23 h 14', '23 h 41', '22 h 41', '21 h 43'],
    explication: 'Le dossier indiquait : admis à 23 h 41.',
    prod: 'Rien à produire. Option : photo d’un vrai dossier posé dans la salle à la place du dossier dessiné.'
  },
  {
    j: 5, univers: 'gav', titre: 'Qui ment ?', type: 'qcm', bonne: 2,
    intro: 'La clé de la cellule a disparu. Trois suspects sont interrogés. Un seul dit la vérité.',
    visuel: 'paroles',
    paroles: [['Suspect n° 1', '« C’est le n° 2 qui a pris la clé. »'], ['Suspect n° 2', '« Ce n’est pas moi. »'], ['Suspect n° 3', '« Ce n’est pas moi. »']],
    question: 'Qui a pris la clé ?',
    choix: ['Le suspect n° 1', 'Le suspect n° 2', 'Le suspect n° 3', 'Impossible à savoir'],
    explication: 'Si c’était le n° 1 ou le n° 2, deux suspects diraient la vérité. Avec le n° 3 coupable, seul le n° 2 dit vrai.',
    prod: 'Rien à produire. Option : 3 portraits de l’équipe déguisée en suspects (photo d’identité judiciaire).'
  },
  {
    j: 6, univers: 'quiz', titre: 'Blind test au buzzer', type: 'qcm', bonne: 0, gros: true,
    intro: 'Montez le son. Le plateau joue quelques notes, à vous de reconnaître l’air.',
    audio: { genre: 'melodie', notes: [['E', 1], ['E', 1], ['E', 2], ['E', 1], ['E', 1], ['E', 2], ['E', 1], ['G', 1], ['C', 1.5], ['D', 0.5], ['E', 3]] },
    question: 'Quel est cet air ?',
    choix: ['Vive le vent', 'Petit Papa Noël', 'Mon beau sapin', 'Douce nuit'],
    explication: '« Vive le vent », la version française de « Jingle Bells » (1857).',
    prod: 'Rien à produire (les notes sont jouées par la page, sans enregistrement). Option : les mêmes notes jouées sur le plateau, filmées.'
  },
  {
    j: 7, univers: '80s', titre: 'Game over', type: 'qcm', bonne: 1,
    intro: 'La borne d’arcade de la salle vient d’afficher GAME OVER.',
    visuel: 'photo', photo: { src: '/img/escape/salle-back-to-80s-borne-arcade-pacman-768w.jpg', alt: 'La borne d’arcade de la salle Back to the 80’s' },
    question: 'Combien de fantômes poursuivent Pac-Man dans le jeu d’origine ?',
    choix: ['3', '4', '5', '6'],
    explication: 'Ils sont 4 : Blinky, Pinky, Inky et Clyde.',
    prod: 'Rien à produire (photo déjà sur le site).'
  },
  {
    j: 8, univers: 'psy', titre: 'Le message sur le mur', type: 'qcm', bonne: 0,
    intro: 'Quelqu’un a écrit sur le mur de la chambre… à l’envers.',
    visuel: 'miroir', miroir: 'NE VOUS RETOURNEZ PAS',
    question: 'Que dit le message ?',
    choix: ['Ne vous retournez pas', 'Ne vous réveillez pas', 'Ne nous retrouvez pas', 'Ne vous relevez pas'],
    explication: 'Lu dans un miroir : « Ne vous retournez pas ».',
    prod: 'Rien à produire. Option : le message écrit pour de vrai sur un mur de la salle, en photo.'
  },
  {
    j: 9, univers: 'gav', titre: 'Le digicode de la cellule', type: 'qcm', bonne: 2,
    intro: 'Les touches usées du digicode donnent une suite de nombres. Il en manque un.',
    visuel: 'suite', suite: ['2', '6', '12', '20', '30', '?'],
    question: 'Quel nombre complète la suite ?',
    choix: ['36', '40', '42', '44'],
    explication: 'On ajoute 4, puis 6, puis 8, puis 10, puis 12 : 30 + 12 = 42.',
    prod: 'Rien à produire.'
  },
  {
    j: 10, univers: 'quiz', titre: 'Le plateau', type: 'qcm', bonne: 2,
    intro: 'Une question sur notre propre plateau de jeu télé.',
    visuel: 'photo', photo: { src: '/img/quiz/salle-quiz-buzzers-premier-plan-768w.jpg', alt: 'Les pupitres du plateau Buzz Your Brain' },
    question: 'Combien de candidats peuvent jouer en même temps, au maximum, sur le plateau de Buzz Your Brain ?',
    choix: ['8', '12', '16', '20'],
    explication: 'De 4 à 16 candidats par émission, répartis sur 8 pupitres.',
    prod: 'Rien à produire (photo déjà sur le site).'
  },
  {
    j: 11, univers: '80s', titre: 'Le cube', type: 'qcm', bonne: 2,
    intro: 'Sur l’étagère de la salle, un casse-tête que tout le monde a essayé de finir.',
    visuel: 'cube',
    question: 'Combien de petites faces colorées compte un Rubik’s Cube classique ?',
    choix: ['36', '48', '54', '64'],
    explication: '6 faces de 9 carrés : 6 × 9 = 54.',
    prod: 'Rien à produire. Option : photo d’un vrai Rubik’s Cube dans la salle.'
  },
  {
    j: 12, univers: 'psy', titre: 'Le mot de l’infirmière', type: 'qcm', bonne: 0,
    intro: 'Un mot est griffonné au dos d’une ordonnance. Chaque lettre a été décalée d’un cran dans l’alphabet (A est devenu B, B est devenu C…).',
    visuel: 'mot', mot: 'TPSUJF',
    question: 'Quel est le vrai mot ?',
    choix: ['SORTIE', 'SOURIS', 'SURVIE', 'SERVIR'],
    explication: 'On recule chaque lettre d’un cran : T→S, P→O, S→R, U→T, J→I, F→E. SORTIE.',
    prod: 'Rien à produire.'
  },
  {
    j: 13, univers: 'gav', titre: 'Scène de crime', type: 'qcm', bonne: 1, gros: true,
    intro: 'Voici la vraie porte de Garde à Vue. Vous avez 6 secondes pour l’observer.',
    memoire: { secondes: 6, photo: { src: '/img/escape/garde-a-vue-porte-768w.jpg', alt: 'La porte de la salle Garde à Vue, barrée de rubans jaunes' } },
    question: 'Combien de rubans jaunes barrent la porte ?',
    choix: ['3', '4', '5', '6'],
    explication: 'Quatre rubans « Crime scene » : deux qui se croisent en haut, un au milieu, un en bas.',
    prod: 'Rien à produire (photo déjà sur le site).'
  },
  {
    j: 14, univers: 'quiz', titre: 'Question de saison', type: 'qcm', bonne: 1,
    intro: 'Deuxième manche : culture de Noël.',
    question: 'Dans le poème d’origine (1823), combien de rennes tirent le traîneau du Père Noël ?',
    choix: ['6', '8', '9', '12'],
    explication: 'Huit rennes. Rudolph, le neuvième, n’a été inventé qu’en 1939.',
    prod: 'Rien à produire.'
  },
  {
    j: 15, univers: '80s', titre: 'Nom de Zeus !', type: 'qcm', bonne: 2,
    intro: 'Dans « Retour vers le futur » (1985), la DeLorean doit atteindre une vitesse précise pour voyager dans le temps.',
    question: 'Quelle est cette vitesse ?',
    choix: ['66 miles à l’heure', '77 miles à l’heure', '88 miles à l’heure', '99 miles à l’heure'],
    explication: '88 miles à l’heure, soit environ 142 km/h.',
    prod: 'Rien à produire.'
  },
  {
    j: 16, univers: 'psy', titre: 'L’horloge du couloir', type: 'qcm', bonne: 0,
    intro: 'Au bout du couloir, vous apercevez l’horloge du service… dans un miroir.',
    visuel: 'horloge',
    question: 'Quelle heure est-il vraiment ?',
    choix: ['3 h 30', '4 h 30', '8 h 30', '9 h 30'],
    explication: 'Dans un miroir, la gauche et la droite sont inversées : ce qui ressemble à 8 h 30 est en réalité 3 h 30.',
    prod: 'Rien à produire.'
  },
  {
    j: 17, univers: 'gav', titre: 'Retour de patrouille', type: 'qcm', bonne: 0,
    intro: 'Quatre agents rentrent au poste, l’un après l’autre.',
    visuel: 'liste',
    liste: ['Léa arrive avant Tom.', 'Tom arrive après Inès, mais avant Sam.', 'Inès arrive avant Léa.'],
    question: 'Qui arrive en deuxième ?',
    choix: ['Léa', 'Tom', 'Inès', 'Sam'],
    explication: 'L’ordre est : Inès, Léa, Tom, Sam.',
    prod: 'Rien à produire.'
  },
  {
    j: 18, univers: 'quiz', titre: 'Complétez !', type: 'qcm', bonne: 3,
    intro: 'Troisième manche : la phrase à compléter.',
    question: '« Noël au balcon… »',
    choix: ['Pâques au salon', 'Pâques aux bonbons', 'Pâques au charbon', 'Pâques au tison'],
    explication: '« Noël au balcon, Pâques au tison » : un hiver doux annonce un printemps froid.',
    prod: 'Rien à produire.'
  },
  {
    j: 19, univers: '80s', titre: 'Gros plan', type: 'qcm', bonne: 0,
    intro: 'Un objet de la salle Back to the 80’s, photographié de très près.',
    visuel: 'zoom', zoom: { src: '/img/escape/salle-back-to-80s-jukebox-wurlitzer-figurines-768w.jpg', taille: '260%', position: '50% 96%', alt: 'Gros plan sur des étiquettes de chansons' },
    question: 'De quel objet s’agit-il ?',
    choix: ['Le jukebox', 'La borne d’arcade', 'La cabine téléphonique', 'Le mur de cassettes'],
    explication: 'Ce sont les titres du jukebox de la salle.',
    prod: 'Rien à produire (photo déjà sur le site). À vérifier par l’équipe : le gros plan est-il assez difficile ?'
  },
  {
    j: 20, univers: 'psy', titre: 'La porte du service', type: 'code', longueur: 4, code: '4772', gros: true,
    intro: 'La dernière porte du service s’ouvre avec un code à 4 chiffres. Le médecin a laissé quatre indices.',
    visuel: 'liste',
    liste: [
      'Le dernier chiffre est le nombre minimum de joueurs pour entrer dans Psychiatric.',
      'Le premier chiffre est le double du dernier.',
      'Le deuxième et le troisième chiffre sont identiques.',
      'La somme des quatre chiffres fait 20.'
    ],
    question: 'Quel est le code ?',
    explication: 'Psychiatric se joue à partir de 2 joueurs : dernier chiffre 2, premier 4. Il reste 14 à partager en deux chiffres identiques : 7 et 7. Code : 4772.',
    prod: 'Rien à produire. Option : 15 s de vidéo d’un game master devant la porte rouge.'
  },
  {
    j: 21, univers: 'gav', titre: 'Le message en morse', type: 'qcm', bonne: 0,
    intro: 'Un détenu tape un message sur les barreaux. Écoutez-le, ou lisez-le.',
    visuel: 'morse',
    morse: { mot: 'LIBRE', table: [['B', '–···'], ['E', '·'], ['I', '··'], ['L', '·–··'], ['R', '·–·'], ['T', '–'], ['U', '··–'], ['V', '···–']] },
    audio: { genre: 'morse', mot: 'LIBRE' },
    question: 'Quel mot tape-t-il ?',
    choix: ['LIBRE', 'LIVRE', 'LITRE', 'LUTTE'],
    explication: 'L (·–··) I (··) B (–···) R (·–·) E (·) : LIBRE.',
    prod: 'Rien à produire. Option : le son vrai, tapé sur les barreaux de la cellule.'
  },
  {
    j: 22, univers: 'quiz', titre: 'La question du champion', type: 'qcm', bonne: 1,
    intro: 'Dernière manche avant la finale.',
    question: 'Lequel de ces jeux télévisés français est le plus ancien ?',
    choix: ['Questions pour un champion', 'Des chiffres et des lettres', 'Motus', 'Qui veut gagner des millions ?'],
    explication: '« Des chiffres et des lettres » est né en 1965 (sous le nom « Le mot le plus long »), bien avant les trois autres.',
    prod: 'Rien à produire.'
  },
  {
    j: 23, univers: '80s', titre: 'La bonne pièce', type: 'qcm', bonne: 1,
    intro: 'Tetris est né en 1984. Toutes ses pièces ont un point commun.',
    visuel: 'tetris',
    question: 'De combien de carrés chaque pièce de Tetris est-elle faite ?',
    choix: ['3', '4', '5', '6'],
    explication: 'Quatre carrés : c’est pour cela qu’on les appelle des « tétrominos ».',
    prod: 'Rien à produire.'
  },
  {
    j: 24, univers: 'final', titre: 'La dernière porte', type: 'code', longueur: 2, code: '77', gros: true,
    intro: 'La 24ᵉ porte est fermée par un cadenas à 2 chiffres. Les trois nombres qu’il vous faut sont sur notre site.',
    visuel: 'liste',
    liste: [
      'Prenez le numéro de notre rue (41 bis rue Pasteur, à Mondeville).',
      'Retirez le nombre de portes de ce calendrier.',
      'Ajoutez la durée d’une partie, en minutes.'
    ],
    question: 'Quel est le code ?',
    explication: '41 − 24 + 60 = 77.',
    prod: 'Rien à produire. Option : vidéo de toute l’équipe qui ouvre la porte et souhaite de bonnes fêtes (pour le résultat du 25).'
  }
];
