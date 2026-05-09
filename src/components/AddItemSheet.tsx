import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../context/AppContext'
import { BucketItem, ItemMood, ItemStatus, ItemTheme, ITEM_THEMES } from '../types'
import { requestNotificationPermission } from '../lib/notifications'

function formatSecs(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

interface AddItemSheetProps {
  open: boolean
  onClose: () => void
  editItem?: BucketItem | null
}

export function AddItemSheet({ open, onClose, editItem }: AddItemSheetProps) {
  const { regions, addItem, updateItem, uploadImage, uploadAudio, user } = useApp()
  const isEditMode = !!editItem

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [mood, setMood] = useState<ItemMood>('physical')
  const [regionId, setRegionId] = useState('')
  const [status, setStatus] = useState<ItemStatus>('committed')
  const [itemTheme, setItemTheme] = useState<ItemTheme | null>(null)
  const [date, setDate] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Sealed note state
  const [sealedNote, setSealedNote] = useState('')

  // Voice note state
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null)
  const [voicePreviewUrl, setVoicePreviewUrl] = useState<string | null>(null)
  const [voiceRecording, setVoiceRecording] = useState(false)
  const [voiceSecs, setVoiceSecs] = useState(0)
  const voiceMrRef = useRef<MediaRecorder | null>(null)
  const voiceChunksRef = useRef<Blob[]>([])
  const voiceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const handleTouchStart = useRef(0)
  const onHandleTouchStart = useCallback((e: React.TouchEvent) => { handleTouchStart.current = e.touches[0].clientY }, [])
  const onHandleTouchEnd = useCallback((e: React.TouchEvent) => { if (e.changedTouches[0].clientY - handleTouchStart.current > 80) handleClose() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Pre-fill form when opening in edit mode
  useEffect(() => {
    if (open && editItem) {
      setTitle(editItem.title)
      setDescription(editItem.description ?? '')
      setLocation(editItem.location ?? '')
      setMood(editItem.mood)
      setRegionId(editItem.region_id)
      setStatus(editItem.status)
      setItemTheme((editItem.theme as ItemTheme) ?? null)
      setDate(editItem.date ?? '')
      setImagePreview(editItem.image_url ?? null)
      setImageFile(null)
      setVoiceBlob(null)
      setVoicePreviewUrl(editItem.voice_note_url ?? null)
      setSealedNote(editItem.created_by === user?.id ? (editItem.sealed_note ?? '') : '')
    } else if (open && regions.length > 0 && !regionId) {
      setRegionId(regions[0].id)
    }
  }, [open, editItem]) // eslint-disable-line react-hooks/exhaustive-deps

  const stopVoiceRecording = useCallback(() => {
    voiceMrRef.current?.stop()
    setVoiceRecording(false)
    if (voiceTimerRef.current) clearInterval(voiceTimerRef.current)
  }, [])

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      voiceChunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) voiceChunksRef.current.push(e.data) }
      mr.onstop = () => {
        const blob = new Blob(voiceChunksRef.current, { type: 'audio/webm' })
        if (voicePreviewUrl && !voicePreviewUrl.startsWith('http')) URL.revokeObjectURL(voicePreviewUrl)
        setVoiceBlob(blob)
        setVoicePreviewUrl(URL.createObjectURL(blob))
        setDescription('')
        stream.getTracks().forEach(t => t.stop())
      }
      mr.start()
      voiceMrRef.current = mr
      setVoiceRecording(true)
      setVoiceSecs(0)
      voiceTimerRef.current = setInterval(() => setVoiceSecs(s => s + 1), 1000)
    } catch {
      // microphone not available or denied
    }
  }

  const clearVoiceNote = () => {
    if (voicePreviewUrl && !voicePreviewUrl.startsWith('http')) URL.revokeObjectURL(voicePreviewUrl)
    setVoiceBlob(null)
    setVoicePreviewUrl(null)
  }

  const reset = () => {
    setTitle('')
    setDescription('')
    setLocation('')
    setMood('physical')
    setStatus('committed')
    setItemTheme(null)
    setDate('')
    setImageFile(null)
    setImagePreview(null)
    setRegionId('')
    setSaving(false)
    stopVoiceRecording()
    clearVoiceNote()
    setVoiceSecs(0)
    setSealedNote('')
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = ev => setImagePreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    if (!title.trim() || !regionId || saving) return
    setSaving(true)
    requestNotificationPermission().catch(() => {})

    try {
      if (isEditMode && editItem) {
        // Edit existing item
        const updates: Partial<BucketItem> = {
          title: title.trim(),
          description: description.trim() || null,
          location: location.trim() || null,
          mood,
          theme: itemTheme,
          region_id: regionId,
          status,
          date: date.trim() || null,
          ...(editItem.created_by === user?.id ? {
            sealed_note: sealedNote.trim() || null,
            sealed_note_at: sealedNote.trim() ? (editItem.sealed_note_at ?? new Date().toISOString()) : null,
          } : {}),
        }

        // If a new image was selected, upload it
        if (imageFile) {
          const blobUrl = URL.createObjectURL(imageFile)
          updates.image_url = blobUrl
          await updateItem(editItem.id, updates)
          handleClose()
          uploadImage(imageFile)
            .then(realUrl => updateItem(editItem.id, { image_url: realUrl }))
            .catch(err => console.warn('Background image upload failed:', err))
        } else {
          await updateItem(editItem.id, updates)
          handleClose()
        }

        if (voiceBlob) {
          uploadAudio(voiceBlob)
            .then(url => updateItem(editItem.id, { voice_note_url: url }))
            .catch(err => console.warn('Voice note upload failed:', err))
        }
      } else {
        // Add new item
        const blobUrl = imageFile ? URL.createObjectURL(imageFile) : null
        const itemId = await addItem({
          title: title.trim(),
          description: description.trim() || null,
          image_url: blobUrl,
          real_image_url: null,
          location: location.trim() || null,
          mood,
          theme: itemTheme,
          region_id: regionId,
          status,
          date: date.trim() || null,
          voice_note_url: null,
          sealed_note: sealedNote.trim() || null,
          sealed_note_at: sealedNote.trim() ? new Date().toISOString() : null,
        })
        handleClose()

        if (imageFile && itemId) {
          uploadImage(imageFile)
            .then(realUrl => updateItem(itemId, { image_url: realUrl }))
            .catch(err => console.warn('Background image upload failed:', err))
        }

        if (voiceBlob && itemId) {
          uploadAudio(voiceBlob)
            .then(url => updateItem(itemId, { voice_note_url: url }))
            .catch(err => console.warn('Voice note upload failed:', err))
        }
      }
    } catch (err) {
      console.error('Failed to save item', err)
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(42,38,32,0.4)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              zIndex: 60,
            }}
            onClick={handleClose}
          />
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 280, damping: 30, mass: 0.8 }}
            style={{
              position: 'fixed',
              bottom: 0, left: 0, right: 0,
              zIndex: 61,
              background: 'var(--sheet-bg)',
              borderRadius: '24px 24px 0 0',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              touchAction: 'pan-y',
              overflowX: 'hidden',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle — drag-to-close only on this strip */}
            <div
              onTouchStart={onHandleTouchStart}
              onTouchEnd={onHandleTouchEnd}
              style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 8, flexShrink: 0, cursor: 'grab' }}
            >
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
            </div>

            {/* Sticky header — always visible */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0 20px 14px', flexShrink: 0,
              borderBottom: '1px solid var(--border)',
            }}>
              <button
                onClick={handleClose}
                style={{ fontSize: 14, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', padding: '6px 0', minWidth: 56 }}
              >
                cancel
              </button>
              <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
                {isEditMode ? 'edit memory' : 'add to your wall'}
              </span>
              <button
                onClick={handleSave}
                disabled={!title.trim() || !regionId || saving}
                style={{
                  fontSize: 14, fontWeight: 600, color: (!title.trim() || !regionId || saving) ? 'var(--text-muted)' : 'var(--color-teal)',
                  fontFamily: 'var(--font-sans)', padding: '6px 0', minWidth: 56, textAlign: 'right',
                  transition: 'color 0.15s',
                }}
              >
                {saving ? 'saving…' : isEditMode ? 'save' : status === 'proposed' ? 'propose' : 'add'}
              </button>
            </div>

            {/* Scrollable content */}
            <div style={{ overflowY: 'auto', overflowX: 'hidden', flex: 1, paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div style={{ padding: '16px 20px 24px' }}>

              {/* Image upload */}
              <div className="mb-4">
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
                  style={{
                    width: '100%', aspectRatio: '4/3',
                    background: 'var(--border)', borderRadius: 4,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden', position: 'relative', cursor: 'pointer',
                  }}
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 6px' }}>
                        <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                        <circle cx="8.5" cy="10.5" r="1.5" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M21 15l-5-5-4 4-2-2-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      <span style={{ fontSize: 12 }}>
                        {isEditMode ? 'change photo' : 'tap to add a photo'}
                      </span>
                    </div>
                  )}
                  {imagePreview && (
                    <button
                      onClick={e => { e.stopPropagation(); setImageFile(null); setImagePreview(null) }}
                      style={{
                        position: 'absolute', top: 8, right: 8,
                        width: 24, height: 24, borderRadius: '50%',
                        background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 14,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >×</button>
                  )}
                </div>
              </div>

              {/* Title */}
              <div className="mb-3">
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Watch the northern lights"
                  maxLength={80}
                  autoFocus
                />
              </div>

              {/* Description */}
              <div className="mb-3">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>description</label>
                  {!voiceBlob && !voiceRecording && (
                    <button
                      onClick={startVoiceRecording}
                      title="record voice note"
                      style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)', padding: '2px 6px', borderRadius: 6, border: '1px solid var(--border)' }}
                    >
                      <svg width="11" height="14" viewBox="0 0 11 14" fill="none">
                        <rect x="3" y="0.5" width="5" height="8" rx="2.5" stroke="currentColor" strokeWidth="1.2"/>
                        <path d="M1 7.5c0 2.5 2 4.5 4.5 4.5S10 10 10 7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                        <path d="M5.5 12v1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                      </svg>
                      voice
                    </button>
                  )}
                </div>

                {voiceRecording ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--border)', borderRadius: 8 }}>
                    <motion.div
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                      style={{ width: 9, height: 9, borderRadius: '50%', background: '#c94a3a', flexShrink: 0 }}
                    />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-muted)', flex: 1 }}>
                      {formatSecs(voiceSecs)}
                    </span>
                    <button
                      onClick={stopVoiceRecording}
                      style={{ fontSize: 12, color: 'var(--text-primary)', padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--sheet-bg)' }}
                    >
                      stop
                    </button>
                  </div>
                ) : voicePreviewUrl ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--border)', borderRadius: 8 }}>
                    <audio src={voicePreviewUrl} controls style={{ height: 30, flex: 1, minWidth: 0 }} />
                    <button
                      onClick={clearVoiceNote}
                      style={{ fontSize: 18, color: 'var(--text-muted)', lineHeight: 1, padding: '0 2px', flexShrink: 0 }}
                    >×</button>
                  </div>
                ) : (
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Add some details…"
                    rows={2}
                    style={{ resize: 'none' }}
                  />
                )}
              </div>

              {/* Sealed note — only shown to the item creator */}
              {(!isEditMode || editItem?.created_by === user?.id) && (
                <div className="mb-3">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span>🔒</span> sealed note
                    </label>
                    <span style={{ fontSize: 11, color: sealedNote.length > 180 ? '#c94a3a' : 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {sealedNote.length}/200
                    </span>
                  </div>
                  <textarea
                    value={sealedNote}
                    onChange={e => setSealedNote(e.target.value.slice(0, 200))}
                    placeholder="only revealed when you do this together…"
                    rows={2}
                    style={{
                      resize: 'none',
                      background: 'rgba(180,130,50,0.08)',
                      border: '1px solid rgba(180,130,50,0.22)',
                      borderRadius: 10,
                    }}
                  />
                </div>
              )}

              {/* Location — disabled when online */}
              <div className="mb-3" style={{ opacity: mood === 'online' ? 0.4 : 1 }}>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                  location {mood === 'online' && <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>— not needed for online</span>}
                </label>
                <input
                  type="text"
                  value={mood === 'online' ? '' : location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="e.g. Iceland"
                  disabled={mood === 'online'}
                  style={{ pointerEvents: mood === 'online' ? 'none' : 'auto' }}
                />
              </div>

              {/* Date (optional) */}
              <div className="mb-3">
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>date (optional)</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
              </div>

              {/* Theme */}
              <div className="mb-3">
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>theme</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(Object.entries(ITEM_THEMES) as [ItemTheme, typeof ITEM_THEMES[ItemTheme]][]).map(([key, t]) => (
                    <button
                      key={key}
                      onClick={() => setItemTheme(itemTheme === key ? null : key)}
                      style={{
                        padding: '5px 10px', borderRadius: 20, fontSize: 12,
                        border: `1.5px solid ${itemTheme === key ? t.borderColor : 'var(--border)'}`,
                        background: itemTheme === key ? `${t.borderColor}22` : 'transparent',
                        color: itemTheme === key ? t.borderColor : 'var(--text-secondary)',
                        transition: 'all 0.15s',
                      }}
                    >
                      {t.emoji} {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mood + Region row */}
              <div className="flex gap-3 mb-3">
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>vibe</label>
                  <div className="flex gap-2">
                    {(['physical', 'online'] as ItemMood[]).map(m => (
                      <button
                        key={m}
                        onClick={() => setMood(m)}
                        style={{
                          flex: 1, padding: '7px 4px', borderRadius: 999, fontSize: 12,
                          border: `1px solid ${mood === m ? '#3a7a78' : 'var(--border)'}`,
                          background: mood === m ? '#3a7a78' : 'transparent',
                          color: mood === m ? '#fdf8eb' : 'var(--text-secondary)',
                          transition: 'all 0.15s',
                        }}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>region</label>
                  <select value={regionId} onChange={e => setRegionId(e.target.value)}>
                    {regions.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status (only for new items or propose toggle) */}
              <div className="mb-5">
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>add as</label>
                <div className="flex gap-2">
                  {([['committed', 'add directly'], ['proposed', 'propose']] as [ItemStatus, string][]).map(([s, label]) => (
                    <button
                      key={s}
                      onClick={() => setStatus(s)}
                      style={{
                        flex: 1, padding: '7px 4px', borderRadius: 999, fontSize: 12,
                        border: `1px solid ${status === s ? '#e0a04a' : 'var(--border)'}`,
                        background: status === s ? '#e0a04a' : 'transparent',
                        color: status === s ? '#2a2620' : 'var(--text-secondary)',
                        transition: 'all 0.15s',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

            </div>
            </div>{/* end scrollable content */}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
