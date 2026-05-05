import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BucketItem } from '../types'
import { useApp } from '../context/AppContext'
import { getRotationFromSeed } from '../lib/rotation'
import { Avatar } from './Avatar'

interface ExpandedCardProps {
  item: BucketItem
  onClose: () => void
}

export function ExpandedCard({ item, onClose }: ExpandedCardProps) {
  const { user, getUserById, getItemReactions, commitItem, completeItem, deleteItem, toggleHeart, setRating, uploadImage, regions } = useApp()
  const rotation = getRotationFromSeed(item.rotation_seed)
  const creator = getUserById(item.created_by)
  const reactions = getItemReactions(item.id)
  const myReaction = reactions.find(r => r.user_id === user?.id)
  const myHeart = myReaction?.heart ?? false
  const myRating = myReaction?.rating ?? 0
  const partnerReaction = reactions.find(r => r.user_id !== user?.id)
  const region = regions.find(r => r.id === item.region_id)

  const [isFlipped, setIsFlipped] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleRealPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadImage(file)
      await completeItem(item.id, url)
    } catch (err) {
      console.error('Upload failed', err)
    }
    setUploading(false)
  }

  const canCommit = item.status === 'proposed' && item.created_by !== user?.id

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
          background: 'rgba(0,0,0,0.6)',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={onClose}
      >
        <motion.div
          layoutId={`polaroid-${item.id}`}
          key="card"
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          style={{
            width: 'min(90vw, 360px)',
            background: 'var(--bg-card)',
            borderRadius: 3,
            overflow: 'hidden',
            position: 'relative',
            zIndex: 51,
          }}
          className="polaroid-shadow"
          onClick={e => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              color: 'white',
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1 1l8 8M9 1L1 9" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>

          {/* Image */}
          <div
            style={{ height: 220, background: 'var(--border)', position: 'relative', overflow: 'hidden', cursor: item.real_image_url ? 'pointer' : 'default' }}
            onClick={() => item.real_image_url && setIsFlipped(f => !f)}
          >
            {(isFlipped ? item.real_image_url : item.image_url) ? (
              <img
                src={(isFlipped ? item.real_image_url : item.image_url) ?? ''}
                alt={item.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" opacity={0.25}>
                  <rect x="3" y="5" width="18" height="14" rx="2" stroke="var(--text-secondary)" strokeWidth="1.5"/>
                  <circle cx="8.5" cy="10.5" r="1.5" stroke="var(--text-secondary)" strokeWidth="1.5"/>
                  <path d="M21 15l-5-5-4 4-2-2-4 4" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
            )}

            {/* Done stamp on photo */}
            {item.status === 'done' && (
              <div
                className="stamp-animate"
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  border: '2.5px solid #4a8a4a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255,255,255,0.88)',
                }}
              >
                <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
                  <path d="M1 5.5L5 9.5L13 1.5" stroke="#4a8a4a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}

            {/* Flip hint */}
            {item.real_image_url && (
              <div style={{ position: 'absolute', bottom: 8, left: 8, fontSize: 9, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.08em' }}>
                {isFlipped ? 'the plan ↑ tap to flip' : 'the memory → tap to flip'}
              </div>
            )}
          </div>

          {/* Content */}
          <div style={{ padding: '14px 16px 16px' }}>
            <div className="flex items-start justify-between gap-3 mb-2">
              <h2 style={{ fontSize: 17, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.3, flex: 1 }}>{item.title}</h2>
              {creator && (
                <Avatar name={creator.name} color={creator.avatar_color} size={24} />
              )}
            </div>

            <div className="flex items-center gap-2 mb-3">
              {region && (
                <span style={{
                  fontSize: 10,
                  background: 'var(--tape-bg)',
                  color: 'var(--tape-text)',
                  padding: '2px 7px',
                  borderRadius: 3,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}>
                  {region.name}
                </span>
              )}
              <span style={{
                fontSize: 10,
                background: item.mood === 'online' ? '#ddeedd' : '#dde4ee',
                color: item.mood === 'online' ? '#4a7a4a' : '#4a5a7a',
                padding: '2px 7px',
                borderRadius: 3,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}>
                {item.mood}
              </span>
            </div>

            {item.description && (
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 8 }}>{item.description}</p>
            )}

            {item.location && (
              <div className="flex items-center gap-1 mb-3" style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                <svg width="11" height="13" viewBox="0 0 11 13" fill="none">
                  <path d="M5.5 1C3.015 1 1 3.015 1 5.5c0 3.375 4.5 7 4.5 7s4.5-3.625 4.5-7C10 3.015 7.985 1 5.5 1z" stroke="currentColor" strokeWidth="1.2"/>
                  <circle cx="5.5" cy="5.5" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
                </svg>
                {item.location}
              </div>
            )}

            {/* Rating dots */}
            <div className="flex items-center gap-3 mb-3">
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>priority</span>
              <div className="flex items-center gap-1">
                {Array.from({ length: 10 }, (_, i) => {
                  const filled = i < myRating
                  const partnerFilled = partnerReaction?.rating ? i < partnerReaction.rating : false
                  return (
                    <button
                      key={i}
                      onClick={() => setRating(item.id, i + 1)}
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        border: `1.5px solid ${filled ? 'var(--text-primary)' : partnerFilled ? 'var(--text-secondary)' : 'var(--border)'}`,
                        background: filled ? 'var(--text-primary)' : partnerFilled ? 'var(--text-secondary)' : 'transparent',
                        transition: 'all 0.1s',
                        padding: 0,
                        cursor: 'pointer',
                      }}
                    />
                  )
                })}
              </div>
              {myRating > 0 && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{myRating}/10</span>}
            </div>

            {/* Heart */}
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => toggleHeart(item.id)}
                className="flex items-center gap-1.5 transition-transform active:scale-90"
              >
                <svg width="18" height="16" viewBox="0 0 18 16" fill="none">
                  <path
                    d="M9 14.5S1 9.5 1 4.5C1 2.567 2.567 1 4.5 1c1.2 0 2.3.6 3 1.5.7-.9 1.8-1.5 3-1.5C12.433 1 14 2.567 14 4.5"
                    stroke={myHeart ? '#c97b5a' : 'var(--text-muted)'}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    fill={myHeart ? '#c97b5a' : 'none'}
                  />
                  {partnerReaction?.heart && (
                    <path
                      d="M14 4.5c0-1.933 1.567-3.5 3.5-3.5"
                      stroke="#c97b5a"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  )}
                </svg>
                <span style={{ fontSize: 12, color: myHeart ? '#c97b5a' : 'var(--text-muted)' }}>
                  {myHeart ? 'loved' : 'love this'}
                </span>
              </button>
              {partnerReaction?.heart && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {getUserById(reactions.find(r => r.user_id !== user?.id && r.heart)?.user_id ?? '')?.name ?? 'them'} also loves it
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-wrap">
              {canCommit && (
                <button
                  onClick={() => { commitItem(item.id); onClose() }}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    background: 'var(--text-primary)',
                    color: 'var(--bg)',
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  commit to this
                </button>
              )}

              {item.status === 'committed' && (
                <>
                  <button
                    onClick={() => { completeItem(item.id); onClose() }}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      background: '#4a8a4a',
                      color: '#fff',
                      borderRadius: 6,
                      fontSize: 13,
                    }}
                  >
                    mark done
                  </button>
                </>
              )}

              {item.status === 'done' && !item.real_image_url && (
                <>
                  <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleRealPhotoUpload} />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      background: 'var(--tape-bg)',
                      color: 'var(--tape-text)',
                      borderRadius: 6,
                      fontSize: 13,
                    }}
                  >
                    {uploading ? 'developing…' : 'develop memory'}
                  </button>
                </>
              )}

              <button
                onClick={() => { deleteItem(item.id); onClose() }}
                style={{
                  padding: '8px 12px',
                  border: '1px solid var(--border)',
                  color: 'var(--text-muted)',
                  borderRadius: 6,
                  fontSize: 13,
                }}
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
