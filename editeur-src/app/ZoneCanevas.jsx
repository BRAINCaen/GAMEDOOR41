// Zone centrale : canevas modifiable (ordinateur / tablette / téléphone) et
// aperçu téléphone côte à côte, barre d'outils flottante, édition de texte.
import { useEffect, useRef, useState, useLayoutEffect } from 'preact/hooks';
import { etat, maj, useEtat, toast, docCourant } from './etat.js';
import { appliquer, selectionner, annuler, retablir } from './actions.js';
import { Canevas, htmlCanevas } from './canevas.js';
import { infos, opsTexteDepuisDom, htmlRicheDepuisDom, nomElement } from './moteur.js';
import { remplacerMediasLocaux, envoyerImage, envoyerVideo } from './medias.js';
import { insererHtml, deplacerVers, monter, descendre, dupliquer, supprimer, selectionnerParent, copier, coller, elementCourant } from './commandes.js';
import { BLOCS } from './blocs/catalogue.js';
import { Bouton } from './ui/base.jsx';
import { Icone } from './ui/icones.jsx';
import { elements, attr } from '../noyau/arbre.mjs';

const LARGEURS = { ordinateur: 1440, tablette: 820, telephone: 390, cote: 1440 };
const HAUTEUR_TEL = 844;

export function htmlImage(m, alt = '') {
  const a = String(alt).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  return '<figure class="gdb-image" data-gdb="image"><img src="' + m.src + '"' + (m.srcset ? ' srcset="' + m.srcset + '" sizes="' + (m.sizes || '(max-width: 768px) 100vw, 1200px') + '"' : '') + (m.largeur ? ' width="' + m.largeur + '" height="' + m.hauteur + '"' : '') + ' alt="' + a + '" loading="lazy" decoding="async"></figure>';
}

/** Texte visible d'un élément du canevas (sans scripts, styles, noscript, calques de l'éditeur). */
function texteDom(el) {
  let t = '';
  const go = (n) => {
    for (const k of n.childNodes) {
      if (k.nodeType === 3) t += k.data;
      else if (k.nodeType === 1 && !['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'GDX-CALQUE'].includes(k.tagName) && !(k.hasAttribute('data-gdx-ignorer') || (!k.hasAttribute('data-gdx') && k.tagName !== 'TBODY'))) go(k);
    }
  };
  go(el);
  return t;
}

/** Ops complémentaires après une édition de texte : retirer la marque « texte d'exemple ». */
function opsExemple(page, id) {
  const ops = [];
  const el = page.arbre.parId.get(String(id));
  if (!el || !el.nouveau) return ops;
  for (const d of [el, ...elements(el)]) if (d.nouveau && attr(d, 'data-gdb-exemple') != null) ops.push({ op: 'attr', id: d.id, nom: 'data-gdb-exemple', valeur: null });
  return ops;
}

export function ZoneCanevas() {
  const rev = useEtat((e) => e.rev);
  const courant = useEtat((e) => e.courant);
  const appareil = useEtat((e) => e.appareil);
  const zoom = useEtat((e) => e.zoom);
  const selection = useEtat((e) => e.selection);
  const survol = useEtat((e) => e.survol);
  const edition = useEtat((e) => e.edition);
  const apercuPlein = useEtat((e) => e.apercuPlein);
  const zone = useRef(null);
  const hoteEdit = useRef(null);
  const hoteTel = useRef(null);
  const cEdit = useRef(null);
  const cTel = useRef(null);
  const [taille, setTaille] = useState({ w: 1000, h: 700 });
  const [, setTick] = useState(0);
  const pageAffichee = useRef(null);
  const [depotFichier, setDepotFichier] = useState(false);

  const telVisible = appareil === 'cote' || apercuPlein;

  // ---------------------------------------------------------------- création
  useEffect(() => {
    const nomDe = (id) => { const d = docCourant(); const el = d && d.page.arbre.parId.get(String(id)); return el ? nomElement(el) : ''; };
    cEdit.current = new Canevas(hoteEdit.current, {
      nomDe,
      surSelection: (id) => { if (etat.apercuPlein) return; selectionner(id); },
      surSurvol: (id) => { if (etat.survol !== id) maj({ survol: id }); },
      surDoubleClic: (id, point) => { if (!etat.apercuPlein) commencerEdition(id, point); },
      surMenu: (id, pos) => { if (etat.apercuPlein) return; selectionner(id); maj({ menu: { x: pos.x, y: pos.y, id } }); },
      surDepot: (d) => { if (!etat.apercuPlein) deposer(d); },
      surClavier: (e) => raccourci(e),
      surEditionFin: finEdition,
      surCalque: () => setTick((t) => t + 1),
    });
    cTel.current = new Canevas(hoteTel.current, {
      nomDe,
      surSelection: (id) => { if (!etat.apercuPlein) selectionner(id); },
      surSurvol: () => {},
      surClavier: (e) => raccourci(e),
    });
    window.__gdxClavier = raccourci;
    window.__gdxCanevas = cEdit.current;
    const ro = new ResizeObserver(() => { if (zone.current) setTaille({ w: zone.current.clientWidth, h: zone.current.clientHeight }); });
    ro.observe(zone.current);
    return () => { ro.disconnect(); cEdit.current.detruire(); cTel.current.detruire(); };
  }, []);

  // ---------------------------------------------------------------- dimensions
  const largeur = LARGEURS[appareil] || 1440;
  const marge = 32;
  const wPrincipal = telVisible ? Math.max(320, taille.w * 0.66) : taille.w;
  const hDispo = Math.max(300, taille.h - marge);
  const estTel = appareil === 'telephone' && !apercuPlein;
  let echelle = zoom === 'ajuste' ? Math.min(1, (wPrincipal - marge) / largeur) : zoom;
  if (estTel && zoom === 'ajuste') echelle = Math.min(1, (hDispo - 20) / HAUTEUR_TEL, (wPrincipal - marge) / largeur);
  const hCadre = estTel ? HAUTEUR_TEL * echelle : hDispo;
  const echTel = Math.min(1, (hDispo - 24) / HAUTEUR_TEL, (taille.w * 0.32 - 24) / 390);

  useLayoutEffect(() => {
    if (cEdit.current) cEdit.current.dimensionner({ largeur, hauteur: hCadre, echelle });
    if (cTel.current) cTel.current.dimensionner({ largeur: 390, hauteur: HAUTEUR_TEL * echTel, echelle: echTel });
  }, [largeur, hCadre, echelle, echTel]);

  // ---------------------------------------------------------------- rendu
  useEffect(() => {
    const d = docCourant();
    if (!d || !cEdit.current) return;
    const page = d.page;
    const nouvellePage = pageAffichee.current !== d.chemin;
    pageAffichee.current = d.chemin;
    cEdit.current.rendre((jeton) => remplacerMediasLocaux(htmlCanevas(page, d.chemin, { jeton })), { garder: !nouvellePage }).then(() => {
      cEdit.current.selectionner(etat.selection);
      if (window.GD41Blocs) { /* rien : le script des blocs vit dans le cadre */ }
    });
    if (telVisible) cTel.current.rendre((jeton) => remplacerMediasLocaux(htmlCanevas(page, d.chemin, { jeton, editable: false })), { garder: !nouvellePage }).then(() => cTel.current.selectionner(etat.selection, { defiler: true }));
  }, [rev, courant, telVisible]);

  useEffect(() => {
    if (cEdit.current) cEdit.current.selectionner(selection, { defiler: true });
    if (cTel.current && telVisible) cTel.current.selectionner(selection, { defiler: true });
  }, [selection]);

  useEffect(() => { if (cEdit.current && cEdit.current.survol !== survol) cEdit.current.survoler(survol); }, [survol]);

  useEffect(() => {
    if (edition && cEdit.current && !cEdit.current.edition) commencerEdition(edition);
  }, [edition]);

  // ---------------------------------------------------------------- édition
  function commencerEdition(id, point = null) {
    const d = docCourant();
    const i = d && infos(d.page, id);
    if (!i) return;
    if (!i.editable) { toast(i.raison || 'Élément non modifiable.', 'attention'); return; }
    if (i.tag === 'img') { maj({ modale: { type: 'media', but: 'remplacer', id } }); return; }
    const aTexte = i.segments.some((s) => !s.vide) || i.texteRiche;
    if (!aTexte) {
      // pas de texte direct : on cherche l'élément de texte le plus proche dans le cadre
      maj({ edition: null });
      return;
    }
    // le site a-t-il réécrit ce texte par script ? (ex. calcul de prix) → on refuse l'édition directe
    const dom = cEdit.current.elementDe(id);
    const norm = (s) => String(s).replace(/\s+/g, '');
    if (dom && norm(texteDom(dom)) !== norm(i.texte)) {
      toast('Ce texte est calculé automatiquement par la page : modifiez-le dans l’inspecteur (à droite), il sera vérifié.', 'attention', 7000);
      maj({ ongletInspecteur: 'contenu', inspecteurOuvert: true, edition: null });
      return;
    }
    selectionner(id);
    maj({ edition: String(id) });
    cEdit.current.editerTexte(id, { riche: i.texteRiche, point });
  }

  function finEdition(id, el, valider, avant, riche) {
    maj({ edition: null });
    if (!valider) return;
    const d = docCourant();
    if (!d) return;
    const page = d.page;
    let ops = opsTexteDepuisDom(page, id, el);
    if (ops && !ops.length) return;
    if (ops) {
      const ok = appliquer([...ops, ...opsExemple(page, id)], ops.length === 1 ? 'Texte modifié : « ' + String(ops[0].valeur).trim().slice(0, 40) + ' »' : 'Textes modifiés');
      if (!ok) el.innerHTML = avant;
      return;
    }
    if (riche) {
      const html = htmlRicheDepuisDom(el);
      const ok = appliquer([{ op: 'html', id, html }, ...opsExemple(page, id)], 'Texte mis en forme');
      if (!ok) el.innerHTML = avant;
      return;
    }
    el.innerHTML = avant;
    toast('Ici, seul le texte peut changer : les icônes et la structure restent en place.', 'attention', 6000);
  }

  // ---------------------------------------------------------------- dépôt
  async function deposer({ donnees, fichiers, id, position }) {
    if (fichiers && fichiers.length) {
      for (const f of fichiers) {
        const t = toast('Préparation de « ' + f.name + ' »…', 'info', 0);
        try {
          const video = /^video\//.test(f.type);
          const m = video ? await envoyerVideo(f, () => {}) : await envoyerImage(f, () => {});
          const d = docCourant();
          d.medias.push(...m.medias);
          const html = video ? '<figure class="gdb-video" data-gdb="video-site"><video src="' + m.src + '" controls playsinline preload="metadata"></video></figure>' : htmlImage(m, '');
          insererHtml(html, video ? 'Vidéo ajoutée' : 'Image ajoutée', { id, position });
          if (!video) toast('Image ajoutée : décrivez-la dans l’inspecteur (texte alternatif), c’est obligatoire.', 'attention', 7000);
        } catch (e) { toast(e.message, 'erreur', 7000); } finally { maj({ toasts: etat.toasts.filter((x) => x.id !== t) }); }
      }
      return;
    }
    if (!donnees) return;
    if (donnees.type === 'bloc') {
      const b = BLOCS.find((x) => x.id === donnees.id);
      if (b) insererHtml(b.html(), 'Bloc ajouté : ' + b.nom, { id, position });
    } else if (donnees.type === 'deplacer') {
      deplacerVers(donnees.id, id, position);
    } else if (donnees.type === 'media') {
      insererHtml(htmlImage(donnees.media, ''), 'Image ajoutée', { id, position });
    } else if (donnees.type === 'html') {
      insererHtml(donnees.html, donnees.libelle || 'Contenu ajouté', { id, position });
    }
  }

  // ---------------------------------------------------------------- clavier
  function raccourci(e) {
    if (etat.edition || etat.modale) return;
    const mod = e.ctrlKey || e.metaKey;
    const k = e.key.toLowerCase();
    const sel = etat.selection;
    const stop = () => { e.preventDefault(); e.stopPropagation(); };
    if (mod && k === 'z' && !e.shiftKey) { stop(); annuler(); return; }
    if (mod && (k === 'y' || (k === 'z' && e.shiftKey))) { stop(); retablir(); return; }
    if (mod && k === 'k') { stop(); maj({ modale: { type: 'palette' } }); return; }
    if (!sel) return;
    if (k === 'escape') { stop(); selectionnerParent(sel); return; }
    if (k === 'delete' || k === 'backspace') { stop(); supprimer(sel); return; }
    if (mod && k === 'd') { stop(); dupliquer(sel); return; }
    if (mod && k === 'c') { stop(); copier(sel); return; }
    if (mod && k === 'v') { stop(); coller(sel); return; }
    if (k === 'enter') { stop(); commencerEdition(sel); return; }
    if (e.altKey && k === 'arrowup') { stop(); monter(sel); return; }
    if (e.altKey && k === 'arrowdown') { stop(); descendre(sel); return; }
    if (k === 'arrowup' || k === 'arrowdown') {
      stop();
      const d = docCourant();
      const el = d && d.page.arbre.parId.get(String(sel));
      if (!el) return;
      const fr = el.parent.enfants.filter((x) => x.t === 'el' && !['script', 'style'].includes(x.tag));
      const i = fr.indexOf(el);
      const autre = fr[i + (k === 'arrowup' ? -1 : 1)];
      if (autre) selectionner(autre.id);
    }
    if (k === 'arrowright') { stop(); const el = elementCourant(sel); const enfant = el && el.enfants.find((x) => x.t === 'el' && !['script', 'style'].includes(x.tag)); if (enfant) selectionner(enfant.id); }
    if (k === 'arrowleft') { stop(); selectionnerParent(sel); }
  }

  // ---------------------------------------------------------------- dépôt de fichiers depuis l'ordinateur (hors cadre)
  const surDragZone = (e) => { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) { e.preventDefault(); setDepotFichier(true); } };

  const rect = selection && !edition && cEdit.current && !apercuPlein ? cEdit.current.rectangle(selection) : null;
  const zr = zone.current ? zone.current.getBoundingClientRect() : { left: 0, top: 0 };
  const d = docCourant();
  const i = selection && d ? infos(d.page, selection) : null;

  return (
    <main class={'zone-canevas appareil-' + appareil + (apercuPlein ? ' apercu-plein' : '')} ref={zone} onDragOver={surDragZone} onDragLeave={() => setDepotFichier(false)} onDrop={() => setDepotFichier(false)}>
      <div class="scenes">
        <div class={'scene scene-principale' + (estTel ? ' cadre-tel' : '')} style={{ width: largeur * echelle + 'px', height: hCadre + 'px' }}>
          <div class="hote-cadres" ref={hoteEdit} />
        </div>
        <div class="scene scene-tel cadre-tel" style={{ display: telVisible ? '' : 'none', width: 390 * echTel + 'px', height: HAUTEUR_TEL * echTel + 'px' }}>
          <div class="hote-cadres" ref={hoteTel} />
          <span class="legende-tel">Téléphone · 390 px</span>
        </div>
      </div>
      {apercuPlein ? <div class="bandeau-apercu"><span><Icone nom="oeil" /> Aperçu : ordinateur et téléphone</span><Bouton variante="principal" icone="fermer" onClick={() => maj({ apercuPlein: false })}>Revenir à l’édition</Bouton></div> : null}
      {rect && i ? <BarreFlottante rect={rect} zr={zr} info={i} commencerEdition={commencerEdition} /> : null}
      {edition && cEdit.current && cEdit.current.edition ? <BarreTexte canevas={cEdit.current} zr={zr} /> : null}
      {depotFichier ? <div class="voile-depot">Déposez vos images sur la page, à l’endroit voulu</div> : null}
    </main>
  );
}

function BarreFlottante({ rect, zr, info, commencerEdition }) {
  if (!rect.visible) return null;
  const haut = Math.max(4, rect.y - zr.top - 40);
  const gauche = Math.max(4, Math.min(rect.x - zr.left, (zr.width || 2000) - 380));
  const glisser = (e) => {
    e.dataTransfer.setData('application/x-gdx', JSON.stringify({ type: 'deplacer', id: info.id }));
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'deplacer', id: info.id }));
    e.dataTransfer.effectAllowed = 'move';
  };
  const aTexte = info.segments.some((s) => !s.vide) || info.texteRiche;
  return (
    <div class="barre-flottante" style={{ top: haut + 'px', left: gauche + 'px' }} onMouseDown={(e) => e.preventDefault()}>
      <span class={'bf-nom' + (info.nouveau ? ' nouveau' : '')}>{info.nom}</span>
      <span class="bf-poignee" draggable="true" onDragStart={glisser} title="Glisser pour déplacer"><Icone nom="deplacer" taille={15} /></span>
      <Bouton petit variante="fantome" icone="parent" titre="Sélectionner le conteneur (Échap)" onClick={() => selectionnerParent(info.id)} />
      {aTexte ? <Bouton petit variante="fantome" icone="crayon" titre="Modifier le texte (double-clic ou Entrée)" onClick={() => commencerEdition(info.id)} /> : null}
      {info.tag === 'img' ? <Bouton petit variante="fantome" icone="image" titre="Remplacer l’image" onClick={() => maj({ modale: { type: 'media', but: 'remplacer', id: info.id } })} /> : null}
      <Bouton petit variante="fantome" icone="haut" titre="Monter (Alt+↑)" onClick={() => monter(info.id)} />
      <Bouton petit variante="fantome" icone="bas" titre="Descendre (Alt+↓)" onClick={() => descendre(info.id)} />
      <Bouton petit variante="fantome" icone="dupliquer" titre="Dupliquer (Ctrl+D)" onClick={() => dupliquer(info.id)} />
      <Bouton petit variante="fantome" icone="plus" titre="Ajouter un bloc après" onClick={() => maj({ panneau: 'ajouter', panneauOuvert: true })} />
      {info.nouveau
        ? <Bouton petit variante="fantome" icone="poubelle" titre="Retirer cet ajout (pas encore publié)" onClick={() => supprimer(info.id)} />
        : <span class="bf-cadenas" title="Contenu publié : il ne se supprime jamais"><Icone nom="cadenas" taille={14} /></span>}
      <Bouton petit variante="fantome" icone="points" titre="Plus d’actions" onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); maj({ menu: { x: r.left, y: r.bottom + 4, id: info.id } }); }} />
    </div>
  );
}

function BarreTexte({ canevas, zr }) {
  const ed = canevas.edition;
  const r = canevas.rectangle(ed.id);
  if (!r) return null;
  const haut = Math.max(4, r.y - zr.top - 44);
  const largeurBarre = ed.riche ? 470 : 230;
  const gauche = Math.max(4, Math.min(r.x - zr.left, (zr.width || 2000) - largeurBarre - 12));
  const cmd = (n, v) => (e) => { e.preventDefault(); canevas.commande(n, v); };
  const lien = (e) => {
    e.preventDefault();
    const url = window.prompt('Adresse du lien (ex. /tarifs/ ou https://…)', '/');
    if (url) canevas.commande('createLink', url.trim());
  };
  return (
    <div class="barre-texte" style={{ top: haut + 'px', left: gauche + 'px' }} onMouseDown={(e) => e.preventDefault()}>
      {ed.riche ? (
        <>
          <button type="button" title="Gras (Ctrl+B)" onMouseDown={cmd('bold')}><Icone nom="gras" taille={15} /></button>
          <button type="button" title="Italique (Ctrl+I)" onMouseDown={cmd('italic')}><Icone nom="italique" taille={15} /></button>
          <button type="button" title="Souligné" onMouseDown={cmd('underline')}><Icone nom="souligne" taille={15} /></button>
          <button type="button" title="Barré" onMouseDown={cmd('strikeThrough')}><Icone nom="barre" taille={15} /></button>
          <button type="button" title="Lien" onMouseDown={lien}><Icone nom="lien" taille={15} /></button>
          <button type="button" title="Texte orange" onMouseDown={cmd('foreColor', '#ff6b00')}><span class="pastille-couleur" style="background:#ff6b00" /></button>
          <button type="button" title="Texte blanc" onMouseDown={cmd('foreColor', '#f5f5f5')}><span class="pastille-couleur" style="background:#f5f5f5" /></button>
          <button type="button" title="Exposant (1er, 2ᵉ…)" onMouseDown={cmd('superscript')}>x²</button>
          <button type="button" title="Retirer la mise en forme" onMouseDown={cmd('removeFormat')}><Icone nom="effacer" taille={15} /></button>
          <span class="sep" />
        </>
      ) : <span class="bt-info">Texte seul</span>}
      <button type="button" class="valider" title="Valider (Entrée)" onMouseDown={(e) => { e.preventDefault(); canevas.finEdition(true); }}><Icone nom="ok" taille={15} /> Valider</button>
      <button type="button" title="Annuler (Échap)" onMouseDown={(e) => { e.preventDefault(); canevas.finEdition(false); }}><Icone nom="fermer" taille={15} /></button>
    </div>
  );
}
