// Disposition générale de l'éditeur + connexion + raccourcis clavier
import { useEffect } from 'preact/hooks';
import { etat, maj, useEtat, toast, docCourant } from './etat.js';
import { surChangement, connecter, deconnecter, messageErreur } from './auth.js';
import { demarrer, annuler, retablir } from './actions.js';
import { Bouton, Toasts, Chargement, Modale } from './ui/base.jsx';
import { Icone } from './ui/icones.jsx';
import { BarreHaut } from './BarreHaut.jsx';
import { PanneauGauche } from './PanneauGauche.jsx';
import { ZoneCanevas } from './ZoneCanevas.jsx';
import { Inspecteur } from './Inspecteur.jsx';
import { Modales } from './Modales.jsx';
import { MenuContextuel } from './MenuContextuel.jsx';

export function App() {
  const connexion = useEtat((e) => e.connexion);
  const config = useEtat((e) => e.config);
  useEffect(() => {
    let stop = () => {};
    surChangement(async (u) => {
      if (!u) { maj({ connexion: 'deconnecte', qui: null }); return; }
      maj({ connexion: 'verification' });
      try { await demarrer(); } catch (e) {
        maj({ connexion: 'refus', erreurConnexion: e.message || String(e) });
      }
    }).then((s) => { stop = s; }).catch((e) => maj({ connexion: 'deconnecte', erreurConnexion: messageErreur(e) }));
    return () => stop();
  }, []);

  useEffect(() => {
    const touche = (e) => {
      const cible = e.target;
      const saisie = cible && (cible.tagName === 'INPUT' || cible.tagName === 'TEXTAREA' || cible.isContentEditable || cible.tagName === 'SELECT');
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); maj({ modale: { type: 'palette' } }); return; }
      if (saisie) return;
      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); annuler(); }
      else if (mod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); retablir(); }
      else if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); toast('Vos modifications sont enregistrées automatiquement en brouillon.', 'info'); }
      else if (e.key === '?' ) maj({ modale: { type: 'aide' } });
      else if (window.__gdxClavier) window.__gdxClavier(e);
    };
    window.addEventListener('keydown', touche);
    const quitter = (e) => {
      const modifs = Object.values(etat.docs).some((d) => d.modifie);
      if (modifs) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', quitter);
    return () => { window.removeEventListener('keydown', touche); window.removeEventListener('beforeunload', quitter); };
  }, []);

  if (connexion !== 'connecte') return <><Connexion /><Toasts /></>;
  if (config && !config.github) return <NonConfigure />;
  return (
    <div class="editeur">
      <BarreHaut />
      <div class="corps-editeur">
        <PanneauGauche />
        <ZoneCanevas />
        <Inspecteur />
      </div>
      <BarreEtat />
      <Modales />
      <MenuContextuel />
      <Toasts />
    </div>
  );
}

function Connexion() {
  const connexion = useEtat((e) => e.connexion);
  const erreur = useEtat((e) => e.erreurConnexion);
  const go = async () => {
    maj({ erreurConnexion: null });
    try { await connecter(); } catch (e) { maj({ erreurConnexion: messageErreur(e) }); }
  };
  return (
    <div class="ecran-connexion">
      <div class="carte-connexion">
        <img src="/img/logo/logo-horizontal.svg" alt="GAMEDOOR·41" width="224" height="32" />
        <h1>Éditeur du site</h1>
        <p>Modifiez gamedoor41.fr en direct, voyez le résultat sur ordinateur et sur téléphone, puis publiez. On peut tout ajouter et tout modifier — on ne supprime jamais un contenu publié.</p>
        {connexion === 'attente' || connexion === 'verification' ? <Chargement texte={connexion === 'verification' ? 'Vérification de votre compte Synergia…' : 'Chargement…'} /> : (
          <Bouton variante="principal" icone="utilisateur" onClick={go}>Se connecter avec Google (@gamedoor41.fr)</Bouton>
        )}
        {erreur ? <p class="erreur-connexion"><Icone nom="alerte" /> {erreur}</p> : null}
        {connexion === 'refus' ? <Bouton variante="fantome" icone="sortir" onClick={() => deconnecter()}>Changer de compte</Bouton> : null}
        <p class="petit-texte">Accès réservé aux membres actifs de l’équipe (compte Synergia actif), avec leur adresse Google @gamedoor41.fr.</p>
      </div>
    </div>
  );
}

function NonConfigure() {
  return (
    <div class="ecran-connexion">
      <div class="carte-connexion">
        <img src="/img/logo/logo-horizontal.svg" alt="GAMEDOOR·41" width="224" height="32" />
        <h1>Éditeur presque prêt</h1>
        <p>Votre accès est validé, mais l’éditeur n’est pas encore relié au dépôt du site : Allan doit ajouter le jeton GitHub de l’éditeur dans Netlify (variable <code>EDITEUR_GITHUB_TOKEN</code>).</p>
        <Bouton variante="fantome" icone="sortir" onClick={() => deconnecter()}>Se déconnecter</Bouton>
      </div>
    </div>
  );
}

function BarreEtat() {
  useEtat((e) => e.rev);
  const courant = useEtat((e) => e.courant);
  const presences = useEtat((e) => e.presences);
  const sauvegarde = useEtat((e) => e.derniereSauvegarde);
  const chargement = useEtat((e) => e.chargement);
  const d = docCourant();
  const ici = presences.filter((p) => p.chemin === courant);
  const ailleurs = presences.filter((p) => p.chemin !== courant);
  return (
    <footer class="barre-etat">
      <span>{d ? (d.position ? d.position + ' modification' + (d.position > 1 ? 's' : '') + ' en cours sur cette page' : 'Aucune modification sur cette page') : ''}</span>
      {chargement ? <span class="etat-charge"><span class="roue petite" />{chargement}</span> : null}
      <span class="espace" />
      {ici.length ? <span class="presence-alerte"><Icone nom="equipe" taille={14} /> {ici.map((p) => p.nom).join(', ')} modifie aussi cette page</span> : null}
      {ailleurs.length ? <span title={ailleurs.map((p) => p.nom + ' : /' + (p.chemin || '').replace(/index\.html$/, '')).join('\n')}><Icone nom="equipe" taille={14} /> {ailleurs.length} autre{ailleurs.length > 1 ? 's' : ''} en ligne</span> : null}
      <span>{sauvegarde === 'erreur' ? 'Brouillon gardé sur cet appareil' : sauvegarde ? 'Brouillon enregistré' : ''}</span>
    </footer>
  );
}

export { Modale };
