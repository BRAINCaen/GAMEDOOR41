// Panneau « Google » : titre et description dans Google, image de partage, plan des titres
import { useEtat, maj, docCourant } from '../etat.js';
import { appliquer, selectionner } from '../actions.js';
import { Champ, Saisie, Bouton } from '../ui/base.jsx';
import { Icone } from '../ui/icones.jsx';
import { elements, attr, texteVisible } from '../../noyau/arbre.mjs';
import { urlPage } from '../site.js';

const compteur = (n, min, max) => (n < min ? 'trop court' : n > max ? 'trop long' : 'bien');

export function PanneauSeo() {
  useEtat((e) => e.rev);
  const d = docCourant();
  if (!d) return null;
  const page = d.page;
  const tete = page.tete();
  const corps = page.corps();
  const metas = tete ? [...elements(tete)] : [];
  const title = metas.find((m) => m.tag === 'title');
  const titre = title ? texteVisible(title) : '';
  const meta = (cle, v) => { const m = metas.find((x) => x.tag === 'meta' && attr(x, cle) === v); return m ? attr(m, 'content') || '' : ''; };
  const description = meta('name', 'description');
  const ogImage = meta('property', 'og:image');
  const titres = corps ? [...elements(corps)].filter((e) => /^h[1-4]$/.test(e.tag)) : [];
  const h1 = titres.filter((e) => e.tag === 'h1').length;
  const images = corps ? [...elements(corps)].filter((e) => e.tag === 'img') : [];
  const sansAlt = images.filter((e) => !(attr(e, 'alt') || '').trim()).length;
  const mots = corps ? texteVisible(corps).split(/\s+/).filter(Boolean).length : 0;
  const url = 'gamedoor41.fr' + urlPage(d.chemin).replace(/\/$/, '').replace(/^\//, ' › ').replace(/\//g, ' › ');
  return (
    <div class="seo">
      <div class="apercu-google">
        <span class="ag-site"><img src="/img/logo/favicon.svg" alt="" width="18" height="18" /> GAMEDOOR·41 <small>{url}</small></span>
        <span class="ag-titre">{titre.length > 60 ? titre.slice(0, 58) + '…' : titre}</span>
        <span class="ag-desc">{description.length > 158 ? description.slice(0, 155) + '…' : description}</span>
      </div>
      <Champ libelle="Titre dans Google" compteur={titre.length + ' car. · ' + compteur(titre.length, 30, 62)} aide="Le texte bleu cliquable dans Google. Commencez par le plus important (activité + Caen).">
        <Saisie multiligne lignes={2} valeur={titre} surValider={(v) => appliquer([{ op: 'meta', titre: v }], 'Titre Google modifié')} />
      </Champ>
      <Champ libelle="Description dans Google" compteur={description.length + ' car. · ' + compteur(description.length, 70, 160)} aide="Le petit texte sous le titre : donnez envie de cliquer en une ou deux phrases.">
        <Saisie multiligne lignes={4} valeur={description} surValider={(v) => appliquer([{ op: 'meta', description: v }], 'Description Google modifiée')} />
      </Champ>
      <Champ libelle="Image de partage (Facebook, WhatsApp…)">
        <div class="og">
          {ogImage ? <img src={ogImage.replace(/^https:\/\/(www\.)?gamedoor41\.fr/, '')} alt="" /> : <span class="aide-ligne">Aucune</span>}
          <Bouton petit icone="image" onClick={() => maj({ modale: { type: 'media', but: 'og' } })}>Changer</Bouton>
        </div>
      </Champ>
      <Bouton icone="assistant" onClick={() => maj({ panneau: 'assistant', assistantPreRempli: 'Propose un meilleur titre Google (60 caractères max) et une meilleure description (155 caractères max) pour cette page, sans inventer d’information.' })}>Demander une proposition à l’assistant</Bouton>
      <section class="insp-section">
        <h3>Vérifications rapides</h3>
        <ul class="checks">
          <li class={h1 === 1 ? 'ok' : 'ko'}><Icone nom={h1 === 1 ? 'ok' : 'alerte'} taille={14} /> {h1 === 1 ? 'Un seul titre principal (H1)' : h1 === 0 ? 'Aucun titre principal (H1)' : h1 + ' titres principaux (H1) : un seul conseillé'}</li>
          <li class={sansAlt ? 'ko' : 'ok'}><Icone nom={sansAlt ? 'alerte' : 'ok'} taille={14} /> {sansAlt ? sansAlt + ' image(s) sans description' : 'Toutes les images ont une description'}</li>
          <li class={mots >= 300 ? 'ok' : 'ko'}><Icone nom={mots >= 300 ? 'ok' : 'info'} taille={14} /> {mots} mots dans la page{mots < 300 ? ' (Google préfère au moins 300 mots)' : ''}</li>
        </ul>
      </section>
      <section class="insp-section">
        <h3>Plan des titres</h3>
        <ul class="plan-titres">
          {titres.map((t) => <li class={'niv-' + t.tag}><button type="button" onClick={() => selectionner(t.id)}><b>{t.tag.toUpperCase()}</b> {texteVisible(t).slice(0, 70) || '(vide)'}</button></li>)}
        </ul>
      </section>
    </div>
  );
}
