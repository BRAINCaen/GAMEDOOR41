// ============================================================
// ANCIEN RAPPORT SEO BRAIN GAMES — DÉSACTIVÉ 2026-06-01
// ============================================================
//
// Ce script déclenchait chaque lundi 8h l'envoi d'un rapport SEO
// généré par https://brain-seo-report.netlify.app (Netlify Function externe).
//
// PROBLÈME : la function scannait les anciens domaines Brain
// (brain-escapegame-caen.fr + buzzyourbrain-caen.fr) qui redirigent
// désormais en 301 vers gamedoor41.fr. Tout le rapport est à 0.
//
// REMPLACEMENT : un nouveau rapport SEO basé sur l'API GSC + GA4
// de gamedoor41.fr est en construction dans le repo gamedoor41
// (netlify/functions/seo-report/).
//
// CE FICHIER : version "self-destruct" — à la prochaine exécution
// (lundi 8h), tous les triggers sont supprimés et une notification
// d'extinction est envoyée. Après ça l'user peut supprimer ce projet
// + le site Netlify brain-seo-report sans risque.
// ============================================================

function envoyerRapportSEO() {
  // 1. Supprimer tous les triggers de ce projet (auto-désactivation)
  const triggers = ScriptApp.getProjectTriggers();
  let nbSupprimes = 0;
  triggers.forEach(t => {
    ScriptApp.deleteTrigger(t);
    nbSupprimes++;
  });

  // 2. Notifier l'utilisateur que l'ancien rapport est définitivement éteint
  GmailApp.sendEmail(
    'brain.caen@gmail.com',
    '🧹 Ancien rapport SEO Brain Games — DÉSACTIVÉ',
    'L\'ancien script "Trigger automatique lundi" a été auto-désactivé.\n\n' +
    'Raison : il scannait les anciens domaines Brain (brain-escapegame-caen.fr + buzzyourbrain-caen.fr) ' +
    'qui redirigent maintenant en 301 vers gamedoor41.fr. Tout le rapport était à zéro depuis la migration.\n\n' +
    'Triggers supprimés : ' + nbSupprimes + '\n\n' +
    'Tu peux maintenant :\n' +
    '  1. Supprimer ce projet Apps Script (script.google.com > Mes projets > "Trigger automatique lundi" > menu > Supprimer)\n' +
    '  2. Désactiver le site Netlify brain-seo-report.netlify.app (Netlify dashboard > Site settings > Delete site)\n\n' +
    'Un nouveau rapport SEO basé sur GSC + GA4 de gamedoor41.fr est en cours de développement, ' +
    'avec insights automatiques, calendrier saisonnier Caen et suggestions d\'articles. ' +
    'Tu recevras le premier dans les prochains jours.\n\n' +
    'Date d\'extinction : ' + new Date().toLocaleString('fr-FR')
  );

  Logger.log('Script auto-désactivé. Triggers supprimés : ' + nbSupprimes);
}

/**
 * Outil manuel — supprime tous les triggers immédiatement
 * (pour ne pas attendre le prochain lundi)
 */
function supprimerTousTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => ScriptApp.deleteTrigger(t));
  Logger.log('Tous les triggers ont été supprimés (' + triggers.length + ')');
}
