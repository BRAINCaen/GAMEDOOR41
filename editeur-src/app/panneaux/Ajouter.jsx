// Panneau « Ajouter » : blocs et sections prêts à l'emploi (clic ou glisser-déposer)
import { useState } from 'preact/hooks';
import { BLOCS, CATEGORIES } from '../blocs/catalogue.js';
import { useEtat, maj } from '../etat.js';
import { insererHtml } from '../commandes.js';
import { IconeBrute, Icone } from '../ui/icones.jsx';

const sansAccents = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function PanneauAjouter() {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('tout');
  const selection = useEtat((e) => e.selection);
  const filtre = sansAccents(q.trim());
  const liste = BLOCS.filter((b) => (cat === 'tout' || b.categorie === cat) && (!filtre || sansAccents([b.nom, b.description, ...(b.motsCles || [])].join(' ')).includes(filtre)));
  const ajouter = (b) => insererHtml(b.html(), 'Bloc ajouté : ' + b.nom);
  return (
    <div class="ajouter">
      <input class="recherche-panneau" type="search" placeholder="Chercher un bloc (titre, bouton, FAQ, promo…)" value={q} onInput={(e) => setQ(e.currentTarget.value)} />
      <div class="puces">
        <button type="button" class={cat === 'tout' ? 'actif' : ''} onClick={() => setCat('tout')}>Tout</button>
        {CATEGORIES.map((c) => <button type="button" class={cat === c.id ? 'actif' : ''} onClick={() => setCat(c.id)}>{c.nom}</button>)}
      </div>
      <p class="aide-ligne">{selection ? 'Cliquez sur un bloc pour l’ajouter après l’élément sélectionné, ou glissez-le dans la page.' : 'Glissez un bloc à l’endroit voulu dans la page, ou cliquez pour l’ajouter en bas du contenu.'}</p>
      {(cat === 'tout' ? CATEGORIES : CATEGORIES.filter((c) => c.id === cat)).map((c) => {
        const blocs = liste.filter((b) => b.categorie === c.id);
        if (!blocs.length) return null;
        return (
          <section class="groupe-blocs">
            <h3>{c.nom}</h3>
            <div class="grille-blocs">
              {blocs.map((b) => (
                <button type="button" class="carte-bloc" draggable="true" title={b.description}
                  onDragStart={(e) => { const d = JSON.stringify({ type: 'bloc', id: b.id }); e.dataTransfer.setData('application/x-gdx', d); e.dataTransfer.setData('text/plain', d); e.dataTransfer.effectAllowed = 'copy'; }}
                  onClick={() => ajouter(b)}>
                  <IconeBrute svg={b.icone} />
                  <span>{b.nom}</span>
                </button>
              ))}
            </div>
          </section>
        );
      })}
      {!liste.length ? <p class="aide-ligne">Aucun bloc ne correspond. Essayez l’assistant <button type="button" class="lien" onClick={() => maj({ panneau: 'assistant' })}><Icone nom="assistant" taille={13} /> en décrivant ce que vous voulez</button>.</p> : null}
    </div>
  );
}
