// ==========================================================================
// Éditeur du site — ASSISTANT (Claude)
//
// La personne décrit ce qu'elle veut (« ajoute un bandeau pour Noël sous le
// menu », « réécris ce paragraphe plus court », « propose un titre Google »).
// Claude répond par une LISTE D'OPÉRATIONS de l'éditeur (mêmes règles que les
// clics : rien de publié ne peut être retiré), que le navigateur applique
// comme une étape annulable ; rien n'est publié sans validation humaine.
// Textes seulement : JAMAIS d'image, de vidéo ou de voix générée (règle
// d'Allan du 11/11/2026).
// Clé : variable Netlify ANTHROPIC_API_KEY. Modèle, effort et plafond
// quotidien : Réglages de l'éditeur (admins).
// ==========================================================================

import Anthropic from '@anthropic-ai/sdk';
import { ErreurEditeur } from '../noyau/arbre.mjs';

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['explication', 'operations', 'questions'],
  properties: {
    explication: { type: 'string', description: 'Ce que tu proposes, en 1 à 4 phrases simples, en français.' },
    questions: { type: 'array', items: { type: 'string' }, description: 'Informations manquantes à demander (prix, dates, horaires…) au lieu de les inventer. Vide si rien ne manque.' },
    operations: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['op', 'id', 'position', 'html', 'n', 'ancien', 'valeur', 'nom', 'styles_json', 'titre', 'description', 'libelle'],
        properties: {
          op: { type: 'string', enum: ['inserer', 'texte', 'html', 'attr', 'style', 'meta', 'deplacer', 'dupliquer'] },
          id: { type: ['string', 'null'], description: 'Identifiant data-gdx de l’élément visé (ou de référence pour inserer/deplacer)' },
          position: { type: ['string', 'null'], enum: ['avant', 'apres', 'debut', 'fin', null] },
          html: { type: ['string', 'null'], description: 'HTML à insérer (inserer) ou texte mis en forme (html)' },
          n: { type: ['integer', 'null'], description: 'texte : index du segment de texte dans l’élément' },
          ancien: { type: ['string', 'null'] },
          valeur: { type: ['string', 'null'], description: 'texte : nouveau texte ; attr : nouvelle valeur' },
          nom: { type: ['string', 'null'], description: 'attr : nom de l’attribut' },
          styles_json: { type: ['string', 'null'], description: 'style : JSON {"tous":{"color":"#ff6b00"},"telephone":{...}}' },
          titre: { type: ['string', 'null'], description: 'meta : titre Google' },
          description: { type: ['string', 'null'], description: 'meta : description Google' },
          libelle: { type: 'string', description: 'Phrase courte lisible : ce que fait cette opération' },
        },
      },
    },
  },
};

function systeme(regles, catalogue) {
  return [
    'Tu es l’assistant de l’éditeur du site gamedoor41.fr (GAMEDOOR·41 : escape games « Garde à Vue », « Psychiatric », « Back to the 80’s » et quiz game « Buzz Your Brain » à Mondeville, près de Caen). Tu aides un membre de l’équipe (pas développeur) à modifier une page.',
    '',
    'RÈGLES ABSOLUES',
    '1. On ne supprime JAMAIS de contenu publié : aucune opération ne retire un élément ; un texte publié se réécrit sans être vidé ni raccourci de plus des deux tiers ; aucun style ne masque un élément publié. Si on te demande de supprimer, explique que c’est interdit et propose une alternative (réécrire, déplacer, ajouter à côté).',
    '2. N’invente JAMAIS un prix, un horaire, une capacité, un âge, une date, une promotion, un code promo ou un chiffre : s’il manque, mets-le dans « questions » et laisse un texte d’exemple marqué data-gdb-exemple="" dans le HTML.',
    '3. Textes uniquement : jamais d’image, de vidéo ou de voix générée. Pour une image, utilise une image existante du site marquée data-gdb-exemple="" (la personne la remplacera).',
    '4. Style de la marque : tutoiement interdit (vouvoiement), phrases courtes, chaleureux, pas de jargon. Jamais « facultatif » (dire « si vous voulez »), jamais « appelez-nous » (renvoyer vers la réservation en ligne /reserver/ ou contact@gamedoor41.fr), jamais d’annulation ni de remboursement (on parle de report). Cartes cadeaux valables 12 mois.',
    '5. HTML : seulement des balises de contenu (section, div, h2-h4, p, ul/li, a, strong, em, img du site, figure, details/summary, table…), classes du site (container, btn btn-primary, btn-outline) et classes gdb-* des blocs ci-dessous ; aucun script, aucun « on… », aucun style position:fixed. Un nouveau bloc complet va AVANT ou APRÈS une section (id d’une section ou d’un conteneur), jamais à l’intérieur d’un paragraphe.',
    '6. Opérations : « texte » = { id, n, ancien, valeur } (n = index du segment de texte dans l’élément, ancien = texte actuel exact) ; « html » = { id, html } pour réécrire un élément qui ne contient que du texte mis en forme (garde ses liens) ; « attr » = { id, nom, valeur } (href, alt, title…) ; « style » = { id, styles_json } ; « inserer » = { id, position, html } ; « deplacer » = { id (élément), position, valeur = id de référence } ; « dupliquer » = { id } ; « meta » = { titre, description }. Les champs inutiles valent null. Utilise UNIQUEMENT des id présents dans le plan de la page.',
    '7. Fais le minimum utile, proprement. Pas plus de 12 opérations.',
    '',
    'Règles maison à respecter (relecture automatique) :',
    ...regles.map((r) => '- ' + r.message),
    '',
    'BLOCS DISPONIBLES (réutilise leur HTML et leurs classes gdb-*) :',
    catalogue,
  ].join('\n');
}

/**
 * @param {object} p  { instruction, chemin, plan, selection, qui, reglages, env, catalogue }
 */
export async function demanderAssistant(p) {
  const cle = p.env.ANTHROPIC_API_KEY;
  if (!cle) throw new ErreurEditeur('L’assistant n’est pas encore branché (clé absente). Prévenez Allan.', 'IA_NON_CONFIGURE');
  const instruction = String(p.instruction || '').trim().slice(0, 4000);
  if (instruction.length < 3) throw new ErreurEditeur('Décrivez ce que vous voulez.', 'VIDE');
  const plan = String(p.plan || '').slice(0, 120000);
  const client = new Anthropic({ apiKey: cle, timeout: 240000, maxRetries: 1 });
  const modele = p.reglages.ia.modele || 'claude-opus-5-5';
  const requete = {
    model: modele,
    max_tokens: 16000,
    output_config: { effort: p.reglages.ia.effort || 'medium', format: { type: 'json_schema', schema: SCHEMA } },
    system: [{ type: 'text', text: systeme(p.reglages.regles || [], String(p.catalogue || '').slice(0, 60000)), cache_control: { type: 'ephemeral' } }],
    messages: [{
      role: 'user',
      content: [
        'Page : /' + String(p.chemin || '').replace(/index\.html$/, ''),
        p.selection ? 'Élément sélectionné par la personne :\n' + String(p.selection).slice(0, 20000) : 'Aucun élément sélectionné.',
        'Plan de la page (id data-gdx, balise, classes, textes) :\n' + plan,
        'Demande de ' + (p.qui && p.qui.nom ? p.qui.nom : 'la personne') + ' :\n' + instruction,
      ].join('\n\n'),
    }],
  };
  // Repli automatique sur un autre modèle si celui-ci refuse (sauf Haiku, sans repli serveur)
  const avecRepli = !/haiku/.test(modele);
  const reponse = avecRepli
    ? await client.beta.messages.create({ ...requete, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' })
    : await client.messages.create(requete);
  if (reponse.stop_reason === 'refusal') throw new ErreurEditeur('L’assistant a refusé cette demande. Reformulez-la.', 'IA_REFUS');
  if (reponse.stop_reason === 'max_tokens') throw new ErreurEditeur('La réponse de l’assistant était trop longue : demandez quelque chose de plus ciblé.', 'IA_LONG');
  const bloc = reponse.content.find((b) => b.type === 'text');
  let donnee;
  try { donnee = JSON.parse(bloc ? bloc.text : ''); } catch (_) { throw new ErreurEditeur('Réponse illisible de l’assistant : réessayez.', 'IA_ILLISIBLE'); }
  const operations = (Array.isArray(donnee.operations) ? donnee.operations : []).slice(0, 12).map((o) => {
    const op = { op: o.op, libelle: o.libelle || null };
    if (o.id != null) op.id = String(o.id);
    if (o.op === 'texte') Object.assign(op, { n: Number(o.n) || 0, ancien: o.ancien, valeur: o.valeur });
    if (o.op === 'html') op.html = o.html;
    if (o.op === 'attr') Object.assign(op, { nom: o.nom, valeur: o.valeur });
    if (o.op === 'style') { try { op.styles = JSON.parse(o.styles_json || '{}'); } catch (_) { op.styles = {}; } }
    if (o.op === 'inserer') Object.assign(op, { position: o.position || 'apres', html: o.html });
    if (o.op === 'deplacer') Object.assign(op, { position: o.position || 'apres', ref: o.valeur });
    if (o.op === 'meta') { if (o.titre) op.titre = o.titre; if (o.description) op.description = o.description; }
    return op;
  });
  const u = reponse.usage || {};
  return {
    explication: String(donnee.explication || ''),
    questions: Array.isArray(donnee.questions) ? donnee.questions.map(String).slice(0, 8) : [],
    operations,
    modele: reponse.model,
    jetons: { entree: u.input_tokens || 0, cache: u.cache_read_input_tokens || 0, sortie: u.output_tokens || 0 },
  };
}
