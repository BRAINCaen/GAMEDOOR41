// Ajoute dans le pied de page de toutes les pages un lien « Escape Game Mondeville » juste apres « Escape Game Caen »,
// et remplace les anciens liens vers /post/escape-game-mondeville/ par /escape-game-mondeville/.
// Usage : node scripts/ajouter-lien-mondeville.mjs [--apercu]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
const apercu = process.argv.includes('--apercu');
const pages = execSync('git ls-files --cached --others --exclude-standard "*.html"', { encoding: 'utf8' })
  .split('\n').map((s) => s.trim()).filter((f) => f && !f.startsWith('signatures/') && f !== '404.html' && existsSync(f));
let modifiees = 0;
for (const page of pages) {
  const avant = readFileSync(page, 'utf8'); let html = avant; const notes = [];
  if (html.includes('/post/escape-game-mondeville/')) { html = html.split('/post/escape-game-mondeville/').join('/escape-game-mondeville/'); notes.push('ancien lien remplace'); }
  const i = html.indexOf('<footer'); const j = html.indexOf('</footer>', i);
  if (i !== -1 && j !== -1) {
    const foot = html.slice(i, j);
    if (!foot.includes('href="/escape-game-mondeville/"')) {
      let neuf = foot;
      if (foot.includes('<li><a href="/escape-game-caen/">Escape Game Caen</a></li>')) neuf = foot.replace('<li><a href="/escape-game-caen/">Escape Game Caen</a></li>', '<li><a href="/escape-game-caen/">Escape Game Caen</a></li><li><a href="/escape-game-mondeville/">Escape Game Mondeville</a></li>');
      else if (foot.includes('<a href="/escape-game-caen/">Escape Game Caen</a>')) neuf = foot.replace('<a href="/escape-game-caen/">Escape Game Caen</a>', '<a href="/escape-game-caen/">Escape Game Caen</a><a href="/escape-game-mondeville/">Escape Game Mondeville</a>');
      if (neuf !== foot) { html = html.slice(0, i) + neuf + html.slice(j); notes.push('lien pied de page ajoute'); }
      else notes.push('pied de page sans lien Escape Game Caen');
    }
  }
  if (html !== avant) { modifiees++; if (!apercu) writeFileSync(page, html, 'utf8'); }
  if (notes.length) console.log(page + ' — ' + notes.join(' ; '));
}
console.log(`${apercu ? '[apercu] ' : ''}${modifiees} page(s) modifiee(s).`);
