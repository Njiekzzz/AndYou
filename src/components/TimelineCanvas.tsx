import { useRef, useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useApp } from '../context/AppContext'
import { PolaroidCard, CARD_WIDTH_EXPORT } from './PolaroidCard'
import { Region, BucketItem } from '../types'
import { StickerSvg, STICKER_TYPES, DECORATE_COLORS } from './StickerSvg'

const CARD_W = CARD_WIDTH_EXPORT      // 140
const CARD_H = 172                    // approximate full height incl. thread cap
const TOPBAR_HEIGHT = 52
const BOTTOMNAV_HEIGHT = 64
const SPINE_STUB = 18                 // px gap between spine and card edge
const NODE_R = 5
const ITEM_V_SPACING = 206           // top-to-top distance between consecutive items
const ZONE_PILL_H = 36
const ZONE_PILL_MB = 18              // margin below zone pill before first item
const ZONE_MB = 24                   // margin after last item before next zone pill
const PAD_TOP = 12
const PAD_BOT = 80

interface LayoutItem {
  item: BucketItem
  y: number
  isLeft: boolean
  regionId: string
}

interface LayoutRegion {
  region: Region
  y: number
}

function computeLayout(items: BucketItem[], regions: Region[]) {
  const sorted = [...regions].sort((a, b) => a.order - b.order)
  const regionItems: Record<string, BucketItem[]> = {}
  sorted.forEach(r => { regionItems[r.id] = [] })
  items.forEach(item => {
    if (regionItems[item.region_id] !== undefined) regionItems[item.region_id].push(item)
  })

  let y = PAD_TOP
  let globalIndex = 0
  const itemPositions: LayoutItem[] = []
  const regionPills: LayoutRegion[] = []

  sorted.forEach(region => {
    regionPills.push({ region, y })
    y += ZONE_PILL_H + ZONE_PILL_MB

    const regionItemList = regionItems[region.id] ?? []
    regionItemList.forEach(item => {
      itemPositions.push({ item, y, isLeft: globalIndex % 2 === 0, regionId: region.id })
      y += ITEM_V_SPACING
      globalIndex++
    })

    if (regionItemList.length === 0) y += 20
    y += ZONE_MB
  })

  return { itemPositions, regionPills, totalHeight: y + PAD_BOT }
}

interface TimelineCanvasProps {
  onItemClick: (item: BucketItem) => void
  spinTarget?: string | null
}

export function TimelineCanvas({ onItemClick, spinTarget }: TimelineCanvasProps) {
  const { items, regions, stickers, addSticker, removeSticker } = useApp()
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollY, setScrollY] = useState(0)
  const scrollYRef = useRef(0)
  const isDragging = useRef(false)
  const dragStart = useRef({ y: 0, scrollY: 0 })
  const velocity = useRef(0)
  const lastY = useRef(0)
  const lastTime = useRef(0)
  const rafId = useRef<number>(0)
  const [, forceUpdate] = useState(0)

  useEffect(() => { scrollYRef.current = scrollY }, [scrollY])

  const [isDecorateMode, setIsDecorateMode] = useState(false)
  const [activeColor, setActiveColor] = useState(DECORATE_COLORS[0])
  const [activeStickerType, setActiveStickerType] = useState<string>('heart')

  const isRegionLocked = useCallback((region: Region) => {
    if (!region.unlock_date) return false
    return new Date(region.unlock_date) > new Date()
  }, [])

  const { itemPositions, regionPills, totalHeight } = computeLayout(items, regions)

  const containerHeight = window.innerHeight - TOPBAR_HEIGHT - BOTTOMNAV_HEIGHT

  const getMaxScroll = useCallback(() => Math.max(0, totalHeight - containerHeight + 44), [totalHeight, containerHeight])
  const clampScroll = useCallback((val: number) => Math.max(0, Math.min(val, getMaxScroll())), [getMaxScroll])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (isDecorateMode) {
      const rect = containerRef.current?.getBoundingClientRect()
      const canvasX = e.clientX
      const canvasY = e.clientY - (rect?.top ?? 0) + scrollYRef.current
      addSticker({
        type: activeStickerType as 'heart' | 'star' | 'sparkle' | 'flower',
        x: canvasX, y: canvasY,
        size: 40,
        rotation: Math.round(Math.random() * 24 - 12),
        color: activeColor,
      })
      return
    }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    isDragging.current = true
    dragStart.current = { y: e.clientY, scrollY: scrollYRef.current }
    lastY.current = e.clientY
    lastTime.current = performance.now()
    velocity.current = 0
    cancelAnimationFrame(rafId.current)
  }, [isDecorateMode, activeStickerType, activeColor, addSticker])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (isDecorateMode || !isDragging.current) return
    const dy = dragStart.current.y - e.clientY
    const now = performance.now()
    const dt = now - lastTime.current
    if (dt > 0) velocity.current = (lastY.current - e.clientY) / dt
    lastY.current = e.clientY
    lastTime.current = now
    setScrollY(clampScroll(dragStart.current.scrollY + dy))
  }, [isDecorateMode, clampScroll])

  const onPointerUp = useCallback((_e: React.PointerEvent) => {
    if (isDecorateMode || !isDragging.current) return
    isDragging.current = false
    const friction = 0.92
    const animate = () => {
      velocity.current *= friction
      if (Math.abs(velocity.current) < 0.1) return
      setScrollY(prev => clampScroll(prev + velocity.current * 16))
      rafId.current = requestAnimationFrame(animate)
    }
    rafId.current = requestAnimationFrame(animate)
  }, [isDecorateMode, clampScroll])

  const onWheel = useCallback((e: React.WheelEvent) => {
    if (isDecorateMode) return
    e.preventDefault()
    setScrollY(prev => clampScroll(prev + e.deltaY))
  }, [isDecorateMode, clampScroll])

  useEffect(() => {
    if (!spinTarget) return
    const target = itemPositions.find(p => p.item.id === spinTarget)
    if (!target) return
    const targetScroll = clampScroll(target.y - containerHeight / 2 + CARD_H / 2)
    const startScroll = scrollYRef.current
    const startTime = performance.now()
    const animate = (now: number) => {
      const t = Math.min(1, (now - startTime) / 1200)
      const eased = 1 - Math.pow(1 - t, 3)
      setScrollY(startScroll + (targetScroll - startScroll) * eased)
      if (t < 1) requestAnimationFrame(animate)
      else forceUpdate(n => n + 1)
    }
    requestAnimationFrame(animate)
  }, [spinTarget]) // eslint-disable-line react-hooks/exhaustive-deps

  const sortedRegions = [...regions].sort((a, b) => a.order - b.order)

  return (
    <div
      style={{
        position: 'fixed',
        top: TOPBAR_HEIGHT,
        left: 0,
        right: 0,
        bottom: BOTTOMNAV_HEIGHT,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg)',
      }}
    >
      {/* Region jump rail */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          padding: '6px 14px',
          overflowX: 'auto',
          flexShrink: 0,
          borderBottom: '1px solid var(--nav-border)',
          background: 'var(--nav-bg)',
          backdropFilter: 'blur(8px)',
          scrollbarWidth: 'none',
        }}
        onPointerDown={e => e.stopPropagation()}
      >
        {sortedRegions.map(r => {
          const pill = regionPills.find(p => p.region.id === r.id)
          return (
            <button
              key={r.id}
              onClick={() => pill && setScrollY(clampScroll(pill.y - 6))}
              style={{
                padding: '3px 10px',
                borderRadius: 999,
                background: 'var(--tape-bg)',
                color: 'var(--tape-text)',
                fontSize: 10,
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.06em',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                border: 'none',
              }}
            >
              {r.name}
            </button>
          )
        })}
      </div>

      {/* Scrollable canvas */}
      <div
        ref={containerRef}
        className="dot-grid no-select"
        style={{
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
          cursor: isDecorateMode ? 'copy' : (isDragging.current ? 'grabbing' : 'grab'),
          touchAction: 'none',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        <div
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: totalHeight,
            transform: `translateY(${-scrollY}px)`,
            willChange: 'transform',
          }}
        >
          {/* Vertical spine */}
          <div style={{
            position: 'absolute',
            top: 0, bottom: 0,
            left: '50%',
            width: 1.5,
            background: 'var(--string-color)',
            opacity: 0.7,
          }} />

          {/* Stickers */}
          {stickers.map(s => (
            <motion.div
              key={s.id}
              initial={{ y: -20, opacity: 0, scale: 0.6 }}
              animate={{ y: 0, opacity: 1, scale: 1, rotate: [0, 8, -4, 0] }}
              transition={{
                y: { type: 'spring', stiffness: 320, damping: 14 },
                opacity: { duration: 0.2 },
                scale: { type: 'spring', stiffness: 320, damping: 14 },
                rotate: { duration: 0.5, ease: 'easeOut' as const },
              }}
              style={{
                position: 'absolute',
                left: s.x, top: s.y,
                transform: `translate(-50%, -50%) rotate(${s.rotation}deg)`,
                zIndex: 3,
                cursor: isDecorateMode ? 'pointer' : 'default',
                pointerEvents: isDecorateMode ? 'auto' : 'none',
              }}
              onPointerDown={e => {
                if (!isDecorateMode) return
                e.stopPropagation()
                removeSticker(s.id)
              }}
            >
              <StickerSvg type={s.type} size={s.size} color={s.color} />
            </motion.div>
          ))}

          {/* Zone pills */}
          {regionPills.map(({ region, y }) => (
            <div
              key={region.id}
              style={{
                position: 'absolute',
                top: y,
                left: '50%',
                transform: 'translateX(-50%)',
                height: ZONE_PILL_H,
                display: 'flex',
                alignItems: 'center',
                padding: '0 14px',
                background: 'var(--tape-bg)',
                color: 'var(--tape-text)',
                borderRadius: 999,
                fontSize: 11,
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                letterSpacing: '0.02em',
                whiteSpace: 'nowrap',
                zIndex: 10,
                pointerEvents: 'none',
              }}
            >
              {region.name}
            </div>
          ))}

          {/* Items */}
          {itemPositions.map(({ item, y, isLeft, regionId }) => {
            const region = regions.find(r => r.id === regionId)
            const locked = region ? isRegionLocked(region) : false
            const isCommitted = item.status === 'committed' || item.status === 'done'
            const nodeY = y + CARD_H / 2

            const dateStr = item.created_at
              ? new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
              : null

            return (
              <div key={item.id}>
                {/* Stub line */}
                <div style={{
                  position: 'absolute',
                  top: nodeY,
                  left: isLeft ? 'calc(50% - ' + SPINE_STUB + 'px)' : '50%',
                  width: SPINE_STUB,
                  height: 1,
                  background: 'var(--string-color)',
                  opacity: 0.55,
                }} />

                {/* Spine node */}
                <div style={{
                  position: 'absolute',
                  top: nodeY - NODE_R,
                  left: `calc(50% - ${NODE_R}px)`,
                  width: NODE_R * 2,
                  height: NODE_R * 2,
                  borderRadius: '50%',
                  background: isCommitted ? '#e0a04a' : 'var(--bg)',
                  border: `1.5px solid ${isCommitted ? '#e0a04a' : 'var(--nail-color)'}`,
                  boxShadow: isCommitted ? '0 0 8px rgba(224,160,74,0.45)' : 'none',
                  zIndex: 5,
                }} />

                {/* Polaroid */}
                <div
                  style={{
                    position: 'absolute',
                    top: y,
                    left: isLeft ? `calc(50% - ${SPINE_STUB + CARD_W}px)` : `calc(50% + ${SPINE_STUB}px)`,
                    width: CARD_W,
                    zIndex: 8,
                    opacity: isDecorateMode ? 0.6 : 1,
                    cursor: 'pointer',
                  }}
                  onClick={e => {
                    if (isDecorateMode) return
                    e.stopPropagation()
                    onItemClick(item)
                  }}
                >
                  <PolaroidCard
                    item={item}
                    isAbove={true}
                    isLocked={locked}
                    onClick={() => !isDecorateMode && onItemClick(item)}
                    highlight={spinTarget === item.id}
                  />
                </div>

                {/* Date + title (opposite side) */}
                <div style={{
                  position: 'absolute',
                  top: nodeY - 22,
                  ...(isLeft
                    ? { left: 'calc(50% + 16px)', right: 8, textAlign: 'left' as const }
                    : { left: 8, right: 'calc(50% + 16px)', textAlign: 'right' as const }
                  ),
                  pointerEvents: 'none',
                }}>
                  {dateStr && (
                    <div style={{
                      fontSize: 8,
                      fontFamily: 'var(--font-mono)',
                      color: '#e0a04a',
                      letterSpacing: '0.12em',
                      marginBottom: 3,
                    }}>
                      {dateStr}
                    </div>
                  )}
                  <div style={{
                    fontSize: 11,
                    fontFamily: 'var(--font-display)',
                    fontStyle: 'italic',
                    color: 'var(--text-primary)',
                    lineHeight: 1.25,
                  }}>
                    {item.title}
                  </div>
                  {item.location && (
                    <div style={{
                      fontSize: 9,
                      color: 'var(--text-secondary)',
                      marginTop: 2,
                      letterSpacing: '0.03em',
                    }}>
                      {item.location}
                    </div>
                  )}
                  {item.status === 'proposed' && (
                    <div style={{
                      fontSize: 8,
                      color: 'var(--nail-color)',
                      marginTop: 3,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                    }}>
                      proposed
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* Empty state */}
          {itemPositions.length === 0 && (
            <div style={{
              position: 'absolute',
              top: 120,
              left: '50%',
              transform: 'translateX(-50%)',
              textAlign: 'center',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}>
              <div style={{ fontSize: 12, color: 'var(--nail-color)' }}>tap + to add your first dream</div>
            </div>
          )}
        </div>

        {/* Sticker mode toggle */}
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={() => setIsDecorateMode(d => !d)}
          style={{
            position: 'absolute',
            bottom: 16, right: 14,
            width: 34, height: 34,
            borderRadius: '50%',
            background: isDecorateMode ? 'var(--text-primary)' : 'var(--nav-bg)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 20,
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          }}
          title="Stickers"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M8,14.5 C8,14.5 1,9.5 1,5 C1,2.8 2.8,1 5,1 C6.2,1 7.2,1.6 8,2.5 C8.8,1.6 9.8,1 11,1 C13.2,1 15,2.8 15,5 C15,9.5 8,14.5 8,14.5 Z"
              stroke={isDecorateMode ? 'var(--bg)' : 'var(--text-secondary)'}
              fill={isDecorateMode ? 'var(--bg)' : 'none'}
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {/* Sticker toolbar */}
        {isDecorateMode && (
          <div
            onPointerDown={e => e.stopPropagation()}
            style={{
              position: 'absolute',
              bottom: 16, left: 12, right: 54,
              background: 'var(--sheet-bg)',
              borderRadius: 20,
              padding: '10px 14px',
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              zIndex: 20,
              boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
              overflowX: 'auto',
            }}
          >
            {STICKER_TYPES.map(type => (
              <button
                key={type}
                onClick={() => setActiveStickerType(type)}
                style={{ opacity: activeStickerType === type ? 1 : 0.4 }}
              >
                <StickerSvg type={type} size={22} color={activeColor} />
              </button>
            ))}
            <div style={{ width: 1, height: 20, background: 'var(--border)', flexShrink: 0 }} />
            {DECORATE_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setActiveColor(c)}
                style={{
                  width: 18, height: 18, borderRadius: '50%',
                  background: c,
                  border: activeColor === c ? '2px solid var(--text-primary)' : '2px solid transparent',
                  flexShrink: 0,
                }}
              />
            ))}
            <div style={{ width: 1, height: 20, background: 'var(--border)', flexShrink: 0 }} />
            <button
              onClick={() => setIsDecorateMode(false)}
              style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500, padding: '2px 8px', background: 'var(--border)', borderRadius: 8, whiteSpace: 'nowrap' }}
            >
              done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
