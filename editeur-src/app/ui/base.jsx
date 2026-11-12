// Petits composants communs de l'interface
import { useEffect, useRef, useState } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import { Icone } from './icones.jsx';
import { etat, maj, useEtat } from '../etat.js';

export function Bouton({ icone, children, onClick, variante = 'normal', titre, desactive, petit, actif, type = 'button', classe = '', ...reste }) {
  return (
    <button type={type} class={'btn-e btn-' + variante + (petit ? ' petit' : '') + (actif ? ' actif' : '') + (children ? '' : ' seul') + ' ' + classe}
      onClick={onClick} title={titre} aria-label={titre || undefined} disabled={desactive} {...reste}>
      {icone ? <Icone nom={icone} taille={petit ? 15 : 17} /> : null}
      {children ? <span>{children}</span> : null}
    </button>
  );
}

export function Champ({ libelle, aide, children, compteur }) {
  return (
    <label class="champ">
      {libelle ? <span class="champ-libelle">{libelle}{compteur ? <em class="champ-compteur">{compteur}</em> : null}</span> : null}
      {children}
      {aide ? <span class="champ-aide">{aide}</span> : null}
    </label>
  );
}

/** Champ de texte qui ne valide qu'à la sortie (ou Entrée), pour ne pas créer une étape par lettre. */
export function Saisie({ valeur, surValider, multiligne, placeholder, type = 'text', desactive, lignes = 3, ...reste }) {
  const [v, setV] = useState(valeur == null ? '' : valeur);
  const derniere = useRef(valeur);
  useEffect(() => { if (valeur !== derniere.current) { derniere.current = valeur; setV(valeur == null ? '' : valeur); } }, [valeur]);
  const valider = () => { if (v !== (valeur == null ? '' : valeur)) surValider(v); };
  const props = {
    value: v, placeholder, disabled: desactive, onInput: (e) => setV(e.currentTarget.value), onBlur: valider,
    onKeyDown: (e) => { if (e.key === 'Enter' && (!multiligne || e.ctrlKey || e.metaKey)) { e.preventDefault(); valider(); e.currentTarget.blur(); } if (e.key === 'Escape') { setV(valeur == null ? '' : valeur); } },
    ...reste,
  };
  return multiligne ? <textarea rows={lignes} {...props} /> : <input type={type} {...props} />;
}

export function Onglets({ onglets, actif, surChoix, petit }) {
  return (
    <div class={'onglets' + (petit ? ' petit' : '')} role="tablist">
      {onglets.map((o) => (
        <button type="button" role="tab" aria-selected={o.id === actif} class={o.id === actif ? 'actif' : ''} onClick={() => surChoix(o.id)} title={o.titre || o.nom}>
          {o.icone ? <Icone nom={o.icone} taille={15} /> : null}{o.nom ? <span>{o.nom}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function Modale({ titre, children, surFermer, large, pied, classe = '' }) {
  useEffect(() => {
    const f = (e) => { if (e.key === 'Escape' && surFermer) surFermer(); };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [surFermer]);
  return createPortal(
    <div class="modale-fond" onMouseDown={(e) => { if (e.target === e.currentTarget && surFermer) surFermer(); }}>
      <div class={'modale' + (large ? ' large' : '') + ' ' + classe} role="dialog" aria-modal="true" aria-label={titre}>
        <header class="modale-tete">
          <h2>{titre}</h2>
          {surFermer ? <Bouton icone="fermer" titre="Fermer" variante="fantome" onClick={surFermer} /> : null}
        </header>
        <div class="modale-corps">{children}</div>
        {pied ? <footer class="modale-pied">{pied}</footer> : null}
      </div>
    </div>,
    document.body,
  );
}

export function Toasts() {
  const toasts = useEtat((e) => e.toasts);
  return (
    <div class="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div class={'toast toast-' + t.type} key={t.id}>
          <Icone nom={t.type === 'succes' ? 'ok' : t.type === 'interdit' ? 'interdit' : t.type === 'erreur' ? 'alerte' : t.type === 'attention' ? 'alerte' : 'info'} />
          <span>{t.message}</span>
          <button type="button" onClick={() => maj({ toasts: etat.toasts.filter((x) => x.id !== t.id) })} aria-label="Fermer">×</button>
        </div>
      ))}
    </div>
  );
}

export function Vide({ icone = 'info', children }) {
  return <div class="vide"><Icone nom={icone} taille={28} /><p>{children}</p></div>;
}

export function Interrupteur({ valeur, surChange, libelle, desactive }) {
  return (
    <label class={'interrupteur' + (desactive ? ' off' : '')}>
      <input type="checkbox" checked={!!valeur} disabled={desactive} onChange={(e) => surChange(e.currentTarget.checked)} />
      <span class="piste"><span class="pouce" /></span>
      <span>{libelle}</span>
    </label>
  );
}

export function Chargement({ texte = 'Chargement…' }) {
  return <div class="chargement"><span class="roue" />{texte}</div>;
}

/** Choix parmi des boutons (segmenté). */
export function Segments({ options, valeur, surChange, petit }) {
  return (
    <div class={'segments' + (petit ? ' petit' : '')}>
      {options.map((o) => (
        <button type="button" class={o.valeur === valeur ? 'actif' : ''} onClick={() => surChange(o.valeur)} title={o.titre || o.libelle}>
          {o.icone ? <Icone nom={o.icone} taille={15} /> : null}{o.libelle ? <span>{o.libelle}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function Badge({ children, type = 'neutre' }) {
  return <span class={'badge badge-' + type}>{children}</span>;
}

export function temps(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 60) return 'à l’instant';
  if (s < 3600) return 'il y a ' + Math.round(s / 60) + ' min';
  if (s < 86400) return 'il y a ' + Math.round(s / 3600) + ' h';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
