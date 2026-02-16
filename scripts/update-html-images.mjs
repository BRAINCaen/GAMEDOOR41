/**
 * Automated HTML image optimizer for GAMEDOOR•41
 * - Replaces <img> with <picture> (AVIF + WebP + JPEG fallback)
 * - Adds srcset with responsive sizes
 * - Adds width/height from actual image metadata
 * - Adds decoding="async" everywhere
 * - Fixes loading: eager for LCP, lazy for rest
 * - Adds fetchpriority="high" for LCP images
 * - Updates preload tags for AVIF with fallback
 */
import sharp from 'sharp';
import { readFile, writeFile, readdir, stat } from 'fs/promises';
import { join, basename, extname, dirname } from 'path';

const ROOT = '/home/user/GAMEDOOR41';
const IMG_DIR = join(ROOT, 'img');

// Image dimensions cache
const dimCache = {};

async function getImageDims(imgPath) {
  const fullPath = join(ROOT, imgPath.replace(/^\//, ''));
  if (dimCache[fullPath]) return dimCache[fullPath];
  try {
    const meta = await sharp(fullPath).metadata();
    dimCache[fullPath] = { width: meta.width, height: meta.height };
    return dimCache[fullPath];
  } catch {
    return null;
  }
}

// Determine available srcset widths for a given image
function getSrcsetWidths(origWidth) {
  const sizes = [480, 768, 1024, 1440];
  return sizes.filter(s => s < origWidth).concat([origWidth]);
}

// Build srcset string for a format
function buildSrcset(basePath, baseName, widths, ext) {
  const dir = dirname(basePath);
  const origWidth = widths[widths.length - 1];
  return widths.map(w => {
    const suffix = w === origWidth ? '' : `-${w}w`;
    return `${dir}/${baseName}${suffix}.${ext} ${w}w`;
  }).join(', ');
}

// Build sizes attribute based on common patterns
function buildSizes(cssClass, isHero) {
  if (isHero) return '100vw';
  return '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw';
}

// Check if this img is the LCP element (hero image, first visible above fold)
function isLCPImage(imgTag, pageContext) {
  // LCP indicators: first image on page, or has specific classes/patterns
  if (pageContext.isFirstImg) return true;
  if (/hero|banner|above-fold/i.test(imgTag)) return true;
  return false;
}

function buildPictureTag(src, alt, dims, isLCP, indent) {
  if (!src || /\.svg$/i.test(src)) return null; // Skip SVGs

  const dir = dirname(src);
  const ext = extname(src).slice(1);
  const name = basename(src, extname(src));

  const origWidth = dims ? dims.width : 1400;
  const origHeight = dims ? dims.height : 1050;
  const widths = getSrcsetWidths(origWidth);

  const avifSrcset = buildSrcset(src, name, widths, 'avif');
  const webpSrcset = buildSrcset(src, name, widths, 'webp');
  const jpgSrcset = buildSrcset(src, name, widths, 'jpg');

  const sizes = '(max-width: 480px) 100vw, (max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw';
  const loading = isLCP ? 'eager' : 'lazy';
  const priority = isLCP ? ' fetchpriority="high"' : '';

  const pad = indent || '          ';

  let html = `${pad}<picture>\n`;
  html += `${pad}  <source type="image/avif" srcset="${avifSrcset}" sizes="${sizes}">\n`;
  html += `${pad}  <source type="image/webp" srcset="${webpSrcset}" sizes="${sizes}">\n`;
  html += `${pad}  <img src="${src}" srcset="${jpgSrcset}" sizes="${sizes}" alt="${alt}" width="${origWidth}" height="${origHeight}" loading="${loading}" decoding="async"${priority}>\n`;
  html += `${pad}</picture>`;

  return html;
}

// Process preload tags: add imagesrcset for AVIF
function updatePreload(line, allDims) {
  const hrefMatch = line.match(/href="([^"]+)"/);
  if (!hrefMatch) return line;
  const src = hrefMatch[1];
  if (/\.svg$/i.test(src)) return line;

  const name = basename(src, extname(src));
  const dir = dirname(src);
  const dims = allDims[src];
  const origW = dims ? dims.width : 1400;
  const widths = getSrcsetWidths(origW);
  const avifSrcset = buildSrcset(src, name, widths, 'avif');

  // Replace with modern preload
  return `  <link rel="preload" as="image" type="image/avif" imagesrcset="${avifSrcset}" imagesizes="100vw">`;
}

async function findHtmlFiles(dir) {
  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory() && !['node_modules', '.git', 'scripts'].includes(entry.name)) {
      files.push(...await findHtmlFiles(fullPath));
    } else if (entry.name.endsWith('.html')) {
      files.push(fullPath);
    }
  }
  return files;
}

async function processHtmlFile(filePath) {
  let html = await readFile(filePath, 'utf8');
  const relPath = filePath.replace(ROOT, '');
  let changes = 0;

  // Collect all image sources used in this file
  const imgSrcs = [];
  const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/g;
  let m;
  while ((m = imgRegex.exec(html)) !== null) {
    imgSrcs.push(m[1]);
  }

  // Preload dimensions for all images
  const allDims = {};
  for (const src of imgSrcs) {
    const dims = await getImageDims(src);
    if (dims) allDims[src] = dims;
  }

  // 1. Update preload tags
  html = html.replace(/<link\s+rel="preload"\s+as="image"\s+href="([^"]+)"\s*>/g, (match) => {
    changes++;
    return updatePreload(match, allDims);
  });

  // 2. Replace img tags with picture elements
  let isFirstImg = true;
  html = html.replace(/<img\s+([^>]*)src="([^"]+\.jpe?g)"([^>]*)>/gi, (match, before, src, after) => {
    const fullAttrs = before + after;
    const altMatch = fullAttrs.match(/alt="([^"]*)"/);
    const alt = altMatch ? altMatch[1] : '';

    // Determine if this is LCP
    const isLCP = isFirstImg && !(/loading="lazy"/.test(match));
    // Actually, be smarter: if this is the first jpg image and not inside a lazy section
    const shouldBeLCP = isFirstImg;
    isFirstImg = false;

    const dims = allDims[src];
    if (!dims) {
      // Can't process, just add missing attributes
      let enhanced = match;
      if (!/decoding=/.test(enhanced)) {
        enhanced = enhanced.replace(/<img/, '<img decoding="async"');
      }
      return enhanced;
    }

    // Detect indent from context
    const picture = buildPictureTag(src, alt, dims, shouldBeLCP, '');
    if (!picture) return match;

    changes++;
    return picture;
  });

  // 3. Add decoding="async" to any remaining img tags that don't have it
  html = html.replace(/<img(?![^>]*decoding=)([^>]*>)/g, '<img decoding="async"$1');

  if (changes > 0) {
    await writeFile(filePath, html);
    console.log(`${relPath}: ${changes} changes`);
  } else {
    console.log(`${relPath}: no changes needed`);
  }
}

async function main() {
  const files = await findHtmlFiles(ROOT);
  console.log(`Found ${files.length} HTML files\n`);
  for (const f of files) {
    await processHtmlFile(f);
  }
  console.log('\nDone!');
}

main().catch(console.error);
