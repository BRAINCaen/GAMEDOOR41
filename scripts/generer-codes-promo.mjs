// Liste officielle des codes promo / reductions publiee sur le site.
//
// SOURCE DE VERITE = ce fichier. Pour ajouter, retirer ou corriger un code :
//   1. modifier le tableau CODES ci-dessous (et FAMILLES si besoin) ;
//   2. lancer :  node scripts/generer-codes-promo.mjs
// Le script reecrit le bloc compris entre <!-- CODES-PROMO:START --> et <!-- CODES-PROMO:END -->
// dans chaque page qui le contient (/code-promo/ et /tarifs/).
//
// Les codes internes (VIP, GMFRIENDLY, VENTECO, FRAIS, ACEI, tickets GOLD, codes partenaires
// CAP / CLM / FUNBOOKER) ne sont volontairement PAS publies ici.
//
// Chaque code doit exister et etre actif dans 4escape (Coupons) : le site ne fait qu'afficher.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';

export const FAMILLES = [
  {
    id: 'cartes', titre: 'Cartes & pass partenaires', remise: '−10 %',
    regle: 'Réservez avec le code, montrez la carte à l’accueil.',
  },
  {
    id: 'cse', titre: 'Comités d’entreprise & plateformes CSE', remise: '−10 %',
    regle: 'Preuve d’adhésion (appli ou carte) ou justificatif salarié à l’accueil.',
  },
  {
    id: 'tickets', titre: 'Tickets & bons déjà payés', remise: '0 € en ligne',
    regle: 'Vous réservez sans rien payer en ligne : vos tickets sont encaissés à l’accueil, un par joueur. Sans eux, la session se règle sur place au tarif normal.',
  },
  {
    id: 'paiement', titre: 'Chèques-Vacances, box & cartes cadeaux', remise: '',
    regle: 'Le code remplace le paiement en ligne : le support (chèques, coffret) est remis à l’accueil.',
  },
  {
    id: 'occasions', titre: 'Étudiant·es & mariage', remise: '',
    regle: '',
  },
];

export const CODES = [
  // --- Cartes & pass partenaires (−10 %) ---
  { code: 'CEZAM', nom: 'Carte CEZAM', famille: 'cartes', remise: '−10 %', justif: 'Carte CEZAM en cours de validité', mots: 'cezam cézam' },
  { code: 'TRIP', nom: 'Trip Normand', famille: 'cartes', remise: '−10 %', justif: 'Carte ou appli Trip Normand', mots: 'trip normand' },
  { code: 'PAN', nom: 'Carte PAN', famille: 'cartes', remise: '−10 %', justif: 'Carte PAN', mots: 'pan pass normandie' },
  { code: 'CITYPASS', nom: 'City Pass Caen', famille: 'cartes', remise: '−10 %', justif: 'City Pass en cours de validité', mots: 'city pass caen citypass office tourisme' },
  { code: 'RDN', nom: 'Réduc de Normandie', famille: 'cartes', remise: '−10 %', justif: 'Justificatif d’adhésion Réduc de Normandie', mots: 'rdn reduc réduc normandie' },
  { code: 'CHASSE_AUX_CLES', nom: 'Chasse aux Clés · The Escapers', famille: 'cartes', remise: '−10 %', justif: 'Compte The Escapers inscrit à la Chasse aux Clés', mots: 'escapers chasse aux clés clefs cles' },
  { code: 'ODT10', nom: 'Chèque loisir Office de Tourisme', famille: 'cartes', remise: '−10 %', justif: 'Chèque loisir de l’Office de Tourisme, remis à l’accueil', mots: 'office de tourisme odt chèque cheque loisir' },

  // --- CSE (−10 %) ---
  { code: 'COMITEO', nom: 'Comiteo', famille: 'cse', remise: '−10 %', justif: 'Preuve d’adhésion Comiteo', mots: 'comiteo cse comité' },
  { code: 'ETIMOC', nom: 'Etimoc', famille: 'cse', remise: '−10 %', justif: 'Preuve d’adhésion Etimoc', mots: 'etimoc cse' },
  { code: 'HAPPYPAL', nom: 'HappyPal', famille: 'cse', remise: '−10 %', justif: 'Preuve d’adhésion HappyPal', mots: 'happypal happy pal cse' },
  { code: 'SMILE', nom: 'Smile', famille: 'cse', remise: '−10 %', justif: 'Preuve d’adhésion Smile', mots: 'smile cse' },
  { code: 'CE-CARREFOUR', nom: 'CE Carrefour', famille: 'cse', remise: '−10 %', justif: 'Justificatif salarié Carrefour', mots: 'carrefour ce cse' },
  { code: 'CSECMSTLO', nom: 'CSE Carrefour Market Saint-Lô', famille: 'cse', remise: '−10 %', justif: 'Justificatif salarié', mots: 'carrefour market saint-lo saint lô st-lô cse' },

  // --- Tickets & bons deja payes (reservation a 0 € en ligne) ---
  { code: 'BONSCEZAM', nom: 'Bons / tickets Cezam', famille: 'tickets', remise: '0 € en ligne', justif: 'Vos bons Cezam, un par joueur', mots: 'bons tickets cezam cézam' },
  { code: 'CESNCF', nom: 'Tickets CSE SNCF', famille: 'tickets', remise: '0 € en ligne', justif: 'Vos tickets CSE SNCF, un par joueur', mots: 'sncf cse tickets' },
  { code: 'CEBOSCH', nom: 'Tickets CSE Bosch', famille: 'tickets', remise: '0 € en ligne', justif: 'Vos tickets CSE Bosch, un par joueur', mots: 'bosch cse tickets' },
  { code: 'CESUPERU', nom: 'Tickets CSE Super U', famille: 'tickets', remise: '0 € en ligne', justif: 'Vos tickets CSE Super U, un par joueur', mots: 'super u superu cse tickets' },
  { code: 'ODT', nom: 'Place achetée à l’Office de Tourisme', famille: 'tickets', remise: '0 € en ligne', justif: 'Votre billet Office de Tourisme, un par joueur', mots: 'office de tourisme odt billet place' },
  { code: 'PASSLOISIRS', nom: 'Coupons Pass Loisirs', famille: 'tickets', remise: '−3 € par joueur', justif: 'Un coupon Pass Loisirs de 3 € par joueur, remis à l’accueil', mots: 'pass loisirs coupons' },

  // --- Cheques-vacances, box & cartes cadeaux ---
  { code: 'ANCV', nom: 'Chèques-Vacances ANCV (papier)', famille: 'paiement', remise: '0 € en ligne', justif: 'Vos chèques ANCV, pour régler la session à l’accueil', mots: 'ancv chèques vacances cheque cheques' },
  { code: null, nom: 'Carte cadeau GAMEDOOR·41', famille: 'paiement', remise: 'Montant de la carte', justif: 'Rien à présenter : le code reçu par e-mail suffit · valable 12 mois, prolongation sur demande par mail avec le code', mots: 'carte cadeau bon cadeau coffret mystère e-carte', codeTexte: 'Votre code unique' },
  { code: 'BOOMRANG', nom: 'Box Boomrang · Live Escape Box', famille: 'paiement', remise: '0 € en ligne', justif: 'Votre coffret et le code inscrit dedans · escape game uniquement', mots: 'box boomrang live escape box coffret nature découvertes' },

  // --- Occasions ---
  { code: 'ETUDIANT', nom: 'Étudiant·e adulte', famille: 'occasions', remise: '−10 %', justif: 'Carte étudiante en cours de validité · 18 ans et + · escape game uniquement · hors juillet et août', mots: 'étudiant etudiant étudiante student carte étudiante université fac école' },
  { code: 'MARIAGE', nom: 'Place mariée · marié offerte', famille: 'occasions', remise: '1 place offerte', justif: 'Accessoire « reine » ou « roi du jour » porté à l’arrivée (voile, couronne, écharpe…)', mots: 'mariage mariée marié evjf evg enterrement vie jeune fille garçon' },
];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slug = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function htmlItem(c) {
  const id = 'code-' + slug(c.code || c.nom);
  const cherche = [c.code, c.nom, c.mots, c.justif].filter(Boolean).join(' ');
  const code = c.code
    ? `<code class="cp-code-val">${esc(c.code)}</code><button type="button" class="cp-copier" data-code="${esc(c.code)}" aria-label="Copier le code ${esc(c.code)}">Copier</button>`
    : `<span class="cp-code-val cp-code-val--libre">${esc(c.codeTexte || 'Votre code')}</span>`;
  return `          <li class="cp-item" id="${id}" data-cherche="${esc(cherche)}">
            <div class="cp-tete"><h4 class="cp-nom">${esc(c.nom)}</h4><span class="cp-remise">${esc(c.remise)}</span></div>
            <div class="cp-code"><span class="cp-lbl">Code</span>${code}</div>
            <p class="cp-justif"><span class="cp-lbl">À l’accueil</span>${esc(c.justif)}</p>
          </li>`;
}

export function htmlListe() {
  const groupes = FAMILLES.map((f) => {
    const items = CODES.filter((c) => c.famille === f.id);
    if (!items.length) return '';
    return `      <section class="cp-groupe" data-famille="${f.id}" aria-labelledby="cp-g-${f.id}">
        <div class="cp-groupe-tete">
          <h3 class="cp-groupe-titre" id="cp-g-${f.id}">${esc(f.titre)}</h3>${f.remise ? `<span class="cp-groupe-remise">${esc(f.remise)}</span>` : ''}
        </div>${f.regle ? `
        <p class="cp-groupe-regle">${esc(f.regle)}</p>` : ''}
        <ul class="cp-liste">
${items.map(htmlItem).join('\n')}
        </ul>
      </section>`;
  }).filter(Boolean).join('\n');

  return `<div class="cp" data-codes-promo>
      <div class="cp-recherche">
        <label for="cp-q" class="cp-recherche-lbl">Votre carte, votre CSE, votre situation&nbsp;:</label>
        <div class="cp-recherche-champ">
          <svg class="cp-recherche-ico" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="m20 20-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          <input id="cp-q" class="cp-q" type="search" placeholder="Ex. : Cezam, SNCF, étudiant, chèques vacances, mariage…" autocomplete="off" spellcheck="false" aria-describedby="cp-compte">
        </div>
        <p id="cp-compte" class="cp-compte" aria-live="polite"></p>
      </div>
${groupes}
      <p class="cp-vide" hidden>Aucun code ne correspond à «&nbsp;<strong></strong>&nbsp;». Si votre carte, votre CSE ou votre partenaire n’est pas dans la liste, il n’y a pas de réduction associée&nbsp;: le tarif normal s’applique.</p>
    </div>`;
}

// --- reecriture des pages ----------------------------------------------------
const PAGES = ['code-promo/index.html', 'tarifs/index.html'];
const DEBUT = '<!-- CODES-PROMO:START -->', FIN = '<!-- CODES-PROMO:END -->';

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  const bloc = htmlListe();
  let n = 0;
  for (const page of PAGES) {
    if (!existsSync(page)) { console.log('absent :', page); continue; }
    const avant = readFileSync(page, 'utf8');
    const i = avant.indexOf(DEBUT), j = avant.indexOf(FIN);
    if (i === -1 || j === -1 || j < i) { console.log('pas de marqueurs dans', page); continue; }
    const apres = avant.slice(0, i + DEBUT.length) + '\n    ' + bloc + '\n    ' + avant.slice(j);
    if (apres !== avant) { writeFileSync(page, apres, 'utf8'); n++; console.log('mis a jour :', page); }
  }
  console.log(`${CODES.length} codes, ${n} page(s) reecrite(s).`);
}
