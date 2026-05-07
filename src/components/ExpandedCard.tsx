import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BucketItem, ITEM_THEMES, ItemTheme } from '../types'
import { useApp } from '../context/AppContext'
import { getRotationFromSeed } from '../lib/rotation'
import { Avatar } from './Avatar'
import { DevelopTransition } from './DevelopTransition'

interface ExpandedCardProps {
  item: BucketItem
  onClose: () => void
}

export function ExpandedCard({ item, onClose }: ExpandedCardProps) {
  const { user, getUserById, getItemReactions, commitItem, completeItem, deleteItem, setRating, uploadImage, regions, items } = useApp()

  // Use the live item from context so updates (e.g. real_image_url) reflect immediately
  const liveItem = items.find(i => i.id === item.id) ?? item

  const rotation = getRotationFromSeed(liveItem.rotation_seed)
  const creator = getUserById(liveItem.created_by)
  const reactions = getItemReactions(liveItem.id)
  const myReaction = reactions.find(r => r.user_id === user?.id)
  const myRating = myReaction?.rating ?? 0
  const partnerReaction = reactions.find(r => r.user_id !== user?.id)
  const region = regions.find(r => r.id === liveItem.region_id)

  const isDone = liveItem.status === 'done'

  const [isFlipped, setIsFlipped] = useState(isDone && !!liveItem.real_image_url)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (liveItem.real_image_url) setIsFlipped(true)
  }, [liveItem.real_image_url])

  const handleRealPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadImage(file)
      await completeItem(liveItem.id, url)
    } catch (err) {
      console.error('Upload failed', err)
    }
    setUploading(false)
  }

  const canCommit = liveItem.status === 'proposed' && liveItem.created_by !== user?.id

  return (
    <AnimatePresence>
      <motion.div
        key="scrim"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(42,38,32,0.5)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={onClose}
      >
        <motion.div
          layoutId={`polaroid-${liveItem.id}`}
          key="card"
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          style={{
            width: 'min(92vw, 380px)',
            background: 'var(--bg-card)',
            borderRadius: 3,
            overflow: 'hidden',
            position: 'relative',
            zIndex: 51,
          }}
          className="polaroid-shadow"
          onClick={e => e.stopPropagation()}
        >
          {/* Close */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: 10, right: 10, width: 28, height: 28,
              borderRadius: '50%', background: 'rgba(0,0,0,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 10, color: 'white',
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1 1l8 8M9 1L1 9" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>

          {/* Image — develop transition handles animation + done stamp + flip */}
          <div
            style={{
              height: 260,
              background: 'var(--border)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <DevelopTransition
              realSrc={liveItem.real_image_url}
              plannedSrc={liveItem.image_url}
              alt={liveItem.title}
              isFlipped={isFlipped}
              onFlip={() => setIsFlipped(f => !f)}
              isDone={isDone}
            />
          </div>

          {/* Content */}
          <div style={{ padding: '14px 16px 18px' }}>
            <div className="flex items-start justify-between gap-3 mb-2">
              <h2 style={{ fontSize: 17, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.3, flex: 1 }}>{liveItem.title}</h2>
              {creator && <Avatar name={creator.name} color={creator.avatar_color} size={24} />}
            </div>

            <div className="flex items-center gap-2 mb-3" style={{ flexWrap: 'wrap' }}>
              {region && (
                <span style={{ fontSize: 10, background: 'var(--tape-bg)', color: 'var(--tape-text)', padding: '2px 7px', borderRadius: 3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {region.name}
                </span>
              )}
              <span style={{
                fontSize: 10,
                background: liveItem.mood === 'online' ? '#ddeedd' : '#dde4ee',
                color: liveItem.mood === 'online' ? '#4a7a4a' : '#4a5a7a',
                padding: '2px 7px', borderRadius: 3, textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>
                {liveItem.mood}
              </span>
              {liveItem.theme && ITEM_THEMES[liveItem.theme as ItemTheme] && (() => {
                const t = ITEM_THEMES[liveItem.theme as ItemTheme]
                return (
                  <span style={{
                    fontSize: 10, padding: '2px 7px', borderRadius: 3,
                    border: `1px solid ${t.borderColor}`,
                    color: t.borderColor,
                    letterSpacing: '0.08em',
                  }}>
                    {t.emoji} {t.label}
                  </span>
                )
              })()}
            </div>

            {liveItem.description && (
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 8 }}>{liveItem.description}</p>
            )}

            {liveItem.location && (
              <div className="flex items-center gap-1 mb-3" style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                <svg width="11" height="13" viewBox="0 0 11 13" fill="none">
                  <path d="M5.5 1C3.015 1 1 3.015 1 5.5c0 3.375 4.5 7 4.5 7s4.5-3.625 4.5-7C10 3.015 7.985 1 5.5 1z" stroke="currentColor" strokeWidth="1.2"/>
                  <circle cx="5.5" cy="5.5" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
                </svg>
                {liveItem.location}
              </div>
            )}

            {/* Rating */}
            <div className="mb-4">
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>dream it</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {/* Partner hearts — bigger, colored, shown first */}
                {(partnerReaction?.rating ?? 0) > 0 && (
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', width: 28, flexShrink: 0 }}>them</span>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }, (_, i) => (
                        <svg key={i} width="22" height="20" viewBox="0 0 10 9">
                          <path
                            d="M5,8.5 C5,8.5 0.5,5 0.5,2.5 C0.5,1.1 1.6,0 3,0 C3.8,0 4.5,0.4 5,1 C5.5,0.4 6.2,0 7,0 C8.4,0 9.5,1.1 9.5,2.5 C9.5,5 5,8.5 5,8.5 Z"
                            fill={i < (partnerReaction?.rating ?? 0) ? '#c8745a' : 'none'}
                            stroke={i < (partnerReaction?.rating ?? 0) ? '#c8745a' : 'var(--border)'}
                            strokeWidth="0.6"
                          />
                        </svg>
                      ))}
                    </div>
                  </div>
                )}
                {/* My hearts — smaller, clickable, animated */}
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', width: 28, flexShrink: 0 }}>you</span>
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: 5 }, (_, i) => {
                      const filled = i < myRating
                      return (
                        <motion.button
                          key={i}
                          onClick={() => setRating(liveItem.id, i + 1 === myRating ? 0 : i + 1)}
                          whileTap={{ scale: 1.5 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                          style={{ padding: 0, cursor: 'pointer', lineHeight: 1, display: 'flex' }}
                        >
                          <svg width="18" height="16" viewBox="0 0 10 9">
                            <path
                              d="M5,8.5 C5,8.5 0.5,5 0.5,2.5 C0.5,1.1 1.6,0 3,0 C3.8,0 4.5,0.4 5,1 C5.5,0.4 6.2,0 7,0 C8.4,0 9.5,1.1 9.5,2.5 C9.5,5 5,8.5 5,8.5 Z"
                              fill={filled ? '#e0a04a' : 'none'}
                              stroke={filled ? '#e0a04a' : 'var(--border)'}
                              strokeWidth="0.6"
                              style={{ transition: 'fill 0.2s, stroke 0.2s' }}
                            />
                          </svg>
                        </motion.button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-wrap">
              {canCommit && (
                <button
                  onClick={() => { commitItem(liveItem.id); onClose() }}
                  style={{ flex: 1, padding: '8px 12px', background: '#e0a04a', color: '#2a2620', borderRadius: 999, fontSize: 13, fontWeight: 500 }}
                >
                  commit to this
                </button>
              )}

              {liveItem.status === 'committed' && (
                <button
                  onClick={() => { completeItem(liveItem.id); onClose() }}
                  style={{ flex: 1, padding: '8px 12px', background: '#e0a04a', color: '#2a2620', borderRadius: 999, fontSize: 13, fontWeight: 500 }}
                >
                  mark done
                </button>
              )}

              {liveItem.status === 'done' && !liveItem.real_image_url && (
                <>
                  <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleRealPhotoUpload} />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    style={{ flex: 1, padding: '8px 12px', background: 'var(--tape-bg)', color: 'var(--tape-text)', borderRadius: 6, fontSize: 13 }}
                  >
                    {uploading ? 'developing…' : 'develop memory'}
                  </button>
                </>
              )}

              <button
                onClick={() => { deleteItem(liveItem.id); onClose() }}
                style={{ padding: '8px 12px', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: 6, fontSize: 13 }}
              >
                delete
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
