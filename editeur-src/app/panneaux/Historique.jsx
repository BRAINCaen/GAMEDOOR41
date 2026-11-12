// Panneau « Historique » : étapes de la page en cours (revenir à n'importe quel point)
// + publications de l'équipe, publications programmées, signalements.
import { useEffect, useState } from 'preact/hooks';
import { useEtat, docCourant, toast } from '../etat.js';
import { allerA } from '../actions.js';
import { appel } from '../api.js';
import { Bouton, temps, Chargement } from '../ui/base.jsx';
import { Icone } from '../ui/icones.jsx';

export function PanneauHistorique() {
  useEtat((e) => e.rev);
  const qui = useEtat((e) => e.qui);
  const [journal, setJournal] = useState(null);
  const charger = () => appel('journal').then(setJournal).catch((e) => setJournal({ erreur: e.message }));
  useEffect(() => { charger(); }, []);
  const d = docCourant();
  return (
    <div class="historique">
      <section>
        <h3>Cette page (non publié)</h3>
        {!d || !d.etapes.length ? <p class="aide-ligne">Aucune modification.</p> : (
          <ol class="etapes">
            <li class={d.position === 0 ? 'actif' : ''}><button type="button" onClick={() => allerA(0)}>Version publiée</button></li>
            {d.etapes.map((e, k) => (
              <li class={(k + 1 === d.position ? 'actif ' : '') + (k + 1 > d.position ? 'annulee' : '')}>
                <button type="button" onClick={() => allerA(k + 1)} title="Revenir à ce point">{e.libelle || 'Modification'}<small>{temps(e.date)}</small></button>
              </li>
            ))}
          </ol>
        )}
      </section>
      <section>
        <h3>Publications de l’équipe <Bouton petit variante="fantome" icone="retablir" titre="Actualiser" onClick={charger} /></h3>
        {!journal ? <Chargement /> : journal.erreur ? <p class="note note-erreur">{journal.erreur}</p> : (
          <>
            {journal.programmes && journal.programmes.length ? (
              <div class="programmes">
                <h4><Icone nom="horloge" taille={14} /> Programmées</h4>
                {journal.programmes.map((p) => (
                  <div class="ligne-journal">
                    <span><strong>{new Date(p.quand).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}</strong> — {p.message || 'sans titre'} <small>({p.auteur && p.auteur.nom})</small>{p.erreur ? <em class="ko"> Échec : {p.erreur}</em> : null}</span>
                    {qui && (qui.admin || (p.auteur && p.auteur.email === qui.email)) ? <Bouton petit variante="fantome" onClick={async () => { if (!confirm('Annuler cette publication programmée ?')) return; await appel('programmer?pr=' + p.pr, { methode: 'DELETE' }); toast('Programmation annulée.', 'succes'); charger(); }}>Annuler</Bouton> : null}
                  </div>
                ))}
              </div>
            ) : null}
            <ul class="journal">
              {journal.entrees.filter((e) => e.type !== 'signalement' || (qui && qui.admin)).map((e) => (
                <li class={'j-' + e.type}>
                  <Icone nom={e.type === 'publication' ? 'fusee' : e.type === 'apercu' ? 'oeil' : e.type === 'signalement' ? 'signaler' : 'horloge'} taille={14} />
                  <div>
                    <strong>{{ publication: 'Publié', apercu: 'Aperçu créé', programmation: 'Programmé', 'programmation-annulee': 'Programmation annulée', signalement: 'Signalement' }[e.type] || e.type}</strong> par {e.auteur && e.auteur.nom} · {temps(e.date)}
                    {e.message ? <p>{e.message}</p> : null}
                    {e.fichiers ? <p class="fichiers">{e.fichiers.filter((f) => f.url).map((f) => <a href={new URL(f.url).pathname} target="_blank" rel="noopener">{new URL(f.url).pathname}</a>)}</p> : null}
                  </div>
                </li>
              ))}
            </ul>
            {!journal.entrees.length ? <p class="aide-ligne">Aucune publication depuis l’éditeur pour l’instant.</p> : null}
          </>
        )}
      </section>
    </div>
  );
}
