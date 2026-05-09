import { forwardRef } from 'react'
import { Dare, User } from '../types'

const DARE_CARD_WIDTH = 140
const DARE_PHOTO_HEIGHT = 100
const DARE_CAPTION_HEIGHT = 54
const DARE_PADDING = 8

export const DARE_CARD_WIDTH_EXPORT = DARE_CARD_WIDTH
export const DARE_CARD_TOTAL_HEIGHT = DARE_PADDING * 2 + DARE_PHOTO_HEIGHT + DARE_CAPTION_HEIGHT

function getDareRotation(id: string): number {
  const hash = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return ((hash % 60) - 30) / 12
}

function roleLabelText(dare: Dare, userId: string): string {
  if (dare.assigned_to === 'trade') return 'trade'
  if (dare.assigned_to === 'self') return 'self'
  return dare.created_by === userId ? 'your dare' : 'for you'
}

function roleLabelColor(dare: Dare, userId: string): string {
  if (dare.assigned_to === 'trade') return 'var(--color-teal)'
  if (dare.assigned_to === 'self') return 'var(--text-muted)'
  return dare.created_by === userId ? 'var(--text-muted)' : 'var(--amber)'
}

function statusColor(s: string): string {
  if (s === 'done') return '#4a8a4a'
  if (s === 'accepted') return '#c4a25a'
  if (s === 'skipped') return '#b57b7b'
  return '#9a9488'
}

interface DareCardProps {
  dare: Dare
  x: number
  y: number
  creator: User | null
  currentUserId: string
  onTap: () => void
  isDraggable: boolean
}

export const DareCard = forwardRef<HTMLDivElement, DareCardProps>(
  ({ dare, x, y, creator, currentUserId, onTap, isDraggable }, ref) => {
    const rotation = getDareRotation(dare.id)
    const isDone = dare.status === 'done'
    const isTradeBothDone = dare.assigned_to === 'trade' && dare.status === 'done' && dare.trade_status === 'done'
    const creatorColor = creator?.avatar_color ?? '#c8a86a'
    const roleText = roleLabelText(dare, currentUserId)
    const roleBg = roleLabelColor(dare, currentUserId)
    const cardHeight = DARE_PADDING * 2 + DARE_PHOTO_HEIGHT + DARE_CAPTION_HEIGHT

    const photoBackground = dare.completion_photo_url && isDone
      ? 'none'
      : `linear-gradient(135deg, #fdf8eb 0%, ${creatorColor}66 100%)`

    const greyFilter = isDone && dare.assigned_to !== 'trade' ? 'grayscale(0.5) brightness(0.97)' : isTradeBothDone ? 'grayscale(0.5) brightness(0.97)' : 'none'

    return (
      <div
        ref={ref}
        data-dare-id={dare.id}
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: DARE_CARD_WIDTH,
          height: cardHeight,
          cursor: isDraggable ? 'grab' : 'pointer',
          filter: greyFilter,
          transform: `rotate(${rotation}deg)`,
          userSelect: 'none',
          WebkitUserSelect: 'none',
          touchAction: 'none',
        }}
        onClick={onTap}
        className="polaroid-shadow"
      >
        {/* Polaroid frame */}
        <div style={{
          width: '100%', height: '100%',
          background: 'var(--bg-polaroid)',
          borderRadius: 3,
          padding: DARE_PADDING,
          position: 'relative',
          boxSizing: 'border-box',
        }}>
          {/* Photo area */}
          <div style={{
            width: '100%', height: DARE_PHOTO_HEIGHT,
            borderRadius: 1,
            overflow: 'hidden',
            position: 'relative',
            background: photoBackground,
          }}>
            {dare.completion_photo_url && isDone && (
              <img
                src={dare.completion_photo_url}
                alt={dare.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                draggable={false}
              />
            )}

            {/* Paper grain overlay */}
            <div style={{
              position: 'absolute', inset: 0, opacity: 0.06, mixBlendMode: 'multiply', pointerEvents: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`,
            }} />

            {/* Role label — top left */}
            <div style={{
              position: 'absolute', top: 5, left: 5,
              background: roleBg, color: '#fff',
              fontSize: 7, fontWeight: 600, padding: '2px 5px', borderRadius: 2,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              fontFamily: 'var(--font-sans)',
            }}>
              {roleText}
            </div>

            {/* Status badge — top right */}
            <div style={{
              position: 'absolute', top: 5, right: 5,
              background: statusColor(dare.status), color: '#fff',
              fontSize: 7, padding: '2px 5px', borderRadius: 2,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              fontFamily: 'var(--font-sans)',
            }}>
              {dare.status}
            </div>

            {/* Done stamp */}
            {(isDone || isTradeBothDone) && (
              <div style={{
                position: 'absolute', bottom: 6, right: 6,
                width: 34, height: 34, borderRadius: '50%',
                border: '2px solid rgba(74,138,74,0.9)',
                background: 'rgba(255,255,255,0.92)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                transform: 'rotate(-12deg)',
              }}>
                <span style={{ fontSize: 5, letterSpacing: '0.15em', color: '#4a8a4a', fontWeight: 700, textTransform: 'uppercase', lineHeight: 1 }}>DONE</span>
                <span style={{ fontSize: 11, color: '#4a8a4a', lineHeight: 1.1 }}>✓</span>
              </div>
            )}

            {/* Trade progress — bottom left: show both users' initials + tick */}
            {dare.assigned_to === 'trade' && creator && (
              <div style={{ position: 'absolute', bottom: 5, left: 5, display: 'flex', gap: 3, alignItems: 'center' }}>
                {/* Creator's indicator */}
                <div style={{ fontSize: 9, fontFamily: 'var(--font-sans)', fontWeight: 700, color: dare.trade_status === 'done' ? '#4a8a4a' : 'rgba(0,0,0,0.35)' }}>
                  {creator.name.charAt(0).toUpperCase()}{dare.trade_status === 'done' ? '✓' : ''}
                </div>
                <div style={{ width: 1, height: 8, background: 'rgba(0,0,0,0.2)' }} />
                {/* Assignee indicator */}
                <div style={{ fontSize: 9, fontFamily: 'var(--font-sans)', fontWeight: 700, color: dare.status === 'done' ? '#4a8a4a' : 'rgba(0,0,0,0.35)' }}>
                  {dare.status === 'done' ? '✓' : '?'}
                </div>
              </div>
            )}
          </div>

          {/* Caption */}
          <div style={{ paddingTop: 5, height: DARE_CAPTION_HEIGHT, overflow: 'hidden', boxSizing: 'border-box' }}>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--polaroid-text)',
              lineHeight: 1.35, fontWeight: 500,
              overflow: 'hidden', display: '-webkit-box',
              WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              marginBottom: 4,
            }}>
              {dare.title}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {/* Date */}
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--polaroid-text-muted)', letterSpacing: '0.06em' }}>
                {new Date(dare.created_at).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
              </div>
              {/* Creator avatar */}
              {creator && (
                <div style={{
                  width: 16, height: 16, borderRadius: '50%',
                  background: creator.avatar_color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 8, fontWeight: 700, color: '#fff',
                  fontFamily: 'var(--font-sans)',
                  border: '1.5px solid var(--bg-polaroid)',
                }}>
                  {creator.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }
)
DareCard.displayName = 'DareCard'
