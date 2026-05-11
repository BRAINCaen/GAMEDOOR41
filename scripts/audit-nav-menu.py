#!/usr/bin/env python3
"""
Audit du menu de toutes les pages du site.
Vérifie :
1. CARTE CADEAU est en icône seule sur desktop
2. Lien Magazine est présent dans le menu
"""
import re
from pathlib import Path

ROOT = Path(r"c:\Users\Direction Brain Caen\Desktop\gamedoor41")


def get_menu_zone(content: str) -> str:
    """Extrait la zone du menu principal (header nav)."""
    # Cherche <nav class="nav-links"> ... </nav>
    m = re.search(r'<nav[^>]*class="[^"]*nav-links[^"]*"[^>]*>(.*?)</nav>',
                  content, re.DOTALL)
    if m:
        return m.group(1)
    # Fallback : les 8000 premiers caractères (zone header)
    return content[:8000]


def analyze_file(path: Path) -> dict:
    content = path.read_text(encoding='utf-8')
    menu = get_menu_zone(content)
    rel = str(path.relative_to(ROOT)).replace('\\', '/')

    # Détecte les patterns
    has_cadeau_desktop_icon = bool(
        re.search(r'<a[^>]+href="/cadeau/"[^>]*\bdesktop-only\b[^>]*>\s*🎁\s*</a>', menu)
    ) or bool(
        re.search(r'<a[^>]+href="/cadeau/"[^>]*\bnav-link-desktop\b[^>]*>\s*🎁\s*</a>', menu)
    )
    has_cadeau_mobile_text = bool(
        re.search(r'<a[^>]+href="/cadeau/"[^>]*\b(?:mobile-only|nav-link-mobile)\b[^>]*>\s*🎁?\s*Carte Cadeau\s*</a>', menu)
    )
    # Pattern OLD (problème : ni desktop-only ni mobile-only)
    has_cadeau_old_pattern = bool(
        re.search(r'<a href="/cadeau/"[^>]*>🎁 Carte Cadeau</a>', menu) and
        not has_cadeau_desktop_icon
    )

    # Magazine link
    has_magazine = bool(re.search(r'<a[^>]+href="/magazine/"[^>]*>', menu))

    # Détermine si la page a un menu (sinon SKIP)
    has_menu = bool(menu and '<a ' in menu and '/escape-game-caen/' in menu)

    return {
        'file': rel,
        'has_menu': has_menu,
        'cadeau_desktop_icon': has_cadeau_desktop_icon,
        'cadeau_mobile_text': has_cadeau_mobile_text,
        'cadeau_old_pattern': has_cadeau_old_pattern,
        'magazine': has_magazine,
    }


def main():
    # Collect HTML files
    html_files = []
    for path in ROOT.rglob('*.html'):
        rel = path.relative_to(ROOT)
        parts = rel.parts
        if any(p.startswith('.') for p in parts):
            continue
        if any(x in parts for x in ('node_modules', 'gamedoor41-design-system',
                                    'marketing', 'scripts')):
            continue
        if 'index.brain.bak' in str(rel):
            continue
        html_files.append(path)

    print(f"AUDIT DES MENUS — {len(html_files)} fichiers HTML\n")
    print("=" * 90)

    results = [analyze_file(p) for p in sorted(html_files)]

    # Categorize
    pages_with_menu = [r for r in results if r['has_menu']]
    pages_without_menu = [r for r in results if not r['has_menu']]

    perfect = [r for r in pages_with_menu
               if r['cadeau_desktop_icon'] and r['cadeau_mobile_text'] and r['magazine']]
    missing_magazine = [r for r in pages_with_menu if not r['magazine']]
    bad_cadeau = [r for r in pages_with_menu
                  if r['cadeau_old_pattern'] or not r['cadeau_desktop_icon']]

    print(f"\n✅ PAGES PARFAITES ({len(perfect)} / {len(pages_with_menu)})")
    print(f"   - Carte Cadeau icône seule desktop : OUI")
    print(f"   - Carte Cadeau texte mobile : OUI")
    print(f"   - Magazine présent : OUI\n")

    if missing_magazine:
        print(f"\n❌ MAGAZINE MANQUANT ({len(missing_magazine)} pages)")
        for r in missing_magazine:
            print(f"   {r['file']}")

    if bad_cadeau:
        print(f"\n❌ CARTE CADEAU PAS ICÔNE SEULE ({len(bad_cadeau)} pages)")
        for r in bad_cadeau:
            issues = []
            if r['cadeau_old_pattern']:
                issues.append('ancien pattern')
            if not r['cadeau_desktop_icon']:
                issues.append('pas d\'icône desktop')
            print(f"   {r['file']:50} → {', '.join(issues)}")

    if pages_without_menu:
        print(f"\n— PAGES SANS MENU PRINCIPAL ({len(pages_without_menu)})")
        for r in pages_without_menu:
            print(f"   {r['file']}")

    # Detailed table
    print(f"\n{'=' * 90}")
    print(f"DÉTAIL PAR PAGE\n")
    print(f"{'Fichier':50} {'Cadeau-Desktop':14} {'Cadeau-Mobile':14} {'Magazine':10}")
    print("-" * 90)
    for r in sorted(pages_with_menu, key=lambda x: x['file']):
        d = '✅' if r['cadeau_desktop_icon'] else '❌'
        m = '✅' if r['cadeau_mobile_text'] else '❌'
        mag = '✅' if r['magazine'] else '❌'
        print(f"{r['file']:50} {d:14} {m:14} {mag:10}")

    # Summary
    print(f"\n{'=' * 90}")
    print(f"RESUME")
    print(f"  - Pages avec menu : {len(pages_with_menu)}")
    print(f"  - Pages parfaites : {len(perfect)}")
    print(f"  - Pages avec souci : {len(missing_magazine) + len(bad_cadeau) - len(set(r['file'] for r in missing_magazine) & set(r['file'] for r in bad_cadeau))}")
    print(f"  - Pages sans menu : {len(pages_without_menu)}")


if __name__ == '__main__':
    main()
