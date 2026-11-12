// Panneau de gauche : rail d'icônes + panneau actif
import { useEtat, maj } from './etat.js';
import { Icone } from './ui/icones.jsx';
import { Bouton } from './ui/base.jsx';
import { PanneauAjouter } from './panneaux/Ajouter.jsx';
import { PanneauCalques } from './panneaux/Calques.jsx';
import { PanneauPages } from './panneaux/Pages.jsx';
import { PanneauMedias } from './panneaux/Medias.jsx';
import { PanneauRecherche } from './panneaux/Recherche.jsx';
import { PanneauSeo } from './panneaux/Seo.jsx';
import { PanneauVerifier } from './panneaux/Verifier.jsx';
import { PanneauAssistant } from './panneaux/Assistant.jsx';
import { PanneauHistorique } from './panneaux/Historique.jsx';

export const PANNEAUX = [
  { id: 'ajouter', nom: 'Ajouter', icone: 'plus', C: PanneauAjouter },
  { id: 'calques', nom: 'Calques', icone: 'calques', C: PanneauCalques },
  { id: 'pages', nom: 'Pages', icone: 'pages', C: PanneauPages },
  { id: 'medias', nom: 'Médias', icone: 'image', C: PanneauMedias },
  { id: 'recherche', nom: 'Rechercher', icone: 'chercher', C: PanneauRecherche },
  { id: 'seo', nom: 'Google', icone: 'google', C: PanneauSeo },
  { id: 'verifier', nom: 'Vérifier', icone: 'verifier', C: PanneauVerifier },
  { id: 'assistant', nom: 'Assistant', icone: 'assistant', C: PanneauAssistant },
  { id: 'historique', nom: 'Historique', icone: 'historique', C: PanneauHistorique },
];

export function PanneauGauche() {
  const panneau = useEtat((e) => e.panneau);
  const ouvert = useEtat((e) => e.panneauOuvert);
  const apercu = useEtat((e) => e.apercuPlein);
  if (apercu) return null;
  const P = PANNEAUX.find((p) => p.id === panneau) || PANNEAUX[0];
  return (
    <div class="gauche">
      <nav class="rail" aria-label="Outils">
        {PANNEAUX.map((p) => (
          <button type="button" class={p.id === panneau && ouvert ? 'actif' : ''} title={p.nom}
            onClick={() => maj({ panneau: p.id, panneauOuvert: !(p.id === panneau && ouvert) })}>
            <Icone nom={p.icone} taille={20} /><span>{p.nom}</span>
          </button>
        ))}
      </nav>
      {ouvert ? (
        <section class="panneau" aria-label={P.nom}>
          <header class="panneau-tete"><h2>{P.nom}</h2><Bouton icone="gauche" variante="fantome" petit titre="Replier" onClick={() => maj({ panneauOuvert: false })} /></header>
          <div class="panneau-corps"><P.C /></div>
        </section>
      ) : null}
    </div>
  );
}
