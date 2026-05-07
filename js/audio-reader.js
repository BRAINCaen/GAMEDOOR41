/* ============================================================
   GAMEDOOR·41 — Audio reader for magazine posts
   Widget HTML is inlined in each article (always visible).
   This script just attaches behavior to the existing buttons.
   ============================================================ */
console.log('[audio-reader] file loaded ✓');

(function () {
  'use strict';

  function init() {
    var widget = document.querySelector('.audio-reader');
    if (!widget) { return; }
    console.log('[audio-reader] widget found, attaching behavior');

    // Hide widget if Web Speech API unavailable
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
      widget.style.display = 'none';
      console.log('[audio-reader] Web Speech API unavailable, widget hidden');
      return;
    }

    var body = document.querySelector('.post-body');
    if (!body) { return; }

    // ===== Article playlist for "next" button =====
    var PLAYLIST = [
      '/post/escape-game-ou-action-game-caen/',
      '/post/pont-ascension-caen-mai-2026/',
      '/post/activites-indoor-caen-pluie/',
      '/post/escape-game-mondeville/',
      '/post/anniversaire-enfant-caen/',
      '/post/anniversaire-ado-caen/',
      '/post/sortie-couple-caen/',
      '/post/pont-14-juillet-caen-2026/',
      '/post/vacances-ete-caen-2026/',
      '/post/escape-game-caen-guide-complet-2026/',
      '/post/escape-game-caen-tarif-etudiant/',
      '/post/escape-game-a-deux-astuces-avantages/',
      '/post/escape-game-horreur-psychiatric-caen/',
      '/post/escape-game-back-to-80s-famille-caen/',
      '/post/buzz-your-brain-jeu-televise-realiste-caen/',
      '/post/quiz-game-noel-caen-buzz-your-brain/',
      '/post/evjf-evg-caen-quiz-buzz-your-brain/',
      '/post/organiser-evjf-evg-inoubliable-caen/',
      '/post/team-building-reussi-caen-escape-game/',
      '/post/carte-cadeau-escape-quiz-caen/'
    ];

    function getNextUrl() {
      var current = window.location.pathname.replace(/\/+$/, '/');
      for (var i = 0; i < PLAYLIST.length; i++) {
        if (PLAYLIST[i].replace(/\/+$/, '/') === current) {
          return PLAYLIST[(i + 1) % PLAYLIST.length];
        }
      }
      return PLAYLIST[0];
    }

    // ===== Get readable text =====
    function getText() {
      var titleEl = document.querySelector('.post-title');
      var excerptEl = document.querySelector('.post-excerpt');
      var parts = [];
      if (titleEl) parts.push(titleEl.textContent.trim());
      if (excerptEl) parts.push(excerptEl.textContent.trim());
      var clone = body.cloneNode(true);
      var toRemove = clone.querySelectorAll('table, .post-cta-block, .audio-reader');
      for (var j = 0; j < toRemove.length; j++) toRemove[j].parentNode.removeChild(toRemove[j]);
      parts.push(clone.innerText.trim());
      return parts.join('. ').replace(/\s+/g, ' ');
    }

    var fullText = getText();
    if (!fullText || fullText.length < 50) return;

    // ===== Speed (localStorage) =====
    var SPEED_KEY = 'gd41_audio_speed';
    var currentSpeed = 1.0;
    try {
      var v = parseFloat(localStorage.getItem(SPEED_KEY));
      if (v >= 0.5 && v <= 2) currentSpeed = v;
    } catch (e) {}

    var synth = window.speechSynthesis;
    var state = 'idle';
    var utterance = null;

    var playBtn = widget.querySelector('.ar-play-btn');
    var stopBtn = widget.querySelector('.ar-stop-btn');
    var nextBtn = widget.querySelector('.ar-next-btn');
    var iconPlay = widget.querySelector('.ar-icon-play');
    var iconPause = widget.querySelector('.ar-icon-pause');
    var titleEl = widget.querySelector('.ar-title');
    var speedBtns = widget.querySelectorAll('.ar-speed-btn');

    if (!playBtn || !titleEl) return;

    // Mark active speed button
    for (var k = 0; k < speedBtns.length; k++) {
      if (parseFloat(speedBtns[k].getAttribute('data-speed')) === currentSpeed) {
        speedBtns[k].classList.add('active');
      }
    }

    function showPlay() { if (iconPlay) iconPlay.style.display = 'block'; if (iconPause) iconPause.style.display = 'none'; }
    function showPause() { if (iconPlay) iconPlay.style.display = 'none'; if (iconPause) iconPause.style.display = 'block'; }

    function pickVoice() {
      var voices = synth.getVoices();
      if (!voices.length) return null;
      var fr = [];
      for (var x = 0; x < voices.length; x++) {
        if (voices[x].lang && voices[x].lang.toLowerCase().indexOf('fr') === 0) fr.push(voices[x]);
      }
      if (!fr.length) return null;
      // Prefer Premium > Enhanced > Google
      fr.sort(function (a, b) {
        var sc = function (n) {
          n = (n.name || '').toLowerCase();
          if (n.indexOf('premium') !== -1) return 0;
          if (n.indexOf('enhanced') !== -1) return 1;
          if (n.indexOf('google') !== -1) return 2;
          return 9;
        };
        return sc(a) - sc(b);
      });
      return fr[0];
    }

    function start() {
      // Only cancel if something is actually playing (avoid spurious "interrupted")
      if (synth.speaking || synth.pending) {
        synth.cancel();
      }

      // Tiny delay anyway to let Chrome finalize the cancel (no-op if nothing to cancel)
      setTimeout(function () {
        utterance = new SpeechSynthesisUtterance(fullText);
        utterance.lang = 'fr-FR';
        utterance.rate = currentSpeed;
        // NO voice selection — let the browser pick the default French voice
        // (some Chrome installs choke on explicit .voice assignment)

        utterance.onstart = function () {
          state = 'playing'; showPause();
          titleEl.textContent = 'Lecture en cours…';
          if (stopBtn) stopBtn.style.display = 'inline-flex';
          widget.classList.add('playing');
          console.log('[audio-reader] speech started');
        };
        utterance.onend = function () {
          if (state === 'idle') return;
          state = 'idle'; showPlay();
          titleEl.textContent = "Réécouter l'article";
          if (stopBtn) stopBtn.style.display = 'none';
          widget.classList.remove('playing');
          console.log('[audio-reader] speech ended');
        };
        utterance.onerror = function (e) {
          var code = (e && e.error) ? e.error : 'unknown';
          console.warn('[audio-reader] utterance error:', code, e);
          if (code === 'canceled' || code === 'interrupted') return; // expected
          state = 'idle'; showPlay();
          titleEl.textContent = 'Erreur (' + code + ') — réessayez';
          widget.classList.remove('playing');
        };

        // Chrome workaround : speech cuts after ~15s on long texts
        var keepAlive = setInterval(function () {
          if (!synth.speaking && state !== 'playing') { clearInterval(keepAlive); return; }
          if (state === 'playing') { synth.pause(); synth.resume(); }
        }, 10000);

        try {
          synth.speak(utterance);
          console.log('[audio-reader] synth.speak() called');
        } catch (err) {
          console.error('[audio-reader] speak threw:', err);
          titleEl.textContent = 'Erreur de synthèse vocale';
        }
      }, 50);

      if (typeof gtag === 'function') {
        gtag('event', 'audio_reader_play', {
          article_url: window.location.pathname,
          speed: currentSpeed
        });
      }
    }

    function pause() {
      synth.pause(); state = 'paused'; showPlay();
      titleEl.textContent = 'Pause';
      widget.classList.remove('playing');
    }
    function resume() {
      synth.resume(); state = 'playing'; showPause();
      titleEl.textContent = 'Lecture en cours…';
      widget.classList.add('playing');
    }
    function stopAll() {
      synth.cancel(); state = 'idle'; showPlay();
      titleEl.textContent = "Écouter l'article";
      if (stopBtn) stopBtn.style.display = 'none';
      widget.classList.remove('playing');
    }

    playBtn.addEventListener('click', function () {
      if (state === 'idle') start();
      else if (state === 'playing') pause();
      else if (state === 'paused') resume();
    });

    if (stopBtn) stopBtn.addEventListener('click', stopAll);

    if (nextBtn) nextBtn.addEventListener('click', function () {
      if (state !== 'idle') synth.cancel();
      window.location.href = getNextUrl();
    });

    for (var m = 0; m < speedBtns.length; m++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          var newSpeed = parseFloat(btn.getAttribute('data-speed'));
          currentSpeed = newSpeed;
          try { localStorage.setItem(SPEED_KEY, String(newSpeed)); } catch (e) {}
          for (var n = 0; n < speedBtns.length; n++) {
            speedBtns[n].classList.toggle('active', parseFloat(speedBtns[n].getAttribute('data-speed')) === newSpeed);
          }
          if (state === 'playing' || state === 'paused') start();
        });
      })(speedBtns[m]);
    }

    window.addEventListener('beforeunload', function () {
      if (state !== 'idle') synth.cancel();
    });

    console.log('[audio-reader] ready');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
