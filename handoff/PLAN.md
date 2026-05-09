# &You — Step-by-Step Implementation Plan

> Do **one step at a time**. After each step, run the app, verify the checklist, and only then move on. Each step assumes the previous ones are working.

---

## Step 1 — Color system & typography (foundation)

**Files to change:**
- `src/index.css` — replace contents with `handoff/tokens.css`
- `index.html` — add Google Fonts preconnect (already in tokens.css `@import`, fine to leave)

**What to do:**
1. Copy `handoff/tokens.css` into `src/index.css`. Keep your existing `@import "tailwindcss"` line above it.
2. If your app has a `dark` class toggle on `<html>`, leave the toggle code alone — the CSS just adds variables for both modes.
3. Restart Vite.

**Verify:**
- App background is now warm cream `#f5ecd9` (was whatever).
- Headings render in Fraunces (serif). Body in Inter.
- Toggling dark mode flips the bg to deep night-teal `#0e1f24` smoothly (0.6s).
- No console errors about missing tokens.

---

## Step 2 — Buttons, pills, chips

**Files to change:**
- `src/components/ui/Button.tsx` (or wherever your buttons live)
- `src/components/ui/Pill.tsx` / `Chip.tsx`

**What to do:**
Copy the recipes in `handoff/COMPONENTS.md §1 Button` and `§2 Pill/Chip`. Replace your current button styles with these classes:
- Primary: `bg-amber hover:bg-amber-deep text-ink rounded-pill px-6 py-3 font-medium`
- Secondary: `bg-sand hover:bg-sand-deep text-ink rounded-pill px-6 py-3`
- Ghost: `text-ink-muted hover:text-ink`

**Verify:**
- The `+` FAB and primary CTAs are now amber gold (was teal).
- Status pills (proposed/committed/done) match the colors in `style-reference.html`.

---

## Step 3 — Polaroid component (the heart of the app)

**Files to change:**
- `src/components/Polaroid.tsx`

**What to do:**
Replace your polaroid component with the recipe in `COMPONENTS.md §3 Polaroid`. Key changes:
- White frame with subtle paper texture (CSS `background-image` noise)
- Soft drop shadow (`shadow-polaroid` token)
- Mono date stamp on the bottom border (`apr · '26`)
- Optional 3D tilt on tap via Framer Motion `whileTap={{ rotateY: 4, scale: 0.98 }}`
- Undeveloped state shows the gradient with a tiny `&you` watermark
- Developed state shows the photo with a subtle inner shadow at top (film-edge feel)

**Verify:**
- All polaroids on the wall now cast a soft shadow and have the date stamp.
- Tapping one tilts it slightly.
- Undeveloped polaroids show the warm gradient placeholder.

---

## Step 4 — Wall view (3D perspective)

**Files to change:**
- `src/screens/Wall.tsx` (or your canvas component)

**What to do:**
Add CSS perspective to the wall container: `perspective: 1200px; perspective-origin: 50% 40%`. On each polaroid, when it's the "active" / focused one, give it `transform: translateZ(40px)`. Off-axis ones get small `rotateY` based on their distance from center (see `COMPONENTS.md §4 Wall`).

Keep the pinch-zoom and pan logic — just wrap the rendered polaroids in the perspective container.

**Verify:**
- The wall now has visible depth — the focused polaroid pops forward.
- Panning still works smoothly.
- Pinch-zoom still works.

---

## Step 5 — Sheets (Profile, Settings, Add, Expanded card)

**Files to change:**
- `src/components/Sheet.tsx` and each sheet's content component

**What to do:**
Update sheet styles per `COMPONENTS.md §5 Sheet`. Use the Framer Motion springs in `ANIMATIONS.md §1`. Drag handle is a 36×4px pill in `--color-line`. Sheet bg is `bg-bg-up` (light) / `bg-night-up` (dark).

**Verify:**
- All four sheets now slide up with a smooth spring (mass 0.8, stiffness 280).
- Drag handle is visible.
- Sheet has a backdrop scrim (`bg-ink/40 backdrop-blur-sm`).

---

## Step 6 — Develop transition (the showpiece)

**Files to change:**
- `src/components/DevelopTransition.tsx` (new)
- `src/screens/ExpandedCard.tsx` to use it

**What to do:**
When user uploads the real photo, run a 1.6s sequence (see `ANIMATIONS.md §3`):
1. The undeveloped gradient fades to the photo over 0.9s
2. A subtle film-grain overlay flashes
3. The polaroid does a tiny `scale(0.98 → 1)` settle
4. Confetti? No — keep it cinematic, not festive
5. Date stamp updates from "developing…" to the actual date

**Verify:**
- After uploading a photo, the polaroid visibly transitions instead of just swapping.

---

## Step 7 — Top bar + bottom nav

**Files to change:**
- `src/components/TopBar.tsx`
- `src/components/BottomNav.tsx`

**What to do:**
TopBar: avatar stack (left), wall name centered in Fraunces italic, gear/theme on right. Translucent backdrop with `backdrop-filter: blur(12px)` so wall photos peek through.

BottomNav: timeline / list segmented on the left, spin + FAB on the right. Active tab gets a tiny amber underline (2px pill).

**Verify:**
- Top bar shows wall name in italic Fraunces.
- Active nav tab has amber accent.
- Top bar is glassy (slight blur of content underneath when scrolled).

---

## Step 8 — Onboarding

**Files to change:**
- `src/screens/Welcome.tsx`
- `src/screens/CreateOrJoin.tsx`
- `src/screens/EnterName.tsx`
- `src/screens/WallCode.tsx`

**What to do:**
Match the onboarding screens in `style-reference.html`. Hero photo full-bleed at top, copy in Fraunces, two pill CTAs at bottom. Wall code displayed as a giant mono character row with copy button.

**Verify:**
- Welcome screen has a full-bleed hero photo with serif title overlay.
- Create / Join is a clear two-button choice.
- Wall code screen shows the 6-char code in big mono with tap-to-copy.

---

## Step 9 — Hearts, stickers, decorate mode

**Files to change:**
- `src/components/HeartButton.tsx`
- `src/components/StickerLayer.tsx`

**What to do:**
- Heart tap: spring scale 1 → 1.4 → 1, color flashes amber for 200ms then settles. Particle? Optional: emit 3–5 tiny amber dots that drift up and fade.
- Sticker drop: spring with overshoot, plus a subtle wobble (rotate ±2° for 400ms).
- Decorate mode: dim the wall photos to 70% opacity, raise stickers; show the sticker tray as a horizontal scroll along the bottom.

**Verify:**
- Heart tap feels responsive and joyful.
- Stickers land with a satisfying bounce.

---

## Step 10 — Theme toggle as a moment

**Files to change:**
- `src/components/ThemeToggle.tsx`

**What to do:**
The toggle isn't just a class swap — it's a 0.6s ease transition on `background` and `color` (already in `tokens.css base`). Plus: when going dark, the polaroids' shadows deepen via `shadow-polaroid-dark`. Stars or a subtle starfield could fade in — keep it tasteful, see `ANIMATIONS.md §6`.

**Verify:**
- Toggling theme is a smooth fade, not a flash.
- Dark mode polaroids look properly contrasted, photos still readable.

---

## Step 11 — Icons & PWA polish

**Files to change:**
- `public/apple-touch-icon.png`, `favicon.svg`
- `index.html` (add `<link rel="apple-touch-icon">` and `<link rel="manifest">`)
- `public/manifest.json`

**What to do:**
Copy everything from `handoff/icons/` into `public/`. Add the link tags from `handoff/icons/index-head-snippet.html` to your `<head>`.

**Verify:**
- Adding to homescreen on iPhone uses the new icon.
- Browser tab favicon is the new mark.

---

## Done

If all 11 steps verify, the redesign is complete. Run the **acceptance check** at the bottom of `CLAUDE.md` as a final pass.
