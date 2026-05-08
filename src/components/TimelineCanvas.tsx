import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { BucketItem, Region, ItemTheme, ITEM_THEMES } from '../types'

// ─── Dimensions ──────────────────────────────────────────────────────────────
const TOPBAR_H     = 64
const BOTTOMNAV_H  = 72
const RAIL_H       = 44
const PHOTO_H      = 130
const CAPTION_H    = 40
const CARD_W       = 160
const STUB_W       = 28
const NODE_D       = 10
const PHOTO_CENTER = PHOTO_H / 2        // 65
const ITEM_SLOT_H  = 200
const ZONE_PAD_TOP = 60
const ZONE_PILL_H  = 40
const ZONE_AFTER_H = 40
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

  return { zones, positions, totalHeight: Math.max(y + 80, 400) }
}

// ─── Props ───────────────────────────────────────────────────────────────────
interface TimelineCanvasProps {
  onItemClick: (item: BucketItem) => void
  spinTarget?: string | null
}

// ─── Themed polaroid border SVG overlay ──────────────────────────────────────
function ThemeBorderSVG({ theme }: { theme: ItemTheme | null | undefined }) {
  if (!theme || !(theme in ITEM_THEMES)) return null
  const c = ITEM_THEMES[theme].borderColor
  const W = CARD_W
  const H = PHOTO_H + CAPTION_H  // 170

  const border = (
    <rect x="1" y="1" width={W - 2} height={H - 2} rx="2"
      fill="none" stroke={c} strokeWidth="1.8" opacity="0.55" />
  )

  let deco: React.ReactNode = null

  if (theme === 'adventure') {
    deco = <>
      {/* Pine trees — top-left */}
      <path d="M4,38 L11,22 L18,38Z" fill={c} opacity="0.22"/>
      <path d="M6,31 L11,17 L16,31Z" fill={c} opacity="0.26"/>
      <path d="M8,24 L11,12 L14,24Z" fill={c} opacity="0.28"/>
      <rect x="10" y="38" width="2" height="5" fill={c} opacity="0.22"/>
      {/* Mountain ridge — bottom-right */}
      <path d={`M${W-44},${H-2} L${W-28},${H-22} L${W-18},${H-12} L${W-8},${H-26} L${W-2},${H-14} L${W-2},${H-2}Z`} fill={c} opacity="0.18"/>
      {/* Leaf — top-right */}
      <path d={`M${W-4},6 C${W-16},4 ${W-20},18 ${W-8},18 C${W-4},18 ${W-2},12 ${W-4},6Z`} fill={c} opacity="0.24"/>
      <line x1={W-4} y1="6" x2={W-12} y2="16" stroke={c} strokeWidth="0.8" opacity="0.35"/>
      {/* Pebbles — bottom-left */}
      <ellipse cx="8" cy={H-5} rx="6" ry="3" fill={c} opacity="0.16"/>
      <ellipse cx="19" cy={H-6} rx="4" ry="2.5" fill={c} opacity="0.16"/>
      <ellipse cx="28" cy={H-5} rx="3" ry="2" fill={c} opacity="0.13"/>
    </>
  } else if (theme === 'splurge') {
    deco = <>
      {/* Diamond outlines — all 4 corners */}
      <path d="M10,2 L17,9 L10,16 L3,9Z" fill={c} fillOpacity="0.18" stroke={c} strokeWidth="1" strokeOpacity="0.55"/>
      <path d={`M${W-10},2 L${W-3},9 L${W-10},16 L${W-17},9Z`} fill={c} fillOpacity="0.18" stroke={c} strokeWidth="1" strokeOpacity="0.55"/>
      <path d={`M10,${H-16} L17,${H-9} L10,${H-2} L3,${H-9}Z`} fill={c} fillOpacity="0.18" stroke={c} strokeWidth="1" strokeOpacity="0.55"/>
      <path d={`M${W-10},${H-16} L${W-3},${H-9} L${W-10},${H-2} L${W-17},${H-9}Z`} fill={c} fillOpacity="0.18" stroke={c} strokeWidth="1" strokeOpacity="0.55"/>
      {/* Coin rings — midway on sides */}
      <circle cx="3" cy={H / 2} r="7" fill="none" stroke={c} strokeWidth="1" opacity="0.35"/>
      <circle cx="3" cy={H / 2} r="4" fill="none" stroke={c} strokeWidth="0.6" opacity="0.25"/>
      <circle cx={W - 3} cy={H / 2} r="7" fill="none" stroke={c} strokeWidth="1" opacity="0.35"/>
      <circle cx={W - 3} cy={H / 2} r="4" fill="none" stroke={c} strokeWidth="0.6" opacity="0.25"/>
      {/* Tiny gem dots along top */}
      <circle cx={W / 2} cy="3" r="2" fill={c} opacity="0.4"/>
      <circle cx={W / 2 - 12} cy="3" r="1.2" fill={c} opacity="0.3"/>
      <circle cx={W / 2 + 12} cy="3" r="1.2" fill={c} opacity="0.3"/>
    </>
  } else if (theme === 'spicy') {
    deco = <>
      {/* Flames — top-left */}
      <path d="M5,26 C5,19 9,16 7,9 C11,13 10,20 14,16 C13,21 11,24 13,29 C10,27 8,22 5,26Z" fill={c} opacity="0.28"/>
      <path d="M12,28 C12,22 16,20 14,14 C17,18 16,23 20,20 C19,25 17,27 19,31 C16,30 14,25 12,28Z" fill={c} opacity="0.24"/>
      {/* Flames — bottom-right */}
      <path d={`M${W-5},${H-26} C${W-5},${H-19} ${W-9},${H-16} ${W-7},${H-9} C${W-11},${H-13} ${W-10},${H-20} ${W-14},${H-16} C${W-13},${H-21} ${W-11},${H-24} ${W-13},${H-29} C${W-10},${H-27} ${W-8},${H-22} ${W-5},${H-26}Z`} fill={c} opacity="0.28"/>
      {/* Small hearts — top-right */}
      <path d={`M${W-9},7 C${W-9},5 ${W-7},4 ${W-7},6 C${W-7},4 ${W-5},5 ${W-5},7 C${W-5},9 ${W-7},11 ${W-7},11 C${W-7},11 ${W-9},9 ${W-9},7Z`} fill={c} opacity="0.5"/>
      <path d={`M${W-15},12 C${W-15},10.5 ${W-13.5},9.5 ${W-13.5},11.5 C${W-13.5},9.5 ${W-12},10.5 ${W-12},12 C${W-12},13.5 ${W-13.5},15 ${W-13.5},15 C${W-13.5},15 ${W-15},13.5 ${W-15},12Z`} fill={c} opacity="0.4"/>
      {/* Heart — bottom-left */}
      <path d={`M7,${H-16} C7,${H-18} 9,${H-19} 9,${H-17} C9,${H-19} 11,${H-18} 11,${H-16} C11,${H-14} 9,${H-12} 9,${H-12} C9,${H-12} 7,${H-14} 7,${H-16}Z`} fill={c} opacity="0.45"/>
      {/* Dot trail */}
      <circle cx={W / 2 - 6} cy="3" r="1.5" fill={c} opacity="0.35"/>
      <circle cx={W / 2} cy="3" r="2" fill={c} opacity="0.4"/>
      <circle cx={W / 2 + 6} cy="3" r="1.5" fill={c} opacity="0.35"/>
    </>
  } else if (theme === 'cozy') {
    deco = <>
      {/* Crescent moon — top-right */}
      <path d={`M${W-5},4 C${W-15},6 ${W-18},18 ${W-9},22 C${W-22},20 ${W-22},6 ${W-5},4Z`} fill={c} opacity="0.45"/>
      {/* 4-point star — top-left */}
      <path d="M12,2 L13.8,7.2 L19,9 L13.8,10.8 L12,16 L10.2,10.8 L5,9 L10.2,7.2Z" fill={c} opacity="0.35"/>
      {/* Small star — bottom-right */}
      <path d={`M${W-11},${H-18} L${W-9.5},${H-22} L${W-8},${H-18} L${W-4},${H-16.5} L${W-8},${H-15} L${W-9.5},${H-11} L${W-11},${H-15} L${W-15},${H-16.5}Z`} fill={c} opacity="0.3"/>
      {/* Tiny star dots */}
      <circle cx="4" cy="4" r="1.2" fill={c} opacity="0.5"/>
      <circle cx="24" cy="9" r="0.9" fill={c} opacity="0.35"/>
      <circle cx={W / 2} cy="4" r="1.2" fill={c} opacity="0.35"/>
      <circle cx={W - 32} cy="8" r="0.8" fill={c} opacity="0.28"/>
      <circle cx="8" cy="32" r="0.9" fill={c} opacity="0.28"/>
      {/* Cloud — bottom-left */}
      <path d={`M2,${H-8} Q7,${H-16} 16,${H-12} Q16,${H-20} 26,${H-17} Q28,${H-20} 32,${H-16} Q40,${H-17} 40,${H-9} Q40,${H-1} 2,${H-1} Q0,${H-1} 2,${H-8}Z`} fill={c} opacity="0.15"/>
    </>
  } else if (theme === 'experience') {
    deco = <>
      {/* 8-point starburst — top-left */}
      <path d="M12,2 L13.4,7 L17.5,4.5 L15.5,9 L20.5,9.5 L16.5,12 L20,15.5 L14.8,14.5 L14,20 L11.5,15.2 L7.5,18.5 L8.5,13.2 L3,12.5 L7.5,10 L4.5,5.5 L9.5,7.8Z" fill={c} opacity="0.28"/>
      {/* Confetti rectangles — top-right */}
      <rect x={W - 16} y="3" width="5" height="3" rx="1" fill={c} opacity="0.35" transform={`rotate(22,${W - 13},4.5)`}/>
      <rect x={W - 9} y="7" width="4" height="2.5" rx="1" fill={c} opacity="0.3" transform={`rotate(-32,${W - 7},8.25)`}/>
      <rect x={W - 22} y="8" width="3.5" height="2" rx="0.5" fill={c} opacity="0.25" transform={`rotate(50,${W - 20},9)`}/>
      <circle cx={W - 18} cy="4" r="2.2" fill={c} opacity="0.3"/>
      <circle cx={W - 6} cy="13" r="1.5" fill={c} opacity="0.25"/>
      {/* Confetti — bottom-left */}
      <rect x="4" y={H - 14} width="4.5" height="2.5" rx="1" fill={c} opacity="0.3" transform={`rotate(-28,6.25,${H - 12.75})`}/>
      <rect x="11" y={H - 9} width="3" height="2" rx="0.5" fill={c} opacity="0.25" transform={`rotate(42,12.5,${H - 8})`}/>
      <circle cx="7" cy={H - 7} r="2" fill={c} opacity="0.3"/>
      {/* Star — bottom-right */}
      <path d={`M${W - 10},${H - 20} L${W - 8.5},${H - 25} L${W - 7},${H - 20} L${W - 2},${H - 18} L${W - 7},${H - 16} L${W - 8.5},${H - 11} L${W - 10},${H - 16} L${W - 15},${H - 18}Z`} fill={c} opacity="0.3"/>
      {/* Dots along top */}
      <circle cx={W / 2} cy="3" r="1.8" fill={c} opacity="0.32"/>
      <circle cx={W / 2 - 10} cy="4" r="1.1" fill={c} opacity="0.25"/>
      <circle cx={W / 2 + 10} cy="4" r="1.1" fill={c} opacity="0.25"/>
    </>
  }

  return (
    <svg
      width={W} height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 4 }}
    >
      {border}
      {deco}
    </svg>
  )
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

// ─── Film sprocket holes ──────────────────────────────────────────────────────
function SprocketHoles({ side }: { side: 'left' | 'right' }) {
  return (
    <>
      {[0.25, 0.5, 0.75].map(frac => (
        <div
          key={frac}
          style={{
            position: 'absolute',
            [side]: 3,
            top: `calc(${frac * 100}% - 2px)`,
            width: 4, height: 4,
            borderRadius: 1,
            background: 'rgba(255,255,255,0.10)',
          }}
        />
      ))}
    </>
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

  // suppress unused warning — kept for potential future nav use
  void scrollToRegion

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

          {/* ── Zone markers ─────────────────────────────────────────────── */}
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

          {/* ── Items ────────────────────────────────────────────────────── */}
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

            const itemReactions = reactions[item.id] ?? []
            const myReaction      = itemReactions.find(r => r.user_id === user?.id)
            const partnerReaction = itemReactions.find(r => r.user_id !== user?.id)
            const myRating      = myReaction?.rating ?? 0
            const partnerRating = partnerReaction?.rating ?? 0
            const partnerUser   = partnerReaction ? getUserById(partnerReaction.user_id) : null
            const displayRating = myRating || partnerRating

            const hasDate = !!(item.date && item.date.trim())

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
                  border: isProposed ? '1.5px solid #b0a898' : 'none',
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
                  backgroundImage: isProposed
                    ? 'repeating-linear-gradient(to right, rgba(196,184,154,0.5) 0, rgba(196,184,154,0.5) 3px, transparent 3px, transparent 7px)'
                    : 'repeating-linear-gradient(to right, var(--spine-color) 0, var(--spine-color) 3px, transparent 3px, transparent 7px)',
                }} />

                {/* ── Polaroid card ─────────────────────────────────────── */}
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
                    opacity: isProposed ? 0.65 : 1,
                    background: 'var(--card-bg)',
                    boxShadow: '0 4px 16px rgba(50,35,10,0.16), 0 1px 4px rgba(50,35,10,0.10)',
                    borderRadius: 3,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    zIndex: 2,
                  }}
                >
                  {/* Photo area */}
                  <div style={{
                    width: '100%', height: PHOTO_H,
                    background: hasPhoto
                      ? 'transparent'
                      : 'linear-gradient(160deg, #0e0c08, #1e1608, #0e0c08)',
                    position: 'relative', overflow: 'hidden',
                  }}>
                    {hasPhoto && (
                      <img
                        src={photoSrc!}
                        alt={item.title}
                        loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    )}

                    {!hasPhoto && (
                      <>
                        {/* Film negative placeholder */}
                        <div style={{
                          position: 'absolute', inset: 0,
                          display: 'flex', flexDirection: 'column',
                          alignItems: 'center', justifyContent: 'center', gap: 4,
                        }}>
                          <span style={{
                            fontFamily: 'Georgia, serif', fontStyle: 'italic',
                            fontSize: 14, color: 'rgba(255,220,160,0.45)',
                          }}>&amp;you</span>
                          <span style={{
                            fontFamily: "'Courier New', monospace",
                            fontSize: 8, letterSpacing: '0.14em',
                            color: 'rgba(255,255,255,0.18)',
                            textTransform: 'uppercase',
                          }}>UNEXPOSED</span>
                        </div>
                        {/* Film sprocket holes */}
                        <SprocketHoles side="left" />
                        <SprocketHoles side="right" />
                      </>
                    )}

                    {/* Creator avatar — bottom-left */}
                    {creator && (
                      <div style={{
                        position: 'absolute', bottom: 6, left: 6,
                        width: 20, height: 20, borderRadius: '50%',
                        background: creator.avatar_color,
                        border: '1.5px solid rgba(255,255,255,0.85)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--font-sans)', fontSize: 8, fontWeight: 600, color: '#fff',
                        zIndex: 3,
                      }}>
                        {creator.name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    {/* Partner heart reaction — top-right (only if not done, to avoid overlap with stamp) */}
                    {partnerRating > 0 && !isDone && (
                      <div style={{
                        position: 'absolute', top: 5, right: 5,
                        width: 18, height: 18, borderRadius: '50%',
                        background: 'rgba(255,255,255,0.85)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 4, pointerEvents: 'none',
                      }}>
                        <svg width="10" height="10" viewBox="0 0 24 22">
                          <path
                            d="M12 21l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21z"
                            fill="#e05070"
                          />
                        </svg>
                      </div>
                    )}

                    {/* Rating badge — bottom-right */}
                    {displayRating > 0 && (
                      <div style={{
                        position: 'absolute', bottom: 6, right: 6,
                        background: 'var(--amber)', color: '#fff',
                        fontFamily: "'Courier New', monospace", fontSize: 9,
                        padding: '1px 5px', borderRadius: 3,
                        zIndex: 3, pointerEvents: 'none',
                        lineHeight: 1.4,
                      }}>
                        {displayRating}
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
                        zIndex: 5, pointerEvents: 'none',
                      }}>
                        <span style={{ fontSize: 5, letterSpacing: '0.15em', color: '#4a8a4a', fontWeight: 700, textTransform: 'uppercase', lineHeight: 1 }}>DONE</span>
                        <span style={{ fontSize: 13, color: '#4a8a4a', lineHeight: 1.1 }}>✓</span>
                      </div>
                    )}
                  </div>

                  {/* Caption strip */}
                  <div style={{
                    width: '100%', height: CAPTION_H,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0 8px', gap: 4,
                    background: 'var(--card-bg)',
                  }}>
                    {isProposed ? (
                      <span style={{
                        flex: 1, textAlign: 'center',
                        fontFamily: 'Georgia, serif', fontStyle: 'italic',
                        fontSize: 10, color: '#b0a070', letterSpacing: '0.02em',
                      }}>
                        proposed
                      </span>
                    ) : (
                      <>
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
                      </>
                    )}
                  </div>

                  {/* Themed border overlay */}
                  {item.theme && <ThemeBorderSVG theme={item.theme as ItemTheme} />}
                </div>

                {/* ── Text block — opposite side ────────────────────────── */}
                <div style={{
                  position: 'absolute',
                  top: 10,
                  ...(isLeft
                    ? { left: 'calc(50% + 16px)', textAlign: 'left' as const }
                    : { right: 'calc(50% + 16px)', textAlign: 'right' as const }
                  ),
                  maxWidth: 80,
                  pointerEvents: 'none',
                }}>
                  {hasDate && (
                    <div style={{
                      fontFamily: "'Courier New', monospace",
                      fontSize: 9, fontWeight: 300,
                      color: 'var(--text-muted)',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      marginBottom: 4, lineHeight: 1,
                    }}>
                      {item.date}
                    </div>
                  )}
                  <div style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 14, fontWeight: 600,
                    color: 'var(--text-dark)',
                    lineHeight: 1.2, marginBottom: 3,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {item.title}
                  </div>
                  {isProposed ? (
                    <div style={{
                      fontFamily: 'var(--font-sans)', fontSize: 11,
                      color: '#b0a070', fontStyle: 'italic',
                    }}>
                      by {creator?.name ?? ''}
                    </div>
                  ) : item.mood === 'online' ? (
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: '#3a7a78', fontWeight: 500 }}>
                      online
                    </div>
                  ) : item.location ? (
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>
                      {item.location}
                    </div>
                  ) : null}
                </div>

              </div>
            )
          })}

        </div>{/* end inner canvas */}
      </div>{/* end scrollable canvas */}
    </div>
  )
}
