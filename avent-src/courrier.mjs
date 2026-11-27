// Envoi des mails du calendrier de l'Avent (gagnants, accusés de réception, bilan du jour).
// En ligne : Brevo (clé BREVO_API_KEY du site, jamais dans le dépôt). Sans clé, le moteur n'envoie rien
// et l'équipe prévient les gagnants à la main depuis son écran (bouton « Écrire au gagnant »).

export function courrierBrevo({ cle, expediteur, repondre, envoi = fetch }) {
  return {
    async envoyer({ a, nom, sujet, texte, html, repondreA }) {
      try {
        const r = await envoi('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: { 'api-key': cle, 'content-type': 'application/json', accept: 'application/json' },
          body: JSON.stringify({ sender: expediteur, to: [{ email: a, name: nom || undefined }], replyTo: repondreA || repondre || expediteur, subject: sujet, textContent: texte, htmlContent: html, tags: ['avent-2026'] }),
          signal: AbortSignal.timeout(10000),
        });
        if (r.ok) return { ok: true };
        return { ok: false, erreur: 'Brevo ' + r.status + ' ' + (await r.text()).slice(0, 160) };
      } catch (e) {
        return { ok: false, erreur: String((e && e.message) || e).slice(0, 160) };
      }
    },
  };
}

/** Par le Hub (27/11/2026, Allan : « la clé Brevo, c'est la même partout ») : le Hub garde la clé Brevo et fait partir
 *  chaque mail depuis contact@gamedoor41.fr (synergia-hub, /api/pont/avent-mail, netlify/lib/pont-avent.mjs de son dépôt).
 *  La clé du relais est dans la variable AVENT_RELAIS_CLE du site ; le Hub n'en garde que l'empreinte.
 *  Réponse 429 du Hub = quota de mails du jour atteint : le moteur refera un essai plus tard. */
export function courrierRelais({ url, cle, envoi = fetch }) {
  return {
    async envoyer({ a, nom, sujet, texte, html, repondreA, tag }) {
      try {
        const r = await envoi(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-cle-hub': cle },
          body: JSON.stringify({ a, nom, sujet, texte, html, repondreA: repondreA || null, tag: tag || 'avent' }),
          signal: AbortSignal.timeout(20000),
        });
        if (r.ok) return { ok: true };
        let detail = '';
        try { detail = String(((await r.json()) || {}).erreur || ''); } catch (_) { /* réponse non lisible */ }
        return { ok: false, erreur: 'Hub ' + r.status + (detail ? ' ' + detail : '').slice(0, 160), quota: r.status === 429 };
      } catch (e) {
        return { ok: false, erreur: String((e && e.message) || e).slice(0, 160) };
      }
    },
  };
}

/** Sur un aperçu : seuls les mails vers une adresse de l'équipe partent vraiment ; les autres (faux joueurs d'essai)
 *  sont comptés comme envoyés sans rien envoyer. Jamais de vrai mail vers un inconnu depuis une page test. */
export function seulementEquipe(courrier, domaine = 'gamedoor41.fr') {
  return {
    async envoyer(message) {
      if (String(message.a || '').toLowerCase().endsWith('@' + domaine)) return courrier.envoyer(message);
      return { ok: true, simule: true };
    },
  };
}

/** Pour les essais : garde les mails au lieu de les envoyer. `panne()` fait échouer les envois suivants. */
export function courrierMemoire() {
  const boite = [];
  let enPanne = false;
  return {
    boite,
    panne(oui = true) { enPanne = oui; },
    async envoyer(message) { if (enPanne) return { ok: false, erreur: 'panne simulée' }; boite.push(message); return { ok: true }; },
  };
}
