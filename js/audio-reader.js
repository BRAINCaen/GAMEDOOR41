/* ============================================================
   GAMEDOOR·41 — Audio reader for magazine posts
   Uses native Web Speech API (no backend, free, offline-capable)
   Inserts a play/pause/next widget at the top of each article body
   ============================================================ */
function gd41InitAudioReader() {
  'use strict';

  // Run only on article pages
  var body = document.querySelector('.post-body');
  if (!body) { console.log('[audio-reader] no .post-body found, abort'); return; }

  // Check Web Speech API support
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
    console.log('[audio-reader] Web Speech API not supported, abort');
    return;
  }

  // Skip if already initialized
  if (document.querySelector('.audio-reader')) { console.log('[audio-reader] already initialized'); return; }
  console.log('[audio-reader] initializing...');

  // ===== Article playlist (ordered by relevance/freshness) =====
  // Used for the "Next article" button : when reading is over OR user clicks ⏭
  var PLAYLIST = [
    { url: '/post/escape-game-ou-action-game-caen/',       title: 'Escape Game ou Action Game à Caen' },
    { url: '/post/pont-ascension-caen-mai-2026/',          title: "Pont de l'Ascension 2026 à Caen" },
    { url: '/post/activites-indoor-caen-pluie/',           title: 'Activités indoor à Caen quand il pleut' },
    { url: '/post/escape-game-mondeville/',                title: 'Escape Game à Mondeville' },
    { url: '/post/anniversaire-enfant-caen/',              title: 'Anniversaire enfant à Caen' },
    { url: '/post/anniversaire-ado-caen/',                 title: 'Anniversaire ado à Caen' },
    { url: '/post/sortie-couple-caen/',                    title: 'Sortie en couple à Caen' },
    { url: '/post/pont-14-juillet-caen-2026/',             title: '14 juillet 2026 à Caen' },
    { url: '/post/vacances-ete-caen-2026/',                title: "Vacances d'été 2026 à Caen" },
    { url: '/post/escape-game-caen-guide-complet-2026/',   title: 'Escape Game à Caen — Guide 2026' },
    { url: '/post/escape-game-caen-tarif-etudiant/',       title: 'Escape Game Étudiant à Caen' },
    { url: '/post/escape-game-a-deux-astuces-avantages/',  title: 'Escape Game à deux à Caen' },
    { url: '/post/escape-game-horreur-psychiatric-caen/',  title: 'Escape Game Psychiatric à Caen' },
    { url: '/post/escape-game-back-to-80s-famille-caen/',  title: "Back to the 80's en famille à Caen" },
    { url: '/post/buzz-your-brain-jeu-televise-realiste-caen/', title: 'Buzz Your Brain — Jeu télévisé à Caen' },
    { url: '/post/quiz-game-noel-caen-buzz-your-brain/',   title: 'Quiz Game Noël à Caen' },
    { url: '/post/evjf-evg-caen-quiz-buzz-your-brain/',    title: 'EVJF / EVG à Caen — Quiz Buzz Your Brain' },
    { url: '/post/organiser-evjf-evg-inoubliable-caen/',   title: 'EVJF / EVG inoubliable à Caen' },
    { url: '/post/team-building-reussi-caen-escape-game/', title: 'Team Building réussi à Caen' },
    { url: '/post/carte-cadeau-escape-quiz-caen/',         title: 'Carte cadeau Escape & Quiz à Caen' }
  ];

  function getNextUrl() {
    var current = window.location.pathname.replace(/\/+$/, '/');
    var idx = -1;
    for (var i = 0; i < PLAYLIST.length; i++) {
      if (PLAYLIST[i].url.replace(/\/+$/, '/') === current) { idx = i; break; }
    }
    if (idx < 0) return PLAYLIST[0].url; // fallback : first
    return PLAYLIST[(idx + 1) % PLAYLIST.length].url; // loop
  }

  // ===== Build the readable text : title + excerpt + body =====
  function getReadableText() {
    var titleEl = document.querySelector('.post-title');
    var excerptEl = document.querySelector('.post-excerpt');
    var parts = [];
    if (titleEl) parts.push(titleEl.textContent.trim());
    if (excerptEl) parts.push(excerptEl.textContent.trim());

    var clone = body.cloneNode(true);
    clone.querySelectorAll('table, .post-cta-block, .audio-reader').forEach(function (el) { el.remove(); });
    parts.push(clone.innerText.trim());

    var text = parts.join('. ').replace(/\s+/g, ' ').replace(/­/g, '');
    text = text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '');
    return text;
  }

  var fullText = getReadableText();
  if (!fullText || fullText.length < 50) return;

  var wordCount = fullText.split(/\s+/).length;
  var estMinutes = Math.max(1, Math.round(wordCount / 180));

  // ===== Speed persistence (localStorage) =====
  var SPEED_KEY = 'gd41_audio_speed';
  function getSpeed() {
    try {
      var v = parseFloat(localStorage.getItem(SPEED_KEY));
      if (v && v >= 0.5 && v <= 2) return v;
    } catch (e) {}
    return 1.0;
  }
  function setSpeed(v) {
    try { localStorage.setItem(SPEED_KEY, String(v)); } catch (e) {}
  }
  var currentSpeed = getSpeed();

  // ===== Build widget =====
  var widget = document.createElement('div');
  widget.className = 'audio-reader';
  widget.setAttribute('aria-label', "Écouter l'article");
  widget.innerHTML = [
    '<button type="button" class="ar-btn ar-play-btn" aria-label="Lire l\'article à voix haute">',
    '  <svg class="ar-icon-play" viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
    '  <svg class="ar-icon-pause" viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true" style="display:none"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>',
    '</button>',
    '<div class="ar-info">',
    '  <span class="ar-title">Écouter l\'article</span>',
    '  <span class="ar-meta"><span class="ar-duration">≈ ' + estMinutes + ' min</span> · Lecture vocale</span>',
    '</div>',
    '<div class="ar-controls">',
    '  <div class="ar-speed" role="group" aria-label="Vitesse de lecture">',
    '    <button type="button" class="ar-speed-btn" data-speed="0.85" aria-label="Vitesse lente">0.85×</button>',
    '    <button type="button" class="ar-speed-btn" data-speed="1" aria-label="Vitesse normale">1×</button>',
    '    <button type="button" class="ar-speed-btn" data-speed="1.2" aria-label="Vitesse rapide">1.2×</button>',
    '  </div>',
    '  <button type="button" class="ar-btn ar-stop-btn" aria-label="Arrêter la lecture" style="display:none" title="Arrêter">',
    '    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M6 6h12v12H6z"/></svg>',
    '  </button>',
    '  <button type="button" class="ar-btn ar-next-btn" aria-label="Article suivant" title="Article suivant">',
    '    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>',
    '  </button>',
    '</div>',
    '<div class="ar-progress" aria-hidden="true"><div class="ar-progress-fill"></div></div>'
  ].join('');

  body.insertBefore(widget, body.firstChild);

  // ===== Inject CSS =====
  if (!document.getElementById('ar-styles')) {
    var style = document.createElement('style');
    style.id = 'ar-styles';
    style.textContent = [
      '.audio-reader{display:flex;align-items:center;gap:14px;background:rgba(224,112,32,0.08);border:1px solid rgba(224,112,32,0.28);border-radius:12px;padding:14px 18px;margin:0 0 28px;font-family:DM Sans,system-ui,sans-serif;position:relative;overflow:hidden;flex-wrap:wrap}',
      '.audio-reader .ar-btn{flex-shrink:0;border-radius:50%;background:#E07020;color:#fff;border:none;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:transform .2s ease,background .2s ease;padding:0}',
      '.audio-reader .ar-play-btn{width:46px;height:46px}',
      '.audio-reader .ar-stop-btn,.audio-reader .ar-next-btn{width:38px;height:38px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:#C8C2B8}',
      '.audio-reader .ar-btn:hover{transform:scale(1.06);background:#F08530}',
      '.audio-reader .ar-stop-btn:hover,.audio-reader .ar-next-btn:hover{background:rgba(255,255,255,.12);color:#F0EBE2}',
      '.audio-reader .ar-btn:active{transform:scale(.94)}',
      '.audio-reader .ar-info{flex:1 1 auto;min-width:140px;display:flex;flex-direction:column;gap:2px}',
      '.audio-reader .ar-title{font-family:Barlow Condensed,DM Sans,sans-serif;font-weight:700;font-size:15px;text-transform:uppercase;letter-spacing:.06em;color:#F0EBE2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.audio-reader .ar-meta{font-size:13px;color:#A8A095;line-height:1.3}',
      '.audio-reader .ar-duration{color:#C8C2B8;font-weight:500}',
      '.audio-reader .ar-controls{display:flex;align-items:center;gap:10px;flex-shrink:0}',
      '.audio-reader .ar-speed{display:inline-flex;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.10);border-radius:8px;overflow:hidden}',
      '.audio-reader .ar-speed-btn{background:transparent;border:none;color:#A8A095;font-family:DM Sans,sans-serif;font-size:12px;font-weight:600;padding:6px 10px;cursor:pointer;transition:background .2s,color .2s;min-height:30px;border-right:1px solid rgba(255,255,255,.08)}',
      '.audio-reader .ar-speed-btn:last-child{border-right:none}',
      '.audio-reader .ar-speed-btn:hover{color:#F0EBE2;background:rgba(255,255,255,.04)}',
      '.audio-reader .ar-speed-btn.active{color:#0C0800;background:#E07020}',
      '.audio-reader .ar-progress{position:absolute;bottom:0;left:0;right:0;height:3px;background:rgba(224,112,32,.12)}',
      '.audio-reader .ar-progress-fill{height:100%;background:#E07020;width:0;transition:width .3s ease}',
      '.audio-reader.playing .ar-progress-fill{animation:ar-progress-anim var(--ar-duration,180s) linear forwards}',
      '@keyframes ar-progress-anim{from{width:0}to{width:100%}}',
      '@media(max-width:640px){.audio-reader{padding:12px 14px;gap:10px}.audio-reader .ar-play-btn{width:42px;height:42px}.audio-reader .ar-info{flex-basis:calc(100% - 60px);order:2}.audio-reader .ar-controls{flex-basis:100%;order:3;justify-content:space-between;border-top:1px solid rgba(255,255,255,.06);padding-top:10px;margin-top:4px}.audio-reader .ar-title{font-size:13px}.audio-reader .ar-meta{font-size:12px}.audio-reader .ar-speed-btn{padding:5px 8px;font-size:11px}}',
      '@media(prefers-reduced-motion:reduce){.audio-reader.playing .ar-progress-fill{animation:none}}'
    ].join('');
    document.head.appendChild(style);
  }

  // ===== Logic =====
  var synth = window.speechSynthesis;
  var utterance = null;
  var state = 'idle'; // idle | playing | paused

  var playBtn = widget.querySelector('.ar-play-btn');
  var stopBtn = widget.querySelector('.ar-stop-btn');
  var nextBtn = widget.querySelector('.ar-next-btn');
  var iconPlay = widget.querySelector('.ar-icon-play');
  var iconPause = widget.querySelector('.ar-icon-pause');
  var titleEl = widget.querySelector('.ar-title');
  var progFill = widget.querySelector('.ar-progress-fill');
  var speedBtns = widget.querySelectorAll('.ar-speed-btn');

  // Mark initial active speed
  speedBtns.forEach(function (b) {
    if (parseFloat(b.dataset.speed) === currentSpeed) b.classList.add('active');
  });

  function showPlayIcon() { iconPlay.style.display = 'block'; iconPause.style.display = 'none'; }
  function showPauseIcon() { iconPlay.style.display = 'none'; iconPause.style.display = 'block'; }

  function pickFrenchVoice() {
    var voices = synth.getVoices();
    if (!voices.length) return null;
    var fr = voices.filter(function (v) { return v.lang && v.lang.toLowerCase().indexOf('fr') === 0; });
    if (!fr.length) return null;
    fr.sort(function (a, b) {
      var score = function (v) {
        var n = (v.name || '').toLowerCase();
        if (n.indexOf('premium') !== -1) return 0;
        if (n.indexOf('enhanced') !== -1) return 1;
        if (n.indexOf('google') !== -1) return 2;
        if (n.indexOf('amelie') !== -1 || n.indexOf('thomas') !== -1) return 3;
        return 9;
      };
      return score(a) - score(b);
    });
    return fr[0];
  }

  function start() {
    synth.cancel();

    utterance = new SpeechSynthesisUtterance(fullText);
    utterance.lang = 'fr-FR';
    utterance.rate = currentSpeed;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    var voice = pickFrenchVoice();
    if (voice) utterance.voice = voice;

    utterance.onstart = function () {
      state = 'playing';
      showPauseIcon();
      titleEl.textContent = 'Lecture en cours…';
      stopBtn.style.display = 'inline-flex';
      // Adjust progress duration based on speed
      var realMin = estMinutes / currentSpeed;
      widget.style.setProperty('--ar-duration', (realMin * 60) + 's');
      widget.classList.add('playing');
    };

    utterance.onend = function () {
      state = 'idle';
      showPlayIcon();
      titleEl.textContent = "Réécouter l'article";
      stopBtn.style.display = 'none';
      widget.classList.remove('playing');
      progFill.style.width = '0%';
      // Auto-suggest next article (no auto-redirect, just highlight the next button)
      nextBtn.style.background = '#E07020';
      nextBtn.style.color = '#fff';
      setTimeout(function(){ nextBtn.style.background=''; nextBtn.style.color=''; }, 4000);
    };

    utterance.onerror = function () {
      state = 'idle';
      showPlayIcon();
      titleEl.textContent = 'Erreur — cliquez pour réessayer';
      stopBtn.style.display = 'none';
      widget.classList.remove('playing');
    };

    synth.speak(utterance);

    if (typeof gtag === 'function') {
      gtag('event', 'audio_reader_play', {
        article_title: (document.querySelector('.post-title') || {}).textContent || '',
        article_url: window.location.pathname,
        speed: currentSpeed
      });
    }
  }

  function pause() {
    synth.pause();
    state = 'paused';
    showPlayIcon();
    titleEl.textContent = 'Pause — cliquez pour reprendre';
    widget.classList.remove('playing');
  }

  function resume() {
    synth.resume();
    state = 'playing';
    showPauseIcon();
    titleEl.textContent = 'Lecture en cours…';
    widget.classList.add('playing');
  }

  function stop() {
    synth.cancel();
    state = 'idle';
    showPlayIcon();
    titleEl.textContent = "Écouter l'article";
    stopBtn.style.display = 'none';
    widget.classList.remove('playing');
    progFill.style.width = '0%';
  }

  function changeSpeed(newSpeed) {
    currentSpeed = newSpeed;
    setSpeed(newSpeed);
    speedBtns.forEach(function (b) {
      b.classList.toggle('active', parseFloat(b.dataset.speed) === newSpeed);
    });
    // If currently reading, restart from beginning at new speed
    if (state === 'playing' || state === 'paused') {
      start();
    }
  }

  playBtn.addEventListener('click', function () {
    if (state === 'idle') start();
    else if (state === 'playing') pause();
    else if (state === 'paused') resume();
  });

  stopBtn.addEventListener('click', stop);

  nextBtn.addEventListener('click', function () {
    if (typeof gtag === 'function') {
      gtag('event', 'audio_reader_next', {
        from_article: window.location.pathname,
        to_article: getNextUrl()
      });
    }
    if (state !== 'idle') synth.cancel();
    window.location.href = getNextUrl();
  });

  speedBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      changeSpeed(parseFloat(b.dataset.speed));
    });
  });

  window.addEventListener('beforeunload', function () {
    if (state !== 'idle') synth.cancel();
  });

  if (synth.getVoices().length === 0 && 'onvoiceschanged' in synth) {
    synth.addEventListener('voiceschanged', function () { /* voices ready */ }, { once: true });
  }

  console.log('[audio-reader] widget injected successfully');
}

// Run when DOM is ready (defer should already wait for DOMContentLoaded but extra safety)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', gd41InitAudioReader);
} else {
  gd41InitAudioReader();
}
