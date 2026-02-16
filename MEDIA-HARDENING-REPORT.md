# Post Media Optimization — Hardening Report

## 1. .gitignore

| Before | After |
|--------|-------|
| `package.json` ignored | tracked |
| `package-lock.json` ignored | tracked |
| `scripts/` ignored | tracked (4 build scripts) |
| `node_modules/` ignored | still ignored |

Build is now fully reproducible from the repo.

## 2. LCP Audit

| Page | fetchpriority="high" | LCP element | Mobile 480w size |
|------|---------------------|-------------|-----------------|
| `/` (homepage) | 1 (hero img) | `garde-a-vue-porte.jpg` poster + video | 56 KB JPEG / 54 KB AVIF |
| `/escape-game-caen/` | 1 | `garde-a-vue-cellule.jpg` | 30 KB JPEG / 22 KB AVIF |
| `/escape-game-caen/garde-a-vue/` | 1 | `garde-a-vue-cellule.jpg` | 30 KB JPEG / 22 KB AVIF |
| `/escape-game-caen/psychiatric/` | 1 | `psychiatric-lit.jpg` | 25 KB JPEG / 19 KB AVIF |
| `/escape-game-caen/back-to-the-80s/` | 1 | `80s-jukebox.jpg` | 33 KB JPEG / 27 KB AVIF |
| `/quiz-game-caen/` | 1 | `buzzer-closeup.jpg` | 27 KB JPEG / 19 KB AVIF |
| `/team-building-caen/` | 1 | `garde-a-vue-porte.jpg` | 56 KB JPEG / 54 KB AVIF |
| `/devis/` | 0 (gradient hero, no image) | CSS gradient | — |
| `/tarifs/` | 0 (gradient hero, no image) | CSS gradient | — |
| `/contact/` | 0 (gradient hero, no image) | CSS gradient | — |

All pages: exactly 0 or 1 `fetchpriority="high"` — no duplicates.

## 3. Image Quality

| Format | 480w range | 768w range | Full (1400w) range |
|--------|-----------|-----------|-------------------|
| AVIF | 19–54 KB | 30–110 KB | 55–216 KB |
| WebP | 21–57 KB | 36–123 KB | 70–246 KB |
| JPEG | 25–56 KB | 52–130 KB | 146–394 KB |

AVIF savings vs JPEG: 25–40% on average. No visible banding or artifacts at current quality levels (encoder default ~60–65). No re-encode needed.

## 4. Hero Video

| | Before | After |
|---|--------|-------|
| Resolution | 3840x2160 (4K) | 1280x720 (720p) |
| Bitrate | 23.5 Mbps | 1.2 Mbps |
| Duration | 20.7s | 20.7s |
| Audio | AAC (2 kbps, silent) | stripped |
| Codec | H.264 High | H.264 Main L4.0 |
| File size | **58 MB** | **3.1 MB** |
| Poster | reused `garde-a-vue-porte.jpg` (394 KB) | dedicated `hero-poster.jpg` (74 KB) |
| Loading | `preload="none"`, desktop only via JS | unchanged |
| faststart | no | yes (`-movflags +faststart`) |

## 5. Asset Rationalization

| Metric | Count |
|--------|-------|
| Total image files | 219 |
| Total video files | 5 |
| **Referenced assets** | **222 / 224** |
| Orphans removed | 2 (`logo-vertical.svg`, `hero-original.mp4`) |
| Orphans wired in | 2 (`og-80s.jpg` → back-to-the-80s OG, `og-psychiatric.jpg` → psychiatric OG) |
| **Final orphans** | **0** |

Breakpoints verified: all `srcset` entries (480w, 768w, 1024w, 1400w / 800w) map to existing AVIF + WebP + JPEG files.

## 6. Smoke Test

| Check | Result |
|-------|--------|
| Broken images (302 refs checked) | 0 missing |
| CLS: all `<img>` have `width` + `height` | 30/30 logo tags fixed (15 pages x 2) |
| OG tags: 15/15 pages | all `og:image` → existing 1200x630 file |
| OG dimensions | all corrected to 1200x630 (was 1000x1334 on 3 room pages) |
| `twitter:card` + `twitter:image` | 15/15 present and matching |
| Header z-index | 1000 (above all content) |
| Breadcrumb z-index | 1 (in `.breadcrumb-bar`, below header) |

## Pages Verified

`/` · `/escape-game-caen/` · `/escape-game-caen/garde-a-vue/` · `/escape-game-caen/psychiatric/` · `/escape-game-caen/back-to-the-80s/` · `/quiz-game-caen/` · `/team-building-caen/` · `/devis/` · `/tarifs/` · `/contact/` · `/evjf-caen/` · `/evg-caen/` · `/anniversaire-caen/` · `/cadeau/` · `/references-entreprises-caen/`
