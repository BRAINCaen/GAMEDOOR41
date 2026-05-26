"""
Migration audio-reader inline -> externe :
- Supprime le bloc <script>...audio-reader...</script> inline de chaque article
- Ajoute <script defer src="/js/audio-reader.js"></script> avant </body>
- Pour l'article canicule qui n'avait pas de script, ajoute la reference

Cas avant migration :
  - 20 articles ont un <script> inline de ~250 lignes (commence par
    "GAMEDOOR·41 — Audio reader for magazine posts")
  - 1 article (canicule) n'a aucun script audio-reader

Cas apres migration :
  - 21 articles utilisent <script defer src="/js/audio-reader.js"></script>
  - Le fichier /js/audio-reader.js contient la version unifiee + fix Android
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
POST_DIR = ROOT / "post"

EXTERNAL_TAG = '<script defer src="/js/audio-reader.js"></script>\n'

# Regex pour matcher le bloc inline complet : du <script>/* GAMEDOOR audio reader */
# jusqu'au </script> de fermeture qui contient le closing IIFE })()
INLINE_RE = re.compile(
    r'<script>/\* =+\s*\n\s*GAMEDOOR.41 . Audio reader for magazine posts.*?\}\)\(\);\s*\n?</script>\s*\n?',
    re.DOTALL,
)

def migrate(article_path: Path):
    text = article_path.read_text(encoding="utf-8")
    had_inline = bool(INLINE_RE.search(text))
    already_external = '/js/audio-reader.js' in text
    has_widget = 'audio-reader' in text

    if not has_widget:
        return f"SKIP {article_path.relative_to(ROOT)} (no audio-reader widget)"

    # Remove inline script if present
    if had_inline:
        text = INLINE_RE.sub('', text)

    # Add external reference if not already there
    if not already_external:
        # Insert just before </body>
        if '</body>' in text:
            text = text.replace('</body>', EXTERNAL_TAG + '</body>', 1)
        else:
            return f"ERR  {article_path.relative_to(ROOT)} (no </body> tag found)"

    article_path.write_text(text, encoding="utf-8")

    status_parts = []
    if had_inline: status_parts.append("removed-inline")
    if not already_external: status_parts.append("added-external")
    if not status_parts: status_parts.append("no-change-needed")
    return f"OK   {article_path.relative_to(ROOT)} ({'/'.join(status_parts)})"

def main():
    print("=== Migration audio-reader vers /js/audio-reader.js ===\n")
    articles = sorted(POST_DIR.glob("*/index.html"))
    for art in articles:
        print(migrate(art))
    print(f"\n=== {len(articles)} articles traités ===")

if __name__ == "__main__":
    main()
