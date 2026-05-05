import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../context/AppContext'
import { AVATAR_COLORS } from '../types'

type Step = 'welcome' | 'create' | 'join' | 'name-create' | 'name-join' | 'code-shown'

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
    } catch (e) {
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
    } catch {
      setError('Wall not found. Check the code and try again.')
    }
    setLoading(false)
  }

  const copyCode = () => {
    navigator.clipboard.writeText(generatedCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center dot-grid" style={{ background: 'var(--bg)' }}>
      <AnimatePresence mode="wait">
        {step === 'welcome' && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center px-8 max-w-sm w-full"
          >
            <div className="mb-10">
              <h1 className="text-4xl font-light tracking-widest mb-2" style={{ color: 'var(--text-primary)' }}>& you</h1>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>a shared wall for two</p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => setStep('name-create')}
                className="w-full py-3 px-6 text-sm tracking-wide transition-all"
                style={{
                  background: 'var(--text-primary)',
                  color: 'var(--bg)',
                  borderRadius: '6px',
                }}
              >
                create a wall
              </button>
              <button
                onClick={() => setStep('name-join')}
                className="w-full py-3 px-6 text-sm tracking-wide transition-all"
                style={{
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                }}
              >
                join with code
              </button>
            </div>
          </motion.div>
        )}

        {(step === 'name-create' || step === 'name-join') && (
          <motion.div
            key="name"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="px-8 max-w-sm w-full"
          >
            <button
              onClick={() => setStep('welcome')}
              className="mb-6 text-xs"
              style={{ color: 'var(--text-muted)' }}
            >
              ← back
            </button>
            <h2 className="text-xl font-light mb-6" style={{ color: 'var(--text-primary)' }}>
              {step === 'name-create' ? 'set up your profile' : 'who are you?'}
            </h2>

            <div className="mb-5">
              <label className="text-xs mb-2 block" style={{ color: 'var(--text-secondary)' }}>your name</label>
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

            <div className="mb-6">
              <label className="text-xs mb-3 block" style={{ color: 'var(--text-secondary)' }}>your color</label>
              <div className="flex gap-2 flex-wrap">
                {AVATAR_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className="w-8 h-8 rounded-full transition-transform"
                    style={{
                      background: c,
                      transform: color === c ? 'scale(1.2)' : 'scale(1)',
                      outline: color === c ? `2px solid var(--text-primary)` : 'none',
                      outlineOffset: '2px',
                    }}
                  />
                ))}
              </div>
            </div>

            {step === 'name-join' && (
              <div className="mb-5">
                <label className="text-xs mb-2 block" style={{ color: 'var(--text-secondary)' }}>wall code</label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  maxLength={6}
                  className="uppercase tracking-widest"
                  style={{ fontSize: '20px', letterSpacing: '0.3em' }}
                />
              </div>
            )}

            {error && <p className="text-xs mb-3" style={{ color: '#c97b5a' }}>{error}</p>}

            <button
              onClick={step === 'name-create' ? handleCreate : handleJoin}
              disabled={loading || !name.trim() || (step === 'name-join' && joinCode.length < 6)}
              className="w-full py-3 px-6 text-sm tracking-wide transition-all disabled:opacity-40"
              style={{
                background: 'var(--text-primary)',
                color: 'var(--bg)',
                borderRadius: '6px',
              }}
            >
              {loading ? 'loading…' : step === 'name-create' ? 'create wall' : 'join wall'}
            </button>
          </motion.div>
        )}

        {step === 'code-shown' && (
          <motion.div
            key="code"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-center px-8 max-w-sm w-full"
          >
            <div className="mb-2 text-xs" style={{ color: 'var(--text-muted)' }}>your wall code</div>
            <button
              onClick={copyCode}
              className="mb-2 font-mono text-5xl tracking-[0.3em] font-light transition-opacity"
              style={{ color: 'var(--text-primary)' }}
            >
              {generatedCode}
            </button>
            <div className="text-xs mb-8" style={{ color: 'var(--text-muted)' }}>
              {copied ? '✓ copied!' : 'tap to copy'}
            </div>
            <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
              Share this code with your person. They'll use it to join your wall.
            </p>
            <button
              onClick={() => {}}
              className="w-full py-3 px-6 text-sm tracking-wide"
              style={{
                background: 'var(--text-primary)',
                color: 'var(--bg)',
                borderRadius: '6px',
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
