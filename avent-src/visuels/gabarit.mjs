// Gabarit des visuels du calendrier de l'Avent pour les réseaux sociaux (publication 1080 × 1350, story 1080 × 1920).
// Fait en code, à partir de la charte du site et de VRAIES photos de nos salles : aucune image générée par IA.
// Les textes viennent de avent-src/lots-2026.mjs : si un lot change, relancer `node avent-src/visuels/fabriquer.mjs`.
// Les jours où le jeu a une vraie photo de la boîte prise par nous (`maison: true`), la boîte remplace la porte.
import { ETOILES, JEUX, FINAUX, PLACE_QUIZ, PLACE_ESCAPE } from '../lots-2026.mjs';
import { dateTexte } from '../messages.mjs';

export const FORMATS = { post: { l: 1080, h: 1350 }, story: { l: 1080, h: 1920 } };
const UNIVERS_DU_JOUR = ['psy', 'gav', 'quiz', '80s']; // j % 4 : 1 = Garde à Vue, 2 = quiz, 3 = Back to the 80's, 0 = Psychiatric
const TEINTES = { gav: '#3D5DC0', psy: '#E0243C', '80s': '#FF3EA5', quiz: '#9D4EDD', final: '#FFD740' };
const PHOTOS = {
  gav: '/img/escape/salle-garde-a-vue-barreaux-poste-garde-1024w.jpg',
  psy: '/img/escape/psychiatric-couloir-1024w.jpg',
  '80s': '/img/escape/salle-back-to-80s-borne-arcade-pacman-1024w.jpg',
  quiz: '/img/quiz/salle-quiz-buzzers-premier-plan-1024w.jpg',
  final: '/img/escape/garde-a-vue-porte-1024w.jpg',
};
const NOMS = { gav: 'Garde à Vue', psy: 'Psychiatric', '80s': 'Back to the 80’s', quiz: 'Quiz Buzz Your Brain', final: 'La dernière porte' };
const h = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const universDe = (j) => (j >= 24 ? 'final' : UNIVERS_DU_JOUR[j % 4]);

export function visuel(j, format) {
  const { l, h: haut } = FORMATS[format];
  const story = format === 'story';
  const fin = j === 25;
  const u = fin ? 'final' : universDe(j);
  const c = TEINTES[u];
  const etoile = ETOILES.includes(j);
  const jeu = JEUX[j];
  const place = etoile ? PLACE_ESCAPE : PLACE_QUIZ;
  const sombre = u === 'final';
  const boite = !!(jeu && jeu.maison && jeu.image);
  const visuelJour = boite
    ? `<div class="boite"><img src="${h(jeu.image)}" alt=""><span class="pastille">${j}</span>${etoile ? '<span class="etoile">★</span>' : ''}</div>`
    : `<div class="porte"><span class="num">${j}</span><span class="poignee"></span>${etoile ? '<span class="etoile">★</span>' : ''}</div>`;
  const corps = fin
    ? `<p class="sur">Les 24 portes sont ouvertes</p>
       <h1 class="grand">Merci d’avoir joué&nbsp;!</h1>
       <div class="lot"><p class="lot-titre">Les grands gagnants</p>
         <p class="lot-ligne">Grand tirage&nbsp;: ${h(FINAUX.grand.nom.replace(/^Une /, 'la '))}</p>
         <p class="lot-ligne">Tirage des 24 portes&nbsp;: ${h(FINAUX.assidus.nom.replace(/^Une /, 'une '))}</p></div>
       <p class="note">Les noms des gagnants sont dans la légende et sur le site.</p>`
    : `<p class="sur">Calendrier de l’Avent</p><p class="date">${h(dateTexte(j))}</p>
       <div class="duo">
         ${visuelJour}
         <div class="texte">
           <p class="univers">${h(NOMS[u])}</p>
           <p class="lot-titre">À gagner aujourd’hui</p>
           <p class="lot-place">${h(place)}</p>
           ${jeu ? `<p class="plus">+ le jeu</p><p class="lot-jeu">${h(jeu.nom)}</p>${jeu.sous ? `<p class="lot-sous">${h(jeu.sous)}</p>` : ''}` : ''}
         </div>
       </div>
       ${story ? '' : '<p class="note">Un défi d’une minute. Un gagnant tiré au sort chaque jour.</p>'}`;
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=DM+Sans:wght@400;500;700&display=swap">
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  html, body { width:${l}px; height:${haut}px; overflow:hidden; background:#0a0a0a; color:#fff; font-family:'DM Sans', sans-serif; }
  .fond { position:absolute; inset:-30px; background:#000 url(${PHOTOS[u]}) center / cover no-repeat; filter:blur(5px) saturate(.9); }
  .voile { position:absolute; inset:0; background:linear-gradient(180deg, rgba(0,0,0,.80) 0%, rgba(0,0,0,.58) 34%, rgba(0,0,0,.74) 68%, rgba(0,0,0,.94) 100%); }
  .cadre { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; padding:${story ? '215px 70px 255px' : '60px 64px 0'}; text-align:center; }
  .logo { height:${story ? 62 : 58}px; width:auto; }
  .sur { margin-top:${story ? 44 : 30}px; font-family:'Oswald', sans-serif; font-weight:500; font-size:${story ? 40 : 36}px; letter-spacing:5px; text-transform:uppercase; color:#ff6b00; }
  .date { margin-top:4px; font-family:'Oswald', sans-serif; font-weight:700; font-size:${story ? 62 : 56}px; line-height:1.1; text-transform:uppercase; }
  .duo { flex:1 1 auto; display:flex; flex-direction:${story ? 'column' : 'row'}; align-items:center; justify-content:center; gap:${story ? 40 : 56}px; width:100%; ${story ? 'margin-top:54px; justify-content:flex-start;' : ''} }
  .porte { position:relative; flex:none; width:${story ? 300 : 350}px; height:${story ? 435 : 520}px; border-radius:14px 14px 5px 5px; background:linear-gradient(160deg, color-mix(in srgb, ${c} 90%, #fff) 0%, ${c} 40%, color-mix(in srgb, ${c} 60%, #000) 100%); box-shadow:0 0 0 8px #0a0a0a, 0 0 0 ${etoile ? '13px #FFD740' : '10px rgba(255,255,255,.22)'}, 0 30px 70px rgba(0,0,0,.75), inset 0 0 60px rgba(0,0,0,.35); display:flex; align-items:center; justify-content:center; transform:rotate(-3deg); }
  .porte::before { content:""; position:absolute; inset:9% 12%; border:5px solid rgba(0,0,0,.24); border-radius:8px; box-shadow:inset 0 0 0 2px rgba(255,255,255,.16); }
  .num { position:relative; font-family:'Oswald', sans-serif; font-weight:700; font-size:${story ? 195 : 232}px; line-height:1; color:${sombre ? '#1a1400' : '#fff'}; text-shadow:${sombre ? 'none' : '0 6px 0 rgba(0,0,0,.35)'}; }
  .poignee { position:absolute; right:9%; top:55%; width:34px; height:34px; border-radius:50%; background:radial-gradient(circle at 35% 30%, #fff, #b9b9b9 45%, #5d5d5d); box-shadow:0 5px 8px rgba(0,0,0,.5); }
  .etoile { position:absolute; top:3%; right:7%; font-size:64px; line-height:1; color:${sombre ? '#1a1400' : '#FFD740'}; text-shadow:0 3px 4px rgba(0,0,0,.5); }
  .boite { position:relative; flex:none; width:${story ? 430 : 360}px; transform:rotate(-3deg); }
  .boite img { display:block; width:100%; height:auto; max-height:${story ? 430 : 500}px; object-fit:contain; border-radius:10px; box-shadow:0 0 0 8px #0a0a0a, 0 0 0 ${etoile ? '13px #FFD740' : '10px rgba(255,255,255,.22)'}, 0 30px 70px rgba(0,0,0,.75); }
  .pastille { position:absolute; top:-30px; left:-30px; width:104px; height:142px; border-radius:10px 10px 4px 4px; background:linear-gradient(160deg, color-mix(in srgb, ${c} 90%, #fff) 0%, ${c} 40%, color-mix(in srgb, ${c} 60%, #000) 100%); display:flex; align-items:center; justify-content:center; font-family:'Oswald', sans-serif; font-weight:700; font-size:84px; line-height:1; color:${sombre ? '#1a1400' : '#fff'}; text-shadow:0 4px 0 rgba(0,0,0,.35); box-shadow:0 0 0 6px #0a0a0a, 0 14px 30px rgba(0,0,0,.6); transform:rotate(-4deg); }
  .boite .etoile { top:-26px; right:-22px; }
  .texte { ${story ? 'width:100%;' : 'flex:1 1 0; min-width:0; text-align:left;'} }
  .univers { display:inline-block; padding:6px 18px; border-radius:99px; background:${c}; color:${sombre ? '#1a1400' : '#fff'}; font-family:'Oswald', sans-serif; font-weight:600; font-size:28px; letter-spacing:2px; text-transform:uppercase; }
  .lot-titre { margin-top:${story ? 30 : 26}px; font-family:'Oswald', sans-serif; font-weight:500; font-size:${story ? 44 : 38}px; letter-spacing:4px; text-transform:uppercase; color:#FFD740; }
  .lot-place { margin-top:8px; font-family:'Oswald', sans-serif; font-weight:700; font-size:${story ? 92 : 78}px; line-height:1.05; text-transform:uppercase; }
  .plus { margin-top:${story ? 26 : 22}px; font-family:'Oswald', sans-serif; font-weight:500; font-size:${story ? 40 : 34}px; letter-spacing:3px; text-transform:uppercase; color:#FFD740; }
  .lot-jeu { margin-top:4px; font-family:'Oswald', sans-serif; font-weight:700; font-size:${story ? 76 : 62}px; line-height:1.08; text-transform:uppercase; color:#F0EBE2; overflow-wrap:break-word; }
  .lot-sous { margin-top:8px; font-size:${story ? 36 : 32}px; color:#F0EBE2; }
  .grand { margin-top:${story ? 120 : 70}px; font-family:'Oswald', sans-serif; font-weight:700; font-size:${story ? 150 : 132}px; line-height:1.02; text-transform:uppercase; }
  .lot { margin-top:${story ? 90 : 60}px; padding:34px 36px; width:100%; background:rgba(0,0,0,.6); border:3px solid #FFD740; border-radius:18px; }
  .lot .lot-titre { margin-top:0; }
  .lot-ligne { margin-top:16px; font-size:${story ? 42 : 38}px; line-height:1.3; color:#F0EBE2; }
  .note { ${story ? 'margin-top:44px;' : 'margin:30px 0 30px;'} font-size:${story ? 38 : 34}px; color:#F0EBE2; }
  .bande { ${story ? 'margin-top:auto; align-self:stretch; border-radius:18px; padding:26px 20px;' : 'align-self:stretch; margin:auto -64px 0; padding:30px 40px 34px;'} background:#ff6b00; color:#0a0a0a; font-family:'Oswald', sans-serif; text-transform:uppercase; }
  .bande b { display:block; font-weight:700; font-size:${story ? 46 : 46}px; letter-spacing:1px; }
  .bande span { display:block; margin-top:4px; font-weight:500; font-size:${story ? 30 : 30}px; letter-spacing:3px; }
</style></head><body>
<div class="fond"></div><div class="voile"></div>
<div class="cadre">
  <img class="logo" src="/img/logo/logo-horizontal.svg" alt="">
  ${corps}
  <div class="bande"><b>gamedoor41.fr/calendrier-de-l-avent</b><span>${fin ? 'Joyeux Noël · à très vite à Mondeville' : story ? 'Un défi d’une minute · un gagnant par jour' : 'Jeu gratuit · du 1er au 24 décembre'}</span></div>
</div>
</body></html>`;
}
