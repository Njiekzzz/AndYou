import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../context/AppContext'
import { Clash, Dare } from '../types'

interface ClashPanelProps {
  open: boolean
  onClose: () => void
}

export function ClashPanel({ open, onClose }: ClashPanelProps) {
  const { user, partner, dares, clashes, updateClash, deleteClash, updateDare } = useApp()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [markingDone, setMarkingDone] = useState(false)
  const dragStartY = useRef(0)

  // Get the active clash for this wall
  const activeClash: Clash | undefined = clashes.find(c =>
    ['selecting', 'pending_acceptance', 'live'].includes(c.status)
  )

  const isUserA = activeClash ? activeClash.user_a_id === user?.id : false
  const isUserB = activeClash ? (activeClash.user_b_id === user?.id || (!activeClash.user_b_id && !isUserA)) : false

  // When user B first sees the panel (no user_b_id set yet), register them
  useEffect(() => {
    if (!activeClash || !user) return
    if (!activeClash.user_b_id && activeClash.user_a_id !== user.id) {
      updateClash(activeClash.id, { user_b_id: user.id })
    }
  }, [activeClash?.id, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // When both dares selected → move to pending_acceptance
  useEffect(() => {
    if (!activeClash) return
    if (activeClash.status === 'selecting' && activeClash.dare_a_id && activeClash.dare_b_id) {
      updateClash(activeClash.id, { status: 'pending_acceptance' })
    }
  }, [activeClash?.dare_a_id, activeClash?.dare_b_id, activeClash?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  // When both accepted → go live
  useEffect(() => {
    if (!activeClash) return
    if (activeClash.status === 'pending_acceptance' && activeClash.user_a_accepted && activeClash.user_b_accepted) {
      updateClash(activeClash.id, { status: 'live' })
    }
  }, [activeClash?.user_a_accepted, activeClash?.user_b_accepted, activeClash?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  const myDareId = activeClash ? (isUserA ? activeClash.dare_a_id : activeClash.dare_b_id) : null
  const theirDareId = activeClash ? (isUserA ? activeClash.dare_b_id : activeClash.dare_a_id) : null
  const myDare = myDareId ? dares.find(d => d.id === myDareId) : null
  const theirDare = theirDareId ? dares.find(d => d.id === theirDareId) : null

  const iAmAccepted = activeClash ? (isUserA ? activeClash.user_a_accepted : activeClash.user_b_accepted) : false

  // Pickable dares: user's own uncommitted dares not already in a clash
  const pickableDares = dares.filter(d =>
    d.assigned_to !== 'self' &&
    d.status === 'pending'
  )

  const handlePickDare = useCallback(async (dare: Dare) => {
    if (!activeClash) return
    setPickerOpen(false)
    const field = isUserA ? 'dare_a_id' : 'dare_b_id'
    await updateClash(activeClash.id, { [field]: dare.id })
  }, [activeClash, isUserA, updateClash])

  const handleImIn = useCallback(async () => {
    if (!activeClash) return
    const field = isUserA ? 'user_a_accepted' : 'user_b_accepted'
    await updateClash(activeClash.id, { [field]: true })
  }, [activeClash, isUserA, updateClash])

  const handleMarkDone = useCallback(async () => {
    if (!activeClash || !myDareId || markingDone) return
    setMarkingDone(true)
    try {
      await updateDare(myDareId, { status: 'done', completed_at: new Date().toISOString() })
      // Check if both are done
      const theirDareDoc = theirDareId ? dares.find(d => d.id === theirDareId) : null
      const theirDone = theirDareDoc?.status === 'done'
      if (theirDone) {
        await updateClash(activeClash.id, { status: 'completed' })
        onClose()
      }
    } finally {
      setMarkingDone(false)
    }
  }, [activeClash, myDareId, theirDareId, dares, markingDone, updateDare, updateClash, onClose])

  const handleCancel = useCallback(async () => {
    if (!activeClash) return
    await updateClash(activeClash.id, { status: 'cancelled' })
    onClose()
  }, [activeClash, updateClash, onClose])

  const handleClose = useCallback(() => {
    if (!activeClash) { onClose(); return }
    if (activeClash.status === 'selecting' && isUserA) {
      // Creator can dismiss — cancels the clash
      deleteClash(activeClash.id)
      onClose()
    }
    // Otherwise: cannot dismiss
  }, [activeClash, isUserA, deleteClash, onClose])

  // Drag to dismiss (only allowed in 'selecting' for the creator)
  const canDismiss = !activeClash || (activeClash.status === 'selecting' && isUserA)

  const onHandleTouchStart = useCallback((e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY
  }, [])
  const onHandleTouchEnd = useCallback((e: React.TouchEvent) => {
    const dy = e.changedTouches[0].clientY - dragStartY.current
    if (dy < -60 && canDismiss) handleClose()
  }, [canDismiss, handleClose])

  const partnerName = partner?.name ?? 'them'
  const isLive = activeClash?.status === 'live'

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop (partial — doesn't cover fully) */}
            <motion.div
              key="clash-backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{
                position: 'fixed', inset: 0, zIndex: 48,
                background: 'rgba(0,0,0,0.15)',
                pointerEvents: 'none',
              }}
            />

            {/* Panel slides from top */}
            <motion.div
              key="clash-panel"
              initial={{ y: '-100%' }} animate={{ y: 0 }} exit={{ y: '-100%' }}
              transition={{ type: 'tween', duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
              style={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 49,
                minHeight: 320,
                maxHeight: 'calc(100vh - 140px)',
                background: 'var(--cream, #f5f0e6)',
                borderBottom: '2px solid var(--amber)',
                boxShadow: '0 8px 32px rgba(50,35,10,0.18)',
                padding: '20px 16px 24px',
                overflowY: 'auto',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Drag handle */}
              <div
                onTouchStart={onHandleTouchStart}
                onTouchEnd={onHandleTouchEnd}
                style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, cursor: 'grab' }}
              >
                <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--spine-color)' }} />
              </div>

              {/* LIVE indicator */}
              {isLive && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 12 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', background: '#e03030',
                    animation: 'pulse-live 1.2s ease-in-out infinite',
                  }} />
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                    letterSpacing: '0.12em', color: '#e03030',
                  }}>LIVE</span>
                </div>
              )}

              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <h2 style={{
                  fontFamily: 'var(--font-serif)', fontStyle: 'italic',
                  fontSize: 20, color: 'var(--text-dark)', margin: '0 0 4px',
                }}>
                  challenge time
                </h2>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                  each throw in one dare
                </p>
              </div>

              {/* Two slots + VS divider */}
              <div style={{ display: 'flex', alignItems: 'stretch', gap: 8, marginBottom: 16 }}>
                {/* My slot */}
                <div style={{
                  flex: 1,
                  background: 'var(--cream-dark)',
                  border: '1px dashed var(--spine-color)',
                  borderRadius: 10,
                  minHeight: 120,
                  padding: 12,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                }}>
                  <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 8px' }}>you</p>
                  {myDare ? (
                    <div style={{ width: '100%' }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px', lineHeight: 1.3, textAlign: 'center' }}>
                        {myDare.title}
                      </p>
                      <div style={{
                        display: 'inline-block', fontSize: 9, fontWeight: 600, padding: '2px 6px',
                        borderRadius: 4, marginTop: 4,
                        background: myDare.assigned_to === 'trade' ? 'var(--color-teal)' : 'var(--amber)',
                        color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em',
                      }}>
                        {myDare.assigned_to === 'trade' ? 'trade' : 'challenge'}
                      </div>
                      {activeClash?.status === 'selecting' && (
                        <button
                          onClick={() => setPickerOpen(true)}
                          style={{
                            display: 'block', marginTop: 8, fontSize: 11,
                            color: 'var(--amber)', background: 'none', border: 'none',
                            cursor: 'pointer', textDecoration: 'underline',
                          }}
                        >
                          swap
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => setPickerOpen(true)}
                      style={{
                        fontSize: 13, color: 'var(--amber)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontFamily: 'var(--font-sans)',
                      }}
                    >
                      pick a dare →
                    </button>
                  )}
                </div>

                {/* VS divider */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 40, flexShrink: 0 }}>
                  <div style={{
                    width: 1,
                    height: isLive ? 0 : 30,
                    background: isLive ? 'transparent' : 'var(--spine-color)',
                    transition: 'all 0.3s',
                  }} />
                  <span style={{
                    fontFamily: 'var(--font-serif)', fontStyle: 'italic',
                    fontSize: 16,
                    color: (activeClash?.dare_a_id && activeClash?.dare_b_id) || isLive ? 'var(--amber)' : 'var(--text-muted)',
                    background: 'var(--cream)',
                    padding: '4px 0',
                    transition: 'color 0.3s',
                  }}>
                    vs
                  </span>
                  <div style={{
                    width: isLive ? 2 : 1,
                    height: isLive ? 0 : 30,
                    background: isLive ? 'var(--amber)' : 'var(--spine-color)',
                    transition: 'all 0.3s',
                  }} />
                </div>

                {/* Their slot */}
                <div style={{
                  flex: 1,
                  background: 'var(--cream-dark)',
                  border: '1px dashed var(--spine-color)',
                  borderRadius: 10,
                  minHeight: 120,
                  padding: 12,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                }}>
                  <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 8px' }}>{partnerName}</p>
                  {theirDare ? (
                    <div style={{ width: '100%' }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px', lineHeight: 1.3, textAlign: 'center' }}>
                        {theirDare.title}
                      </p>
                      <div style={{
                        display: 'inline-block', fontSize: 9, fontWeight: 600, padding: '2px 6px',
                        borderRadius: 4, marginTop: 4,
                        background: theirDare.assigned_to === 'trade' ? 'var(--color-teal)' : 'var(--amber)',
                        color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em',
                      }}>
                        {theirDare.assigned_to === 'trade' ? 'trade' : 'challenge'}
                      </div>
                    </div>
                  ) : (
                    <p style={{
                      fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic',
                      textAlign: 'center', margin: 0,
                      animation: 'opacity-pulse 1s ease-in-out infinite',
                    }}>
                      waiting for {partnerName}…
                    </p>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              {isLive ? (
                // Live state: mark my dare done
                <div>
                  <button
                    onClick={handleMarkDone}
                    disabled={markingDone || myDare?.status === 'done'}
                    style={{
                      width: '100%', height: 48,
                      background: myDare?.status === 'done' ? 'var(--border)' : 'var(--amber)',
                      color: '#fff', borderRadius: 24,
                      fontSize: 16, fontWeight: 600, fontFamily: 'var(--font-sans)',
                      border: 'none', cursor: myDare?.status === 'done' ? 'default' : 'pointer',
                      boxShadow: myDare?.status === 'done' ? 'none' : '0 4px 16px rgba(212,144,10,0.35)',
                      marginBottom: 8,
                    }}
                  >
                    {myDare?.status === 'done' ? '✓ your part done' : markingDone ? 'marking…' : 'mark my dare as done'}
                  </button>
                  {theirDare?.status === 'done' && myDare?.status !== 'done' && (
                    <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--amber)', fontStyle: 'italic', margin: '0 0 8px' }}>
                      {partnerName} finished — your turn!
                    </p>
                  )}
                </div>
              ) : activeClash?.status === 'pending_acceptance' || (activeClash?.dare_a_id && activeClash?.dare_b_id) ? (
                // Both selected: show "I'm in" button
                <button
                  onClick={iAmAccepted ? undefined : handleImIn}
                  disabled={iAmAccepted}
                  style={{
                    width: '100%', height: 48,
                    background: iAmAccepted ? 'var(--border)' : 'var(--amber)',
                    color: iAmAccepted ? 'var(--text-muted)' : '#fff',
                    borderRadius: 24,
                    fontSize: iAmAccepted ? 14 : 16,
                    fontWeight: 600, fontFamily: 'var(--font-sans)',
                    border: 'none',
                    cursor: iAmAccepted ? 'default' : 'pointer',
                    boxShadow: iAmAccepted ? 'none' : '0 4px 16px rgba(212,144,10,0.35)',
                    marginBottom: 8,
                    transition: 'all 0.2s',
                  }}
                >
                  {iAmAccepted ? `waiting for ${partnerName}…` : "i'm in"}
                </button>
              ) : null}

              {/* Cancel link */}
              <button
                onClick={handleCancel}
                style={{
                  display: 'block', margin: '0 auto',
                  fontSize: 12, color: 'var(--text-muted)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  paddingTop: 4,
                }}
              >
                cancel challenge
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Dare picker bottom sheet */}
      <AnimatePresence>
        {pickerOpen && (
          <>
            <motion.div
              key="picker-backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(42,38,32,0.4)', backdropFilter: 'blur(6px)', zIndex: 60 }}
              onClick={() => setPickerOpen(false)}
            />
            <motion.div
              key="picker-sheet"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 280, damping: 30, mass: 0.8 }}
              style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 61,
                background: 'var(--sheet-bg)', borderRadius: '24px 24px 0 0',
                maxHeight: '60vh', display: 'flex', flexDirection: 'column',
                paddingBottom: 'env(safe-area-inset-bottom)',
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4 }}>
                <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
              </div>
              <div style={{ padding: '8px 20px 14px', borderBottom: '1px solid var(--border)' }}>
                <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', margin: 0 }}>
                  pick a dare
                </p>
              </div>
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {pickableDares.length === 0 ? (
                  <p style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, fontStyle: 'italic' }}>
                    no dares yet — add one with +
                  </p>
                ) : (
                  pickableDares.map(dare => (
                    <button
                      key={dare.id}
                      onClick={() => handlePickDare(dare)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        width: '100%', padding: '14px 20px',
                        background: 'transparent', border: 'none',
                        borderBottom: '1px solid var(--border)',
                        cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      <span style={{ fontSize: 14, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', fontWeight: 500 }}>
                        {dare.title}
                      </span>
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                        background: dare.assigned_to === 'trade' ? 'var(--color-teal)' : 'var(--amber)',
                        color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0, marginLeft: 8,
                      }}>
                        {dare.assigned_to === 'trade' ? 'trade' : 'challenge'}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes pulse-live {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }
        @keyframes opacity-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </>
  )
}
