// Disposition générale de l'éditeur + connexion + raccourcis clavier
import { useEffect, useState } from 'preact/hooks';
import { etat, maj, useEtat, toast, docCourant } from './etat.js';
import { surChangement, connecter, connecterPleinePage, connecterMotDePasse, motDePasseOublie, deconnecter, messageErreur, navigateurIntegre } from './auth.js';
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
  const code = useEtat((e) => e.codeErreurConnexion);
  const [adresse, setAdresse] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const appli = navigateurIntegre();
  const echec = (e) => maj({ erreurConnexion: messageErreur(e), codeErreurConnexion: (e && e.code) || 'inconnu' });
  const go = () => {
    // la fenêtre Google s'ouvre ICI, dans le clic, avant toute autre chose
    const p = connecter();
    maj({ erreurConnexion: null, codeErreurConnexion: null });
    p.catch(echec);
  };
  const pleinePage = () => { connecterPleinePage().catch(echec); };
  const parMotDePasse = (ev) => {
    ev.preventDefault();
    if (envoi) return;
    maj({ erreurConnexion: null, codeErreurConnexion: null });
    setEnvoi(true);
    connecterMotDePasse(adresse, motDePasse).catch(echec).finally(() => setEnvoi(false));
  };
  const oublie = () => {
    const a = adresse.trim();
    if (!a) { maj({ erreurConnexion: 'Saisissez d’abord votre adresse ci-dessus, puis cliquez sur « Mot de passe oublié ».', codeErreurConnexion: null }); return; }
    motDePasseOublie(a).then(() => toast('Si un compte Synergia existe pour ' + a + ', un lien pour choisir un nouveau mot de passe vient d’y être envoyé.', 'succes')).catch(echec);
  };
  const copier = () => {
    const url = location.origin + '/editeur/';
    try { navigator.clipboard.writeText(url).then(() => toast('Adresse copiée : collez-la dans Chrome ou Safari.', 'succes')); } catch (_) { window.prompt('Copiez cette adresse :', url); }
  };
  const occupe = connexion === 'attente' || connexion === 'verification';
  return (
    <div class="ecran-connexion">
      <div class="carte-connexion">
        <img src="/img/logo/logo-horizontal.svg" alt="GAMEDOOR·41" width="224" height="32" />
        <h1>Éditeur du site</h1>
        <p>Modifiez gamedoor41.fr en direct, voyez le résultat sur ordinateur et sur téléphone, puis publiez. On peut tout ajouter et tout modifier — on ne supprime jamais un contenu publié.</p>
        {appli ? (
          <div class="erreur-connexion">
            <Icone nom="alerte" />
            <span>Vous avez ouvert cette page dans {appli === 'une application' ? 'le navigateur d’une application' : appli}. Google y refuse souvent la connexion : ouvrez plutôt <b>gamedoor41.fr/editeur/</b> dans Chrome ou Safari, ou connectez-vous plus bas avec l’adresse et le mot de passe de Synergia.<br /><button type="button" class="lien" onClick={copier}>Copier l’adresse</button></span>
          </div>
        ) : null}
        {occupe ? <Chargement texte={connexion === 'verification' ? 'Vérification de votre compte Synergia…' : 'Chargement…'} /> : (
          <>
            <Bouton variante="principal" icone="utilisateur" onClick={go}>Se connecter avec Google</Bouton>
            <p class="petit-texte">Votre compte Google @gamedoor41.fr, ou celui avec lequel vous vous connectez à Synergia.</p>
            <div class="separateur-connexion"><span>ou avec le mot de passe Synergia</span></div>
            <form class="form-connexion" onSubmit={parMotDePasse}>
              <label class="champ"><span class="champ-libelle">Adresse e-mail</span><input type="email" name="email" autocomplete="username" value={adresse} onInput={(e) => setAdresse(e.currentTarget.value)} required /></label>
              <label class="champ"><span class="champ-libelle">Mot de passe</span><input type="password" name="password" autocomplete="current-password" value={motDePasse} onInput={(e) => setMotDePasse(e.currentTarget.value)} required /></label>
              <Bouton type="submit" variante="normal" icone="cadenas" desactive={envoi}>{envoi ? 'Connexion…' : 'Se connecter'}</Bouton>
              <button type="button" class="lien" onClick={oublie}>Mot de passe oublié ?</button>
            </form>
          </>
        )}
        {erreur ? <p class="erreur-connexion"><Icone nom="alerte" /> <span>{erreur}</span></p> : null}
        {code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment' ? <Bouton variante="fantome" icone="externe" onClick={pleinePage}>Se connecter avec Google en pleine page</Bouton> : null}
        {connexion === 'refus' ? <Bouton variante="fantome" icone="sortir" onClick={() => deconnecter()}>Changer de compte</Bouton> : null}
        <p class="petit-texte">Accès réservé aux membres actifs de l’équipe dans Synergia.</p>
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
