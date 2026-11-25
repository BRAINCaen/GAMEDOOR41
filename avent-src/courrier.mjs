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
