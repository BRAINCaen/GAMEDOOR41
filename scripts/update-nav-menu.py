#!/usr/bin/env python3
"""
Met à jour le menu de navigation sur toutes les pages :
1. CARTE CADEAU → icône seule 🎁 sur desktop, texte complet sur mobile
2. Ajoute le lien Magazine partout où il manque
"""
import os
import re
from pathlib import Path

ROOT = Path(r"c:\Users\Direction Brain Caen\Desktop\gamedoor41")

# Pattern A : pages simples (team-building, escape rooms, tarifs, etc.)
# <a href="/cadeau/">🎁 Carte Cadeau</a>
PATTERN_A_OLD = '<a href="/cadeau/">🎁 Carte Cadeau</a>'
PATTERN_A_NEW = (
    '<a href="/cadeau/" class="desktop-only" aria-label="Carte Cadeau" '
    'title="Carte Cadeau" style="font-size:1.4em;line-height:1;">🎁</a>\n'
    '        <a href="/cadeau/" class="mobile-only">🎁 Carte Cadeau</a>'
)

# Pattern B : pages avec nav-link data-icon (home, articles)
# <a href="/cadeau/" class="nav-link" data-icon="🎁">Carte Cadeau</a>
PATTERN_B_OLD = '<a href="/cadeau/" class="nav-link" data-icon="🎁">Carte Cadeau</a>'
PATTERN_B_NEW = (
    '<a href="/cadeau/" class="nav-link nav-link-desktop" data-icon="🎁" '
    'aria-label="Carte Cadeau" title="Carte Cadeau" '
    'style="font-size:1.5em;line-height:1;">🎁</a>\n'
    '        <a href="/cadeau/" class="nav-link nav-link-mobile" data-icon="🎁">Carte Cadeau</a>'
)

# Magazine link à ajouter (pour Pattern A simple)
MAGAZINE_LINK_A = '<a href="/magazine/">Magazine</a>'

# Magazine link à ajouter (pour Pattern B nav-link)
MAGAZINE_LINK_B = '<a href="/magazine/" class="nav-link" data-icon="📰">Magazine</a>'


def has_magazine_in_menu(content: str) -> bool:
    """Détecte si /magazine/ est dans le menu (header)."""
    # On cherche /magazine/ dans les 200 lignes du début (zone du menu)
    head = content[:8000]  # ~200 premières lignes
    if 'class="nav-links"' not in head and 'class="nav-link"' not in head:
        return True  # pas de menu détecté, skip
    # Cherche /magazine/ dans un <a> du menu
    if re.search(r'<a[^>]+href="/magazine/"[^>]*>', head):
        return True
    return False


def process_file(path: Path) -> dict:
    """Traite un fichier et retourne un rapport."""
    content = path.read_text(encoding='utf-8')
    original = content
    report = {'file': str(path.relative_to(ROOT)), 'changes': []}

    # Étape 1 : remplacer CARTE CADEAU
    if PATTERN_A_OLD in content:
        content = content.replace(PATTERN_A_OLD, PATTERN_A_NEW)
        report['changes'].append('cadeau-A (simple)')
    elif PATTERN_B_OLD in content:
        content = content.replace(PATTERN_B_OLD, PATTERN_B_NEW)
        report['changes'].append('cadeau-B (nav-link)')

    # Étape 2 : ajouter Magazine dans le menu si absent
    if not has_magazine_in_menu(content):
        # On insère Magazine APRÈS le lien Tarifs
        if 'class="nav-link" data-icon="💶">Tarifs</a>' in content:
            # Pattern B (home / articles)
            content = content.replace(
                '<a href="/tarifs/" class="nav-link" data-icon="💶">Tarifs</a>',
                '<a href="/tarifs/" class="nav-link" data-icon="💶">Tarifs</a>\n'
                '        ' + MAGAZINE_LINK_B
            )
            report['changes'].append('magazine-B added')
        elif '<a href="/tarifs/">Tarifs</a>' in content:
            # Pattern A (simple)
            content = content.replace(
                '<a href="/tarifs/">Tarifs</a>',
                '<a href="/tarifs/">Tarifs</a>\n'
                '        ' + MAGAZINE_LINK_A
            )
            report['changes'].append('magazine-A added')

    if content != original:
        path.write_text(content, encoding='utf-8', newline='\n')
        report['updated'] = True
    else:
        report['updated'] = False

    return report


def main():
    # Liste de tous les .html du site (exclut node_modules, .git, etc.)
    html_files = []
    for path in ROOT.rglob('*.html'):
        rel = path.relative_to(ROOT)
        parts = rel.parts
        # Exclusions
        if any(p.startswith('.') for p in parts):
            continue
        if 'node_modules' in parts:
            continue
        if 'gamedoor41-design-system' in parts:
            continue
        if 'marketing' in parts:
            continue
        if 'scripts' in parts:
            continue
        if parts[0] in ('index.brain.bak.html',):
            continue
        html_files.append(path)

    print(f"Traitement de {len(html_files)} fichiers HTML...")
    print()

    reports = []
    for path in sorted(html_files):
        report = process_file(path)
        reports.append(report)

    # Affichage
    updated = [r for r in reports if r['updated']]
    skipped = [r for r in reports if not r['updated']]

    print(f"=== UPDATED ({len(updated)}) ===")
    for r in updated:
        print(f"  {r['file']:60} → {', '.join(r['changes'])}")

    print()
    print(f"=== SKIPPED ({len(skipped)}) ===")
    for r in skipped[:5]:
        print(f"  {r['file']}")
    if len(skipped) > 5:
        print(f"  ... et {len(skipped) - 5} autres")

    print()
    print(f"Total : {len(updated)} fichiers modifiés sur {len(html_files)}")


if __name__ == '__main__':
    main()
