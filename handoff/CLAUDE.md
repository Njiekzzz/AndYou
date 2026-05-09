# &You — Redesign Handoff for Claude Code

You are redesigning the existing **&you** app — a shared bucketlist / memory-wall for couples — into a more cinematic, photo-led, emotionally resonant direction. Stack is **Vite + React 19 + TypeScript + Tailwind v4 + Framer Motion + Firebase + Cloudinary**.

## Read these in order

1. `handoff/DESIGN_BRIEF.md` — what the app is and does (preserved).
2. `handoff/PLAN.md` — **the step-by-step implementation plan. Follow it top to bottom.**
3. `handoff/STYLE_GUIDE.md` — the design system (palette, type, proportions).
4. `handoff/COMPONENTS.md` — copy-paste JSX recipes for every component.
5. `handoff/ANIMATIONS.md` — Framer Motion specs.
6. `handoff/style-reference.html` — open in a browser. **This is pixel-level ground truth.**

## How to work through this

- **Do one step at a time.** Each step in `PLAN.md` is small, scoped, and ends with a "verify" checklist. Apply, run the app, verify, then move to the next step.
- **Don't change app logic, data models, routes, or Firebase code.** Visual + interaction polish only.
- **When in doubt, copy from `style-reference.html`.** Match it pixel-for-pixel where Tailwind allows.
- **Photos are placeholders.** The reference uses Unsplash URLs to show the feel. Your app already pulls user photos from Cloudinary — leave that wiring alone.

## Big-picture creative direction

- **Hybrid theme:** cream by day, deep night-teal by dark. Both first-class. Theme toggle is a real animated moment, not just a class swap.
- **Photos are the UI.** The wall is a 3D perspective carousel — the active polaroid front-and-center, neighbors tilted back. List view stays as a fallback.
- **Editorial type.** Fraunces (variable serif) for display, Inter for UI, JetBrains Mono for timestamps and codes.
- **Golden amber `#E0A04A`** is the warm accent — primary CTAs, the "develop" moment, hearts. Teal `#3a7a78` is the cool brand frame — wall name, links, status pills.
- **Motion is calm by default, playful in key moments:** develop transition (1.6s film-reveal), heart burst (spring), sticker drop (bounce), sheet open (cinematic ease).
- **Polaroids are physical objects.** Subtle paper texture, soft drop shadow, ±3° rotation, optional 3D tilt on tap, mono date stamp on the white border.

## Acceptance check (run after the final step)

- [ ] App opens to a cream wall with photo-led polaroids, or a deep-teal night version if dark mode is on.
- [ ] Fraunces loads on headings; Inter on body; JetBrains Mono on timestamps.
- [ ] Primary CTAs are amber pills. Status pills use teal/ochre.
- [ ] Polaroids cast soft shadows, tilt slightly, show a date stamp.
- [ ] Bottom sheets open with a smooth spring + drag handle.
- [ ] Develop transition exists and feels filmic.
- [ ] Theme toggle visibly transitions (don't just snap).
- [ ] No `#000` pure black anywhere. No `#fff` pure white outside polaroid frames.
- [ ] App still works end-to-end (auth, sync, upload, react).

When you finish a step, paste a screenshot or describe what you see; I'll confirm before you move on.
