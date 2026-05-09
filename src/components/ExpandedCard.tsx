import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BucketItem } from '../types'
import { useApp } from '../context/AppContext'

function formatSecs(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// Track which items have had their envelope animation played this session
const revealedNotes = new Set<string>()

function SealedEnvelope({ open }: { open: boolean }) {
  return (
    <svg width="44" height="32" viewBox="0 0 44 32" fill="none">
      <rect x="1" y="10" width="42" height="21" rx="2" fill="var(--cream-dark)" stroke="var(--spine-color)" strokeWidth="1.2"/>
      <path d="M1 31 L22 20 L43 31" stroke="var(--spine-color)" strokeWidth="0.8" opacity="0.4" fill="none"/>
      <motion.path
        animate={{ d: open ? 'M1 10 L22 1 L43 10 Z' : 'M1 10 L22 20 L43 10 Z' }}
        fill="var(--cream-dark)"
        stroke="var(--spine-color)"
        strokeWidth="1.2"
        strokeLinejoin="round"
        transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
      />
    </svg>
  )
}

interface ExpandedCardProps {
  item: BucketItem
  onClose: () => void
  onEdit: (item: BucketItem) => void
}

function HeartRating({ rating, color, label }: { rating: number | null; color: string; label: string }) {
  const hasRating = rating != null && rating > 0
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <svg width="22" height="20" viewBox="0 0 24 24" fill={hasRating ? color : 'none'} stroke={color} strokeWidth="1.5">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 400,
          color: hasRating ? color : 'var(--text-muted)',
          minWidth: 20, textAlign: 'center',
        }}>
          {hasRating ? rating : '–'}
        </span>
      </div>
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--text-muted)' }}>
        {label}
      </span>
    </div>
  )
}

export function ExpandedCard({ item, onClose, onEdit }: ExpandedCardProps) {
  const { user, partner, getUserById, getItemReactions, deleteItem, setRating, regions, items, completeItem, commitItem, uploadImage, updateItem, comments, addComment, deleteComment, uploadAudio } = useApp()

  const liveItem = items.find(i => i.id === item.id) ?? item

  const creator = getUserById(liveItem.created_by)
  const region  = regions.find(r => r.id === liveItem.region_id)
  const itemReactions = getItemReactions(liveItem.id)
  const myReaction      = itemReactions.find(r => r.user_id === user?.id)
  const partnerReaction = itemReactions.find(r => r.user_id !== user?.id)
  const myRating      = myReaction?.rating ?? 0
  const partnerRating = partnerReaction?.rating ?? null
  const partnerUser   = partner ?? (partnerReaction ? getUserById(partnerReaction.user_id) : null)

  const myColor      = user?.avatar_color ?? '#d4900a'
  const partnerColor = partnerUser?.avatar_color ?? '#8a9abf'

  const isRevealed = liveItem.status === 'done' && !!liveItem.real_image_url
  const isAuthor = liveItem.created_by === user?.id
  const hasNote = !!liveItem.sealed_note
  const [envelopeOpen, setEnvelopeOpen] = useState(() => revealedNotes.has(liveItem.id))
  const [noteModalOpen, setNoteModalOpen] = useState(false)

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmDecline, setConfirmDecline] = useState(false)
  const [developing, setDeveloping] = useState(false)
  const [developError, setDevelopError] = useState<string | null>(null)
  const [peeking, setPeeking] = useState(false)
  const [justDeveloped, setJustDeveloped] = useState(false)
  const [dateLabel, setDateLabel] = useState('')
  const prevRealSrc = useRef(liveItem.real_image_url)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Comments state
  const [commentText, setCommentText] = useState('')
  const [commentSending, setCommentSending] = useState(false)
  const [commentRecording, setCommentRecording] = useState(false)
  const [commentSecs, setCommentSecs] = useState(0)
  const commentMrRef = useRef<MediaRecorder | null>(null)
  const commentChunksRef = useRef<Blob[]>([])
  const commentTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const itemComments = comments[liveItem.id] ?? []

  const stopCommentRecording = useCallback(() => {
    commentMrRef.current?.stop()
    setCommentRecording(false)
    if (commentTimerRef.current) clearInterval(commentTimerRef.current)
  }, [])

  const startCommentRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      commentChunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) commentChunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(commentChunksRef.current, { type: 'audio/webm' })
        setCommentSending(true)
        try {
          const url = await uploadAudio(blob)
          await addComment(liveItem.id, 'voice', url)
        } catch (err) {
          console.warn('Voice comment upload failed:', err)
        }
        setCommentSending(false)
      }
      mr.start()
      commentMrRef.current = mr
      setCommentRecording(true)
      setCommentSecs(0)
      commentTimerRef.current = setInterval(() => setCommentSecs(s => s + 1), 1000)
    } catch {
      // mic denied
    }
  }

  const handleSendComment = async () => {
    if (!commentText.trim() || commentSending) return
    setCommentSending(true)
    try {
      await addComment(liveItem.id, 'text', commentText.trim())
      setCommentText('')
    } catch (err) {
      console.warn('Comment send failed:', err)
    }
    setCommentSending(false)
  }

  // Envelope reveal — one-shot per session
  useEffect(() => {
    if (isRevealed && hasNote && !revealedNotes.has(liveItem.id)) {
      const t = setTimeout(() => {
        setEnvelopeOpen(true)
        revealedNotes.add(liveItem.id)
      }, 600)
      return () => clearTimeout(t)
    }
  }, [isRevealed, hasNote]) // eslint-disable-line react-hooks/exhaustive-deps

  // Detect when real photo first appears → trigger develop animation
  useEffect(() => {
    if (liveItem.real_image_url && !prevRealSrc.current) {
      setJustDeveloped(true)
      const d = new Date()
      const mon = d.toLocaleString('en', { month: 'short' }).toLowerCase()
      const yr = String(d.getFullYear()).slice(2)
      setDateLabel(`${mon} · '${yr}`)
    }
    prevRealSrc.current = liveItem.real_image_url
  }, [liveItem.real_image_url])

  // Peek: hold to see the original planned photo, release to go back to memory
  const canPeek = !!(liveItem.real_image_url && liveItem.image_url)
  const photoSrc = (canPeek && peeking) ? liveItem.image_url : (liveItem.real_image_url ?? liveItem.image_url)

  const handleDevelop = async (file: File) => {
    setDeveloping(true)
    setDevelopError(null)
    try {
      const url = await uploadImage(file)
      if (liveItem.status !== 'done') {
        await completeItem(liveItem.id, url)
      } else {
        await updateItem(liveItem.id, { real_image_url: url })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      setDevelopError(msg)
      console.error('Develop failed:', err)
    } finally {
      setDeveloping(false)
    }
  }

  const handleAccept = async () => {
    await commitItem(liveItem.id)
  }

  const handleDecline = async () => {
    await deleteItem(liveItem.id)
    onClose()
  }

  const handleDelete = async () => {
    await deleteItem(liveItem.id)
    onClose()
  }

  const handleDotClick = (dot: number) => {
    setRating(liveItem.id, dot === myRating ? 0 : dot)
  }

  const formattedDate = liveItem.date
    ? new Date(liveItem.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  const isMyProposal    = liveItem.status === 'proposed' && liveItem.created_by === user?.id
  const isTheirProposal = liveItem.status === 'proposed' && liveItem.created_by !== user?.id
  const isDevelopable   = !(liveItem.status === 'done' && liveItem.real_image_url)

  return (
    <>
    {/* Author peek modal */}
    <AnimatePresence>
      {noteModalOpen && (
        <motion.div
          key="note-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setNoteModalOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(20,16,8,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            onClick={e => e.stopPropagation()}
            style={{ background: 'var(--card-bg)', borderRadius: 16, padding: '24px 20px', maxWidth: 300, width: '100%' }}
          >
            <div style={{ textAlign: 'center', fontSize: 28, marginBottom: 12 }}>🔒</div>
            <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.65, marginBottom: 10, textAlign: 'center' }}>
              "{liveItem.sealed_note}"
            </p>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, textAlign: 'center', lineHeight: 1.5 }}>
              This note is sealed until you complete this memory together.
            </p>
            <button
              onClick={() => setNoteModalOpen(false)}
              style={{ width: '100%', padding: '10px', borderRadius: 8, background: 'var(--text-primary)', color: 'var(--bg)', fontSize: 13, fontFamily: 'var(--font-sans)' }}
            >
              close
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    <AnimatePresence>
      <motion.div
        key="scrim"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(20,16,8,0.75)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px',
        }}
      >
        <motion.div
          key="card"
          initial={{ scale: 0.88, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.88, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: 360,
            background: 'var(--card-bg)',
            borderRadius: 4,
            boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
            overflow: 'hidden',
            maxHeight: 'calc(100vh - 80px)',
            overflowY: 'auto',
            flexShrink: 0,
          }}
        >
          {/* ── Photo area ────────────────────────────────────────────── */}
          <div
            style={{
              position: 'relative', background: '#1a1814', flexShrink: 0, overflow: 'hidden',
              userSelect: 'none', WebkitUserSelect: 'none',
              // @ts-ignore
              WebkitTouchCallout: 'none',
            }}
            onContextMenu={e => e.preventDefault()}
            onPointerDown={() => canPeek && setPeeking(true)}
            onPointerUp={() => setPeeking(false)}
            onPointerLeave={() => setPeeking(false)}
            onPointerCancel={() => setPeeking(false)}
          >
            {photoSrc ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={photoSrc}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.55, ease: 'easeIn' }}
                  style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 160 }}
                >
                  <img
                    src={photoSrc}
                    alt={liveItem.title}
                    draggable={false}
                    style={{ maxWidth: '100%', maxHeight: '65vh', width: 'auto', height: 'auto', display: 'block', pointerEvents: 'none' }}
                  />
                </motion.div>
              </AnimatePresence>
            ) : (
              <div style={{
                height: 200,
                background: 'linear-gradient(135deg, #c8a060, #8a5a30)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                {developing ? (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>
                    developing…
                  </span>
                ) : (
                  <>
                    <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 22, color: '#fff' }}>&amp;you</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase' }}>UNDEVELOPED</span>
                  </>
                )}
              </div>
            )}

            {/* Grain flash + darkroom glow on develop */}
            {justDeveloped && (
              <motion.div
                initial={{ opacity: 0.75 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 1.4, ease: 'easeOut' }}
                onAnimationComplete={() => setJustDeveloped(false)}
                style={{
                  position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3,
                  background: 'rgba(255,245,220,0.25)',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.75'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E")`,
                }}
              />
            )}

            {/* Date stamp — fades in after develop */}
            {dateLabel && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.7 }}
                style={{
                  position: 'absolute', bottom: 10, right: 12,
                  fontFamily: 'var(--font-mono)', fontSize: 9,
                  color: 'rgba(255,255,255,0.7)', letterSpacing: '0.1em',
                  pointerEvents: 'none',
                }}
              >
                {dateLabel}
              </motion.div>
            )}

            {/* Hold-to-peek hint */}
            {canPeek && !peeking && (
              <div style={{
                position: 'absolute', bottom: 10, right: 12,
                fontFamily: 'var(--font-mono)', fontSize: 9,
                color: 'rgba(255,255,255,0.5)', letterSpacing: '0.07em',
                pointerEvents: 'none',
              }}>
                hold to see original
              </div>
            )}
            {peeking && (
              <div style={{
                position: 'absolute', bottom: 10, right: 12,
                fontFamily: 'var(--font-mono)', fontSize: 9,
                color: 'rgba(255,255,255,0.7)', letterSpacing: '0.07em',
                pointerEvents: 'none',
              }}>
                the plan ↑
              </div>
            )}

            {/* Done stamp */}
            {liveItem.status === 'done' && (
              <div style={{
                position: 'absolute', top: 12, left: 12,
                width: 52, height: 52, borderRadius: '50%',
                border: '2.5px solid rgba(74,138,74,0.9)',
                boxShadow: 'inset 0 0 0 1.5px rgba(74,138,74,0.3)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                background: 'rgba(255,255,255,0.9)',
                transform: 'rotate(-12deg)',
                pointerEvents: 'none',
              }}>
                <span style={{ fontSize: 6, letterSpacing: '0.18em', color: '#4a8a4a', fontWeight: 700, textTransform: 'uppercase', lineHeight: 1 }}>DONE</span>
                <span style={{ fontSize: 16, color: '#4a8a4a', lineHeight: 1.2 }}>✓</span>
              </div>
            )}

            <button
              onClick={onClose}
              style={{
                position: 'absolute', top: 10, right: 10,
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(0,0,0,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 10, border: 'none', cursor: 'pointer',
              }}
            >
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M1 1l9 9M10 1L1 10" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* ── Creator strip ────────────────────────────────────────── */}
          <div style={{
            height: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 16px', gap: 8,
            borderBottom: '1px solid var(--cream-dark)',
          }}>
            {creator ? (
              <>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: creator.avatar_color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, color: '#fff',
                  flexShrink: 0,
                }}>
                  {creator.name.charAt(0).toUpperCase()}
                </div>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-muted)', flex: 1 }}>
                  {creator.name} proposed this
                </span>
              </>
            ) : (
              <button
                onClick={() => user && updateItem(liveItem.id, { created_by: user.id })}
                style={{
                  fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-muted)',
                  background: 'none', border: '1px dashed var(--border)', borderRadius: 6,
                  padding: '3px 10px', cursor: 'pointer',
                }}
              >
                claim as mine
              </button>
            )}
          </div>

          {/* ── Accept / Decline (only for proposals, non-creator) ────── */}
          {isMyProposal && (
            <div style={{
              padding: '10px 16px',
              background: 'rgba(224,160,74,0.08)',
              borderBottom: '1px solid var(--cream-dark)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" opacity="0.5">
                <circle cx="6" cy="6" r="5" stroke="var(--amber)" strokeWidth="1.2"/>
                <path d="M6 3v3.5l2 1" stroke="var(--amber)" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                waiting for {partnerUser?.name ?? 'them'} to accept…
              </span>
            </div>
          )}

          {isTheirProposal && !confirmDecline && (
            <div style={{
              padding: '12px 16px', display: 'flex', gap: 8,
              borderBottom: '1px solid var(--cream-dark)',
            }}>
              <button
                onClick={handleAccept}
                style={{
                  flex: 1, padding: '9px', borderRadius: 8,
                  background: 'var(--amber)', color: '#2a2218',
                  border: 'none', fontFamily: 'var(--font-sans)',
                  fontSize: 13, fontWeight: 500, cursor: 'pointer',
                }}
              >
                accept ✓
              </button>
              <button
                onClick={() => setConfirmDecline(true)}
                style={{
                  flex: 1, padding: '9px', borderRadius: 8,
                  background: 'var(--cream-dark)', color: '#c94a3a',
                  border: '1px solid rgba(201,74,58,0.25)',
                  fontFamily: 'var(--font-sans)', fontSize: 13, cursor: 'pointer',
                }}
              >
                decline ✗
              </button>
            </div>
          )}

          {confirmDecline && (
            <div style={{
              padding: '12px 16px',
              background: 'rgba(201,74,58,0.06)',
              borderBottom: '1px solid var(--cream-dark)',
            }}>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-mid)', margin: '0 0 10px' }}>
                Decline this idea? It'll be removed.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleDecline} style={{ flex: 1, padding: '8px', borderRadius: 8, background: '#c94a3a', color: '#fff', border: 'none', fontFamily: 'var(--font-sans)', fontSize: 13, cursor: 'pointer' }}>
                  yes, decline
                </button>
                <button onClick={() => setConfirmDecline(false)} style={{ flex: 1, padding: '8px', borderRadius: 8, background: 'var(--cream-dark)', color: 'var(--text-mid)', border: 'none', fontFamily: 'var(--font-sans)', fontSize: 13, cursor: 'pointer' }}>
                  keep it
                </button>
              </div>
            </div>
          )}

          {/* ── Body ─────────────────────────────────────────────────── */}
          <div>
            {/* Title */}
            <div style={{ padding: '14px 16px 4px' }}>
              <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 22, fontWeight: 600, color: 'var(--text-dark)', lineHeight: 1.2, margin: 0 }}>
                {liveItem.title}
              </h2>
            </div>

            {/* Location */}
            {liveItem.location && (
              <div style={{ padding: '0 16px 12px', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-muted)' }}>
                <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
                  <path d="M6 1C3.79 1 2 2.79 2 5c0 3.5 4 8 4 8s4-4.5 4-8c0-2.21-1.79-4-4-4z" stroke="currentColor" strokeWidth="1.2"/>
                  <circle cx="6" cy="5" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
                </svg>
                {liveItem.location}
              </div>
            )}

            {/* Description */}
            {liveItem.description && (
              <div style={{ padding: '0 16px 12px', fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.6 }}>
                {liveItem.description}
              </div>
            )}

            {/* Voice note */}
            {liveItem.voice_note_url && (
              <div style={{ padding: '0 16px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="12" height="15" viewBox="0 0 11 14" fill="none" style={{ flexShrink: 0, color: 'var(--text-muted)' }}>
                  <rect x="3" y="0.5" width="5" height="8" rx="2.5" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M1 7.5c0 2.5 2 4.5 4.5 4.5S10 10 10 7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  <path d="M5.5 12v1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                <audio src={liveItem.voice_note_url} controls style={{ height: 28, flex: 1, minWidth: 0 }} />
              </div>
            )}

            {/* Sealed note — author peek (before reveal) */}
            {hasNote && isAuthor && !isRevealed && (
              <div style={{ padding: '0 16px 10px' }}>
                <button
                  onClick={() => setNoteModalOpen(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-muted)',
                    background: 'none', padding: '6px 10px', borderRadius: 8,
                    border: '1px solid var(--border)',
                  }}
                >
                  <span>🔒</span>
                  <span>you left a sealed note</span>
                </button>
              </div>
            )}

            <div style={{ height: 1, background: 'var(--cream-dark)', margin: '0 16px' }} />

            {/* Sealed note — revealed (status done + photo) */}
            {isRevealed && hasNote && (
              <>
                <div style={{
                  padding: '16px 16px',
                  background: 'rgba(212,144,10,0.04)',
                  borderBottom: '1px solid var(--cream-dark)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                    <SealedEnvelope open={envelopeOpen} />
                  </div>
                  <AnimatePresence>
                    {envelopeOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <div style={{
                            width: 22, height: 22, borderRadius: '50%',
                            background: creator?.avatar_color ?? 'var(--border)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, fontWeight: 600, color: '#fff', flexShrink: 0,
                          }}>
                            {creator?.name.charAt(0).toUpperCase() ?? '?'}
                          </div>
                          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-muted)' }}>
                            {creator?.name ?? 'them'} left you a note
                          </span>
                        </div>
                        <p style={{
                          fontFamily: 'var(--font-serif)', fontStyle: 'italic',
                          fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.65, margin: '0 0 6px',
                        }}>
                          "{liveItem.sealed_note}"
                        </p>
                        {liveItem.sealed_note_at && (
                          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                            written {new Date(liveItem.sealed_note_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                          </p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            )}

            {/* Region + mood */}
            <div style={{ padding: '12px 16px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {region && (
                <span style={{ background: 'var(--cream-dark)', borderRadius: 12, padding: '4px 10px', fontSize: 12, fontFamily: 'var(--font-sans)', color: 'var(--text-mid)' }}>
                  {region.name}
                </span>
              )}
              <span style={{ background: 'var(--cream-dark)', borderRadius: 12, padding: '4px 10px', fontSize: 12, fontFamily: 'var(--font-sans)', color: 'var(--text-mid)' }}>
                {liveItem.mood}
              </span>
            </div>

            {/* Date */}
            {formattedDate && (
              <div style={{ padding: '0 16px 12px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
                {formattedDate}
              </div>
            )}

            <div style={{ height: 1, background: 'var(--cream-dark)', margin: '0 16px' }} />

            {/* ── Ratings ──────────────────────────────────────────── */}
            <div style={{ padding: '16px 16px 8px' }}>
              <div style={{ display: 'flex', gap: 32, marginBottom: 16 }}>
                <HeartRating rating={myRating > 0 ? myRating : null} color={myColor} label={user?.name ?? 'you'} />
                <HeartRating rating={partnerRating} color={partnerColor} label={partnerUser?.name ?? 'them'} />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>tap to rate</div>
                <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                  {Array.from({ length: 10 }, (_, i) => {
                    const dot = i + 1
                    const filled = dot <= myRating
                    return (
                      <button
                        key={dot}
                        onClick={() => handleDotClick(dot)}
                        style={{
                          width: 11, height: 11, borderRadius: '50%', padding: 0,
                          background: filled ? myColor : 'var(--cream-dark)',
                          border: filled ? 'none' : '1px solid var(--spine-color)',
                          cursor: 'pointer', flexShrink: 0,
                          transition: 'background 0.15s',
                        }}
                      />
                    )
                  })}
                  {myRating > 0 && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>
                      {myRating} / 10
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ height: 1, background: 'var(--cream-dark)', margin: '0 16px' }} />

            {/* ── Notes / Comments ─────────────────────────────────── */}
            <div style={{ padding: '14px 16px' }}>
              {itemComments.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  {itemComments.map(comment => {
                    const commenter = getUserById(comment.user_id)
                    const isMe = comment.user_id === user?.id
                    return (
                      <div key={comment.id} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                        <div style={{
                          width: 22, height: 22, borderRadius: '50%',
                          background: commenter?.avatar_color ?? 'var(--border)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, fontWeight: 600, color: '#fff', flexShrink: 0,
                          marginTop: 2,
                        }}>
                          {commenter?.name.charAt(0).toUpperCase() ?? '?'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {comment.type === 'text' ? (
                            <div style={{
                              background: 'var(--cream-dark)', borderRadius: '0 10px 10px 10px',
                              padding: '6px 10px', fontSize: 13,
                              color: 'var(--text-mid)', fontFamily: 'var(--font-sans)', lineHeight: 1.4,
                            }}>
                              {comment.text}
                            </div>
                          ) : (
                            <audio src={comment.audio_url} controls style={{ height: 28, width: '100%' }} />
                          )}
                        </div>
                        {isMe && (
                          <button
                            onClick={() => deleteComment(comment.id)}
                            style={{ fontSize: 16, color: 'var(--text-muted)', lineHeight: 1, padding: '2px 2px', flexShrink: 0, marginTop: 1 }}
                          >×</button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Input row */}
              {commentRecording ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--cream-dark)', borderRadius: 8 }}>
                  <motion.div
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                    style={{ width: 8, height: 8, borderRadius: '50%', background: '#c94a3a', flexShrink: 0 }}
                  />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)', flex: 1 }}>
                    {formatSecs(commentSecs)}
                  </span>
                  <button
                    onClick={stopCommentRecording}
                    style={{ fontSize: 12, color: 'var(--text-primary)', padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--card-bg)' }}
                  >
                    send
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    type="text"
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendComment()}
                    placeholder="add a note…"
                    style={{ flex: 1, fontSize: 13, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}
                  />
                  {commentText.trim() ? (
                    <button
                      onClick={handleSendComment}
                      disabled={commentSending}
                      style={{ padding: '7px 12px', borderRadius: 8, background: 'var(--text-primary)', color: 'var(--bg)', fontSize: 12, fontFamily: 'var(--font-sans)', opacity: commentSending ? 0.5 : 1 }}
                    >
                      {commentSending ? '…' : 'send'}
                    </button>
                  ) : (
                    <button
                      onClick={startCommentRecording}
                      title="voice note"
                      style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexShrink: 0 }}
                    >
                      <svg width="11" height="14" viewBox="0 0 11 14" fill="none">
                        <rect x="3" y="0.5" width="5" height="8" rx="2.5" stroke="currentColor" strokeWidth="1.2"/>
                        <path d="M1 7.5c0 2.5 2 4.5 4.5 4.5S10 10 10 7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                        <path d="M5.5 12v1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                      </svg>
                    </button>
                  )}
                </div>
              )}
              {commentSending && !commentRecording && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>uploading…</div>
              )}
            </div>

            <div style={{ height: 1, background: 'var(--cream-dark)', margin: '0 16px' }} />

            {/* ── Develop memory ───────────────────────────────────── */}
            {isDevelopable && (
              <div style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <svg width="16" height="14" viewBox="0 0 16 14" fill="none">
                    <rect x="0.75" y="2.75" width="14.5" height="10.5" rx="1.5" stroke="var(--amber)" strokeWidth="1.2"/>
                    <circle cx="8" cy="8" r="2.5" stroke="var(--amber)" strokeWidth="1.2"/>
                    <path d="M5 2.5L6 1h4l1 1.5" stroke="var(--amber)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 15, color: 'var(--amber)' }}>
                    {liveItem.status === 'done' ? 'add your memory photo' : 'develop this memory'}
                  </span>
                </div>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-muted)', margin: '0 0 12px', lineHeight: 1.5 }}>
                  {liveItem.status === 'done'
                    ? "Upload a photo from when you did this — it'll develop onto the polaroid."
                    : "Did you do this together? Upload a photo to develop the polaroid and mark it done."}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) handleDevelop(file)
                    e.target.value = ''
                  }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={developing}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '9px 16px', borderRadius: 999,
                    background: developing ? 'var(--cream-dark)' : 'var(--amber)',
                    border: 'none', cursor: developing ? 'default' : 'pointer',
                    fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
                    color: developing ? 'var(--text-muted)' : '#2a2218',
                    transition: 'all 0.15s',
                  }}
                >
                  {developing ? (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em' }}>developing…</span>
                  ) : (
                    <>
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                        <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                      </svg>
                      choose photo
                    </>
                  )}
                </button>
                {developError && (
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#c94a3a', margin: '8px 0 0', lineHeight: 1.4 }}>
                    error: {developError}
                  </p>
                )}
              </div>
            )}

            {isDevelopable && <div style={{ height: 1, background: 'var(--cream-dark)', margin: '0 16px' }} />}

            {/* Edit */}
            <div style={{ padding: '12px 16px 4px' }}>
              <button
                onClick={() => { onClose(); onEdit(liveItem) }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  padding: '8px 14px', borderRadius: 8,
                  border: '1.5px solid var(--amber)',
                  background: 'transparent', cursor: 'pointer',
                  fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
                  color: 'var(--amber)',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.5 1.5l3 3L4 14H1v-3L10.5 1.5z"/>
                </svg>
                edit
              </button>
            </div>

            {/* Delete */}
            <div style={{ padding: '0 16px 20px' }}>
              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-muted)' }}
                >
                  remove from wall
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-mid)' }}>Remove this from the wall?</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={handleDelete} style={{ flex: 1, padding: '8px', borderRadius: 8, background: '#c94a3a', color: '#fff', border: 'none', fontFamily: 'var(--font-sans)', fontSize: 13, cursor: 'pointer' }}>remove</button>
                    <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, padding: '8px', borderRadius: 8, background: 'var(--cream-dark)', color: 'var(--text-mid)', border: 'none', fontFamily: 'var(--font-sans)', fontSize: 13, cursor: 'pointer' }}>cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
    </>
  )
}
