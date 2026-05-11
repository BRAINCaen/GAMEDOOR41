#!/usr/bin/env python3
"""
Ajoute le lien Magazine dans le menu des 8 pages où il manque.
"""
from pathlib import Path

ROOT = Path(r"c:\Users\Direction Brain Caen\Desktop\gamedoor41")

PAGES = [
    "alternance/index.html",
    "anniversaire-caen/index.html",
    "escape-game-caen/back-to-the-80s/index.html",
    "escape-game-caen/garde-a-vue/index.html",
    "escape-game-caen/index.html",
    "escape-game-caen/psychiatric/index.html",
    "quiz-game-caen/index.html",
    "tarifs/index.html",
]

# Pattern A : <a href="/tarifs/">Tarifs</a> simple
PATTERN_A_OLD = '<a href="/tarifs/">Tarifs</a>\n        <a href="/contact/">'
PATTERN_A_NEW = ('<a href="/tarifs/">Tarifs</a>\n'
                 '        <a href="/magazine/">Magazine</a>\n'
                 '        <a href="/contact/">')

# Pattern B : <a href="/tarifs/" class="active">Tarifs</a> (page /tarifs/ elle-même)
PATTERN_B_OLD = '<a href="/tarifs/" class="active">Tarifs</a>\n        <a href="/contact/">'
PATTERN_B_NEW = ('<a href="/tarifs/" class="active">Tarifs</a>\n'
                 '        <a href="/magazine/">Magazine</a>\n'
                 '        <a href="/contact/">')


def process_file(path: Path) -> bool:
    content = path.read_text(encoding='utf-8')
    original = content

    if PATTERN_A_OLD in content:
        content = content.replace(PATTERN_A_OLD, PATTERN_A_NEW, 1)
    elif PATTERN_B_OLD in content:
        content = content.replace(PATTERN_B_OLD, PATTERN_B_NEW, 1)
    else:
        return False

    path.write_text(content, encoding='utf-8', newline='\n')
    return True


def main():
    for rel in PAGES:
        path = ROOT / rel
        if not path.exists():
            print(f"SKIP - missing: {rel}")
            continue
        ok = process_file(path)
        print(f"{'OK   ' if ok else 'FAIL '} {rel}")


if __name__ == '__main__':
    main()
