import { useState } from 'react'
import { motion } from 'framer-motion'
import { BucketItem } from '../types'
import { getRotationFromSeed } from '../lib/rotation'
import { useApp } from '../context/AppContext'
import { Avatar } from './Avatar'

interface PolaroidCardProps {
  item: BucketItem
  isAbove: boolean
  isLocked: boolean
  onClick: () => void
  highlight?: boolean
}

const CARD_WIDTH = 140
const CARD_PHOTO_HEIGHT = 110
const CARD_CAPTION_HEIGHT = 38
const CARD_PADDING = 8
const THREAD_LENGTH = 60

export const CARD_WIDTH_EXPORT = CARD_WIDTH
export const THREAD_LENGTH_EXPORT = THREAD_LENGTH

export function PolaroidCard({ item, isAbove, isLocked, onClick, highlight }: PolaroidCardProps) {
  const { getUserById } = useApp()
  // Show real photo by default when done — it's what matters most
  const [isFlipped, setIsFlipped] = useState(item.status === 'done' && !!item.real_image_url)
  const rotation = getRotationFromSeed(item.rotation_seed)
  const creator = getUserById(item.created_by)

  const cardHeight = CARD_PADDING * 2 + CARD_PHOTO_HEIGHT + CARD_CAPTION_HEIGHT

  const handleClick = () => {
    if (item.status === 'done' && item.real_image_url) {
      // long press handled separately; tap opens card
    }
    onClick()
  }

  const isProposed = item.status === 'proposed'
  const isDone = item.status === 'done'

  const thread = (
    <div
      style={{
        width: 1,
        height: THREAD_LENGTH,
        background: 'var(--thread-color)',
        opacity: isProposed ? 0.35 : 0.6,
        flexShrink: 0,
      }}
    />
  )

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        cursor: 'pointer',
      }}
      onClick={handleClick}
    >
      {/* Above string: card on top, thread hangs down to string */}
      {/* Below string: thread first up to string, card hangs below */}
      {!isAbove && thread}

      {/* Card */}
      <motion.div
        layoutId={`polaroid-${item.id}`}
        animate={{
          rotate: rotation,
          scale: highlight ? [1, 1.08, 1.04] : 1,
          opacity: isProposed ? 0.38 : 1,
        }}
        transition={highlight
          ? { scale: { duration: 0.5, repeat: 3, ease: 'easeInOut' }, rotate: { duration: 0 } }
          : { duration: 0 }
        }
        whileHover={{ scale: isLocked ? 1 : 1.04, rotate: isLocked ? rotation : rotation * 0.7 }}
        style={{
          width: CARD_WIDTH,
          height: cardHeight,
          background: 'var(--bg-card)',
          borderRadius: 3,
          padding: CARD_PADDING,
          flexShrink: 0,
          position: 'relative',
          filter: isLocked ? 'blur(1.5px)' : 'none',
        }}
        className={`polaroid-shadow ${!isLocked ? 'polaroid-shadow-hover' : ''} no-select`}
      >
        {/* Photo area */}
        <div
          style={{
            width: '100%',
            height: CARD_PHOTO_HEIGHT,
            background: item.image_url ? undefined : 'var(--border)',
            borderRadius: 1,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {item.image_url && !isFlipped && (
            <img
              src={item.image_url}
              alt={item.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              draggable={false}
            />
          )}
          {isFlipped && item.real_image_url && (
            <img
              src={item.real_image_url}
              alt={item.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              draggable={false}
            />
          )}
          {!item.image_url && (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" opacity={0.3}>
                <rect x="3" y="5" width="18" height="14" rx="2" stroke="var(--text-secondary)" strokeWidth="1.5"/>
                <circle cx="8.5" cy="10.5" r="1.5" stroke="var(--text-secondary)" strokeWidth="1.5"/>
                <path d="M21 15l-5-5-4 4-2-2-4 4" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          )}

          {/* Creator avatar */}
          {creator && (
            <div style={{ position: 'absolute', bottom: 4, left: 4 }}>
              <Avatar
                name={creator.name}
                color={creator.avatar_color}
                size={18}
                borderColor="var(--avatar-border)"
                borderWidth={1.5}
              />
            </div>
          )}

          {/* Proposed badge */}
          {isProposed && (
            <div
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                background: 'rgba(0,0,0,0.6)',
                color: '#fff',
                fontSize: 7,
                padding: '2px 5px',
                borderRadius: 2,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              proposed
            </div>
          )}

          {/* Done stamp — rubber stamp style */}
          {isDone && (
            <div
              className="stamp-animate"
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                width: 38,
                height: 38,
                borderRadius: '50%',
                border: '2px solid rgba(74,138,74,0.9)',
                boxShadow: 'inset 0 0 0 1px rgba(74,138,74,0.35)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255,255,255,0.92)',
                transform: 'rotate(-10deg)',
              }}
            >
              <span style={{ fontSize: 5, letterSpacing: '0.15em', color: '#4a8a4a', fontWeight: 700, textTransform: 'uppercase', lineHeight: 1 }}>DONE</span>
              <span style={{ fontSize: 12, color: '#4a8a4a', lineHeight: 1.1 }}>✓</span>
            </div>
          )}

          {/* Lock overlay */}
          {isLocked && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'var(--lock-overlay)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: '#111',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
                  <rect x="1" y="5" width="8" height="6" rx="1" fill="white"/>
                  <path d="M3 5V3.5a2 2 0 0 1 4 0V5" stroke="white" strokeWidth="1.3"/>
                </svg>
              </div>
            </div>
          )}

          {/* Flip indicator for done items with real photo */}
          {isDone && item.real_image_url && (
            <button
              onClick={e => { e.stopPropagation(); setIsFlipped(f => !f) }}
              style={{
                position: 'absolute',
                bottom: 4,
                right: 4,
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                <path d="M1 4.5C1 2.5 2.8 1 5 1s4 1.5 4 3.5" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
                <path d="M8 4.5C8 6.5 6.2 8 4 8S0 6.5 0 4.5" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>

        {/* Caption */}
        <div style={{ height: CARD_CAPTION_HEIGHT, paddingTop: 6, overflow: 'hidden' }}>
          <div
            className="font-mono-tight"
            style={{
              color: 'var(--text-primary)',
              lineHeight: 1.3,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {item.title}
          </div>
        </div>
      </motion.div>

      {/* Above string: thread hangs down from card bottom to string */}
      {isAbove && thread}
    </div>
  )
}
