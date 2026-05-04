"""
Optimise + renomme les 16 visuels (univers Buzz Your Brain + jokers + affiche)
Sortie : -480w / -768w / -1024w + full size, en PNG (compressé) + WebP + AVIF.
La transparence est préservée (les jokers et certaines affiches en ont besoin).
"""
from PIL import Image
import pillow_avif  # noqa: F401  (active l'encodeur AVIF)
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
QUIZ = ROOT / "img" / "quiz"

SIZES = [480, 768, 1024]
WEBP_QUALITY = 82
AVIF_QUALITY = 60

MAP = [
    ("Affiche 100_ Blind Test Violette (sans numéro).png",       "affiche-blindtest-100-violette"),
    ("Buzz Your Brain 80 (sans numéro).png",                     "univers-quiz-blindtest-80s"),
    ("Buzz Your Brain 90 sans numéro).png",                      "univers-quiz-blindtest-90s"),
    ("Buzz Your Brain 2000 (sans numéro).png",                   "univers-quiz-blindtest-2000s"),
    ("Buzz Your Brain Ados (sans numéro + sans signature).png",  "univers-quiz-ados"),
    ("Buzz Your Brain Anglais.png",                              "univers-quiz-anglais"),
    ("Buzz Your Brain Apéro (sans numéro).png",                  "univers-quiz-apero"),
    ("Buzz Your Brain Cinema (sans numéro + sans signature).png","univers-quiz-cinema"),
    ("Buzz Your Brain Evg-Evjf 2.png",                           "univers-quiz-evjf-evg"),
    ("Buzz Your Brain FA (sans numéro).png",                     "univers-quiz-fa"),
    ("Buzz Your Brain Japon (sans numéro) (1).png",              "univers-quiz-japon"),
    ("Buzz Your Brain KIDS.png",                                 "univers-quiz-kids"),
    ("JOKER_COUP_DE_PRESSION_PNG.png",                           "joker-coup-de-pression"),
    ("JOKER_GEL_DE_CERVEAU_PNG.png",                             "joker-gel-de-cerveau"),
    ("JOKER_LE_PETIT_JOUEUR_PNG.png",                            "joker-le-petit-joueur"),
    ("JOKER_LE_TRICHEUR_PNG.png",                                "joker-le-tricheur"),
]

def fmt(n):
    return f"{n/1024:.1f}K"

def save_variants(im, base):
    """Save full-size + 3 smaller widths in PNG/WebP/AVIF."""
    W, H = im.size
    targets = [(w, round(H * w / W)) for w in SIZES if w < W]
    targets.append((W, H))  # full size

    for w, h in targets:
        suffix = f"-{w}w" if w != W else ""
        # Resize (preserve mode -> keeps alpha)
        if (w, h) != (W, H):
            r = im.resize((w, h), Image.LANCZOS)
        else:
            r = im

        png_path  = QUIZ / f"{base}{suffix}.png"
        webp_path = QUIZ / f"{base}{suffix}.webp"
        avif_path = QUIZ / f"{base}{suffix}.avif"

        # PNG: compress, preserve alpha
        r.save(png_path, format="PNG", optimize=True, compress_level=9)
        # WebP: lossy, preserve alpha
        r.save(webp_path, format="WEBP", quality=WEBP_QUALITY, method=6)
        # AVIF: lossy, preserve alpha
        r.save(avif_path, format="AVIF", quality=AVIF_QUALITY)

        png_s = png_path.stat().st_size
        webp_s = webp_path.stat().st_size
        avif_s = avif_path.stat().st_size
        tag = f"{w}w".rjust(5) if w != W else f"full{W}".rjust(8)
        print(f"  {tag}   png {fmt(png_s).rjust(8)}   webp {fmt(webp_s).rjust(8)}   avif {fmt(avif_s).rjust(8)}")

def process_one(src_name, base):
    src = QUIZ / src_name
    if not src.exists():
        print(f"  ! source not found: {src_name}")
        return
    src_size = src.stat().st_size
    with Image.open(src) as im:
        # Force RGBA so alpha is preserved
        if im.mode not in ("RGBA", "RGB"):
            im = im.convert("RGBA")
        W, H = im.size
        print(f"\n{src_name}")
        print(f"  -> {base}   ({W}×{H}, {fmt(src_size)})")
        save_variants(im, base)
    # Remove original
    src.unlink()
    print(f"  x removed source: {src_name}")

def main():
    print(f"Processing {len(MAP)} sources from {QUIZ}")
    for src, base in MAP:
        try:
            process_one(src, base)
        except Exception as e:
            print(f"  FAILED {src}: {e}")
    print("\nDone.")

if __name__ == "__main__":
    main()
