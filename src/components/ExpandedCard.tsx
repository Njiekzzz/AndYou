import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BucketItem } from '../types'
import { useApp } from '../context/AppContext'

interface ExpandedCardProps {
  item: BucketItem
  onClose: () => void
  onEdit: (item: BucketItem) => void
}

function HeartRating({ rating, color, label }: { rating: number | null; color: string; label: string }) {
  const hasRating = rating != null && rating > 0
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <svg width="22" height="20" viewBox="0 0 24 24" fill={hasRating ? color : 'none'} stroke={color} strokeWidth="1.5">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 400,
          color: hasRating ? color : 'var(--text-muted)',
          minWidth: 20, textAlign: 'center',
        }}>
          {hasRating ? rating : '–'}
        </span>
      </div>
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--text-muted)' }}>
        {label}
      </span>
    </div>
  )
}

export function ExpandedCard({ item, onClose, onEdit }: ExpandedCardProps) {
  const { user, partner, getUserById, getItemReactions, deleteItem, setRating, regions, items } = useApp()

  const liveItem = items.find(i => i.id === item.id) ?? item

  const creator = getUserById(liveItem.created_by)
  const region  = regions.find(r => r.id === liveItem.region_id)
  const itemReactions = getItemReactions(liveItem.id)
  const myReaction      = itemReactions.find(r => r.user_id === user?.id)
  const partnerReaction = itemReactions.find(r => r.user_id !== user?.id)
  const myRating      = myReaction?.rating ?? 0
  const partnerRating = partnerReaction?.rating ?? null
  const partnerUser   = partner ?? (partnerReaction ? getUserById(partnerReaction.user_id) : null)

  const myColor      = user?.avatar_color ?? '#d4900a'
  const partnerColor = partnerUser?.avatar_color ?? '#8a9abf'

  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleDelete = async () => {
    await deleteItem(liveItem.id)
    onClose()
  }

  const handleDotClick = (dot: number) => {
    setRating(liveItem.id, dot === myRating ? 0 : dot)
  }

  const formattedDate = liveItem.date
    ? new Date(liveItem.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  return (
    <AnimatePresence>
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
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px',
        }}
      >
        <motion.div
          key="card"
          initial={{ scale: 0.88, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.88, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: 360,
            background: 'var(--card-bg)',
            borderRadius: 4,
            boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
            overflow: 'hidden',
            maxHeight: 'calc(100vh - 80px)',
            overflowY: 'auto',
            flexShrink: 0,
          }}
        >
          {/* Photo — full image, no crop */}
          <div style={{ position: 'relative', background: '#1a1814', flexShrink: 0 }}>
            {liveItem.image_url ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 160 }}>
                <img
                  src={liveItem.image_url}
                  alt={liveItem.title}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '65vh',
                    width: 'auto',
                    height: 'auto',
                    display: 'block',
                  }}
                />
              </div>
            ) : (
              <div style={{
                height: 200,
                background: 'linear-gradient(135deg, #c8a060, #8a5a30)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 22, color: '#fff' }}>&amp;you</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase' }}>UNDEVELOPED</span>
              </div>
            )}
            <button
              onClick={onClose}
              style={{
                position: 'absolute', top: 10, right: 10,
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(0,0,0,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 10, border: 'none', cursor: 'pointer',
              }}
            >
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M1 1l9 9M10 1L1 10" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Creator strip */}
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

          {/* Body */}
          <div>
            {/* Title */}
            <div style={{ padding: '14px 16px 4px' }}>
              <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 22, fontWeight: 600, color: 'var(--text-dark)', lineHeight: 1.2, margin: 0 }}>
                {liveItem.title}
              </h2>
            </div>

            {/* Location */}
            {liveItem.location && (
              <div style={{ padding: '0 16px 12px', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-muted)' }}>
                <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
                  <path d="M6 1C3.79 1 2 2.79 2 5c0 3.5 4 8 4 8s4-4.5 4-8c0-2.21-1.79-4-4-4z" stroke="currentColor" strokeWidth="1.2"/>
                  <circle cx="6" cy="5" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
                </svg>
                {liveItem.location}
              </div>
            )}

            {/* Description */}
            {liveItem.description && (
              <div style={{ padding: '0 16px 12px', fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.6 }}>
                {liveItem.description}
              </div>
            )}

            <div style={{ height: 1, background: 'var(--cream-dark)', margin: '0 16px' }} />

            {/* Region + mood */}
            <div style={{ padding: '12px 16px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {region && (
                <span style={{ background: 'var(--cream-dark)', borderRadius: 12, padding: '4px 10px', fontSize: 12, fontFamily: 'var(--font-sans)', color: 'var(--text-mid)' }}>
                  {region.name}
                </span>
              )}
              <span style={{ background: 'var(--cream-dark)', borderRadius: 12, padding: '4px 10px', fontSize: 12, fontFamily: 'var(--font-sans)', color: 'var(--text-mid)' }}>
                {liveItem.mood}
              </span>
            </div>

            {/* Date */}
            {formattedDate && (
              <div style={{ padding: '0 16px 12px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
                {formattedDate}
              </div>
            )}

            <div style={{ height: 1, background: 'var(--cream-dark)', margin: '0 16px' }} />

            {/* ── Ratings section ──────────────────────────────────────── */}
            <div style={{ padding: '16px 16px 8px' }}>
              {/* Both users' heart ratings displayed */}
              <div style={{ display: 'flex', gap: 32, marginBottom: 16 }}>
                <HeartRating
                  rating={myRating > 0 ? myRating : null}
                  color={myColor}
                  label={user?.name ?? 'you'}
                />
                <HeartRating
                  rating={partnerRating}
                  color={partnerColor}
                  label={partnerUser?.name ?? 'them'}
                />
              </div>

              {/* 10 dots to set MY rating */}
              <div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
                  tap to rate
                </div>
                <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                  {Array.from({ length: 10 }, (_, i) => {
                    const dot = i + 1
                    const filled = dot <= myRating
                    return (
                      <button
                        key={dot}
                        onClick={() => handleDotClick(dot)}
                        style={{
                          width: 11, height: 11, borderRadius: '50%', padding: 0,
                          background: filled ? myColor : 'var(--cream-dark)',
                          border: filled ? 'none' : '1px solid var(--spine-color)',
                          cursor: 'pointer', flexShrink: 0,
                          transition: 'background 0.15s',
                        }}
                      />
                    )
                  })}
                  {myRating > 0 && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>
                      {myRating} / 10
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ height: 1, background: 'var(--cream-dark)', margin: '0 16px' }} />

            {/* Edit */}
            <div style={{ padding: '12px 16px 4px' }}>
              <button
                onClick={() => { onClose(); onEdit(liveItem) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, color: 'var(--amber)' }}
              >
                edit this memory
              </button>
            </div>

            {/* Delete */}
            <div style={{ padding: '0 16px 20px' }}>
              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-muted)' }}
                >
                  remove from wall
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-mid)' }}>Remove this from the wall?</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={handleDelete} style={{ flex: 1, padding: '8px', borderRadius: 8, background: '#c94a3a', color: '#fff', border: 'none', fontFamily: 'var(--font-sans)', fontSize: 13, cursor: 'pointer' }}>remove</button>
                    <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, padding: '8px', borderRadius: 8, background: 'var(--cream-dark)', color: 'var(--text-mid)', border: 'none', fontFamily: 'var(--font-sans)', fontSize: 13, cursor: 'pointer' }}>cancel</button>
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
