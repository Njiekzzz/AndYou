# &You — App Design Brief

Use this document to understand the app before redesigning it. Do not change app logic, data models, or Firebase structure — visual and navigation changes only.

---

## What the app is

**&you** is a shared bucketlist for two people (a couple). Both users see the same "wall" in real-time. Items on the wall are displayed as polaroids — either undeveloped (gradient placeholder) or developed (real photo). Users can place and arrange polaroids on a scrollable/zoomable canvas, or view them as a list.

The app has one primary concept: **a wall you share with your person**, where dreams live as polaroids until you live them.

---

## Current screens

### 1. Onboarding
Shown when no wall is joined yet. Steps:
- Welcome → choose "create a wall" or "join with code"
- Enter your name + pick an avatar color
- Create → shows a 6-character wall code to share
- Join → enter the 6-character code from your partner

### 2. Timeline (main screen)
A zoomable, pannable canvas (like a cork board / paper). Polaroids are scattered across it at slight rotations. Users can pinch to zoom in/out. A background dot-grid scales with the zoom. Users can enter a "decorate" mode to place stickers (hearts, stars, sparkles, flowers) anywhere on the canvas.

### 3. List view
Same items but shown as a vertical list instead of a canvas. Items sorted by timeline/region.

### 4. Add item sheet (bottom sheet)
Slides up from the bottom. Fields:
- Photo (optional, tap to upload)
- Title (required)
- Description (optional)
- Location (optional)
- Theme: Adventure / Splurge / Spicy / Cozy / Experience / Other
- Vibe: physical or online
- Region (which timeline segment it belongs to)
- Add as: "add directly" (committed) or "propose" (proposed — partner must approve)

### 5. Expanded card (bottom sheet)
Tapping a polaroid opens this. Shows:
- Full polaroid with photo or undeveloped gradient
- Title, description, location, theme chip
- Status: proposed / committed / done
- "Dream it" rating — partner's hearts (prominent, colored) + your hearts (smaller, secondary)
- If done: option to develop (upload a real photo)
- Edit / delete controls

### 6. Profile sheet (bottom sheet, opened from top-left avatars)
- Your avatar + name
- Partner's avatar + name (or "waiting for your person…" if solo)
- Wall invite code (tap to copy)
- List of all your walls (switch between them)
- Create new wall / join new wall
- Google sign-in (to save walls across devices)
- Leave wall option

### 7. Settings sheet (bottom sheet, opened from gear icon top-right)
- Dark/light mode toggle
- Wall name field (shown centered in the top bar)
- Wall code display

---

## Navigation structure (current)

```
TopBar (fixed top)
  └─ Left: avatar stack → opens Profile sheet
  └─ Center: wall name (if set)
  └─ Right: gear icon → Settings sheet | moon/sun icon → theme toggle

BottomNav (fixed bottom)
  └─ Left: Timeline icon | List icon (tab switches)
  └─ Right: Spin (random item highlight) | FAB + button (opens Add sheet)

Sheets (slide up from bottom, overlay):
  - Add item sheet
  - Expanded card sheet
  - Profile sheet
  - Settings sheet
```

---

## Data model (do not change)

```typescript
BucketItem {
  id, wall_id, created_by
  title, description, location
  image_url         // blob/cloudinary URL — the polaroid photo
  real_image_url    // null until "developed"
  mood: 'physical' | 'online'
  theme: 'adventure' | 'splurge' | 'spicy' | 'cozy' | 'experience' | 'other' | null
  region_id         // which timeline segment
  status: 'proposed' | 'committed' | 'done'
  position: number  // order on timeline
  rotation_seed     // controls the tilt of the polaroid
}

User { id, wall_id, name, avatar_color }
Reaction { item_id, user_id, heart: boolean, rating: number | null }
Wall { id, code, name? }
Region { id, wall_id, name, order, unlock_date }
WallSticker { type, x, y, size, rotation, color }
```

---

## Current color tokens

```css
/* Light mode */
--bg:           #f5ecd9;   /* cream paper — main background */
--bg-card:      #fdf8eb;   /* cards / sheets */
--bg-sunken:    #ede2c6;   /* inputs / inset wells */
--text-primary: #2a2620;   /* headings, primary text */
--text-secondary: #5a5145; /* body text */
--text-muted:   #8a8170;   /* captions, placeholders */
--border:       #e1d5b8;   /* hairlines */

/* Brand accent — use sparingly (~3–7% of any screen) */
--teal:         #3a7a78;   /* primary buttons, FAB, active tab, completed badges */
--teal-deep:    #2d5f5d;   /* hover/pressed */
--teal-soft:    #d8e6e4;   /* badge backgrounds */

/* Warm secondary */
--sand:         #e8d4a8;   /* secondary buttons */
--ochre:        #c69a4a;   /* logo, "in progress" */
--terra:        #c8745a;   /* logo, ampersand color */
```

---

## Typography

- **Display / headings:** Fraunces (variable serif), weight 400, letter-spacing -0.01em
- **Body / UI:** Inter, weights 400 / 500 / 600
- **Mono (timestamps, codes):** JetBrains Mono

---

## Key design rules (preserve these)

- Polaroids are always **white frames** (`#ffffff`) — even in dark mode
- Polaroids cast a **soft paper shadow**, not a harsh drop shadow
- Polaroids **tilt slightly** (±2–4°) to feel hand-placed
- Background is a **dot grid** that scales with zoom on the canvas
- **No pure black** (#000) anywhere — use `#2a2620` (soft espresso)
- **Teal is a punctuation mark**, not a flood — buttons, FAB, active state only
- Warm ochre/terra are for the logo mark and status badges only
- Sheets slide up from the bottom with a drag handle

---

## Stack (for implementation handoff)

- **Vite + React 19 + TypeScript**
- **Tailwind CSS v4** (uses `@theme` block in CSS, no tailwind.config.js)
- **Framer Motion** for sheet animations and polaroid interactions
- **Firebase Firestore** for real-time sync
- **Cloudinary** for image uploads

When handing off the design to the developer, export as **HTML + CSS** or a screen-by-screen spec. Describe any navigation changes explicitly (e.g. "the profile sheet is now a full screen instead of a bottom sheet").
