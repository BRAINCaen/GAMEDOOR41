// ============================================================
// RAPPORT SEO HEBDOMADAIRE — gamedoor41.fr
// ============================================================
// Scheduled Function Netlify (cron lundi 8h Paris).
// Pull GSC + GA4 + Lighthouse, génère insights/alertes, envoie email.
//
// VOIR README.md pour la liste des credentials nécessaires
// (variables d'environnement à configurer dans Netlify Site settings).
// ============================================================

import { fetchGSC } from './lib/gsc.js';
import { fetchGA4 } from './lib/ga4.js';
import { fetchLighthouse } from './lib/lighthouse.js';
import { computeInsights } from './lib/insights.js';
import { buildCalendarSuggestions } from './lib/calendar.js';
import { renderEmailHtml } from './lib/template.js';
import { sendEmail } from './lib/mailer.js';
import { loadHistory, saveHistory } from './lib/storage.js';

export default async (req, context) => {
  const startedAt = new Date();
  console.log(`[seo-report] start at ${startedAt.toISOString()}`);

  try {
    // 1. Pull data en parallèle (GSC + GA4 + Lighthouse)
    const [gsc, ga4, lh] = await Promise.all([
      fetchGSC({ days: 7 }),       // 7 derniers jours
      fetchGA4({ days: 7 }),
      fetchLighthouse('https://gamedoor41.fr/'),
    ]);

    // 2. Charger l'historique pour comparaisons W-1 / M-1
    const history = await loadHistory();

    // 3. Calculer les insights (chutes, montées, opportunités CTR...)
    const insights = computeInsights({ gsc, ga4, lh, history });

    // 4. Calendrier saisonnier Caen + suggestions d'articles
    const calendar = buildCalendarSuggestions({ today: startedAt, gsc });

    // 5. Rendre le HTML email
    const html = renderEmailHtml({ gsc, ga4, lh, insights, calendar, history });

    // 6. Envoyer l'email
    await sendEmail({
      to: process.env.EMAIL_RECIPIENT || 'brain.caen@gmail.com',
      subject: `Rapport SEO gamedoor41.fr — ${startedAt.toLocaleDateString('fr-FR')}`,
      html,
    });

    // 7. Sauvegarder le snapshot dans l'historique
    await saveHistory({ date: startedAt, gsc, ga4, lh, insights });

    return new Response(JSON.stringify({
      ok: true,
      duration_ms: Date.now() - startedAt.getTime(),
      pages: gsc.pages?.length || 0,
      queries: gsc.queries?.length || 0,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[seo-report] error', err);
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// Déclenchement Netlify Scheduled : tous les lundis 6h UTC = 8h Paris
export const config = {
  schedule: '0 6 * * 1',
};
