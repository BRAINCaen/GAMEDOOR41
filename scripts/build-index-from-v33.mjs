// Build production index.html from extracted V3.3 template.
// - Strips @font-face and v3-banner blocks
// - Extracts CSS to css/home-v33.css
// - Replaces UUID image refs with <picture> tags pointing to real /img/ files
// - Replaces [PLACEHOLDERS] with real values
// - Builds production <head> with full SEO + JSON-LD + Google Fonts
// - Removes v3 dev banner
import { readFile, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'extracted-v33', 'template.html');
const OUT_HTML = join(ROOT, 'index.html');
const OUT_CSS = join(ROOT, 'css', 'home-v33.css');

// Map UUID → /img path + alt text + sizes hint
const IMG_MAP = {
  '844abe87-432b-44ca-92da-c858d1bdfe6d': {
    base: '/img/escape/salle-psychiatric-lit-fauteuil',
    widths: [480, 768, 1024],
    fullW: 4080,
    alt: 'Lit clinique avec empreintes de mains sur les murs — salle Psychiatric escape game GAMEDOOR·41 Caen',
    sizes: '(max-width: 980px) 100vw, 60vw',
  },
  '26eeba8d-d68f-43a3-ba60-100a652734d5': {
    base: '/img/quiz/salle-quiz-buzzers-premier-plan',
    widths: [480, 768, 1024],
    fullW: 3091,
    alt: 'Buzzers du quiz Buzz Your Brain en premier plan — salle quiz GAMEDOOR·41 Caen',
    sizes: '(max-width: 980px) 100vw, 30vw',
  },
  'c0242933-a008-4a2b-9a68-f8cdd397f18c': {
    base: '/img/quiz/asset-quiz-fond-briques-nuit',
    widths: [480, 768, 1024],
    fullW: 1920,
    alt: '',
    sizes: '100vw',
  },
  '6d177fed-1442-4977-955a-99028d76c5a2': {
    base: '/img/quiz/salle-quiz-couloir-vue-ensemble',
    widths: [480, 768, 1024],
    fullW: 4032,
    alt: '',
    sizes: '100vw',
  },
  '6d114990-c639-46ce-bd9e-af389272a06e': {
    base: '/img/quiz/salle-quiz-perspective-rasante',
    widths: [480, 768, 1024],
    fullW: 4032,
    alt: 'Salle de quiz Buzz Your Brain en perspective — GAMEDOOR·41 Caen',
    sizes: '(max-width: 900px) 100vw, 33vw',
  },
  '6e03ae80-4d1c-4357-b34a-7382e63dd967': {
    base: '/img/escape/salle-garde-a-vue-scanner-empreintes',
    widths: [480, 768, 1024],
    fullW: 4590,
    alt: 'Scanner d\'empreintes de la salle Garde à Vue — escape game GAMEDOOR·41 Caen',
    sizes: '(max-width: 900px) 100vw, 33vw',
  },
  'edfbc079-0718-4791-bde0-36d6ead8e492': {
    base: '/img/escape/asset-psychiatric-rorschach',
    widths: [480, 768, 1024],
    fullW: 4724,
    alt: 'Test de Rorschach — illustration salle Psychiatric escape game GAMEDOOR·41 Caen',
    sizes: '(max-width: 900px) 100vw, 33vw',
  },
};

function buildPicture(uuid, originalImgTag) {
  const m = IMG_MAP[uuid];
  if (!m) {
    console.warn(`Unknown UUID: ${uuid}`);
    return originalImgTag;
  }
  // Preserve inline styles from the original <img> for layout
  const styleMatch = originalImgTag.match(/style="([^"]*)"/);
  const style = styleMatch ? styleMatch[1] : 'width:100%;height:100%;object-fit:cover;';
  const altMatch = originalImgTag.match(/alt="([^"]*)"/);
  const alt = altMatch && altMatch[1] ? altMatch[1] : m.alt;

  const srcset = (ext) =>
    m.widths.map((w) => `${m.base}-${w}w.${ext} ${w}w`).join(', ') +
    `, ${m.base}.${ext} ${m.fullW}w`;

  return `<picture>
          <source type="image/avif" srcset="${srcset('avif')}" sizes="${m.sizes}">
          <source type="image/webp" srcset="${srcset('webp')}" sizes="${m.sizes}">
          <img src="${m.base}-1024w.jpg" srcset="${srcset('jpg')}" sizes="${m.sizes}" alt="${alt}" loading="lazy" decoding="async" style="${style}">
        </picture>`;
}

async function main() {
  let html = await readFile(SRC, 'utf8');

  // 1. Extract the two <style> blocks
  const styleRe = /<style>([\s\S]*?)<\/style>/g;
  const styles = [];
  let m;
  while ((m = styleRe.exec(html)) !== null) {
    styles.push(m[1]);
  }
  if (styles.length < 2) throw new Error(`Expected 2 <style> blocks, got ${styles.length}`);

  // 2. Build CSS file content
  // - tokens block (styles[0]) — strip @font-face entirely (replaced by Google Fonts in HTML)
  // - components block (styles[1]) — strip the v3-banner section at the end
  let tokens = styles[0].replace(/@font-face\s*{[^}]*}\s*/g, '');
  let components = styles[1].replace(
    /\/\* =+\s*BANNER \(V3 NOTICE\)[\s\S]*?\.v3-banner a \{[^}]*\}\s*/,
    ''
  );

  const css = `/* GAMEDOOR·41 — Home (V3.3) production styles
   Source: extracted from "GAMEDOOR41 - Home V3.3 (standalone).html" Claude Design output
   Tokens aligned with gamedoor41-design-system/02-design-tokens.css
   Fonts loaded via Google Fonts in <head>.
*/
${tokens}
${components}`;
  await writeFile(OUT_CSS, css);
  console.log(`Wrote ${OUT_CSS} (${(css.length / 1024).toFixed(1)}K)`);

  // 3. Extract body content (between <body> and </body>)
  const bodyMatch = html.match(/<body>([\s\S]*?)<\/body>/);
  if (!bodyMatch) throw new Error('No body found');
  let body = bodyMatch[1];

  // 4. Strip the V3 dev banner
  body = body.replace(/<!--\s*Mini banner V3\.3\s*-->\s*<div class="v3-banner">[\s\S]*?<\/div>\s*/, '');

  // 5. Replace UUID images with <picture>
  // Match: <img src="UUID"...> (with attrs, possibly multiline)
  const imgRe = /<img\s+src="([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})"[^>]*>/g;
  body = body.replace(imgRe, (match, uuid) => buildPicture(uuid, match));

  // 6. Replace [PLACEHOLDERS] with real values where confident
  const replacements = [
    // Reviews — Google rating from project memory: 4.9 / 2085
    [/<span class="ph">\[NOTE\]<\/span>/g, '4,9'],
    [/<span class="ph">\[NB_AVIS\]<\/span>/g, '2 085'],
    // Contact (from CHARTE-GRAPHIQUE / design system contact)
    [/<a href="tel:#"><span class="ph">\[TEL_PRINCIPAL\]<\/span><\/a>/g,
      '<a href="tel:+33231530751">02 31 53 07 51</a>'],
    [/<a href="mailto:#"><span class="ph">\[EMAIL_CONTACT\]<\/span><\/a>/g,
      '<a href="mailto:contact@gamedoor41.fr">contact@gamedoor41.fr</a>'],
    [/<a href="#"><span class="ph">\[WhatsApp\]<\/span><\/a>/g,
      '<a href="https://wa.me/33231530751">WhatsApp</a>'],
  ];
  for (const [from, to] of replacements) body = body.replace(from, to);

  // 7. Update internal href="#" placeholders for nav and footer that have no anchor target
  // Footer "Univers" + "Events" + "Infos" links → real paths
  const linkMap = [
    // Footer Univers
    ['<li><a href="#">Escape Game</a></li>', '<li><a href="/escape-game-caen/">Escape Game</a></li>'],
    ['<li><a href="#">Quiz · Buzz Your Brain</a></li>', '<li><a href="/quiz-game-caen/">Quiz · Buzz Your Brain</a></li>'],
    ['<li><a href="#">Action Games</a></li>', '<li><a href="#action">Action Games</a></li>'],
    ['<li><a href="#">Events</a></li>', '<li><a href="/team-building-caen/">Events</a></li>'],
    ['<li><a href="#">Magazine</a></li>', '<li><a href="#magazine">Magazine</a></li>'],
    // Footer Events
    ['<li><a href="#">Entreprises</a></li>', '<li><a href="/references-entreprises-caen/">Entreprises</a></li>'],
    ['<li><a href="#">EVJF</a></li>', '<li><a href="/evjf-caen/">EVJF</a></li>'],
    ['<li><a href="#">EVG</a></li>', '<li><a href="/evg-caen/">EVG</a></li>'],
    ['<li><a href="#">Anniversaires</a></li>', '<li><a href="/anniversaire-caen/">Anniversaires</a></li>'],
    ['<li><a href="#">Privatisation</a></li>', '<li><a href="/team-building-caen/">Privatisation</a></li>'],
    // Footer Infos
    ['<li><a href="#">Accès &amp; parking</a></li>', '<li><a href="/contact/">Accès &amp; parking</a></li>'],
    ['<li><a href="#">Tarifs</a></li>', '<li><a href="/tarifs/">Tarifs</a></li>'],
    ['<li><a href="#">FAQ</a></li>', '<li><a href="#">FAQ</a></li>'],
    ['<li><a href="#">Accessibilité</a></li>', '<li><a href="#">Accessibilité</a></li>'],
    ['<li><a href="#">Avis Google</a></li>',
      '<li><a href="https://www.google.com/maps/place/Brain+Escape+Game/@49.1842,-0.3508" rel="noopener" target="_blank">Avis Google</a></li>'],
    // Footer bottom
    ['<a href="#">Mentions légales</a>', '<a href="/mentions-legales/">Mentions légales</a>'],
    ['<a href="#">CGV</a>', '<a href="/cgv/">CGV</a>'],
    ['<a href="#">Confidentialité</a>', '<a href="/confidentialite/">Confidentialité</a>'],
    ['<a href="#">Cookies</a>', '<a href="/cookies/">Cookies</a>'],
    // Footer logo + nav logo
    ['<a href="#" class="footer-logo">', '<a href="/" class="footer-logo">'],
    ['<a href="#" class="nav-logo">', '<a href="/" class="nav-logo">'],
    // Compare CTAs
    ['<a href="#" class="cmp-cta">Voir les salles</a>',
      '<a href="/escape-game-caen/" class="cmp-cta">Voir les salles</a>'],
    ['<a href="#" class="cmp-cta">Réserver le plateau</a>',
      '<a href="/quiz-game-caen/" class="cmp-cta">Réserver le plateau</a>'],
    ['<a href="#" class="cmp-cta">Demander un devis</a>',
      '<a href="/devis/" class="cmp-cta">Demander un devis</a>'],
    // B2B CTAs
    ['<a href="#" class="btn btn-primary btn-arrow">Demander un devis</a>',
      '<a href="/devis/" class="btn btn-primary btn-arrow">Demander un devis</a>'],
    ['<a href="#" class="btn btn-ghost btn-arrow">Découvrir les events</a>',
      '<a href="/team-building-caen/" class="btn btn-ghost btn-arrow">Découvrir les events</a>'],
    // Magazine "Tout le magazine"
    ['<a href="#" class="btn btn-ghost btn-arrow reveal reveal-d1">Tout le magazine</a>',
      '<a href="#magazine" class="btn btn-ghost btn-arrow reveal reveal-d1">Tout le magazine</a>'],
    // Final CTA
    ['<a href="#" class="btn btn-primary cta-final-btn btn-arrow">Réserver maintenant</a>',
      '<a href="/escape-game-caen/" class="btn btn-primary cta-final-btn btn-arrow">Réserver maintenant</a>'],
  ];
  for (const [from, to] of linkMap) body = body.replace(from, to);

  // 8. Build the final index.html
  const finalHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>GAMEDOOR·41 — Escape Game &amp; Quiz à Caen · Mondeville</title>
  <meta name="description" content="Escape game, quiz Buzz Your Brain et events à 5 min de Caen centre. 4 univers sous un même toit · 2085 avis Google ★4,9. Réservez en ligne.">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <meta name="theme-color" content="#0C0800">
  <link rel="canonical" href="https://gamedoor41.fr/">

  <!-- Open Graph / Twitter -->
  <meta property="og:type" content="website">
  <meta property="og:locale" content="fr_FR">
  <meta property="og:url" content="https://gamedoor41.fr/">
  <meta property="og:title" content="GAMEDOOR·41 — Escape Game &amp; Quiz Game à Caen">
  <meta property="og:description" content="4 univers sous un toit · à 5 min de Caen centre. Escape · Quiz · Action · Events.">
  <meta property="og:image" content="https://gamedoor41.fr/img/og/og-default.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="GAMEDOOR·41">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="GAMEDOOR·41 — Escape Game &amp; Quiz à Caen">
  <meta name="twitter:description" content="4 univers sous un toit · à 5 min de Caen centre.">
  <meta name="twitter:image" content="https://gamedoor41.fr/img/og/og-default.jpg">

  <!-- Favicon -->
  <link rel="icon" type="image/svg+xml" href="/img/logo/favicon.svg">
  <link rel="apple-touch-icon" href="/img/logo/logo-icon.png">

  <!-- Fonts (Barlow Condensed display + DM Sans body) -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;500;600;700;800;900&family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap" rel="stylesheet">

  <!-- Preload LCP image (hero card escape) -->
  <link rel="preload" as="image" type="image/avif" href="/img/escape/salle-psychiatric-lit-fauteuil-1024w.avif" imagesrcset="/img/escape/salle-psychiatric-lit-fauteuil-480w.avif 480w, /img/escape/salle-psychiatric-lit-fauteuil-768w.avif 768w, /img/escape/salle-psychiatric-lit-fauteuil-1024w.avif 1024w" imagesizes="(max-width: 980px) 100vw, 60vw">

  <!-- Styles -->
  <link rel="stylesheet" href="/css/home-v33.css">

  <!-- Schema.org — LocalBusiness / EntertainmentBusiness -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "EntertainmentBusiness",
    "@id": "https://gamedoor41.fr/#business",
    "name": "GAMEDOOR·41",
    "alternateName": ["Brain Escape Game Caen", "Buzz Your Brain Caen", "Brain Caen"],
    "description": "Escape game, quiz Buzz Your Brain, action games et events à 5 min de Caen centre. 4 univers sous un même toit.",
    "url": "https://gamedoor41.fr/",
    "logo": "https://gamedoor41.fr/img/logo/logo-stacked.png",
    "image": "https://gamedoor41.fr/img/og/og-default.jpg",
    "telephone": "+33231530751",
    "email": "contact@gamedoor41.fr",
    "priceRange": "€€",
    "foundingDate": "2017",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "41 bis rue Pasteur",
      "addressLocality": "Mondeville",
      "postalCode": "14120",
      "addressRegion": "Normandie",
      "addressCountry": "FR"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 49.1842,
      "longitude": -0.3508
    },
    "areaServed": [
      { "@type": "City", "name": "Caen" },
      { "@type": "City", "name": "Mondeville" },
      { "@type": "City", "name": "Hérouville-Saint-Clair" },
      { "@type": "City", "name": "Ifs" },
      { "@type": "AdministrativeArea", "name": "Calvados" },
      { "@type": "AdministrativeArea", "name": "Normandie" }
    ],
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        "opens": "10:30",
        "closes": "23:00"
      },
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": "Sunday",
        "opens": "10:30",
        "closes": "21:00"
      }
    ],
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "reviewCount": "2085",
      "bestRating": "5",
      "worstRating": "1"
    },
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Univers de jeu GAMEDOOR·41",
      "itemListElement": [
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Escape Game à Caen",
            "description": "3 salles immersives à thème (Garde à Vue, Psychiatric, Bunker bientôt) — 60 minutes pour sortir, de 2 à 6 joueurs."
          },
          "price": "24",
          "priceCurrency": "EUR",
          "url": "https://gamedoor41.fr/escape-game-caen/"
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Quiz Buzz Your Brain à Caen",
            "description": "Quiz interactif avec buzzers, plateau et animateur. Idéal team building, EVJF, anniversaire."
          },
          "price": "15",
          "priceCurrency": "EUR",
          "url": "https://gamedoor41.fr/quiz-game-caen/"
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Events &amp; privatisations à Caen",
            "description": "Séminaires, EVJF, EVG, anniversaires, team buildings. Privatisation totale possible."
          },
          "url": "https://gamedoor41.fr/team-building-caen/"
        }
      ]
    },
    "sameAs": [
      "https://www.google.com/maps/place/Brain+Escape+Game/@49.1842,-0.3508",
      "https://www.facebook.com/braincaen",
      "https://www.instagram.com/brain_caen/"
    ]
  }
  </script>
</head>
<body>
${body.trim()}
</body>
</html>
`;

  await writeFile(OUT_HTML, finalHtml);
  console.log(`Wrote ${OUT_HTML} (${(finalHtml.length / 1024).toFixed(1)}K)`);
  console.log('\nDone.');
}

main().catch((e) => { console.error(e); process.exit(1); });
