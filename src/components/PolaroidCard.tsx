import { useState } from 'react'
import { motion } from 'framer-motion'
import { BucketItem, ITEM_THEMES, ItemTheme } from '../types'
import { getRotationFromSeed } from '../lib/rotation'
import { useApp } from '../context/AppContext'
import { Avatar } from './Avatar'

interface PolaroidCardProps {
  item: BucketItem
  isAbove: boolean
  isLocked: boolean
  onClick: () => void
  highlight?: boolean
  hideThread?: boolean
}

const CARD_WIDTH = 140
const CARD_PHOTO_HEIGHT = 110
const CARD_CAPTION_HEIGHT = 38
const CARD_PADDING = 8
const THREAD_LENGTH = 60

export const CARD_WIDTH_EXPORT = CARD_WIDTH
export const THREAD_LENGTH_EXPORT = THREAD_LENGTH

// Small heart SVG row used in the polaroid caption
function CardHearts({ filled, muted, small }: { filled: number; muted: boolean; small?: boolean }) {
  const w = small ? 6 : 8
  const h = small ? 5 : 7
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} width={w} height={h} viewBox="0 0 10 9" style={{ flexShrink: 0 }}>
          <path
            d="M5,8.5 C5,8.5 0.5,5 0.5,2.5 C0.5,1.1 1.6,0 3,0 C3.8,0 4.5,0.4 5,1 C5.5,0.4 6.2,0 7,0 C8.4,0 9.5,1.1 9.5,2.5 C9.5,5 5,8.5 5,8.5 Z"
            fill={i < filled ? (muted ? '#b0a898' : '#c8745a') : 'transparent'}
            stroke={muted ? '#c8c4bc' : '#c8745a'}
            strokeWidth="0.8"
          />
        </svg>
      ))}
    </div>
  )
}

// Small decorative SVG per theme, shown in styled mode
function ThemeDecoration({ theme }: { theme: ItemTheme }) {
  const color = ITEM_THEMES[theme].borderColor
  switch (theme) {
    case 'adventure':
      return (
        <svg width="22" height="13" viewBox="0 0 22 13" style={{ display: 'block' }}>
          <path d="M0,12 L6,2 L10,8 L14,2 L22,12 Z" fill={color} opacity="0.45" />
        </svg>
      )
    case 'splurge':
      return (
        <svg width="20" height="13" viewBox="0 0 20 13" style={{ display: 'block' }}>
          <polygon points="5,0 6.2,3.8 10,3.8 7,6 8.2,9.8 5,7.5 1.8,9.8 3,6 0,3.8 3.8,3.8" fill={color} opacity="0.45" />
          <polygon points="15,1 15.8,3.5 18.5,3.5 16.4,4.9 17.2,7.4 15,5.9 12.8,7.4 13.6,4.9 11.5,3.5 14.2,3.5" fill={color} opacity="0.3" />
        </svg>
      )
    case 'spicy':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" style={{ display: 'block' }}>
          <path d="M7,13 C3,9.5 1,6 4,3 C4,5.5 6,5.5 5.5,2.5 C8,4 10,7.5 8,10.5 C9,8.5 8,6.5 7,7 C8,9 8.5,11.5 7,13 Z" fill={color} opacity="0.5" />
        </svg>
      )
    case 'cozy':
      return (
        <svg width="22" height="13" viewBox="0 0 22 13" style={{ display: 'block' }}>
          <path d="M10,1 A4.5,4.5 0 1,1 2,9 A2.5,2.5 0 0,0 10,1 Z" fill={color} opacity="0.45" />
          <circle cx="17" cy="3" r="1.4" fill={color} opacity="0.4" />
          <circle cx="20" cy="8" r="0.9" fill={color} opacity="0.35" />
        </svg>
      )
    case 'experience':
      return (
        <svg width="22" height="13" viewBox="0 0 22 13" style={{ display: 'block' }}>
          <rect x="0" y="2" width="5" height="2.5" rx="1.2" fill={color} opacity="0.5" transform="rotate(-20 2.5 3.25)" />
          <rect x="8" y="0" width="5" height="2.5" rx="1.2" fill={color} opacity="0.55" transform="rotate(15 10.5 1.25)" />
          <rect x="16" y="3" width="4" height="2.5" rx="1.2" fill={color} opacity="0.4" transform="rotate(-10 18 4.25)" />
          <circle cx="5" cy="10" r="1.3" fill={color} opacity="0.4" />
          <circle cx="15" cy="11" r="1" fill={color} opacity="0.4" />
        </svg>
      )
    case 'other':
    default:
      return (
        <svg width="18" height="13" viewBox="0 0 18 13" style={{ display: 'block' }}>
          <path d="M9,0 C9.6,3 9.6,3 12.5,3.5 C9.6,4 9.6,4 9,7 C8.4,4 8.4,4 5.5,3.5 C8.4,3 8.4,3 9,0 Z" fill={color} opacity="0.5" />
          <circle cx="2" cy="10" r="1.2" fill={color} opacity="0.35" />
          <circle cx="16" cy="9" r="0.9" fill={color} opacity="0.35" />
        </svg>
      )
  }
}

function formatDateStamp(iso: string) {
  const d = new Date(iso)
  const mon = d.toLocaleString('en', { month: 'short' }).toLowerCase()
  const yr = String(d.getFullYear()).slice(2)
  return `${mon} · '${yr}`
}

export function PolaroidCard({ item, isAbove, isLocked, onClick, highlight, hideThread }: PolaroidCardProps) {
  const { user, getUserById, getItemReactions, polaroidStyle } = useApp()
  const [isFlipped, setIsFlipped] = useState(item.status === 'done' && !!item.real_image_url)
  const rotation = getRotationFromSeed(item.rotation_seed)
  const creator = getUserById(item.created_by)
  const dateStamp = formatDateStamp(item.created_at)

  const reactions = getItemReactions(item.id)
  const myReaction = reactions.find(r => r.user_id === user?.id)
  const partnerReaction = reactions.find(r => r.user_id !== user?.id)
  const myRating = myReaction?.rating ?? 0
  const partnerRating = partnerReaction?.rating ?? 0
  const hasRatings = myRating > 0 || partnerRating > 0

  const themeConfig = item.theme ? ITEM_THEMES[item.theme as ItemTheme] : null
  const showDecoration = polaroidStyle === 'styled' && themeConfig

  const cardHeight = CARD_PADDING * 2 + CARD_PHOTO_HEIGHT + CARD_CAPTION_HEIGHT

  const isProposed = item.status === 'proposed'
  const isDone = item.status === 'done'

  // Card background: solid color-mix gradient (no alpha/transparency)
  const cardBackground = showDecoration
    ? `linear-gradient(175deg, var(--bg-polaroid) 52%, color-mix(in srgb, var(--bg-polaroid) 80%, ${themeConfig!.borderColor}) 100%)`
    : 'var(--bg-polaroid)'

  // Outline ring in border mode
  const cardOutline = polaroidStyle === 'border' && themeConfig
    ? `2px solid ${themeConfig.borderColor}`
    : undefined

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
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}
      onClick={onClick}
    >
      {!isAbove && !hideThread && thread}

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
        whileTap={{ rotateY: 4, scale: 0.98 }}
        style={{
          width: CARD_WIDTH,
          height: cardHeight,
          background: cardBackground,
          borderRadius: 3,
          padding: CARD_PADDING,
          flexShrink: 0,
          position: 'relative',
          filter: isLocked ? 'blur(1.5px)' : 'none',
          outline: cardOutline,
          outlineOffset: '0px',
          color: 'var(--polaroid-text)',
          transformStyle: 'preserve-3d',
        }}
        className={`polaroid-shadow ${!isLocked ? 'polaroid-shadow-hover' : ''} no-select`}
      >
        {/* Photo area */}
        <div
          style={{
            width: '100%',
            height: CARD_PHOTO_HEIGHT,
            borderRadius: 1,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {!item.image_url && (
            <div style={{
              width: '100%', height: '100%',
              background: 'linear-gradient(135deg, #c69a4a 0%, #c8745a 55%, #a6602f 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>&amp;you</span>
            </div>
          )}
          {item.image_url && !isFlipped && (
            <img src={item.image_url} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} draggable={false} />
          )}
          {isFlipped && item.real_image_url && (
            <img src={item.real_image_url} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} draggable={false} />
          )}
          {/* film-edge inner shadow */}
          {(item.image_url || (isFlipped && item.real_image_url)) && (
            <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 8px 16px -8px rgba(0,0,0,0.4)', pointerEvents: 'none' }} />
          )}
          {/* paper grain overlay */}
          <div style={{
            position: 'absolute', inset: 0, opacity: 0.06, mixBlendMode: 'multiply', pointerEvents: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`,
          }} />

          {creator && (
            <div style={{ position: 'absolute', bottom: 4, left: 4 }}>
              <Avatar name={creator.name} color={creator.avatar_color} size={18} borderColor="#ffffff" borderWidth={1.5} />
            </div>
          )}

          {isProposed && (
            <div style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 7, padding: '2px 5px', borderRadius: 2, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              proposed
            </div>
          )}

          {isDone && (
            <div
              className="stamp-animate"
              style={{ position: 'absolute', top: 4, right: 4, width: 38, height: 38, borderRadius: '50%', border: '2px solid rgba(74,138,74,0.9)', boxShadow: 'inset 0 0 0 1px rgba(74,138,74,0.35)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.92)', transform: 'rotate(-10deg)' }}
            >
              <span style={{ fontSize: 5, letterSpacing: '0.15em', color: '#4a8a4a', fontWeight: 700, textTransform: 'uppercase', lineHeight: 1 }}>DONE</span>
              <span style={{ fontSize: 12, color: '#4a8a4a', lineHeight: 1.1 }}>✓</span>
            </div>
          )}

          {isLocked && (
            <div style={{ position: 'absolute', inset: 0, background: 'var(--lock-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
                  <rect x="1" y="5" width="8" height="6" rx="1" fill="white"/>
                  <path d="M3 5V3.5a2 2 0 0 1 4 0V5" stroke="white" strokeWidth="1.3"/>
                </svg>
              </div>
            </div>
          )}

          {isDone && item.real_image_url && (
            <button
              onClick={e => { e.stopPropagation(); setIsFlipped(f => !f) }}
              style={{ position: 'absolute', bottom: 4, right: 4, width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                <path d="M1 4.5C1 2.5 2.8 1 5 1s4 1.5 4 3.5" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
                <path d="M8 4.5C8 6.5 6.2 8 4 8S0 6.5 0 4.5" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>

        {/* Caption */}
        <div style={{ height: CARD_CAPTION_HEIGHT, paddingTop: 5, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ position: 'relative' }}>
            <div
              className="font-mono-tight"
              style={{
                color: 'var(--polaroid-text)',
                lineHeight: 1.3,
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: hasRatings ? 1 : 2,
                WebkitBoxOrient: 'vertical',
                paddingRight: showDecoration ? 24 : 0,
              }}
            >
              {item.title}
            </div>

            {/* Theme decoration: top-right of caption */}
            {showDecoration && (
              <div style={{ position: 'absolute', top: 0, right: 0 }}>
                <ThemeDecoration theme={item.theme as ItemTheme} />
              </div>
            )}
          </div>

          {/* Rating hearts — partner first (bigger), mine second (smaller) */}
          {hasRatings && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {partnerRating > 0 && <CardHearts filled={partnerRating} muted={false} />}
              {myRating > 0 && <CardHearts filled={myRating} muted small />}
            </div>
          )}

          {/* Date stamp */}
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--polaroid-text-muted)', letterSpacing: '0.08em', textAlign: 'center', lineHeight: 1 }}>
            {dateStamp}
          </div>
        </div>
      </motion.div>

      {isAbove && !hideThread && thread}
    </div>
  )
}
