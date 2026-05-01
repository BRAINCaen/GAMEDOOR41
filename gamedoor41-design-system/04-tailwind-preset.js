/** @type {import('tailwindcss').Config} */
/* =====================================================================
   GAMEDOOR·41 — Tailwind Preset
   À importer dans tailwind.config.js de tout projet de la marque.
   Usage :
     const gd41 = require('./gamedoor41-tailwind-preset');
     module.exports = { presets: [gd41], content: [...] };
   ===================================================================== */

module.exports = {
  theme: {
    extend: {
      colors: {
        gd: {
          orange: '#E07020',
          'orange-dark': '#B85A18',
          'orange-light': '#F08F45',
          black: '#0C0800',
          cream: '#F0EBE2',
          'card-bg': '#1A1610',
          'card-bg-hover': '#221C14',
          border: '#2E2820',
          'border-light': '#E8E6E2',
          'grey-light': '#C8C2B8',
          'grey-medium': '#8A8078',
          'grey-dark': '#6A6460',
          escape: '#1B2A4E',
          quiz: '#9D4EDD',
          action: '#BE1B1B',
          events: '#FFD740',
        },
      },

      fontFamily: {
        display: ['"Barlow Condensed"', 'Oswald', 'system-ui', 'sans-serif'],
        body: ['"DM Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Menlo', 'monospace'],
      },

      fontSize: {
        // Tailles métier (priorité sur les tailles génériques)
        'gd-xs':      ['11px', { lineHeight: '1.4' }],
        'gd-sm':      ['13px', { lineHeight: '1.5' }],
        'gd-base':    ['15px', { lineHeight: '1.6' }],
        'gd-lg':      ['17px', { lineHeight: '1.6' }],
        'gd-h4':      ['14px', { lineHeight: '1.2', letterSpacing: '3px' }],
        'gd-h3':      ['22px', { lineHeight: '1.2', letterSpacing: '1px' }],
        'gd-h2':      ['36px', { lineHeight: '1.1', letterSpacing: '-1px' }],
        'gd-h1':      ['56px', { lineHeight: '1', letterSpacing: '-1px' }],
        'gd-hero':    ['88px', { lineHeight: '1', letterSpacing: '-2px' }],
        'gd-display': ['112px',{ lineHeight: '1', letterSpacing: '-3px' }],
      },

      letterSpacing: {
        'gd-tight':   '-2px',
        'gd-snug':    '-1px',
        'gd-wide':    '1px',
        'gd-wider':   '3px',
        'gd-widest':  '6px',
      },

      spacing: {
        'gd-1':  '4px',
        'gd-2':  '8px',
        'gd-3':  '12px',
        'gd-4':  '16px',
        'gd-5':  '20px',
        'gd-6':  '24px',
        'gd-8':  '32px',
        'gd-10': '40px',
        'gd-12': '48px',
        'gd-14': '56px',
        'gd-16': '64px',
        'gd-20': '80px',
        'gd-24': '96px',
        'gd-32': '128px',
      },

      borderRadius: {
        'gd-sm':   '4px',
        'gd-md':   '8px',
        'gd-lg':   '12px',
        'gd-xl':   '16px',
      },

      boxShadow: {
        'gd-sm':   '0 1px 3px rgba(0,0,0,0.06)',
        'gd-md':   '0 4px 16px rgba(0,0,0,0.10)',
        'gd-lg':   '0 10px 30px rgba(0,0,0,0.15)',
        'gd-xl':   '0 20px 60px rgba(0,0,0,0.20)',
        'gd-glow': '0 0 0 1px rgba(224,112,32,0.3), 0 8px 24px rgba(224,112,32,0.15)',
      },

      maxWidth: {
        'gd-container': '1100px',
      },

      transitionTimingFunction: {
        'gd-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
};
