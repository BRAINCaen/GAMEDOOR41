import fs from 'node:fs';

const file = 'escape-game-caen/index.html';
let c = fs.readFileSync(file, 'utf8');

const ids = ['in-prison', 'psychiatric', 'back-80s'];
const blocks = {};

for (const id of ids) {
  // Find the section's actual opening tag
  const sectionRe = new RegExp('<section class="section salle-section" id="' + id + '"');
  const sectionMatch = c.match(sectionRe);
  if (!sectionMatch) { console.error('NOT FOUND section', id); process.exit(1); }
  const sectionIdx = sectionMatch.index;

  // Walk backwards to find the SALLE comment that precedes
  const before = c.slice(0, sectionIdx);
  const commentMatch = before.match(/  <!-- SALLE \d+:[^\n]*-->\s*$/);
  if (!commentMatch) { console.error('NOT FOUND comment for', id); process.exit(1); }
  const startIdx = commentMatch.index;

  // Find the closing </section> after sectionIdx
  const after = c.slice(sectionIdx);
  const endRel = after.indexOf('</section>');
  if (endRel < 0) { console.error('NOT FOUND end', id); process.exit(1); }
  const endIdx = sectionIdx + endRel + '</section>'.length;

  blocks[id] = { start: startIdx, end: endIdx, content: c.slice(startIdx, endIdx) };
  console.log('Found', id, 'at', startIdx, '-', endIdx, 'len', endIdx - startIdx);
}

const newNumbers = { 'back-80s': '01', 'in-prison': '02', 'psychiatric': '03' };
const newLabels = { 'back-80s': "BACK TO THE 80'S", 'in-prison': 'GARDE À VUE', 'psychiatric': 'PSYCHIATRIC' };

for (const id of ids) {
  let s = blocks[id].content;
  const n = newNumbers[id];
  s = s.replace(/<!-- SALLE \d+:[^\n]*-->/, '<!-- SALLE ' + n + ': ' + newLabels[id] + ' -->');
  s = s.replace(/(<div class="salle-num-deco" aria-hidden="true">)\d+(<\/div>)/, '$1' + n + '$2');
  s = s.replace(/(<p class="salle-kicker"><span class="num">)\d+(<\/span> Salle<\/p>)/, '$1' + n + '$2');
  blocks[id].content = s;
}

// Sort by start position descending and replace each block with a unique placeholder
const sortedByStartDesc = ids.slice().sort((a, b) => blocks[b].start - blocks[a].start);
let out = c;
const placeholders = {};
for (const id of sortedByStartDesc) {
  const ph = '___SALLEBLOCK_' + id + '___';
  placeholders[id] = ph;
  out = out.slice(0, blocks[id].start) + ph + out.slice(blocks[id].end);
}

const newOrder = ['back-80s', 'in-prison', 'psychiatric'];
const combined = newOrder.map(id => blocks[id].content).join('\n\n');

// Replace the FIRST placeholder (in document order) with the combined content, blank others
const firstPh = newOrder.map(id => ({ id, idx: out.indexOf(placeholders[id]) }))
  .filter(p => p.idx >= 0)
  .sort((a, b) => a.idx - b.idx)[0];
out = out.replace(placeholders[firstPh.id], combined);
for (const id of ids) {
  if (id !== firstPh.id) {
    out = out.replace(new RegExp('\\s*' + placeholders[id] + '\\s*'), '\n');
  }
}

fs.writeFileSync(file, out);
console.log('OK reordered: 01=Back, 02=Garde-à-Vue, 03=Psy');
