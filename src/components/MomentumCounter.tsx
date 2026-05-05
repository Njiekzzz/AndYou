import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../context/AppContext'

export function MomentumCounter() {
  const { items } = useApp()
  const [showList, setShowList] = useState(false)

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const doneThisMonth = items.filter(
    item => item.status === 'done' && new Date(item.created_at) >= monthStart
  )

  if (doneThisMonth.length === 0) return null

  return (
    <>
      <button
        onClick={() => setShowList(true)}
        style={{
          position: 'fixed',
          bottom: 76,
          right: 16,
          zIndex: 30,
          background: 'var(--tape-bg)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          padding: '5px 11px',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          color: 'var(--tape-text)',
          fontSize: 11,
          letterSpacing: '0.05em',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        }}
      >
        <span style={{ fontSize: 13 }}>✓</span>
        <span>{doneThisMonth.length} done this month</span>
      </button>

      <AnimatePresence>
        {showList && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 70 }}
              onClick={() => setShowList(false)}
            />
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 36 }}
              style={{
                position: 'fixed',
                bottom: 76,
                right: 16,
                left: 16,
                zIndex: 71,
                background: 'var(--sheet-bg)',
                borderRadius: 12,
                padding: '16px',
                maxHeight: '60vh',
                overflowY: 'auto',
              }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
                  done this month
                </h3>
                <button onClick={() => setShowList(false)} style={{ color: 'var(--text-muted)', fontSize: 20 }}>×</button>
              </div>
              {doneThisMonth.map(item => (
                <div
                  key={item.id}
                  style={{
                    padding: '8px 0',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span style={{ color: '#4a8a4a', fontSize: 13 }}>✓</span>
                  <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{item.title}</span>
                </div>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
