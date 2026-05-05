import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../context/AppContext'
import { Avatar } from './Avatar'

interface ProfileSheetProps {
  open: boolean
  onClose: () => void
}

export function ProfileSheet({ open, onClose }: ProfileSheetProps) {
  const { user, partner, wall, googleUser, signInWithGoogle, signOutGoogle } = useApp()
  const [copied, setCopied] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [googleError, setGoogleError] = useState('')

  const wallCode = wall?.code ?? ''

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
      const msg = e instanceof Error ? e.message : 'Sign-in failed'
      setGoogleError(msg.includes('popup-closed') ? 'Sign-in cancelled.' : 'Sign-in failed. Try again.')
    }
    setGoogleLoading(false)
  }

  const handleSignOut = async () => {
    await signOutGoogle()
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
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 70 }}
            onClick={onClose}
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
              zIndex: 71,
              background: 'var(--sheet-bg)',
              borderRadius: '16px 16px 0 0',
              padding: '0 0 env(safe-area-inset-bottom)',
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 4 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
            </div>

            <div style={{ padding: '8px 20px 32px' }}>
              <div className="flex items-center justify-between mb-6">
                <h2 style={{ fontSize: 18, fontWeight: 500, color: 'var(--text-primary)' }}>your wall</h2>
                <button onClick={onClose} style={{ color: 'var(--text-muted)', fontSize: 22, lineHeight: 1 }}>×</button>
              </div>

              {/* You */}
              {user && (
                <div className="flex items-center gap-3 mb-5">
                  <Avatar name={user.name} color={user.avatar_color} size={36} />
                  <div>
                    <div style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: 500 }}>{user.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>you</div>
                  </div>
                </div>
              )}

              {/* Partner */}
              {partner ? (
                <div className="flex items-center gap-3 mb-6">
                  <Avatar name={partner.name} color={partner.avatar_color} size={36} />
                  <div>
                    <div style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: 500 }}>{partner.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>your person</div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 mb-6">
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
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                  wall code
                </div>
                <button
                  onClick={copyCode}
                  style={{
                    width: '100%',
                    padding: '14px',
                    background: 'var(--border)',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontFamily: 'monospace', fontSize: 22, letterSpacing: '0.3em', color: 'var(--text-primary)', fontWeight: 300 }}>
                    {wallCode}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {copied ? '✓ copied' : 'tap to copy'}
                  </span>
                </button>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                  Share this with your person to join your wall.
                </p>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: 'var(--border)', marginBottom: 20 }} />

              {/* Google account */}
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                  account
                </div>
                {googleUser ? (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <svg width="16" height="16" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>{googleUser.displayName || googleUser.email}</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                      Your wall is saved to your Google account.
                    </p>
                    <button
                      onClick={handleSignOut}
                      style={{
                        padding: '10px 16px',
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        fontSize: 13,
                        color: 'var(--text-secondary)',
                        background: 'transparent',
                      }}
                    >
                      sign out
                    </button>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                      Sign in to save your wall. You can restore it on any device.
                    </p>
                    {googleError && (
                      <p style={{ fontSize: 12, color: '#c97b5a', marginBottom: 8 }}>{googleError}</p>
                    )}
                    <button
                      onClick={handleGoogleSignIn}
                      disabled={googleLoading}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        background: 'var(--bg-card)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 10,
                        fontSize: 14,
                        color: 'var(--text-primary)',
                        opacity: googleLoading ? 0.5 : 1,
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      {googleLoading ? 'signing in…' : 'continue with Google'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
