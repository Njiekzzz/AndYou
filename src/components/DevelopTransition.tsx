import { useState, useEffect, useRef } from 'react'
import { motion, useAnimationControls } from 'framer-motion'

interface DevelopTransitionProps {
  realSrc: string | null
  plannedSrc: string | null
  alt: string
  isFlipped: boolean
  onFlip: () => void
  isDone: boolean
}

export function DevelopTransition({ realSrc, plannedSrc, alt, isFlipped, onFlip, isDone }: DevelopTransitionProps) {
  const imgControls = useAnimationControls()
  const grainControls = useAnimationControls()
  const wrapControls = useAnimationControls()
  const [developing, setDeveloping] = useState(false)
  const [dateLabel, setDateLabel] = useState('')
  const prevRealSrc = useRef<string | null>(realSrc)
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (realSrc && !prevRealSrc.current && !hasAnimated.current) {
      hasAnimated.current = true
      setDeveloping(true)
      runDevelop()
    }
    prevRealSrc.current = realSrc
  }, [realSrc])

  const runDevelop = async () => {
    // Reset starting states
    imgControls.set({ opacity: 0 })
    grainControls.set({ opacity: 0 })

    // 0→0.9s: crossfade real photo in; grain flash at 0.4s in parallel
    imgControls.start({ opacity: 1, transition: { duration: 0.9, ease: 'easeIn' } })
    setTimeout(() => {
      grainControls.start({
        opacity: [0, 0.55, 0],
        transition: { duration: 0.35, ease: 'easeInOut' },
      })
    }, 400)

    await new Promise(r => setTimeout(r, 900))

    // 0.9→1.4s: card settle
    await wrapControls.start({
      scale: [0.98, 1.02, 1],
      transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
    })

    // 1.2→1.6s: date stamp appears
    const d = new Date()
    const mon = d.toLocaleString('en', { month: 'short' }).toLowerCase()
    const yr = String(d.getFullYear()).slice(2)
    setDateLabel(`${mon} · '${yr}`)

    setDeveloping(false)
  }

  const displaySrc = isFlipped && realSrc ? realSrc : plannedSrc

  return (
    <motion.div animate={wrapControls} style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Planned image / gradient base */}
      {displaySrc && !developing ? (
        <img
          src={displaySrc}
          alt={alt}
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
        />
      ) : !realSrc && !plannedSrc ? (
        <div style={{
          width: '100%', height: '100%',
          background: 'linear-gradient(135deg, #c69a4a 0%, #c8745a 55%, #a6602f 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {developing ? (
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, letterSpacing: '0.14em', fontFamily: 'var(--font-mono)' }}>
              developing…
            </span>
          ) : (
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" opacity={0.3}>
              <rect x="3" y="5" width="18" height="14" rx="2" stroke="white" strokeWidth="1.5"/>
              <circle cx="8.5" cy="10.5" r="1.5" stroke="white" strokeWidth="1.5"/>
              <path d="M21 15l-5-5-4 4-2-2-4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
      ) : developing && plannedSrc ? (
        <img src={plannedSrc} alt={alt} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
      ) : null}

      {/* Real photo fading in during develop sequence */}
      {developing && realSrc && (
        <motion.img
          animate={imgControls}
          src={realSrc}
          alt={alt}
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'contain',
            opacity: 0,
          }}
        />
      )}

      {/* Grain flash overlay */}
      <motion.div
        animate={grainControls}
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'rgba(255,255,255,0.18)',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.75'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E")`,
          opacity: 0,
        }}
      />

      {/* Flip hint */}
      {realSrc && !developing && (
        <div
          onClick={onFlip}
          style={{
            position: 'absolute', bottom: 8, left: 10, cursor: 'pointer',
            fontSize: 9, color: 'rgba(255,255,255,0.75)', letterSpacing: '0.07em',
          }}
        >
          {isFlipped ? '← the plan · tap to flip' : 'the memory → tap to flip'}
        </div>
      )}

      {/* Date stamp after develop */}
      {dateLabel && !developing && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{
            position: 'absolute', bottom: 8, right: 10,
            fontFamily: 'var(--font-mono)', fontSize: 9,
            color: 'rgba(255,255,255,0.65)', letterSpacing: '0.1em',
          }}
        >
          {dateLabel}
        </motion.div>
      )}

      {/* Done stamp */}
      {isDone && !developing && (
        <div
          className="stamp-animate"
          style={{
            position: 'absolute', top: 10, right: 10,
            width: 54, height: 54, borderRadius: '50%',
            border: '2.5px solid rgba(74,138,74,0.9)',
            boxShadow: 'inset 0 0 0 1.5px rgba(74,138,74,0.35)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,255,255,0.88)',
            transform: 'rotate(-12deg)', zIndex: 5,
          }}
        >
          <span style={{ fontSize: 6, letterSpacing: '0.18em', color: '#4a8a4a', fontWeight: 700, textTransform: 'uppercase' }}>DONE</span>
          <span style={{ fontSize: 16, color: '#4a8a4a', lineHeight: 1.2 }}>✓</span>
        </div>
      )}
    </motion.div>
  )
}
