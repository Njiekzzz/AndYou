# &You — Redesign Brief for Claude Code

You are redesigning the existing &You app to a new visual direction. The app is a bucketlist along a timeline, where each item is a polaroid that can be "developed" with a real photo once the activity is completed.

## What to do

1. **Read these files first**, in order:
   - `handoff/STYLE_GUIDE.md` — the full design system
   - `handoff/tokens.css` — drop these CSS variables into your global stylesheet
   - `handoff/tailwind.config.snippet.js` — merge into `tailwind.config.js`
   - `handoff/style-reference.html` — open in a browser. This is the **source of truth** for how every component should look. Match it.

2. **Apply the new palette globally.**
   - Main app background: cream `#f5ecd9` (was warm gold).
   - Ink: soft espresso `#2a2620` (never pure black).
   - **Teal `#3a7a78` is a brand accent only** — primary buttons, the FAB, status bar tint, completed badges, active nav. It should occupy ~3–7% of any screen, not flood.
   - Warm ochre/terra are kept for the logo and "in progress" status badges only.

3. **Type swap.**
   - Display headings → **Fraunces** (variable serif), weight 400, letter-spacing -0.01em.
   - Body / UI → **Inter**, weights 400/500/600.
   - Add Google Fonts import to `index.css`.

4. **Update components** to match the recipes in `STYLE_GUIDE.md` §3:
   - Buttons → pill-shaped, teal primary, sand secondary.
   - Cards → cream-elevated with `shadow-soft`.
   - Polaroids → white frames with `shadow-polaroid` and ±2–4° rotation.
   - Inputs → sunken cream wells, no visible borders, teal focus ring.

5. **Replace the logo files** in `/public`:
   - `apple-touch-icon.png` (180×180)
   - `apple-touch-icon.svg`
   - `favicon.svg`
   - Already updated and provided in `handoff/icons/`.

6. **Add a Profile page** if it doesn't exist. See `style-reference.html` "Profile" screen for layout. Must include: avatar, name, stats row (total items, completed, in progress), settings entry.

7. **Do not change app logic, routing, data models, or any backend code.** This is a visual redesign only.

## Constraints

- Stack is **Vite + React + Tailwind**. Use Tailwind classes, not inline styles, where possible.
- Keep all current features and screens working. If you remove a class, replace it with the new equivalent — don't delete UI.
- Match the reference HTML pixel-feel as closely as Tailwind allows. If something looks "off" compared to the reference, it probably is.
- Soft shadows only. Generous whitespace. No emoji unless already used in user content.

## Acceptance check

Before considering it done, verify:
- [ ] Cream `#f5ecd9` is visible behind every screen.
- [ ] No pure black (`#000`) or pure white anywhere except inside polaroid frames.
- [ ] Fraunces loads and is used for h1/h2/h3 and screen titles.
- [ ] Primary CTAs are teal pills; secondary CTAs are sand pills.
- [ ] Polaroids cast a soft shadow and have a slight rotation.
- [ ] Status bar / nav bar has a subtle teal tint OR is cream with a teal active indicator.
- [ ] New favicon and apple-touch-icon are linked in `index.html`.
- [ ] Profile page exists and shows stats.

When in doubt, open `handoff/style-reference.html` and copy the pattern.
