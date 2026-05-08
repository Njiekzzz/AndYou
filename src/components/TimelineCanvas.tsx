import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { BucketItem, Region } from '../types'

// ─── Dimensions ──────────────────────────────────────────────────────────────
const TOPBAR_H     = 64
const BOTTOMNAV_H  = 72
const RAIL_H       = 44
const PHOTO_H      = 140
const CAPTION_H    = 44
const CARD_W       = 160
const STUB_W       = 28
const NODE_D       = 10
const PHOTO_CENTER = PHOTO_H / 2        // 70
const ITEM_SLOT_H  = 220
const ZONE_PAD_TOP = 40
const ZONE_PILL_H  = 40
const ZONE_AFTER_H = 80
const REGION_GAP   = 60

function cardRotation(seed: number) {
  return ((seed % 9)) - 4
}

interface LayoutZone { regionId: string; y: number }
interface LayoutItem { itemId: string; y: number; side: 'left' | 'right' }

function buildLayout(regions: Region[], items: BucketItem[]) {
  const zones: LayoutZone[] = []
  const positions: LayoutItem[] = []
  let y = ZONE_PAD_TOP
  let globalIdx = 0

  for (const region of regions) {
    zones.push({ regionId: region.id, y })
    y += ZONE_PILL_H + ZONE_AFTER_H

    const regionItems = items
      .filter(i => i.region_id === region.id)
      .sort((a, b) => a.position - b.position)

    for (const item of regionItems) {
      positions.push({ itemId: item.id, y, side: globalIdx % 2 === 0 ? 'left' : 'right' })
      y += ITEM_SLOT_H
      globalIdx++
    }

    y += REGION_GAP
  }

  return { zones, positions, totalHeight: Math.max(y + 120, 800) }
}

// ─── Props ───────────────────────────────────────────────────────────────────
interface TimelineCanvasProps {
  onItemClick: (item: BucketItem) => void
  spinTarget?: string | null
}

// ─── Mini heart vote badge ────────────────────────────────────────────────────
function HeartVote({ rating, color }: { rating: number; color: string }) {
  return (
    <div style={{ position: 'relative', width: 22, height: 20, flexShrink: 0 }}>
      <svg width="22" height="20" viewBox="0 0 24 22" fill="none">
        <path
          d="M12 21l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21z"
          fill={rating > 0 ? color : 'none'}
          stroke={color}
          strokeWidth="1.4"
          opacity={rating > 0 ? 0.85 : 0.28}
        />
      </svg>
      {rating > 0 && (
        <span style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-mono)', fontSize: 7, fontWeight: 700,
          color: '#fff', lineHeight: 1, marginTop: -1,
        }}>
          {rating}
        </span>
      )}
    </div>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────
export function TimelineCanvas({ onItemClick }: TimelineCanvasProps) {
  const { items, regions, reactions, user, getUserById } = useApp()
  const canvasRef   = useRef<HTMLDivElement>(null)
  const railRef     = useRef<HTMLDivElement>(null)
  const isDragging  = useRef(false)
  const dragStartY  = useRef(0)
  const dragStartScroll = useRef(0)
  const [activeRegionId, setActiveRegionId] = useState<string>(regions[0]?.id ?? '')

  const { zones, positions, totalHeight } = useMemo(
    () => buildLayout(regions, items),
    [regions, items]
  )

  const posMap = useMemo(() => {
    const m = new Map<string, LayoutItem>()
    positions.forEach(p => m.set(p.itemId, p))
    return m
  }, [positions])

  const zoneMap = useMemo(() => {
    const m = new Map<string, LayoutZone>()
    zones.forEach(z => m.set(z.regionId, z))
    return m
  }, [zones])

  // ── IntersectionObserver — active region chip ─────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            const id = e.target.getAttribute('data-region-id')
            if (id) setActiveRegionId(id)
          }
        })
      },
      { root: canvas, threshold: 0.1 }
    )
    canvas.querySelectorAll('[data-region-id]').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [zones])

  // ── Seed active region when regions load ─────────────────────────────────
  useEffect(() => {
    if (regions.length > 0 && !activeRegionId) {
      setActiveRegionId(regions[0].id)
    }
  }, [regions, activeRegionId])

  // ── Center active region chip in rail ────────────────────────────────────
  useEffect(() => {
    const rail = railRef.current
    if (!rail || !activeRegionId) return
    const chip = rail.querySelector(`[data-nav-id="${activeRegionId}"]`) as HTMLElement
    if (!chip) return
    const targetScroll = chip.offsetLeft - rail.offsetWidth / 2 + chip.offsetWidth / 2
    rail.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' })
  }, [activeRegionId])

  // ── Desktop drag-to-scroll ────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true
    dragStartY.current = e.clientY
    dragStartScroll.current = canvasRef.current?.scrollTop ?? 0
    e.preventDefault()
  }, [])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !canvasRef.current) return
    canvasRef.current.scrollTop = dragStartScroll.current + (dragStartY.current - e.clientY)
  }, [])

  const stopDrag = useCallback(() => { isDragging.current = false }, [])

  const scrollToRegion = useCallback((regionId: string) => {
    const zone = zoneMap.get(regionId)
    if (!zone || !canvasRef.current) return
    canvasRef.current.scrollTo({ top: Math.max(0, zone.y - 20), behavior: 'smooth' })
  }, [zoneMap])

  return (
    <div style={{
      position: 'fixed',
      top: TOPBAR_H, left: 0, right: 0, bottom: BOTTOMNAV_H,
      display: 'flex', flexDirection: 'column',
    }}>

      {/* ── Region indicator rail ────────────────────────────────────────── */}
      <div
        ref={railRef}
        style={{
          height: RAIL_H, flexShrink: 0,
          background: 'var(--topbar-bg)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderBottom: '1px solid var(--cream-dark)',
          display: 'flex', alignItems: 'center',
          padding: '0 20px', gap: 0,
          overflowX: 'auto', scrollbarWidth: 'none',
          pointerEvents: 'none',
        }}
      >
        {regions.map((region, i) => {
          const isActive = activeRegionId === region.id
          return (
            <div
              key={region.id}
              data-nav-id={region.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                paddingRight: 16, flexShrink: 0,
              }}
            >
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: isActive ? 'var(--amber)' : 'var(--text-muted)', lineHeight: 1, transition: 'color 0.2s' }}>
                {i === 0 ? '→' : '›'}
              </span>
              <span style={{
                fontFamily: 'var(--font-sans)', fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--amber)' : 'var(--text-muted)',
                opacity: isActive ? 1 : 0.45,
                transition: 'color 0.2s, opacity 0.2s, font-weight 0.2s',
              }}>
                {region.name}
              </span>
            </div>
          )
        })}
      </div>

      {/* ── Scrollable canvas ────────────────────────────────────────────── */}
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
          WebkitOverflowScrolling: 'touch',
          willChange: 'transform',
        } as React.CSSProperties}
      >
        {/* Inner positioned canvas */}
        <div style={{ position: 'relative', minHeight: totalHeight, paddingBottom: 120 }}>

          {/* ── Spine line ───────────────────────────────────────────────── */}
          <div style={{
            position: 'absolute',
            top: 0, bottom: 0,
            left: '50%',
            width: '2px',
            background: 'var(--spine-color)',
            transform: 'translateX(-50%)',
            zIndex: 1,
            pointerEvents: 'none',
            boxShadow: '0 0 6px rgba(196,184,154,0.4)',
          }} />

          {/* ── Zone markers (from real regions) ─────────────────────────── */}
          {zones.map(zone => {
            const region = regions.find(r => r.id === zone.regionId)
            if (!region) return null
            return (
              <div
                key={zone.regionId}
                data-region-id={zone.regionId}
                id={`zone-${zone.regionId}`}
                style={{
                  position: 'absolute',
                  top: zone.y,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  height: ZONE_PILL_H,
                  display: 'flex', alignItems: 'center',
                  padding: '0 20px', gap: 6,
                  background: 'var(--cream-dark)',
                  border: '1.5px solid var(--spine-color)',
                  borderRadius: 20,
                  whiteSpace: 'nowrap',
                  zIndex: 3,
                }}
              >
                <span style={{
                  fontFamily: 'var(--font-serif)', fontStyle: 'italic',
                  fontSize: 15, fontWeight: 400, color: 'var(--amber)',
                }}>
                  {region.name}
                </span>
                {region.unlock_date && (
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 300,
                    color: 'var(--text-muted)', letterSpacing: '0.04em',
                  }}>
                    {new Date(region.unlock_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>
            )
          })}

          {/* ── Items (from real items state) ─────────────────────────────── */}
          {items.map(item => {
            const pos = posMap.get(item.id)
            if (!pos) return null

            const { y: yOffset, side } = pos
            const isLeft     = side === 'left'
            const isProposed = item.status === 'proposed'
            const isDone     = item.status === 'done'
            const photoSrc   = isDone && item.real_image_url ? item.real_image_url : item.image_url
            const hasPhoto   = !!(photoSrc)
            const rotation   = cardRotation(item.rotation_seed)
            const creator    = getUserById(item.created_by)

            // Both users' ratings for caption hearts
            const itemReactions = reactions[item.id] ?? []
            const myReaction      = itemReactions.find(r => r.user_id === user?.id)
            const partnerReaction = itemReactions.find(r => r.user_id !== user?.id)
            const myRating      = myReaction?.rating ?? 0
            const partnerRating = partnerReaction?.rating ?? 0
            const partnerUser   = partnerReaction ? getUserById(partnerReaction.user_id) : null

            return (
              <div
                key={item.id}
                style={{
                  position: 'absolute',
                  top: yOffset,
                  left: 0, right: 0,
                  height: PHOTO_H + CAPTION_H,
                  zIndex: 2,
                }}
              >
                {/* Spine node */}
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

                {/* Stub line */}
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

                {/* Polaroid card */}
                <div
                  onClick={() => onItemClick(item)}
                  style={{
                    position: 'absolute',
                    top: 0,
                    ...(isLeft
                      ? { right: `calc(50% + ${STUB_W}px)` }
                      : { left:  `calc(50% + ${STUB_W}px)` }
                    ),
                    width: CARD_W,
                    transform: `rotate(${rotation}deg)`,
                    transformOrigin: 'center top',
                    opacity: isProposed ? 0.75 : 1,
                    background: 'var(--card-bg)',
                    boxShadow: '0 6px 20px rgba(60,40,10,0.22), 0 2px 6px rgba(60,40,10,0.12)',
                    borderRadius: 3,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    zIndex: 2,
                  }}
                >
                  {/* Photo area */}
                  <div style={{
                    width: '100%', height: PHOTO_H,
                    background: 'linear-gradient(135deg, #c8a060, #8a5a30)',
                    position: 'relative', overflow: 'hidden',
                  }}>
                    {hasPhoto ? (
                      <img
                        src={photoSrc!}
                        alt={item.title}
                        loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    ) : (
                      <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', gap: 5,
                      }}>
                        <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 16, color: '#fff' }}>
                          &amp;you
                        </span>
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontSize: 9,
                          letterSpacing: '0.2em', color: 'rgba(255,255,255,0.6)',
                          textTransform: 'uppercase',
                        }}>
                          UNDEVELOPED
                        </span>
                      </div>
                    )}

                    {/* Creator avatar */}
                    {creator && (
                      <div style={{
                        position: 'absolute', bottom: 8, left: 8,
                        width: 22, height: 22, borderRadius: '50%',
                        background: creator.avatar_color,
                        border: '2px solid rgba(255,255,255,0.85)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--font-sans)', fontSize: 9, fontWeight: 600, color: '#fff',
                      }}>
                        {creator.name.charAt(0).toUpperCase()}
                      </div>
                    )}


                    {/* Done stamp */}
                    {isDone && (
                      <div style={{
                        position: 'absolute', top: 6, right: 6,
                        width: 38, height: 38, borderRadius: '50%',
                        border: '2px solid rgba(74,138,74,0.85)',
                        boxShadow: 'inset 0 0 0 1px rgba(74,138,74,0.3)',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(255,255,255,0.88)',
                        transform: 'rotate(-14deg)',
                        zIndex: 5,
                        pointerEvents: 'none',
                      }}>
                        <span style={{ fontSize: 5, letterSpacing: '0.15em', color: '#4a8a4a', fontWeight: 700, textTransform: 'uppercase', lineHeight: 1 }}>DONE</span>
                        <span style={{ fontSize: 13, color: '#4a8a4a', lineHeight: 1.1 }}>✓</span>
                      </div>
                    )}
                  </div>

                  {/* Caption strip — title + both heart votes */}
                  <div style={{
                    width: '100%', height: CAPTION_H,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0 8px', gap: 4,
                    background: 'var(--card-bg)',
                  }}>
                    <HeartVote rating={myRating} color={user?.avatar_color ?? '#e0a04a'} />
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 8,
                      textTransform: 'uppercase', letterSpacing: '0.1em',
                      color: 'var(--text-muted)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      flex: 1, textAlign: 'center',
                    }}>
                      {item.title}
                    </span>
                    <HeartVote rating={partnerRating} color={partnerUser?.avatar_color ?? '#8a9abf'} />
                  </div>
                </div>

                {/* Text block — opposite side */}
                <div style={{
                  position: 'absolute',
                  top: 10,
                  ...(isLeft
                    ? { left: 'calc(50% + 16px)', right: 14, textAlign: 'left' as const }
                    : { left: 14, right: 'calc(50% + 16px)', textAlign: 'right' as const }
                  ),
                  pointerEvents: 'none',
                  background: 'rgba(245,240,230,0.82)',
                  borderRadius: 8,
                  padding: '6px 8px',
                  boxShadow: '0 2px 12px rgba(60,40,10,0.10)',
                  backdropFilter: 'blur(2px)',
                }}>
                  {/* Date or placeholder */}
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10, fontWeight: 300,
                    color: item.date ? 'var(--text-muted)' : 'var(--spine-color)',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    marginBottom: 5, lineHeight: 1,
                    fontStyle: item.date ? 'normal' : 'italic',
                  }}>
                    {item.date ?? 'to be planned'}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 16, fontWeight: 600,
                    color: 'var(--text-dark)',
                    lineHeight: 1.2, marginBottom: 3,
                    textShadow: '0 1px 4px rgba(245,240,230,0.6)',
                  }}>
                    {item.title}
                  </div>
                  {/* Location: show 'online' if mood is online, else show location if set */}
                  {item.mood === 'online' ? (
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: '#3a7a78', fontWeight: 500 }}>
                      online
                    </div>
                  ) : item.location ? (
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>
                      {item.location}
                    </div>
                  ) : null}
                  {isProposed && (
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 2 }}>
                      proposed
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
