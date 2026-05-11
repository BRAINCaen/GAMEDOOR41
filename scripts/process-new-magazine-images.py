#!/usr/bin/env python3
"""
Renomme + convertit PNG/JPG en JPG optimisés (3 tailles : 480w, 768w, 1024w + master)
pour les nouvelles photos du magazine.
"""
import os
from PIL import Image
from pathlib import Path

SRC_DIR = Path(r"c:\Users\Direction Brain Caen\Desktop\gamedoor41\img")
OUT_DIR = SRC_DIR / "magazine"
OUT_DIR.mkdir(exist_ok=True)

MAPPING = {
    "12047.png": "mur-pins-vintage-80s",
    "12048.png": "dictee-magique-jouet-80s",
    "12049.png": "lampe-tetris-decor-80s",
    "12050.png": "couloir-rouge-psychiatric",
    "12051.png": "psychiatric-fauteuil-oxygene",
    "12054.png": "labyrinthe-pattern-rouge",
    "12056.png": "labyrinthe-pattern-bleu",
    "12057.jpg": "labyrinthe-pattern-violet",
    "12058.png": "salon-accueil-gamedoor",
    "12059.png": "buzzer-puck-quiz-vert",
    "12060.png": "cartes-cadeau-quiz-neon",
    "12061.png": "ecran-resultats-quiz-equipes",
    "12062.png": "menottes-garde-a-vue-table",
    "12064.png": "panneau-neon-buzz-your-brain",
    "12065.png": "porte-rouge-labyrinthe",
}

SIZES = [(480, "480w"), (768, "768w"), (1024, "1024w")]
QUALITY = 82

for src_name, base_name in MAPPING.items():
    src_path = SRC_DIR / src_name
    if not src_path.exists():
        print(f"SKIP - missing: {src_name}")
        continue
    img = Image.open(src_path)
    if img.mode in ("RGBA", "P"):
        bg = Image.new("RGB", img.size, (12, 8, 0))
        if img.mode == "P":
            img = img.convert("RGBA")
        bg.paste(img, mask=img.split()[3] if img.mode == "RGBA" else None)
        img = bg
    elif img.mode != "RGB":
        img = img.convert("RGB")

    w0, h0 = img.size
    master_path = OUT_DIR / f"{base_name}.jpg"
    img.save(master_path, "JPEG", quality=QUALITY, optimize=True, progressive=True)
    print(f"  Master  {base_name}.jpg ({w0}x{h0}) -> {master_path.stat().st_size//1024} KB")

    for target_w, suffix in SIZES:
        if w0 <= target_w:
            continue
        ratio = target_w / w0
        new_h = int(h0 * ratio)
        resized = img.resize((target_w, new_h), Image.LANCZOS)
        out_path = OUT_DIR / f"{base_name}-{suffix}.jpg"
        resized.save(out_path, "JPEG", quality=QUALITY, optimize=True, progressive=True)
        print(f"    {suffix:5}  {base_name}-{suffix}.jpg ({target_w}x{new_h}) -> {out_path.stat().st_size//1024} KB")

print("\nDone.")
