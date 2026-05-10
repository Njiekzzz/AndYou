import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../context/AppContext'
import { DareTarget } from '../types'

interface AddDareSheetProps {
  open: boolean
  onClose: () => void
  editDareId?: string | null
}

export function AddDareSheet({ open, onClose, editDareId }: AddDareSheetProps) {
  const { addDare, updateDare, dares, partner } = useApp()

  const isEditMode = !!editDareId
  const editDare = editDareId ? dares.find(d => d.id === editDareId) : null

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignedTo, setAssignedTo] = useState<DareTarget>('partner')
  const [tradeTitle, setTradeTitle] = useState('')
  const [tradeDescription, setTradeDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [category, setCategory] = useState('')
  const [saving, setSaving] = useState(false)

  const touchStartY = useRef(0)
  const onHandleTouchStart = useCallback((e: React.TouchEvent) => { touchStartY.current = e.touches[0].clientY }, [])
  const onHandleTouchEnd = useCallback((e: React.TouchEvent) => { if (e.changedTouches[0].clientY - touchStartY.current > 80) onClose() }, [onClose])

  useEffect(() => {
    if (open) {
      if (editDare) {
        setTitle(editDare.title)
        setDescription(editDare.description ?? '')
        setAssignedTo(editDare.assigned_to)
        setTradeTitle(editDare.trade_title ?? '')
        setTradeDescription(editDare.trade_description ?? '')
        setDueDate(editDare.due_date ?? '')
        setCategory(editDare.category ?? '')
      } else {
        setTitle('')
        setDescription('')
        setAssignedTo('partner')
        setTradeTitle('')
        setTradeDescription('')
        setDueDate('')
        setCategory('')
      }
    }
  }, [open, editDare, partner])

  const canSubmit = title.trim() && (assignedTo !== 'trade' || tradeTitle.trim())

  const handleSave = async () => {
    if (!canSubmit || saving) return
    setSaving(true)
    try {
      if (isEditMode && editDare) {
        await updateDare(editDare.id, {
          title: title.trim(),
          description: description.trim() || null,
          assigned_to: assignedTo,
          due_date: dueDate || null,
          category: category.trim() || null,
          trade_title: assignedTo === 'trade' ? (tradeTitle.trim() || null) : null,
          trade_description: assignedTo === 'trade' ? (tradeDescription.trim() || null) : null,
          // Clear change request on resubmit
          ...(editDare.status === 'change_requested' ? { status: 'pending' as const, change_request_note: null } : {}),
        })
      } else {
        await addDare({
          title: title.trim(),
          description: description.trim() || null,
          assigned_to: assignedTo,
          due_date: dueDate || null,
          category: category.trim() || null,
          trade_title: assignedTo === 'trade' ? (tradeTitle.trim() || null) : null,
          trade_description: assignedTo === 'trade' ? (tradeDescription.trim() || null) : null,
        })
      }
      onClose()
    } catch (err) {
      console.error('Failed to save dare', err)
    } finally {
      setSaving(false)
    }
  }

  const submitLabel = saving ? 'saving…' : isEditMode ? 'save' : 'send'

  const assignOptions: { value: DareTarget; label: string }[] = [
    { value: 'partner' as DareTarget, label: 'challenge them' },
    { value: 'trade' as DareTarget, label: 'trade' },
  ]

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(42,38,32,0.4)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 60 }}
            onClick={onClose}
          />
          <motion.div
            key="sheet"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 280, damping: 30, mass: 0.8 }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 61,
              background: 'var(--sheet-bg)', borderRadius: '24px 24px 0 0',
              maxHeight: '88vh', display: 'flex', flexDirection: 'column',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div
              onTouchStart={onHandleTouchStart} onTouchEnd={onHandleTouchEnd}
              style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 8, flexShrink: 0, cursor: 'grab' }}
            >
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
            </div>

            {/* Sticky header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px 14px', flexShrink: 0, borderBottom: '1px solid var(--border)' }}>
              <button onClick={onClose} style={{ fontSize: 14, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', padding: '6px 0', minWidth: 56 }}>
                cancel
              </button>
              <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
                {isEditMode ? 'edit dare' : 'new dare'}
              </span>
              <button
                onClick={handleSave}
                disabled={!canSubmit || saving}
                style={{
                  fontSize: 14, fontWeight: 600,
                  color: (!canSubmit || saving) ? 'var(--text-muted)' : 'var(--color-teal)',
                  fontFamily: 'var(--font-sans)', padding: '6px 0', minWidth: 56, textAlign: 'right',
                  transition: 'color 0.15s',
                }}
              >
                {submitLabel}
              </button>
            </div>

            {/* Scrollable content */}
            <div style={{ overflowY: 'auto', flex: 1, paddingBottom: 'env(safe-area-inset-bottom)' }}>
              <div style={{ padding: '16px 20px 32px' }}>

                {/* Change request note — shown read-only when editing a change_requested dare */}
                {isEditMode && editDare?.status === 'change_requested' && editDare.change_request_note && (
                  <div style={{
                    marginBottom: 20,
                    borderLeft: '3px solid var(--amber)',
                    background: 'rgba(212,144,10,0.08)',
                    padding: '10px 14px',
                    borderRadius: '0 8px 8px 0',
                  }}>
                    <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--amber)', margin: '0 0 4px' }}>
                      change requested
                    </p>
                    <p style={{ fontSize: 13, color: 'var(--text-mid)', fontStyle: 'italic', margin: 0 }}>
                      {editDare.change_request_note}
                    </p>
                  </div>
                )}

                {/* Assign to */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>assign to</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {assignOptions.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setAssignedTo(opt.value)}
                        style={{
                          flex: 1, padding: '8px 4px', borderRadius: 999, fontSize: 12,
                          border: `1px solid ${assignedTo === opt.value ? 'var(--color-teal)' : 'var(--border)'}`,
                          background: assignedTo === opt.value ? 'var(--color-teal)' : 'transparent',
                          color: assignedTo === opt.value ? '#fdf8eb' : 'var(--text-secondary)',
                          transition: 'all 0.15s', fontFamily: 'var(--font-sans)',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                    {assignedTo === 'trade' ? 'they have to…' : assignedTo === 'self' ? 'i dare myself to…' : 'dare them to…'} *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder={assignedTo === 'self' ? 'e.g. go on a solo walk' : 'e.g. sing in public'}
                    maxLength={80}
                    style={{ width: '100%', fontSize: 15, padding: '11px 12px', borderRadius: 10, boxSizing: 'border-box' }}
                  />
                </div>

                {/* Trade title (creator's dare) */}
                {assignedTo === 'trade' && (
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                      and you have to… *
                    </label>
                    <input
                      type="text"
                      value={tradeTitle}
                      onChange={e => setTradeTitle(e.target.value)}
                      placeholder="e.g. cook a new recipe"
                      maxLength={80}
                      style={{ width: '100%', fontSize: 15, padding: '11px 12px', borderRadius: 10, boxSizing: 'border-box' }}
                    />
                    <textarea
                      value={tradeDescription}
                      onChange={e => setTradeDescription(e.target.value)}
                      placeholder="any extra rules for your part... (optional)"
                      maxLength={300}
                      rows={2}
                      style={{ width: '100%', fontSize: 14, padding: '10px 12px', borderRadius: 10, boxSizing: 'border-box', marginTop: 8, resize: 'none' }}
                    />
                  </div>
                )}

                {/* Description */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                    {assignedTo === 'trade' ? "their dare details" : "details"} (optional)
                  </label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="any extra details or rules..."
                    maxLength={300}
                    rows={3}
                    style={{ width: '100%', fontSize: 14, padding: '10px 12px', borderRadius: 10, boxSizing: 'border-box', resize: 'none' }}
                  />
                </div>

                {/* Due date */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>due date (optional)</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    style={{ width: '100%', fontSize: 14, padding: '10px 12px', borderRadius: 10, boxSizing: 'border-box' }}
                  />
                </div>

                {/* Category */}
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>category (optional)</label>
                  <input
                    type="text"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    placeholder="e.g. silly, romantic, this week"
                    maxLength={40}
                    style={{ width: '100%', fontSize: 15, padding: '11px 12px', borderRadius: 10, boxSizing: 'border-box' }}
                  />
                </div>

              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
