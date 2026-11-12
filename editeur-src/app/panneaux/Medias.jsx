// Médiathèque : images du site + dépôt de nouvelles photos (compressées automatiquement)
import { useState, useMemo, useRef } from 'preact/hooks';
import { etat, useEtat, maj, toast, docCourant } from '../etat.js';
import { appliquer } from '../actions.js';
import { insererHtml } from '../commandes.js';
import { htmlImage } from '../ZoneCanevas.jsx';
import { regrouperImages, envoyerImage, envoyerVideo, urlLocale } from '../medias.js';
import { Bouton } from '../ui/base.jsx';
import { Icone } from '../ui/icones.jsx';
import { attr } from '../../noyau/arbre.mjs';

const tailleNaturelle = (src) => new Promise((res) => {
  const im = new Image();
  im.onload = () => res({ largeur: im.naturalWidth, hauteur: im.naturalHeight });
  im.onerror = () => res({ largeur: 0, hauteur: 0 });
  im.src = urlLocale(src) || src;
});

/** Remplace l'image `id` par le média choisi. */
export async function remplacerImage(id, m) {
  const d = docCourant();
  const el = d && d.page.arbre.parId.get(String(id));
  if (!el) return;
  const t = m.largeur ? m : { ...m, ...(await tailleNaturelle(m.src)) };
  const ops = [{ op: 'image', id, src: m.src, srcset: m.srcset || undefined, sizes: m.srcset ? (m.sizes || '(max-width: 768px) 100vw, 1200px') : undefined, largeur: t.largeur || undefined, hauteur: t.hauteur || undefined }];
  if (el.nouveau && attr(el, 'data-gdb-exemple') != null) ops.push({ op: 'attr', id, nom: 'data-gdb-exemple', valeur: null });
  if (appliquer(ops, 'Image remplacée')) toast('Image remplacée. Pensez à vérifier sa description dans l’inspecteur.', 'succes', 4000);
}

/** Dépôt de fichiers : renvoie les médias prêts (images compressées). */
export async function deposerFichiers(fichiers, suivi) {
  const out = [];
  for (const f of fichiers) {
    try {
      const m = /^video\//.test(f.type) ? await envoyerVideo(f, suivi) : await envoyerImage(f, suivi);
      const d = docCourant();
      if (d) d.medias.push(...m.medias);
      etat.mediasDeposes = [{ ...m, nom: f.name, video: /^video\//.test(f.type), date: Date.now() }, ...(etat.mediasDeposes || [])];
      out.push(m);
    } catch (e) { toast(f.name + ' : ' + e.message, 'erreur', 8000); }
  }
  maj({ mediasDeposes: etat.mediasDeposes });
  return out;
}

export function GrilleMedias({ surChoix, video = false }) {
  const medias = useEtat((e) => e.medias);
  const deposes = useEtat((e) => e.mediasDeposes) || [];
  const [q, setQ] = useState('');
  const [dossier, setDossier] = useState('');
  const [envoi, setEnvoi] = useState(null);
  const champ = useRef(null);
  const groupes = useMemo(() => regrouperImages(medias), [medias]);
  const dossiers = useMemo(() => [...new Set(groupes.map((g) => g.dossier.split('/')[0]).filter(Boolean))].sort(), [groupes]);
  const f = q.trim().toLowerCase();
  const liste = groupes.filter((g) => (!dossier || g.dossier.startsWith(dossier)) && (!f || g.cle.toLowerCase().includes(f))).slice(0, 400);
  const envoyer = async (fichiers) => {
    if (!fichiers || !fichiers.length) return;
    setEnvoi('Préparation…');
    const res = await deposerFichiers([...fichiers], (t) => setEnvoi(t));
    setEnvoi(null);
    if (res.length === 1 && surChoix) surChoix(res[0]);
  };
  return (
    <div class="medias">
      <div class="zone-depot" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); envoyer(e.dataTransfer.files); }} onClick={() => champ.current && champ.current.click()} role="button" tabIndex={0}>
        <Icone nom="telecharger" taille={22} />
        <span>{envoi || 'Déposez vos photos ici ou cliquez pour les choisir'}</span>
        <small>Elles sont redimensionnées et compressées automatiquement. Jamais d’image générée par IA.</small>
        <input ref={champ} type="file" accept={video ? 'video/mp4,video/webm' : 'image/*,video/mp4,video/webm'} multiple hidden onChange={(e) => envoyer(e.currentTarget.files)} />
      </div>
      {deposes.length ? (
        <section>
          <h3>Vos ajouts (publiés avec la page)</h3>
          <div class="grille-medias">
            {deposes.map((m) => (
              <button type="button" class="vignette" title={m.nom} draggable={!m.video} onDragStart={(e) => e.dataTransfer.setData('application/x-gdx', JSON.stringify({ type: 'media', media: m }))} onClick={() => surChoix && surChoix(m)}>
                {m.video ? <span class="vignette-video"><Icone nom="video" /></span> : <img src={urlLocale(m.src) || m.src} alt="" loading="lazy" />}
              </button>
            ))}
          </div>
        </section>
      ) : null}
      {!video ? (
        <>
          <div class="filtres-medias">
            <input class="recherche-panneau" type="search" placeholder="Chercher une image (psychiatric, quiz, equipe…)" value={q} onInput={(e) => setQ(e.currentTarget.value)} />
            <select value={dossier} onChange={(e) => setDossier(e.currentTarget.value)}>
              <option value="">Tous les dossiers</option>
              {dossiers.map((x) => <option value={x}>{x}</option>)}
            </select>
          </div>
          <div class="grille-medias">
            {liste.map((g) => {
              const m = { src: g.src, srcset: g.srcset, nom: g.nom };
              return (
                <button type="button" class="vignette" title={g.cle} draggable="true" onDragStart={(e) => e.dataTransfer.setData('application/x-gdx', JSON.stringify({ type: 'media', media: m }))} onClick={() => surChoix && surChoix(m)}>
                  <img src={g.vignette} alt="" loading="lazy" />
                </button>
              );
            })}
          </div>
          {groupes.length > liste.length ? <p class="aide-ligne">{liste.length} images affichées sur {groupes.length} : affinez la recherche.</p> : null}
        </>
      ) : null}
    </div>
  );
}

export function PanneauMedias() {
  const selection = useEtat((e) => e.selection);
  const d = docCourant();
  const el = d && selection ? d.page.arbre.parId.get(String(selection)) : null;
  const surImage = el && el.tag === 'img';
  return (
    <div>
      <p class="aide-ligne">{surImage ? 'Cliquez sur une image pour remplacer l’image sélectionnée.' : 'Cliquez sur une image pour l’ajouter après la sélection, ou glissez-la dans la page.'}</p>
      <GrilleMedias surChoix={(m) => {
        if (m.video) { insererHtml('<figure class="gdb-video" data-gdb="video-site"><video src="' + m.src + '" controls playsinline preload="metadata"></video></figure>', 'Vidéo ajoutée'); return; }
        if (surImage) remplacerImage(el.id, m);
        else insererHtml(htmlImage(m, ''), 'Image ajoutée');
      }} />
    </div>
  );
}
