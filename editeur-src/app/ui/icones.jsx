// Icônes de l'éditeur (style trait, 24×24, dessinées à la main dans l'esprit Lucide)
const P = {
  plus: 'M12 5v14M5 12h14',
  calques: 'M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  pages: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h6',
  image: 'M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 15l-5-5L5 21',
  chercher: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  google: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3.6 9h16.8M3.6 15h16.8M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18',
  verifier: 'M9 12l2 2 4-4M12 22c5.5-2.5 8-6 8-11V5l-8-3-8 3v6c0 5 2.5 8.5 8 11z',
  assistant: 'M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9zM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9zM5 16l.6 1.4L7 18l-1.4.6L5 20l-.6-1.4L3 18l1.4-.6z',
  historique: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l4 2',
  annuler: 'M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11',
  retablir: 'M15 14l5-5-5-5M20 9H9.5a5.5 5.5 0 0 0 0 11H13',
  ordinateur: 'M2 4h20v12H2zM8 20h8M12 16v4',
  tablette: 'M5 2h14a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM11 18h2',
  telephone: 'M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM11 18h2',
  cote: 'M2 5h13v10H2zM6 19h5M18 7h4v12h-4z',
  oeil: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  publier: 'M12 19V5M5 12l7-7 7 7',
  fusee: 'M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2.1-.1-2.9a2.2 2.2 0 0 0-2.9-.1zM12 15l-3-3a22 22 0 0 1 2-3.9A12.9 12.9 0 0 1 22 2c0 2.7-.8 7.5-6 11a22 22 0 0 1-4 2zM9 12H4s.6-3 2-4c1.6-1.1 5 0 5 0M12 15v5s3-.6 4-2c1.1-1.6 0-5 0-5',
  utilisateur: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  reglages: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  sortir: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  fermer: 'M18 6 6 18M6 6l12 12',
  haut: 'M12 19V5M5 12l7-7 7 7',
  bas: 'M12 5v14M19 12l-7 7-7-7',
  dupliquer: 'M8 8h12v12H8zM4 16V4h12',
  copier: 'M9 9h11v11H9zM5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1',
  coller: 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 2h6v4H9z',
  parent: 'M18 15l-6-6-6 6',
  poubelle: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
  crayon: 'M12 20h9M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z',
  lien: 'M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7',
  gras: 'M6 4h8a4 4 0 0 1 0 8H6zM6 12h9a4 4 0 0 1 0 8H6z',
  italique: 'M19 4h-9M14 20H5M15 4 9 20',
  souligne: 'M6 3v7a6 6 0 0 0 12 0V3M4 21h16',
  barre: 'M16 4H9a3 3 0 0 0-2.8 4M14 12a4 4 0 0 1 0 8H6M4 12h16',
  effacer: 'M7 21h10M5 3l14 14M9 3h10l-2 7',
  couleur: 'M12 22a10 10 0 1 1 0-20c5.5 0 10 4 10 8.5 0 2.5-2 4.5-4.5 4.5H15a2 2 0 0 0-1.5 3.3c.3.4.5.8.5 1.2 0 1.4-1 2.5-2 2.5zM7.5 10.5h.01M10.5 7.5h.01M15.5 7.5h.01M17.5 11.5h.01',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01',
  alerte: 'M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01',
  interdit: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM4.9 4.9l14.2 14.2',
  ok: 'M20 6 9 17l-5-5',
  horloge: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  qr: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM18 18h3v3h-3zM14 18h.01M18 14h3',
  externe: 'M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6',
  telecharger: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  envoyer: 'M22 2 11 13M22 2l-7 20-4-9-9-4z',
  texte: 'M4 7V4h16v3M9 20h6M12 4v16',
  section: 'M3 3h18v7H3zM3 14h18v7H3z',
  bouton: 'M3 8h18v8H3zM8 12h8',
  video: 'M23 7l-7 5 7 5zM1 5h15v14H1z',
  liste: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  menu: 'M3 12h18M3 6h18M3 18h18',
  points: 'M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM19 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM5 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  deplacer: 'M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20',
  dossier: 'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z',
  etoile: 'M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z',
  aide: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01',
  clavier: 'M2 6h20v12H2zM6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8',
  gauche: 'M15 18l-6-6 6-6',
  droite: 'M9 18l6-6-6-6',
  calendrier: 'M3 4h18v18H3zM16 2v4M8 2v4M3 10h18',
  signaler: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7',
  ancre: 'M12 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 22V8M5 12H2a10 10 0 0 0 20 0h-3',
  equipe: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  baguette: 'M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M15 9h.01M17.8 6.2 19 5M3 21l9-9M12.2 6.2 11 5',
  aligneG: 'M3 6h18M3 12h12M3 18h16',
  aligneC: 'M3 6h18M6 12h12M4 18h16',
  aligneD: 'M3 6h18M9 12h12M5 18h16',
  justifie: 'M3 6h18M3 12h18M3 18h18',
  cadenas: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',
  zoom: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3M11 8v6M8 11h6',
  pipette: 'M2 22l1-1h3l9-9M3 21v-3l9-9M14.5 5.5l4 4M17 3a2.8 2.8 0 1 1 4 4l-3 3-4-4z',
};

export function Icone({ nom, taille = 18, classe = '', titre }) {
  const d = P[nom] || P.points;
  return (
    <svg class={'ico ' + classe} width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden={titre ? undefined : 'true'} role={titre ? 'img' : undefined}>
      {titre ? <title>{titre}</title> : null}
      <path d={d} />
    </svg>
  );
}

/** Icône SVG fournie sous forme de texte (catalogue des blocs). */
export function IconeBrute({ svg }) {
  return <span class="ico-brute" dangerouslySetInnerHTML={{ __html: svg || '' }} />;
}
