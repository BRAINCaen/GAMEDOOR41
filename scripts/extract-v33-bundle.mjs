// Extract structure of GAMEDOOR41 - Home V3.3 (standalone).html bundle
// Outputs:
//   - extracted/template.html (raw template before hydration)
//   - extracted/manifest-summary.json (asset uuids + mime + size + name hint)
//   - extracted/assets/<uuid>.<ext> for each asset (decompressed)
import { readFile, writeFile, mkdir } from 'fs/promises';
import { gunzipSync } from 'zlib';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'GAMEDOOR41 - Home V3.3 (standalone).html');
const OUT = join(ROOT, 'extracted-v33');

const MIME_EXT = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'font/woff2': 'woff2',
  'font/woff': 'woff',
  'application/font-woff': 'woff',
  'text/css': 'css',
  'application/javascript': 'js',
  'text/javascript': 'js',
  'text/html': 'html',
  'application/json': 'json',
};

function extractScriptTag(html, type) {
  const re = new RegExp(`<script[^>]*type=["']${type}["'][^>]*>([\\s\\S]*?)<\\/script>`, 'i');
  const m = html.match(re);
  return m ? m[1] : null;
}

async function main() {
  console.log('Reading bundle...');
  const html = await readFile(SRC, 'utf8');
  console.log(`Bundle size: ${(html.length / 1024 / 1024).toFixed(1)} MB`);

  await mkdir(join(OUT, 'assets'), { recursive: true });

  // 1. Extract template
  const templateRaw = extractScriptTag(html, '__bundler/template');
  if (!templateRaw) {
    console.error('No template found');
    return;
  }
  // Template is JSON-encoded string (the runtime calls JSON.parse on it)
  let templateStr;
  try {
    templateStr = JSON.parse(templateRaw);
  } catch (e) {
    console.warn('Template not pure JSON, saving raw');
    templateStr = templateRaw;
  }
  await writeFile(join(OUT, 'template.html'), typeof templateStr === 'string' ? templateStr : JSON.stringify(templateStr, null, 2));
  console.log(`Template extracted: ${typeof templateStr === 'string' ? `${templateStr.length} chars` : 'JSON'}`);

  // 2. Extract external resources mapping
  const extResRaw = extractScriptTag(html, '__bundler/ext_resources');
  if (extResRaw) {
    try {
      const extRes = JSON.parse(extResRaw);
      await writeFile(join(OUT, 'ext-resources.json'), JSON.stringify(extRes, null, 2));
      console.log(`Ext resources: ${Array.isArray(extRes) ? extRes.length : Object.keys(extRes).length} entries`);
    } catch (e) {
      console.warn('Ext resources not JSON');
    }
  }

  // 3. Extract manifest
  const manifestRaw = extractScriptTag(html, '__bundler/manifest');
  if (!manifestRaw) {
    console.error('No manifest found');
    return;
  }
  const manifest = JSON.parse(manifestRaw);
  const uuids = Object.keys(manifest);
  console.log(`Manifest: ${uuids.length} assets`);

  const summary = [];
  for (const uuid of uuids) {
    const entry = manifest[uuid];
    const ext = MIME_EXT[entry.mime] || 'bin';
    let bytes = Buffer.from(entry.data, 'base64');
    if (entry.compressed) {
      try {
        bytes = gunzipSync(bytes);
      } catch (e) {
        console.warn(`Failed to gunzip ${uuid}: ${e.message}`);
      }
    }
    const fname = `${uuid}.${ext}`;
    await writeFile(join(OUT, 'assets', fname), bytes);
    summary.push({
      uuid,
      mime: entry.mime,
      ext,
      compressed: !!entry.compressed,
      sizeKB: +(bytes.length / 1024).toFixed(1),
      hint: entry.hint || entry.name || null,
    });
  }
  summary.sort((a, b) => b.sizeKB - a.sizeKB);
  await writeFile(join(OUT, 'manifest-summary.json'), JSON.stringify(summary, null, 2));

  // Stats
  const totalKB = summary.reduce((s, e) => s + e.sizeKB, 0);
  const byMime = {};
  for (const s of summary) {
    byMime[s.mime] = (byMime[s.mime] || 0) + 1;
  }
  console.log(`\nTotal extracted: ${(totalKB / 1024).toFixed(1)} MB`);
  console.log('By mime:');
  for (const [m, n] of Object.entries(byMime)) console.log(`  ${m}: ${n}`);
  console.log(`\nOutput: ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
