import { useRef, useState, useCallback, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { PolaroidCard, CARD_WIDTH_EXPORT, THREAD_LENGTH_EXPORT } from './PolaroidCard'
import { Region, BucketItem } from '../types'
import { StickerSvg, STICKER_TYPES, DECORATE_COLORS } from './StickerSvg'

const CARD_WIDTH = CARD_WIDTH_EXPORT
const THREAD_LENGTH = THREAD_LENGTH_EXPORT
const CARD_HEIGHT = 8 + 8 + 110 + 38
const REGION_LABEL_WIDTH = 120
const REGION_PADDING = 48
const ITEM_SPACING = 32
const NAIL_RADIUS = 4
const TOPBAR_HEIGHT = 52
const BOTTOMNAV_HEIGHT = 64

type DrawTool = 'draw' | 'sticker'

function pointsToPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return `M ${pts[0]?.x ?? 0} ${pts[0]?.y ?? 0}`
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2
    const my = (pts[i].y + pts[i + 1].y) / 2
    d += ` Q ${pts[i].x} ${pts[i].y} ${mx} ${my}`
  }
  d += ` L ${pts[pts.length - 1].x} ${pts[pts.length - 1].y}`
  return d
}

interface TimelineCanvasProps {
  onItemClick: (item: BucketItem) => void
  spinTarget?: string | null
}

export function TimelineCanvas({ onItemClick, spinTarget }: TimelineCanvasProps) {
  const { items, regions, strokes, stickers, addStroke, removeStroke, addSticker, removeSticker } = useApp()
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollX, setScrollX] = useState(0)
  const [scale, setScale] = useState(1)
  const scrollXRef = useRef(0)
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, scrollX: 0 })
  const velocity = useRef(0)
  const lastX = useRef(0)
  const lastTime = useRef(0)
  const rafId = useRef<number>(0)
  const [, forceUpdate] = useState(0)

  // Keep scrollX in a ref for use in draw handlers without stale closure
  useEffect(() => { scrollXRef.current = scrollX }, [scrollX])

  // Pinch-to-zoom
  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map())
  const lastPinchDist = useRef<number | null>(null)

  // Decoration state
  const [isDecorateMode, setIsDecorateMode] = useState(false)
  const [activeTool, setActiveTool] = useState<DrawTool>('draw')
  const [activeColor, setActiveColor] = useState(DECORATE_COLORS[0])
  const [activeStickerType, setActiveStickerType] = useState<string>('heart')
  const [brushWidth, setBrushWidth] = useState(3)
  const currentStrokePoints = useRef<{ x: number; y: number }[]>([])
  const isDrawing = useRef(false)
  const lastStrokeId = useRef<string | null>(null)

  const isRegionLocked = useCallback((region: Region): boolean => {
    if (!region.unlock_date) return false
    return new Date(region.unlock_date) > new Date()
  }, [])

  const layout = useCallback(() => {
    const sorted = [...regions].sort((a, b) => a.order - b.order)
    const regionItems: Record<string, BucketItem[]> = {}
    sorted.forEach(r => { regionItems[r.id] = [] })
    items.forEach(item => {
      if (regionItems[item.region_id] !== undefined) regionItems[item.region_id].push(item)
    })

    let x = REGION_PADDING
    const result: { item: BucketItem; x: number; isAbove: boolean; regionId: string }[] = []
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

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (isDecorateMode) {
      e.currentTarget.setPointerCapture(e.pointerId)
      const canvasX = e.clientX + scrollXRef.current
      const canvasY = e.clientY - TOPBAR_HEIGHT

      if (activeTool === 'draw') {
        currentStrokePoints.current = [{ x: canvasX, y: canvasY }]
        isDrawing.current = true
        forceUpdate(n => n + 1)
      } else if (activeTool === 'sticker') {
        const rot = Math.round(Math.random() * 24 - 12)
        addSticker({ type: activeStickerType, x: canvasX, y: canvasY, size: 40, rotation: rot, color: activeColor })
      }
      return
    }

    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)

    if (activePointers.current.size === 1) {
      isDragging.current = true
      dragStart.current = { x: e.clientX, scrollX: scrollXRef.current }
      lastX.current = e.clientX
      lastTime.current = performance.now()
      velocity.current = 0
      cancelAnimationFrame(rafId.current)
    } else {
      isDragging.current = false
      lastPinchDist.current = null
    }
  }, [isDecorateMode, activeTool, activeStickerType, activeColor, addSticker])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (isDecorateMode) {
      if (activeTool === 'draw' && isDrawing.current) {
        const canvasX = e.clientX + scrollXRef.current
        const canvasY = e.clientY - TOPBAR_HEIGHT
        currentStrokePoints.current.push({ x: canvasX, y: canvasY })
        forceUpdate(n => n + 1)
      }
      return
    }

    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (activePointers.current.size === 2) {
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
  }, [isDecorateMode, activeTool, clampScroll])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (isDecorateMode) {
      if (activeTool === 'draw' && isDrawing.current) {
        isDrawing.current = false
        const pts = currentStrokePoints.current
        if (pts.length > 1) {
          addStroke({ d: pointsToPath(pts), color: activeColor, width: brushWidth })
            .then(() => { lastStrokeId.current = null })
        }
        currentStrokePoints.current = []
        forceUpdate(n => n + 1)
      }
      return
    }

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
  }, [isDecorateMode, activeTool, activeColor, brushWidth, addStroke, clampScroll])

  const onWheel = useCallback((e: React.WheelEvent) => {
    if (isDecorateMode) return
    e.preventDefault()
    setScrollX(prev => clampScroll(prev + e.deltaX + e.deltaY))
  }, [isDecorateMode, clampScroll])

  useEffect(() => {
    if (!spinTarget) return
    const targetItem = laid.find(l => l.item.id === spinTarget)
    if (!targetItem) return
    const containerWidth = containerRef.current?.clientWidth ?? window.innerWidth
    const targetScroll = clampScroll(targetItem.x - containerWidth / 2 + CARD_WIDTH / 2)

    let startScroll = scrollXRef.current
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

  const containerHeight = window.innerHeight - TOPBAR_HEIGHT - BOTTOMNAV_HEIGHT
  const stringY = containerHeight / 2
  const cardTopAbove = stringY - THREAD_LENGTH - CARD_HEIGHT
  const cardTopBelow = stringY

  const currentPathD = currentStrokePoints.current.length > 1
    ? pointsToPath(currentStrokePoints.current)
    : null

  return (
    <div
      ref={containerRef}
      className="dot-grid no-select"
      style={{
        position: 'fixed',
        top: TOPBAR_HEIGHT,
        left: 0,
        right: 0,
        bottom: BOTTOMNAV_HEIGHT,
        overflow: 'hidden',
        cursor: isDecorateMode
          ? (activeTool === 'draw' ? 'crosshair' : 'copy')
          : (isDragging.current ? 'grabbing' : 'grab'),
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
        <div style={{ position: 'absolute', top: stringY, left: 0, width: totalWidth, height: 1.5, background: 'var(--string-color)', opacity: 0.85 }} />

        {/* Drawing layer (SVG — behind cards) */}
        <svg
          style={{ position: 'absolute', top: 0, left: 0, width: totalWidth, height: '100%', pointerEvents: 'none', zIndex: 2 }}
        >
          {strokes.map(s => (
            <path key={s.id} d={s.d} stroke={s.color} strokeWidth={s.width} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          ))}
          {currentPathD && (
            <path d={currentPathD} stroke={activeColor} strokeWidth={brushWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.7} />
          )}
        </svg>

        {/* Stickers */}
        {stickers.map(s => (
          <div
            key={s.id}
            style={{
              position: 'absolute',
              left: s.x,
              top: s.y,
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
          </div>
        ))}

        {/* Region labels and dividers */}
        {regionBoundaries.map(({ region, startX, labelX }) => (
          <div key={region.id}>
            {startX > REGION_PADDING && (
              <>
                <div style={{ position: 'absolute', top: stringY - 60, left: startX - REGION_PADDING / 2, width: 0.5, height: 120, background: 'var(--string-color)', opacity: 0.07 }} />
                <div style={{ position: 'absolute', top: stringY - NAIL_RADIUS, left: startX - REGION_PADDING / 2 - NAIL_RADIUS, width: NAIL_RADIUS * 2, height: NAIL_RADIUS * 2, borderRadius: '50%', background: 'var(--nail-color)', opacity: 0.5 }} />
              </>
            )}
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
              style={{ position: 'absolute', top: topY, left: x, width: CARD_WIDTH, zIndex: 8 }}
              onClick={e => {
                if (isDecorateMode) return
                e.stopPropagation()
                if (!isDragging.current) onItemClick(item)
              }}
            >
              <PolaroidCard item={item} isAbove={isAbove} isLocked={locked} onClick={() => !isDecorateMode && onItemClick(item)} highlight={spinTarget === item.id} />
            </div>
          )
        })}

        {/* Empty state */}
        {laid.length === 0 && (
          <div style={{ position: 'absolute', top: stringY - 30, left: '50%', transform: 'translateX(-50%)', textAlign: 'center', pointerEvents: 'none' }}>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>tap + to add your first dream</div>
          </div>
        )}
      </div>

      {/* Decorate toggle button */}
      <button
        onPointerDown={e => e.stopPropagation()}
        onClick={() => setIsDecorateMode(d => !d)}
        style={{
          position: 'absolute',
          bottom: 16,
          right: 14,
          width: 34,
          height: 34,
          borderRadius: '50%',
          background: isDecorateMode ? 'var(--text-primary)' : 'var(--nav-bg)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 20,
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        }}
        title="Decorate"
      >
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <path
            d="M2 13L5 12L13 4L11 2L3 10L2 13Z"
            stroke={isDecorateMode ? 'var(--bg)' : 'var(--text-secondary)'}
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M11 2L13 4" stroke={isDecorateMode ? 'var(--bg)' : 'var(--text-secondary)'} strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Decoration toolbar */}
      {isDecorateMode && (
        <div
          onPointerDown={e => e.stopPropagation()}
          style={{
            position: 'absolute',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--sheet-bg)',
            borderRadius: 20,
            padding: '10px 14px',
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            zIndex: 20,
            boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
            flexWrap: 'wrap',
            maxWidth: 'calc(100vw - 100px)',
          }}
        >
          {/* Tool toggle */}
          <button
            onClick={() => setActiveTool('draw')}
            style={{ opacity: activeTool === 'draw' ? 1 : 0.4, fontSize: 16, lineHeight: 1 }}
            title="Draw"
          >✏️</button>
          <button
            onClick={() => setActiveTool('sticker')}
            style={{ opacity: activeTool === 'sticker' ? 1 : 0.4, fontSize: 16, lineHeight: 1 }}
            title="Sticker"
          >✦</button>

          <div style={{ width: 1, height: 20, background: 'var(--border)' }} />

          {/* Brush sizes (draw mode) */}
          {activeTool === 'draw' && [2, 4, 8].map(w => (
            <button
              key={w}
              onClick={() => setBrushWidth(w)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, opacity: brushWidth === w ? 1 : 0.35 }}
            >
              <div style={{ width: w * 2.5, height: w * 2.5, borderRadius: '50%', background: 'var(--text-primary)' }} />
            </button>
          ))}

          {/* Sticker types (sticker mode) */}
          {activeTool === 'sticker' && STICKER_TYPES.map(type => (
            <button
              key={type}
              onClick={() => setActiveStickerType(type)}
              style={{ opacity: activeStickerType === type ? 1 : 0.4 }}
            >
              <StickerSvg type={type} size={22} color={activeColor} />
            </button>
          ))}

          <div style={{ width: 1, height: 20, background: 'var(--border)' }} />

          {/* Colors */}
          {DECORATE_COLORS.map(c => (
            <button
              key={c}
              onClick={() => setActiveColor(c)}
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: c,
                border: activeColor === c ? '2px solid var(--text-primary)' : '2px solid transparent',
                flexShrink: 0,
              }}
            />
          ))}

          <div style={{ width: 1, height: 20, background: 'var(--border)' }} />

          {/* Undo last stroke */}
          {activeTool === 'draw' && strokes.length > 0 && (
            <button
              onClick={() => removeStroke(strokes[strokes.length - 1].id)}
              style={{ fontSize: 11, color: 'var(--text-muted)', padding: '2px 6px', border: '1px solid var(--border)', borderRadius: 6 }}
            >
              undo
            </button>
          )}

          <button
            onClick={() => setIsDecorateMode(false)}
            style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500, padding: '2px 8px', background: 'var(--border)', borderRadius: 8 }}
          >
            done
          </button>
        </div>
      )}
    </div>
  )
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3)
}
