// Panneau « Assistant » : décrire ce qu'on veut, Claude propose des modifications
// (textes seulement, jamais d'image générée), appliquées comme une étape annulable.
import { useState, useEffect } from 'preact/hooks';
import { etat, maj, useEtat, toast, docCourant } from '../etat.js';
import { appliquer, selectionner, travail } from '../actions.js';
import { planPage, infos } from '../moteur.js';
import { htmlDe } from '../commandes.js';
import { Bouton, Chargement, Vide } from '../ui/base.jsx';
import { Icone } from '../ui/icones.jsx';
import { BLOCS } from '../blocs/catalogue.js';

const IDEES = [
  'Corrige les fautes d’orthographe et de grammaire de l’élément sélectionné',
  'Rends ce texte plus court et plus percutant, sans changer les informations',
  'Ajoute sous cette section une FAQ de 4 questions utiles pour nos clients',
  'Ajoute un bandeau d’annonce en haut de page pour une offre (laisse les infos à compléter)',
  'Propose un meilleur titre Google et une meilleure description pour cette page',
  'Ajoute une section « Comment ça se passe ? » en 3 étapes',
];

function catalogueTexte() {
  return BLOCS.map((b) => '- ' + b.id + ' (' + b.nom + ') : ' + b.html().replace(/\s+/g, ' ').slice(0, 900)).join('\n');
}

export function PanneauAssistant() {
  const config = useEtat((e) => e.config);
  const selection = useEtat((e) => e.selection);
  const preRempli = useEtat((e) => e.assistantPreRempli);
  useEtat((e) => e.rev);
  const [texte, setTexte] = useState('');
  const [encours, setEncours] = useState(null);
  const [historique, setHistorique] = useState([]);
  useEffect(() => { if (preRempli) { setTexte(preRempli); maj({ assistantPreRempli: null }); } }, [preRempli]);
  if (!config || !config.ia) {
    return <Vide icone="assistant">L’assistant n’est pas encore activé : il faut une clé de l’API Claude dans Netlify (variable ANTHROPIC_API_KEY), puis l’activer dans Réglages de l’éditeur. Tout le reste de l’éditeur fonctionne sans lui.</Vide>;
  }
  const d = docCourant();
  const i = d && selection ? infos(d.page, selection) : null;
  const demander = async (instruction) => {
    if (!d || !instruction.trim()) return;
    setEncours('Envoi de la demande…');
    const entree = { question: instruction, selection: i ? i.nom : null };
    try {
      const r = await travail('ia', {
        instruction, chemin: d.chemin,
        plan: planPage(d.page, { idSelection: selection }),
        selection: selection ? '[' + selection + '] ' + (htmlDe(selection) || '').slice(0, 20000) : null,
        catalogue: catalogueTexte(),
      }, (t) => setEncours(t.etapes && t.etapes.length ? t.etapes[t.etapes.length - 1].texte + '…' : 'En attente…'));
      setHistorique((h) => [{ ...entree, reponse: r, etat: 'propose' }, ...h]);
      setTexte('');
    } catch (e) {
      setHistorique((h) => [{ ...entree, erreur: e.message }, ...h]);
    } finally { setEncours(null); }
  };
  const appliquerProposition = (k) => {
    const h = historique[k];
    if (!h || !h.reponse) return;
    const ops = h.reponse.operations;
    if (!ops.length) return;
    if (appliquer(ops, 'Assistant : ' + h.question.slice(0, 60))) {
      setHistorique((x) => x.map((y, j) => (j === k ? { ...y, etat: 'applique' } : y)));
      toast('Proposition appliquée : vérifiez-la dans la page (Ctrl+Z pour annuler).', 'succes', 6000);
      const ins = docCourant().ops().slice(-ops.length).find((o) => o.op === 'inserer');
      if (ins && ins.uid) selectionner(ins.uid + '.0');
    }
  };
  return (
    <div class="assistant">
      <p class="aide-ligne">Décrivez ce que vous voulez{i ? <> pour <strong>{i.nom}</strong> (sélectionné)</> : ''}. L’assistant propose, vous vérifiez dans l’aperçu, rien n’est publié sans vous. Il n’invente ni prix ni horaire, et ne crée jamais d’image.</p>
      <div class="assistant-saisie">
        <textarea rows={4} value={texte} onInput={(e) => setTexte(e.currentTarget.value)} placeholder="Ex. « Ajoute sous les tarifs un encadré qui explique la carte cadeau »" onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) demander(texte); }} />
        <Bouton variante="principal" icone="envoyer" desactive={!!encours || texte.trim().length < 3} onClick={() => demander(texte)}>Demander</Bouton>
      </div>
      {!historique.length ? (
        <div class="idees">
          {IDEES.map((x) => <button type="button" onClick={() => setTexte(x)}><Icone nom="baguette" taille={13} /> {x}</button>)}
        </div>
      ) : null}
      {encours ? <Chargement texte={encours} /> : null}
      {historique.map((h, k) => (
        <article class="echange">
          <p class="question"><Icone nom="utilisateur" taille={14} /> {h.question}</p>
          {h.erreur ? <p class="note note-erreur">{h.erreur}</p> : (
            <div class="reponse">
              <p>{h.reponse.explication}</p>
              {h.reponse.questions && h.reponse.questions.length ? <div class="note"><strong>À compléter par vous :</strong><ul>{h.reponse.questions.map((q) => <li>{q}</li>)}</ul></div> : null}
              {h.reponse.operations.length ? (
                <>
                  <ul class="ops">{h.reponse.operations.map((o) => <li>{o.libelle || o.op}</li>)}</ul>
                  {h.etat === 'applique' ? <p class="ok-texte"><Icone nom="ok" taille={14} /> Appliqué</p> : <Bouton variante="principal" petit icone="ok" onClick={() => appliquerProposition(k)}>Appliquer à la page</Bouton>}
                </>
              ) : null}
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
