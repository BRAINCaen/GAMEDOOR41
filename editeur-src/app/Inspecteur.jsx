// Inspecteur : réglages de l'élément sélectionné (Contenu / Style / Avancé)
import { useState } from 'preact/hooks';
import { etat, maj, useEtat, toast, docCourant } from './etat.js';
import { appliquer, selectionner, appliquerPartout } from './actions.js';
import { infos, donneeStyles, nomElement } from './moteur.js';
import { modifierStyle, reinitialiserStyle, copierStyle, collerStyle, estDansZoneCommune, dupliquer, supprimer, monter, descendre, copier } from './commandes.js';
import { BLOCS } from './blocs/catalogue.js';
import { Bouton, Champ, Saisie, Onglets, Segments, Interrupteur, Vide, Badge } from './ui/base.jsx';
import { Icone } from './ui/icones.jsx';
import { elements, attr, classes, texteDecode } from '../noyau/arbre.mjs';
import { refusDeclaration } from '../noyau/css.mjs';
import { urlLocale } from './medias.js';
import { titreCourt, urlPage } from './site.js';

// ---------------------------------------------------------------- utilitaires
/** Petit sélecteur CSS sur l'arbre : '', '.classe', 'tag', '[attr]', '[attr="v"]', combinaisons simples. */
export function trouverCible(racine, selecteur) {
  if (!selecteur) return racine;
  const m = /^([a-z0-9]*)((?:\.[\w-]+)*)((?:\[[\w-]+(?:="[^"]*")?\])*)$/i.exec(selecteur.trim());
  if (!m) return null;
  const tag = m[1].toLowerCase();
  const cls = m[2] ? m[2].split('.').filter(Boolean) : [];
  const ats = [...(m[3] || '').matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g)].map((x) => [x[1], x[2]]);
  const ok = (el) => (!tag || el.tag === tag) && cls.every((c) => classes(el).includes(c)) && ats.every(([a, v]) => (v == null ? attr(el, a) != null : attr(el, a) === v));
  if (ok(racine)) return racine;
  for (const el of elements(racine)) if (ok(el)) return el;
  return null;
}

export function srcVideo(type, saisie) {
  const s = String(saisie || '').trim();
  if (type === 'youtube') {
    const id = (/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/.exec(s) || /^([\w-]{11})$/.exec(s) || [])[1];
    return id ? { id, src: 'https://www.youtube-nocookie.com/embed/' + id } : null;
  }
  if (type === 'vimeo') {
    const id = (/vimeo\.com\/(?:video\/)?(\d+)/.exec(s) || /^(\d+)$/.exec(s) || [])[1];
    return id ? { id, src: 'https://player.vimeo.com/video/' + id } : null;
  }
  if (type === 'carte') {
    if (!s) return null;
    if (/^https:\/\/www\.google\.com\/maps\/embed/.test(s)) return { src: s };
    return { src: 'https://www.google.com/maps?q=' + encodeURIComponent(s) + '&output=embed' };
  }
  return null;
}

const PALETTE = [
  { nom: 'Orange GAMEDOOR', v: '#FF6B00' }, { nom: 'Blanc', v: '#F5F5F5' }, { nom: 'Crème', v: '#F0EBE2' }, { nom: 'Gris clair', v: '#CCCCCC' },
  { nom: 'Gris', v: '#999999' }, { nom: 'Noir', v: '#0A0A0A' }, { nom: 'Carte sombre', v: '#161616' }, { nom: 'Rouge', v: '#C62828' },
  { nom: 'Cyan', v: '#00E5FF' }, { nom: 'Violet quiz', v: '#9D4EDD' }, { nom: 'Or événements', v: '#FFD740' }, { nom: 'Bleu nuit escape', v: '#1B2A4E' },
];
const DEGRADES = [
  { nom: 'Orange → rouge', v: 'linear-gradient(135deg, #FF6B00, #C62828)' },
  { nom: 'Nuit', v: 'linear-gradient(180deg, #161616, #0A0A0A)' },
  { nom: 'Violet quiz', v: 'linear-gradient(135deg, #9D4EDD, #3D1A5E)' },
  { nom: 'Or', v: 'linear-gradient(135deg, #FFD740, #FF6B00)' },
  { nom: 'Bleu escape', v: 'linear-gradient(135deg, #3D5DC0, #1B2A4E)' },
  { nom: 'Halo orange', v: 'radial-gradient(circle at 30% 20%, rgba(255,107,0,.35), transparent 60%), #0A0A0A' },
];
const OMBRES = [
  { nom: 'Aucune', v: 'none' }, { nom: 'Légère', v: '0 2px 8px rgba(0,0,0,.35)' }, { nom: 'Moyenne', v: '0 8px 24px rgba(0,0,0,.45)' },
  { nom: 'Forte', v: '0 18px 48px rgba(0,0,0,.6)' }, { nom: 'Halo orange', v: '0 0 0 1px rgba(255,107,0,.5), 0 8px 32px rgba(255,107,0,.35)' },
];

// ---------------------------------------------------------------- composant
export function Inspecteur() {
  useEtat((e) => e.rev);
  const selection = useEtat((e) => e.selection);
  const ouvert = useEtat((e) => e.inspecteurOuvert);
  const onglet = useEtat((e) => e.ongletInspecteur);
  const apercu = useEtat((e) => e.apercuPlein);
  if (apercu) return null;
  const d = docCourant();
  const i = d && selection ? infos(d.page, selection) : null;
  if (!ouvert) return <aside class="inspecteur replie"><Bouton icone="gauche" variante="fantome" titre="Ouvrir l’inspecteur" onClick={() => maj({ inspecteurOuvert: true })} /></aside>;
  return (
    <aside class="inspecteur" aria-label="Inspecteur">
      <div class="insp-tete">
        <Onglets petit actif={onglet} surChoix={(o) => maj({ ongletInspecteur: o })} onglets={[{ id: 'contenu', nom: 'Contenu' }, { id: 'style', nom: 'Style' }, { id: 'avance', nom: 'Avancé' }]} />
        <Bouton icone="droite" variante="fantome" petit titre="Replier l’inspecteur" onClick={() => maj({ inspecteurOuvert: false })} />
      </div>
      {!i ? <Vide icone="deplacer">Cliquez sur un élément de la page pour le modifier. Double-cliquez sur un texte pour l’écrire directement.</Vide> : (
        <div class="insp-corps">
          <EnTete i={i} />
          {!i.editable ? <p class="note note-attention"><Icone nom="cadenas" /> {i.raison}</p> : (
            onglet === 'contenu' ? <OngletContenu i={i} d={d} /> : onglet === 'style' ? <OngletStyle i={i} d={d} /> : <OngletAvance i={i} d={d} />
          )}
        </div>
      )}
    </aside>
  );
}

function EnTete({ i }) {
  return (
    <div class="insp-entete">
      <nav class="fil" aria-label="Emplacement">
        {i.chaine.filter((p) => p.tag !== 'body').slice(-4).map((p) => <button type="button" onClick={() => selectionner(p.id)} title={nomElement(p)}>{nomElement(p)}</button>)}
      </nav>
      <div class="insp-titre">
        <strong>{i.nom}</strong>
        {i.nouveau ? <Badge type="nouveau">ajouté</Badge> : <Badge>publié</Badge>}
        <span class="espace" />
        <Bouton petit variante="fantome" icone="haut" titre="Monter" onClick={() => monter(i.id)} />
        <Bouton petit variante="fantome" icone="bas" titre="Descendre" onClick={() => descendre(i.id)} />
        <Bouton petit variante="fantome" icone="dupliquer" titre="Dupliquer" onClick={() => dupliquer(i.id)} />
        <Bouton petit variante="fantome" icone="copier" titre="Copier" onClick={() => copier(i.id)} />
        {i.nouveau ? <Bouton petit variante="fantome" icone="poubelle" titre="Retirer cet ajout" onClick={() => supprimer(i.id)} /> : null}
      </div>
      {i.texte ? <p class="insp-extrait">« {i.texte.slice(0, 90)}{i.texte.length > 90 ? '…' : ''} »</p> : null}
    </div>
  );
}

// ---------------------------------------------------------------- CONTENU
function texteOp(el, n, ancien, valeur) { return { op: 'texte', id: el.id, n, ancien, valeur }; }

function OngletContenu({ i, d }) {
  const el = i.el;
  const zone = estDansZoneCommune(i.id);
  const segs = el.enfants.filter((k) => k.t === 'txt');
  const textes = segs.map((s, n) => ({ n, v: texteDecode(s) })).filter((x) => x.v.trim());
  // textes des éléments contenus (cartes, sections…)
  const enfantsTexte = [];
  if (!textes.length) {
    for (const e of elements(el)) {
      if (['script', 'style', 'svg', 'noscript'].includes(e.tag)) continue;
      let dansSvg = false;
      for (let p = e.parent; p && p !== el; p = p.parent) if (p.tag === 'svg') dansSvg = true;
      if (dansSvg) continue;
      const s = e.enfants.filter((k) => k.t === 'txt');
      s.forEach((seg, n) => { const v = texteDecode(seg); if (v.trim()) enfantsTexte.push({ el: e, n, v }); });
      if (enfantsTexte.length >= 14) break;
    }
  }
  const poser = (ops, libelle) => appliquer(ops, libelle);
  return (
    <div class="insp-section-liste">
      {textes.length ? (
        <section class="insp-section">
          <h3><Icone nom="texte" taille={15} /> Texte</h3>
          {textes.map((t) => (
            <Champ>
              <Saisie multiligne lignes={Math.min(8, Math.max(2, Math.ceil(t.v.length / 38)))} valeur={t.v.trim()} surValider={(v) => poser([texteOp(el, t.n, t.v, v), ...retirerExemple(el)], 'Texte modifié')} />
            </Champ>
          ))}
          {i.texteRiche ? <p class="aide-ligne">Pour mettre un mot en gras, ajouter un lien ou une couleur : double-cliquez sur le texte dans la page.</p> : null}
          {zone ? <Bouton petit icone="pages" onClick={() => partout(i)}>Recopier ce texte sur toutes les pages ({zone})</Bouton> : null}
        </section>
      ) : null}
      {enfantsTexte.length ? (
        <section class="insp-section">
          <h3><Icone nom="texte" taille={15} /> Textes de ce bloc</h3>
          {enfantsTexte.map((t) => (
            <Champ libelle={nomElement(t.el)}>
              <Saisie multiligne lignes={Math.min(6, Math.max(1, Math.ceil(t.v.trim().length / 38)))} valeur={t.v.trim()} surValider={(v) => poser([texteOp(t.el, t.n, t.v, v), ...retirerExemple(t.el)], 'Texte modifié')} />
            </Champ>
          ))}
        </section>
      ) : null}
      {i.tag === 'a' ? <SectionLien i={i} zone={zone} /> : null}
      {i.tag === 'img' ? <SectionImage i={i} /> : null}
      {i.tag === 'iframe' ? <SectionCadre i={i} /> : null}
      {i.tag === 'video' ? <SectionVideo i={i} /> : null}
      {i.blocRacine ? <SectionBloc i={i} /> : null}
      {i.nouveau && (!el.parent || !el.parent.nouveau) ? <SectionPeriode i={i} /> : null}
      {['ul', 'ol', 'tbody', 'table', 'dl'].includes(i.tag) ? <SectionListe i={i} /> : null}
      {i.tag === 'details' || i.tag === 'summary' ? <p class="aide-ligne">Cliquez sur la question dans la page pour ouvrir ou fermer la réponse et la modifier.</p> : null}
      {!textes.length && !enfantsTexte.length && !['a', 'img', 'iframe', 'video'].includes(i.tag) && !i.blocRacine ? <p class="aide-ligne">Ce conteneur n’a pas de texte propre : cliquez sur un de ses éléments, ou utilisez l’onglet Style pour changer son apparence.</p> : null}
    </div>
  );
}

function retirerExemple(el) {
  const ops = [];
  if (el.nouveau && attr(el, 'data-gdb-exemple') != null) ops.push({ op: 'attr', id: el.id, nom: 'data-gdb-exemple', valeur: null });
  return ops;
}

function partout(i) {
  const d = docCourant();
  const base = d.arbreBase.parId.get(String(i.id));
  if (!base) { toast('Élément ajouté : il n’existe pas sur les autres pages.', 'info'); return; }
  const avant = base.enfants.filter((k) => k.t === 'txt').map(texteDecode);
  const apres = i.el.enfants.filter((k) => k.t === 'txt').map(texteDecode);
  const diffs = avant.map((a, n) => ({ n, a, b: apres[n] })).filter((x) => x.b != null && x.a !== x.b);
  if (!diffs.length) { toast('Modifiez d’abord le texte ici, puis recopiez-le sur les autres pages.', 'info'); return; }
  appliquerPartout(i.id, (idLocal) => diffs.map((x) => ({ op: 'texte', id: idLocal, n: x.n, ancien: x.a, valeur: x.b })), 'Texte de l’en-tête / pied de page');
}

function SectionLien({ i, zone }) {
  const href = i.attrs.href || '';
  const nouvelOnglet = i.attrs.target === '_blank';
  const pages = useEtat((e) => e.pages);
  useEtat((e) => e.titres);
  const poserHref = (v) => appliquer([{ op: 'attr', id: i.id, nom: 'href', valeur: v.trim() }], 'Lien modifié');
  return (
    <section class="insp-section">
      <h3><Icone nom="lien" taille={15} /> Lien</h3>
      <Champ libelle="Adresse" aide="Une page du site (/tarifs/), une ancre (#faq), un site (https://…), un e-mail (mailto:…)">
        <Saisie valeur={href} list="gdx-liens" surValider={poserHref} />
      </Champ>
      <datalist id="gdx-liens">
        <option value="/reserver/">Réserver</option>
        <option value="mailto:contact@gamedoor41.fr">E-mail</option>
        <option value="https://wa.me/33631469322">WhatsApp</option>
        {pages.filter((p) => p.chemin.endsWith('index.html')).map((p) => <option value={urlPage(p.chemin)}>{titreCourt(p.chemin)}</option>)}
      </datalist>
      <Interrupteur valeur={nouvelOnglet} libelle="Ouvrir dans un nouvel onglet" surChange={(v) => appliquer([{ op: 'attr', id: i.id, nom: 'target', valeur: v ? '_blank' : null }], v ? 'Lien ouvert dans un nouvel onglet' : 'Lien ouvert dans le même onglet')} />
      <div class="ligne-boutons">
        <a class="btn-e btn-normal petit" href={href} target="_blank" rel="noopener"><Icone nom="externe" taille={14} /><span>Tester le lien</span></a>
        {zone ? <Bouton petit icone="pages" onClick={() => appliquerPartout(i.id, (idLocal) => [{ op: 'attr', id: idLocal, nom: 'href', valeur: href }], 'Lien du ' + zone)}>Même lien sur toutes les pages</Bouton> : null}
      </div>
    </section>
  );
}

function SectionImage({ i }) {
  const src = i.attrs.src || '';
  const apercu = urlLocale(src) || src;
  return (
    <section class="insp-section">
      <h3><Icone nom="image" taille={15} /> Image</h3>
      <div class="insp-image"><img src={apercu} alt="" /></div>
      <div class="ligne-boutons">
        <Bouton icone="image" variante="principal" petit onClick={() => maj({ modale: { type: 'media', but: 'remplacer', id: i.id } })}>Remplacer l’image</Bouton>
      </div>
      <Champ libelle="Description (texte alternatif)" aide="Obligatoire : ce que montre l’image, en quelques mots. Lu par Google et par les personnes malvoyantes.">
        <Saisie multiligne lignes={2} valeur={i.attrs.alt || ''} surValider={(v) => appliquer([{ op: 'attr', id: i.id, nom: 'alt', valeur: v }, ...retirerExemple(i.el)], 'Description d’image')} />
      </Champ>
      <p class="aide-ligne">{i.attrs.width ? 'Taille : ' + i.attrs.width + ' × ' + i.attrs.height + ' px. ' : ''}{src}</p>
    </section>
  );
}

function SectionCadre({ i }) {
  const src = i.attrs.src || '';
  const type = /vimeo/.test(src) ? 'vimeo' : /google\.com\/maps|maps\.google/.test(src) ? 'carte' : 'youtube';
  return (
    <section class="insp-section">
      <h3><Icone nom="video" taille={15} /> {type === 'carte' ? 'Carte' : 'Vidéo'}</h3>
      <Champ libelle={type === 'carte' ? 'Adresse à afficher' : 'Lien de la vidéo ' + (type === 'vimeo' ? 'Vimeo' : 'YouTube')} aide={type === 'carte' ? 'Ex. 41 bis rue Pasteur, 14120 Mondeville' : 'Collez le lien de la vidéo (partage YouTube ou Vimeo)'}>
        <Saisie valeur="" placeholder={src} surValider={(v) => { const r = srcVideo(type, v); if (!r) { toast('Lien non reconnu.', 'erreur'); return; } appliquer([{ op: 'attr', id: i.id, nom: 'src', valeur: r.src }], type === 'carte' ? 'Carte modifiée' : 'Vidéo changée'); }} />
      </Champ>
      <Champ libelle="Titre (accessibilité)"><Saisie valeur={i.attrs.title || ''} surValider={(v) => appliquer([{ op: 'attr', id: i.id, nom: 'title', valeur: v }], 'Titre de la vidéo')} /></Champ>
    </section>
  );
}

function SectionVideo({ i }) {
  const bascule = (nom, libelle) => <Interrupteur valeur={i.attrs[nom] != null} libelle={libelle} surChange={(v) => appliquer([{ op: 'attr', id: i.id, nom, valeur: v ? '' : null }], libelle)} />;
  return (
    <section class="insp-section">
      <h3><Icone nom="video" taille={15} /> Vidéo</h3>
      {bascule('controls', 'Afficher les boutons de lecture')}
      {bascule('autoplay', 'Lecture automatique')}
      {bascule('muted', 'Sans le son')}
      {bascule('loop', 'En boucle')}
      <Bouton petit icone="image" onClick={() => maj({ modale: { type: 'media', but: 'poster', id: i.id } })}>Image d’attente</Bouton>
    </section>
  );
}

function SectionBloc({ i }) {
  const racine = i.blocRacine;
  const bloc = BLOCS.find((b) => b.id === attr(racine, 'data-gdb'));
  if (!bloc || !bloc.reglages || !bloc.reglages.length) return null;
  return (
    <section class="insp-section">
      <h3><Icone nom="reglages" taille={15} /> Réglages du bloc « {bloc.nom} »</h3>
      {racine !== i.el ? <Bouton petit variante="fantome" icone="parent" onClick={() => selectionner(racine.id)}>Sélectionner tout le bloc</Bouton> : null}
      {bloc.reglages.map((r) => <ReglageBloc r={r} racine={racine} />)}
    </section>
  );
}

function ReglageBloc({ r, racine }) {
  const cible = trouverCible(racine, r.cible || '');
  if (!cible) return null;
  const val = r.attribut === 'class' ? (r.options || []).find((o) => classes(cible).includes(o.valeur))?.valeur || '' : attr(cible, r.attribut);
  const poser = (v, libelle) => appliquer([{ op: 'attr', id: cible.id, nom: r.attribut, valeur: v }], libelle || r.libelle);
  if (r.type === 'choix') {
    return (
      <Champ libelle={r.libelle}>
        <select value={val || ''} onChange={(e) => {
          const v = e.currentTarget.value;
          if (r.attribut === 'class') appliquer([{ op: 'classe', id: cible.id, ajouter: v ? [v] : [], retirer: (r.options || []).map((o) => o.valeur).filter((x) => x && x !== v) }], r.libelle);
          else poser(v);
        }}>
          {(r.options || []).map((o) => <option value={o.valeur}>{o.libelle}</option>)}
        </select>
      </Champ>
    );
  }
  if (r.type === 'case') return <Interrupteur valeur={val != null} libelle={r.libelle} surChange={(v) => poser(v ? '' : null)} />;
  if (r.type === 'youtube' || r.type === 'vimeo' || r.type === 'carte') {
    return (
      <Champ libelle={r.libelle} aide={r.type === 'carte' ? 'Adresse postale ou lien Google Maps' : 'Collez le lien de la vidéo'}>
        <Saisie valeur="" placeholder={val || ''} surValider={(v) => { const x = srcVideo(r.type, v); if (!x) { toast('Lien non reconnu.', 'erreur'); return; } poser(r.attribut === 'src' ? x.src : (x.id || x.src)); }} />
      </Champ>
    );
  }
  const type = r.type === 'datetime' ? 'datetime-local' : r.type === 'date' ? 'date' : r.type === 'nombre' ? 'number' : r.type === 'url' ? 'url' : 'text';
  return <Champ libelle={r.libelle}><Saisie type={type} valeur={val || ''} surValider={(v) => poser(v)} /></Champ>;
}

function SectionPeriode({ i }) {
  const du = i.attrs['data-gdb-du'] || '';
  const au = i.attrs['data-gdb-au'] || '';
  return (
    <section class="insp-section">
      <h3><Icone nom="calendrier" taille={15} /> Période d’affichage</h3>
      <p class="aide-ligne">Pour une offre ou une annonce : le bloc s’affiche seulement pendant cette période (il reste dans la page, prêt à resservir).</p>
      <div class="deux-colonnes">
        <Champ libelle="À partir du"><Saisie type="datetime-local" valeur={du} surValider={(v) => appliquer([{ op: 'attr', id: i.id, nom: 'data-gdb-du', valeur: v || null }], 'Début d’affichage')} /></Champ>
        <Champ libelle="Jusqu’au"><Saisie type="datetime-local" valeur={au} surValider={(v) => appliquer([{ op: 'attr', id: i.id, nom: 'data-gdb-au', valeur: v || null }], 'Fin d’affichage')} /></Champ>
      </div>
    </section>
  );
}

function SectionListe({ i }) {
  const el = i.el;
  const lignes = el.enfants.filter((k) => k.t === 'el' && ['li', 'tr', 'dt', 'dd'].includes(k.tag) || (k.t === 'el' && k.tag === 'tbody'));
  const derniere = [...elements(el)].filter((k) => ['li', 'tr'].includes(k.tag)).pop();
  return (
    <section class="insp-section">
      <h3><Icone nom="liste" taille={15} /> {i.tag === 'table' || i.tag === 'tbody' ? 'Tableau' : 'Liste'}</h3>
      <p class="aide-ligne">{lignes.length} élément(s).</p>
      {derniere ? <Bouton petit icone="plus" onClick={() => dupliquer(derniere.id)}>Ajouter une ligne (copie de la dernière)</Bouton> : null}
    </section>
  );
}

// ---------------------------------------------------------------- STYLE
function OngletStyle({ i, d }) {
  const appareil = useEtat((e) => e.appareilStyle);
  const donnee = (i.cleStyle && donneeStyles(d.page)[i.cleStyle]) || {};
  const valeurs = donnee[appareil] || {};
  const calc = window.__gdxCanevas ? window.__gdxCanevas.stylesCalcules(i.id) : null;
  const existant = !i.nouveau;
  const v = (p) => valeurs[p] || '';
  const ph = (p) => (calc && appareil === 'tous' ? calc.getPropertyValue(p) : '');
  const interdit = (p, val = 'initial') => (existant ? refusDeclaration(p, val, true) : null);
  const poser = (p, val) => {
    const r = val ? refusDeclaration(p, val, existant) : null;
    if (r) { toast('Refusé : ' + r + '.', 'interdit'); return; }
    modifierStyle(i.id, { [appareil]: { [p]: val || null } }, 'Style : ' + p);
  };
  const passer = (p, val) => { if (window.__gdxCanevas) window.__gdxCanevas.stylePasser(i.id, { [p]: val }); };
  const conteneur = !['img', 'a', 'span', 'strong', 'em', 'br', 'svg', 'iframe', 'video'].includes(i.tag);
  return (
    <div class="insp-section-liste">
      <Segments petit valeur={appareil} surChange={(a) => maj({ appareilStyle: a })} options={[
        { valeur: 'tous', libelle: 'Tous', icone: 'ordinateur', titre: 'Tous les écrans' },
        { valeur: 'tablette', libelle: 'Tablette', icone: 'tablette', titre: 'Tablettes et téléphones (≤ 1024 px)' },
        { valeur: 'telephone', libelle: 'Mobile', icone: 'telephone', titre: 'Téléphones seulement (≤ 768 px)' },
        { valeur: 'survol', libelle: 'Survol', icone: 'deplacer', titre: 'Quand la souris passe dessus' },
      ]} />
      {appareil !== 'tous' ? <p class="aide-ligne">Ces réglages ne s’appliquent que {appareil === 'survol' ? 'au survol de la souris' : appareil === 'tablette' ? 'sur tablette et téléphone' : 'sur téléphone'} et remplacent ceux de « Tous ».</p> : null}
      {existant ? <p class="note"><Icone nom="cadenas" taille={14} /> Contenu publié : les réglages qui pourraient le masquer sont désactivés.</p> : null}

      <section class="insp-section">
        <h3>Texte</h3>
        <div class="deux-colonnes">
          <Champ libelle="Police">
            <select value={v('font-family')} onChange={(e) => poser('font-family', e.currentTarget.value)}>
              <option value="">Par défaut</option>
              <option value="var(--font-display)">Oswald (titres)</option>
              <option value="var(--font-body)">DM Sans (texte)</option>
              <option value="system-ui, sans-serif">Système</option>
              <option value="Georgia, serif">Georgia (classique)</option>
            </select>
          </Champ>
          <Champ libelle="Taille"><Unite valeur={v('font-size')} placeholder={ph('font-size')} unites={['px', 'rem', 'em']} surValider={(x) => poser('font-size', x)} /></Champ>
          <Champ libelle="Graisse">
            <select value={v('font-weight')} onChange={(e) => poser('font-weight', e.currentTarget.value)}>
              <option value="">Par défaut</option><option value="400">Normale</option><option value="500">Moyenne</option><option value="600">Semi-grasse</option><option value="700">Grasse</option><option value="800">Très grasse</option>
            </select>
          </Champ>
          <Champ libelle="Casse">
            <select value={v('text-transform')} onChange={(e) => poser('text-transform', e.currentTarget.value)}>
              <option value="">Par défaut</option><option value="none">Normale</option><option value="uppercase">MAJUSCULES</option><option value="lowercase">minuscules</option><option value="capitalize">Capitales</option>
            </select>
          </Champ>
          <Champ libelle="Interligne"><Saisie valeur={v('line-height')} placeholder={ph('line-height')} surValider={(x) => poser('line-height', x)} /></Champ>
          <Champ libelle="Espacement des lettres"><Unite valeur={v('letter-spacing')} placeholder={ph('letter-spacing')} unites={['px', 'em']} surValider={(x) => poser('letter-spacing', x)} /></Champ>
        </div>
        <Champ libelle="Alignement">
          <Segments petit valeur={v('text-align')} surChange={(x) => poser('text-align', x === v('text-align') ? '' : x)} options={[
            { valeur: 'left', icone: 'aligneG', titre: 'À gauche' }, { valeur: 'center', icone: 'aligneC', titre: 'Centré' },
            { valeur: 'right', icone: 'aligneD', titre: 'À droite' }, { valeur: 'justify', icone: 'justifie', titre: 'Justifié' },
          ]} />
        </Champ>
        <Champ libelle="Style">
          <div class="ligne-boutons">
            <Bouton petit actif={v('font-style') === 'italic'} icone="italique" titre="Italique" onClick={() => poser('font-style', v('font-style') === 'italic' ? '' : 'italic')} />
            <Bouton petit actif={v('text-decoration') === 'underline'} icone="souligne" titre="Souligné" onClick={() => poser('text-decoration', v('text-decoration') === 'underline' ? '' : 'underline')} />
            <Bouton petit actif={v('text-decoration') === 'line-through'} icone="barre" titre="Barré" onClick={() => poser('text-decoration', v('text-decoration') === 'line-through' ? '' : 'line-through')} />
            <select value={v('text-shadow')} onChange={(e) => poser('text-shadow', e.currentTarget.value)} title="Ombre du texte">
              <option value="">Sans ombre</option><option value="0 2px 8px rgba(0,0,0,.6)">Ombre douce</option><option value="0 0 18px rgba(255,107,0,.7)">Lueur orange</option><option value="2px 2px 0 #000">Ombre nette</option>
            </select>
          </div>
        </Champ>
        <Couleur libelle="Couleur du texte" valeur={v('color')} placeholder={ph('color')} surValider={(x) => poser('color', x)} />
      </section>

      <section class="insp-section">
        <h3>Fond</h3>
        <Couleur libelle="Couleur de fond" valeur={v('background-color')} placeholder={ph('background-color')} surValider={(x) => poser('background-color', x)} />
        <Champ libelle="Dégradé">
          <div class="nuancier degrades">
            <button type="button" class={!v('background-image') ? 'actif' : ''} title="Aucun" onClick={() => poser('background-image', '')}>∅</button>
            {DEGRADES.map((g) => <button type="button" title={g.nom} class={v('background-image') === g.v ? 'actif' : ''} style={{ background: g.v }} onClick={() => poser('background-image', g.v)} />)}
          </div>
        </Champ>
        <div class="ligne-boutons">
          <Bouton petit icone="image" onClick={() => maj({ modale: { type: 'media', but: 'fond', id: i.id, appareil } })}>Image de fond…</Bouton>
          {v('background-image') && /url\(/.test(v('background-image')) ? <select value={v('background-size')} onChange={(e) => poser('background-size', e.currentTarget.value)}><option value="">Taille auto</option><option value="cover">Remplir</option><option value="contain">Contenir</option></select> : null}
        </div>
      </section>

      <section class="insp-section">
        <h3>Espacements</h3>
        <BoiteEspaces valeurs={valeurs} calc={appareil === 'tous' ? calc : null} poser={poser} />
      </section>

      <section class="insp-section">
        <h3>Dimensions</h3>
        <div class="deux-colonnes">
          <Champ libelle="Largeur"><Unite valeur={v('width')} placeholder={ph('width')} unites={['%', 'px', 'auto']} surValider={(x) => poser('width', x)} /></Champ>
          <Champ libelle="Largeur max."><Unite valeur={v('max-width')} placeholder={ph('max-width')} unites={['px', '%', 'none']} surValider={(x) => poser('max-width', x)} /></Champ>
          <Champ libelle="Hauteur min."><Unite valeur={v('min-height')} placeholder={ph('min-height')} unites={['px', 'vh']} surValider={(x) => poser('min-height', x)} /></Champ>
          <Champ libelle={'Hauteur' + (interdit('height') ? ' 🔒' : '')}><Unite desactive={!!interdit('height')} valeur={v('height')} placeholder={ph('height')} unites={['px', 'vh', 'auto']} surValider={(x) => poser('height', x)} /></Champ>
        </div>
        {i.tag === 'img' ? (
          <Champ libelle="Cadrage de l’image">
            <select value={v('object-fit')} onChange={(e) => poser('object-fit', e.currentTarget.value)}><option value="">Par défaut</option><option value="cover">Remplir (recadrer)</option><option value="contain">Entière</option></select>
          </Champ>
        ) : null}
      </section>

      <section class="insp-section">
        <h3>Bordure et coins</h3>
        <div class="deux-colonnes">
          <Champ libelle="Épaisseur"><Unite valeur={(v('border-width'))} placeholder={ph('border-top-width')} unites={['px']} surValider={(x) => { poser('border-width', x); if (x && !v('border-style')) poser('border-style', 'solid'); }} /></Champ>
          <Champ libelle="Trait">
            <select value={v('border-style')} onChange={(e) => poser('border-style', e.currentTarget.value)}><option value="">Par défaut</option><option value="solid">Plein</option><option value="dashed">Tirets</option><option value="dotted">Pointillés</option><option value="none">Aucun</option></select>
          </Champ>
        </div>
        <Couleur libelle="Couleur de la bordure" valeur={v('border-color')} surValider={(x) => poser('border-color', x)} />
        <Champ libelle={'Arrondi des coins : ' + (v('border-radius') || ph('border-radius') || '0')}>
          <input type="range" min="0" max="48" value={parseInt(v('border-radius'), 10) || 0} onInput={(e) => passer('border-radius', e.currentTarget.value + 'px')} onChange={(e) => poser('border-radius', e.currentTarget.value + 'px')} />
        </Champ>
      </section>

      <section class="insp-section">
        <h3>Effets</h3>
        <Champ libelle="Ombre">
          <select value={v('box-shadow')} onChange={(e) => poser('box-shadow', e.currentTarget.value)}>
            <option value="">Par défaut</option>
            {OMBRES.map((o) => <option value={o.v}>{o.nom}</option>)}
          </select>
        </Champ>
        <Champ libelle={'Opacité : ' + Math.round((parseFloat(v('opacity')) || 1) * 100) + ' %'} aide={existant ? 'Au moins 40 % pour un contenu publié.' : null}>
          <input type="range" min={existant ? 40 : 0} max="100" value={Math.round((parseFloat(v('opacity')) || 1) * 100)} onInput={(e) => passer('opacity', String(e.currentTarget.value / 100))} onChange={(e) => poser('opacity', String(e.currentTarget.value / 100))} />
        </Champ>
        <Champ libelle="Animation à l’apparition">
          <Interrupteur valeur={i.classes.includes('fade-in')} desactive={i.classes.includes('fade-in') && !i.nouveau} libelle="Apparaît en fondu au défilement" surChange={(x) => appliquer([{ op: 'classe', id: i.id, ajouter: x ? ['fade-in'] : [], retirer: x ? [] : ['fade-in'] }], 'Animation d’apparition')} />
        </Champ>
      </section>

      {conteneur ? (
        <section class="insp-section">
          <h3>Disposition du contenu</h3>
          <Champ libelle="Organisation">
            <select value={v('display')} onChange={(e) => poser('display', e.currentTarget.value)}>
              <option value="">Par défaut</option><option value="block">Les uns sous les autres</option><option value="flex">En ligne (côte à côte)</option><option value="grid">En grille</option>
            </select>
          </Champ>
          {(v('display') === 'grid') ? (
            <Champ libelle="Nombre de colonnes">
              <Segments petit valeur={v('grid-template-columns')} surChange={(x) => poser('grid-template-columns', x)} options={[1, 2, 3, 4, 5, 6].map((n) => ({ valeur: 'repeat(' + n + ', minmax(0, 1fr))', libelle: String(n) }))} />
            </Champ>
          ) : null}
          {(v('display') === 'flex') ? (
            <div class="deux-colonnes">
              <Champ libelle="Sens"><select value={v('flex-direction')} onChange={(e) => poser('flex-direction', e.currentTarget.value)}><option value="">Ligne</option><option value="column">Colonne</option><option value="row-reverse">Ligne inversée</option></select></Champ>
              <Champ libelle="Passage à la ligne"><select value={v('flex-wrap')} onChange={(e) => poser('flex-wrap', e.currentTarget.value)}><option value="">Non</option><option value="wrap">Oui</option></select></Champ>
              <Champ libelle="Répartition"><select value={v('justify-content')} onChange={(e) => poser('justify-content', e.currentTarget.value)}><option value="">Début</option><option value="center">Centre</option><option value="flex-end">Fin</option><option value="space-between">Espacés</option></select></Champ>
              <Champ libelle="Alignement"><select value={v('align-items')} onChange={(e) => poser('align-items', e.currentTarget.value)}><option value="">Étiré</option><option value="flex-start">Haut</option><option value="center">Centre</option><option value="flex-end">Bas</option></select></Champ>
            </div>
          ) : null}
          {(v('display') === 'flex' || v('display') === 'grid') ? <Champ libelle="Espace entre les éléments"><Unite valeur={v('gap')} unites={['px', 'rem']} surValider={(x) => poser('gap', x)} /></Champ> : null}
        </section>
      ) : null}

      {i.nouveau ? (
        <section class="insp-section">
          <h3>Visibilité selon l’écran</h3>
          <p class="aide-ligne">Possible uniquement pour un contenu ajouté (jamais pour un contenu publié).</p>
          {[['gdb-masque-ordinateur', 'Masquer sur ordinateur'], ['gdb-masque-tablette', 'Masquer sur tablette'], ['gdb-masque-telephone', 'Masquer sur téléphone']].map(([c, l]) => (
            <Interrupteur valeur={i.classes.includes(c)} libelle={l} surChange={(x) => appliquer([{ op: 'classe', id: i.id, ajouter: x ? [c] : [], retirer: x ? [] : [c] }], l)} />
          ))}
        </section>
      ) : null}

      <div class="ligne-boutons">
        <Bouton petit icone="copier" onClick={() => copierStyle(i.id)}>Copier le style</Bouton>
        <Bouton petit icone="coller" onClick={() => collerStyle(i.id)}>Coller le style</Bouton>
        {i.cleStyle ? <Bouton petit icone="annuler" onClick={() => reinitialiserStyle(i.id)}>Style d’origine</Bouton> : null}
      </div>
    </div>
  );
}

function Unite({ valeur, placeholder, unites, surValider, desactive }) {
  return (
    <div class="unite">
      <Saisie valeur={valeur} placeholder={placeholder} desactive={desactive} surValider={(x) => {
        const t = String(x).trim();
        if (/^-?\d+(\.\d+)?$/.test(t) && unites[0] && !['auto', 'none'].includes(unites[0])) surValider(t + unites[0]);
        else surValider(t);
      }} />
      <span class="unite-suffixe">{unites.filter((u) => !['auto', 'none'].includes(u)).join(' · ')}</span>
    </div>
  );
}

function Couleur({ libelle, valeur, placeholder, surValider }) {
  const hex = /^#[0-9a-f]{6}$/i.test(valeur || '') ? valeur : '#ff6b00';
  return (
    <Champ libelle={libelle}>
      <div class="couleur">
        <div class="nuancier">
          {PALETTE.map((c) => <button type="button" title={c.nom} class={(valeur || '').toLowerCase() === c.v.toLowerCase() ? 'actif' : ''} style={{ background: c.v }} onClick={() => surValider(c.v)} />)}
          <label class="pipette" title="Autre couleur"><input type="color" value={hex} onChange={(e) => surValider(e.currentTarget.value)} /><Icone nom="pipette" taille={14} /></label>
          {valeur ? <button type="button" title="Couleur d’origine" class="raz" onClick={() => surValider('')}>×</button> : null}
        </div>
        <Saisie valeur={valeur || ''} placeholder={placeholder || ''} surValider={surValider} />
      </div>
    </Champ>
  );
}

function BoiteEspaces({ valeurs, calc, poser }) {
  const cote = (p) => (
    <Saisie class="espace-champ" valeur={(valeurs[p] || '').replace(/px$/, '')} placeholder={calc ? String(parseInt(calc.getPropertyValue(p), 10) || 0) : ''}
      surValider={(x) => { const t = String(x).trim(); poser(p, /^-?\d+(\.\d+)?$/.test(t) ? t + 'px' : t); }} />
  );
  return (
    <div class="boite-espaces">
      <div class="be-marge"><span class="be-titre">Marge extérieure</span>
        <div class="be-haut">{cote('margin-top')}</div><div class="be-gauche">{cote('margin-left')}</div><div class="be-droite">{cote('margin-right')}</div><div class="be-bas">{cote('margin-bottom')}</div>
        <div class="be-rembourrage"><span class="be-titre">Marge intérieure</span>
          <div class="be-haut">{cote('padding-top')}</div><div class="be-gauche">{cote('padding-left')}</div><div class="be-droite">{cote('padding-right')}</div><div class="be-bas">{cote('padding-bottom')}</div>
          <div class="be-centre">élément</div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- AVANCÉ
function OngletAvance({ i, d }) {
  const id = i.attrs.id;
  const lien = location.origin + urlPage(d.chemin) + (id ? '#' + id : '');
  return (
    <div class="insp-section-liste">
      <section class="insp-section">
        <h3><Icone nom="ancre" taille={15} /> Ancre (lien direct vers cet endroit)</h3>
        {id ? (
          <>
            <p class="aide-ligne">Lien : <code>{urlPage(d.chemin)}#{id}</code></p>
            <Bouton petit icone="copier" onClick={() => { navigator.clipboard.writeText(lien); toast('Lien copié.', 'succes', 2000); }}>Copier le lien</Bouton>
          </>
        ) : (
          <Champ aide="Ex. « faq » : on pourra faire un lien vers /page/#faq"><Saisie valeur="" placeholder="nom-de-l-ancre" surValider={(v) => appliquer([{ op: 'attr', id: i.id, nom: 'id', valeur: v.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') }], 'Ancre ajoutée')} /></Champ>
        )}
      </section>
      <section class="insp-section">
        <h3>Accessibilité et suivi</h3>
        <Champ libelle="Infobulle (au survol)"><Saisie valeur={i.attrs.title || ''} surValider={(v) => appliquer([{ op: 'attr', id: i.id, nom: 'title', valeur: v || null }], 'Infobulle')} /></Champ>
        <Champ libelle="Nom pour les lecteurs d’écran"><Saisie valeur={i.attrs['aria-label'] || ''} surValider={(v) => appliquer([{ op: 'attr', id: i.id, nom: 'aria-label', valeur: v || null }], 'Nom accessible')} /></Champ>
        {['a', 'button'].includes(i.tag) ? <Champ libelle="Nom du clic dans Google Analytics" aide="Les clics sur cet élément seront comptés sous ce nom."><Saisie valeur={i.attrs['data-track'] || ''} surValider={(v) => appliquer([{ op: 'attr', id: i.id, nom: 'data-track', valeur: v || null }], 'Suivi des clics')} /></Champ> : null}
      </section>
      <section class="insp-section">
        <h3>Détails techniques</h3>
        <p class="aide-ligne">Balise : <code>{i.tag}</code>{i.classes.length ? <> · classes : <code>{i.classes.join(' ')}</code></> : null}</p>
        <Bouton petit icone="copier" onClick={() => copier(i.id)}>Copier cet élément</Bouton>
      </section>
    </div>
  );
}
