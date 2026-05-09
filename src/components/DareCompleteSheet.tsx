import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../context/AppContext'
import { Dare } from '../types'

interface DareCompleteSheetProps {
  dare: Dare | null
  asTradeCreator: boolean
  onClose: () => void
}

export function DareCompleteSheet({ dare, asTradeCreator, onClose }: DareCompleteSheetProps) {
  const { completeDare, uploadImage } = useApp()
  const [note, setNote] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const open = !!dare

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }, [])

  const handleClose = useCallback(() => {
    setNote('')
    setImageFile(null)
    setImagePreview(null)
    setSaving(false)
    onClose()
  }, [onClose])

  const handleConfirm = async () => {
    if (!dare || saving) return
    setSaving(true)
    try {
      let photoUrl: string | null = null
      if (imageFile) {
        photoUrl = await uploadImage(imageFile)
      }
      await completeDare(dare.id, asTradeCreator, photoUrl, note.trim() || null)
      handleClose()
    } catch (err) {
      console.error('Failed to complete dare', err)
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(42,38,32,0.4)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 70 }}
            onClick={handleClose}
          />
          <motion.div
            key="sheet"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 32, mass: 0.7 }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 71,
              background: 'var(--sheet-bg)', borderRadius: '24px 24px 0 0',
              maxHeight: '70vh', display: 'flex', flexDirection: 'column',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 8 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <button onClick={handleClose} style={{ fontSize: 14, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', padding: '6px 0', minWidth: 56 }}>cancel</button>
              <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>mark as done</span>
              <button
                onClick={handleConfirm}
                disabled={saving}
                style={{ fontSize: 14, fontWeight: 600, color: saving ? 'var(--text-muted)' : 'var(--color-teal)', fontFamily: 'var(--font-sans)', padding: '6px 0', minWidth: 56, textAlign: 'right', transition: 'color 0.15s' }}
              >
                {saving ? 'saving…' : 'done ✓'}
              </button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, paddingBottom: 'env(safe-area-inset-bottom)' }}>
              <div style={{ padding: '20px 20px 32px' }}>

                {/* Photo */}
                <div style={{ marginBottom: 16 }}>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />
                  {imagePreview ? (
                    <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', aspectRatio: '4/3' }}>
                      <img src={imagePreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        onClick={() => { setImageFile(null); setImagePreview(null) }}
                        style={{ position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >×</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileRef.current?.click()}
                      style={{
                        width: '100%', padding: '18px', borderRadius: 10,
                        border: '1.5px dashed var(--border)', background: 'transparent',
                        color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', fontSize: 14,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="5" width="18" height="14" rx="2"/>
                        <circle cx="8.5" cy="10.5" r="1.5"/>
                        <path d="M21 15l-5-5-4 4-2-2-4 4" strokeLinecap="round"/>
                      </svg>
                      + add a photo
                    </button>
                  )}
                </div>

                {/* Note */}
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>how did it go? (optional)</label>
                  <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="how did it go?"
                    maxLength={150}
                    rows={3}
                    style={{ width: '100%', fontSize: 14, padding: '10px 12px', borderRadius: 10, boxSizing: 'border-box', resize: 'none' }}
                  />
                  <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{note.length}/150</div>
                </div>

              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
