import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useApp } from '../context/AppContext'
import { Dare } from '../types'
import { DareCard, DARE_CARD_TOTAL_HEIGHT } from './DareCard'
import { DareDetailSheet } from './DareDetailSheet'
import { TradeReveal } from './TradeReveal'

const CANVAS_W = 2600
const CANVAS_H = 3400
const DEFAULT_SCALE = 0.88
const MIN_SCALE = 0.35
const MAX_SCALE = 2.2
const DRAG_THRESHOLD = 8

interface DaresBoardProps {
  onAddDare: (editId?: string) => void
}

function getDareRotation(id: string): number {
  const hash = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return ((hash % 60) - 30) / 12
}

function defaultPos(dare: Dare, index: number): { x: number; y: number } {
  const col = index % 3
  const row = Math.floor(index / 3)
  const seed = dare.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const ox = (seed % 32) - 16
  const oy = ((seed * 7) % 32) - 16
  return { x: 24 + col * 180 + ox, y: 24 + row * 280 + oy }
}

export function DaresBoard({ onAddDare }: DaresBoardProps) {
  const { dares, user, getUserById, updateDarePosition } = useApp()

  const [pan, setPan] = useState({ x: 16, y: 16 })
  const [scale, setScale] = useState(DEFAULT_SCALE)
  const [localPos, setLocalPos] = useState<Record<string, { x: number; y: number }>>({})
  const [selectedDare, setSelectedDare] = useState<Dare | null>(null)
  const [revealDare, setRevealDare] = useState<Dare | null>(null)
  const [editDareId, setEditDareId] = useState<string | null>(null)

  const viewportRef = useRef<HTMLDivElement>(null)
  const panRef = useRef({ x: 16, y: 16 })
  const scaleRef = useRef(DEFAULT_SCALE)

  // gesture state refs (no re-render during gesture)
  const gesture = useRef<{
    kind: 'pan' | 'card'
    pointerId: number
    startPX: number; startPY: number
    // pan
    startPanX?: number; startPanY?: number
    // card drag
    dareId?: string
    cardStartX?: number; cardStartY?: number
    cardEl?: HTMLElement
    moved: number  // cumulative movement in px
  } | null>(null)

  const pinch = useRef<{
    id1: number; id2: number
    x1: number; y1: number; x2: number; y2: number
    startDist: number; startScale: number
    startPanX: number; startPanY: number
  } | null>(null)

  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map())
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  // Sync positions from Firestore for new dares
  useEffect(() => {
    if (!user) return
    const updates: Record<string, { x: number; y: number }> = {}
    dares.forEach((dare, i) => {
      if (!localPos[dare.id]) {
        updates[dare.id] = dare.positions?.[user.id] ?? defaultPos(dare, i)
      }
    })
    if (Object.keys(updates).length > 0) {
      setLocalPos(prev => ({ ...prev, ...updates }))
    }
  }, [dares, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep selectedDare in sync with latest Firestore data
  useEffect(() => {
    if (selectedDare) {
      const updated = dares.find(d => d.id === selectedDare.id)
      if (updated) setSelectedDare(updated)
    }
  }, [dares]) // eslint-disable-line react-hooks/exhaustive-deps

  const schedulePositionSave = useCallback((id: string, x: number, y: number) => {
    if (saveTimers.current[id]) clearTimeout(saveTimers.current[id])
    saveTimers.current[id] = setTimeout(() => {
      updateDarePosition(id, x, y)
    }, 600)
  }, [updateDarePosition])

  const viewportRect = useCallback(() => {
    return viewportRef.current?.getBoundingClientRect() ?? { left: 0, top: 0, width: 375, height: 600 }
  }, [])

  // ── Pointer events ─────────────────────────────────────────────────────
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (pinch.current) return  // ignore during pinch

    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (activePointers.current.size >= 2) return  // handled by touch events

    // Check if touch target is a draggable dare card
    const cardEl = (e.target as Element).closest('[data-dare-id]') as HTMLElement | null
    if (cardEl) {
      const dareId = cardEl.dataset.dareId!
      const dare = dares.find(d => d.id === dareId)
      if (dare && dare.created_by === user?.id) {
        const pos = localPos[dareId] ?? defaultPos(dare, dares.indexOf(dare))
        gesture.current = {
          kind: 'card', pointerId: e.pointerId,
          startPX: e.clientX, startPY: e.clientY,
          dareId, cardStartX: pos.x, cardStartY: pos.y,
          cardEl, moved: 0,
        }
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
        return
      }
    }

    // Pan the canvas
    gesture.current = {
      kind: 'pan', pointerId: e.pointerId,
      startPX: e.clientX, startPY: e.clientY,
      startPanX: panRef.current.x, startPanY: panRef.current.y,
      moved: 0,
    }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [dares, user?.id, localPos])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (!gesture.current || gesture.current.pointerId !== e.pointerId) return

    const dx = e.clientX - gesture.current.startPX
    const dy = e.clientY - gesture.current.startPY
    gesture.current.moved = Math.sqrt(dx * dx + dy * dy)

    if (gesture.current.kind === 'pan') {
      const newX = (gesture.current.startPanX ?? 0) + dx
      const newY = (gesture.current.startPanY ?? 0) + dy
      panRef.current = { x: newX, y: newY }
      // Update DOM directly for smooth panning
      const canvas = viewportRef.current?.querySelector<HTMLElement>('[data-canvas]')
      if (canvas) canvas.style.transform = `translate(${newX}px, ${newY}px) scale(${scaleRef.current})`
    } else if (gesture.current.kind === 'card' && gesture.current.cardEl) {
      const cdx = dx / scaleRef.current
      const cdy = dy / scaleRef.current
      // Move card directly in DOM (no React re-render)
      gesture.current.cardEl.style.transform = `rotate(${getDareRotation(gesture.current.dareId!)}deg) translate(${cdx}px, ${cdy}px)`
    }
  }, [])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    activePointers.current.delete(e.pointerId)
    if (!gesture.current || gesture.current.pointerId !== e.pointerId) return

    const { kind, moved } = gesture.current

    if (kind === 'pan') {
      // Commit pan state to React
      setPan({ ...panRef.current })

    } else if (kind === 'card') {
      const { dareId, cardStartX, cardStartY, cardEl, startPX, startPY } = gesture.current
      const dx = (e.clientX - startPX) / scaleRef.current
      const dy = (e.clientY - startPY) / scaleRef.current
      const newX = (cardStartX ?? 0) + dx
      const newY = (cardStartY ?? 0) + dy

      if (moved < DRAG_THRESHOLD) {
        // Tap — reset transform and open detail
        if (cardEl) cardEl.style.transform = `rotate(${getDareRotation(dareId!)}deg)`
        const dare = dares.find(d => d.id === dareId)
        if (dare) setSelectedDare(dare)
      } else {
        // Drop — commit position
        if (cardEl) cardEl.style.transform = `rotate(${getDareRotation(dareId!)}deg)`
        setLocalPos(prev => ({ ...prev, [dareId!]: { x: newX, y: newY } }))
        schedulePositionSave(dareId!, newX, newY)
      }
    }

    gesture.current = null
  }, [dares, schedulePositionSave])

  // ── Touch events (pinch zoom) ────────────────────────────────────────
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const t1 = e.touches[0], t2 = e.touches[1]
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
      pinch.current = {
        id1: t1.identifier, id2: t2.identifier,
        x1: t1.clientX, y1: t1.clientY,
        x2: t2.clientX, y2: t2.clientY,
        startDist: dist,
        startScale: scaleRef.current,
        startPanX: panRef.current.x,
        startPanY: panRef.current.y,
      }
      gesture.current = null  // cancel any ongoing gesture
    }
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pinch.current || e.touches.length < 2) return
    e.preventDefault()

    const t1 = Array.from(e.touches).find(t => t.identifier === pinch.current!.id1)
    const t2 = Array.from(e.touches).find(t => t.identifier === pinch.current!.id2)
    if (!t1 || !t2) return

    const newDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, pinch.current.startScale * (newDist / pinch.current.startDist)))

    // Pivot point: midpoint of the two touches
    const rect = viewportRect()
    const midX = (t1.clientX + t2.clientX) / 2 - rect.left
    const midY = (t1.clientY + t2.clientY) / 2 - rect.top

    const ratio = newScale / scaleRef.current
    const newPanX = midX + (panRef.current.x - midX) * ratio
    const newPanY = midY + (panRef.current.y - midY) * ratio

    scaleRef.current = newScale
    panRef.current = { x: newPanX, y: newPanY }

    const canvas = viewportRef.current?.querySelector<HTMLElement>('[data-canvas]')
    if (canvas) canvas.style.transform = `translate(${newPanX}px, ${newPanY}px) scale(${newScale})`
  }, [viewportRect])

  const onTouchEnd = useCallback(() => {
    if (pinch.current) {
      setScale(scaleRef.current)
      setPan({ ...panRef.current })
      pinch.current = null
    }
  }, [])

  // ── Scroll wheel zoom ────────────────────────────────────────────────
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const rect = viewportRect()
    const pointerX = e.clientX - rect.left
    const pointerY = e.clientY - rect.top

    const delta = -e.deltaY * 0.001
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scaleRef.current * (1 + delta)))
    const ratio = newScale / scaleRef.current

    const newPanX = pointerX + (panRef.current.x - pointerX) * ratio
    const newPanY = pointerY + (panRef.current.y - pointerY) * ratio

    scaleRef.current = newScale
    panRef.current = { x: newPanX, y: newPanY }

    setScale(newScale)
    setPan({ x: newPanX, y: newPanY })
  }, [viewportRect])

  const isEmpty = dares.length === 0

  return (
    <>
      <div
        ref={viewportRef}
        style={{
          position: 'fixed', top: 64, bottom: 72, left: 0, right: 0,
          overflow: 'hidden', touchAction: 'none',
          background: 'var(--bg-main)',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onWheel={onWheel}
      >
        {/* Virtual canvas */}
        <div
          data-canvas
          className="dot-grid"
          style={{
            position: 'absolute',
            transformOrigin: '0 0',
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            width: CANVAS_W, height: CANVAS_H,
          }}
        >
          {dares.map((dare, i) => {
            const pos = localPos[dare.id] ?? defaultPos(dare, i)
            const creator = getUserById(dare.created_by)
            return (
              <DareCard
                key={dare.id}
                dare={dare}
                x={pos.x}
                y={pos.y}
                creator={creator}
                currentUserId={user?.id ?? ''}
                onTap={() => setSelectedDare(dare)}
                isDraggable={dare.created_by === user?.id}
              />
            )
          })}
        </div>

        {/* Empty state */}
        {isEmpty && (
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 12, pointerEvents: 'none',
            }}
          >
            <svg width="60" height="60" viewBox="0 0 60 60" fill="none" opacity={0.35}>
              <rect x="8" y="4" width="44" height="52" rx="4" stroke="var(--text-muted)" strokeWidth="1.5"/>
              <path d="M16 20h28M16 28h20M16 36h14" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M36 44l4-4 4 4" stroke="var(--amber)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 17, fontWeight: 500, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', margin: 0 }}>no dares yet</p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', opacity: 0.65, fontFamily: 'var(--font-sans)', margin: '6px 0 0' }}>challenge each other to something new</p>
            </div>
          </motion.div>
        )}
      </div>

      <DareDetailSheet
        dare={selectedDare}
        onClose={() => setSelectedDare(null)}
        onEdit={id => { setSelectedDare(null); setEditDareId(id); setTimeout(() => { onAddDare(id); setEditDareId(null) }, 200) }}
        onReveal={d => { setSelectedDare(null); setRevealDare(d) }}
      />

      <TradeReveal
        dare={revealDare}
        onClose={() => setRevealDare(null)}
      />
    </>
  )
}
