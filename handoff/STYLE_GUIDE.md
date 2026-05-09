# &You — Style Guide v2

Cream paper, teal punctuation, warm sunset logo. Editorial-analog feel — calm, premium, hand-placed.

---

## Palette (full)

### Surfaces
| Token (Tailwind v4) | Light | Dark | Use |
|---|---|---|---|
| `bg-cream` | `#f5ecd9` | `#1f1c17` | Main app background |
| `bg-cream-up` | `#fdf8eb` | `#2a261f` | Cards, sheets, modals |
| `bg-cream-down` | `#ede2c6` | `#181612` | Inputs, segmented controls |
| `bg-paper` | `#ffffff` | `#ffffff` | **Polaroid frames only** — never changes |

### Ink
| Token | Light | Dark |
|---|---|---|
| `text-ink` | `#2a2620` | `#f0e6d0` |
| `text-ink-soft` | `#5a5145` | `#c8bea8` |
| `text-ink-muted` | `#8a8170` | `#8a8170` |
| `border-line` | `#e1d5b8` | `#3a342a` |

### Brand
| Token | Hex | Use |
|---|---|---|
| `text-teal` / `bg-teal` | `#3a7a78` | Primary CTA, FAB, active tab, committed status |
| `bg-teal-deep` | `#2d5f5d` | Hover/pressed |
| `bg-teal-soft` | `#d8e6e4` | Tinted backgrounds (`#1f3a39` in dark) |
| `bg-sand` | `#e8d4a8` | Secondary buttons |
| `text-ochre` | `#c69a4a` | Logo circle 1, "proposed" status |
| `text-terra` | `#c8745a` | Logo circle 2, ampersand color, partner hearts |

### Theme colors (per BucketItem.theme)
- `theme-adventure` `#6b8e5a` (sage)
- `theme-splurge` `#c69a4a` (gold)
- `theme-spicy` `#c8745a` (terra)
- `theme-cozy` `#b08a9e` (rose)
- `theme-experience` `#3a7a78` (teal)
- `theme-other` `#8a8170` (muted)

### Status colors
- `status-proposed` `#c69a4a` — awaiting partner
- `status-committed` `#3a7a78` — both agreed, on the wall
- `status-done` `#6b8e5a` — lived, developed

---

## Typography

| Token | Font | Use |
|---|---|---|
| `font-display` | Fraunces | h1, h2, h3, screen titles, hero |
| `font-sans` | Inter | All body, UI, buttons |
| `font-mono` | JetBrains Mono | Wall codes, timestamps, captions on polaroids |

### Scale
- Hero: `text-4xl` (Fraunces 400, 42px, tracking -0.015em)
- Screen title: `text-3xl` (32px Fraunces)
- Section head: `text-xl` (20px Fraunces)
- Body: `text-base` (15px Inter)
- Caption: `text-sm` / `text-xs` (Inter or mono)
- Eyebrow: `text-[10px]` Inter 500 uppercase tracking 0.16em

---

## Component rules

- **Polaroids** — always white frame, `shadow-polaroid`, ±2–4° rotation. White doesn't change in dark mode.
- **Buttons** — pill-shaped (`rounded-pill`). Teal primary, sand secondary, ghost tertiary.
- **Cards** — `bg-cream-up`, `rounded-card` (18px), `shadow-soft`.
- **Inputs** — `bg-cream-down`, no visible border, teal focus ring.
- **Sheets** — `rounded-t-[24px]`, drag handle at top, `shadow-sheet`.
- **Hairlines** — `border-line`, never harsher than 1px.
- **Shadows** — only the four custom ones (`soft`, `polaroid`, `sheet`, `fab`). Never default Tailwind `shadow-lg`.

---

## Usage proportions per screen

- 70% cream surfaces
- 20% photos / polaroid content
- 7% warm accents (logo, status, theme chips)
- 3% teal (one CTA, FAB, active tab)

If teal is on more than ~5% of a screen, you've over-used it.

---

## What's NOT in the system

- No emoji (unless user-content)
- No drop shadows beyond the four custom ones
- No `#000` or `#fff` outside polaroid frames
- No bouncy springs except sticker placement
- No SVG illustrations — use polaroids and photography
- No new fonts beyond the three above
