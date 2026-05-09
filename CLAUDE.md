# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # start dev server (Vite, localhost:5173)
npm run build      # tsc + vite build (always run before declaring something works)
npx tsc --noEmit   # type-check only, no output — use this to verify changes before committing
```

There are no tests. There is no linter config. Type-checking with `npx tsc --noEmit` is the primary correctness gate before every commit.

## Environment variables

Required in `.env.local` (never committed):
```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_CLOUDINARY_CLOUD_NAME
VITE_CLOUDINARY_UPLOAD_PRESET
```

## Architecture

React 19 + TypeScript SPA, no router. Vite build. Deployed to Vercel. Tailwind v4 (CSS-first config in `src/index.css` — no `tailwind.config.js`).

### State and data flow

All app state lives in a single React context: `src/context/AppContext.tsx`. There is no Redux, Zustand, or other state library. Every component reads from `useApp()`.

**AppContext is the entire backend.** It holds:
- All Firestore `onSnapshot` real-time listeners (items, regions, reactions, users, strokes, stickers, comments)
- All write operations (addItem, updateItem, deleteItem, toggleHeart, addComment, uploadImage, uploadAudio, etc.)
- Auth state via Firebase Auth `onAuthStateChanged`
- localStorage persistence bridged with Firestore (items and regions are cached locally for fast startup)

The real-time listeners are set up in a single `useEffect` keyed on `user?.id`. The dependency is intentionally `user?.id` (not the full `user` object) to prevent re-subscribing on avatar colour changes.

**First-load notification suppression:** Each snapshot listener uses a local `let xFirstLoad = true` flag (not state) that is flipped to `false` after the first snapshot fires. This prevents every existing document from triggering a push notification on app open.

### localStorage vs Firestore

| Data | Where |
|---|---|
| User identity, wallId, wall code | localStorage only |
| Items, regions | localStorage (cache) + Firestore (source of truth) |
| Polaroid style, theme (light/dark), notifications toggle | localStorage only — intentionally per-device, not shared |
| Everything else (reactions, comments, strokes, stickers, users) | Firestore only |

### Firestore data model

All wall data lives under `walls/{wallId}/`:
- `users/` — one doc per user (`User` type); `google_uid` field enables rejoining with the same identity
- `items/` — `BucketItem`; ordered by `position`
- `regions/` — `Region`; ordered by `order`
- `reactions/` — `Reaction`; grouped client-side by `item_id`
- `comments/` — `Comment`; grouped client-side by `item_id`
- `strokes/`, `stickers/` — drawing layer

Top-level: `user_profiles/{google_uid}` maps a Google account to a `{wallId, userId}` for wall restoration on sign-in.

### Identity / multi-device

Users get a UUID (`userId`) that is permanent. Google-signed-in users have `google_uid` stamped on their Firestore user doc. On `leaveWall`, Google users keep their Firestore doc (only `user_profiles` is deleted) so the same `userId` is reused on rejoin. Non-Google users get their doc deleted on leave.

### Media uploads

Images: compressed client-side (`compressImage`, max 1800px, 0.82 quality JPEG) → Cloudinary `/image/upload`.  
Audio (voice notes): raw Blob → Cloudinary `/video/upload` (Cloudinary uses the video endpoint for audio).  
Uploads always happen **after** `handleClose()` and update the item via `updateItem` when the URL resolves. Blob URLs are used locally until the real URL arrives; blob URLs are stripped before writing to Firestore.

### Screen flow

`App.tsx` → `AppInner` shows one of three screens via `AnimatePresence mode="wait"`:
1. `SplashScreen` — shown for at least 1200ms and until Firebase data is ready
2. `OnboardingScreen` — when no user or no wall
3. `MainApp` — the main experience

`MainApp` renders `TopBar`, `TimelineCanvas` or `ListView`, `BottomNav`, and overlays (`ExpandedCard`, `AddItemSheet`, `SettingsSheet`).

### Key component responsibilities

- **`TimelineCanvas`** — the primary view; renders polaroid cards on a vertical spine with region labels and countdown timers; reads `polaroidStyle` from context to switch between three visual modes (styled/border/plain); the `spinTarget` prop highlights a random item for the "spin" feature
- **`ExpandedCard`** — full detail view for a memory; handles ratings, voice note playback, sealed note reveal (envelope animation, module-level `revealedNotes` Set for one-shot per session), comments (text + voice), develop-photo upload, accept/decline proposals
- **`AddItemSheet`** — create and edit memories; MediaRecorder for voice note description; sealed note field (only shown to the item's creator in edit mode)
- **`PolaroidCard`** — thumbnail card used in `TimelineCanvas`; does not read from context directly, receives all props
- **`StatsSheet`** — read-only stats derived entirely from context data; opened by tapping the dual-avatar in `TopBar` when a partner is present; solo avatar opens `ProfileSheet` instead
- **`SettingsSheet`** — wall name, wall code, polaroid style, notifications toggle, region management (name, unlock date, timer toggle)
- **`ProfileSheet`** — user identity, colour picker, wall switching, Google sign-in, leave/kick partner

### Styling conventions

All styling is inline `style={{}}` objects. Tailwind utility classes are used sparingly for layout (`flex`, `gap-*`, `mb-*`, `items-center`). Design tokens are CSS variables defined in `src/index.css` under `:root` and `.dark`. Use `var(--color-teal)` for primary accent, `var(--amber)` / `var(--color-amber)` for secondary warm accent. Dark mode is toggled by adding the `dark` class to `<html>`.
