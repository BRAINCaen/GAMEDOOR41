// Panneau « Calques » : structure de la page en arbre (sélection, survol, glisser pour réordonner)
import { useState } from 'preact/hooks';
import { useEtat, maj, docCourant } from '../etat.js';
import { selectionner } from '../actions.js';
import { deplacerVers } from '../commandes.js';
import { nomElement } from '../moteur.js';
import { attr, texteVisible } from '../../noyau/arbre.mjs';
import { Icone } from '../ui/icones.jsx';

const IGNORES = new Set(['script', 'style', 'noscript', 'template', 'link', 'meta', 'br', 'source', 'wbr']);
const ICONES = { img: 'image', picture: 'image', a: 'lien', button: 'bouton', section: 'section', ul: 'liste', ol: 'liste', video: 'video', iframe: 'video', h1: 'texte', h2: 'texte', h3: 'texte', h4: 'texte', p: 'texte', svg: 'etoile', header: 'menu', footer: 'menu', nav: 'menu' };

export function PanneauCalques() {
  useEtat((e) => e.rev);
  const selection = useEtat((e) => e.selection);
  const [ouverts, setOuverts] = useState(() => new Set());
  const [filtre, setFiltre] = useState('');
  const d = docCourant();
  if (!d) return null;
  const corps = d.page.corps();
  if (!corps) return null;
  // chemin de la sélection toujours déplié
  const chemin = new Set();
  const sel = selection && d.page.arbre.parId.get(String(selection));
  for (let p = sel && sel.parent; p; p = p.parent) chemin.add(p.id);
  const f = filtre.trim().toLowerCase();
  const lignes = [];
  const parcourir = (el, prof) => {
    for (const k of el.enfants) {
      if (k.t !== 'el' || IGNORES.has(k.tag)) continue;
      const enfants = k.enfants.some((x) => x.t === 'el' && !IGNORES.has(x.tag)) && k.tag !== 'svg';
      const ouvert = ouverts.has(k.id) || chemin.has(k.id) || (prof < 1 && !ouverts.has('ferme:' + k.id));
      const texte = texteVisible(k).slice(0, 48);
      const correspond = !f || (nomElement(k) + ' ' + texte).toLowerCase().includes(f);
      if (correspond) lignes.push({ k, prof, enfants, ouvert, texte });
      if (enfants && (ouvert || f)) parcourir(k, prof + 1);
      if (lignes.length > 1500) return;
    }
  };
  parcourir(corps, 0);
  const deposer = (e, cible) => {
    e.preventDefault();
    let donnees = null;
    try { donnees = JSON.parse(e.dataTransfer.getData('application/x-gdx') || 'null'); } catch (_) { /* rien */ }
    if (!donnees || donnees.type !== 'deplacer') return;
    const r = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - r.top;
    deplacerVers(donnees.id, cible.id, y < r.height / 3 ? 'avant' : y > r.height * 2 / 3 ? 'apres' : 'fin');
  };
  return (
    <div class="calques">
      <input class="recherche-panneau" type="search" placeholder="Filtrer (ex. bouton, FAQ, titre…)" value={filtre} onInput={(e) => setFiltre(e.currentTarget.value)} />
      <ul class="arbre" role="tree">
        {lignes.map(({ k, prof, enfants, ouvert, texte }) => (
          <li role="treeitem" aria-selected={String(k.id) === String(selection)} class={(String(k.id) === String(selection) ? 'actif ' : '') + (k.nouveau ? 'nouveau' : '')}
            style={{ paddingLeft: 6 + prof * 14 + 'px' }}
            draggable="true"
            onDragStart={(e) => { e.dataTransfer.setData('application/x-gdx', JSON.stringify({ type: 'deplacer', id: k.id })); }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => deposer(e, k)}
            onMouseEnter={() => maj({ survol: String(k.id) })}
            onMouseLeave={() => maj({ survol: null })}
            onClick={() => selectionner(k.id)}>
            {enfants ? <button type="button" class="pli" onClick={(e) => { e.stopPropagation(); if (ouvert) { const n = new Set(ouverts); n.delete(k.id); n.add('ferme:' + k.id); setOuverts(n); } else { const n = new Set(ouverts); n.add(k.id); n.delete('ferme:' + k.id); setOuverts(n); } }}>{ouvert ? '▾' : '▸'}</button> : <span class="pli" />}
            <Icone nom={ICONES[k.tag] || (attr(k, 'data-gdb') ? 'plus' : 'section')} taille={14} />
            <span class="nom">{nomElement(k)}</span>
            {texte ? <span class="extrait">{texte}</span> : null}
          </li>
        ))}
      </ul>
      <p class="aide-ligne">Glissez une ligne sur une autre pour déplacer l’élément (haut = avant, milieu = dedans, bas = après).</p>
    </div>
  );
}
