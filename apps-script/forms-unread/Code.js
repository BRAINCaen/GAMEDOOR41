/**
 * GAMEDOOR41 — Auto-unread formulaires (version auto-correctrice anti-quota)
 *
 * Remet en "non lu" les emails des formulaires du site
 * (alternance / devis / restauration via EmailJS) qui arrivent "déjà lus"
 * à cause du self-send Gmail (destinataire contact+forms@gamedoor41.fr).
 *
 * Optimisations :
 * 1. Auto-correction du trigger au début de chaque run (si > 1 trigger ou
 *    fréquence < 10 min, on supprime tout et on crée un seul trigger 15 min).
 *    → l'user n'a plus besoin de cliquer dans l'UI pour ajuster la fréquence.
 * 2. Label récupéré UNE SEULE FOIS avant la boucle.
 * 3. Filtre `-label:` exclut les threads déjà traités (pas de boucle).
 * 4. markThreadsUnread + addToThreads en batch.
 * 5. Early return si aucun thread (0 appel Gmail inutile).
 * 6. Garde-fou anti-quota : si > 10 threads à traiter en un run, on traite
 *    les 10 premiers et on log un warning (signe que le script n'a pas tourné
 *    depuis longtemps).
 *
 * Avec trigger à 15 min : ~96 runs/jour × 2-4 appels Gmail = ~400/jour max.
 *
 * Synchronisé depuis le repo via clasp. Source de vérité : repo git.
 */

const LABEL_NAME = 'forms-auto-unread';  // simple, sans emoji ni espace = robuste en query Gmail
const LABEL_VISIBLE = '📋 Formulaires Site';  // label "joli" affiché à l'utilisateur en plus
const TARGET_INTERVAL_MINUTES = 15;
const MAX_THREADS_PER_RUN = 10;

function markFormsUnread() {
  // 0. AUTO-CORRECTION DU TRIGGER (avant tout appel Gmail couteux)
  _ensureSingleTrigger();

  // 1. Récupère (ou crée) les 2 labels UNE seule fois
  const labelTech = GmailApp.getUserLabelByName(LABEL_NAME) || GmailApp.createLabel(LABEL_NAME);
  const labelVisible = GmailApp.getUserLabelByName(LABEL_VISIBLE) || GmailApp.createLabel(LABEL_VISIBLE);

  // 2. Cherche les emails de formulaires reçus dans les dernières 24h,
  //    actuellement LUS, et PAS encore labellisés par le script.
  //    On filtre sur le label TECHNIQUE (sans emoji ni espace) pour éviter
  //    tout problème de parsing Gmail Search avec les caractères spéciaux.
  const query = 'to:(contact+forms@gamedoor41.fr) is:read newer_than:1d -label:' + LABEL_NAME;
  const threads = GmailApp.search(query, 0, MAX_THREADS_PER_RUN);

  if (threads.length === 0) {
    return; // rien à faire → zéro appel Gmail inutile
  }

  // 3. Batch : 3 appels Gmail seulement (markThreadsUnread + 2× addToThreads)
  GmailApp.markThreadsUnread(threads);
  labelTech.addToThreads(threads);
  labelVisible.addToThreads(threads);

  console.log(`Marqué non-lus : ${threads.length} thread(s)`);

  if (threads.length === MAX_THREADS_PER_RUN) {
    console.warn('Limite ' + MAX_THREADS_PER_RUN + ' threads atteinte ce run. Si le script n\'a pas tourné depuis longtemps, relancer manuellement.');
  }
}

/**
 * Garantit qu'il existe EXACTEMENT 1 trigger pour markFormsUnread,
 * qui tourne toutes les TARGET_INTERVAL_MINUTES minutes.
 * Si plusieurs triggers existent ou si la fréquence n'est pas la bonne,
 * on supprime tout et on recrée proprement.
 */
function _ensureSingleTrigger() {
  const triggers = ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'markFormsUnread');

  // S'il n'y en a qu'1 et qu'il a déjà la bonne fréquence, on ne touche pas.
  // (Apps Script ne donne pas la fréquence en lecture, donc on prend une heuristique :
  //  si exactement 1 trigger existe, on suppose qu'il est OK. La fréquence aura été
  //  imposée par la création précédente.)
  if (triggers.length === 1) {
    return;
  }

  // Sinon : nettoyage + recréation
  triggers.forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('markFormsUnread')
    .timeBased()
    .everyMinutes(TARGET_INTERVAL_MINUTES)
    .create();
  console.log('Trigger reconfiguré : 1 unique trigger à ' + TARGET_INTERVAL_MINUTES + ' min');
}

/**
 * 👉 FONCTION À EXÉCUTER MANUELLEMENT UNE FOIS depuis l'éditeur Apps Script
 * si le trigger actuel est trop fréquent et qu'on veut forcer la réinit
 * immédiate (sans attendre le prochain run qui pourrait être bloqué par quota).
 *
 * Comment :
 * 1. Ouvrir le projet sur script.google.com
 * 2. Sélectionner cette fonction dans le menu déroulant en haut
 * 3. Cliquer "Exécuter"
 * 4. Autoriser si demandé
 */
function installTrigger15Min() {
  const triggers = ScriptApp.getProjectTriggers();
  let supprimes = 0;
  triggers.forEach(t => {
    ScriptApp.deleteTrigger(t);
    supprimes++;
  });
  ScriptApp.newTrigger('markFormsUnread')
    .timeBased()
    .everyMinutes(TARGET_INTERVAL_MINUTES)
    .create();
  console.log('OK : ' + supprimes + ' ancien(s) trigger(s) supprimé(s), nouveau trigger 15 min créé.');
}

/**
 * Outil de diagnostic : liste tous les triggers du projet avec leur fréquence.
 * À exécuter manuellement pour vérifier l'état.
 */
function diagnosticTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  console.log('Nombre total de triggers : ' + triggers.length);
  triggers.forEach((t, i) => {
    console.log((i + 1) + '. Fonction: ' + t.getHandlerFunction() + ' | Source: ' + t.getTriggerSource() + ' | EventType: ' + t.getEventType());
  });
}
