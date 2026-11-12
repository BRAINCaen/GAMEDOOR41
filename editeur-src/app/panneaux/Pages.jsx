// Panneau « Pages » : toutes les pages du site, brouillons, nouvelle page
import { useState, useEffect } from 'preact/hooks';
import { etat, useEtat, maj } from '../etat.js';
import { ouvrirPage, reprendreBrouillonServeur, abandonnerBrouillon } from '../actions.js';
import { chargerTitres, titreCourt, urlPage } from '../site.js';
import { Bouton, Badge, temps } from '../ui/base.jsx';
import { Icone } from '../ui/icones.jsx';

const GROUPES = [
  { nom: 'Pages principales', test: (c) => !c.includes('/') || /^(escape-game-caen|quiz-game-caen|team-building-caen|tarifs|contact|cadeau|reserver|avis|faq|devis|code-promo|moyens-de-paiement|restauration-seminaire|references-entreprises-caen|escape-game-mondeville|escape-game-famille-caen|escape-game-enfant-caen|brain-devient-gamedoor41|alternance)\/index\.html$/.test(c) },
  { nom: 'Salles d’escape game', test: (c) => /^escape-game-caen\/.+\//.test(c) },
  { nom: 'Événements', test: (c) => /^(evjf|evg|anniversaire|mariage)-caen\//.test(c) },
  { nom: 'Magazine', test: (c) => /^(post|magazine)\//.test(c) },
  { nom: 'Informations légales', test: (c) => /^(mentions-legales|politique-|termes-conditions)/.test(c) },
  { nom: 'Autres', test: () => true },
];

export function PanneauPages() {
  const pages = useEtat((e) => e.pages);
  const titres = useEtat((e) => e.titres);
  const courant = useEtat((e) => e.courant);
  const brouillons = useEtat((e) => e.brouillonsServeur);
  const qui = useEtat((e) => e.qui);
  useEtat((e) => e.rev);
  const [q, setQ] = useState('');
  useEffect(() => { if (!Object.keys(titres).length) chargerTitres().catch(() => {}); }, []);
  const f = q.trim().toLowerCase();
  const nouvelles = Object.values(etat.docs).filter((d) => d.nouvelle);
  const liste = pages.filter((p) => !f || (p.chemin + ' ' + (titres[p.chemin] || '')).toLowerCase().includes(f));
  const deja = new Set();
  const autres = brouillons.filter((b) => b.auteur && qui && b.auteur.email !== qui.email);
  return (
    <div class="pages">
      <Bouton variante="principal" icone="plus" onClick={() => maj({ modale: { type: 'nouvelle-page' } })}>Créer une nouvelle page</Bouton>
      <input class="recherche-panneau" type="search" placeholder="Chercher une page…" value={q} onInput={(e) => setQ(e.currentTarget.value)} />
      {autres.length ? (
        <section class="groupe-pages">
          <h3><Icone nom="equipe" taille={14} /> Brouillons de l’équipe</h3>
          {autres.map((b) => (
            <div class="ligne-brouillon">
              <div><strong>{b.nouvelle ? 'Nouvelle page ' : ''}{titreCourt(b.chemin)}</strong><small>{b.auteur.nom} · {b.nbEtapes} modification(s) · {temps(b.maj)}</small></div>
              <Bouton petit onClick={() => reprendreBrouillonServeur(b.chemin)}>Reprendre</Bouton>
            </div>
          ))}
        </section>
      ) : null}
      {nouvelles.length ? (
        <section class="groupe-pages">
          <h3>Nouvelles pages (pas encore publiées)</h3>
          {nouvelles.map((d) => (
            <button type="button" class={'ligne-page' + (d.chemin === courant ? ' actif' : '')} onClick={() => ouvrirPage(d.chemin)}>
              <span class="lp-titre">{d.nouvelle.titre}</span><span class="lp-url">/{d.nouvelle.slug}/</span><Badge type="nouveau">nouvelle</Badge>
            </button>
          ))}
        </section>
      ) : null}
      {GROUPES.map((g) => {
        const items = liste.filter((p) => !deja.has(p.chemin) && g.test(p.chemin));
        items.forEach((p) => deja.add(p.chemin));
        if (!items.length) return null;
        return (
          <section class="groupe-pages">
            <h3>{g.nom}</h3>
            {items.sort((a, b) => a.chemin.localeCompare(b.chemin)).map((p) => {
              const d = etat.docs[p.chemin];
              return (
                <div class={'ligne-page' + (p.chemin === courant ? ' actif' : '')} role="button" tabIndex={0} onClick={() => ouvrirPage(p.chemin)} onKeyDown={(e) => { if (e.key === 'Enter') ouvrirPage(p.chemin); }}>
                  <span class="lp-titre">{titreCourt(p.chemin)}</span>
                  <span class="lp-url">{urlPage(p.chemin)}</span>
                  {d && d.modifie ? <Badge type="modifie">{d.position} modif.</Badge> : null}
                  {d && d.modifie ? <button type="button" class="lp-abandon" title="Abandonner les modifications non publiées de cette page" onClick={(e) => { e.stopPropagation(); if (confirm('Abandonner les ' + d.position + ' modification(s) non publiée(s) de cette page ? (Rien n’est retiré du site.)')) abandonnerBrouillon(p.chemin); }}>×</button> : null}
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
