import { useRef, useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useApp } from '../context/AppContext'
import { PolaroidCard, CARD_WIDTH_EXPORT } from './PolaroidCard'
import { Region, BucketItem } from '../types'
import { StickerSvg, STICKER_TYPES, DECORATE_COLORS } from './StickerSvg'

// ─── Layout constants ────────────────────────────────────────────────────────
const CARD_W = CARD_WIDTH_EXPORT          // 140
const CARD_H = 164                        // card body only (photo + caption + padding)
const TOPBAR_HEIGHT = 52
const BOTTOMNAV_HEIGHT = 64
const STUB = 22                           // px from spine centerline to card edge
const NODE_R = 6                          // spine node radius
const ITEM_SPACING = 210                  // top-to-top distance between cards
const ZONE_H = 44                         // zone pill height
const ZONE_MB = 14                        // gap below zone pill to first item
const REGION_MB = 22                      // gap after last item to next zone pill
const PAD_TOP = 12
const PAD_BOT = 110

// ─── Layout computation ──────────────────────────────────────────────────────
interface LayoutItem  { item: BucketItem; y: number; isLeft: boolean; regionId: string }
interface LayoutZone  { region: Region;   y: number }

function buildLayout(items: BucketItem[], regions: Region[]) {
  const sorted = [...regions].sort((a, b) => a.order - b.order)
  const byRegion: Record<string, BucketItem[]> = {}
  sorted.forEach(r => { byRegion[r.id] = [] })
  items.forEach(it => { if (byRegion[it.region_id] !== undefined) byRegion[it.region_id].push(it) })

  let y = PAD_TOP
  let gi = 0
  const layoutItems: LayoutItem[] = []
  const layoutZones: LayoutZone[] = []

  sorted.forEach(region => {
    layoutZones.push({ region, y })
    y += ZONE_H + ZONE_MB

    const list = byRegion[region.id] ?? []
    list.forEach(item => {
      layoutItems.push({ item, y, isLeft: gi % 2 === 0, regionId: region.id })
      y += ITEM_SPACING
      gi++
    })
    if (list.length === 0) y += 32
    y += REGION_MB
  })

  return { layoutItems, layoutZones, totalHeight: y + PAD_BOT }
}

// ─── Component ───────────────────────────────────────────────────────────────
interface TimelineCanvasProps {
  onItemClick: (item: BucketItem) => void
  spinTarget?: string | null
}

export function TimelineCanvas({ onItemClick, spinTarget }: TimelineCanvasProps) {
  const { items, regions, stickers, addSticker, removeSticker } = useApp()
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollY, setScrollY]   = useState(0)
  const scrollYRef              = useRef(0)
  const isDragging              = useRef(false)
  const dragStart               = useRef({ y: 0, scrollY: 0 })
  const velocity                = useRef(0)
  const lastY                   = useRef(0)
  const lastTime                = useRef(0)
  const rafId                   = useRef<number>(0)
  const [, forceUpdate]         = useState(0)

  useEffect(() => { scrollYRef.current = scrollY }, [scrollY])

  const [isDecorateMode, setIsDecorateMode] = useState(false)
  const [activeColor,   setActiveColor]     = useState(DECORATE_COLORS[0])
  const [activeSType,   setActiveSType]     = useState<string>('heart')

  const isLocked = useCallback((r: Region) =>
    !!(r.unlock_date && new Date(r.unlock_date) > new Date()), [])

  const { layoutItems, layoutZones, totalHeight } = buildLayout(items, regions)
  const containerH = window.innerHeight - TOPBAR_HEIGHT - BOTTOMNAV_HEIGHT - 40 // 40 = rail height

  const maxScroll   = useCallback(() => Math.max(0, totalHeight - containerH), [totalHeight, containerH])
  const clamp       = useCallback((v: number) => Math.max(0, Math.min(v, maxScroll())), [maxScroll])

  // ── Pointer handlers ──────────────────────────────────────────────────────
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (isDecorateMode) {
      const rect = containerRef.current?.getBoundingClientRect()
      addSticker({
        type: activeSType as 'heart'|'star'|'sparkle'|'flower',
        x: e.clientX,
        y: e.clientY - (rect?.top ?? 0) + scrollYRef.current,
        size: 40,
        rotation: Math.round(Math.random() * 24 - 12),
        color: activeColor,
      })
      return
    }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    isDragging.current  = true
    dragStart.current   = { y: e.clientY, scrollY: scrollYRef.current }
    lastY.current       = e.clientY
    lastTime.current    = performance.now()
    velocity.current    = 0
    cancelAnimationFrame(rafId.current)
  }, [isDecorateMode, activeSType, activeColor, addSticker])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (isDecorateMode || !isDragging.current) return
    const dy  = dragStart.current.y - e.clientY
    const now = performance.now()
    const dt  = now - lastTime.current
    if (dt > 0) velocity.current = (lastY.current - e.clientY) / dt
    lastY.current    = e.clientY
    lastTime.current = now
    setScrollY(clamp(dragStart.current.scrollY + dy))
  }, [isDecorateMode, clamp])

  const onPointerUp = useCallback((_e: React.PointerEvent) => {
    if (isDecorateMode || !isDragging.current) return
    isDragging.current = false
    const go = () => {
      velocity.current *= 0.92
      if (Math.abs(velocity.current) < 0.1) return
      setScrollY(prev => clamp(prev + velocity.current * 16))
      rafId.current = requestAnimationFrame(go)
    }
    rafId.current = requestAnimationFrame(go)
  }, [isDecorateMode, clamp])

  const onWheel = useCallback((e: React.WheelEvent) => {
    if (isDecorateMode) return
    e.preventDefault()
    setScrollY(prev => clamp(prev + e.deltaY))
  }, [isDecorateMode, clamp])

  // ── Spin-to-item ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!spinTarget) return
    const target = layoutItems.find(p => p.item.id === spinTarget)
    if (!target) return
    const to = clamp(target.y - containerH / 2 + CARD_H / 2)
    const from = scrollYRef.current
    const t0 = performance.now()
    const go = (now: number) => {
      const t = Math.min(1, (now - t0) / 1200)
      setScrollY(from + (to - from) * (1 - Math.pow(1 - t, 3)))
      if (t < 1) requestAnimationFrame(go)
      else forceUpdate(n => n + 1)
    }
    requestAnimationFrame(go)
  }, [spinTarget]) // eslint-disable-line react-hooks/exhaustive-deps

  const sortedRegions = [...regions].sort((a, b) => a.order - b.order)

  return (
    <div style={{ position: 'fixed', top: TOPBAR_HEIGHT, left: 0, right: 0, bottom: BOTTOMNAV_HEIGHT, display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>

      {/* ── Region jump rail ──────────────────────────────────────────────── */}
      <div
        onPointerDown={e => e.stopPropagation()}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          padding: '0 20px',
          height: 40,
          flexShrink: 0,
          overflowX: 'auto',
          scrollbarWidth: 'none',
          borderBottom: '1px solid var(--nav-border)',
          background: 'var(--nav-bg)',
          backdropFilter: 'blur(10px)',
        }}
      >
        {sortedRegions.map((r, i) => {
          const zone = layoutZones.find(z => z.region.id === r.id)
          return (
            <button
              key={r.id}
              onClick={() => zone && setScrollY(clamp(zone.y - 8))}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '0 10px 0 0',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                color: i === 0 ? '#e0a04a' : 'var(--text-secondary)',
                letterSpacing: '0.04em',
              }}>
                {i === 0 ? '→' : '↗'}
              </span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--text-secondary)',
                letterSpacing: '0.06em',
                whiteSpace: 'nowrap',
              }}>
                {r.name}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Scrollable canvas ─────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="dot-grid no-select"
        style={{
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
          cursor: isDecorateMode ? 'crosshair' : (isDragging.current ? 'grabbing' : 'grab'),
          touchAction: 'none',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        {/* Canvas inner (scrolled) */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: totalHeight,
          transform: `translateY(${-scrollY}px)`,
          willChange: 'transform',
        }}>

          {/* ── Vertical spine ──────────────────────────────────────────── */}
          <div style={{
            position: 'absolute',
            top: 0, bottom: 0,
            left: '50%',
            width: 1,
            background: 'var(--string-color)',
            opacity: 0.55,
          }} />

          {/* ── Stickers ─────────────────────────────────────────────────── */}
          {stickers.map(s => (
            <motion.div
              key={s.id}
              initial={{ y: -20, opacity: 0, scale: 0.6 }}
              animate={{ y: 0, opacity: 1, scale: 1, rotate: [0, 8, -4, 0] }}
              transition={{
                y:      { type: 'spring', stiffness: 320, damping: 14 },
                opacity:{ duration: 0.2 },
                scale:  { type: 'spring', stiffness: 320, damping: 14 },
                rotate: { duration: 0.5, ease: 'easeOut' as const },
              }}
              style={{
                position: 'absolute', left: s.x, top: s.y,
                transform: `translate(-50%,-50%) rotate(${s.rotation}deg)`,
                zIndex: 3,
                cursor: isDecorateMode ? 'pointer' : 'default',
                pointerEvents: isDecorateMode ? 'auto' : 'none',
              }}
              onPointerDown={e => { if (!isDecorateMode) return; e.stopPropagation(); removeSticker(s.id) }}
            >
              <StickerSvg type={s.type} size={s.size} color={s.color} />
            </motion.div>
          ))}

          {/* ── Zone pills ───────────────────────────────────────────────── */}
          {layoutZones.map(({ region, y }) => (
            <div
              key={region.id}
              style={{
                position: 'absolute',
                top: y,
                left: '50%',
                transform: 'translateX(-50%)',
                height: ZONE_H,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '0 18px',
                background: 'var(--tape-bg)',
                border: '1px solid rgba(224,160,74,0.22)',
                borderRadius: 999,
                zIndex: 10,
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                fontSize: 15,
                fontWeight: 300,
                letterSpacing: '-0.01em',
                color: 'var(--text-primary)',
              }}>
                {region.name}
              </span>
            </div>
          ))}

          {/* ── Items ────────────────────────────────────────────────────── */}
          {layoutItems.map(({ item, y, isLeft, regionId }) => {
            const region     = regions.find(r => r.id === regionId)
            const locked     = region ? isLocked(region) : false
            const committed  = item.status === 'committed' || item.status === 'done'
            const nodeY      = y + CARD_H / 2

            const dateStr = new Date(item.created_at).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric',
            }).toUpperCase()

            // Card left edge position
            const cardLeft = isLeft
              ? `calc(50% - ${STUB + CARD_W}px)`
              : `calc(50% + ${STUB}px)`

            // Stub from spine to card
            const stubLeft  = isLeft ? `calc(50% - ${STUB}px)` : '50%'

            return (
              <div key={item.id}>

                {/* Stub line */}
                <div style={{
                  position: 'absolute',
                  top: nodeY,
                  left: stubLeft,
                  width: STUB,
                  height: 1,
                  background: 'var(--string-color)',
                  opacity: 0.4,
                }} />

                {/* Spine node */}
                <div style={{
                  position: 'absolute',
                  top: nodeY - NODE_R,
                  left: `calc(50% - ${NODE_R}px)`,
                  width: NODE_R * 2,
                  height: NODE_R * 2,
                  borderRadius: '50%',
                  background: committed ? '#e0a04a' : 'var(--bg)',
                  border: `1.5px solid ${committed ? '#e0a04a' : 'var(--nail-color)'}`,
                  boxShadow: committed ? '0 0 0 4px rgba(224,160,74,0.18)' : 'none',
                  zIndex: 6,
                }} />

                {/* Polaroid card */}
                <div
                  style={{
                    position: 'absolute',
                    top: y,
                    left: cardLeft,
                    width: CARD_W,
                    zIndex: 8,
                    opacity: isDecorateMode ? 0.55 : 1,
                    transition: 'opacity 0.2s',
                  }}
                  onClick={e => {
                    if (isDecorateMode) return
                    e.stopPropagation()
                    onItemClick(item)
                  }}
                >
                  <PolaroidCard
                    item={item}
                    isAbove={false}
                    isLocked={locked}
                    onClick={() => !isDecorateMode && onItemClick(item)}
                    highlight={spinTarget === item.id}
                    hideThread
                  />
                </div>

                {/* Info text on opposite side */}
                <div style={{
                  position: 'absolute',
                  top: nodeY - 30,
                  ...(isLeft
                    ? { left: 'calc(50% + 16px)', right: 10, textAlign: 'left' as const }
                    : { left: 10, right: 'calc(50% + 16px)', textAlign: 'right' as const }
                  ),
                  pointerEvents: 'none',
                }}>
                  {/* Date */}
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 8,
                    letterSpacing: '0.16em',
                    color: '#e0a04a',
                    marginBottom: 5,
                    lineHeight: 1,
                  }}>
                    {dateStr}
                  </div>

                  {/* Title */}
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontStyle: 'italic',
                    fontSize: 13,
                    fontWeight: 300,
                    letterSpacing: '-0.01em',
                    color: 'var(--text-primary)',
                    lineHeight: 1.25,
                    marginBottom: 4,
                  }}>
                    {item.title}
                  </div>

                  {/* Location */}
                  {item.location && (
                    <div style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 9,
                      color: 'var(--text-secondary)',
                      letterSpacing: '0.02em',
                      lineHeight: 1.3,
                      marginBottom: 4,
                    }}>
                      {item.location}
                    </div>
                  )}

                  {/* Proposed label */}
                  {item.status === 'proposed' && (
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 8,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: 'var(--nail-color)',
                      opacity: 0.8,
                    }}>
                      proposed
                    </div>
                  )}
                </div>

              </div>
            )
          })}

          {/* ── Empty state ──────────────────────────────────────────────── */}
          {layoutItems.length === 0 && (
            <div style={{
              position: 'absolute',
              top: 130,
              left: '50%',
              transform: 'translateX(-50%)',
              textAlign: 'center',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}>
              <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 14, color: 'var(--nail-color)', opacity: 0.7 }}>
                tap + to add your first dream
              </div>
            </div>
          )}

        </div>{/* end canvas inner */}

        {/* ── Sticker mode toggle ──────────────────────────────────────────── */}
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={() => setIsDecorateMode(d => !d)}
          style={{
            position: 'absolute', bottom: 16, right: 14,
            width: 34, height: 34, borderRadius: '50%',
            background: isDecorateMode ? 'var(--text-primary)' : 'var(--nav-bg)',
            border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 20,
            boxShadow: '0 2px 10px rgba(0,0,0,0.14)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M8,14.5 C8,14.5 1,9.5 1,5 C1,2.8 2.8,1 5,1 C6.2,1 7.2,1.6 8,2.5 C8.8,1.6 9.8,1 11,1 C13.2,1 15,2.8 15,5 C15,9.5 8,14.5 8,14.5 Z"
              stroke={isDecorateMode ? 'var(--bg)' : 'var(--text-secondary)'}
              fill={isDecorateMode ? 'var(--bg)' : 'none'}
              strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"
            />
          </svg>
        </button>

        {/* ── Sticker toolbar ──────────────────────────────────────────────── */}
        {isDecorateMode && (
          <div
            onPointerDown={e => e.stopPropagation()}
            style={{
              position: 'absolute', bottom: 16, left: 12, right: 54,
              background: 'var(--sheet-bg)',
              borderRadius: 20,
              padding: '10px 14px',
              display: 'flex', gap: 10, alignItems: 'center',
              zIndex: 20,
              boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
              overflowX: 'auto', scrollbarWidth: 'none',
            }}
          >
            {STICKER_TYPES.map(type => (
              <button key={type} onClick={() => setActiveSType(type)} style={{ opacity: activeSType === type ? 1 : 0.35 }}>
                <StickerSvg type={type} size={22} color={activeColor} />
              </button>
            ))}
            <div style={{ width: 1, height: 20, background: 'var(--border)', flexShrink: 0 }} />
            {DECORATE_COLORS.map(c => (
              <button
                key={c} onClick={() => setActiveColor(c)}
                style={{
                  width: 18, height: 18, borderRadius: '50%', background: c, flexShrink: 0,
                  border: activeColor === c ? '2px solid var(--text-primary)' : '2px solid transparent',
                }}
              />
            ))}
            <div style={{ width: 1, height: 20, background: 'var(--border)', flexShrink: 0 }} />
            <button
              onClick={() => setIsDecorateMode(false)}
              style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500, padding: '2px 10px', background: 'var(--border)', borderRadius: 8, whiteSpace: 'nowrap' }}
            >
              done
            </button>
          </div>
        )}

      </div>{/* end scrollable canvas */}
    </div>
  )
}
