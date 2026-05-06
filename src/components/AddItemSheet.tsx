import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../context/AppContext'
import { ItemMood, ItemStatus, ItemTheme, ITEM_THEMES } from '../types'
import { requestNotificationPermission } from '../lib/notifications'



interface AddItemSheetProps {
  open: boolean
  onClose: () => void
}

export function AddItemSheet({ open, onClose }: AddItemSheetProps) {
  const { regions, addItem, updateItem, uploadImage } = useApp()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [mood, setMood] = useState<ItemMood>('physical')
  const [regionId, setRegionId] = useState('')
  const [status, setStatus] = useState<ItemStatus>('committed')
  const [itemTheme, setItemTheme] = useState<ItemTheme | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open && regions.length > 0 && !regionId) {
      setRegionId(regions[0].id)
    }
  }, [open, regions, regionId])

  const reset = () => {
    setTitle('')
    setDescription('')
    setLocation('')
    setMood('physical')
    setStatus('committed')
    setItemTheme(null)
    setImageFile(null)
    setImagePreview(null)
    setRegionId('')
    setSaving(false)
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

    // Use a local blob URL immediately so the image shows right away
    const blobUrl = imageFile ? URL.createObjectURL(imageFile) : null

    try {
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
      })
      handleClose()

      // Upload the real file to Supabase in the background, then swap the URL
      if (imageFile && itemId) {
        uploadImage(imageFile)
          .then(realUrl => updateItem(itemId, { image_url: realUrl }))
          .catch(err => console.warn('Background image upload failed:', err))
      }
    } catch (err) {
      console.error('Failed to add item', err)
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
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              zIndex: 60,
            }}
            onClick={handleClose}
          />
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 38 }}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 61,
              background: 'var(--sheet-bg)',
              borderRadius: '16px 16px 0 0',
              padding: '0 0 env(safe-area-inset-bottom)',
              maxHeight: '92vh',
              overflowY: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 4 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
            </div>

            <div style={{ padding: '8px 20px 24px' }}>
              <div className="flex items-center justify-between mb-5">
                <h2 style={{ fontSize: 18, fontWeight: 500, color: 'var(--text-primary)' }}>add to your wall</h2>
                <button onClick={handleClose} style={{ color: 'var(--text-muted)', fontSize: 22, lineHeight: 1 }}>×</button>
              </div>

              {/* Image upload */}
              <div className="mb-4">
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />
                {/* div not button — avoids invalid nested <button> */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
                  style={{
                    width: '100%',
                    aspectRatio: '4/3',
                    background: 'var(--border)',
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    position: 'relative',
                    cursor: 'pointer',
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
                      <span style={{ fontSize: 12 }}>tap to add a photo</span>
                    </div>
                  )}
                  {imagePreview && (
                    <button
                      onClick={e => { e.stopPropagation(); setImageFile(null); setImagePreview(null) }}
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: 'rgba(0,0,0,0.5)',
                        color: '#fff',
                        fontSize: 14,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
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
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Add some details…"
                  rows={2}
                  style={{ resize: 'none' }}
                />
              </div>

              {/* Location */}
              <div className="mb-3">
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>location</label>
                <input
                  type="text"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="e.g. Iceland"
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
                        padding: '5px 10px',
                        borderRadius: 20,
                        fontSize: 12,
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
                          flex: 1,
                          padding: '7px 4px',
                          borderRadius: 999,
                          fontSize: 12,
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

              {/* Propose vs add */}
              <div className="mb-5">
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>add as</label>
                <div className="flex gap-2">
                  {([['committed', 'add directly'], ['proposed', 'propose']] as [ItemStatus, string][]).map(([s, label]) => (
                    <button
                      key={s}
                      onClick={() => setStatus(s)}
                      style={{
                        flex: 1,
                        padding: '7px 4px',
                        borderRadius: 999,
                        fontSize: 12,
                        border: `1px solid ${status === s ? '#3a7a78' : 'var(--border)'}`,
                        background: status === s ? '#3a7a78' : 'transparent',
                        color: status === s ? '#fdf8eb' : 'var(--text-secondary)',
                        transition: 'all 0.15s',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Save */}
              <button
                onClick={handleSave}
                disabled={!title.trim() || !regionId || saving}
                style={{
                  width: '100%',
                  padding: '13px',
                  background: '#3a7a78',
                  color: '#fdf8eb',
                  borderRadius: 999,
                  fontSize: 15,
                  fontWeight: 500,
                  transition: 'opacity 0.15s',
                  opacity: (!title.trim() || !regionId || saving) ? 0.45 : 1,
                }}
              >
                {saving ? 'saving…' : status === 'proposed' ? 'propose dream' : 'add to wall'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
