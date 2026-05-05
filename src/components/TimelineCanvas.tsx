import { useRef, useState, useCallback, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { PolaroidCard, CARD_WIDTH_EXPORT, THREAD_LENGTH_EXPORT } from './PolaroidCard'
import { Region, BucketItem } from '../types'

const CARD_WIDTH = CARD_WIDTH_EXPORT
const THREAD_LENGTH = THREAD_LENGTH_EXPORT
const CARD_HEIGHT = 8 + 8 + 110 + 38  // padding*2 + photo + caption = 172
const REGION_LABEL_WIDTH = 120
const REGION_PADDING = 48
const ITEM_SPACING = 32
const STRING_Y_OFFSET = 0  // relative to center of canvas
const NAIL_RADIUS = 4

interface TimelineCanvasProps {
  onItemClick: (item: BucketItem) => void
  spinTarget?: string | null
}

export function TimelineCanvas({ onItemClick, spinTarget }: TimelineCanvasProps) {
  const { items, regions } = useApp()
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollX, setScrollX] = useState(0)
  const [scale, setScale] = useState(1)
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, scrollX: 0 })
  const velocity = useRef(0)
  const lastX = useRef(0)
  const lastTime = useRef(0)
  const rafId = useRef<number>(0)
  const [, forceUpdate] = useState(0)

  // Pinch-to-zoom: track active pointers
  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map())
  const lastPinchDist = useRef<number | null>(null)

  const isRegionLocked = useCallback((region: Region): boolean => {
    if (!region.unlock_date) return false
    return new Date(region.unlock_date) > new Date()
  }, [])

  // Build layout: assign items to regions, compute x positions
  const layout = useCallback(() => {
    const sorted = [...regions].sort((a, b) => a.order - b.order)
    const regionItems: Record<string, BucketItem[]> = {}
    sorted.forEach(r => { regionItems[r.id] = [] })
    items.forEach(item => {
      if (regionItems[item.region_id] !== undefined) {
        regionItems[item.region_id].push(item)
      }
    })

    let x = REGION_PADDING
    const result: {
      item: BucketItem
      x: number
      isAbove: boolean
      regionId: string
    }[] = []
    const regionBoundaries: { region: Region; startX: number; endX: number; labelX: number }[] = []
    let globalIndex = 0

    sorted.forEach(region => {
      const regionStart = x
      const regionItemList = regionItems[region.id] ?? []
      let labelX: number

      if (regionItemList.length === 0) {
        labelX = regionStart + (REGION_LABEL_WIDTH + REGION_PADDING) / 2
        x += REGION_LABEL_WIDTH + REGION_PADDING
      } else {
        const firstItemX = x
        regionItemList.forEach(item => {
          const isAbove = globalIndex % 2 === 0
          result.push({ item, x, isAbove, regionId: region.id })
          x += CARD_WIDTH + ITEM_SPACING
          globalIndex++
        })
        // Center label over the span of cards (not including trailing padding)
        labelX = firstItemX + (regionItemList.length - 1) * (CARD_WIDTH + ITEM_SPACING) / 2 + CARD_WIDTH / 2
        x += REGION_PADDING
      }

      regionBoundaries.push({ region, startX: regionStart, endX: x, labelX })
    })

    const totalWidth = x + REGION_PADDING
    return { items: result, regionBoundaries, totalWidth }
  }, [items, regions])

  const { items: laid, regionBoundaries, totalWidth } = layout()

  const getMaxScroll = useCallback(() => {
    const containerWidth = containerRef.current?.clientWidth ?? window.innerWidth
    return Math.max(0, totalWidth - containerWidth)
  }, [totalWidth])

  const clampScroll = useCallback((val: number) => {
    return Math.max(0, Math.min(val, getMaxScroll()))
  }, [getMaxScroll])

  // Pointer drag + pinch-to-zoom handlers
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)

    if (activePointers.current.size === 1) {
      isDragging.current = true
      dragStart.current = { x: e.clientX, scrollX }
      lastX.current = e.clientX
      lastTime.current = performance.now()
      velocity.current = 0
      cancelAnimationFrame(rafId.current)
    } else {
      // Second finger down — switch to pinch mode, stop drag inertia
      isDragging.current = false
      lastPinchDist.current = null
    }
  }, [scrollX])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (activePointers.current.size === 2) {
      // Pinch-to-zoom
      const [p1, p2] = Array.from(activePointers.current.values())
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y)
      if (lastPinchDist.current !== null) {
        const delta = dist / lastPinchDist.current
        setScale(prev => Math.max(0.4, Math.min(2.5, prev * delta)))
      }
      lastPinchDist.current = dist
      return
    }

    if (!isDragging.current) return
    const dx = dragStart.current.x - e.clientX
    const now = performance.now()
    const dt = now - lastTime.current
    if (dt > 0) velocity.current = (lastX.current - e.clientX) / dt
    lastX.current = e.clientX
    lastTime.current = now
    setScrollX(clampScroll(dragStart.current.scrollX + dx))
  }, [clampScroll])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    activePointers.current.delete(e.pointerId)
    lastPinchDist.current = null

    if (activePointers.current.size === 0) {
      if (!isDragging.current) return
      isDragging.current = false

      const friction = 0.92
      const animate = () => {
        velocity.current *= friction
        if (Math.abs(velocity.current) < 0.1) return
        setScrollX(prev => clampScroll(prev + velocity.current * 16))
        rafId.current = requestAnimationFrame(animate)
      }
      rafId.current = requestAnimationFrame(animate)
    }
  }, [clampScroll])

  // Wheel scroll
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setScrollX(prev => clampScroll(prev + e.deltaX + e.deltaY))
  }, [clampScroll])

  // Spin animation to target
  useEffect(() => {
    if (!spinTarget) return
    const targetItem = laid.find(l => l.item.id === spinTarget)
    if (!targetItem) return
    const containerWidth = containerRef.current?.clientWidth ?? window.innerWidth
    const targetScroll = clampScroll(targetItem.x - containerWidth / 2 + CARD_WIDTH / 2)

    let startScroll = scrollX
    const startTime = performance.now()
    const duration = 1200

    const animate = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration)
      const eased = easeOutCubic(t)
      setScrollX(startScroll + (targetScroll - startScroll) * eased)
      if (t < 1) requestAnimationFrame(animate)
      else forceUpdate(n => n + 1)
    }
    requestAnimationFrame(animate)
  }, [spinTarget]) // eslint-disable-line react-hooks/exhaustive-deps

  const containerHeight = window.innerHeight - 52 - 64
  const stringY = containerHeight / 2

  // Above items: card bottom sits THREAD_LENGTH above string → card bottom at stringY - THREAD_LENGTH → card top at stringY - THREAD_LENGTH - CARD_HEIGHT
  // Below items: card top sits THREAD_LENGTH below string
  // Above: card at top, thread hangs down to string → div top = stringY - THREAD - CARD_HEIGHT
  // Below: thread at top touching string, card hangs below → div top = stringY
  const cardTopAbove = stringY - THREAD_LENGTH - CARD_HEIGHT
  const cardTopBelow = stringY

  return (
    <div
      ref={containerRef}
      className="dot-grid no-select"
      style={{
        position: 'fixed',
        top: 52,
        left: 0,
        right: 0,
        bottom: 64,
        overflow: 'hidden',
        cursor: isDragging.current ? 'grabbing' : 'grab',
        backgroundColor: 'var(--bg)',
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
          top: 0,
          left: 0,
          width: totalWidth,
          height: '100%',
          transform: `translateX(${-scrollX}px) scale(${scale})`,
          transformOrigin: 'center center',
          willChange: 'transform',
        }}
      >
        {/* String */}
        <div
          style={{
            position: 'absolute',
            top: stringY,
            left: 0,
            width: totalWidth,
            height: 1.5,
            background: 'var(--string-color)',
            opacity: 0.85,
          }}
        />

        {/* Region labels and dividers */}
        {regionBoundaries.map(({ region, startX, labelX }) => (
          <div key={region.id}>
            {/* Vertical divider at region start */}
            {startX > REGION_PADDING && (
              <>
                <div
                  style={{
                    position: 'absolute',
                    top: stringY - 60,
                    left: startX - REGION_PADDING / 2,
                    width: 0.5,
                    height: 120,
                    background: 'var(--string-color)',
                    opacity: 0.07,
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: stringY - NAIL_RADIUS,
                    left: startX - REGION_PADDING / 2 - NAIL_RADIUS,
                    width: NAIL_RADIUS * 2,
                    height: NAIL_RADIUS * 2,
                    borderRadius: '50%',
                    background: 'var(--nail-color)',
                    opacity: 0.5,
                  }}
                />
              </>
            )}

            {/* Masking tape label — sits just above the string, above cards */}
            <div
              style={{
                position: 'absolute',
                top: stringY - 22,
                left: labelX,
                padding: '3px 8px',
                background: 'var(--tape-bg)',
                color: 'var(--tape-text)',
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                textAlign: 'center',
                transform: `translateX(-50%) rotate(${region.order % 2 === 0 ? -1.2 : 1.0}deg)`,
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
                zIndex: 10,
              }}
            >
              {region.name}
            </div>
          </div>
        ))}

        {/* Polaroid cards */}
        {laid.map(({ item, x, isAbove, regionId }) => {
          const region = regions.find(r => r.id === regionId)
          const locked = region ? isRegionLocked(region) : false
          const topY = isAbove ? cardTopAbove : cardTopBelow

          return (
            <div
              key={item.id}
              style={{
                position: 'absolute',
                top: topY,
                left: x,
                width: CARD_WIDTH,
              }}
              onClick={e => {
                e.stopPropagation()
                if (!isDragging.current) onItemClick(item)
              }}
            >
              <PolaroidCard
                item={item}
                isAbove={isAbove}
                isLocked={locked}
                onClick={() => onItemClick(item)}
                highlight={spinTarget === item.id}
              />
            </div>
          )
        })}

        {/* Empty state */}
        {laid.length === 0 && (
          <div
            style={{
              position: 'absolute',
              top: stringY - 30,
              left: '50%',
              transform: 'translateX(-50%)',
              textAlign: 'center',
              pointerEvents: 'none',
            }}
          >
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              tap + to add your first dream
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3)
}
