#!/usr/bin/env node
// Génère les 11 pages /post/<slug>/index.html à partir des articles migrés
// du site Brain (rebrand "Brain Escape Game" → "GAMEDOOR·41" au passage).
// Crée aussi /magazine/index.html (liste) et alimente le netlify _redirects
// pour les anciens slugs Brain (avec accents).

import fs from 'node:fs';
import path from 'node:path';

// =============================================================================
// Articles (11) — slugs propres sans accents + ancien slug Brain pour redirect
// =============================================================================
const articles = [
  {
    slug: 'escape-game-caen-guide-complet-2026',
    legacy: 'escape-game-à-caen-guide-complet-2026-salles-tarifs-conseils-pour-réussir',
    category: 'Guide',
    categoryClass: 'escape',
    title: 'Escape Game à Caen — Guide complet 2026',
    excerpt: "Le guide pour choisir votre escape game à Caen : 3 thèmes, conseils pour réussir et tarifs 2026 — adapté aux familles, étudiants, couples et entreprises.",
    date: '2026-02-03',
    dateLabel: '3 février 2026',
    readTime: '6 min',
    heroImg: 'salle-garde-a-vue-cellule-hero',
    heroAlt: "Cellule de la salle Garde à Vue — escape game GAMEDOOR·41 Caen",
    body: `
<h2>Qu'est-ce qu'un escape game et pourquoi en faire un à Caen&nbsp;?</h2>
<p>Un escape game est une expérience immersive où une équipe de 2 à 6 joueur·euse·s doit résoudre des énigmes pour s'échapper d'une salle thématique en 60 minutes. Réflexion, observation, communication et esprit d'équipe sont les clés de la réussite.</p>
<p>Caen offre l'environnement parfait pour vivre cette aventure : à <a href="/contact/">5&nbsp;minutes du centre-ville</a>, GAMEDOOR·41 propose 3 univers immersifs et un game master <em>acteur dans la salle</em> — pas derrière un écran.</p>

<h2>Pour quelles occasions venir&nbsp;?</h2>
<ul>
  <li><strong>Sortie entre ami·e·s</strong> — convivialité et challenge mutuel</li>
  <li><strong>Activité en famille</strong> — expérience intergénérationnelle</li>
  <li><strong>Team building d'entreprise</strong> — voir notre <a href="/team-building-caen/">offre dédiée</a></li>
  <li><strong>EVJF / EVG</strong> — célébration de futur mariage avec code <code>MARIAGE</code></li>
  <li><strong>Anniversaire</strong> — cadeau expérientiel mémorable</li>
</ul>

<h2>Les 3 escape games disponibles chez GAMEDOOR·41</h2>

<h3><a href="/escape-game-caen/psychiatric/">Psychiatric</a> — l'horreur psychologique</h3>
<p>Hôpital St-Brain abandonné, 2 chambres identiques (jusqu'à 12 en duel), niveau ajustable, dès 12 ans. Non gore mais intense. Notre salle la plus iconique avec 26&nbsp;000+ joueur·euse·s depuis 2017.</p>

<h3><a href="/escape-game-caen/garde-a-vue/">Garde à Vue</a> — l'enquête policière</h3>
<p>Le second volet de l'aventure Benjamin Nari. Salle d'action orientée communication et travail d'équipe, deux niveaux de difficulté.</p>

<h3><a href="/escape-game-caen/back-to-the-80s/">Back to the 80's</a> — le voyage rétro</h3>
<p>Expérience fun et familiale, accessible dès 7 ans accompagné, deux niveaux de difficulté. Idéale pour les anniversaires d'enfants.</p>

<h2>Comment choisir votre salle&nbsp;?</h2>
<h3>Selon votre groupe</h3>
<ul>
  <li><strong>Famille avec enfants</strong> → Back to the 80's (dès 7 ans)</li>
  <li><strong>Ami·e·s débutant·e·s</strong> → Garde à Vue ou Back to the 80's</li>
  <li><strong>Joueur·euse·s expérimenté·e·s</strong> → Psychiatric niveau 2</li>
  <li><strong>Grands groupes (8 à 12)</strong> → Psychiatric en duel sur 2 chambres</li>
</ul>

<h3>Selon vos préférences</h3>
<ul>
  <li><strong>Frissons et tension psychologique</strong> → Psychiatric</li>
  <li><strong>Aventure légère et fun</strong> → Back to the 80's</li>
  <li><strong>Réflexion et stratégie</strong> → Garde à Vue</li>
</ul>

<h2>Conseils pour réussir votre escape game</h2>
<h3>Avant la partie</h3>
<p>Arrivez 5 minutes avant, écoutez le briefing attentivement, évitez les recherches en ligne sur le scénario (gâchage assuré). Venez reposé·e et concentré·e.</p>

<h3>Erreurs fréquentes à éviter</h3>
<ul>
  <li>Ne pas forcer les mécanismes physiques (rien à casser)</li>
  <li>Ne pas se disperser en début de partie (briefing prioritaire)</li>
  <li>Partager <em>tous</em> les indices découverts à voix haute</li>
  <li>Demander de l'aide au game master quand on bloque +5 min</li>
</ul>

<h2>Tarifs 2026</h2>
<p>De 25 à 35€ par joueur selon la taille du groupe. Tarif dégressif&nbsp;: 35€/pers à 2, 30€ à 3, 28€ à 4, 26€ à 5, 25€ à 6. <a href="/tarifs/">Voir tous les tarifs.</a></p>
`,
  },
  {
    slug: 'escape-game-caen-tarif-etudiant',
    legacy: 'escape-game-à-caen-brain-étudiant-e-le-tarif-étudiant-e-que-vous-cherchiez',
    category: 'Bon plan',
    categoryClass: 'escape',
    title: 'GAMEDOOR·41 Étudiant — 10% de réduction sur tous les escape games',
    excerpt: "Étudiant·e à Caen ? Profitez de 10% de réduction sur tous nos escape games, 7j/7. Une sortie sans écrans, intensive et conviviale, dès 2 joueur·euse·s.",
    date: '2026-03-24',
    dateLabel: '24 mars 2026',
    readTime: '2 min',
    heroImg: 'asset-psychiatric-rorschach',
    heroAlt: "Test de Rorschach — GAMEDOOR·41 Caen",
    body: `
<h2>Pourquoi l'escape game, c'est <em>la</em> sortie étudiante idéale</h2>
<p>Sortie sans écrans, intensive et conviviale. Vous créez des souvenirs en groupe sans consommation obligatoire. Accessible dès 2 joueur·euse·s, idéal pour 4 à 6 — parfait pour les sorties de promotion ou les colocations.</p>

<h2>L'offre GAMEDOOR·41 Étudiant·e</h2>
<p><strong>10% de réduction</strong> sur la place (par étudiant·e) sur toutes nos salles escape game, <strong>7 jours sur 7</strong>. Réservation en ligne, présentation de la carte étudiante physique le jour de la session.</p>

<h2>Les 3 salles disponibles</h2>
<ul>
  <li><strong><a href="/escape-game-caen/garde-a-vue/">Garde à Vue</a></strong> — Évasion intensifiée, ambiance sombre et adrénaline</li>
  <li><strong><a href="/escape-game-caen/psychiatric/">Psychiatric</a></strong> — Frisson + réflexion pour amateur·rice·s de sensations</li>
  <li><strong><a href="/escape-game-caen/back-to-the-80s/">Back to the 80's</a></strong> — Expérience familiale et ludique dès 7 ans</li>
</ul>

<h2>FAQ</h2>
<h3>L'offre est-elle valable 7j/7&nbsp;?</h3>
<p>Oui, sans restriction de jour ni de créneau.</p>
<h3>De combien de joueur·euse·s ai-je besoin&nbsp;?</h3>
<p>De 2 à 6 par salle. Vous pouvez venir à 2 sans problème.</p>
<h3>Et si je débute&nbsp;?</h3>
<p>Toutes nos salles ont un niveau ajustable. Le game master adapte aux débutant·e·s.</p>
<h3>L'offre s'applique au quiz Buzz Your Brain&nbsp;?</h3>
<p>Non, uniquement aux escape games. Pour le quiz, voir nos <a href="/tarifs/">tarifs réguliers</a>.</p>
<h3>Quel justificatif&nbsp;?</h3>
<p>Carte étudiante physique le jour de la session.</p>
`,
  },
  {
    slug: 'evjf-evg-caen-quiz-buzz-your-brain',
    legacy: 'evjf-evg-à-caen-vivez-une-expérience-quiz-game-inoubliable-avec-buzz-your-brain',
    category: 'EVJF / EVG',
    categoryClass: 'quiz',
    title: 'EVJF & EVG à Caen — Vivez le Quiz Buzz Your Brain',
    excerpt: "Pour fêter un mariage à Caen : un jeu télévisé grandeur nature avec 8 pupitres et buzzers, émission spéciale mariage personnalisée, code promo MARIAGE.",
    date: '2026-02-03',
    dateLabel: '3 février 2026',
    readTime: '3 min',
    heroImg: 'salle-quiz-buzz-your-brain-vue-large',
    heroFolder: 'quiz',
    heroAlt: "Plateau du quiz Buzz Your Brain — GAMEDOOR·41 Caen",
    body: `
<h2>Buzz Your Brain — le concept qui change tout</h2>
<p>GAMEDOOR·41 propose un jeu télévisé grandeur nature avec <strong>8 pupitres</strong>, des buzzers et un plateau TV professionnel. Pour des groupes de 4 à 16 participant·e·s, parfait pour les enterrements de vie de jeune fille ou de garçon.</p>
<p>Notre <strong>émission spéciale mariage</strong> est personnalisée et met en vedette le futur couple avec questions et défis humoristiques préparés sur mesure.</p>

<h2>Le 9 février — Journée internationale du mariage</h2>
<p>Une date idéale pour célébrer l'amour et l'amitié. À Caen, l'occasion parfaite pour proposer une activité mémorable au groupe.</p>

<h2>Comment réserver votre session EVJF / EVG</h2>
<ol>
  <li>Accédez à la <a href="https://braincaen.4escape.io/booking" target="_blank" rel="noopener">réservation en ligne</a></li>
  <li>Sélectionnez <strong>Quiz Game : Buzz Your Brain</strong></li>
  <li>Choisissez l'émission <strong>Spéciale Mariage</strong></li>
  <li>Entrez le code promo <code>MARIAGE</code></li>
  <li>Validez votre réservation</li>
</ol>

<h2>Informations clés</h2>
<ul>
  <li><strong>Lieu</strong> : Caen — Mondeville, 41&nbsp;bis rue Pasteur</li>
  <li><strong>Capacité</strong> : 4 à 16 participant·e·s</li>
  <li><strong>Tarif</strong> : dès 15€ par candidat·e</li>
  <li><strong>Distinction</strong> : Top 10&nbsp;% TripAdvisor mondial</li>
</ul>

<p>Voir aussi notre <a href="/post/organiser-evjf-evg-inoubliable-caen/">guide pour organiser un EVJF/EVG inoubliable à Caen</a>.</p>
`,
  },
  {
    slug: 'quiz-game-noel-caen-buzz-your-brain',
    legacy: 'quiz-game-noël-caen-buzz-your-brain-activité-spécial-fêtes-b-r-a-i-n',
    category: 'Saison',
    categoryClass: 'quiz',
    title: 'Quiz Game Noël à Caen — Buzz Your Brain spécial fêtes',
    excerpt: "Une version festive du Quiz Buzz Your Brain pendant les fêtes : thème Noël, questions revisitées, 4 à 16 joueurs. 100% fêtes, 0% prise de tête.",
    date: '2025-12-08',
    dateLabel: '8 décembre 2025',
    readTime: '2 min',
    heroImg: 'salle-quiz-couloir-vue-ensemble',
    heroFolder: 'quiz',
    heroAlt: "Couloir de la salle Quiz — GAMEDOOR·41 Caen",
    body: `
<h2>Une version festive du Quiz Game</h2>
<p>GAMEDOOR·41 propose chaque année une version Noël de son Quiz Game pendant les fêtes. <em>Thème spécial Noël</em>, questions revisitées façon fêtes, ambiance 100&nbsp;% fêtes, 0&nbsp;% prise de tête.</p>

<h2>Pour qui&nbsp;?</h2>
<ul>
  <li>Sorties en famille</li>
  <li>Groupes d'ami·e·s</li>
  <li>Pots de fin d'année (entreprise, CSE, équipes)</li>
  <li>Activités indoor en hiver, à l'abri</li>
</ul>
<p><strong>Accessibilité</strong> : à partir de 8-10 ans.</p>

<h2>Fonctionnement</h2>
<ul>
  <li><strong>Durée</strong> : 1 heure</li>
  <li><strong>Groupe</strong> : 4 à 16 joueur·euse·s</li>
  <li><strong>Lieu</strong> : GAMEDOOR·41, Mondeville — Caen</li>
  <li><strong>Tarif</strong> : dès 15€ par candidat·e</li>
</ul>

<h2>FAQ</h2>
<h3>Quand le thème Noël est-il dispo&nbsp;?</h3>
<p>De fin novembre à début janvier.</p>
<h3>C'est adapté aux enfants&nbsp;?</h3>
<p>Oui, dès 10 ans environ. L'ambiance reste familiale.</p>
<h3>Pour les entreprises&nbsp;?</h3>
<p>Oui — c'est notre format préféré pour les pots de fin d'année. <a href="/devis/">Demander un devis.</a></p>

<p><a href="https://braincaen.4escape.io/booking" target="_blank" rel="noopener" class="post-cta">Réserver une session Noël</a></p>
`,
  },
  {
    slug: 'carte-cadeau-escape-quiz-caen',
    legacy: 'carte-cadeau-escape-game-quiz-game-caen',
    category: 'Carte cadeau',
    categoryClass: 'events',
    title: 'Carte cadeau Escape Game & Quiz Game à Caen',
    excerpt: "60 minutes de déconnexion à offrir : escape game ou quiz, version numérique (instantanée) ou coffret mystère. Validité illimitée, sans date limite.",
    date: '2025-12-07',
    dateLabel: '7 décembre 2025',
    readTime: '3 min',
    heroImg: 'salle-quiz-perspective-rasante',
    heroFolder: 'quiz',
    heroAlt: "Plateau du quiz GAMEDOOR·41 Caen — carte cadeau",
    body: `
<h2>Pourquoi offrir une carte cadeau GAMEDOOR·41&nbsp;?</h2>
<p>60 minutes de déconnexion totale, à rire ensemble dans 3 univers immersifs&nbsp;: <a href="/escape-game-caen/psychiatric/">Psychiatric</a> (horreur), <a href="/escape-game-caen/garde-a-vue/">Garde à Vue</a> (évasion) et <a href="/escape-game-caen/back-to-the-80s/">Back to the 80's</a> (années 80, accessible en famille dès 7 ans).</p>

<h3>Tarifs Escape Game</h3>
<table>
  <tr><th>Joueur·euse·s</th><th>Prix total</th></tr>
  <tr><td>2 joueurs</td><td>74€</td></tr>
  <tr><td>3 joueurs</td><td>84€</td></tr>
  <tr><td>4 joueurs</td><td>100€</td></tr>
  <tr><td>5 joueurs</td><td>120€</td></tr>
  <tr><td>6 joueurs</td><td>144€</td></tr>
</table>

<h2>La carte cadeau Quiz Game Buzz Your Brain</h2>
<p>De 4 à 16 participant·e·s sur un plateau TV avec 8 pupitres et buzzers. Idéal pour anniversaires, EVJF/EVG, événements collègues.</p>

<h3>Tarifs Quiz Game</h3>
<table>
  <tr><th>Candidat·e·s</th><th>Prix total</th></tr>
  <tr><td>4 candidats</td><td>84€</td></tr>
  <tr><td>6 candidats</td><td>126€</td></tr>
  <tr><td>8 candidats</td><td>144€</td></tr>
  <tr><td>10 candidats</td><td>170€</td></tr>
  <tr><td>12 candidats</td><td>192€</td></tr>
  <tr><td>16 candidats</td><td>240€</td></tr>
</table>

<h2>Numérique ou coffret mystère</h2>
<table>
  <tr><th></th><th>Numérique</th><th>Coffret mystère (+10€)</th></tr>
  <tr><td>Livraison</td><td>Instantanée par email</td><td>Retrait à Mondeville</td></tr>
  <tr><td>Présentation</td><td>Code à imprimer ou transférer</td><td>Boîte intrigante</td></tr>
  <tr><td>Idéal pour</td><td>Dernière minute</td><td>Effet "waouh"</td></tr>
  <tr><td>Écologie</td><td>Zéro emballage</td><td>Packaging réutilisable</td></tr>
</table>

<h2>Comment l'utiliser</h2>
<ol>
  <li>Achetez en ligne</li>
  <li>Recevez le code unique par email</li>
  <li>Réservez votre créneau au moment qui vous convient</li>
  <li>Vivez l'expérience à Mondeville</li>
</ol>
<p><strong>Validité</strong> : sans date limite à compter de la date d'achat.</p>

<h2>Questions fréquentes</h2>
<h3>Validité&nbsp;?</h3>
<p>Aucune limite temporelle.</p>
<h3>Pour un groupe&nbsp;?</h3>
<p>Oui — cartes pour 2-6 joueurs (escape) ou 4-16 (quiz), ou montant libre (15€-200€).</p>
<h3>Localisation&nbsp;?</h3>
<p>Mondeville, 5 minutes du centre-ville de Caen, parking gratuit.</p>
<h3>Remboursable&nbsp;?</h3>
<p>Non, mais transférable et cumulable.</p>

<p><a href="/cadeau/" class="post-cta">Acheter une carte cadeau →</a></p>
`,
  },
  {
    slug: 'organiser-evjf-evg-inoubliable-caen',
    legacy: 'organisez-un-evjf-evg-inoubliable-à-caen-avec-brain-escape-quiz-game',
    category: 'EVJF / EVG',
    categoryClass: 'events',
    title: 'Organisez un EVJF/EVG inoubliable à Caen avec GAMEDOOR·41',
    excerpt: "L'organisation d'un EVJF ou EVG peut vite tourner au casse-tête. Découvrez nos 3 escape games + Buzz Your Brain pour une journée 100% mémorable.",
    date: '2025-02-18',
    dateLabel: '18 février 2025',
    readTime: '3 min',
    heroImg: 'psychiatric-couloir',
    heroAlt: "Couloir psychiatrique — escape game GAMEDOOR·41 Caen pour EVJF/EVG",
    body: `
<h2>Pourquoi GAMEDOOR·41 pour un EVJF / EVG&nbsp;?</h2>
<ul>
  <li><strong>Expériences variées</strong> — escape game ou quiz interactif</li>
  <li><strong>Scénarios immersifs</strong> — voyages temporels, évasions, frissons</li>
  <li><strong>Offre spéciale mariage</strong> — place gratuite pour le/la futur·e marié·e + code promo <code>MARIAGE</code></li>
  <li><strong>Localisation accessible</strong> — Caen-Mondeville, parking gratuit</li>
</ul>

<h2>Les 4 activités proposées</h2>

<h3>1. Escape Game <a href="/escape-game-caen/psychiatric/">Psychiatric</a> 😱</h3>
<p>Plongez dans un hôpital psychiatrique abandonné pour résoudre énigmes et vous échapper. Version duelle disponible pour affronter une autre équipe sur 2 chambres identiques (jusqu'à 12 personnes en simultané).</p>

<h3>2. Escape Game <a href="/escape-game-caen/garde-a-vue/">Garde à Vue</a> 🏛️</h3>
<p>Mission d'évasion d'une cellule de garde à vue ultra-sécurisée en mode course contre-la-montre. Deux niveaux de difficulté, mode duel possible.</p>

<h3>3. Escape Game <a href="/escape-game-caen/back-to-the-80s/">Back to the 80's</a> 🎶</h3>
<p>Retrouvez la disquette cachée dans un décor réaliste des années 80. Accessible à tous, fous rires garantis.</p>

<h3>4. Quiz Game <a href="/quiz-game-caen/">Buzz Your Brain</a> 🎤</h3>
<p>Affrontez-vous comme dans un véritable jeu télévisé avec buzzers, blind tests et défis loufoques. Activité ludique pour tous niveaux, jusqu'à 16 participant·e·s.</p>

<h2>Conseils d'organisation</h2>
<ul>
  <li><strong>Anticipez</strong> les réservations — créneaux EVJF/EVG très demandés en saison</li>
  <li><strong>Utilisez le code promo</strong> <code>MARIAGE</code></li>
  <li><strong>Ajoutez déguisements et défis surprises</strong> pour une journée unique</li>
</ul>

<p><a href="https://braincaen.4escape.io/booking" target="_blank" rel="noopener" class="post-cta">Réserver votre EVJF / EVG</a></p>
`,
  },
  {
    slug: 'buzz-your-brain-jeu-televise-realiste-caen',
    legacy: 'buzz-your-brain-le-jeu-télévisé-réaliste-à-caen-un-nouveau-concept-complètement-déjanté',
    category: 'Quiz',
    categoryClass: 'quiz',
    title: 'Buzz Your Brain — le jeu télévisé réaliste à Caen',
    excerpt: "Un nouveau concept de loisir à Caen : un plateau TV grandeur nature, 8 pupitres, buzzers, blind tests et quiz vidéos. Pour tous, sans culture générale requise.",
    date: '2024-09-09',
    dateLabel: '9 septembre 2024',
    readTime: '4 min',
    heroImg: 'salle-quiz-buzz-your-brain-vue-large',
    heroFolder: 'quiz',
    heroAlt: "Plateau TV de Buzz Your Brain — GAMEDOOR·41 Caen",
    body: `
<h2>Qu'est-ce que Buzz Your Brain&nbsp;?</h2>
<p>Buzz Your Brain est un nouveau concept de loisir à Caen — une expérience immersive inspirée des émissions télévisées populaires. Quiz musicaux, blind tests et quiz vidéos dans un décor de plateau télé réaliste.</p>
<ul>
  <li><strong>Capacité</strong> : jusqu'à 16 personnes</li>
  <li><strong>Fonctionnement</strong> : 7 jours sur 7</li>
  <li><strong>Tarif</strong> : dès 15€ par candidat·e</li>
</ul>

<h2>Pourquoi choisir Buzz Your Brain&nbsp;?</h2>

<h3>Immersion totale</h3>
<p>L'établissement reproduit l'ambiance d'un véritable plateau télé avec décors rappelant les émissions populaires (rythme rapide, animateur·rice, buzzers).</p>

<h3>Accessibilité</h3>
<p>Pas besoin d'être un·e expert·e en culture générale — les questions sont conçues pour être <em>accessibles à tous</em>, garantissant une participation complète du groupe.</p>

<h3>Diversité des épreuves</h3>
<ul>
  <li>Quiz musicaux</li>
  <li>Blind tests endiablés</li>
  <li>Quiz vidéos</li>
  <li>Épreuves déjantées privilégiant le fun et la rapidité</li>
</ul>

<h3>Activité intérieure</h3>
<p>Solution idéale pour les loisirs indoor, indépendante des conditions météorologiques. Parfait pour la saison froide.</p>

<h2>Informations pratiques</h2>
<ul>
  <li><strong>Localisation</strong> : Mondeville, à 5 min de Caen centre</li>
  <li><strong>Parking</strong> : privé, gratuit, nombreuses places</li>
  <li><strong>Public</strong> : anniversaires, team buildings, EVJF/EVG, sorties entre ami·e·s</li>
  <li><strong>Réservation</strong> : <a href="https://braincaen.4escape.io/booking" target="_blank" rel="noopener">en ligne, 7j/7</a></li>
</ul>
`,
  },
  {
    slug: 'escape-game-horreur-psychiatric-caen',
    legacy: 'plongez-dans-l-horreur-avec-notre-escape-game-psychiatric-à-caen',
    category: 'Psychiatric',
    categoryClass: 'escape',
    title: "Plongez dans l'horreur — Escape Game Psychiatric à Caen",
    excerpt: "Un hôpital psychiatrique abandonné, 60 minutes pour comprendre ce qui s'y est passé. 2 chambres identiques (jusqu'à 12 en duel), niveau ajustable.",
    date: '2024-09-08',
    dateLabel: '8 septembre 2024',
    readTime: '2 min',
    heroImg: 'psychiatric-porte-sang',
    heroAlt: "Porte ensanglantée — escape game horreur Psychiatric GAMEDOOR·41 Caen",
    body: `
<h2>Un scénario sombre et immersif</h2>
<p>Vous pénétrez dans un hôpital psychiatrique abandonné où vous devez <em>découvrir ce qui se cache derrière ces mystères tout en trouvant la sortie</em>. L'immersion commence dès l'arrivée, avec des décors authentiques et une atmosphère angoissante qui renforcent l'expérience horrifique.</p>

<h2>Deux niveaux de difficulté pour un maximum de frissons</h2>
<p>La salle <a href="/escape-game-caen/psychiatric/">Psychiatric</a> offre deux niveaux de complexité, bien que la sensibilité à la peur constitue le véritable défi. Conseils&nbsp;: rester calme, communiquer en équipe, demander de l'aide au game master si besoin.</p>

<h2>Jouez en équipe ou faites une battle</h2>
<p><strong>Capacité</strong> : 2 à 6 joueur·euse·s par chambre, jusqu'à 12 en mode compétition. Idéal pour les groupes importants qui veulent s'affronter dans deux chambres identiques.</p>

<h2>Infos pratiques</h2>
<ul>
  <li><strong>Lieu</strong> : Mondeville, 41&nbsp;bis rue Pasteur (près de Caen)</li>
  <li><strong>Joueur·euse·s</strong> : 2-6 par chambre, 12 max en battle</li>
  <li><strong>Thème</strong> : hôpital psychiatrique, ambiance intense, non gore</li>
  <li><strong>Âge minimum</strong> : 12 ans (accompagnement obligatoire)</li>
  <li><strong>Tarif</strong> : dès 25€ par joueur·euse</li>
</ul>

<p><a href="/escape-game-caen/psychiatric/" class="post-cta">Découvrir Psychiatric</a></p>
`,
  },
  {
    slug: 'escape-game-a-deux-astuces-avantages',
    legacy: 'escape-game-à-deux-astuces-et-avantages-pour-une-expérience-unique',
    category: 'Conseils',
    categoryClass: 'escape',
    title: 'Escape game à deux — astuces et avantages pour une expérience unique',
    excerpt: "Jouer à 2 dans un escape game ? Plus de complicité, plus d'immersion, plus de challenge. Astuces et choix de salle pour réussir votre duo.",
    date: '2024-09-07',
    dateLabel: '7 septembre 2024',
    readTime: '3 min',
    heroImg: 'salle-garde-a-vue-cellule-banc-toilettes',
    heroAlt: "Cellule en duo — escape game Garde à Vue GAMEDOOR·41 Caen",
    body: `
<h2>Les avantages de jouer à deux</h2>
<ol>
  <li><strong>Complicité renforcée</strong> — jouer à deux permet une meilleure communication et une plus grande fluidité dans la résolution des énigmes.</li>
  <li><strong>Immersion totale</strong> — avec moins de participant·e·s, l'atmosphère devient plus captivante et concentrée.</li>
  <li><strong>Challenge intensifié</strong> — contrairement aux groupes plus grands, en duo, vous devez tout gérer à deux.</li>
</ol>

<h2>Astuces pour réussir un escape game à deux</h2>
<ul>
  <li><strong>Communication efficace</strong> — partager toutes les observations, même celles qui semblent insignifiantes</li>
  <li><strong>Répartition intelligente</strong> — exploiter les forces de chaque joueur (un·e fouille, l'autre assemble)</li>
  <li><strong>Gestion du temps</strong> — éviter de rester bloqué·e trop longtemps sur la même énigme, demander un indice</li>
</ul>

<h2>Différences avec les groupes plus nombreux</h2>
<ul>
  <li>Moins de pression interpersonnelle</li>
  <li>Participation active constante de chaque joueur·euse</li>
  <li>Énigmes spécialement adaptées pour les duos en choisissant le niveau&nbsp;1</li>
</ul>

<h2>Salles disponibles à GAMEDOOR·41</h2>
<ol>
  <li><strong><a href="/escape-game-caen/back-to-the-80s/">Back to the 80's</a></strong> — décor rétro avec énigmes logiques et d'observation</li>
  <li><strong><a href="/escape-game-caen/garde-a-vue/">Garde à Vue</a></strong> — défis stratégiques et réflexion</li>
  <li><strong><a href="/escape-game-caen/psychiatric/">Psychiatric</a></strong> — aventure intense dans un univers sombre et psychologique</li>
</ol>

<p>Pour un duo de débutant·e·s, on recommande Back to the 80's en niveau&nbsp;1. Pour un duo de joueur·euse·s expérimenté·e·s qui veulent un vrai challenge, Psychiatric en niveau&nbsp;2.</p>
`,
  },
  {
    slug: 'team-building-reussi-caen-escape-game',
    legacy: 'organiser-un-team-building-réussi-à-caen-avec-un-escape-game',
    category: 'Team building',
    categoryClass: 'events',
    title: 'Organiser un team building réussi à Caen avec un escape game',
    excerpt: "L'escape game renforce la cohésion d'équipe. Découvrez nos 3 salles thématiques, services de privatisation et options sur mesure pour entreprises.",
    date: '2024-09-06',
    dateLabel: '6 septembre 2024',
    readTime: '2 min',
    heroImg: 'salle-garde-a-vue-barreaux-poste-garde',
    heroAlt: "Vue à travers les barreaux — escape game team building Caen",
    body: `
<h2>Pourquoi un escape game pour votre team building&nbsp;?</h2>
<p>Un escape game est bien plus qu'un simple divertissement. C'est une <em>expérience immersive qui encourage la communication et la collaboration</em>. Les principaux bénéfices&nbsp;:</p>
<ul>
  <li><strong>Renforcement des liens</strong> — les collaborateurs travaillent ensemble pour progresser, l'entraide est obligatoire</li>
  <li><strong>Stimulation de la créativité</strong> — les énigmes demandent réflexion et esprit critique</li>
  <li><strong>Atmosphère ludique</strong> — un cadre détente tout en consolidant la cohésion</li>
</ul>

<h2>Les salles thématiques pour votre team building</h2>

<h3>1. <a href="/escape-game-caen/psychiatric/">Psychiatric</a></h3>
<p>Hôpital psychiatrique mystérieux. Les équipes doivent résoudre des énigmes en gardant leur sang-froid. Idéale pour ambiances angoissantes et suspense, niveau ajustable.</p>

<h3>2. <a href="/escape-game-caen/garde-a-vue/">Garde à Vue</a></h3>
<p>Les collaborateur·rice·s doivent élaborer une stratégie d'évasion. Teste l'esprit de coopération et la planification.</p>

<h3>3. <a href="/escape-game-caen/back-to-the-80s/">Back to the 80's</a></h3>
<p>Voyage nostalgique dans les années 80 avec énigmes mettant au défi la réflexion et la créativité. Format plus léger, idéal pour les équipes mixtes.</p>

<h2>Services sur mesure pour votre événement</h2>
<ul>
  <li><strong>Privatisation des salles</strong> — expérience exclusive sans distractions</li>
  <li><strong>Service traiteur</strong> — petits déjeuners et apéritifs d'artisans locaux</li>
  <li><strong>Parking privé gratuit</strong> — accès facile et sécurisé</li>
  <li><strong>Multisalles simultanées</strong> — jusqu'à 18 collaborateurs en parallèle, jusqu'à 46 en privatisation totale</li>
</ul>

<h2>Ils nous font déjà confiance</h2>
<p>IKEA, Renault Trucks, Crédit Agricole Normandie, CE Capgemini, Castorama, Mairie d'Hérouville-Saint-Clair, Village by CA Normandie, Flers Agglo… Voir notre <a href="/references-entreprises-caen/">page références entreprises</a>.</p>

<p><a href="/devis/" class="post-cta">Demande de devis rapide</a></p>
`,
  },
  {
    slug: 'escape-game-back-to-80s-famille-caen',
    legacy: 'plongez-en-famille-dans-notre-escape-game-back-to-the-80-s-à-caen',
    category: 'Famille',
    categoryClass: 'escape',
    title: "Escape game en famille : Back to the 80's à Caen",
    excerpt: "Un voyage rétro dans les années 80, accessible dès 7 ans accompagné. La salle la mieux notée de Caen pour les anniversaires d'enfants et sorties famille.",
    date: '2024-09-05',
    dateLabel: '5 septembre 2024',
    readTime: '2 min',
    heroImg: 'salle-back-to-80s-borne-arcade-pacman',
    heroAlt: "Borne d'arcade Pac-Man — escape game Back to the 80's GAMEDOOR·41 Caen",
    body: `
<h2>Immersion totale dans les années 80</h2>
<p><a href="/escape-game-caen/back-to-the-80s/">Back to the 80's</a> propose une expérience complète plongée dans l'univers rétro&nbsp;: décors soignés, couleurs flashy, musique d'époque. Les énigmes sont adaptées aux plus jeunes tout en restant stimulantes pour les adultes.</p>

<h2>Interactivité et scénario captivant</h2>
<p>Un game master accompagne les participant·e·s tout au long de l'aventure, dose ses interventions pour guider sans frustrer. Le scénario mêle rebondissements et énigmes progressives, conçu pour captiver dès les premières minutes.</p>

<h2>Un escape game pour tous à Caen</h2>
<p>La salle se distingue par son accessibilité familiale. L'expérience convient aux <strong>anniversaires d'enfants</strong> et aux <strong>groupes amicaux</strong>, avec des créneaux qui se remplissent vite — pensez à anticiper.</p>

<h3>Pour qui&nbsp;?</h3>
<ul>
  <li>Familles avec enfants <strong>dès 7 ans</strong> (accompagné·e·s)</li>
  <li>Groupes d'ami·e·s qui veulent du fun léger</li>
  <li>Anniversaires d'enfants (8-14 ans)</li>
  <li>Couples qui débutent en escape game</li>
</ul>

<h2>Infos pratiques</h2>
<ul>
  <li><strong>Lieu</strong> : Mondeville, 41&nbsp;bis rue Pasteur</li>
  <li><strong>Joueur·euse·s</strong> : 2 à 6</li>
  <li><strong>Tarif</strong> : dès 25€/pers</li>
  <li><strong>Niveau</strong> : 1 ou 2 (ajustable)</li>
</ul>

<p><a href="/escape-game-caen/back-to-the-80s/" class="post-cta">Découvrir Back to the 80's</a></p>
`,
  },
];

// =============================================================================
// Template HTML article
// =============================================================================
function articleHtml(article) {
  const folder = article.heroFolder || 'escape';
  const url = `https://gamedoor41.fr/post/${article.slug}/`;
  const ogImg = `https://gamedoor41.fr/img/${folder}/${article.heroImg}-1024w.jpg`;
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${article.title} | GAMEDOOR·41</title>
  <meta name="description" content="${article.excerpt}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <link rel="canonical" href="${url}">

  <meta property="og:type" content="article">
  <meta property="og:locale" content="fr_FR">
  <meta property="og:url" content="${url}">
  <meta property="og:title" content="${article.title}">
  <meta property="og:description" content="${article.excerpt}">
  <meta property="og:image" content="${ogImg}">
  <meta property="og:site_name" content="GAMEDOOR·41">
  <meta property="article:published_time" content="${article.date}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${article.title}">
  <meta name="twitter:description" content="${article.excerpt}">
  <meta name="twitter:image" content="${ogImg}">

  <link rel="icon" type="image/svg+xml" href="/img/logo/favicon.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;500;600;700;800;900&family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/home-v33.css">
  <link rel="stylesheet" href="/css/post.css">

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {"@type": "ListItem", "position": 1, "name": "GAMEDOOR·41", "item": "https://gamedoor41.fr/"},
      {"@type": "ListItem", "position": 2, "name": "Magazine", "item": "https://gamedoor41.fr/magazine/"},
      {"@type": "ListItem", "position": 3, "name": "${article.title.replace(/"/g, '\\"')}", "item": "${url}"}
    ]
  }
  </script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": "${article.title.replace(/"/g, '\\"')}",
    "description": "${article.excerpt.replace(/"/g, '\\"')}",
    "image": "${ogImg}",
    "datePublished": "${article.date}",
    "dateModified": "${article.date}",
    "author": {"@type": "Organization", "name": "GAMEDOOR·41"},
    "publisher": {
      "@type": "Organization",
      "name": "GAMEDOOR·41",
      "logo": {"@type": "ImageObject", "url": "https://gamedoor41.fr/img/logo/logo-stacked.png"}
    },
    "mainEntityOfPage": "${url}"
  }
  </script>
</head>
<body>

<header class="nav" id="nav">
  <div class="container container-wide">
    <div class="nav-row">
      <a href="/" class="nav-logo">GAME<span class="door">DOOR</span><span class="num">·41</span></a>
      <nav class="nav-links" aria-label="Navigation principale">
        <a href="/escape-game-caen/" class="nav-link">Escape</a>
        <a href="/quiz-game-caen/" class="nav-link">Quiz</a>
        <a href="/team-building-caen/" class="nav-link">Events</a>
        <a href="/magazine/" class="nav-link">Magazine</a>
      </nav>
      <a href="https://braincaen.4escape.io/booking" target="_blank" rel="noopener" class="btn btn-primary nav-cta">Réserver</a>
    </div>
  </div>
</header>

<main class="post-main">
  <article class="post">
    <div class="post-hero">
      <picture>
        <source type="image/avif" srcset="/img/${folder}/${article.heroImg}-480w.avif 480w, /img/${folder}/${article.heroImg}-768w.avif 768w, /img/${folder}/${article.heroImg}-1024w.avif 1024w" sizes="100vw">
        <source type="image/webp" srcset="/img/${folder}/${article.heroImg}-480w.webp 480w, /img/${folder}/${article.heroImg}-768w.webp 768w, /img/${folder}/${article.heroImg}-1024w.webp 1024w" sizes="100vw">
        <img src="/img/${folder}/${article.heroImg}-1024w.jpg" srcset="/img/${folder}/${article.heroImg}-480w.jpg 480w, /img/${folder}/${article.heroImg}-768w.jpg 768w, /img/${folder}/${article.heroImg}-1024w.jpg 1024w" sizes="100vw" alt="${article.heroAlt}" loading="eager" decoding="async" fetchpriority="high">
      </picture>
      <div class="post-hero-overlay"></div>
    </div>

    <div class="container post-container">
      <nav class="post-breadcrumb" aria-label="Fil d'Ariane">
        <a href="/">GAMEDOOR·41</a> <span>›</span> <a href="/magazine/">Magazine</a> <span>›</span> <span>${article.category}</span>
      </nav>

      <header class="post-header">
        <span class="post-cat ${article.categoryClass}">${article.category}</span>
        <h1 class="post-title">${article.title}</h1>
        <p class="post-excerpt">${article.excerpt}</p>
        <div class="post-meta">
          <time datetime="${article.date}">${article.dateLabel}</time>
          <span class="dot">·</span>
          <span>${article.readTime} de lecture</span>
        </div>
      </header>

      <div class="post-body">
${article.body.trim()}
      </div>

      <aside class="post-cta-block">
        <h2>Envie de vivre l'expérience&nbsp;?</h2>
        <p>3 escape games, 1 quiz Buzz Your Brain, et bientôt Death Zone. À 5 minutes de Caen.</p>
        <div class="post-cta-actions">
          <a href="https://braincaen.4escape.io/booking" target="_blank" rel="noopener" class="btn btn-primary btn-arrow">Réserver maintenant</a>
          <a href="/escape-game-caen/" class="btn btn-ghost btn-arrow">Voir les salles</a>
        </div>
      </aside>
    </div>
  </article>
</main>

<footer class="footer">
  <div class="container container-wide">
    <div class="footer-row">
      <a href="/" class="footer-logo">GAME<span class="door">DOOR</span><span class="num">·41</span></a>
      <p class="footer-tagline">Escape · Quiz · Events à Caen-Mondeville depuis 2017.</p>
    </div>
    <div class="footer-cols">
      <div>
        <h4>Jeux</h4>
        <a href="/escape-game-caen/">Escape Game</a>
        <a href="/quiz-game-caen/">Quiz Buzz Your Brain</a>
      </div>
      <div>
        <h4>Events</h4>
        <a href="/team-building-caen/">Team building</a>
        <a href="/evjf-caen/">EVJF</a>
        <a href="/evg-caen/">EVG</a>
        <a href="/anniversaire-caen/">Anniversaire</a>
      </div>
      <div>
        <h4>Infos</h4>
        <a href="/tarifs/">Tarifs</a>
        <a href="/cadeau/">Carte cadeau</a>
        <a href="/contact/">Contact</a>
        <a href="/magazine/">Magazine</a>
      </div>
    </div>
    <p class="footer-legal">© 2026 GAMEDOOR·41 — 41 bis rue Pasteur, 14120 Mondeville · 02 31 53 07 51</p>
  </div>
</footer>

</body>
</html>
`;
}

// =============================================================================
// Magazine index template
// =============================================================================
function magazineIndexHtml() {
  const cards = articles
    .map((a) => {
      const folder = a.heroFolder || 'escape';
      return `      <article class="mag-card">
        <a href="/post/${a.slug}/" class="mag-card-link" aria-label="${a.title.replace(/"/g, '&quot;')}"></a>
        <div class="mag-card-img">
          <picture>
            <source type="image/avif" srcset="/img/${folder}/${a.heroImg}-480w.avif 480w, /img/${folder}/${a.heroImg}-768w.avif 768w" sizes="(max-width: 768px) 100vw, 33vw">
            <source type="image/webp" srcset="/img/${folder}/${a.heroImg}-480w.webp 480w, /img/${folder}/${a.heroImg}-768w.webp 768w" sizes="(max-width: 768px) 100vw, 33vw">
            <img src="/img/${folder}/${a.heroImg}-768w.jpg" srcset="/img/${folder}/${a.heroImg}-480w.jpg 480w, /img/${folder}/${a.heroImg}-768w.jpg 768w" sizes="(max-width: 768px) 100vw, 33vw" alt="${a.heroAlt}" loading="lazy" decoding="async">
          </picture>
        </div>
        <div class="mag-card-body">
          <span class="post-cat ${a.categoryClass}">${a.category}</span>
          <h3 class="mag-card-title">${a.title}</h3>
          <p class="mag-card-excerpt">${a.excerpt}</p>
          <div class="mag-card-meta"><time datetime="${a.date}">${a.dateLabel}</time> <span class="dot">·</span> ${a.readTime}</div>
        </div>
      </article>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Magazine — Coulisses, récits et conseils | GAMEDOOR·41</title>
  <meta name="description" content="Le magazine GAMEDOOR·41 : guides, conseils, coulisses des salles d'escape game et du quiz Buzz Your Brain à Caen.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://gamedoor41.fr/magazine/">

  <meta property="og:title" content="Magazine GAMEDOOR·41 — Coulisses, récits et conseils">
  <meta property="og:description" content="Guides, conseils, coulisses sur les salles d'escape game et le quiz Buzz Your Brain à Caen.">
  <meta property="og:url" content="https://gamedoor41.fr/magazine/">
  <meta property="og:type" content="website">
  <meta property="og:image" content="https://gamedoor41.fr/img/og/og-default.jpg">

  <link rel="icon" type="image/svg+xml" href="/img/logo/favicon.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;500;600;700;800;900&family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/home-v33.css">
  <link rel="stylesheet" href="/css/post.css">
</head>
<body>

<header class="nav" id="nav">
  <div class="container container-wide">
    <div class="nav-row">
      <a href="/" class="nav-logo">GAME<span class="door">DOOR</span><span class="num">·41</span></a>
      <nav class="nav-links" aria-label="Navigation principale">
        <a href="/escape-game-caen/" class="nav-link">Escape</a>
        <a href="/quiz-game-caen/" class="nav-link">Quiz</a>
        <a href="/team-building-caen/" class="nav-link">Events</a>
        <a href="/magazine/" class="nav-link active">Magazine</a>
      </nav>
      <a href="https://braincaen.4escape.io/booking" target="_blank" rel="noopener" class="btn btn-primary nav-cta">Réserver</a>
    </div>
  </div>
</header>

<main class="mag-main">
  <section class="mag-hero">
    <div class="container">
      <div class="eyebrow"><span>Le magazine</span></div>
      <h1 class="h-xl ds-underline">Coulisses, récits, <em>conseils.</em></h1>
      <p class="lead">Guides, retours d'expérience et trucs et astuces sur les escape games et le quiz Buzz Your Brain à Caen.</p>
    </div>
  </section>

  <section class="mag-list">
    <div class="container container-wide">
${cards}
    </div>
  </section>
</main>

<footer class="footer">
  <div class="container container-wide">
    <p class="footer-legal">© 2026 GAMEDOOR·41 — 41 bis rue Pasteur, 14120 Mondeville · 02 31 53 07 51</p>
  </div>
</footer>

</body>
</html>
`;
}

// =============================================================================
// Netlify _redirects pour les anciens slugs Brain (avec accents)
// =============================================================================
function redirectsContent() {
  const lines = articles.map(
    (a) => `/post/${a.legacy}  /post/${a.slug}/  301`,
  );
  // Ajout: catch-all bas du blog Brain (redirect /blog → /magazine)
  lines.push('/blog  /magazine/  301');
  lines.push('/blog/*  /magazine/  301');
  return lines.join('\n') + '\n';
}

// =============================================================================
// Run
// =============================================================================
let count = 0;
for (const a of articles) {
  const dir = path.join('post', a.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), articleHtml(a), 'utf8');
  console.log(`  ✓ /post/${a.slug}/`);
  count++;
}

fs.mkdirSync('magazine', { recursive: true });
fs.writeFileSync('magazine/index.html', magazineIndexHtml(), 'utf8');
console.log(`  ✓ /magazine/`);

// _redirects: append nos redirects, en préservant les éventuels existants
const redirectsPath = '_redirects';
let existing = '';
if (fs.existsSync(redirectsPath)) {
  existing = fs.readFileSync(redirectsPath, 'utf8');
  if (!existing.endsWith('\n')) existing += '\n';
}
// On retire les lignes qui matchent nos slugs (re-run safe)
const ourSlugs = new Set(articles.map((a) => a.slug));
const cleanedExisting = existing
  .split('\n')
  .filter((line) => {
    const m = line.match(/^\/post\/([^\s]+)\s/);
    if (!m) return true;
    return !ourSlugs.has(m[1]);
  })
  .join('\n');
const final = (cleanedExisting.trim() ? cleanedExisting.trim() + '\n\n' : '') +
  '# Magazine — anciens slugs Brain (accents) → nouveaux slugs Gamedoor\n' +
  redirectsContent();
fs.writeFileSync(redirectsPath, final, 'utf8');
console.log(`  ✓ _redirects`);

console.log(`\n${count} articles + magazine + _redirects générés.`);
