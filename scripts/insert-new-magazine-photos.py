"""
Inserte les 15 nouvelles photos optimisees dans les articles du magazine
les plus pertinents. Chaque photo va dans 1 article = max de variete.
Inserts AVANT un <h2> ancre unique dans chaque fichier.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

def fig(folder: str, base: str, alt: str, caption: str) -> str:
    return (
        '<figure style="margin:28px 0;">\n'
        '  <picture>\n'
        f'    <source type="image/jpeg" srcset="/img/{folder}/{base}-480w.jpg 480w, /img/{folder}/{base}-768w.jpg 768w" sizes="(max-width:768px) 90vw, 720px">\n'
        f'    <img src="/img/{folder}/{base}-768w.jpg" alt="{alt}" loading="lazy" decoding="async" style="width:100%;height:auto;border-radius:8px;">\n'
        '  </picture>\n'
        f'  <figcaption style="text-align:center;font-size:0.85rem;color:#888;margin-top:8px;font-style:italic;">{caption}</figcaption>\n'
        '</figure>\n\n'
    )

INSERTIONS = [
    # ===== Psychiatric (3 images) =====
    {
        "file": "post/escape-game-horreur-psychiatric-caen/index.html",
        "before": "<h2>Deux niveaux de difficulté pour un maximum de frissons</h2>",
        "block": fig("escape", "psychiatric-decors",
                     "Decor authentique de salle d'hopital psychiatrique abandonne — escape game horreur Psychiatric GAMEDOOR·41 Caen",
                     "Decors fideles a l'imaginaire collectif d'un asile abandonne — chaque detail renforce l'immersion."),
    },
    {
        "file": "post/escape-game-horreur-psychiatric-caen/index.html",
        "before": "<h2>Jouez en équipe ou faites une battle</h2>",
        "block": fig("escape", "psychiatric-porte-rouge",
                     "Porte fermee baignee de lumiere rouge intense — moment de tension dans la salle Psychiatric",
                     "Derriere chaque porte, une nouvelle enigme — et une nouvelle dose d'angoisse."),
    },
    {
        "file": "post/escape-game-horreur-psychiatric-caen/index.html",
        "before": "<h2>Infos pratiques</h2>",
        "block": fig("escape", "psychiatric-mur-rouge",
                     "Mur eclaire en rouge sang dans la salle Psychiatric — atmosphere oppressante GAMEDOOR·41 Caen Mondeville",
                     "L'eclairage rouge sature les murs — un parti pris visuel qui colle a la peau pendant 60 minutes."),
    },

    # ===== Back to the 80's (3 images) =====
    {
        "file": "post/escape-game-back-to-80s-famille-caen/index.html",
        "before": "<h2>Interactivité et scénario captivant</h2>",
        "block": fig("escape", "salle-back-to-80s-brief",
                     "Brief des annees 80 avant l'entree dans la salle escape — debut de mission GAMEDOOR·41 Caen",
                     "Le brief retro qui plante le decor — l'aventure commence avant meme d'entrer dans la salle."),
    },
    {
        "file": "post/escape-game-back-to-80s-famille-caen/index.html",
        "before": "<h2>Un escape game pour tous à Caen</h2>",
        "block": fig("escape", "salle-back-to-80s-jeu",
                     "Jeu vintage des annees 80 utilise comme accessoire d'enigme — Back to the 80's Caen Mondeville",
                     "Les jeux d'epoque ne sont pas la pour la deco — ils cachent des indices."),
    },
    {
        "file": "post/escape-game-back-to-80s-famille-caen/index.html",
        "before": "<h2>Infos pratiques</h2>",
        "block": fig("escape", "salle-back-to-80s-tetris",
                     "Lampe Tetris allumee dans la salle Back to the 80's — escape game annees 80 GAMEDOOR·41 Caen",
                     "Tetris en lampe d'ambiance — le clin d'oeil retro qu'on photographie tous a la sortie."),
    },

    # ===== Buzz Your Brain (3 images) =====
    {
        "file": "post/buzz-your-brain-jeu-televise-realiste-caen/index.html",
        "before": "<h2>Qu'est-ce que Buzz Your Brain&nbsp;?</h2>",
        "block": fig("quiz", "affiche-buzz-your-brain",
                     "Affiche officielle du quiz Buzz Your Brain — jeu televise interactif GAMEDOOR·41 Caen Mondeville",
                     "L'affiche du jeu — premier indice visuel d'une emission TV grandeur nature."),
    },
    {
        "file": "post/buzz-your-brain-jeu-televise-realiste-caen/index.html",
        "before": "<h2>Pourquoi choisir Buzz Your Brain&nbsp;?</h2>",
        "block": fig("quiz", "decors-buzz-your-brain",
                     "Decors du plateau TV Buzz Your Brain — neons et ambiance studio quiz GAMEDOOR·41 Caen",
                     "Decors plateau TV — neons satures, panneaux LED, on se croirait en prime time."),
    },
    {
        "file": "post/buzz-your-brain-jeu-televise-realiste-caen/index.html",
        "before": "<h2>Informations pratiques</h2>",
        "block": fig("quiz", "ecran-buzz-your-brain",
                     "Ecran de quiz interactif Buzz Your Brain affichant une question — jeu televise GAMEDOOR·41 Caen",
                     "L'ecran central pilote toute l'emission — questions, jokers, classement temps reel."),
    },

    # ===== Quiz Noel (1 image) =====
    {
        "file": "post/quiz-game-noel-caen-buzz-your-brain/index.html",
        "before": "<h2>Pour qui&nbsp;?</h2>",
        "block": fig("quiz", "buzzer-vert",
                     "Buzzer PUCK vert allume — quiz de Noel Buzz Your Brain GAMEDOOR·41 Caen Mondeville",
                     "Buzzer vert sapin — pour une emission de Noel, on a juste la bonne couleur."),
    },

    # ===== Guide complet escape Caen (2 images) =====
    {
        "file": "post/escape-game-caen-guide-complet-2026/index.html",
        "before": "<h2>Conseils pour réussir votre escape game</h2>",
        "block": fig("escape", "salle-back-to-80s-pins",
                     "Mur de pin's vintage dans la salle Back to the 80's — escape game annees 80 Caen GAMEDOOR·41",
                     "Le mur de pin's — une fresque d'epoque qui change a chaque visite (les joueurs piquent les meilleurs)."),
    },
    {
        "file": "post/escape-game-caen-guide-complet-2026/index.html",
        "before": "<h2>Tarifs 2026</h2>",
        "block": fig("escape", "salle-garde-a-vue-menottes-bureau",
                     "Menottes sur bureau dans la salle Garde a vue — escape game enquete policiere GAMEDOOR·41 Caen",
                     "Le bureau du commissariat dans Garde a Vue — meneur d'enquete, accessoires authentiques."),
    },

    # ===== Escape vs Action Game (2 images) =====
    {
        "file": "post/escape-game-ou-action-game-caen/index.html",
        "before": "<h2>Pour qui choisir quoi ?</h2>",
        "block": fig("escape", "salle-garde-a-vue-mur-bleu",
                     "Mur bleu fonce dans la salle Garde a vue — escape game policier GAMEDOOR·41 Caen Mondeville",
                     "Mur bleu nuit de la salle Garde a vue — ambiance commissariat sous tension."),
    },
    {
        "file": "post/escape-game-ou-action-game-caen/index.html",
        "before": "<h2>Notre approche chez GAMEDOOR·41 — pourquoi le narratif</h2>",
        "block": fig("escape", "psychiatric-couloir-rouge",
                     "Couloir rouge oppressant de la salle Psychiatric — escape game horreur narratif Caen",
                     "Couloir d'acces Psychiatric — l'image qui resume notre parti pris : du narratif visuel fort."),
    },

    # ===== Anniversaire Ado (1 image) =====
    {
        "file": "post/anniversaire-ado-caen/index.html",
        "before": "<h2>5. Combo Escape + Quiz — pour les groupes 8-16 ados</h2>",
        "block": fig("escape", "salle-back-to-80s-mur-mauve",
                     "Mur mauve fluo des annees 80 — escape game Back to the 80's pour anniversaire ado Caen",
                     "Mur mauve fluo Back to the 80's — la photo souvenir d'anniversaire ado garantie."),
    },
]

def main():
    ok = 0
    skip = 0
    for ins in INSERTIONS:
        fp = ROOT / ins["file"]
        if not fp.exists():
            print(f"MISS file: {ins['file']}")
            skip += 1
            continue
        content = fp.read_text(encoding="utf-8")
        anchor = ins["before"]
        if anchor not in content:
            print(f"MISS anchor in {ins['file']}: {anchor[:60]}")
            skip += 1
            continue
        # Insert the block just before the anchor line
        new = content.replace(anchor, ins["block"] + anchor, 1)
        fp.write_text(new, encoding="utf-8")
        print(f"OK  {ins['file']:60} +{anchor[:50]}")
        ok += 1
    print(f"\n=== {ok} insertions reussies, {skip} skip ===")

if __name__ == "__main__":
    main()
