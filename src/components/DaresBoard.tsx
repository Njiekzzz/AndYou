import { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import { Dare } from '../types'
import { DareCard } from './DareCard'
import { DareDetailSheet } from './DareDetailSheet'
import { TradeReveal } from './TradeReveal'
import { ClashPanel } from './ClashPanel'

const CANVAS_W = 560
const CARD_H = 270
const CARD_DRAG_THRESHOLD = 8
const MIN_SCALE = 0.3
const MAX_SCALE = 2.5

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
  const colW = Math.floor((CANVAS_W - 40) / 3)
  const ox = (seed % 20) - 10
  const oy = ((seed * 7) % 20) - 10
  return { x: 20 + col * colW + ox, y: 20 + row * 260 + oy }
}

export function DaresBoard({ onAddDare }: DaresBoardProps) {
  const { dares, user, getUserById, updateDarePosition, theme, addClash, clashes } = useApp()

  const visibleDares = dares.filter(d => d.assigned_to !== 'self')
  const isDark = theme === 'dark'

  const [localPos, setLocalPos] = useState<Record<string, { x: number; y: number }>>({})
  const [selectedDare, setSelectedDare] = useState<Dare | null>(null)
  const [revealDare, setRevealDare] = useState<Dare | null>(null)
  const [clashPanelOpen, setClashPanelOpen] = useState(false)

  // Pan / zoom state
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const [isGrabbing, setIsGrabbing] = useState(false)
  const panRef = useRef({ x: 0, y: 0 })
  const scaleRef = useRef(1)

  // Gesture refs — no state, purely synchronous
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const lastPinchDist = useRef<number | null>(null)

  // Card drag gesture
  const cardGesture = useRef<{
    pointerId: number
    startPX: number; startPY: number
    dareId: string
    cardStartX: number; cardStartY: number
    cardEl: HTMLElement
    moved: number
    isDraggable: boolean
  } | null>(null)
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const boardRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const numRows = Math.max(1, Math.ceil(visibleDares.length / 3))
  const CANVAS_H = Math.max(400, 40 + numRows * 260 + CARD_H)

  // ── Scale to fit — resets pan and fits all content ─────────────────────
  const scaleToFit = useCallback(() => {
    if (!boardRef.current || !contentRef.current) return
    const boardW = boardRef.current.offsetWidth - 32
    const boardH = boardRef.current.offsetHeight - 32
    const contentW = contentRef.current.scrollWidth
    const contentH = contentRef.current.scrollHeight
    if (!contentW || !contentH || boardW <= 0 || boardH <= 0) return
    const fitScale = Math.min(boardW / contentW, boardH / contentH, 1)
    scaleRef.current = fitScale
    panRef.current = { x: 0, y: 0 }
    setScale(fitScale)
    setPan({ x: 0, y: 0 })
  }, [])

  // Run on mount and whenever dare count changes
  useEffect(() => {
    const t = setTimeout(scaleToFit, 50)
    return () => clearTimeout(t)
  }, [scaleToFit, visibleDares.length])

  // Sync positions from Firestore for new dares
  useEffect(() => {
    if (!user) return
    const updates: Record<string, { x: number; y: number }> = {}
    visibleDares.forEach((dare, i) => {
      if (!localPos[dare.id]) {
        updates[dare.id] = dare.positions?.[user.id] ?? defaultPos(dare, i)
      }
    })
    if (Object.keys(updates).length > 0) {
      setLocalPos(prev => ({ ...prev, ...updates }))
    }
  }, [visibleDares.length, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep selectedDare in sync with Firestore
  useEffect(() => {
    if (selectedDare) {
      const updated = visibleDares.find(d => d.id === selectedDare.id)
      if (updated) setSelectedDare(updated)
      else setSelectedDare(null)
    }
  }, [dares]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-open clash panel if active clash exists
  useEffect(() => {
    const active = clashes.find(c => ['selecting', 'pending_acceptance', 'live'].includes(c.status))
    if (active && !clashPanelOpen) {
      setTimeout(() => setClashPanelOpen(true), 300)
    }
  }, [clashes]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Board pan — mouse ───────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as Element).closest('[data-dare-id]')) return
    isDragging.current = true
    dragStart.current = { x: e.clientX, y: e.clientY, panX: panRef.current.x, panY: panRef.current.y }
    setIsGrabbing(true)
  }, [])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return
    const newPan = {
      x: dragStart.current.panX + (e.clientX - dragStart.current.x),
      y: dragStart.current.panY + (e.clientY - dragStart.current.y),
    }
    panRef.current = newPan
    setPan(newPan)
  }, [])

  const onMouseUp = useCallback(() => {
    isDragging.current = false
    setIsGrabbing(false)
  }, [])

  // ── Board pan + pinch — touch ──────────────────────────────────────────
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      if ((e.target as Element).closest('[data-dare-id]')) return
      const t = e.touches[0]
      isDragging.current = true
      dragStart.current = { x: t.clientX, y: t.clientY, panX: panRef.current.x, panY: panRef.current.y }
    }
    if (e.touches.length === 2) {
      isDragging.current = false
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      lastPinchDist.current = Math.hypot(dx, dy)
    }
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging.current) {
      const t = e.touches[0]
      const newPan = {
        x: dragStart.current.panX + (t.clientX - dragStart.current.x),
        y: dragStart.current.panY + (t.clientY - dragStart.current.y),
      }
      panRef.current = newPan
      setPan(newPan)
    }
    if (e.touches.length === 2 && lastPinchDist.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const newDist = Math.hypot(dx, dy)
      const delta = newDist / lastPinchDist.current
      const newScale = Math.min(Math.max(scaleRef.current * delta, MIN_SCALE), MAX_SCALE)
      scaleRef.current = newScale
      setScale(newScale)
      lastPinchDist.current = newDist
    }
  }, [])

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) lastPinchDist.current = null
    if (e.touches.length === 0) isDragging.current = false
  }, [])

  // ── Card tap / drag — pointer events on content div ────────────────────
  const schedulePositionSave = useCallback((id: string, x: number, y: number) => {
    if (saveTimers.current[id]) clearTimeout(saveTimers.current[id])
    saveTimers.current[id] = setTimeout(() => updateDarePosition(id, x, y), 600)
  }, [updateDarePosition])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const cardEl = (e.target as Element).closest('[data-dare-id]') as HTMLElement | null
    if (!cardEl) return

    const dareId = cardEl.dataset.dareId!
    const dare = visibleDares.find(d => d.id === dareId)
    if (!dare) return

    const isDraggable = dare.created_by === user?.id
    const pos = localPos[dareId] ?? defaultPos(dare, visibleDares.indexOf(dare))

    cardGesture.current = {
      pointerId: e.pointerId,
      startPX: e.clientX, startPY: e.clientY,
      dareId, cardStartX: pos.x, cardStartY: pos.y,
      cardEl, moved: 0, isDraggable,
    }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [visibleDares, user?.id, localPos])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!cardGesture.current || cardGesture.current.pointerId !== e.pointerId) return
    const dx = e.clientX - cardGesture.current.startPX
    const dy = e.clientY - cardGesture.current.startPY
    cardGesture.current.moved = Math.sqrt(dx * dx + dy * dy)

    if (cardGesture.current.isDraggable && cardGesture.current.moved > CARD_DRAG_THRESHOLD) {
      cardGesture.current.cardEl.style.transform =
        `rotate(${getDareRotation(cardGesture.current.dareId)}deg) translate(${dx}px, ${dy}px)`
    }
  }, [])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!cardGesture.current || cardGesture.current.pointerId !== e.pointerId) return
    const { dareId, cardStartX, cardStartY, cardEl, startPX, startPY, moved, isDraggable } = cardGesture.current

    cardEl.style.transform = `rotate(${getDareRotation(dareId)}deg)`

    if (moved < CARD_DRAG_THRESHOLD) {
      const dare = visibleDares.find(d => d.id === dareId)
      if (dare) setSelectedDare(dare)
    } else if (isDraggable) {
      const newX = cardStartX + (e.clientX - startPX)
      const newY = cardStartY + (e.clientY - startPY)
      setLocalPos(prev => ({ ...prev, [dareId]: { x: newX, y: newY } }))
      schedulePositionSave(dareId, newX, newY)
    }

    cardGesture.current = null
  }, [visibleDares, schedulePositionSave])

  const handleChallengeTime = useCallback(async () => {
    if (!user) return
    const clashId = await addClash()
    if (clashId) setClashPanelOpen(true)
  }, [user, addClash])

  const isEmpty = visibleDares.length === 0

  return (
    <>
      <div style={{
        position: 'fixed', top: 64, bottom: 72, left: 0, right: 0,
        display: 'flex', flexDirection: 'column',
        padding: '8px 16px 12px',
        boxSizing: 'border-box',
        background: 'var(--bg-main, var(--cream))',
      }}>
        {/* Challenge tab header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 52, flexShrink: 0,
        }}>
          <span style={{
            fontFamily: 'var(--font-serif)', fontStyle: 'italic',
            fontSize: 20, color: 'var(--text-primary)',
          }}>
            challenges
          </span>
          <button
            onClick={handleChallengeTime}
            style={{
              height: 40, padding: '0 14px',
              borderRadius: 20,
              background: 'transparent',
              border: '1.5px solid var(--amber)',
              color: 'var(--amber)',
              fontFamily: 'var(--font-sans)',
              fontSize: 13, fontWeight: 600,
              letterSpacing: '0.03em',
              display: 'flex', alignItems: 'center', gap: 6,
              cursor: 'pointer',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--amber)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 1L3 7h4l-2 4 6-7H7l1-3z"/>
            </svg>
            challenge time
          </button>
        </div>

        {/* Whiteboard */}
        <div
          ref={boardRef}
          style={{
            flex: 1, minHeight: 0,
            background: isDark ? '#1a1710' : '#fafaf8',
            border: `2px solid ${isDark ? '#4a4030' : '#c4b89a'}`,
            borderRadius: 12,
            boxShadow: isDark
              ? 'inset 0 0 0 6px #221e14, inset 0 0 0 7px #4a4030, 0 4px 24px rgba(0,0,0,0.4)'
              : 'inset 0 0 0 6px #f0ebe0, inset 0 0 0 7px #c4b89a, 0 4px 24px rgba(50,35,10,0.14)',
            overflow: 'hidden',
            cursor: isGrabbing ? 'grabbing' : 'grab',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            touchAction: 'none',
            position: 'relative',
          }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Inner canvas — scaled and translated */}
          <div
            ref={contentRef}
            style={{
              position: 'relative',
              width: CANVAS_W,
              height: CANVAS_H,
              transformOrigin: 'top left',
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {visibleDares.map((dare, i) => {
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
                  onTap={() => {}}
                  isDraggable={dare.created_by === user?.id}
                />
              )
            })}
          </div>

          {/* Empty state */}
          {isEmpty && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 12, pointerEvents: 'none',
            }}>
              <svg width="48" height="48" viewBox="0 0 60 60" fill="none" opacity={0.35}>
                <rect x="8" y="4" width="44" height="52" rx="4" stroke="var(--text-muted)" strokeWidth="1.5"/>
                <path d="M16 20h28M16 28h20M16 36h14" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', margin: 0 }}>no dares yet</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', opacity: 0.65, fontFamily: 'var(--font-sans)', margin: '4px 0 0' }}>tap + to challenge each other</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <DareDetailSheet
        dare={selectedDare}
        onClose={() => setSelectedDare(null)}
        onEdit={id => { setSelectedDare(null); setTimeout(() => onAddDare(id), 200) }}
        onReveal={d => { setSelectedDare(null); setRevealDare(d) }}
      />

      <TradeReveal
        dare={revealDare}
        onClose={() => setRevealDare(null)}
      />

      <ClashPanel
        open={clashPanelOpen}
        onClose={() => setClashPanelOpen(false)}
      />
    </>
  )
}
