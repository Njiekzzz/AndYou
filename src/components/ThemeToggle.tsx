import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../context/AppContext'

const STARS = Array.from({ length: 38 }, (_, i) => ({
  id: i,
  x: (i * 37 + 13) % 100,
  y: (i * 53 + 7) % 100,
  r: i % 3 === 0 ? 1.4 : i % 3 === 1 ? 0.9 : 0.6,
  opacity: 0.3 + (i % 5) * 0.1,
}))

export function ThemeToggle() {
  const { theme, toggleTheme } = useApp()
  const isDark = theme === 'dark'

  return (
    <>
      <AnimatePresence>
        {isDark && (
          <motion.div
            key="starfield"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 0,
              pointerEvents: 'none',
            }}
          >
            <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
              {STARS.map(s => (
                <circle
                  key={s.id}
                  cx={`${s.x}%`}
                  cy={`${s.y}%`}
                  r={s.r}
                  fill="white"
                  opacity={s.opacity}
                />
              ))}
            </svg>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={toggleTheme}
        className="w-8 h-8 flex items-center justify-center rounded-full hover:opacity-70"
        title={isDark ? 'Light mode' : 'Dark mode'}
        style={{ position: 'relative' }}
      >
        <AnimatePresence mode="wait">
          {isDark ? (
            <motion.svg
              key="sun"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <circle cx="8" cy="8" r="4" stroke="var(--text-secondary)" strokeWidth="1.5" />
              <path
                d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.22 3.22l1.06 1.06M11.72 11.72l1.06 1.06M3.22 12.78l1.06-1.06M11.72 4.28l1.06-1.06"
                stroke="var(--text-secondary)"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </motion.svg>
          ) : (
            <motion.svg
              key="moon"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              initial={{ rotate: 90, opacity: 0, scale: 0.5 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: -90, opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <path
                d="M13.5 9.5A6 6 0 0 1 6.5 2.5a6 6 0 1 0 7 7z"
                stroke="var(--text-secondary)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </motion.svg>
          )}
        </AnimatePresence>
      </button>
    </>
  )
}
