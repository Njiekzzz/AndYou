import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../context/AppContext'
import { Dare } from '../types'
import { DareCompleteSheet } from './DareCompleteSheet'

interface DareDetailSheetProps {
  dare: Dare | null
  onClose: () => void
  onEdit: (dareId: string) => void
  onReveal: (dare: Dare) => void
}

function isOverdue(due: string | null | undefined): boolean {
  if (!due) return false
  return new Date(due) < new Date()
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export function DareDetailSheet({ dare, onClose, onEdit, onReveal }: DareDetailSheetProps) {
  const { user, partner, getUserById, updateDare, deleteDare } = useApp()
  const [completeOpen, setCompleteOpen] = useState(false)
  const [asTradeCreator, setAsTradeCreator] = useState(false)
  const touchStartY = useRef(0)
  const onHandleTouchStart = useCallback((e: React.TouchEvent) => { touchStartY.current = e.touches[0].clientY }, [])
  const onHandleTouchEnd = useCallback((e: React.TouchEvent) => { if (e.changedTouches[0].clientY - touchStartY.current > 80) onClose() }, [onClose])

  if (!dare || !user) return null

  const creator = getUserById(dare.created_by)
  const creatorName = creator?.name ?? 'unknown'
  const partnerName = partner?.name ?? 'your partner'
  const iAmCreator = dare.created_by === user.id
  const isForMe = dare.assigned_to === 'partner' && !iAmCreator
  const isSelf = dare.assigned_to === 'self'
  const isTrade = dare.assigned_to === 'trade'
  const isEditable = iAmCreator && dare.status === 'pending' && (!isTrade || dare.trade_status === 'pending')

  // Trade: determine my part and their part
  let myTradePart = ''
  let theirTradePart = ''
  let myTradeStatus = dare.status
  let theirTradeStatus = dare.trade_status ?? 'pending'
  let myTradePhoto: string | null = null
  let myTradeNote: string | null = null
  let theirTradePhoto: string | null = null
  let theirTradeNote: string | null = null
  let amTradeCreator = false

  if (isTrade) {
    if (iAmCreator) {
      myTradePart = dare.trade_title ?? ''
      theirTradePart = dare.title
      myTradeStatus = dare.trade_status ?? 'pending'
      theirTradeStatus = dare.status
      myTradePhoto = dare.trade_completion_photo_url ?? null
      myTradeNote = dare.trade_completion_note ?? null
      theirTradePhoto = dare.completion_photo_url ?? null
      theirTradeNote = dare.completion_note ?? null
      amTradeCreator = true
    } else {
      myTradePart = dare.title
      theirTradePart = dare.trade_title ?? ''
      myTradeStatus = dare.status
      theirTradeStatus = dare.trade_status ?? 'pending'
      myTradePhoto = dare.completion_photo_url ?? null
      myTradeNote = dare.completion_note ?? null
      theirTradePhoto = dare.trade_completion_photo_url ?? null
      theirTradeNote = dare.trade_completion_note ?? null
      amTradeCreator = false
    }
  }

  const tradeBothDone = isTrade && dare.status === 'done' && dare.trade_status === 'done'

  const handleAccept = async () => {
    await updateDare(dare.id, { status: 'accepted' })
  }

  const handleSkip = async () => {
    await updateDare(dare.id, { status: 'skipped' })
  }

  const handleDelete = async () => {
    await deleteDare(dare.id)
    onClose()
  }

  const openComplete = (asCreator: boolean) => {
    setAsTradeCreator(asCreator)
    setCompleteOpen(true)
  }

  return (
    <>
      <AnimatePresence>
        {!!dare && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(42,38,32,0.4)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 62 }}
              onClick={onClose}
            />
            <motion.div
              key="sheet"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 280, damping: 30, mass: 0.8 }}
              style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 63,
                background: 'var(--sheet-bg)', borderRadius: '24px 24px 0 0',
                maxHeight: '88vh', display: 'flex', flexDirection: 'column',
              }}
              onClick={e => e.stopPropagation()}
            >
              <div
                onTouchStart={onHandleTouchStart} onTouchEnd={onHandleTouchEnd}
                style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 8, flexShrink: 0, cursor: 'grab' }}
              >
                <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                <div style={{ width: 40 }} />
                <span style={{ fontWeight: 500, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 11 }}>
                  {isTrade ? 'trade' : dare.assigned_to === 'self' ? 'self-dare' : 'dare'}
                </span>
                <button onClick={onClose} style={{ color: 'var(--text-muted)', fontSize: 22, lineHeight: 1, width: 40, textAlign: 'right' }}>×</button>
              </div>

              <div style={{ overflowY: 'auto', flex: 1, paddingBottom: 'env(safe-area-inset-bottom)' }}>
                <div style={{ padding: '20px 20px 32px' }}>

                  {/* ── Non-trade ─────────────────────────────────── */}
                  {!isTrade && (
                    <>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', marginBottom: 8 }}>
                        {isSelf
                          ? 'you dared yourself to:'
                          : iAmCreator
                          ? `you dared ${partnerName} to:`
                          : `${creatorName} dares you to:`}
                      </p>
                      <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', lineHeight: 1.3, marginBottom: 12 }}>
                        {dare.title}
                      </h2>
                      {dare.description && (
                        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>
                          {dare.description}
                        </p>
                      )}
                      {dare.due_date && (
                        <p style={{ fontSize: 13, color: isOverdue(dare.due_date) ? '#c94a4a' : 'var(--text-muted)', marginBottom: 16, fontFamily: 'var(--font-sans)' }}>
                          by {formatDate(dare.due_date)}{isOverdue(dare.due_date) ? ' — overdue' : ''}
                        </p>
                      )}

                      {/* Status + actions */}
                      <div style={{ height: 1, background: 'var(--border)', marginBottom: 16 }} />

                      {/* For me — pending */}
                      {(isForMe || isSelf) && dare.status === 'pending' && (
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button
                            onClick={handleAccept}
                            style={{ flex: 1, padding: '12px', borderRadius: 999, background: 'var(--color-teal)', color: '#fff', fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-sans)' }}
                          >
                            accept
                          </button>
                          <button
                            onClick={handleSkip}
                            style={{ flex: 1, padding: '12px', borderRadius: 999, background: 'transparent', color: 'var(--text-muted)', fontSize: 14, border: '1px solid var(--border)', fontFamily: 'var(--font-sans)' }}
                          >
                            skip
                          </button>
                        </div>
                      )}

                      {/* For me — accepted */}
                      {(isForMe || isSelf) && dare.status === 'accepted' && (
                        <button
                          onClick={() => openComplete(false)}
                          style={{ width: '100%', padding: '13px', borderRadius: 999, background: 'var(--color-teal)', color: '#fff', fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-sans)' }}
                        >
                          mark as done
                        </button>
                      )}

                      {/* I sent it — pending/accepted */}
                      {iAmCreator && !isSelf && (dare.status === 'pending' || dare.status === 'accepted') && (
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic', fontFamily: 'var(--font-sans)' }}>
                          waiting for {partnerName}…
                        </p>
                      )}

                      {/* Skipped */}
                      {dare.status === 'skipped' && (
                        <p style={{ fontSize: 13, color: '#b57b7b', fontFamily: 'var(--font-sans)' }}>
                          {isSelf ? 'you skipped this' : iAmCreator ? `${partnerName} skipped this` : 'you skipped this'}
                        </p>
                      )}

                      {/* Done */}
                      {dare.status === 'done' && (
                        <div>
                          <p style={{ fontSize: 13, color: '#4a8a4a', fontWeight: 600, fontFamily: 'var(--font-sans)', marginBottom: 10 }}>
                            ✓ completed {dare.completed_at ? formatDate(dare.completed_at) : ''}
                          </p>
                          {dare.completion_photo_url && (
                            <img src={dare.completion_photo_url} alt="" style={{ width: '100%', borderRadius: 8, marginBottom: 10, objectFit: 'cover', maxHeight: 240 }} />
                          )}
                          {dare.completion_note && (
                            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, fontStyle: 'italic' }}>
                              "{dare.completion_note}"
                            </p>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {/* ── Trade ─────────────────────────────────────── */}
                  {isTrade && (
                    <>
                      {/* My part */}
                      <div style={{ marginBottom: 20 }}>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-sans)', marginBottom: 6 }}>you have to</p>
                        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3, fontFamily: 'var(--font-sans)', marginBottom: 8 }}>
                          {myTradePart}
                        </h2>

                        {dare.due_date && (
                          <p style={{ fontSize: 13, color: isOverdue(dare.due_date) ? '#c94a4a' : 'var(--text-muted)', fontFamily: 'var(--font-sans)', marginBottom: 8 }}>
                            by {formatDate(dare.due_date)}{isOverdue(dare.due_date) ? ' — overdue' : ''}
                          </p>
                        )}

                        {myTradeStatus === 'pending' && (
                          <button
                            onClick={() => openComplete(amTradeCreator)}
                            style={{ padding: '11px 20px', borderRadius: 999, background: 'var(--color-teal)', color: '#fff', fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-sans)' }}
                          >
                            mark my part done
                          </button>
                        )}
                        {myTradeStatus === 'done' && (
                          <div>
                            <p style={{ fontSize: 13, color: '#4a8a4a', fontWeight: 600, fontFamily: 'var(--font-sans)', marginBottom: 8 }}>✓ your part done</p>
                            {myTradePhoto && <img src={myTradePhoto} alt="" style={{ width: '100%', borderRadius: 8, marginBottom: 8, objectFit: 'cover', maxHeight: 200 }} />}
                            {myTradeNote && <p style={{ fontSize: 14, color: 'var(--text-secondary)', fontStyle: 'italic' }}>"{myTradeNote}"</p>}
                          </div>
                        )}
                      </div>

                      <div style={{ height: 1, background: 'var(--border)', marginBottom: 20 }} />

                      {/* Their part */}
                      <div style={{ marginBottom: 20 }}>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-sans)', marginBottom: 6 }}>{partnerName} has to</p>
                        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-secondary)', lineHeight: 1.3, fontFamily: 'var(--font-sans)', marginBottom: 8 }}>
                          {theirTradePart}
                        </h2>

                        {theirTradeStatus === 'pending' && myTradeStatus === 'done' && (
                          <p style={{ fontSize: 13, color: 'var(--amber)', fontStyle: 'italic', fontFamily: 'var(--font-sans)' }}>
                            {partnerName} already did theirs — your turn 👀
                          </p>
                        )}
                        {theirTradeStatus === 'pending' && myTradeStatus === 'pending' && (
                          <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic', fontFamily: 'var(--font-sans)' }}>
                            waiting for {partnerName}…
                          </p>
                        )}
                        {theirTradeStatus === 'done' && !tradeBothDone && (
                          <p style={{ fontSize: 13, color: '#4a8a4a', fontFamily: 'var(--font-sans)' }}>
                            ✓ {partnerName} did their part
                          </p>
                        )}
                        {tradeBothDone && (
                          <p style={{ fontSize: 13, color: '#4a8a4a', fontWeight: 600, fontFamily: 'var(--font-sans)' }}>
                            ✓ both done!
                          </p>
                        )}
                      </div>

                      {/* Reveal button */}
                      {tradeBothDone && (
                        <button
                          onClick={() => onReveal(dare)}
                          style={{
                            width: '100%', padding: '14px',
                            background: 'linear-gradient(135deg, var(--color-teal), #3a6e72)',
                            color: '#fff', borderRadius: 999,
                            fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-serif)', fontStyle: 'italic',
                            letterSpacing: '0.02em',
                          }}
                        >
                          reveal 🎉
                        </button>
                      )}
                    </>
                  )}

                  {/* Edit / delete */}
                  {isEditable && (
                    <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border)', display: 'flex', gap: 16 }}>
                      <button
                        onClick={() => { onClose(); setTimeout(() => onEdit(dare.id), 200) }}
                        style={{ fontSize: 13, color: 'var(--color-teal)', fontFamily: 'var(--font-sans)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        edit dare
                      </button>
                      <button
                        onClick={handleDelete}
                        style={{ fontSize: 13, color: '#b57b7b', fontFamily: 'var(--font-sans)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        remove dare
                      </button>
                    </div>
                  )}

                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <DareCompleteSheet
        dare={completeOpen ? dare : null}
        asTradeCreator={asTradeCreator}
        onClose={() => setCompleteOpen(false)}
      />
    </>
  )
}
