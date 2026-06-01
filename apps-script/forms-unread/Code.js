/**
 * GAMEDOOR41 — Auto-unread formulaires (version optimisée anti-quota)
 *
 * Remet en "non lu" les emails des formulaires du site
 * (alternance / devis / restauration via EmailJS) qui arrivent "déjà lus"
 * à cause du self-send Gmail (destinataire contact+forms@gamedoor41.fr).
 *
 * Optimisations vs version précédente :
 * 1. Le label est récupéré UNE SEULE FOIS avant la boucle
 *    (avant : N appels getUserLabelByName + createLabel par run)
 * 2. Filtre `-label:` exclut les threads déjà traités
 *    (avant : un email rouvert par l'user était re-marqué non-lu = boucle)
 * 3. markThreadsUnread + addToThreads en batch
 *    (avant : N appels markUnread + N appels addLabel par run)
 * 4. Early return si aucun thread (0 appel Gmail inutile)
 * 5. newer_than:1d (au lieu de 1h) = rattrape les derniers emails si le script
 *    a eu un trou (mais reste très ciblé)
 *
 * Résultat : 2-4 appels Gmail max par exécution, quel que soit le volume.
 * Avec un trigger à 15 min → ~400 appels Gmail / jour (vs des milliers avant).
 *
 * Synchronisé depuis le repo via clasp. Source de vérité : repo git.
 */
function markFormsUnread() {
  const LABEL_NAME = '📋 Formulaires Site';

  // Récupère (ou crée) le label UNE seule fois avant toute requête
  const label = GmailApp.getUserLabelByName(LABEL_NAME) || GmailApp.createLabel(LABEL_NAME);

  // Cherche les emails de formulaires reçus dans les dernières 24h,
  // actuellement LUS, et PAS encore labellisés (= pas encore traités par le script).
  // Le filtre -label:"..." casse la boucle infinie : si l'user rouvre un email
  // déjà traité, il ne sera plus re-marqué non-lu.
  const query = 'to:(contact+forms@gamedoor41.fr) is:read newer_than:1d -label:"📋 Formulaires Site"';
  const threads = GmailApp.search(query, 0, 50);

  if (threads.length === 0) {
    return; // rien à faire → zéro appel Gmail inutile
  }

  // Batch : 2 appels Gmail seulement, quel que soit le nombre de threads
  GmailApp.markThreadsUnread(threads);
  label.addToThreads(threads);

  console.log(`Marqué non-lus : ${threads.length}`);
}
