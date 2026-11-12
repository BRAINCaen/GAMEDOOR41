// Fenêtres : publication, nouvelle page, choix d'image, réglages, aide, palette, signalement
import { useState, useEffect, useRef, useMemo } from 'preact/hooks';
import qrcode from 'qrcode-generator';
import { etat, maj, useEtat, toast, docCourant } from './etat.js';
import { docsModifies, preparerLot, apresPublication, verifierEnLigne, travail, nouvellePage, ouvrirPage, ajouterAuMenu, appliquer, annuler, retablir } from './actions.js';
import { appel } from './api.js';
import { resumerOperation } from '../noyau/resume.mjs';
import { slugifier, CHEMIN_PAGE_RE } from '../noyau/pages.mjs';
import { REGLES_DEFAUT } from '../noyau/relecture.mjs';
import { controlesContraste } from './panneaux/Verifier.jsx';
import { GrilleMedias, remplacerImage } from './panneaux/Medias.jsx';
import { modifierStyle, insererHtml } from './commandes.js';
import { BLOCS } from './blocs/catalogue.js';
import { PANNEAUX } from './PanneauGauche.jsx';
import { Modale, Bouton, Champ, Saisie, Interrupteur, Chargement, Segments, Badge } from './ui/base.jsx';
import { Icone } from './ui/icones.jsx';
import { titreCourt, urlPage } from './site.js';

export function Modales() {
  const m = useEtat((e) => e.modale);
  if (!m) return null;
  const fermer = () => maj({ modale: null });
  switch (m.type) {
    case 'publier': return <Publier fermer={fermer} />;
    case 'nouvelle-page': return <NouvellePage fermer={fermer} />;
    case 'media': return <ChoixMedia m={m} fermer={fermer} />;
    case 'reglages': return <Reglages fermer={fermer} />;
    case 'aide': return <Aide fermer={fermer} />;
    case 'palette': return <Palette fermer={fermer} />;
    case 'signaler': return <Signaler fermer={fermer} />;
    default: return null;
  }
}

// ---------------------------------------------------------------- PUBLIER
function Qr({ texte }) {
  const svg = useMemo(() => { const q = qrcode(0, 'M'); q.addData(texte); q.make(); return q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); }, [texte]);
  return <div class="qr" dangerouslySetInnerHTML={{ __html: svg }} />;
}

function Publier({ fermer }) {
  useEtat((e) => e.rev);
  const regles = etat.reglages && etat.reglages.regles;
  const docs = docsModifies();
  const [coches, setCoches] = useState(() => new Set(docs.map((d) => d.chemin)));
  const [message, setMessage] = useState('');
  const [phase, setPhase] = useState('choix'); // choix | travail | apercu | publie | erreur
  const [etapes, setEtapes] = useState([]);
  const [resultat, setResultat] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [verif, setVerif] = useState(null);
  const [quand, setQuand] = useState('');
  const [statutApercu, setStatutApercu] = useState(null);
  const [lotCourant, setLotCourant] = useState(null);

  const pagesExistantes = new Set(etat.pages.filter((p) => p.chemin.endsWith('index.html')).map((p) => '/' + p.chemin.replace(/index\.html$/, '')));
  for (const d of docs) if (d.nouvelle) pagesExistantes.add('/' + d.nouvelle.slug + '/');
  const choisis = docs.filter((d) => coches.has(d.chemin));
  const relectures = choisis.map((d) => ({ d, liste: [...d.relecture({ regles, pagesExistantes }), ...(d.chemin === etat.courant ? controlesContraste(d.page) : [])] }));
  const bloquants = relectures.flatMap((r) => r.liste.filter((x) => x.niveau === 'bloquant').map((x) => ({ ...x, chemin: r.d.chemin })));
  const attentions = relectures.flatMap((r) => r.liste.filter((x) => x.niveau === 'attention').map((x) => ({ ...x, chemin: r.d.chemin })));
  const pret = choisis.length && !bloquants.length && message.trim().length >= 5;

  // suivi de l'aperçu en ligne (déploiement Netlify)
  useEffect(() => {
    if (phase !== 'apercu' || !resultat) return;
    let fini = false;
    const tour = async () => {
      try {
        const s = await appel('statut?pr=' + resultat.pr);
        if (!fini) setStatutApercu(s);
        if (s.apercu.etat === 'pret' || s.apercu.etat === 'echec') return;
      } catch (_) { /* on réessaie */ }
      if (!fini) setTimeout(tour, 5000);
    };
    tour();
    return () => { fini = true; };
  }, [phase, resultat]);

  const lancer = async (type) => {
    setPhase('travail'); setEtapes([]); setErreur(null);
    try {
      let lot = lotCourant;
      if (!lot || type !== 'publier' || !resultat) {
        const r = await preparerLot([...coches], message.trim());
        if (r.perdues.length) {
          const txt = r.perdues.map((p) => '/' + p.chemin.replace(/index\.html$/, '') + ' : ' + p.pertes.length + ' modification(s)').join('\n');
          if (!confirm('Ces pages ont été modifiées sur le site entre-temps et certaines de vos modifications ne s’appliquent plus :\n' + txt + '\n\nContinuer avec le reste ?')) { setPhase('choix'); return; }
        }
        lot = r.lot;
        setLotCourant(lot);
      }
      const donnees = { lot };
      if (type === 'publier' && resultat && resultat.pr && phase !== 'publie') donnees.pr = resultat.pr;
      if (type === 'programmer') donnees.quand = new Date(quand).toISOString();
      const res = await travail(type, donnees, (t) => setEtapes(t.etapes || []));
      setResultat(res);
      if (type === 'apercu') { setPhase('apercu'); return; }
      if (type === 'programmer') { setPhase('programme'); await apresPublication([...coches]); return; }
      setPhase('publie');
      const chemins = [...coches];
      await apresPublication(chemins);
      setVerif({ enCours: true });
      const v = await verifierEnLigne(res.fichiers || []);
      setVerif(v);
    } catch (e) {
      setErreur(e);
      setPhase('erreur');
    }
  };

  if (phase === 'travail') {
    return (
      <Modale titre="Publication en cours…" surFermer={null}>
        <ol class="etapes-travail">
          {etapes.map((e) => <li><Icone nom="ok" taille={14} /> {e.texte}</li>)}
          <li class="encours"><span class="roue petite" /> {etapes.length ? 'En cours…' : 'Préparation…'}</li>
        </ol>
        <p class="aide-ligne">Le serveur rejoue vos modifications sur la version du site et vérifie qu’aucun contenu publié n’est retiré.</p>
      </Modale>
    );
  }
  if (phase === 'erreur') {
    return (
      <Modale titre="Publication impossible" surFermer={fermer} pied={<><Bouton onClick={() => setPhase('choix')}>Revenir</Bouton><Bouton variante="fantome" onClick={fermer}>Fermer</Bouton></>}>
        <p class="note note-erreur"><Icone nom="alerte" /> {erreur.message}</p>
        {erreur.relecture ? <ul class="liste-relecture">{erreur.relecture.filter((r) => r.niveau === 'bloquant').map((r) => <li class="rl-bloquant"><span>{r.message} <em>{r.chemin}</em></span></li>)}</ul> : null}
        <p class="aide-ligne">Vos modifications restent enregistrées en brouillon : rien n’est perdu.</p>
      </Modale>
    );
  }
  if (phase === 'apercu') {
    const url = statutApercu && statutApercu.apercu.url ? statutApercu.apercu.url.replace(/\/$/, '') : null;
    const premier = (resultat.fichiers || []).find((f) => f.url);
    const lien = url && premier ? url + new URL(premier.url).pathname : null;
    return (
      <Modale titre="Aperçu en ligne" surFermer={fermer} large pied={<><Bouton variante="fantome" onClick={fermer}>Fermer (garder en brouillon)</Bouton><Bouton variante="principal" icone="fusee" onClick={() => lancer('publier')}>Publier cet aperçu sur le site</Bouton></>}>
        <p>Une copie privée du site avec vos modifications est en cours de préparation (environ 30 secondes). Ouvrez-la sur votre téléphone pour vérifier « en vrai ».</p>
        {lien ? (
          <div class="apercu-pret">
            <Qr texte={lien} />
            <div>
              <p><strong>Prêt !</strong> Scannez le code avec votre téléphone, ou :</p>
              <a class="btn-e btn-principal" href={lien} target="_blank" rel="noopener"><Icone nom="externe" /> <span>Ouvrir l’aperçu</span></a>
              <p class="aide-ligne">Cette adresse n’est pas référencée par Google.</p>
            </div>
          </div>
        ) : statutApercu && statutApercu.apercu.etat === 'echec' ? <p class="note note-erreur">La préparation de l’aperçu a échoué. Vous pouvez quand même publier : le serveur a vérifié vos modifications.</p> : <Chargement texte="Préparation de l’aperçu…" />}
      </Modale>
    );
  }
  if (phase === 'publie' || phase === 'programme') {
    return (
      <Modale titre={phase === 'programme' ? 'Publication programmée' : 'C’est publié !'} surFermer={fermer} pied={<Bouton variante="principal" onClick={fermer}>Terminer</Bouton>}>
        {phase === 'programme'
          ? <p><Icone nom="horloge" /> Vos modifications seront mises en ligne le <strong>{new Date(resultat.quand).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' })}</strong>. Vous pouvez annuler depuis le panneau Historique.</p>
          : <p><Icone nom="ok" /> Vos modifications sont envoyées sur le site.</p>}
        {phase === 'publie' ? (
          verif && verif.enCours ? <Chargement texte="Vérification que le site affiche la nouvelle version…" /> : verif ? (
            <p class={verif.enLigne === verif.total ? 'note note-ok' : 'note'}>{verif.enLigne === verif.total ? 'Vérifié : la nouvelle version est en ligne.' : 'Mise en ligne en cours (' + verif.enLigne + '/' + verif.total + ' page(s) vérifiée(s)) : cela peut prendre une minute de plus.'}</p>
          ) : null
        ) : null}
        <ul class="liens-publies">{(resultat.fichiers || []).filter((f) => f.url).map((f) => <li><a href={new URL(f.url).pathname} target="_blank" rel="noopener">{f.url}</a></li>)}</ul>
      </Modale>
    );
  }
  // phase « choix »
  return (
    <Modale titre="Publier sur le site" surFermer={fermer} large pied={
      <>
        <div class="programmer">
          <input type="datetime-local" value={quand} onInput={(e) => setQuand(e.currentTarget.value)} title="Date de publication programmée" />
          <Bouton icone="horloge" desactive={!pret || !quand} onClick={() => lancer('programmer')}>Programmer</Bouton>
        </div>
        <span class="espace" />
        <Bouton icone="oeil" desactive={!pret} onClick={() => lancer('apercu')}>Aperçu en ligne d’abord</Bouton>
        <Bouton variante="principal" icone="fusee" desactive={!pret} onClick={() => lancer('publier')}>Publier maintenant</Bouton>
      </>
    }>
      <Champ libelle="Qu’avez-vous modifié ? (une phrase)" aide="Visible dans l’historique de l’équipe.">
        <input value={message} onInput={(e) => setMessage(e.currentTarget.value)} placeholder="Ex. Ajout du bandeau des vacances de Noël sur l’accueil" maxLength={140} />
      </Champ>
      <h3 class="titre-section">Pages modifiées</h3>
      <ul class="pages-a-publier">
        {docs.map((d) => (
          <li>
            <label><input type="checkbox" checked={coches.has(d.chemin)} onChange={(e) => { const n = new Set(coches); if (e.currentTarget.checked) n.add(d.chemin); else n.delete(d.chemin); setCoches(n); }} />
              <strong>{d.nouvelle ? d.nouvelle.titre : titreCourt(d.chemin)}</strong> <small>{d.nouvelle ? '/' + d.nouvelle.slug + '/' : urlPage(d.chemin)}</small> {d.nouvelle ? <Badge type="nouveau">nouvelle page</Badge> : <Badge type="modifie">{d.position} modification(s)</Badge>}
            </label>
            <details>
              <summary>Voir le détail</summary>
              <ul class="resume-ops">{d.etapes.slice(0, d.position).map((e) => <li>{e.libelle || e.ops.map(resumerOperation).join(' · ')}</li>)}</ul>
            </details>
          </li>
        ))}
      </ul>
      {bloquants.length ? (
        <div class="note note-erreur">
          <strong><Icone nom="interdit" /> À corriger avant de publier :</strong>
          <ul>{bloquants.map((b) => <li>{b.message} <button type="button" class="lien" onClick={async () => { fermer(); await ouvrirPage(b.chemin); if (b.id) maj({ selection: b.id }); }}>Voir</button></li>)}</ul>
        </div>
      ) : null}
      {attentions.length ? (
        <details class="note">
          <summary><Icone nom="alerte" /> {attentions.length} point(s) à vérifier (non bloquants)</summary>
          <ul>{attentions.map((b) => <li>{b.message}{b.extrait ? <em> {b.extrait}</em> : null}</li>)}</ul>
        </details>
      ) : null}
      <p class="aide-ligne"><Icone nom="cadenas" taille={13} /> Le serveur vérifie de nouveau que rien de publié n’est retiré. Chaque publication est enregistrée et peut être retrouvée.</p>
    </Modale>
  );
}

// ---------------------------------------------------------------- NOUVELLE PAGE
function NouvellePage({ fermer }) {
  const pages = useEtat((e) => e.pages);
  useEtat((e) => e.titres);
  const [titre, setTitre] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouche, setSlugTouche] = useState(false);
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState('vierge');
  const [modele, setModele] = useState('contact/index.html');
  const [menu, setMenu] = useState(false);
  const [libMenu, setLibMenu] = useState('');
  const [encours, setEncours] = useState(false);
  const s = slugTouche ? slug : slugifier(titre);
  const existe = pages.some((p) => p.chemin === s + '/index.html');
  const valide = titre.trim().length >= 5 && description.trim().length >= 20 && CHEMIN_PAGE_RE.test(s) && !existe;
  const creer = async () => {
    setEncours(true);
    try {
      const titreComplet = /GAMEDOOR/i.test(titre) ? titre.trim() : titre.trim() + ' — GAMEDOOR·41';
      await nouvellePage({ slug: s, titre: titreComplet, description: description.trim(), h1: titre.trim(), mode, modele });
      if (menu) await ajouterAuMenu('/' + s + '/', libMenu.trim() || titre.trim());
      toast('Page créée en brouillon : ajoutez son contenu, puis publiez.', 'succes', 6000);
      maj({ panneau: 'ajouter', panneauOuvert: true });
      fermer();
    } catch (e) { toast(e.message, 'erreur', 7000); } finally { setEncours(false); }
  };
  return (
    <Modale titre="Nouvelle page" surFermer={fermer} pied={<><Bouton variante="fantome" onClick={fermer}>Annuler</Bouton><Bouton variante="principal" icone="plus" desactive={!valide || encours} onClick={creer}>Créer la page</Bouton></>}>
      <Champ libelle="Titre de la page"><input value={titre} onInput={(e) => setTitre(e.currentTarget.value)} placeholder="Ex. Soirée Halloween au quiz" /></Champ>
      <Champ libelle="Adresse" aide={existe ? 'Cette adresse existe déjà.' : 'Lettres minuscules, chiffres et tirets.'}>
        <div class="adresse"><span>gamedoor41.fr/</span><input value={s} onInput={(e) => { setSlugTouche(true); setSlug(e.currentTarget.value.toLowerCase()); }} /><span>/</span></div>
      </Champ>
      <Champ libelle="Description pour Google" compteur={description.length + ' car.'} aide="1 à 2 phrases (70 à 160 caractères) : ce que la personne trouvera sur la page.">
        <textarea rows={3} value={description} onInput={(e) => setDescription(e.currentTarget.value)} />
      </Champ>
      <Champ libelle="Contenu de départ">
        <Segments valeur={mode} surChange={setMode} options={[{ valeur: 'vierge', libelle: 'Page vierge (en-tête et pied du site)' }, { valeur: 'copie', libelle: 'Copie d’une page existante' }]} />
      </Champ>
      <Champ libelle={mode === 'copie' ? 'Page à copier' : 'Mise en page de référence'}>
        <select value={modele} onChange={(e) => setModele(e.currentTarget.value)}>
          {pages.filter((p) => p.chemin.endsWith('index.html')).map((p) => <option value={p.chemin}>{titreCourt(p.chemin)} ({urlPage(p.chemin)})</option>)}
        </select>
      </Champ>
      {mode === 'copie' ? <p class="note">Une copie reprend tout le texte de la page : réécrivez-le, sinon Google verra deux pages identiques.</p> : null}
      <Interrupteur valeur={menu} surChange={setMenu} libelle="Ajouter un lien vers cette page dans le menu de toutes les pages" />
      {menu ? <Champ libelle="Texte du lien dans le menu"><input value={libMenu} onInput={(e) => setLibMenu(e.currentTarget.value)} placeholder={titre} /></Champ> : null}
    </Modale>
  );
}

// ---------------------------------------------------------------- CHOIX D'IMAGE
function ChoixMedia({ m, fermer }) {
  const titre = { remplacer: 'Remplacer l’image', fond: 'Image de fond', poster: 'Image d’attente de la vidéo', og: 'Image de partage' }[m.but] || 'Choisir une image';
  const choisir = (media) => {
    if (m.but === 'remplacer') remplacerImage(m.id, media);
    else if (m.but === 'fond') modifierStyle(m.id, { [m.appareil || 'tous']: { 'background-image': 'url("' + media.src + '")', 'background-size': 'cover', 'background-position': 'center' } }, 'Image de fond');
    else if (m.but === 'poster') appliquer([{ op: 'attr', id: m.id, nom: 'poster', valeur: media.src }], 'Image d’attente de la vidéo');
    else if (m.but === 'og') appliquer([{ op: 'meta', image: media.src }], 'Image de partage');
    fermer();
  };
  return <Modale titre={titre} surFermer={fermer} large><GrilleMedias surChoix={choisir} /></Modale>;
}

// ---------------------------------------------------------------- RÉGLAGES (admins)
function Reglages({ fermer }) {
  const [r, setR] = useState(null);
  const [encours, setEncours] = useState(false);
  useEffect(() => { appel('reglages').then((x) => setR(JSON.parse(JSON.stringify(x.reglages)))).catch((e) => toast(e.message, 'erreur')); }, []);
  if (!r) return <Modale titre="Réglages de l’éditeur" surFermer={fermer}><Chargement /></Modale>;
  const majRegle = (k, champ, v) => setR({ ...r, regles: r.regles.map((x, j) => (j === k ? { ...x, [champ]: v } : x)) });
  const enregistrer = async () => {
    setEncours(true);
    try { const x = await appel('reglages', { methode: 'PUT', corps: r }); maj({ reglages: x.reglages }); toast('Réglages enregistrés.', 'succes'); fermer(); } catch (e) { toast(e.message, 'erreur'); } finally { setEncours(false); }
  };
  const PRIX = { 'claude-opus-5-5': 'Claude Opus 5.5 — le plus fiable · ≈ 0,15 à 0,30 $ par demande', 'claude-sonnet-5-5': 'Claude Sonnet 5.5 — rapide · ≈ 0,08 à 0,15 $ par demande', 'claude-haiku-5-5': 'Claude Haiku 5.5 — économique · moins de 0,01 $ par demande' };
  return (
    <Modale titre="Réglages de l’éditeur (admins)" surFermer={fermer} large pied={<><Bouton variante="fantome" onClick={fermer}>Annuler</Bouton><Bouton variante="principal" desactive={encours} onClick={enregistrer}>Enregistrer</Bouton></>}>
      <h3 class="titre-section">Assistant IA</h3>
      <Interrupteur valeur={r.ia.active} surChange={(v) => setR({ ...r, ia: { ...r.ia, active: v } })} libelle="Assistant activé pour l’équipe" />
      <div class="deux-colonnes">
        <Champ libelle="Modèle">
          <select value={r.ia.modele} onChange={(e) => setR({ ...r, ia: { ...r.ia, modele: e.currentTarget.value } })}>
            {Object.entries(PRIX).map(([k, v]) => <option value={k}>{v}</option>)}
          </select>
        </Champ>
        <Champ libelle="Plafond de demandes par jour" aide={'Pire cas ≈ ' + Math.round(r.ia.plafondJour * (r.ia.modele === 'claude-opus-5-5' ? 0.3 : r.ia.modele === 'claude-sonnet-5-5' ? 0.15 : 0.01) * 30) + ' $ par mois si le plafond est atteint tous les jours.'}>
          <input type="number" min="0" max="500" value={r.ia.plafondJour} onInput={(e) => setR({ ...r, ia: { ...r.ia, plafondJour: Number(e.currentTarget.value) } })} />
        </Champ>
        <Champ libelle="Réflexion">
          <select value={r.ia.effort} onChange={(e) => setR({ ...r, ia: { ...r.ia, effort: e.currentTarget.value } })}><option value="low">Rapide</option><option value="medium">Équilibrée</option><option value="high">Approfondie (plus cher)</option></select>
        </Champ>
      </div>
      <h3 class="titre-section">Règles de relecture (avant chaque publication)</h3>
      <p class="aide-ligne">Expression recherchée (sans tenir compte des majuscules), niveau, message affiché. « Bloquant » empêche la publication.</p>
      <table class="regles">
        <thead><tr><th>Expression</th><th>Niveau</th><th>Message</th><th /></tr></thead>
        <tbody>
          {r.regles.map((x, k) => (
            <tr>
              <td><input value={x.motif} onInput={(e) => majRegle(k, 'motif', e.currentTarget.value)} /></td>
              <td><select value={x.niveau} onChange={(e) => majRegle(k, 'niveau', e.currentTarget.value)}><option value="bloquant">Bloquant</option><option value="attention">À vérifier</option><option value="info">Conseil</option></select></td>
              <td><input value={x.message} onInput={(e) => majRegle(k, 'message', e.currentTarget.value)} /></td>
              <td><Bouton petit variante="fantome" icone="fermer" titre="Retirer la règle" onClick={() => setR({ ...r, regles: r.regles.filter((_, j) => j !== k) })} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div class="ligne-boutons">
        <Bouton petit icone="plus" onClick={() => setR({ ...r, regles: [...r.regles, { motif: '', niveau: 'attention', message: '' }] })}>Ajouter une règle</Bouton>
        <Bouton petit variante="fantome" onClick={() => setR({ ...r, regles: REGLES_DEFAUT })}>Revenir aux règles par défaut</Bouton>
      </div>
      {r.maj ? <p class="aide-ligne">Dernière modification : {new Date(r.maj).toLocaleString('fr-FR')} par {r.majPar}.</p> : null}
    </Modale>
  );
}

// ---------------------------------------------------------------- AIDE
function Aide({ fermer }) {
  const T = [
    ['Clic', 'Sélectionner un élément'], ['Double-clic / Entrée', 'Modifier le texte dans la page'], ['Échap', 'Sélectionner le conteneur'],
    ['↑ ↓ ← →', 'Passer à l’élément voisin / parent / enfant'], ['Alt + ↑ / ↓', 'Monter / descendre l’élément'], ['Ctrl + D', 'Dupliquer'],
    ['Ctrl + C / V', 'Copier / coller un élément'], ['Ctrl + Z / Y', 'Annuler / rétablir (sans limite)'], ['Suppr', 'Retirer un ajout pas encore publié'],
    ['Ctrl + K', 'Palette de commandes (tout chercher)'], ['Maj + Entrée', 'Retour à la ligne dans un texte'], ['?', 'Cette aide'],
  ];
  return (
    <Modale titre="Aide et raccourcis" surFermer={fermer} large>
      <div class="aide-grille">
        <section>
          <h3>Les règles</h3>
          <ul>
            <li><strong>On peut tout ajouter et tout modifier.</strong> Textes, liens, images, styles, sections, pages entières.</li>
            <li><strong>On ne supprime jamais un contenu publié.</strong> L’éditeur et le serveur le refusent. Un ajout pas encore publié peut être retiré.</li>
            <li>Chaque modification se voit tout de suite sur ordinateur et sur téléphone (bouton « PC + mobile »).</li>
            <li>Vos modifications sont gardées en brouillon (sur cet appareil et sur le serveur) jusqu’à la publication.</li>
            <li>Avant publication : relecture automatique (règles de la maison, images sans description, textes d’exemple…).</li>
            <li>« Aperçu en ligne » crée une copie privée du site à ouvrir sur votre téléphone (code QR).</li>
            <li>Jamais d’image ou de vidéo générée par IA. L’assistant ne rédige que du texte, que vous relisez.</li>
          </ul>
        </section>
        <section>
          <h3>Raccourcis</h3>
          <table class="raccourcis">{T.map(([k, v]) => <tr><td><kbd>{k}</kbd></td><td>{v}</td></tr>)}</table>
        </section>
      </div>
    </Modale>
  );
}

// ---------------------------------------------------------------- PALETTE (Ctrl+K)
function Palette({ fermer }) {
  const [q, setQ] = useState('');
  const [i, setI] = useState(0);
  const champ = useRef(null);
  useEffect(() => { if (champ.current) champ.current.focus(); }, []);
  const pages = etat.pages;
  const actions = [
    { nom: 'Publier…', icone: 'fusee', f: () => maj({ modale: { type: 'publier' } }) },
    { nom: 'Nouvelle page…', icone: 'plus', f: () => maj({ modale: { type: 'nouvelle-page' } }) },
    { nom: 'Annuler', icone: 'annuler', f: annuler },
    { nom: 'Rétablir', icone: 'retablir', f: retablir },
    { nom: 'Aperçu ordinateur + téléphone', icone: 'cote', f: () => maj({ appareil: 'cote' }) },
    { nom: 'Aperçu plein écran', icone: 'oeil', f: () => maj({ apercuPlein: true }) },
    { nom: 'Aide et raccourcis', icone: 'clavier', f: () => maj({ modale: { type: 'aide' } }) },
    ...PANNEAUX.map((p) => ({ nom: 'Ouvrir : ' + p.nom, icone: p.icone, f: () => maj({ panneau: p.id, panneauOuvert: true }) })),
    ...pages.filter((p) => p.chemin.endsWith('index.html')).map((p) => ({ nom: 'Page : ' + titreCourt(p.chemin), detail: urlPage(p.chemin), icone: 'pages', f: () => ouvrirPage(p.chemin) })),
    ...BLOCS.map((b) => ({ nom: 'Ajouter : ' + b.nom, icone: 'plus', f: () => insererHtml(b.html(), 'Bloc ajouté : ' + b.nom) })),
  ];
  const f = q.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const liste = actions.filter((a) => !f || (a.nom + ' ' + (a.detail || '')).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(f)).slice(0, 12);
  const executer = (a) => { fermer(); setTimeout(a.f, 0); };
  return (
    <Modale titre="Que voulez-vous faire ?" surFermer={fermer} classe="palette">
      <input ref={champ} class="palette-champ" value={q} placeholder="Chercher une action, une page, un bloc…" onInput={(e) => { setQ(e.currentTarget.value); setI(0); }}
        onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); setI(Math.min(liste.length - 1, i + 1)); } if (e.key === 'ArrowUp') { e.preventDefault(); setI(Math.max(0, i - 1)); } if (e.key === 'Enter' && liste[i]) executer(liste[i]); }} />
      <ul class="palette-liste">
        {liste.map((a, k) => <li class={k === i ? 'actif' : ''}><button type="button" onClick={() => executer(a)} onMouseEnter={() => setI(k)}><Icone nom={a.icone} taille={15} /> {a.nom}{a.detail ? <small>{a.detail}</small> : null}</button></li>)}
      </ul>
    </Modale>
  );
}

// ---------------------------------------------------------------- SIGNALER
function Signaler({ fermer }) {
  const [texte, setTexte] = useState('');
  const envoyer = async () => {
    try { await appel('signaler', { methode: 'POST', corps: { chemin: etat.courant, message: texte } }); toast('Signalement envoyé : Allan le verra dans l’historique de l’éditeur.', 'succes', 6000); fermer(); } catch (e) { toast(e.message, 'erreur'); }
  };
  return (
    <Modale titre="Signaler un problème à Allan" surFermer={fermer} pied={<><Bouton variante="fantome" onClick={fermer}>Annuler</Bouton><Bouton variante="principal" icone="envoyer" desactive={texte.trim().length < 5} onClick={envoyer}>Envoyer</Bouton></>}>
      <p>Une erreur publiée, un contenu à retirer (seul Allan peut le décider), un bug de l’éditeur : décrivez-le ici.</p>
      <textarea rows={5} value={texte} onInput={(e) => setTexte(e.currentTarget.value)} placeholder={'Page : ' + (etat.courant ? urlPage(etat.courant) : '')} />
    </Modale>
  );
}
