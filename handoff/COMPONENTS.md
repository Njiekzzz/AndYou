# &You — Component Recipes

> Drop-in JSX + Tailwind. All classes assume tokens from `tokens.css` are loaded.

---

## §1 Button

```jsx
// Primary (amber gold) — used for main CTAs
<button className="bg-amber hover:bg-amber-deep active:bg-amber-deep text-ink font-medium px-6 py-3 rounded-pill text-sm transition-colors">
  Add to wall
</button>

// Secondary (sand)
<button className="bg-sand hover:bg-sand-deep text-ink font-medium px-6 py-3 rounded-pill text-sm">
  Skip
</button>

// Ghost
<button className="text-ink-muted hover:text-ink px-4 py-2 text-sm">
  Cancel
</button>

// Icon button (round)
<button className="w-10 h-10 rounded-pill bg-bg-up dark:bg-night-up border border-line grid place-items-center text-ink">
  <Icon />
</button>

// FAB
<button className="fixed right-5 bottom-24 w-14 h-14 rounded-pill bg-amber text-ink shadow-lg grid place-items-center hover:scale-105 active:scale-95 transition-transform">
  <Plus className="w-6 h-6" />
</button>
```

---

## §2 Status pill

```jsx
const pillStyles = {
  proposed: "bg-teal-soft text-teal-deep",
  committed: "bg-amber-soft text-amber-deep",
  done: "bg-amber/20 text-amber-deep",
};

<span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-[10px] font-medium ${pillStyles[status]}`}>
  <span className="w-1.5 h-1.5 rounded-full bg-current" />
  {status}
</span>
```

---

## §3 Polaroid

```jsx
import { motion } from 'framer-motion';

export function Polaroid({ photo, title, date, undeveloped, rotation = 0 }) {
  return (
    <motion.div
      whileTap={{ rotateY: 4, scale: 0.98 }}
      style={{ rotate: rotation, transformStyle: 'preserve-3d' }}
      className="bg-paper p-2.5 pb-8 rounded-sm shadow-polaroid dark:shadow-polaroid-dark"
    >
      <div className="aspect-square overflow-hidden relative">
        {undeveloped ? (
          <div className="w-full h-full bg-gradient-to-br from-ochre via-terra to-terra-deep grid place-items-center">
            <span className="text-paper/60 font-mono text-[9px] tracking-[0.18em] uppercase">&amp;you</span>
          </div>
        ) : (
          <>
            <img src={photo} alt={title} className="w-full h-full object-cover" />
            {/* film-edge inner shadow */}
            <div className="absolute inset-0 shadow-[inset_0_8px_16px_-8px_rgba(0,0,0,0.4)] pointer-events-none" />
          </>
        )}
        {/* paper grain overlay */}
        <div className="absolute inset-0 opacity-[0.06] mix-blend-multiply pointer-events-none"
             style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")` }}
        />
      </div>
      <div className="mt-2 font-mono text-[10px] text-ink-muted text-center tracking-wider">
        {date}
      </div>
    </motion.div>
  );
}
```

---

## §4 Wall (3D perspective)

```jsx
// Wall.tsx — wrap your existing polaroid layout
<div
  className="relative w-full h-full overflow-hidden"
  style={{ perspective: '1200px', perspectiveOrigin: '50% 40%' }}
>
  {items.map((item, i) => {
    const distFromCenter = Math.abs(i - focusedIndex);
    const tiltY = (i < focusedIndex ? 8 : -8) * Math.min(distFromCenter, 2);
    const z = i === focusedIndex ? 40 : -distFromCenter * 20;

    return (
      <motion.div
        key={item.id}
        animate={{ rotateY: tiltY, z, scale: i === focusedIndex ? 1 : 0.92 }}
        transition={{ type: 'spring', stiffness: 180, damping: 22 }}
        style={{ transformStyle: 'preserve-3d', position: 'absolute', left: item.x, top: item.y }}
      >
        <Polaroid {...item} />
      </motion.div>
    );
  })}
</div>
```

---

## §5 Sheet (bottom-sheet)

```jsx
import { motion, AnimatePresence } from 'framer-motion';

export function Sheet({ open, onClose, children }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 bg-bg-up dark:bg-night-up rounded-t-3xl z-50 max-h-[88vh] overflow-y-auto"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 280, damping: 30, mass: 0.8 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => info.offset.y > 100 && onClose()}
          >
            {/* drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-9 h-1 rounded-full bg-line" />
            </div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

---

## §6 Top bar (glassy)

```jsx
<header className="sticky top-0 z-30 backdrop-blur-md bg-bg/70 dark:bg-night/70 border-b border-line">
  <div className="flex items-center justify-between px-4 py-3">
    <button className="flex -space-x-2">
      <Avatar user={me} />
      <Avatar user={partner} />
    </button>
    <div className="font-display italic text-lg">{wallName}</div>
    <div className="flex gap-1">
      <IconButton icon={Sun} onClick={toggleTheme} />
      <IconButton icon={Settings} onClick={openSettings} />
    </div>
  </div>
</header>
```

---

## §7 Bottom nav

```jsx
<nav className="fixed bottom-0 inset-x-0 z-30 bg-bg-up/90 dark:bg-night-up/90 backdrop-blur-md border-t border-line pb-safe">
  <div className="flex items-center justify-between px-4 py-2">
    <div className="flex bg-bg-down dark:bg-night-down rounded-pill p-1">
      <NavTab active={view==='wall'} onClick={() => setView('wall')}>Wall</NavTab>
      <NavTab active={view==='list'} onClick={() => setView('list')}>List</NavTab>
    </div>
    <div className="flex gap-2">
      <IconButton icon={Shuffle} onClick={spin} />
      <button className="w-12 h-12 rounded-pill bg-amber text-ink grid place-items-center">
        <Plus className="w-5 h-5" />
      </button>
    </div>
  </div>
</nav>
```

`NavTab` active state has `bg-amber text-ink` and a tiny `::before` 2px amber underline.

---

## §8 Empty / hero copy

Use Fraunces in two weights — italic for the "you" emphasis:

```jsx
<h1 className="font-display text-3xl leading-[1.05]">
  A list is just a list.<br/>Until <em className="text-amber">you</em> live it.
</h1>
```
