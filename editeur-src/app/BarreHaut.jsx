// Barre du haut : page, annuler/rétablir, appareils, zoom, aperçu, publication, compte
import { useState } from 'preact/hooks';
import { etat, maj, useEtat, docCourant } from './etat.js';
import { annuler, retablir, docsModifies } from './actions.js';
import { deconnecter } from './auth.js';
import { Bouton, Segments } from './ui/base.jsx';
import { Icone } from './ui/icones.jsx';
import { titreCourt, urlPage } from './site.js';

export function BarreHaut() {
  useEtat((e) => e.rev);
  const courant = useEtat((e) => e.courant);
  const appareil = useEtat((e) => e.appareil);
  const zoom = useEtat((e) => e.zoom);
  const qui = useEtat((e) => e.qui);
  useEtat((e) => e.titres);
  const [menu, setMenu] = useState(false);
  const d = docCourant();
  const nbPages = docsModifies().length;
  const derniere = d && d.position ? d.etapes[d.position - 1] : null;
  const suivante = d && d.peutRetablir() ? d.etapes[d.position] : null;
  return (
    <header class="barre-haut">
      <div class="marque"><img src="/img/logo/favicon.svg" alt="" width="22" height="22" /><strong>Éditeur</strong></div>
      <button type="button" class="choix-page" onClick={() => maj({ panneau: 'pages', panneauOuvert: true })} title="Changer de page">
        <Icone nom="pages" taille={16} />
        <span class="choix-page-titre">{d && d.nouvelle ? d.nouvelle.h1 || d.nouvelle.titre : courant ? titreCourt(courant) : '…'}</span>
        <span class="choix-page-url">{courant ? urlPage(courant) : ''}</span>
        {d && d.nouvelle ? <span class="badge badge-nouveau">nouvelle</span> : null}
      </button>
      <div class="groupe">
        <Bouton icone="annuler" variante="fantome" titre={derniere ? 'Annuler : ' + (derniere.libelle || 'dernière modification') + ' (Ctrl+Z)' : 'Rien à annuler'} desactive={!d || !d.peutAnnuler()} onClick={annuler} />
        <Bouton icone="retablir" variante="fantome" titre={suivante ? 'Rétablir : ' + (suivante.libelle || 'modification') + ' (Ctrl+Y)' : 'Rien à rétablir'} desactive={!d || !d.peutRetablir()} onClick={retablir} />
      </div>
      <span class="espace" />
      <Segments petit valeur={appareil} surChange={(v) => maj({ appareil: v })} options={[
        { valeur: 'ordinateur', icone: 'ordinateur', titre: 'Ordinateur (1440 px)' },
        { valeur: 'tablette', icone: 'tablette', titre: 'Tablette (820 px)' },
        { valeur: 'telephone', icone: 'telephone', titre: 'Téléphone (390 px)' },
        { valeur: 'cote', icone: 'cote', libelle: 'PC + mobile', titre: 'Ordinateur et téléphone côte à côte' },
      ]} />
      <select class="zoom" value={zoom} onChange={(e) => maj({ zoom: e.currentTarget.value === 'ajuste' ? 'ajuste' : Number(e.currentTarget.value) })} title="Zoom">
        <option value="ajuste">Ajusté</option>
        <option value="0.5">50 %</option>
        <option value="0.75">75 %</option>
        <option value="1">100 %</option>
      </select>
      <span class="espace" />
      <Bouton icone="oeil" variante="fantome" titre="Aperçu plein écran (ordinateur et téléphone)" onClick={() => maj({ apercuPlein: !etat.apercuPlein })}>Aperçu</Bouton>
      <a class="btn-e btn-fantome seul" href={courant ? urlPage(courant) : '/'} target="_blank" rel="noopener" title="Voir la page publiée (nouvel onglet)"><Icone nom="externe" taille={17} /></a>
      <Bouton icone="fusee" variante="principal" onClick={() => maj({ modale: { type: 'publier' } })} desactive={!nbPages} titre={nbPages ? 'Vérifier et publier' : 'Aucune modification à publier'}>
        Publier{nbPages ? <span class="pastille">{nbPages}</span> : null}
      </Bouton>
      <div class="compte">
        <button type="button" class="avatar" onClick={() => setMenu(!menu)} title={qui ? qui.nom + ' — ' + qui.email : ''}>{qui ? qui.nom.slice(0, 1).toUpperCase() : '?'}</button>
        {menu ? (
          <div class="menu-compte" onMouseLeave={() => setMenu(false)}>
            <p><strong>{qui && qui.nom}</strong><br /><small>{qui && qui.email}</small>{qui && qui.admin ? <><br /><span class="badge badge-ok">admin</span></> : null}</p>
            {qui && qui.admin ? <button type="button" onClick={() => { setMenu(false); maj({ modale: { type: 'reglages' } }); }}><Icone nom="reglages" /> Réglages de l’éditeur</button> : null}
            <button type="button" onClick={() => { setMenu(false); maj({ modale: { type: 'aide' } }); }}><Icone nom="clavier" /> Aide et raccourcis</button>
            <button type="button" onClick={() => { setMenu(false); maj({ modale: { type: 'signaler' } }); }}><Icone nom="signaler" /> Signaler un problème à Allan</button>
            <button type="button" onClick={() => deconnecter()}><Icone nom="sortir" /> Se déconnecter</button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
