import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AppProvider, useApp } from './context/AppContext'
import { OnboardingScreen } from './components/OnboardingScreen'
import { MainApp } from './components/MainApp'

function SplashScreen() {
  return (
    <motion.div
      key="splash"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        position: 'fixed', inset: 0,
        background: 'var(--bg)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}
      className="dot-grid"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        style={{ textAlign: 'center' }}
      >
        <div style={{
          fontFamily: 'var(--font-serif)',
          fontStyle: 'italic',
          fontSize: 56,
          color: 'var(--color-teal)',
          lineHeight: 1,
          marginBottom: 14,
          letterSpacing: '-0.01em',
        }}>
          &amp;you
        </div>
        <div style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 14,
          color: 'var(--text-muted)',
          letterSpacing: '0.03em',
          fontWeight: 400,
        }}>
          for the things you'll do together
        </div>
      </motion.div>
    </motion.div>
  )
}

function AppInner() {
  const { user, wall, isLoading } = useApp()
  const [minTimePassed, setMinTimePassed] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMinTimePassed(true), 1200)
    return () => clearTimeout(t)
  }, [])

  const dataReady = !isLoading && (!user || !!wall)
  const showSplash = !minTimePassed || !dataReady
  const showOnboarding = !showSplash && (!user || !wall)

  return (
    <AnimatePresence mode="wait">
      {showSplash ? (
        <SplashScreen key="splash" />
      ) : showOnboarding ? (
        <motion.div
          key="onboarding"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          style={{ position: 'fixed', inset: 0 }}
        >
          <OnboardingScreen />
        </motion.div>
      ) : (
        <motion.div
          key="main"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          style={{ position: 'fixed', inset: 0 }}
        >
          <MainApp />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  )
}
