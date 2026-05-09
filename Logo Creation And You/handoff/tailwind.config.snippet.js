/* ==========================================================================
   &You — Tailwind extension
   Merge into your tailwind.config.js theme.extend.
   ========================================================================== */

module.exports = {
  theme: {
    extend: {
      colors: {
        // Surfaces
        cream:        '#f5ecd9',
        'cream-up':   '#fdf8eb',
        'cream-down': '#ede2c6',
        paper:        '#ffffff',

        // Ink
        ink: {
          DEFAULT: '#2a2620',
          soft:    '#5a5145',
          muted:   '#8a8170',
        },
        line:      '#e1d5b8',
        'line-soft':'#ebe0c7',

        // Brand teal
        teal: {
          DEFAULT: '#3a7a78',
          deep:    '#2d5f5d',
          soft:    '#d8e6e4',
        },

        // Warm
        sand:       '#e8d4a8',
        'sand-deep':'#d4ba80',
        ochre:      '#c69a4a',
        terra:      '#c8745a',
        'terra-deep':'#a6602f',
      },
      fontFamily: {
        display: ['Fraunces', 'Playfair Display', 'Georgia', 'serif'],
        sans:    ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono:    ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        pill: '999px',
      },
      boxShadow: {
        polaroid: '0 18px 32px -14px rgba(42,38,32,0.28), 0 4px 8px rgba(42,38,32,0.08)',
        soft:     '0 4px 12px -2px rgba(42,38,32,0.08), 0 2px 4px rgba(42,38,32,0.04)',
      },
    },
  },
};

/* ==========================================================================
   In your index.css, add Google Fonts and base styles:
   ========================================================================== */

/* @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300..700&family=Inter:wght@400;500;600;700&display=swap');

   @tailwind base;
   @tailwind components;
   @tailwind utilities;

   @layer base {
     html { background: #f5ecd9; color: #2a2620; }
     body { font-family: 'Inter', sans-serif; }
     h1, h2, h3 { font-family: 'Fraunces', serif; font-weight: 400; letter-spacing: -0.01em; }
   }
*/
