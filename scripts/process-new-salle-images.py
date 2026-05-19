"""
Range + optimise les 15 nouvelles photos de salles dropees dans img/.
Pour chaque source: cree 4 variantes JPG @82% (original-width, 1024w, 768w, 480w)
et place dans le bon sous-dossier avec un nom kebab-case ASCII.
"""
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / "img"

MAPPING = [
    # (source filename in img/, destination relative to img/, base-name without extension)
    ("Affiche Buzz Quiz.png",            "quiz",   "affiche-buzz-your-brain"),
    ("Buzzer vert.png",                   "quiz",   "buzzer-vert"),
    ("Décors Buzz Quiz.png",              "quiz",   "decors-buzz-your-brain"),
    ("Ecran Buzz Quiz.png",               "quiz",   "ecran-buzz-your-brain"),
    ("Couloir Psychiatric.png",           "escape", "psychiatric-couloir-rouge"),
    ("Décors Psychiatric.png",            "escape", "psychiatric-decors"),
    ("Mur Psychiatric rouge.png",         "escape", "psychiatric-mur-rouge"),
    ("Porte Psy rouge.png",               "escape", "psychiatric-porte-rouge"),
    ("Menottes bureau Garde à vue.png",   "escape", "salle-garde-a-vue-menottes-bureau"),
    ("Mur Garde à vue Bleu.png",          "escape", "salle-garde-a-vue-mur-bleu"),
    ("Brief années 80.png",               "escape", "salle-back-to-80s-brief"),
    ("Jeu années 80.png",                 "escape", "salle-back-to-80s-jeu"),
    ("Mur années 80 mauve.jpg",           "escape", "salle-back-to-80s-mur-mauve"),
    ("Pins années 80.png",                "escape", "salle-back-to-80s-pins"),
    ("Tetris années 80.png",              "escape", "salle-back-to-80s-tetris"),
]

WIDTHS = [480, 768, 1024]
JPEG_QUALITY = 82

def process(src_name: str, dest_dir: str, base: str):
    src = IMG / src_name
    if not src.exists():
        print(f"SKIP missing: {src_name}")
        return
    out_dir = IMG / dest_dir
    out_dir.mkdir(parents=True, exist_ok=True)
    with Image.open(src) as im:
        im = ImageOps.exif_transpose(im).convert("RGB")
        original_w = im.width

        # Variante "originale" (max width)
        full_path = out_dir / f"{base}.jpg"
        im.save(full_path, "JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)
        print(f"  -> {full_path.relative_to(ROOT)} ({original_w}w)")

        for w in WIDTHS:
            if w >= original_w:
                continue
            ratio = w / original_w
            resized = im.resize((w, round(im.height * ratio)), Image.LANCZOS)
            out_path = out_dir / f"{base}-{w}w.jpg"
            resized.save(out_path, "JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)
            print(f"  -> {out_path.relative_to(ROOT)}")

def main():
    print("=== Processing 15 new salle images ===")
    for src, dest, base in MAPPING:
        print(f"\n[{src}] -> img/{dest}/{base}.jpg")
        process(src, dest, base)
    print("\n=== Done. Remove sources after verifying outputs. ===")

if __name__ == "__main__":
    main()
