import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../context/AppContext'
import { Dare } from '../types'

const EMOJIS = ['😂', '🔥', '😍', '👏', '😭']

interface TradeRevealProps {
  dare: Dare | null
  onClose: () => void
}

export function TradeReveal({ dare, onClose }: TradeRevealProps) {
  const { user, partner, getUserById, setDareReaction } = useApp()

  if (!dare || !user) return null

  const iAmCreator = dare.created_by === user.id
  const creator = getUserById(dare.created_by)
  const partnerName = partner?.name ?? 'partner'
  const creatorName = creator?.name ?? 'you'

  // My panel
  const myTitle = iAmCreator ? (dare.trade_title ?? '') : dare.title
  const myPhoto = iAmCreator ? dare.trade_completion_photo_url : dare.completion_photo_url
  const myNote = iAmCreator ? dare.trade_completion_note : dare.completion_note
  const myReaction = iAmCreator ? dare.creator_reaction : dare.assignee_reaction
  const amCreatorForReaction = iAmCreator

  // Their panel
  const theirTitle = iAmCreator ? dare.title : (dare.trade_title ?? '')
  const theirPhoto = iAmCreator ? dare.completion_photo_url : dare.trade_completion_photo_url
  const theirNote = iAmCreator ? dare.completion_note : dare.trade_completion_note
  const theirReaction = iAmCreator ? dare.assignee_reaction : dare.creator_reaction

  const handleReact = async (emoji: string) => {
    if (myReaction) return
    await setDareReaction(dare.id, amCreatorForReaction, emoji)
  }

  const Panel = ({ title, photo, note, name, fromX }: { title: string; photo?: string | null; note?: string | null; name: string; fromX: number }) => (
    <motion.div
      initial={{ x: fromX, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 220, damping: 26, delay: 0.15 }}
      style={{
        flex: 1,
        background: 'rgba(255,255,255,0.06)',
        borderRadius: 16,
        padding: 16,
        display: 'flex', flexDirection: 'column', gap: 10,
      }}
    >
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: 'var(--font-sans)', margin: 0 }}>
        {name}
      </p>
      <p style={{ fontSize: 14, fontWeight: 700, color: '#fdf8eb', lineHeight: 1.35, fontFamily: 'var(--font-sans)', margin: 0 }}>
        {title}
      </p>
      {photo && (
        <img src={photo} alt="" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 8 }} />
      )}
      {note && (
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', fontStyle: 'italic', lineHeight: 1.5, margin: 0 }}>
          "{note}"
        </p>
      )}
    </motion.div>
  )

  return (
    <AnimatePresence>
      {!!dare && (
        <motion.div
          key="reveal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 80,
            background: 'linear-gradient(160deg, #1a1510 0%, #2e2010 50%, #1a1a25 100%)',
            display: 'flex', flexDirection: 'column',
            padding: 'env(safe-area-inset-top, 20px) 20px env(safe-area-inset-bottom, 20px)',
            overflowY: 'auto',
          }}
          onClick={onClose}
        >
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }} onClick={e => e.stopPropagation()}>

            {/* Heading */}
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.05 }}
              style={{ textAlign: 'center', marginBottom: 28 }}
            >
              <h1 style={{
                fontFamily: 'var(--font-serif)', fontStyle: 'italic',
                fontSize: 32, fontWeight: 400, color: 'var(--color-teal)',
                margin: 0, letterSpacing: '-0.01em',
              }}>
                trade complete
              </h1>
            </motion.div>

            {/* Two panels */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
              <Panel title={myTitle} photo={myPhoto} note={myNote} name="you" fromX={-60} />
              <Panel title={theirTitle} photo={theirPhoto} note={theirNote} name={iAmCreator ? partnerName : creatorName} fromX={60} />
            </div>

            {/* Reaction row */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              style={{ textAlign: 'center' }}
            >
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-sans)', marginBottom: 12 }}>
                {myReaction ? 'your reaction' : `react to ${iAmCreator ? partnerName : creatorName}'s dare`}
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 14 }}>
                {EMOJIS.map(emoji => {
                  const isMyPick = myReaction === emoji
                  const isTheirPick = theirReaction === emoji
                  return (
                    <button
                      key={emoji}
                      onClick={() => handleReact(emoji)}
                      disabled={!!myReaction}
                      style={{
                        fontSize: 26, lineHeight: 1,
                        background: isMyPick ? 'rgba(255,255,255,0.15)' : 'transparent',
                        borderRadius: 10, padding: '6px 8px',
                        border: isMyPick ? '1px solid rgba(255,255,255,0.3)' : '1px solid transparent',
                        opacity: myReaction && !isMyPick ? 0.35 : 1,
                        cursor: myReaction ? 'default' : 'pointer',
                        position: 'relative',
                        transition: 'all 0.15s',
                      }}
                    >
                      {emoji}
                      {isTheirPick && (
                        <div style={{ position: 'absolute', bottom: -6, right: -4, fontSize: 9, background: 'var(--amber)', color: '#fff', borderRadius: 4, padding: '1px 3px', fontFamily: 'var(--font-sans)' }}>
                          {iAmCreator ? partnerName.charAt(0) : creatorName.charAt(0)}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </motion.div>

            {/* Close */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} style={{ textAlign: 'center', marginTop: 28 }}>
              <button
                onClick={onClose}
                style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-sans)' }}
              >
                close
              </button>
            </motion.div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
