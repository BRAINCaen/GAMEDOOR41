// Menu du clic droit (ou bouton « … » de la barre flottante)
import { useEffect } from 'preact/hooks';
import { maj, useEtat, docCourant } from './etat.js';
import { infos } from './moteur.js';
import { monter, descendre, dupliquer, supprimer, selectionnerParent, copier, coller, copierStyle, collerStyle, reinitialiserStyle, estDansZoneCommune } from './commandes.js';
import { ajoutPropageable, propagerAjout } from './actions.js';
import { Icone } from './ui/icones.jsx';

export function MenuContextuel() {
  const menu = useEtat((e) => e.menu);
  useEffect(() => {
    if (!menu) return;
    const fermer = () => maj({ menu: null });
    const t = setTimeout(() => window.addEventListener('mousedown', fermer, { once: true }), 0);
    return () => { clearTimeout(t); window.removeEventListener('mousedown', fermer); };
  }, [menu]);
  if (!menu || !menu.id) return null;
  const d = docCourant();
  const i = d && infos(d.page, menu.id);
  if (!i) return null;
  const zone = estDansZoneCommune(i.id);
  const propageable = i.nouveau && ajoutPropageable(i.id);
  const aTexte = i.segments.some((s) => !s.vide) || i.texteRiche;
  const item = (icone, texte, f, opts = {}) => (
    <button type="button" class={opts.danger ? 'danger' : ''} disabled={opts.desactive} title={opts.titre} onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); maj({ menu: null }); f(); }}>
      <Icone nom={icone} taille={15} /> <span>{texte}</span>{opts.raccourci ? <kbd>{opts.raccourci}</kbd> : null}
    </button>
  );
  const x = Math.min(menu.x, window.innerWidth - 270);
  const y = Math.min(menu.y, window.innerHeight - 440);
  return (
    <div class="menu-contextuel" style={{ left: x + 'px', top: y + 'px' }} onMouseDown={(e) => e.stopPropagation()}>
      <p class="mc-titre">{i.nom}{i.nouveau ? ' · ajouté' : ''}</p>
      {aTexte ? item('crayon', 'Modifier le texte', () => maj({ edition: String(i.id) }), { raccourci: 'Entrée' }) : null}
      {i.tag === 'img' ? item('image', 'Remplacer l’image', () => maj({ modale: { type: 'media', but: 'remplacer', id: i.id } })) : null}
      {item('parent', 'Sélectionner le conteneur', () => selectionnerParent(i.id), { raccourci: 'Échap' })}
      <hr />
      {item('haut', 'Monter', () => monter(i.id), { raccourci: 'Alt+↑' })}
      {item('bas', 'Descendre', () => descendre(i.id), { raccourci: 'Alt+↓' })}
      {item('dupliquer', 'Dupliquer', () => dupliquer(i.id), { raccourci: 'Ctrl+D' })}
      {item('copier', 'Copier', () => copier(i.id), { raccourci: 'Ctrl+C' })}
      {item('coller', 'Coller après', () => coller(i.id), { raccourci: 'Ctrl+V' })}
      {item('plus', 'Ajouter un bloc après…', () => maj({ panneau: 'ajouter', panneauOuvert: true }))}
      {propageable ? item('pages', 'Ajouter aussi sur toutes les pages', () => propagerAjout(i.id)) : null}
      <hr />
      {item('copier', 'Copier le style', () => copierStyle(i.id))}
      {item('coller', 'Coller le style', () => collerStyle(i.id))}
      {i.cleStyle ? item('annuler', 'Revenir au style d’origine', () => reinitialiserStyle(i.id)) : null}
      {item('reglages', 'Modifier le style…', () => maj({ ongletInspecteur: 'style', inspecteurOuvert: true }))}
      {zone ? <p class="mc-note">Fait partie du {zone} commun : l’inspecteur propose de recopier vos changements sur toutes les pages.</p> : null}
      <hr />
      {i.nouveau
        ? item('poubelle', 'Retirer cet ajout (pas encore publié)', () => supprimer(i.id), { danger: true, raccourci: 'Suppr' })
        : item('cadenas', 'Supprimer : interdit (contenu publié)', () => supprimer(i.id), { titre: 'On ne supprime jamais un contenu publié' })}
      {item('signaler', 'Signaler un problème à Allan', () => maj({ modale: { type: 'signaler' } }))}
    </div>
  );
}
