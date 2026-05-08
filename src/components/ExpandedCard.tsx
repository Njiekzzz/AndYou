import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BucketItem } from '../types'
import { useApp } from '../context/AppContext'

interface ExpandedCardProps {
  item: BucketItem
  onClose: () => void
  onEdit: (item: BucketItem) => void
}

export function ExpandedCard({ item, onClose, onEdit }: ExpandedCardProps) {
  const { user, partner, getUserById, getItemReactions, deleteItem, toggleHeart, setRating, regions, items } = useApp()

  // Always use live item from state so updates reflect immediately
  const liveItem = items.find(i => i.id === item.id) ?? item

  const creator = getUserById(liveItem.created_by)
  const region  = regions.find(r => r.id === liveItem.region_id)
  const itemReactions = getItemReactions(liveItem.id)
  const myReaction      = itemReactions.find(r => r.user_id === user?.id)
  const partnerReaction = itemReactions.find(r => r.user_id !== user?.id)
  const myHeart   = myReaction?.heart === true
  const myRating  = myReaction?.rating ?? 0
  const partnerHasHeart = partnerReaction?.heart === true
  const partnerUser = partner ?? (partnerReaction ? getUserById(partnerReaction.user_id) : null)

  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleDelete = async () => {
    await deleteItem(liveItem.id)
    onClose()
  }

  const handleHeart = () => toggleHeart(liveItem.id)
  const handleDotClick = (dot: number) => {
    // Tapping the same dot again clears rating
    setRating(liveItem.id, dot === myRating ? 0 : dot)
  }

  const formattedDate = liveItem.date
    ? new Date(liveItem.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  return (
    <AnimatePresence>
      {/* Scrim */}
      <motion.div
        key="scrim"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(20,16,8,0.75)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}
      >
        {/* Card — stop propagation so tapping card doesn't close */}
        <motion.div
          key="card"
          initial={{ scale: 0.88, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.88, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: 360,
            background: 'var(--card-bg)',
            borderRadius: 4,
            boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
            overflow: 'hidden',
            maxHeight: 'calc(100vh - 80px)',
            overflowY: 'auto',
            flexShrink: 0,
          }}
        >
          {/* ── Photo area ───────────────────────────────────────────────── */}
          <div style={{
            width: '100%', height: 240,
            background: 'linear-gradient(135deg, #c8a060, #8a5a30)',
            position: 'relative', overflow: 'hidden', flexShrink: 0,
          }}>
            {liveItem.image_url ? (
              <img
                src={liveItem.image_url}
                alt={liveItem.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 22, color: '#fff' }}>
                  &amp;you
                </span>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10,
                  letterSpacing: '0.25em', color: 'rgba(255,255,255,0.55)',
                  textTransform: 'uppercase',
                }}>
                  UNDEVELOPED
                </span>
              </div>
            )}

            {/* Close button */}
            <button
              onClick={onClose}
              style={{
                position: 'absolute', top: 10, right: 10,
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(0,0,0,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 10, border: 'none', cursor: 'pointer',
              }}
            >
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M1 1l9 9M10 1L1 10" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* ── Creator strip ─────────────────────────────────────────────── */}
          <div style={{
            height: 40, display: 'flex', alignItems: 'center',
            padding: '0 16px', gap: 8,
            borderBottom: '1px solid var(--cream-dark)',
          }}>
            {creator && (
              <>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: creator.avatar_color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, color: '#fff',
                  flexShrink: 0,
                }}>
                  {creator.name.charAt(0).toUpperCase()}
                </div>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-muted)' }}>
                  {creator.name} added this
                </span>
              </>
            )}
          </div>

          {/* ── Card body ─────────────────────────────────────────────────── */}
          <div>
            {/* Title */}
            <div style={{ padding: '14px 16px 4px' }}>
              <h2 style={{
                fontFamily: 'var(--font-sans)', fontSize: 22, fontWeight: 600,
                color: 'var(--text-dark)', lineHeight: 1.2, margin: 0,
              }}>
                {liveItem.title}
              </h2>
            </div>

            {/* Location */}
            {liveItem.location && (
              <div style={{
                padding: '0 16px 12px',
                display: 'flex', alignItems: 'center', gap: 5,
                fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-muted)',
              }}>
                <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
                  <path d="M6 1C3.79 1 2 2.79 2 5c0 3.5 4 8 4 8s4-4.5 4-8c0-2.21-1.79-4-4-4z" stroke="currentColor" strokeWidth="1.2"/>
                  <circle cx="6" cy="5" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
                </svg>
                {liveItem.location}
              </div>
            )}

            {/* Description */}
            {liveItem.description && (
              <div style={{
                padding: '0 16px 12px',
                fontFamily: 'var(--font-sans)', fontSize: 14,
                color: 'var(--text-mid)', lineHeight: 1.6,
              }}>
                {liveItem.description}
              </div>
            )}

            {/* Divider */}
            <div style={{ height: 1, background: 'var(--cream-dark)', margin: '0 16px' }} />

            {/* Region + mood badges */}
            <div style={{ padding: '12px 16px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {region && (
                <span style={{
                  background: 'var(--cream-dark)', borderRadius: 12,
                  padding: '4px 10px', fontSize: 12,
                  fontFamily: 'var(--font-sans)', color: 'var(--text-mid)',
                }}>
                  {region.name}
                </span>
              )}
              <span style={{
                background: 'var(--cream-dark)', borderRadius: 12,
                padding: '4px 10px', fontSize: 12,
                fontFamily: 'var(--font-sans)', color: 'var(--text-mid)',
              }}>
                {liveItem.mood}
              </span>
            </div>

            {/* Date row (only if set) */}
            {formattedDate && (
              <div style={{
                padding: '0 16px 12px',
                fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)',
              }}>
                {formattedDate}
              </div>
            )}

            {/* Divider */}
            <div style={{ height: 1, background: 'var(--cream-dark)', margin: '0 16px' }} />

            {/* Reaction + rating row */}
            <div style={{ padding: '12px 16px 8px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              {/* Left: heart + partner heart */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={handleHeart}
                  style={{
                    padding: 0, border: 'none', background: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {myHeart ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#e05070">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>

                {/* Partner avatar + heart if they reacted */}
                {partnerHasHeart && partnerUser && (
                  <div style={{ position: 'relative' }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%',
                      background: partnerUser.avatar_color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-sans)', fontSize: 9, fontWeight: 600, color: '#fff',
                    }}>
                      {partnerUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{
                      position: 'absolute', bottom: -3, right: -3,
                      width: 12, height: 12, borderRadius: '50%',
                      background: 'var(--card-bg)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="#e05070">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                      </svg>
                    </div>
                  </div>
                )}
              </div>

              {/* Right: 10-dot rating */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  {Array.from({ length: 10 }, (_, i) => {
                    const dot = i + 1
                    const filled = dot <= myRating
                    return (
                      <button
                        key={dot}
                        onClick={() => handleDotClick(dot)}
                        style={{
                          width: 10, height: 10, borderRadius: '50%', padding: 0,
                          background: filled ? 'var(--amber)' : 'var(--cream-dark)',
                          border: filled ? 'none' : '1px solid var(--spine-color)',
                          cursor: 'pointer', flexShrink: 0,
                          transition: 'background 0.15s',
                        }}
                      />
                    )
                  })}
                </div>
                {myRating > 0 && (
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)',
                  }}>
                    {myRating} / 10
                  </span>
                )}
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: 'var(--cream-dark)', margin: '0 16px' }} />

            {/* Edit button */}
            <div style={{ padding: '12px 16px 4px' }}>
              <button
                onClick={() => { onClose(); onEdit(liveItem) }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
                  color: 'var(--amber)',
                }}
              >
                edit this memory
              </button>
            </div>

            {/* Delete button + confirm */}
            <div style={{ padding: '0 16px 20px' }}>
              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    fontFamily: 'var(--font-sans)', fontSize: 13,
                    color: 'var(--text-muted)',
                  }}
                >
                  remove from wall
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-mid)' }}>
                    Remove this from the wall?
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={handleDelete}
                      style={{
                        flex: 1, padding: '8px', borderRadius: 8,
                        background: '#c94a3a', color: '#fff', border: 'none',
                        fontFamily: 'var(--font-sans)', fontSize: 13, cursor: 'pointer',
                      }}
                    >
                      remove
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      style={{
                        flex: 1, padding: '8px', borderRadius: 8,
                        background: 'var(--cream-dark)', color: 'var(--text-mid)', border: 'none',
                        fontFamily: 'var(--font-sans)', fontSize: 13, cursor: 'pointer',
                      }}
                    >
                      cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
