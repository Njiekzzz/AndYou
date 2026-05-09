# &You — Style Guide v2

> Cream paper, teal accent, polaroids in the foreground. Editorial-travel feel — calm, analog, premium.

---

## 1. Palette

### Surfaces
| Token | Hex | Use |
|---|---|---|
| `--color-bg` | `#f5ecd9` | **Main app background.** Cream paper. Everything sits on this. |
| `--color-bg-elevated` | `#fdf8eb` | Cards, sheets, modals — slightly lighter than bg. |
| `--color-bg-sunken` | `#ede2c6` | Inset wells, search fields, segmented controls. |
| `--color-paper` | `#ffffff` | Polaroid frame only. |

### Ink
| Token | Hex | Use |
|---|---|---|
| `--color-ink` | `#2a2620` | Headings, primary text. Soft espresso, never pure black. |
| `--color-ink-soft` | `#5a5145` | Body text. |
| `--color-ink-muted` | `#8a8170` | Captions, metadata, placeholders. |
| `--color-line` | `#e1d5b8` | Hairline borders. |

### Teal (brand accent — used sparingly)
| Token | Hex | Use |
|---|---|---|
| `--color-teal` | `#3a7a78` | Primary buttons, FAB, status bar tint, completed badges, active tab. |
| `--color-teal-deep` | `#2d5f5d` | Hover / pressed states. |
| `--color-teal-soft` | `#d8e6e4` | Tinted chip backgrounds. |

### Warm (secondary)
| Token | Hex | Use |
|---|---|---|
| `--color-sand` | `#e8d4a8` | Secondary buttons (Book Now style), inactive segmented controls. |
| `--color-ochre` | `#c69a4a` | Logo circle 1, "in progress" status. |
| `--color-terra` | `#c8745a` | Logo circle 2, accent details. |

**Rule of thumb:** ~70% cream, ~20% ink/photo content, ~7% warm accents, ~3% teal. Teal is a punctuation mark, not a flood.

---

## 2. Typography

- **Display:** Fraunces (variable serif). Use weight 400, optical-size auto. Letter-spacing -0.01em on headings.
- **Body / UI:** Inter. Weights 400 (body), 500 (labels), 600 (buttons, emphasis).
- **Mono:** JetBrains Mono — only for timestamps, coordinates, "developing…" countdowns.

```css
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300..700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
```

### Scale
| Token | Size | Use |
|---|---|---|
| `text-4xl` Fraunces | 42px | Screen heroes ("Bali", "Profile") |
| `text-3xl` Fraunces | 32px | Section heads |
| `text-2xl` Fraunces | 24px | Card titles |
| `text-lg` Inter 600 | 17px | Item titles, button labels |
| `text-base` Inter 400 | 15px | Body |
| `text-sm` Inter 400 | 13px | Captions, metadata |
| `text-xs` Inter 500 uppercase | 11px, letter-spacing 0.12em | Labels, eyebrows |

---

## 3. Components (recipes)

### Button — primary (teal)
```jsx
<button className="bg-teal hover:bg-teal-deep text-cream font-medium px-6 py-3 rounded-pill text-sm transition-colors">
  Add to bucketlist
</button>
```

### Button — secondary (sand)
```jsx
<button className="bg-sand hover:bg-sand-deep text-ink font-medium px-6 py-3 rounded-pill text-sm">
  Skip
</button>
```

### Card (cream-elevated)
```jsx
<div className="bg-cream-up rounded-2xl p-5 shadow-soft">…</div>
```

### Polaroid
```jsx
<div className="bg-paper p-3 pb-10 rounded-sm shadow-polaroid -rotate-2">
  <div className="aspect-square bg-cream-down" />
  <p className="mt-3 font-mono text-xs text-ink-muted text-center">Bali · Apr '26</p>
</div>
```

### Polaroid — undeveloped (gradient)
```jsx
<div className="bg-paper p-3 pb-10 rounded-sm shadow-polaroid">
  <div className="aspect-square bg-gradient-to-br from-ochre via-terra to-terra-deep" />
  <p className="mt-3 font-mono text-xs text-ink-muted">developing…</p>
</div>
```

### Input
```jsx
<input className="w-full bg-cream-down border-0 rounded-xl px-4 py-3 text-ink placeholder:text-ink-muted focus:ring-2 focus:ring-teal/30" />
```

### Tab bar (segmented)
```jsx
<div className="inline-flex bg-cream-down rounded-pill p-1">
  <button className="px-5 py-2 rounded-pill bg-teal text-cream text-sm font-medium">Timeline</button>
  <button className="px-5 py-2 rounded-pill text-ink-muted text-sm">Map</button>
</div>
```

### Status pill
```jsx
<span className="inline-flex items-center gap-1.5 bg-teal-soft text-teal-deep px-3 py-1 rounded-pill text-xs font-medium">
  <span className="w-1.5 h-1.5 rounded-full bg-teal" /> Completed
</span>
```

---

## 4. Layout principles

- **Generous whitespace.** 24–32px outer padding on screens. Don't cram.
- **Photos breathe through cream.** Use `aspect-square` or `aspect-[4/5]` photo windows with cream around them — never let images bleed to screen edges except for hero/banner moments.
- **Soft corners everywhere.** Default `rounded-xl` (12px) for cards, `rounded-2xl` (18px) for sheets, `rounded-pill` for buttons.
- **Shadows are paper-soft.** Never use harsh `shadow-lg` from Tailwind defaults. Use the custom `shadow-polaroid` / `shadow-soft`.
- **Polaroids tilt.** ±2–4° rotation makes them feel placed by hand. Stack with offsets, not perfect rows.

---

## 5. Logo usage

- Mark + wordmark lockup: `<svg use="#mark"/>` at 28–40px height next to "&you" in Fraunces italic, ampersand in `--color-terra`.
- App icon: cream square, ochre/terra circles, terra-deep lens with cream italic ampersand. Already exported in `/public`.
- Status bar: when teal, use cream lockup. When cream, use ink wordmark with warm circle mark.

---

## 6. Motion

- Transitions: 200ms ease-out for hover, 320ms ease-in-out for sheets/modals.
- Polaroid develop: 1.6s ease — the gradient cross-fades to the photo, with a tiny `scale(0.98 → 1)` and the rotation settling by 1°.
- No bouncy springs. The brand is calm.
