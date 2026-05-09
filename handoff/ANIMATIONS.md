# &You — Animation Specs

> All values are Framer Motion `transition` configs unless noted.

---

## §1 Sheet open / close
```js
{ type: 'spring', stiffness: 280, damping: 30, mass: 0.8 }
```
- Open from `y: '100%'` → `y: 0`
- Backdrop fades 0 → 1 at the same time, no spring (just `duration: 0.3`)
- Drag-to-dismiss: if `info.offset.y > 100` on drag end, close.

## §2 Polaroid tap (3D tilt)
```js
whileTap={{ rotateY: 4, rotateX: -2, scale: 0.98 }}
transition={{ type: 'spring', stiffness: 400, damping: 25 }}
```
Container needs `transformStyle: 'preserve-3d'` and a parent with `perspective: 1200px`.

## §3 Develop transition (showpiece)
1.6s total, sequenced:
```js
// 0 → 0.9s : crossfade gradient to photo
opacity: [0, 1]   // on the <img>
// 0.4 → 0.7s : grain flash
filter: ['contrast(1) brightness(1)', 'contrast(1.2) brightness(1.1)', 'contrast(1) brightness(1)']
// 0.9 → 1.4s : settle scale + rotation
scale: [0.98, 1.02, 1]
rotate: [-3, -1.5, -2]
// 1.2 → 1.6s : date stamp swaps from "developing…" to actual date
```
Use a Framer `useAnimationControls()` hook to chain.

## §4 Heart burst
```js
// scale pop
animate={{ scale: [1, 1.4, 1] }}
transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}

// color flash
animate={{ color: ['var(--color-ink-muted)', 'var(--color-amber)', 'var(--color-amber-deep)'] }}
transition={{ duration: 0.6 }}
```
Optionally emit 3 amber particles using a stagger:
```js
// each particle
initial={{ y: 0, opacity: 1, scale: 0.6 }}
animate={{ y: -40, opacity: 0, scale: 1 }}
transition={{ duration: 0.7, delay: i * 0.05 }}
```

## §5 Sticker drop
```js
initial={{ y: -30, opacity: 0, rotate: 0 }}
animate={{ y: 0, opacity: 1, rotate: [0, 8, -4, 0] }}
transition={{ y: { type: 'spring', stiffness: 320, damping: 14 }, rotate: { duration: 0.6 } }}
```
Bouncy. Uses a wobble on rotation after impact.

## §6 Theme toggle
- Base CSS: `transition: background .6s ease, color .6s ease` on `html`
- Optional: dark mode fades in a starfield SVG at `opacity 0 → 0.6` over 0.8s
- Polaroids' shadows interpolate to `--shadow-polaroid-dark` automatically via CSS var swap

## §7 Wall focus (3D carousel)
When the user pans/swipes to a new polaroid:
```js
transition={{ type: 'spring', stiffness: 180, damping: 22 }}
```
- focused: `rotateY: 0, z: 40, scale: 1`
- ±1 from focus: `rotateY: ±8, z: -20, scale: 0.92`
- ±2 from focus: `rotateY: ±14, z: -40, scale: 0.84, opacity: 0.7`

## §8 Spin (random highlight)
1. Brief blur flash on the wall (`backdrop-blur` 0 → 6px → 0 over 0.6s)
2. Random polaroid scales `1 → 1.15 → 1` with a glow `box-shadow: 0 0 24px var(--color-amber)`
3. After 1.2s, opens its expanded card sheet
