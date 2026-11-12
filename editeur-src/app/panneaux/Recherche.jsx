// Panneau « Rechercher » : chercher un texte sur TOUT le site, et le remplacer (prix, horaires…)
import { useState } from 'preact/hooks';
import { useEtat, toast } from '../etat.js';
import { ouvrirPage, selectionner, remplacerResultats } from '../actions.js';
import { rechercher, titreCourt } from '../site.js';
import { Bouton, Champ, Interrupteur, Chargement } from '../ui/base.jsx';

export function PanneauRecherche() {
  useEtat((e) => e.titres);
  const [q, setQ] = useState('');
  const [rempl, setRempl] = useState('');
  const [exact, setExact] = useState(false);
  const [res, setRes] = useState(null);
  const [coches, setCoches] = useState(new Set());
  const [encours, setEncours] = useState(false);
  const lancer = async (e) => {
    if (e) e.preventDefault();
    setEncours(true);
    try {
      const r = await rechercher(q, { exact });
      setRes(r);
      setCoches(new Set(r.map((_, i) => i)));
    } catch (err) { toast(err.message, 'erreur'); } finally { setEncours(false); }
  };
  const remplacer = async () => {
    const choisis = res.filter((_, i) => coches.has(i));
    if (!choisis.length) return;
    if (!rempl.trim()) { toast('Indiquez le nouveau texte (on ne remplace pas par du vide : ce serait supprimer du contenu).', 'interdit'); return; }
    if (!confirm('Remplacer ' + choisis.length + ' occurrence(s) de « ' + q + ' » par « ' + rempl + ' » ? Vous verrez le résultat avant de publier, et pourrez annuler.')) return;
    setEncours(true);
    try {
      const n = await remplacerResultats(choisis, rempl);
      toast(n + ' remplacement(s) préparé(s). Vérifiez les pages, puis publiez.', 'succes', 7000);
      setRes(null);
    } finally { setEncours(false); }
  };
  const groupes = res ? [...new Set(res.map((r) => r.chemin))] : [];
  return (
    <div class="recherche">
      <form onSubmit={lancer}>
        <Champ libelle="Chercher sur tout le site"><input type="search" value={q} onInput={(e) => setQ(e.currentTarget.value)} placeholder="Ex. « dès 24 € », « 1h30 », un mot…" /></Champ>
        <Interrupteur valeur={exact} surChange={setExact} libelle="Respecter majuscules et accents" />
        <Bouton type="submit" variante="principal" icone="chercher" desactive={q.trim().length < 2 || encours}>Chercher</Bouton>
      </form>
      {encours ? <Chargement texte="Lecture des pages du site…" /> : null}
      {res ? (
        <>
          <p class="aide-ligne">{res.length} résultat(s) sur {groupes.length} page(s). Les textes techniques (prix calculés, données Google) ne sont pas listés.</p>
          {res.length ? (
            <div class="remplacer">
              <Champ libelle="Remplacer par"><input value={rempl} onInput={(e) => setRempl(e.currentTarget.value)} /></Champ>
              <Bouton icone="ok" desactive={!coches.size} onClick={remplacer}>Remplacer {coches.size} occurrence(s)</Bouton>
            </div>
          ) : null}
          {groupes.map((chemin) => (
            <section class="res-page">
              <h3>{titreCourt(chemin)}</h3>
              {res.map((r, i) => r.chemin !== chemin ? null : (
                <div class="res-ligne">
                  <input type="checkbox" checked={coches.has(i)} onChange={(e) => { const n = new Set(coches); if (e.currentTarget.checked) n.add(i); else n.delete(i); setCoches(n); }} />
                  <button type="button" onClick={async () => { await ouvrirPage(r.chemin); selectionner(r.id); }}>
                    …{r.texte.slice(Math.max(0, r.index - 40), r.index)}<mark>{r.texte.slice(r.index, r.index + r.longueur)}</mark>{r.texte.slice(r.index + r.longueur, r.index + r.longueur + 50)}…
                  </button>
                </div>
              ))}
            </section>
          ))}
        </>
      ) : null}
    </div>
  );
}
