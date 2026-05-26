/* ============================================================
   GAMEDOOR·41 — Audio reader for magazine posts
   Widget HTML is inlined in each article (always visible).
   This script attaches behavior to the existing buttons.
   Externalisé 2026-05-26 (avant : copié dans chaque article).
   Inclut un fallback Android : si aucune voix française n'est
   disponible (cas Android Chrome sans TTS), le widget est caché
   proprement plutôt que d'afficher un bouton qui ne marche pas.
   ============================================================ */
console.log('[audio-reader] file loaded ✓');

(function () {
  'use strict';

  // ===== Article playlist for "next" button =====
  var PLAYLIST = [
    '/post/canicule-caen-escape-game-climatise/',
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

    var synth = window.speechSynthesis;

    // ===== Wait for voices to load (Android Chrome loads them async) =====
    function hasFrenchVoice() {
      var vs = synth.getVoices();
      for (var i = 0; i < vs.length; i++) {
        if (vs[i].lang && vs[i].lang.toLowerCase().indexOf('fr') === 0) return true;
      }
      return false;
    }

    function setup() {
      // No French voice available — hide widget gracefully (typical on Android sans TTS engine)
      if (!hasFrenchVoice()) {
        widget.style.display = 'none';
        console.log('[audio-reader] No French voice available — widget hidden (likely Android without TTS engine)');
        return;
      }
      attachBehavior();
    }

    // Try setup with voices, or wait for voiceschanged
    if (synth.getVoices().length > 0) {
      setup();
    } else {
      var setupDone = false;
      var onVoicesChanged = function () {
        if (setupDone) return;
        setupDone = true;
        synth.removeEventListener('voiceschanged', onVoicesChanged);
        setup();
      };
      synth.addEventListener('voiceschanged', onVoicesChanged);
      // Fallback : si voiceschanged ne se déclenche jamais (Safari, certains Android)
      setTimeout(function () {
        if (setupDone) return;
        setupDone = true;
        setup();
      }, 2000);
    }

    function attachBehavior() {
      var body = document.querySelector('.post-body');
      if (!body) { return; }

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

      function start() {
        if (synth.speaking || synth.pending) {
          synth.cancel();
        }
        setTimeout(function () {
          utterance = new SpeechSynthesisUtterance(fullText);
          utterance.lang = 'fr-FR';
          utterance.rate = currentSpeed;

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
            if (code === 'canceled' || code === 'interrupted') return;
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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
