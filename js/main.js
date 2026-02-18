/* GAMEDOOR•41 — Main JS */
document.addEventListener('DOMContentLoaded', () => {

  /* --- Scroll Header + dynamic --header-h --- */
  const header = document.querySelector('.site-header');
  if (header) {
    const setHeaderH = () => {
      document.documentElement.style.setProperty('--header-h', header.offsetHeight + 'px');
    };
    setHeaderH();
    window.addEventListener('resize', setHeaderH, { passive: true });
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 60);
      setHeaderH();
    }, { passive: true });
  }

  /* --- Mobile Nav Toggle --- */
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    const closeMenu = () => {
      links.classList.remove('open');
      document.body.classList.remove('menu-open');
      toggle.setAttribute('aria-expanded', 'false');
    };
    toggle.addEventListener('click', () => {
      const isOpen = links.classList.toggle('open');
      document.body.classList.toggle('menu-open', isOpen);
      toggle.setAttribute('aria-expanded', String(isOpen));
    });
    links.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', closeMenu);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    });
  }

  /* --- Scroll Animations --- */
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

  /* --- Video autoplay on card hover (desktop) --- */
  document.querySelectorAll('.exp-card video').forEach(video => {
    video.pause();
    const card = video.closest('.exp-card');
    if (card && window.innerWidth > 768) {
      card.addEventListener('mouseenter', () => video.play());
      card.addEventListener('mouseleave', () => { video.pause(); video.currentTime = 0; });
    } else {
      video.play();
    }
  });

  /* --- Hero video: load source only on desktop (3 MB) --- */
  const heroVideo = document.querySelector('video.hero-video');
  if (heroVideo) {
    if (window.innerWidth > 768) {
      const src = document.createElement('source');
      src.src = 'video/hero.mp4';
      src.type = 'video/mp4';
      heroVideo.appendChild(src);
      heroVideo.load();
      heroVideo.play().catch(() => {});
    }
    // Mobile: poster only, no video download
  }

  /* --- Mobile: poster + click-to-play for other videos --- */
  if (window.innerWidth <= 768) {
    document.querySelectorAll('video[autoplay]').forEach(video => {
      if (video.closest('.exp-card')) return;
      if (video.classList.contains('hero-video')) return;
      video.removeAttribute('autoplay');
      video.pause();
      video.currentTime = 0;
      const parent = video.parentElement;
      if (!parent) return;
      const playBtn = document.createElement('button');
      playBtn.setAttribute('aria-label', 'Lire la vidéo');
      playBtn.textContent = '\u25B6';
      playBtn.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.6);color:#fff;border:2px solid rgba(255,255,255,0.8);border-radius:50%;width:64px;height:64px;font-size:1.5rem;cursor:pointer;z-index:5;display:flex;align-items:center;justify-content:center;transition:opacity .3s;padding-left:4px;';
      if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';
      parent.appendChild(playBtn);
      playBtn.addEventListener('click', () => {
        video.play();
        playBtn.style.opacity = '0';
        setTimeout(() => playBtn.remove(), 300);
      });
    });
  }

  /* --- Smooth scroll for anchor links --- */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* --- Conversion Tracking (GA4-ready) ---
   * Tracks clicks on CTAs with data-track attributes
   * and key conversion actions (booking links, phone, email)
   * Events are sent to GA4 via gtag() if available,
   * otherwise logged to console for debugging.
   */
  function trackEvent(eventName, params) {
    if (typeof gtag === 'function') {
      gtag('event', eventName, params);
    }
  }

  // Track all [data-track] elements
  document.querySelectorAll('[data-track]').forEach(el => {
    el.addEventListener('click', () => {
      trackEvent('cta_click', {
        cta_name: el.getAttribute('data-track'),
        page_path: window.location.pathname
      });
    });
  });

  // Track booking link clicks
  document.querySelectorAll('a[href*="4escape.io/booking"]').forEach(el => {
    el.addEventListener('click', () => {
      trackEvent('begin_checkout', {
        source: el.getAttribute('data-track') || 'booking_link',
        page_path: window.location.pathname
      });
    });
  });

  // Track phone clicks
  document.querySelectorAll('a[href^="tel:"]').forEach(el => {
    el.addEventListener('click', () => {
      trackEvent('contact_phone', {
        page_path: window.location.pathname
      });
    });
  });

  // Track email clicks
  document.querySelectorAll('a[href^="mailto:"]').forEach(el => {
    el.addEventListener('click', () => {
      trackEvent('contact_email', {
        page_path: window.location.pathname
      });
    });
  });

});
