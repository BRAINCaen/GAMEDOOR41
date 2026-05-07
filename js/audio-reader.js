/* ============================================================
   GAMEDOOR·41 — Audio reader for magazine posts
   Uses native Web Speech API (no backend, free, offline-capable)
   Inserts a play/pause widget at the top of each article body
   ============================================================ */
(function () {
  'use strict';

  // Run only on article pages
  var body = document.querySelector('.post-body');
  if (!body) return;

  // Check Web Speech API support
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return;

  // Build the readable text : title + excerpt + body
  function getReadableText() {
    var titleEl = document.querySelector('.post-title');
    var excerptEl = document.querySelector('.post-excerpt');
    var parts = [];
    if (titleEl) parts.push(titleEl.textContent.trim());
    if (excerptEl) parts.push(excerptEl.textContent.trim());

    // Clone body to strip <table> (don't read tables, they're hard) and CTAs
    var clone = body.cloneNode(true);
    // Remove tables (better not read them aloud — confusing)
    clone.querySelectorAll('table, .post-cta-block, .audio-reader').forEach(function (el) { el.remove(); });
    parts.push(clone.innerText.trim());

    // Clean up : remove repeated whitespace, soft hyphens, emoji
    var text = parts.join('. ').replace(/\s+/g, ' ').replace(/­/g, '');
    // Strip emoji to avoid weird TTS pronunciation
    text = text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '');
    return text;
  }

  var fullText = getReadableText();
  if (!fullText || fullText.length < 50) return;

  // Estimate reading time : ~180 mots/min en français TTS rate=1
  var wordCount = fullText.split(/\s+/).length;
  var estMinutes = Math.max(1, Math.round(wordCount / 180));

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
    '<button type="button" class="ar-btn ar-stop-btn" aria-label="Arrêter la lecture" style="display:none">',
    '  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M6 6h12v12H6z"/></svg>',
    '</button>',
    '<div class="ar-progress" aria-hidden="true"><div class="ar-progress-fill"></div></div>'
  ].join('');

  // Insert widget at top of post-body
  body.insertBefore(widget, body.firstChild);

  // ===== Inject CSS =====
  if (!document.getElementById('ar-styles')) {
    var style = document.createElement('style');
    style.id = 'ar-styles';
    style.textContent = [
      '.audio-reader{display:flex;align-items:center;gap:14px;background:rgba(224,112,32,0.08);border:1px solid rgba(224,112,32,0.28);border-radius:12px;padding:14px 18px;margin:0 0 28px;font-family:DM Sans,system-ui,sans-serif;position:relative;overflow:hidden}',
      '.audio-reader .ar-btn{flex-shrink:0;width:46px;height:46px;border-radius:50%;background:#E07020;color:#fff;border:none;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:transform .2s ease,background .2s ease;padding:0}',
      '.audio-reader .ar-btn:hover{transform:scale(1.06);background:#F08530}',
      '.audio-reader .ar-btn:active{transform:scale(.94)}',
      '.audio-reader .ar-stop-btn{width:38px;height:38px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:#C8C2B8}',
      '.audio-reader .ar-stop-btn:hover{background:rgba(255,255,255,.12);transform:scale(1.06)}',
      '.audio-reader .ar-info{flex:1;display:flex;flex-direction:column;gap:2px;min-width:0}',
      '.audio-reader .ar-title{font-family:Barlow Condensed,DM Sans,sans-serif;font-weight:700;font-size:15px;text-transform:uppercase;letter-spacing:.06em;color:#F0EBE2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.audio-reader .ar-meta{font-size:13px;color:#A8A095;line-height:1.3}',
      '.audio-reader .ar-duration{color:#C8C2B8;font-weight:500}',
      '.audio-reader .ar-progress{position:absolute;bottom:0;left:0;right:0;height:3px;background:rgba(224,112,32,.12)}',
      '.audio-reader .ar-progress-fill{height:100%;background:#E07020;width:0;transition:width .3s ease}',
      '.audio-reader.playing .ar-progress-fill{animation:ar-progress-anim var(--ar-duration,180s) linear forwards}',
      '@keyframes ar-progress-anim{from{width:0}to{width:100%}}',
      '@media(max-width:540px){.audio-reader{padding:12px 14px;gap:10px}.audio-reader .ar-btn{width:42px;height:42px}.audio-reader .ar-title{font-size:13px}.audio-reader .ar-meta{font-size:12px}}',
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
  var iconPlay = widget.querySelector('.ar-icon-play');
  var iconPause = widget.querySelector('.ar-icon-pause');
  var titleEl = widget.querySelector('.ar-title');
  var progFill = widget.querySelector('.ar-progress-fill');

  function showPlayIcon() { iconPlay.style.display = 'block'; iconPause.style.display = 'none'; }
  function showPauseIcon() { iconPlay.style.display = 'none'; iconPause.style.display = 'block'; }

  function pickFrenchVoice() {
    var voices = synth.getVoices();
    if (!voices.length) return null;
    // Prefer French voices, prefer "Premium"/"Enhanced" if present
    var fr = voices.filter(function (v) { return v.lang && v.lang.toLowerCase().indexOf('fr') === 0; });
    if (!fr.length) return null;
    // Sort : "Premium" / "Enhanced" / "Google" first
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
    // Cancel any ongoing speech
    synth.cancel();

    utterance = new SpeechSynthesisUtterance(fullText);
    utterance.lang = 'fr-FR';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    var voice = pickFrenchVoice();
    if (voice) utterance.voice = voice;

    utterance.onstart = function () {
      state = 'playing';
      showPauseIcon();
      titleEl.textContent = 'Lecture en cours…';
      stopBtn.style.display = 'inline-flex';
      widget.style.setProperty('--ar-duration', (estMinutes * 60) + 's');
      widget.classList.add('playing');
    };

    utterance.onend = function () {
      state = 'idle';
      showPlayIcon();
      titleEl.textContent = "Réécouter l'article";
      stopBtn.style.display = 'none';
      widget.classList.remove('playing');
      progFill.style.width = '0%';
    };

    utterance.onerror = function () {
      state = 'idle';
      showPlayIcon();
      titleEl.textContent = 'Erreur — cliquez pour réessayer';
      stopBtn.style.display = 'none';
      widget.classList.remove('playing');
    };

    synth.speak(utterance);

    // GA4 tracking
    if (typeof gtag === 'function') {
      gtag('event', 'audio_reader_play', {
        article_title: (document.querySelector('.post-title') || {}).textContent || '',
        article_url: window.location.pathname
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

  playBtn.addEventListener('click', function () {
    if (state === 'idle') start();
    else if (state === 'playing') pause();
    else if (state === 'paused') resume();
  });

  stopBtn.addEventListener('click', stop);

  // Stop reading when the user navigates away
  window.addEventListener('beforeunload', function () {
    if (state !== 'idle') synth.cancel();
  });

  // Voices may load asynchronously on some browsers (Chrome)
  if (synth.getVoices().length === 0 && 'onvoiceschanged' in synth) {
    synth.addEventListener('voiceschanged', function () { /* noop, voices ready */ }, { once: true });
  }
})();
