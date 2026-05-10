import { Dare, User } from '../types'

export function getDareRotation(id: string): number {
  return ((id.charCodeAt(0) * 137 + 42) % 9) - 4
}

const SPROCKET_TOPS = [20, 53, 86]

interface DareCardProps {
  dare: Dare
  x: number
  y: number
  creator: User | null
  isLifted: boolean
  onMouseDown?: (e: React.MouseEvent<HTMLDivElement>) => void
  onTouchStart?: (e: React.TouchEvent<HTMLDivElement>) => void
}

export function DareCard({ dare, x, y, creator, isLifted, onMouseDown, onTouchStart }: DareCardProps) {
  const rotation = getDareRotation(dare.id)
  const hasImage = !!dare.completion_photo_url
  const badgeType = dare.assigned_to === 'trade' ? 'trade' : 'challenge'
  const creatorColor = creator?.avatar_color ?? '#c8a86a'

  const restingShadow = '0 4px 16px rgba(50,35,10,0.16), 0 1px 4px rgba(50,35,10,0.10)'
  const liftedShadow = '0 16px 40px rgba(50,35,10,0.28), 0 4px 12px rgba(50,35,10,0.16)'

  return (
    <div
      data-dare-id={dare.id}
      draggable={false}
      onDragStart={e => e.preventDefault()}
      onContextMenu={e => e.preventDefault()}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: 140,
        background: 'var(--bg-polaroid)',
        borderRadius: 3,
        overflow: 'hidden',
        boxShadow: isLifted ? liftedShadow : restingShadow,
        zIndex: isLifted ? 20 : 5,
        transform: `rotate(${rotation}deg) scale(${isLifted ? 1.04 : 1})`,
        transition: isLifted
          ? 'box-shadow 150ms ease-out, transform 150ms ease-out'
          : 'box-shadow 200ms ease-in, transform 200ms ease-in',
        cursor: isLifted ? 'grabbing' : 'pointer',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'none',
        // @ts-ignore
        WebkitUserDrag: 'none',
        WebkitTouchCallout: 'none',
      }}
    >
      {/* Photo area */}
      <div style={{
        width: '100%',
        height: 110,
        position: 'relative',
        overflow: 'hidden',
        background: hasImage ? 'none' : 'linear-gradient(160deg, #0e0c08, #1e1608, #0e0c08)',
      }}>
        {hasImage ? (
          <img
            src={dare.completion_photo_url!}
            alt={dare.title}
            draggable={false}
            onDragStart={e => e.preventDefault()}
            onContextMenu={e => e.preventDefault()}
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              // @ts-ignore
              WebkitUserDrag: 'none',
              WebkitTouchCallout: 'none',
            }}
          />
        ) : (
          <>
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 4,
            }}>
              <div style={{
                fontFamily: 'Georgia, serif',
                fontStyle: 'italic',
                fontSize: 13,
                color: 'rgba(255,220,160,0.45)',
              }}>
                &amp;you
              </div>
              <div style={{
                fontFamily: "'Courier New', monospace",
                fontSize: 7,
                letterSpacing: '0.14em',
                color: 'rgba(255,255,255,0.18)',
                textTransform: 'uppercase',
              }}>
                UNEXPOSED
              </div>
            </div>
            {SPROCKET_TOPS.map(top => (
              <div key={`l${top}`} style={{
                position: 'absolute', left: 3, top,
                width: 4, height: 4, borderRadius: 1,
                background: 'rgba(255,255,255,0.10)',
              }} />
            ))}
            {SPROCKET_TOPS.map(top => (
              <div key={`r${top}`} style={{
                position: 'absolute', right: 3, top,
                width: 4, height: 4, borderRadius: 1,
                background: 'rgba(255,255,255,0.10)',
              }} />
            ))}
          </>
        )}

        {/* Category badge — top-left */}
        {dare.category && (
          <div style={{
            position: 'absolute', top: 5, left: 5,
            background: 'rgba(255,255,255,0.82)',
            color: '#6b5e48',
            fontFamily: "'Caveat', cursive",
            fontSize: 12,
            padding: '1px 6px',
            borderRadius: 8,
            maxWidth: 80,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {dare.category}
          </div>
        )}

        {/* Type badge — bottom-left */}
        <div style={{
          position: 'absolute', bottom: 5, left: 5,
          fontSize: 8, fontWeight: 700,
          letterSpacing: '0.06em', textTransform: 'uppercase',
          padding: '2px 5px', borderRadius: 3,
          background: badgeType === 'trade'
            ? 'rgba(80,100,160,0.85)'
            : 'rgba(212,144,10,0.85)',
          color: '#fff',
        }}>
          {badgeType}
        </div>

        {/* Creator avatar — bottom-right */}
        {creator && (
          <div style={{
            position: 'absolute', bottom: 5, right: 5,
            width: 14, height: 14, borderRadius: '50%',
            background: creatorColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 8, fontWeight: 700, color: '#fff',
            fontFamily: 'var(--font-sans)',
          }}>
            {creator.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Caption strip */}
      <div style={{
        height: 36,
        background: 'var(--bg-polaroid)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 8px',
        overflow: 'hidden',
      }}>
        <div style={{
          fontFamily: "'Courier New', monospace",
          fontSize: 9,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#9a8e7a',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          width: '100%',
          textAlign: 'center',
        }}>
          {dare.title}
        </div>
      </div>
    </div>
  )
}
