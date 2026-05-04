import { readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const PAGES = [
  'quiz-game-caen/index.html',
  'escape-game-caen/index.html',
  'escape-game-caen/back-to-the-80s/index.html',
  'escape-game-caen/garde-a-vue/index.html',
  'escape-game-caen/psychiatric/index.html',
  'team-building-caen/index.html',
  'evjf-caen/index.html',
  'evg-caen/index.html',
  'anniversaire-caen/index.html',
  'tarifs/index.html',
  'contact/index.html',
  'devis/index.html',
  'cadeau/index.html',
  'references-entreprises-caen/index.html',
];

const BANDEAU = `  <!-- =====================================================
       BANDEAU BRAIN HERITAGE — continuité Brain → GAMEDOOR·41
  ===================================================== -->
  <section class="heritage" aria-label="Continuité de l'équipe Brain Escape Game">
    <div class="container container-wide">
      <div class="heritage-band reveal">
        <span class="heritage-eq"><strong>Brain Escape Game + Buzz Your Brain = GAMEDOOR·41</strong></span>
        <span class="heritage-sep" aria-hidden="true">·</span>
        <span class="heritage-tag">
          <img src="/img/icons/users.svg" alt="" aria-hidden="true" class="heritage-ico">
          Même équipe
        </span>
        <span class="heritage-sep" aria-hidden="true">·</span>
        <span class="heritage-tag">
          <img src="/img/icons/pin.svg" alt="" aria-hidden="true" class="heritage-ico">
          Même adresse
        </span>
        <span class="heritage-sep" aria-hidden="true">·</span>
        <span class="heritage-tag">
          <img src="/img/icons/gamepad.svg" alt="" aria-hidden="true" class="heritage-ico">
          Plus de jeux
        </span>
      </div>
    </div>
  </section>

`;

const FOOTER_ANCHOR = '<footer class="site-footer" role="contentinfo">';
const SENTINEL = 'aria-label="Continuité de l\'équipe Brain Escape Game"';

async function injectOne(rel) {
  const path = join(ROOT, rel);
  const html = await readFile(path, 'utf8');

  if (html.includes(SENTINEL)) {
    console.log(`= ${rel}  (already has bandeau, skip)`);
    return;
  }

  const idx = html.indexOf(FOOTER_ANCHOR);
  if (idx === -1) {
    console.warn(`! ${rel}  (no footer anchor — skipped)`);
    return;
  }

  // Find the line start of the footer to preserve indentation
  const lineStart = html.lastIndexOf('\n', idx) + 1;
  const before = html.slice(0, lineStart);
  const after = html.slice(lineStart);
  const out = before + BANDEAU + after;

  await writeFile(path, out, 'utf8');
  console.log(`+ ${rel}  (bandeau injected)`);
}

for (const p of PAGES) {
  try { await injectOne(p); }
  catch (e) { console.error(`x ${p}  ${e.message}`); }
}
