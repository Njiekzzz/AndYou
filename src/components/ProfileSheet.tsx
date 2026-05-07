import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../context/AppContext'
import { Avatar } from './Avatar'
import { AVATAR_COLORS } from '../types'

interface ProfileSheetProps {
  open: boolean
  onClose: () => void
}

type SubView = 'main' | 'create-new' | 'join-new' | 'new-code-shown' | 'confirm-leave' | 'confirm-kick'

export function ProfileSheet({ open, onClose }: ProfileSheetProps) {
  const {
    user, partner, wall, googleUser,
    signInWithGoogle, signOutGoogle,
    savedWalls, switchWall, leaveWall, kickPartner,
    createWall, joinWall,
  } = useApp()

  const [subView, setSubView] = useState<SubView>('main')
  const [copied, setCopied] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [googleError, setGoogleError] = useState('')
  const [newWallCode, setNewWallCode] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const wallCode = wall?.code ?? ''
  const currentWallId = wall?.id ?? ''

  const handleClose = () => {
    setSubView('main')
    setJoinCode('')
    setJoinError('')
    setNewWallCode('')
    onClose()
  }

  const copyCode = () => {
    navigator.clipboard.writeText(wallCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    setGoogleError('')
    try {
      await signInWithGoogle()
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      setGoogleError(msg.includes('popup-closed') ? 'Sign-in cancelled.' : 'Sign-in failed. Try again.')
    }
    setGoogleLoading(false)
  }

  const handleCreateNew = async () => {
    if (!user) return
    setActionLoading(true)
    try {
      const code = await createWall(user.name, user.avatar_color)
      setNewWallCode(code)
      setSubView('new-code-shown')
    } catch {
      // ignore
    }
    setActionLoading(false)
  }

  const handleJoinNew = async () => {
    if (joinCode.length < 6) return
    setActionLoading(true)
    setJoinError('')
    try {
      await joinWall(joinCode.trim(), user?.name ?? 'me', user?.avatar_color ?? AVATAR_COLORS[0])
      handleClose()
    } catch (e) {
      setJoinError(e instanceof Error ? e.message : 'Wall not found.')
    }
    setActionLoading(false)
  }

  const handleSwitchWall = async (wallId: string) => {
    await switchWall(wallId)
    handleClose()
  }

  const handleLeaveWall = async () => {
    await leaveWall()
    handleClose()
  }

  const handleKickPartner = async () => {
    await kickPartner()
    setSubView('main')
  }

  const otherWalls = savedWalls.filter(w => w.wallId !== currentWallId)

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(42,38,32,0.4)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 70 }}
            onClick={handleClose}
          />
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 280, damping: 30, mass: 0.8 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.3 }}
            onDragEnd={(_: unknown, info: { offset: { y: number } }) => { if (info.offset.y > 80) handleClose() }}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 71,
              background: 'var(--sheet-bg)',
              borderRadius: '24px 24px 0 0',
              padding: '0 0 env(safe-area-inset-bottom)',
              maxHeight: '85vh',
              overflowY: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
            </div>

            <div style={{ padding: '8px 20px 40px' }}>

              {/* ── MAIN VIEW ── */}
              {subView === 'main' && (
                <>
                  <div className="flex items-center justify-between mb-5">
                    <h2 style={{ fontSize: 18, fontWeight: 500, color: 'var(--text-primary)' }}>your wall</h2>
                    <button onClick={handleClose} style={{ color: 'var(--text-muted)', fontSize: 22, lineHeight: 1 }}>×</button>
                  </div>

                  {/* You */}
                  {user && (
                    <div className="flex items-center gap-3 mb-4">
                      <Avatar name={user.name} color={user.avatar_color} size={36} />
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>{user.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>you</div>
                      </div>
                    </div>
                  )}

                  {/* Partner */}
                  {partner ? (
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <Avatar name={partner.name} color={partner.avatar_color} size={36} />
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>{partner.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>your person</div>
                        </div>
                      </div>
                      <button
                        onClick={() => setSubView('confirm-kick')}
                        style={{ fontSize: 12, color: 'var(--text-muted)', padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 6 }}
                      >
                        remove
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 mb-5">
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        border: '1.5px dashed var(--border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: 18, lineHeight: 1 }}>+</span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>waiting for your person…</div>
                    </div>
                  )}

                  {/* Wall code */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>wall code</div>
                    <button
                      onClick={copyCode}
                      style={{
                        width: '100%', padding: '14px',
                        background: 'var(--border)', borderRadius: 8,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ fontFamily: 'monospace', fontSize: 22, letterSpacing: '0.3em', color: 'var(--text-primary)', fontWeight: 300 }}>
                        {wallCode}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{copied ? '✓ copied' : 'tap to copy'}</span>
                    </button>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>Share this code with your person to invite them.</p>
                  </div>

                  <div style={{ height: 1, background: 'var(--border)', marginBottom: 20 }} />

                  {/* Your walls */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>your walls</div>

                    {/* Current wall */}
                    <div className="flex items-center justify-between" style={{ padding: '10px 12px', background: 'var(--border)', borderRadius: 8, marginBottom: 6 }}>
                      <div>
                        <span style={{ fontFamily: 'monospace', fontSize: 13, letterSpacing: '0.15em', color: 'var(--text-primary)' }}>{wallCode}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>active</span>
                      </div>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7b9e7b' }} />
                    </div>

                    {/* Other walls */}
                    {otherWalls.map(w => (
                      <div key={w.wallId} className="flex items-center justify-between" style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 6 }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 13, letterSpacing: '0.15em', color: 'var(--text-secondary)' }}>{w.wallCode}</span>
                        <button
                          onClick={() => handleSwitchWall(w.wallId)}
                          style={{ fontSize: 12, color: 'var(--text-primary)', padding: '4px 10px', border: '1px solid var(--border)', borderRadius: 6 }}
                        >
                          switch
                        </button>
                      </div>
                    ))}

                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={handleCreateNew}
                        disabled={actionLoading}
                        style={{
                          flex: 1, padding: '9px', borderRadius: 8,
                          border: '1px solid var(--border)', fontSize: 12,
                          color: 'var(--text-secondary)', background: 'transparent',
                          opacity: actionLoading ? 0.5 : 1,
                        }}
                      >
                        + create new
                      </button>
                      <button
                        onClick={() => setSubView('join-new')}
                        style={{
                          flex: 1, padding: '9px', borderRadius: 8,
                          border: '1px solid var(--border)', fontSize: 12,
                          color: 'var(--text-secondary)', background: 'transparent',
                        }}
                      >
                        + join with code
                      </button>
                    </div>
                  </div>

                  <div style={{ height: 1, background: 'var(--border)', marginBottom: 20 }} />

                  {/* Google account */}
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>account</div>
                    {googleUser ? (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <GoogleIcon />
                          <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>{googleUser.displayName || googleUser.email}</span>
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>Your wall is saved to your Google account.</p>
                        <button
                          onClick={() => signOutGoogle()}
                          style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-secondary)', background: 'transparent' }}
                        >
                          sign out
                        </button>
                      </div>
                    ) : (
                      <div>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>Sign in to save your wall across devices.</p>
                        {googleError && <p style={{ fontSize: 12, color: '#c97b5a', marginBottom: 8 }}>{googleError}</p>}
                        <button
                          onClick={handleGoogleSignIn}
                          disabled={googleLoading}
                          style={{
                            width: '100%', padding: '12px', borderRadius: 8,
                            border: '1px solid var(--border)', background: 'var(--bg-card)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                            fontSize: 14, color: 'var(--text-primary)', opacity: googleLoading ? 0.5 : 1,
                          }}
                        >
                          <GoogleIcon />
                          {googleLoading ? 'signing in…' : 'continue with Google'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Leave wall */}
                  <button
                    onClick={() => setSubView('confirm-leave')}
                    style={{ fontSize: 13, color: '#c97b5a', padding: '4px 0' }}
                  >
                    leave this wall
                  </button>
                </>
              )}

              {/* ── JOIN NEW ── */}
              {subView === 'join-new' && (
                <>
                  <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => setSubView('main')} style={{ color: 'var(--text-muted)', fontSize: 13 }}>← back</button>
                    <h2 style={{ fontSize: 18, fontWeight: 500, color: 'var(--text-primary)' }}>join a wall</h2>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>wall code</label>
                    <input
                      type="text"
                      value={joinCode}
                      onChange={e => setJoinCode(e.target.value.toUpperCase())}
                      placeholder="ABC123"
                      maxLength={6}
                      className="uppercase tracking-widest"
                      style={{ fontSize: '20px', letterSpacing: '0.3em' }}
                      autoFocus
                    />
                  </div>
                  {joinError && <p style={{ fontSize: 12, color: '#c97b5a', marginBottom: 8 }}>{joinError}</p>}
                  <button
                    onClick={handleJoinNew}
                    disabled={joinCode.length < 6 || actionLoading}
                    style={{
                      width: '100%', padding: '13px', borderRadius: 8,
                      background: 'var(--text-primary)', color: 'var(--bg)',
                      fontSize: 15, fontWeight: 500,
                      opacity: (joinCode.length < 6 || actionLoading) ? 0.4 : 1,
                    }}
                  >
                    {actionLoading ? 'joining…' : 'join wall'}
                  </button>
                </>
              )}

              {/* ── NEW CODE SHOWN ── */}
              {subView === 'new-code-shown' && (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h2 style={{ fontSize: 18, fontWeight: 500, color: 'var(--text-primary)' }}>new wall created</h2>
                    <button onClick={handleClose} style={{ color: 'var(--text-muted)', fontSize: 22, lineHeight: 1 }}>×</button>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>Share this code with your person:</p>
                  <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 40, letterSpacing: '0.3em', color: 'var(--text-primary)', fontWeight: 300 }}>{newWallCode}</div>
                  </div>
                  <button
                    onClick={handleClose}
                    style={{
                      width: '100%', padding: '13px', borderRadius: 8,
                      background: 'var(--text-primary)', color: 'var(--bg)', fontSize: 15, fontWeight: 500,
                    }}
                  >
                    open new wall
                  </button>
                </>
              )}

              {/* ── CONFIRM LEAVE ── */}
              {subView === 'confirm-leave' && (
                <>
                  <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => setSubView('main')} style={{ color: 'var(--text-muted)', fontSize: 13 }}>← back</button>
                    <h2 style={{ fontSize: 18, fontWeight: 500, color: 'var(--text-primary)' }}>leave wall?</h2>
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.5 }}>
                    You'll be removed from this wall. Your items will stay but you won't be able to access this wall unless you rejoin with the code.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setSubView('main')}
                      style={{ flex: 1, padding: '12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14, color: 'var(--text-secondary)', background: 'transparent' }}
                    >
                      cancel
                    </button>
                    <button
                      onClick={handleLeaveWall}
                      style={{ flex: 1, padding: '12px', borderRadius: 8, background: '#c97b5a', color: '#fff', fontSize: 14, fontWeight: 500 }}
                    >
                      leave wall
                    </button>
                  </div>
                </>
              )}

              {/* ── CONFIRM KICK ── */}
              {subView === 'confirm-kick' && partner && (
                <>
                  <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => setSubView('main')} style={{ color: 'var(--text-muted)', fontSize: 13 }}>← back</button>
                    <h2 style={{ fontSize: 18, fontWeight: 500, color: 'var(--text-primary)' }}>remove {partner.name}?</h2>
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.5 }}>
                    {partner.name} will be removed from your wall. They can rejoin with the wall code if you share it again.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setSubView('main')}
                      style={{ flex: 1, padding: '12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14, color: 'var(--text-secondary)', background: 'transparent' }}
                    >
                      cancel
                    </button>
                    <button
                      onClick={handleKickPartner}
                      style={{ flex: 1, padding: '12px', borderRadius: 8, background: '#c97b5a', color: '#fff', fontSize: 14, fontWeight: 500 }}
                    >
                      remove
                    </button>
                  </div>
                </>
              )}

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}
