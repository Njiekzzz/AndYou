import { useRef, useState, useEffect, useCallback } from 'react'
import { BucketItem } from '../types'

// ─── Types ───────────────────────────────────────────────────────────────────
interface DummyItem {
  id: number
  side: 'left' | 'right'
  yOffset: number
  date: string
  title: string
  location: string | null
  caption: string
  status: 'committed' | 'proposed'
  creator: string
  proposedBy?: string
  photoGradient: string | null
}
interface DummyZone {
  id: string
  y: number
  prefix: string
  name: string
  dateRange: string | null
}

// ─── Hardcoded data (Section 11) ─────────────────────────────────────────────
const ZONES: DummyZone[] = [
  { id: 'z1', y: 60,   prefix: 'This', name: 'fortnight', dateRange: 'APR 14 – 28' },
  { id: 'z2', y: 560,  prefix: 'Next', name: 'visit',     dateRange: 'MAY 02' },
  { id: 'z3', y: 1060, prefix: 'This', name: 'summer',    dateRange: 'JUN – AUG' },
  { id: 'z4', y: 1560, prefix: 'Long', name: 'term',      dateRange: null },
]

const ITEMS: DummyItem[] = [
  {
    id: 1, side: 'left', yOffset: 140,
    date: 'APR 16', title: 'Sunset at Kuta', location: 'Bali · Indonesia',
    caption: 'KUTA SUNSET', status: 'committed', creator: 'J',
    photoGradient: 'linear-gradient(160deg, #f0a050, #c06820, #2a6080)',
  },
  {
    id: 2, side: 'right', yOffset: 320,
    date: 'APR 22', title: 'Saturday picnic', location: null,
    caption: 'UNDEVELOPED', status: 'proposed', creator: 'T',
    proposedBy: 'Lena', photoGradient: null,
  },
  {
    id: 3, side: 'left', yOffset: 660,
    date: 'MAY 10', title: 'Stanley Park walk', location: 'Vancouver · BC',
    caption: 'STANLEY PK', status: 'committed', creator: 'J',
    photoGradient: 'linear-gradient(160deg, #6090b0, #304860, #a0c0a0)',
  },
  {
    id: 4, side: 'right', yOffset: 840,
    date: 'MAY 18', title: 'Night market', location: 'Vancouver · BC',
    caption: 'NIGHT MKT', status: 'committed', creator: 'T',
    photoGradient: 'linear-gradient(160deg, #c08040, #603820, #402010)',
  },
  {
    id: 5, side: 'left', yOffset: 1160,
    date: 'JUN 21', title: 'Cabin weekend', location: 'Whistler · BC',
    caption: 'WHISTLER', status: 'proposed', creator: 'J',
    proposedBy: 'you', photoGradient: null,
  },
]

// ─── Dimensions ──────────────────────────────────────────────────────────────
const TOPBAR_H    = 64
const RAIL_H      = 44
const BOTTOMNAV_H = 72
const PHOTO_H     = 140
const CAPTION_H   = 44
const CARD_W      = 160
const STUB_W      = 28
const NODE_D      = 10

// Photo-area vertical center (used for node + stub alignment)
const PHOTO_CENTER = PHOTO_H / 2  // 70

function cardRotation(idx: number) {
  return ((idx * 137 + 42) % 9) - 4
}

// Avatar colors per creator initial
const AVATAR_COLORS: Record<string, string> = { J: '#c8a86a', T: '#8a9abf' }

// ─── Props (kept for MainApp compatibility) ───────────────────────────────────
interface TimelineCanvasProps {
  onItemClick: (item: BucketItem) => void
  spinTarget?: string | null
}

// ─── Component ───────────────────────────────────────────────────────────────
export function TimelineCanvas({ onItemClick: _unused1, spinTarget: _unused2 }: TimelineCanvasProps) {
  const canvasRef  = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const dragStartY = useRef(0)
  const dragStartScroll = useRef(0)
  const [activeZoneId, setActiveZoneId] = useState('z1')

  // ── IntersectionObserver — active zone chip ──────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            const id = e.target.getAttribute('data-zone-id')
            if (id) setActiveZoneId(id)
          }
        })
      },
      { root: canvas, threshold: 0.3 }
    )
    canvas.querySelectorAll('[data-zone-id]').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  // ── Desktop drag-to-scroll ───────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current     = true
    dragStartY.current     = e.clientY
    dragStartScroll.current = canvasRef.current?.scrollTop ?? 0
    e.preventDefault()
  }, [])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !canvasRef.current) return
    canvasRef.current.scrollTop = dragStartScroll.current + (dragStartY.current - e.clientY)
  }, [])

  const stopDrag = useCallback(() => { isDragging.current = false }, [])

  const scrollToZone = (zone: DummyZone) => {
    canvasRef.current?.scrollTo({ top: Math.max(0, zone.y - 20), behavior: 'smooth' })
  }

  return (
    <div style={{
      position: 'fixed',
      top: TOPBAR_H,
      left: 0, right: 0,
      bottom: BOTTOMNAV_H,
      display: 'flex',
      flexDirection: 'column',
    }}>

      {/* ── SECTION 5: Region jump rail ───────────────────────────────────── */}
      <div style={{
        height: RAIL_H, flexShrink: 0,
        background: 'var(--topbar-bg)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid var(--cream-dark)',
        display: 'flex', alignItems: 'center',
        padding: '0 20px', gap: 0,
        overflowX: 'auto',
        scrollbarWidth: 'none',
      }}>
        {ZONES.map((zone, i) => {
          const isActive = activeZoneId === zone.id
          return (
            <button
              key={zone.id}
              onClick={() => scrollToZone(zone)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                paddingRight: 16,
                background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0,
              }}
            >
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--amber)', lineHeight: 1 }}>
                {i === 0 ? '→' : '›'}
              </span>
              <span style={{
                fontFamily: 'var(--font-sans)', fontSize: 13,
                fontWeight: isActive ? 500 : 400,
                color: isActive ? 'var(--amber)' : 'var(--text-mid)',
                transition: 'color 0.15s',
              }}>
                {zone.prefix} {zone.name}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── SECTION 6: Scrollable canvas ─────────────────────────────────── */}
      <div
        ref={canvasRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
        style={{
          flex: 1,
          overflowY: 'scroll',
          overflowX: 'hidden',
          scrollbarWidth: 'none',
          background: 'var(--cream)',
          backgroundImage: 'radial-gradient(circle, var(--dot-color) 1.2px, transparent 1.2px)',
          backgroundSize: '18px 18px',
          backgroundAttachment: 'local',
          cursor: isDragging.current ? 'grabbing' : 'default',
          WebkitOverflowScrolling: 'touch',
        } as React.CSSProperties}
      >
        {/* Inner positioned canvas */}
        <div style={{ position: 'relative', minHeight: 2400, paddingTop: 40, paddingBottom: 120 }}>

          {/* ── SECTION 6: Dashed spine ──────────────────────────────────── */}
          <div style={{
            position: 'absolute',
            top: 0, bottom: 0,
            left: 'calc(50% - 1px)',
            width: 0,
            borderLeft: '1.5px dashed var(--spine-color)',
            pointerEvents: 'none',
          }} />

          {/* ── SECTION 7: Zone markers ──────────────────────────────────── */}
          {ZONES.map(zone => (
            <div
              key={zone.id}
              data-zone-id={zone.id}
              style={{
                position: 'absolute',
                top: zone.y,
                left: '50%',
                transform: 'translateX(-50%)',
                height: 40,
                display: 'flex', alignItems: 'center',
                padding: '0 20px', gap: 5,
                background: 'var(--cream-dark)',
                border: '1.5px solid var(--spine-color)',
                borderRadius: 20,
                whiteSpace: 'nowrap',
                zIndex: 10,
              }}
            >
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 400, color: 'var(--text-dark)' }}>
                {zone.prefix}
              </span>
              <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 15, fontWeight: 400, color: 'var(--amber)' }}>
                {zone.name}
              </span>
              {zone.dateRange && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 300, color: 'var(--text-muted)', marginLeft: 5, letterSpacing: '0.04em' }}>
                  {zone.dateRange}
                </span>
              )}
            </div>
          ))}

          {/* ── SECTIONS 8–10: Items ─────────────────────────────────────── */}
          {ITEMS.map((item, idx) => {
            const rotation  = cardRotation(idx)
            const isLeft    = item.side === 'left'
            const isProposed = item.status === 'proposed'
            const avatarBg  = AVATAR_COLORS[item.creator] ?? '#c8a86a'

            return (
              <div
                key={item.id}
                style={{
                  position: 'absolute',
                  top: item.yOffset,
                  left: 0, right: 0,
                  height: PHOTO_H + CAPTION_H,
                }}
              >
                {/* ── SECTION 8: Spine node ───────────────────────────── */}
                <div style={{
                  position: 'absolute',
                  top: PHOTO_CENTER - NODE_D / 2,
                  left: `calc(50% - ${NODE_D / 2}px)`,
                  width: NODE_D, height: NODE_D,
                  borderRadius: '50%',
                  background: isProposed ? 'transparent' : 'var(--node-committed)',
                  border: isProposed ? '1.5px solid var(--node-proposed)' : 'none',
                  zIndex: 6,
                }} />

                {/* ── SECTION 9: Stub line ────────────────────────────── */}
                <div style={{
                  position: 'absolute',
                  top: PHOTO_CENTER - 0.5,
                  ...(isLeft
                    ? { left: `calc(50% - ${STUB_W}px)`, width: STUB_W }
                    : { left: '50%', width: STUB_W }
                  ),
                  height: 1,
                  backgroundImage: 'repeating-linear-gradient(to right, var(--spine-color) 0, var(--spine-color) 3px, transparent 3px, transparent 7px)',
                }} />

                {/* ── SECTION 10: Polaroid card ───────────────────────── */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  ...(isLeft
                    ? { right: `calc(50% + ${STUB_W}px)` }
                    : { left:  `calc(50% + ${STUB_W}px)` }
                  ),
                  width: CARD_W,
                  transform: `rotate(${rotation}deg)`,
                  transformOrigin: 'center top',
                  opacity: isProposed ? 0.6 : 1,
                  background: 'var(--card-bg)',
                  boxShadow: 'var(--card-shadow)',
                  borderRadius: 3,
                  overflow: 'hidden',
                  cursor: 'pointer',
                }}>
                  {/* Photo area */}
                  <div style={{
                    width: '100%',
                    height: PHOTO_H,
                    background: isProposed
                      ? 'linear-gradient(135deg, #c8a060, #8a5a30)'
                      : (item.photoGradient ?? 'linear-gradient(135deg, #c8a060, #8a5a30)'),
                    position: 'relative',
                    overflow: 'hidden',
                  }}>
                    {isProposed && (
                      <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', gap: 5,
                      }}>
                        <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 16, color: '#fff' }}>
                          &amp;you
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>
                          UNDEVELOPED
                        </span>
                      </div>
                    )}
                    {/* Creator avatar */}
                    <div style={{
                      position: 'absolute', bottom: 8, left: 8,
                      width: 22, height: 22, borderRadius: '50%',
                      background: avatarBg,
                      border: '2px solid rgba(255,255,255,0.85)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-sans)', fontSize: 9, fontWeight: 600, color: '#fff',
                    }}>
                      {item.creator}
                    </div>
                  </div>

                  {/* Caption strip */}
                  <div style={{
                    width: '100%', height: CAPTION_H,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 10px',
                    background: 'var(--card-bg)',
                  }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      color: 'var(--text-muted)',
                    }}>
                      {item.caption}
                    </span>
                  </div>
                </div>

                {/* Text block — opposite side from card */}
                <div style={{
                  position: 'absolute',
                  top: 10,
                  ...(isLeft
                    ? { left: 'calc(50% + 16px)', right: 14, textAlign: 'left' as const }
                    : { left: 14, right: 'calc(50% + 16px)', textAlign: 'right' as const }
                  ),
                  pointerEvents: 'none',
                }}>
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11, fontWeight: 300,
                    color: 'var(--text-muted)',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    marginBottom: 6, lineHeight: 1,
                  }}>
                    {item.date}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 17, fontWeight: 600,
                    color: 'var(--text-dark)',
                    lineHeight: 1.2,
                    marginBottom: 4,
                  }}>
                    {item.title}
                  </div>
                  {!isProposed && item.location && (
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-muted)', fontWeight: 400 }}>
                      {item.location}
                    </div>
                  )}
                  {isProposed && item.proposedBy && (
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      proposed by {item.proposedBy}
                    </div>
                  )}
                </div>

              </div>
            )
          })}

        </div>{/* end inner canvas */}
      </div>{/* end scrollable canvas */}
    </div>
  )
}
