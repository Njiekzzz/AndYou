import { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import { Dare } from '../types'
import { DareCard, getDareRotation as _getDareRotation } from './DareCard'
import { DareDetailSheet } from './DareDetailSheet'
import { TradeReveal } from './TradeReveal'
import { ClashPanel } from './ClashPanel'

void _getDareRotation

const CANVAS_WIDTH = 2400
const CANVAS_HEIGHT = 2000

interface DaresBoardProps {
  onAddDare: (editId?: string) => void
}

export function DaresBoard({ onAddDare }: DaresBoardProps) {
  const {
    dares, user, getUserById, updateDarePosition,
    boardLabels, addBoardLabel, updateBoardLabel, deleteBoardLabel,
    theme, addClash, clashes,
  } = useApp()

  const visibleDares = dares.filter(d => d.assigned_to !== 'self')
  const isDark = theme === 'dark'

  // ── View state ──────────────────────────────────────────────────────────
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const [localPos, setLocalPos] = useState<Record<string, { x: number; y: number }>>({})
  // Unified lifted state: dare id for cards, "label-<id>" for labels
  const [liftedCardId, setLiftedCardId] = useState<string | null>(null)
  const [localLabelPos, setLocalLabelPos] = useState<Record<string, { x: number; y: number }>>({})
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null)
  const [editingLabelText, setEditingLabelText] = useState('')
  const [selectedDare, setSelectedDare] = useState<Dare | null>(null)
  const [revealDare, setRevealDare] = useState<Dare | null>(null)
  const [clashPanelOpen, setClashPanelOpen] = useState(false)

  // ── Refs ─────────────────────────────────────────────────────────────────
  const boardRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const lastPinchDist = useRef<number | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Stores prefixed id: "label-<id>" for labels, bare id for cards
  const longPressTargetId = useRef<string | null>(null)
  const pressStartPos = useRef({ x: 0, y: 0 })
  const cardDragStart = useRef({ x: 0, y: 0, cardX: 0, cardY: 0 })
  const liftedCardIdRef = useRef<string | null>(null)
  const localPosRef = useRef<Record<string, { x: number; y: number }>>({})
  const localLabelPosRef = useRef<Record<string, { x: number; y: number }>>({})
  const panRef = useRef({ x: 0, y: 0 })
  const scaleRef = useRef(1)
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const lastTapTimeRef = useRef(0)
  const lastTapLabelIdRef = useRef<string | null>(null)
  const visibleDaresRef = useRef(visibleDares)
  const boardLabelsRef = useRef(boardLabels)
  const editingLabelTextRef = useRef('')
  const labelEditTextareaRef = useRef<HTMLTextAreaElement>(null)
  const updateDarePositionRef = useRef(updateDarePosition)
  const updateBoardLabelRef = useRef(updateBoardLabel)
  const deleteBoardLabelRef = useRef(deleteBoardLabel)
  const addBoardLabelRef = useRef(addBoardLabel)

  // Sync refs
  useEffect(() => { visibleDaresRef.current = visibleDares }, [visibleDares])
  useEffect(() => { boardLabelsRef.current = boardLabels }, [boardLabels])
  useEffect(() => { editingLabelTextRef.current = editingLabelText }, [editingLabelText])
  useEffect(() => { updateDarePositionRef.current = updateDarePosition }, [updateDarePosition])
  useEffect(() => { updateBoardLabelRef.current = updateBoardLabel }, [updateBoardLabel])
  useEffect(() => { deleteBoardLabelRef.current = deleteBoardLabel }, [deleteBoardLabel])
  useEffect(() => { addBoardLabelRef.current = addBoardLabel }, [addBoardLabel])

  // ── Clamp pan to canvas bounds ──────────────────────────────────────────
  const clampPan = useCallback((x: number, y: number, s: number) => {
    if (!boardRef.current) return { x, y }
    const boardW = boardRef.current.offsetWidth
    const boardH = boardRef.current.offsetHeight
    const minX = Math.min(0, boardW - CANVAS_WIDTH * s)
    const minY = Math.min(0, boardH - CANVAS_HEIGHT * s)
    return {
      x: Math.min(0, Math.max(x, minX)),
      y: Math.min(0, Math.max(y, minY)),
    }
  }, [])

  // ── Scale to fit on mount ───────────────────────────────────────────────
  const scaleToFit = useCallback(() => {
    if (!boardRef.current) return
    const boardW = boardRef.current.offsetWidth
    const boardH = boardRef.current.offsetHeight
    const fitScale = Math.min(boardW / CANVAS_WIDTH, boardH / CANVAS_HEIGHT, 1)
    scaleRef.current = fitScale
    panRef.current = { x: 0, y: 0 }
    setScale(fitScale)
    setPan({ x: 0, y: 0 })
  }, [])

  useEffect(() => {
    const t = setTimeout(scaleToFit, 50)
    return () => clearTimeout(t)
  }, [scaleToFit])

  // ── Sync dare positions from Firestore ──────────────────────────────────
  useEffect(() => {
    if (!user) return
    const updates: Record<string, { x: number; y: number }> = {}
    const needsSave: Array<{ id: string; x: number; y: number }> = []

    dares.filter(d => d.assigned_to !== 'self').forEach(dare => {
      if (dare.board_x != null && dare.board_y != null) {
        if (liftedCardIdRef.current !== dare.id) {
          const cur = localPosRef.current[dare.id]
          if (!cur || cur.x !== dare.board_x || cur.y !== dare.board_y) {
            updates[dare.id] = { x: dare.board_x, y: dare.board_y }
          }
        }
      } else if (!localPosRef.current[dare.id]) {
        const pos = {
          x: Math.random() * (CANVAS_WIDTH - 180) + 20,
          y: Math.random() * (CANVAS_HEIGHT - 180) + 20,
        }
        updates[dare.id] = pos
        needsSave.push({ id: dare.id, ...pos })
      }
    })

    if (Object.keys(updates).length > 0) {
      const next = { ...localPosRef.current, ...updates }
      localPosRef.current = next
      setLocalPos(next)
    }
    needsSave.forEach(({ id, x, y }) => updateDarePositionRef.current(id, x, y))
  }, [dares, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync label positions from Firestore ─────────────────────────────────
  useEffect(() => {
    const updates: Record<string, { x: number; y: number }> = {}
    boardLabels.forEach(label => {
      if (liftedCardIdRef.current !== `label-${label.id}`) {
        const cur = localLabelPosRef.current[label.id]
        if (!cur || cur.x !== label.x || cur.y !== label.y) {
          updates[label.id] = { x: label.x, y: label.y }
        }
      }
    })
    if (Object.keys(updates).length > 0) {
      const next = { ...localLabelPosRef.current, ...updates }
      localLabelPosRef.current = next
      setLocalLabelPos(next)
    }
  }, [boardLabels])

  // ── Keep selectedDare in sync ───────────────────────────────────────────
  useEffect(() => {
    if (selectedDare) {
      const updated = visibleDares.find(d => d.id === selectedDare.id)
      if (updated) setSelectedDare(updated)
      else setSelectedDare(null)
    }
  }, [dares]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-open clash panel ───────────────────────────────────────────────
  useEffect(() => {
    const active = clashes.find(c => ['selecting', 'pending_acceptance', 'live'].includes(c.status))
    if (active && !clashPanelOpen) setTimeout(() => setClashPanelOpen(true), 300)
  }, [clashes]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Focus label textarea when entering edit mode ────────────────────────
  useEffect(() => {
    if (editingLabelId && labelEditTextareaRef.current) {
      labelEditTextareaRef.current.focus()
      labelEditTextareaRef.current.select()
    }
  }, [editingLabelId])

  // ── Long press (500ms, unified for cards and labels) ────────────────────
  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
    longPressTargetId.current = null
  }, [])

  // prefixedId: "label-<id>" for labels, bare dare id for cards
  const startLongPress = useCallback((prefixedId: string, x: number, y: number) => {
    pressStartPos.current = { x, y }
    longPressTargetId.current = prefixedId
    longPressTimer.current = setTimeout(() => {
      longPressTimer.current = null  // clear self so resolvePressEnd knows timer fired
      const isLabel = prefixedId.startsWith('label-')
      if (isLabel) {
        const labelId = prefixedId.slice(6)
        const label = boardLabelsRef.current.find(l => l.id === labelId)
        if (!label) return
        const lpos = localLabelPosRef.current[labelId] ?? { x: label.x, y: label.y }
        cardDragStart.current = { x: pressStartPos.current.x, y: pressStartPos.current.y, cardX: lpos.x, cardY: lpos.y }
      } else {
        const pos = localPosRef.current[prefixedId] ?? { x: 0, y: 0 }
        cardDragStart.current = { x: pressStartPos.current.x, y: pressStartPos.current.y, cardX: pos.x, cardY: pos.y }
      }
      liftedCardIdRef.current = prefixedId
      setLiftedCardId(prefixedId)
      navigator.vibrate && navigator.vibrate(18)
    }, 500)
  }, [])

  // ── Save helpers ────────────────────────────────────────────────────────
  const scheduleCardSave = (id: string, x: number, y: number) => {
    if (saveTimers.current[id]) clearTimeout(saveTimers.current[id])
    saveTimers.current[id] = setTimeout(() => updateDarePositionRef.current(id, x, y), 600)
  }

  const saveLabelPos = (id: string, x: number, y: number) => {
    updateBoardLabelRef.current(id, { x, y })
  }

  // ── Label tap (double-tap → edit) ───────────────────────────────────────
  const handleLabelTap = useCallback((labelId: string) => {
    const now = Date.now()
    if (lastTapLabelIdRef.current === labelId && now - lastTapTimeRef.current < 350) {
      const label = boardLabelsRef.current.find(l => l.id === labelId)
      if (label) {
        setEditingLabelId(labelId)
        setEditingLabelText(label.text)
      }
    }
    lastTapTimeRef.current = now
    lastTapLabelIdRef.current = labelId
  }, [])

  // ── Label edit blur ─────────────────────────────────────────────────────
  const handleLabelEditBlur = useCallback(async (labelId: string) => {
    const text = editingLabelTextRef.current.trim()
    if (!text) {
      await deleteBoardLabelRef.current(labelId)
    } else {
      await updateBoardLabelRef.current(labelId, { text })
    }
    setEditingLabelId(null)
    setEditingLabelText('')
  }, [])

  // ── Add label ───────────────────────────────────────────────────────────
  const handleAddLabel = useCallback(async () => {
    if (!boardRef.current) return
    const visibleCenterX = (-panRef.current.x + boardRef.current.offsetWidth / 2) / scaleRef.current
    const visibleCenterY = (-panRef.current.y + boardRef.current.offsetHeight / 2) / scaleRef.current
    const x = Math.min(Math.max(visibleCenterX - 60, 0), CANVAS_WIDTH - 120)
    const y = Math.min(Math.max(visibleCenterY - 20, 0), CANVAS_HEIGHT - 60)
    const id = await addBoardLabelRef.current({ text: 'category', x, y })
    if (id) {
      setEditingLabelId(id)
      setEditingLabelText('category')
    }
  }, [])

  // ── Drop lifted item helper ─────────────────────────────────────────────
  const dropLifted = useCallback(() => {
    const id = liftedCardIdRef.current
    if (!id) return
    liftedCardIdRef.current = null
    setLiftedCardId(null)
    if (id.startsWith('label-')) {
      const labelId = id.slice(6)
      const pos = localLabelPosRef.current[labelId]
      if (pos) saveLabelPos(labelId, pos.x, pos.y)
    } else {
      const pos = localPosRef.current[id]
      if (pos) scheduleCardSave(id, pos.x, pos.y)
    }
  }, [])

  // ── Shared tap/drop resolution ──────────────────────────────────────────
  const resolvePressEnd = useCallback(() => {
    if (longPressTimer.current) {
      // Timer still pending → user released before 500ms → it's a tap
      const targetId = longPressTargetId.current
      cancelLongPress()
      if (targetId) {
        if (targetId.startsWith('label-')) {
          handleLabelTap(targetId.slice(6))
        } else {
          const dare = visibleDaresRef.current.find(d => d.id === targetId)
          if (dare) setSelectedDare(dare)
        }
      }
      return
    }
    dropLifted()
  }, [cancelLongPress, handleLabelTap, dropLifted])

  // ── Movement handler (shared mouse + touch) ─────────────────────────────
  const handleMove = useCallback((cx: number, cy: number) => {
    if (longPressTimer.current) {
      const moved = Math.hypot(cx - pressStartPos.current.x, cy - pressStartPos.current.y)
      if (moved > 4) {
        cancelLongPress()
        isDragging.current = true
        dragStart.current = { x: pressStartPos.current.x, y: pressStartPos.current.y, panX: panRef.current.x, panY: panRef.current.y }
      }
    }

    if (liftedCardIdRef.current) {
      const id = liftedCardIdRef.current
      // Drag formula: raw screen delta, no scale division (intentional)
      const dx = cx - cardDragStart.current.x
      const dy = cy - cardDragStart.current.y
      if (id.startsWith('label-')) {
        const labelId = id.slice(6)
        const nx = Math.min(Math.max(cardDragStart.current.cardX + dx, 0), CANVAS_WIDTH - 20)
        const ny = Math.min(Math.max(cardDragStart.current.cardY + dy, 0), CANVAS_HEIGHT - 40)
        const next = { ...localLabelPosRef.current, [labelId]: { x: nx, y: ny } }
        localLabelPosRef.current = next
        setLocalLabelPos(next)
      } else {
        const nx = Math.min(Math.max(cardDragStart.current.cardX + dx, 0), CANVAS_WIDTH - 140)
        const ny = Math.min(Math.max(cardDragStart.current.cardY + dy, 0), CANVAS_HEIGHT - 160)
        const next = { ...localPosRef.current, [id]: { x: nx, y: ny } }
        localPosRef.current = next
        setLocalPos(next)
      }
      return
    }

    if (isDragging.current) {
      const np = clampPan(
        dragStart.current.panX + (cx - dragStart.current.x),
        dragStart.current.panY + (cy - dragStart.current.y),
        scaleRef.current
      )
      panRef.current = np
      setPan(np)
    }
  }, [cancelLongPress, clampPan])

  // ── Mouse handlers ──────────────────────────────────────────────────────
  // Board mousedown only fires on empty areas — cards/labels stop propagation
  const onBoardMouseDown = useCallback((e: React.MouseEvent) => {
    if (!liftedCardIdRef.current) {
      isDragging.current = true
      dragStart.current = { x: e.clientX, y: e.clientY, panX: panRef.current.x, panY: panRef.current.y }
    }
  }, [])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    handleMove(e.clientX, e.clientY)
  }, [handleMove])

  const onMouseUp = useCallback(() => {
    resolvePressEnd()
    isDragging.current = false
  }, [resolvePressEnd])

  const onMouseLeave = useCallback(() => {
    dropLifted()
    cancelLongPress()
    isDragging.current = false
  }, [dropLifted, cancelLongPress])

  // ── Touch handlers ──────────────────────────────────────────────────────
  // Board touchstart only fires on empty areas — cards/labels stop propagation
  const onBoardTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      cancelLongPress()
      isDragging.current = false
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      lastPinchDist.current = Math.hypot(dx, dy)
      return
    }
    if (e.touches.length === 1 && !liftedCardIdRef.current) {
      const t = e.touches[0]
      isDragging.current = true
      dragStart.current = { x: t.clientX, y: t.clientY, panX: panRef.current.x, panY: panRef.current.y }
    }
  }, [cancelLongPress])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastPinchDist.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const newDist = Math.hypot(dx, dy)
      const newScale = Math.min(Math.max(scaleRef.current * (newDist / lastPinchDist.current), 0.3), 2.5)
      const np = clampPan(panRef.current.x, panRef.current.y, newScale)
      scaleRef.current = newScale
      panRef.current = np
      setScale(newScale)
      setPan(np)
      lastPinchDist.current = newDist
      return
    }
    if (e.touches.length === 1) {
      handleMove(e.touches[0].clientX, e.touches[0].clientY)
    }
  }, [handleMove, clampPan])

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) lastPinchDist.current = null
    if (e.touches.length === 0) {
      resolvePressEnd()
      isDragging.current = false
    }
  }, [resolvePressEnd])

  // ── Challenge time ──────────────────────────────────────────────────────
  const handleChallengeTime = useCallback(async () => {
    if (!user) return
    const clashId = await addClash()
    if (clashId) setClashPanelOpen(true)
  }, [user, addClash])

  // ── Dot grid ────────────────────────────────────────────────────────────
  const dotGridStyle = isDark
    ? { backgroundColor: '#1a1710', backgroundImage: 'radial-gradient(circle, #2e2a20 1.2px, transparent 1.2px)', backgroundSize: '16px 16px' }
    : { backgroundColor: '#f0ebe0', backgroundImage: 'radial-gradient(circle, #cdc3ac 1.2px, transparent 1.2px)', backgroundSize: '16px 16px' }

  const boardCursor = liftedCardId ? 'grabbing' : 'grab'

  return (
    <>
      <div style={{
        position: 'fixed', top: 64, bottom: 72, left: 0, right: 0,
        display: 'flex', flexDirection: 'column',
        padding: '8px 16px 12px',
        boxSizing: 'border-box',
        background: 'var(--bg-main, var(--cream))',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 52, flexShrink: 0,
        }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 20, color: 'var(--text-primary)' }}>
            challenges
          </span>
          <button
            onClick={handleChallengeTime}
            style={{
              height: 40, padding: '0 14px', borderRadius: 20,
              background: 'transparent', border: '1.5px solid var(--amber)',
              color: 'var(--amber)', fontFamily: 'var(--font-sans)',
              fontSize: 13, fontWeight: 600, letterSpacing: '0.03em',
              display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--amber)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 1L3 7h4l-2 4 6-7H7l1-3z"/>
            </svg>
            challenge time
          </button>
        </div>

        {/* Board outer frame */}
        <div
          ref={boardRef}
          style={{
            flex: 1, minHeight: 0,
            border: `2px solid ${isDark ? '#4a4030' : '#c4b89a'}`,
            borderRadius: 12,
            boxShadow: isDark
              ? 'inset 0 0 0 6px #221e14, inset 0 0 0 7px #4a4030, 0 4px 24px rgba(0,0,0,0.4)'
              : 'inset 0 0 0 6px #f0ebe0, inset 0 0 0 7px #c4b89a, 0 4px 24px rgba(50,35,10,0.14)',
            overflow: 'hidden',
            cursor: boardCursor,
            userSelect: 'none',
            WebkitUserSelect: 'none',
            touchAction: 'none',
            position: 'relative',
          }}
          onMouseDown={onBoardMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
          onTouchStart={onBoardTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Inner canvas — 2400×2000, dot grid, scaled/translated */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: CANVAS_WIDTH,
              height: CANVAS_HEIGHT,
              transformOrigin: 'top left',
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
              ...dotGridStyle,
            }}
          >
            {/* Dare polaroid cards */}
            {visibleDares.map(dare => {
              const pos = localPos[dare.id]
              if (!pos) return null
              const creator = getUserById(dare.created_by)
              return (
                <DareCard
                  key={dare.id}
                  dare={dare}
                  x={pos.x}
                  y={pos.y}
                  creator={creator}
                  isLifted={liftedCardId === dare.id}
                  onMouseDown={e => { e.stopPropagation(); startLongPress(dare.id, e.clientX, e.clientY) }}
                  onTouchStart={e => { e.stopPropagation(); startLongPress(dare.id, e.touches[0].clientX, e.touches[0].clientY) }}
                />
              )
            })}

            {/* Text labels */}
            {boardLabels.map(label => {
              const lpos = localLabelPos[label.id] ?? { x: label.x, y: label.y }
              const isLabelLifted = liftedCardId === `label-${label.id}`
              return (
                <div
                  key={label.id}
                  data-label-id={label.id}
                  onMouseDown={e => { e.stopPropagation(); startLongPress(`label-${label.id}`, e.clientX, e.clientY) }}
                  onTouchStart={e => { e.stopPropagation(); startLongPress(`label-${label.id}`, e.touches[0].clientX, e.touches[0].clientY) }}
                  style={{
                    position: 'absolute',
                    left: lpos.x,
                    top: lpos.y,
                    fontFamily: "'Caveat', cursive",
                    fontSize: 28,
                    fontWeight: 400,
                    color: isDark ? '#b0a080' : '#6b5e48',
                    lineHeight: 1.2,
                    whiteSpace: 'pre',
                    cursor: isLabelLifted ? 'grabbing' : 'default',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    zIndex: isLabelLifted ? 20 : 5,
                    minWidth: 60,
                  }}
                >
                  {editingLabelId === label.id ? (
                    <textarea
                      ref={labelEditTextareaRef}
                      value={editingLabelText}
                      onChange={e => setEditingLabelText(e.target.value)}
                      onBlur={() => handleLabelEditBlur(label.id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { e.preventDefault(); handleLabelEditBlur(label.id) }
                      }}
                      onMouseDown={e => e.stopPropagation()}
                      onTouchStart={e => e.stopPropagation()}
                      style={{
                        fontFamily: "'Caveat', cursive",
                        fontSize: 28,
                        fontWeight: 400,
                        color: isDark ? '#b0a080' : '#6b5e48',
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        resize: 'none',
                        width: Math.max(80, editingLabelText.length * 17),
                        minHeight: 40,
                        padding: 0,
                        lineHeight: 1.2,
                        display: 'block',
                      }}
                    />
                  ) : (
                    label.text
                  )}

                  {/* × delete button — shown while label is lifted */}
                  {isLabelLifted && (
                    <button
                      onMouseDown={e => {
                        e.stopPropagation()
                        liftedCardIdRef.current = null
                        setLiftedCardId(null)
                        deleteBoardLabelRef.current(label.id)
                      }}
                      onTouchStart={e => {
                        e.stopPropagation()
                        liftedCardIdRef.current = null
                        setLiftedCardId(null)
                        deleteBoardLabelRef.current(label.id)
                      }}
                      style={{
                        position: 'absolute',
                        top: -10,
                        right: -10,
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: 'rgba(200,70,70,0.92)',
                        color: '#fff',
                        fontSize: 15,
                        lineHeight: '18px',
                        textAlign: 'center',
                        border: 'none',
                        cursor: 'pointer',
                        zIndex: 30,
                        padding: 0,
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* T button — add text label */}
          <button
            onClick={handleAddLabel}
            onMouseDown={e => e.stopPropagation()}
            onTouchStart={e => e.stopPropagation()}
            style={{
              position: 'absolute',
              bottom: 12,
              right: 12,
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: isDark ? '#2a2518' : '#e8e2d4',
              border: `1.5px solid ${isDark ? '#5a5040' : '#c4b89a'}`,
              color: isDark ? '#b0a080' : '#6b5e48',
              fontFamily: 'Georgia, serif',
              fontStyle: 'italic',
              fontSize: 18,
              fontWeight: 400,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 30,
              cursor: 'pointer',
            }}
          >
            T
          </button>
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
