import { useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../context/AppContext'
import { ITEM_THEMES, ItemTheme } from '../types'

interface StatsSheetProps {
  open: boolean
  onClose: () => void
  onOpenProfile: () => void
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '15px 0', gap: 16 }}>
        <span style={{
          fontSize: 10, color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.12em',
          fontFamily: 'var(--font-sans)', flexShrink: 0,
        }}>
          {label}
        </span>
        <span style={{
          fontSize: 15, color: 'var(--text-primary)',
          fontFamily: 'var(--font-sans)', fontWeight: 500,
          textAlign: 'right', lineHeight: 1.3,
        }}>
          {value}
        </span>
      </div>
      <div style={{ height: 1, background: 'var(--border)' }} />
    </>
  )
}

export function StatsSheet({ open, onClose, onOpenProfile }: StatsSheetProps) {
  const { items, regions, user, partner } = useApp()

  const touchStartY = useRef(0)
  const onHandleTouchStart = useCallback((e: React.TouchEvent) => { touchStartY.current = e.touches[0].clientY }, [])
  const onHandleTouchEnd = useCallback((e: React.TouchEvent) => { if (e.changedTouches[0].clientY - touchStartY.current > 80) onClose() }, [onClose])

  const doneWithPhoto = items.filter(i => i.status === 'done' && i.real_image_url)
  const totalItems = items.length

  // Computed stats
  const myCount = items.filter(i => i.created_by === user?.id).length
  const partnerCount = items.filter(i => partner && i.created_by === partner.id).length

  const themeCounts: Record<string, number> = {}
  items.forEach(i => { if (i.theme) themeCounts[i.theme] = (themeCounts[i.theme] ?? 0) + 1 })
  const topThemeEntry = Object.entries(themeCounts).sort((a, b) => b[1] - a[1])[0]

  const physicalCount = items.filter(i => i.mood === 'physical').length
  const onlineCount = items.filter(i => i.mood === 'online').length

  const regionCounts: Record<string, number> = {}
  items.forEach(i => { regionCounts[i.region_id] = (regionCounts[i.region_id] ?? 0) + 1 })
  const topRegionId = Object.entries(regionCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
  const topRegion = regions.find(r => r.id === topRegionId)

  const sortedDone = [...doneWithPhoto].sort((a, b) => a.created_at.localeCompare(b.created_at))
  const firstDone = sortedDone[0]
  const lastDone = sortedDone.length > 1 ? sortedDone[sortedDone.length - 1] : null

  const totalNotes = items.filter(i => i.sealed_note).length
  const revealedNoteCount = items.filter(i => i.sealed_note && i.status === 'done' && i.real_image_url).length
  const hiddenNoteCount = totalNotes - revealedNoteCount

  // Who proposes more label
  let proposesStat: string | null = null
  if (partner && myCount !== partnerCount) {
    const more = myCount > partnerCount ? user?.name ?? 'you' : partner.name
    proposesStat = `${more} proposes more 👀`
  } else if (partner) {
    proposesStat = 'equally adventurous ✨'
  }

  // Theme label
  let themeStat: string | null = null
  if (topThemeEntry) {
    const cfg = ITEM_THEMES[topThemeEntry[0] as ItemTheme]
    themeStat = `mostly ${cfg.label.toLowerCase()} ${cfg.emoji}`
  }

  // Notes label
  let notesStat: string | null = null
  if (totalNotes > 0) {
    if (hiddenNoteCount > 0 && revealedNoteCount > 0) {
      notesStat = `${hiddenNoteCount} hidden · ${revealedNoteCount} revealed 💌`
    } else if (hiddenNoteCount > 0) {
      notesStat = `${hiddenNoteCount} sealed ${hiddenNoteCount === 1 ? 'note' : 'notes'} hidden 🔒`
    } else {
      notesStat = `${revealedNoteCount} sealed ${revealedNoteCount === 1 ? 'note' : 'notes'} revealed 💌`
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
            style={{ position: 'fixed', inset: 0, background: 'rgba(42,38,32,0.4)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 60 }}
            onClick={onClose}
          />
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 280, damping: 30, mass: 0.8 }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0,
              zIndex: 61, background: 'var(--sheet-bg)',
              borderRadius: '24px 24px 0 0',
              maxHeight: '85vh', display: 'flex', flexDirection: 'column',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div
              onTouchStart={onHandleTouchStart}
              onTouchEnd={onHandleTouchEnd}
              style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 8, flexShrink: 0, cursor: 'grab' }}
            >
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
            </div>

            {/* Scrollable content */}
            <div style={{ overflowY: 'auto', flex: 1, paddingBottom: 'env(safe-area-inset-bottom)' }}>
              <div style={{ padding: '0 20px 32px' }}>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <h2 style={{
                    fontFamily: 'var(--font-serif)', fontStyle: 'italic',
                    fontSize: 26, fontWeight: 400, color: 'var(--color-teal)',
                    margin: 0, letterSpacing: '-0.01em',
                  }}>
                    &amp; us
                  </h2>
                  <button onClick={onClose} style={{ color: 'var(--text-muted)', fontSize: 22, lineHeight: 1 }}>×</button>
                </div>

                {/* Sub-heading */}
                <p style={{
                  fontFamily: 'var(--font-serif)', fontStyle: 'italic',
                  fontSize: 15, color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.4,
                }}>
                  our story, so far.
                </p>

                {/* Empty / low-data state */}
                {totalItems < 3 ? (
                  <p style={{
                    fontFamily: 'var(--font-sans)', fontSize: 14,
                    color: 'var(--text-muted)', lineHeight: 1.6,
                  }}>
                    not enough memories yet — go make some 🎞️
                  </p>
                ) : (
                  <>
                    <div style={{ height: 1, background: 'var(--border)', marginBottom: 0 }} />

                    <StatRow label="memories on the wall" value={`${totalItems}`} />
                    <StatRow label="done together" value={doneWithPhoto.length > 0 ? `${doneWithPhoto.length} ✓` : '0 yet'} />
                    {proposesStat && <StatRow label="who proposes more" value={proposesStat} />}
                    {themeStat && <StatRow label="favourite vibe" value={themeStat} />}
                    {(physicalCount > 0 || onlineCount > 0) && (
                      <StatRow label="in-person vs. online" value={`${physicalCount} in-person · ${onlineCount} online`} />
                    )}
                    {topRegion && (
                      <StatRow label="busiest region" value={topRegion.name} />
                    )}
                    {firstDone && (
                      <StatRow
                        label="first memory completed"
                        value={firstDone.date
                          ? `${firstDone.title} · ${new Date(firstDone.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
                          : firstDone.title
                        }
                      />
                    )}
                    {lastDone && (
                      <StatRow
                        label="most recent completed"
                        value={lastDone.date
                          ? `${lastDone.title} · ${new Date(lastDone.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
                          : lastDone.title
                        }
                      />
                    )}
                    {notesStat && <StatRow label="sealed notes" value={notesStat} />}
                  </>
                )}

                {/* Profile link */}
                <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
                  <button
                    onClick={() => { onClose(); setTimeout(onOpenProfile, 200) }}
                    style={{
                      fontSize: 13, color: 'var(--color-teal)',
                      fontFamily: 'var(--font-sans)',
                      display: 'flex', alignItems: 'center', gap: 7,
                      background: 'transparent',
                      border: '1.5px solid var(--color-teal)',
                      borderRadius: 10,
                      padding: '10px 14px',
                      width: '100%',
                      justifyContent: 'center',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <circle cx="7" cy="5" r="3" stroke="currentColor" strokeWidth="1.2"/>
                      <path d="M1 13c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                    your profile &amp; wall settings
                  </button>
                </div>

              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
