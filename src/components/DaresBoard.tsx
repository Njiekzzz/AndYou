import { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import { Dare } from '../types'
import { DareCard } from './DareCard'
import { DareDetailSheet } from './DareDetailSheet'
import { TradeReveal } from './TradeReveal'
import { ClashPanel } from './ClashPanel'

const CANVAS_W = 560
const CARD_H = 270
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
  const colW = Math.floor((CANVAS_W - 40) / 3)
  const ox = (seed % 20) - 10
  const oy = ((seed * 7) % 20) - 10
  return { x: 20 + col * colW + ox, y: 20 + row * 260 + oy }
}

export function DaresBoard({ onAddDare }: DaresBoardProps) {
  const { dares, user, getUserById, updateDarePosition, theme, addClash, clashes } = useApp()

  // Section 2: filter out 'self' type dares
  const visibleDares = dares.filter(d => d.assigned_to !== 'self')

  const isDark = theme === 'dark'

  const [localPos, setLocalPos] = useState<Record<string, { x: number; y: number }>>({})
  const [selectedDare, setSelectedDare] = useState<Dare | null>(null)
  const [revealDare, setRevealDare] = useState<Dare | null>(null)
  const [clashPanelOpen, setClashPanelOpen] = useState(false)

  // Whiteboard state
  const boardRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [isOverview, setIsOverview] = useState(true)
  const [fitScale, setFitScale] = useState(0.6)
  const [scale, setScale] = useState(0.6)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const isOverviewRef = useRef(true)
  const fitScaleRef = useRef(0.6)

  // Card drag gesture state
  const gesture = useRef<{
    pointerId: number
    startPX: number; startPY: number
    dareId: string
    cardStartX: number; cardStartY: number
    cardEl: HTMLElement
    moved: number
    isDraggable: boolean
  } | null>(null)
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  // Canvas height grows with card count
  const numRows = Math.max(1, Math.ceil(visibleDares.length / 3))
  const CANVAS_H = Math.max(400, 40 + numRows * 260 + CARD_H)

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

  // Compute fit scale
  const recalcFitScale = useCallback(() => {
    if (!boardRef.current) return
    const boardW = boardRef.current.offsetWidth - 32
    const boardH = boardRef.current.offsetHeight - 32
    if (boardW <= 0 || boardH <= 0) return
    const s = Math.min(boardW / CANVAS_W, boardH / CANVAS_H, 1)
    fitScaleRef.current = s
    setFitScale(s)
    if (isOverviewRef.current) setScale(s)
  }, [CANVAS_H])

  useEffect(() => {
    recalcFitScale()
  }, [recalcFitScale, visibleDares.length])

  useEffect(() => {
    const ro = new ResizeObserver(() => recalcFitScale())
    if (boardRef.current) ro.observe(boardRef.current)
    return () => ro.disconnect()
  }, [recalcFitScale])

  // Auto-open clash panel if active clash exists for this wall
  useEffect(() => {
    const active = clashes.find(c => ['selecting', 'pending_acceptance', 'live'].includes(c.status))
    if (active && !clashPanelOpen) {
      setTimeout(() => setClashPanelOpen(true), 300)
    }
  }, [clashes]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleBoardTap = useCallback(() => {
    if (!isOverviewRef.current) return
    isOverviewRef.current = false
    setIsOverview(false)
    setIsTransitioning(true)
    setScale(1)

    const hintKey = 'dare-zoom-hint-dismissed'
    if (!localStorage.getItem(hintKey)) {
      setShowHint(true)
      setTimeout(() => {
        setShowHint(false)
        localStorage.setItem(hintKey, '1')
      }, 2000)
    }

    setTimeout(() => setIsTransitioning(false), 300)
  }, [])

  const returnToOverview = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation()
    isOverviewRef.current = true
    setIsOverview(true)
    setIsTransitioning(true)
    setScale(fitScaleRef.current)
    setTimeout(() => setIsTransitioning(false), 300)
  }, [])

  const schedulePositionSave = useCallback((id: string, x: number, y: number) => {
    if (saveTimers.current[id]) clearTimeout(saveTimers.current[id])
    saveTimers.current[id] = setTimeout(() => updateDarePosition(id, x, y), 600)
  }, [updateDarePosition])

  // Card drag — only active when zoomed in
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const cardEl = (e.target as Element).closest('[data-dare-id]') as HTMLElement | null
    if (!cardEl) return

    const dareId = cardEl.dataset.dareId!
    const dare = visibleDares.find(d => d.id === dareId)
    if (!dare) return

    const isDraggable = dare.created_by === user?.id
    const idx = visibleDares.indexOf(dare)
    const pos = localPos[dareId] ?? defaultPos(dare, idx)

    gesture.current = {
      pointerId: e.pointerId,
      startPX: e.clientX, startPY: e.clientY,
      dareId, cardStartX: pos.x, cardStartY: pos.y,
      cardEl, moved: 0, isDraggable,
    }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [visibleDares, user?.id, localPos])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!gesture.current || gesture.current.pointerId !== e.pointerId) return
    const dx = e.clientX - gesture.current.startPX
    const dy = e.clientY - gesture.current.startPY
    gesture.current.moved = Math.sqrt(dx * dx + dy * dy)

    if (gesture.current.isDraggable && gesture.current.moved > DRAG_THRESHOLD) {
      gesture.current.cardEl.style.transform = `rotate(${getDareRotation(gesture.current.dareId)}deg) translate(${dx}px, ${dy}px)`
    }
  }, [])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!gesture.current || gesture.current.pointerId !== e.pointerId) return
    const { dareId, cardStartX, cardStartY, cardEl, startPX, startPY, moved, isDraggable } = gesture.current

    if (moved < DRAG_THRESHOLD) {
      cardEl.style.transform = `rotate(${getDareRotation(dareId)}deg)`
      const dare = visibleDares.find(d => d.id === dareId)
      if (dare) setSelectedDare(dare)
    } else if (isDraggable) {
      const dx = e.clientX - startPX
      const dy = e.clientY - startPY
      const newX = cardStartX + dx
      const newY = cardStartY + dy
      cardEl.style.transform = `rotate(${getDareRotation(dareId)}deg)`
      setLocalPos(prev => ({ ...prev, [dareId]: { x: newX, y: newY } }))
      schedulePositionSave(dareId, newX, newY)
    } else {
      cardEl.style.transform = `rotate(${getDareRotation(dareId)}deg)`
    }

    gesture.current = null
  }, [visibleDares, schedulePositionSave])

  const handleChallengeTime = useCallback(async () => {
    if (!user) return
    const clashId = await addClash()
    if (clashId) setClashPanelOpen(true)
  }, [user, addClash])

  const isEmpty = visibleDares.length === 0

  return (
    <>
      {/* Fixed container filling space between TopBar and BottomNav */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Challenge Time button */}
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
        </div>

        {/* Whiteboard wrapper — relative for overlay positioning */}
        <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
          {/* Whiteboard board */}
          <div
            ref={boardRef}
            style={{
              position: 'absolute', inset: 0,
              background: isDark ? '#1a1710' : '#fafaf8',
              border: `2px solid ${isDark ? '#4a4030' : '#c4b89a'}`,
              borderRadius: 12,
              boxShadow: isDark
                ? 'inset 0 0 0 6px #221e14, inset 0 0 0 7px #4a4030, 0 4px 24px rgba(0,0,0,0.4)'
                : 'inset 0 0 0 6px #f0ebe0, inset 0 0 0 7px #c4b89a, 0 4px 24px rgba(50,35,10,0.14)',
              overflow: isOverview ? 'hidden' : 'auto',
              cursor: isOverview ? 'zoom-in' : 'default',
            }}
            onClick={isOverview ? handleBoardTap : undefined}
          >
            {/* Inner canvas */}
            <div
              ref={contentRef}
              style={{
                position: 'relative',
                width: CANVAS_W,
                height: CANVAS_H,
                transformOrigin: 'top left',
                transform: `scale(${scale})`,
                transition: isTransitioning ? 'transform 250ms ease-out' : 'none',
                pointerEvents: isOverview ? 'none' : 'auto',
              }}
              onPointerDown={isOverview ? undefined : onPointerDown}
              onPointerMove={isOverview ? undefined : onPointerMove}
              onPointerUp={isOverview ? undefined : onPointerUp}
              onPointerCancel={isOverview ? undefined : onPointerUp}
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
                    isDraggable={dare.created_by === user?.id && !isOverview}
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

          {/* Back arrow — overlays the board, outside the scrollable div */}
          {!isOverview && (
            <button
              onClick={returnToOverview}
              style={{
                position: 'absolute', top: 10, left: 10, zIndex: 10,
                width: 32, height: 32, borderRadius: '50%',
                background: 'var(--amber)', color: '#fff',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, fontWeight: 600,
                boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
              }}
            >
              ←
            </button>
          )}

          {/* Zoom hint */}
          {showHint && (
            <div style={{
              position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.72)', color: '#fff',
              padding: '6px 14px', borderRadius: 20, fontSize: 12,
              whiteSpace: 'nowrap', zIndex: 20, pointerEvents: 'none',
            }}>
              tap ← to zoom back out
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
