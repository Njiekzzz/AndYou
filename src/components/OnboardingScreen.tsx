import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../context/AppContext'
import { AVATAR_COLORS } from '../types'

type Step = 'welcome' | 'create' | 'join' | 'name-create' | 'name-join' | 'code-shown'

const slide = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
  transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
}

export function OnboardingScreen() {
  const { createWall, joinWall } = useApp()
  const [step, setStep] = useState<Step>('welcome')
  const [name, setName] = useState('')
  const [color, setColor] = useState(AVATAR_COLORS[0])
  const [joinCode, setJoinCode] = useState('')
  const [generatedCode, setGeneratedCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCreate = async () => {
    if (!name.trim()) return
    setLoading(true)
    try {
      const code = await createWall(name.trim(), color)
      setGeneratedCode(code)
      setStep('code-shown')
    } catch {
      setError('Failed to create wall. Check your connection.')
    }
    setLoading(false)
  }

  const handleJoin = async () => {
    if (!name.trim() || !joinCode.trim()) return
    setLoading(true)
    setError('')
    try {
      await joinWall(joinCode.trim(), name.trim(), color)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('insufficient')) {
        setError('Permission denied. Check your Firestore security rules allow unauthenticated reads.')
      } else if (msg === 'Wall not found') {
        setError('Wall not found. Check the code and try again.')
      } else {
        setError(`Error: ${msg}`)
      }
    }
    setLoading(false)
  }

  const copyCode = () => {
    navigator.clipboard.writeText(generatedCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0" style={{ background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <AnimatePresence mode="wait">

        {/* ── Welcome ── */}
        {step === 'welcome' && (
          <motion.div key="welcome" {...slide} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Hero */}
            <div style={{
              flex: '0 0 58%',
              background: 'linear-gradient(160deg, #c69a4a 0%, #c8745a 45%, #a6602f 80%, #0e1f24 100%)',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Grain overlay */}
              <div style={{
                position: 'absolute', inset: 0, opacity: 0.08, mixBlendMode: 'multiply',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.65'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`,
              }} />
              {/* Fade to bg at bottom */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: 120,
                background: 'linear-gradient(to bottom, transparent, var(--bg))',
              }} />
              {/* Title overlay */}
              <div style={{ position: 'absolute', bottom: 32, left: 28 }}>
                <h1 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 52,
                  fontWeight: 300,
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                  color: 'rgba(255,255,255,0.95)',
                  marginBottom: 6,
                }}>
                  <em style={{ fontStyle: 'italic', color: '#f5d99a' }}>&</em>you
                </h1>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.04em' }}>
                  a shared wall for two
                </p>
              </div>
            </div>

            {/* CTAs */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '32px 28px', gap: 12 }}>
              <button
                onClick={() => setStep('name-create')}
                style={{
                  width: '100%', padding: '14px 24px',
                  background: '#e0a04a', color: '#2a2620',
                  borderRadius: 999, fontSize: 15, fontWeight: 600,
                  boxShadow: '0 4px 16px rgba(224,160,74,0.35)',
                  transition: 'transform 0.15s',
                }}
              >
                create a wall
              </button>
              <button
                onClick={() => setStep('name-join')}
                style={{
                  width: '100%', padding: '14px 24px',
                  background: '#e8d4a8', color: '#2a2620',
                  borderRadius: 999, fontSize: 15, fontWeight: 500,
                }}
              >
                join with code
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Name + optional join code ── */}
        {(step === 'name-create' || step === 'name-join') && (
          <motion.div key="name" {...slide} style={{ padding: '60px 28px 40px', maxWidth: 400, width: '100%', margin: '0 auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <button
              onClick={() => setStep('welcome')}
              style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 32, textAlign: 'left', display: 'block' }}
            >
              ← back
            </button>

            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 28, fontWeight: 400, fontStyle: 'italic',
              color: 'var(--text-primary)', marginBottom: 32, letterSpacing: '-0.015em',
            }}>
              {step === 'name-create' ? 'first, who are you?' : 'who are you?'}
            </h2>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>your name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Lena"
                maxLength={20}
                onKeyDown={e => {
                  if (e.key === 'Enter' && step === 'name-create') handleCreate()
                  if (e.key === 'Enter' && step === 'name-join') setStep('join')
                }}
                autoFocus
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>your colour</label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {AVATAR_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    style={{
                      width: 32, height: 32, borderRadius: '50%', background: c,
                      transform: color === c ? 'scale(1.2)' : 'scale(1)',
                      outline: color === c ? `2px solid var(--text-primary)` : 'none',
                      outlineOffset: 2,
                      transition: 'transform 0.15s',
                    }}
                  />
                ))}
              </div>
            </div>

            {step === 'name-join' && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>wall code</label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  maxLength={6}
                  style={{ fontSize: 22, letterSpacing: '0.3em', textTransform: 'uppercase' }}
                />
              </div>
            )}

            {error && <p style={{ fontSize: 12, color: '#c97b5a', marginBottom: 12 }}>{error}</p>}

            <div style={{ flex: 1 }} />

            <button
              onClick={step === 'name-create' ? handleCreate : handleJoin}
              disabled={loading || !name.trim() || (step === 'name-join' && joinCode.length < 6)}
              style={{
                width: '100%', padding: '14px 24px',
                background: '#e0a04a', color: '#2a2620',
                borderRadius: 999, fontSize: 15, fontWeight: 600,
                opacity: (loading || !name.trim() || (step === 'name-join' && joinCode.length < 6)) ? 0.4 : 1,
                transition: 'opacity 0.15s',
                boxShadow: '0 4px 16px rgba(224,160,74,0.3)',
              }}
            >
              {loading ? 'loading…' : step === 'name-create' ? 'create wall' : 'join wall'}
            </button>
          </motion.div>
        )}

        {/* ── Code shown ── */}
        {step === 'code-shown' && (
          <motion.div
            key="code"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 28px', flex: 1, textAlign: 'center' }}
          >
            <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 18, color: 'var(--text-secondary)', marginBottom: 36 }}>
              your wall code
            </p>

            {/* Giant mono character row */}
            <button onClick={copyCode} style={{ display: 'flex', gap: 8, marginBottom: 16, cursor: 'pointer' }}>
              {generatedCode.split('').map((char, i) => (
                <div key={i} style={{
                  width: 44, height: 56,
                  background: 'var(--bg-sunken)',
                  borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 26, fontWeight: 500,
                  color: 'var(--text-primary)',
                  letterSpacing: 0,
                  border: '1px solid var(--border)',
                }}>
                  {char}
                </div>
              ))}
            </button>

            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 36, letterSpacing: '0.04em' }}>
              {copied ? '✓ copied to clipboard' : 'tap the code to copy'}
            </p>

            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 40, maxWidth: 280 }}>
              Share this with your person — they'll use it to join your wall.
            </p>

            <button
              style={{
                width: '100%', maxWidth: 320, padding: '14px 24px',
                background: '#e0a04a', color: '#2a2620',
                borderRadius: 999, fontSize: 15, fontWeight: 600,
                boxShadow: '0 4px 16px rgba(224,160,74,0.35)',
              }}
            >
              open my wall
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}
