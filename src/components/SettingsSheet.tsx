import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../context/AppContext'
import { Region, PolaroidStyle } from '../types'

interface SettingsSheetProps {
  open: boolean
  onClose: () => void
}

export function SettingsSheet({ open, onClose }: SettingsSheetProps) {
  const { wall, regions, updateRegion, addRegion, polaroidStyle, setPolaroidStyle, updateWallName } = useApp()
  const [wallNameInput, setWallNameInput] = useState(wall?.name ?? '')
  const [newRegionName, setNewRegionName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDate, setEditDate] = useState('')

  const handleAddRegion = async () => {
    if (!newRegionName.trim()) return
    await addRegion(newRegionName.trim())
    setNewRegionName('')
  }

  const startEdit = (region: Region) => {
    setEditingId(region.id)
    setEditName(region.name)
    setEditDate(region.unlock_date ?? '')
  }

  const saveEdit = async () => {
    if (!editingId) return
    await updateRegion(editingId, {
      name: editName.trim(),
      unlock_date: editDate || null,
    })
    setEditingId(null)
  }

  const sortedRegions = [...regions].sort((a, b) => a.order - b.order)

  useEffect(() => { setWallNameInput(wall?.name ?? '') }, [wall?.name])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 60 }}
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
              zIndex: 61,
              background: 'var(--sheet-bg)',
              borderRadius: '16px 16px 0 0',
              padding: '0 0 env(safe-area-inset-bottom)',
              maxHeight: '85vh',
              overflowY: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 4 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
            </div>

            <div style={{ padding: '8px 20px 24px' }}>
              <div className="flex items-center justify-between mb-5">
                <h2 style={{ fontSize: 18, fontWeight: 500, color: 'var(--text-primary)' }}>settings</h2>
                <button onClick={onClose} style={{ color: 'var(--text-muted)', fontSize: 22 }}>×</button>
              </div>

              {/* Wall name */}
              {wall && (
                <div className="mb-6">
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                    wall name
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={wallNameInput}
                      onChange={e => setWallNameInput(e.target.value)}
                      placeholder="give this wall a name…"
                      onKeyDown={e => e.key === 'Enter' && wallNameInput.trim() && updateWallName(wallNameInput.trim())}
                      style={{ flex: 1 }}
                    />
                    <button
                      onClick={() => wallNameInput.trim() && updateWallName(wallNameInput.trim())}
                      disabled={!wallNameInput.trim()}
                      style={{
                        padding: '8px 14px',
                        background: 'var(--text-primary)',
                        color: 'var(--bg)',
                        borderRadius: 6,
                        fontSize: 13,
                        opacity: !wallNameInput.trim() ? 0.4 : 1,
                      }}
                    >
                      save
                    </button>
                  </div>
                </div>
              )}

              {/* Wall code */}
              {wall && (
                <div className="mb-6">
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                    wall code
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(wall.code)}
                    style={{
                      fontFamily: 'monospace',
                      fontSize: 28,
                      letterSpacing: '0.25em',
                      color: 'var(--text-primary)',
                      display: 'block',
                    }}
                  >
                    {wall.code}
                  </button>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>tap to copy</div>
                </div>
              )}

              {/* Polaroid style */}
              <div className="mb-6">
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                  polaroid style
                </div>
                <div className="flex gap-2">
                  {([
                    ['styled', 'themed design'],
                    ['border', 'colour border'],
                    ['plain', 'plain'],
                  ] as [PolaroidStyle, string][]).map(([s, label]) => (
                    <button
                      key={s}
                      onClick={() => setPolaroidStyle(s)}
                      style={{
                        flex: 1, padding: '8px 4px', borderRadius: 6, fontSize: 11,
                        border: `1px solid ${polaroidStyle === s ? 'var(--text-primary)' : 'var(--border)'}`,
                        background: polaroidStyle === s ? 'var(--text-primary)' : 'transparent',
                        color: polaroidStyle === s ? 'var(--bg)' : 'var(--text-secondary)',
                        transition: 'all 0.15s',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Regions */}
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                  regions
                </div>

                {sortedRegions.map(region => (
                  <div
                    key={region.id}
                    style={{
                      padding: '10px 0',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    {editingId === region.id ? (
                      <div>
                        <input
                          type="text"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className="mb-2"
                          style={{ marginBottom: 8 }}
                        />
                        <div className="mb-2" style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
                          unlock date (optional)
                        </div>
                        <input
                          type="date"
                          value={editDate}
                          onChange={e => setEditDate(e.target.value)}
                          style={{ marginBottom: 8 }}
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={saveEdit}
                            style={{
                              flex: 1,
                              padding: '7px',
                              background: 'var(--text-primary)',
                              color: 'var(--bg)',
                              borderRadius: 6,
                              fontSize: 13,
                            }}
                          >
                            save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            style={{
                              padding: '7px 12px',
                              border: '1px solid var(--border)',
                              color: 'var(--text-muted)',
                              borderRadius: 6,
                              fontSize: 13,
                            }}
                          >
                            cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{region.name}</div>
                          {region.unlock_date && (
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                              unlocks {new Date(region.unlock_date).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => startEdit(region)}
                          style={{ fontSize: 12, color: 'var(--text-muted)', padding: '4px 8px' }}
                        >
                          edit
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {/* Add region */}
                <div className="flex gap-2 mt-3">
                  <input
                    type="text"
                    value={newRegionName}
                    onChange={e => setNewRegionName(e.target.value)}
                    placeholder="new region name"
                    onKeyDown={e => e.key === 'Enter' && handleAddRegion()}
                    style={{ flex: 1 }}
                  />
                  <button
                    onClick={handleAddRegion}
                    disabled={!newRegionName.trim()}
                    style={{
                      padding: '8px 14px',
                      background: 'var(--text-primary)',
                      color: 'var(--bg)',
                      borderRadius: 6,
                      fontSize: 13,
                      opacity: !newRegionName.trim() ? 0.4 : 1,
                    }}
                  >
                    add
                  </button>
                </div>
              </div>

              {/* Reset */}
              <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <button
                  onClick={() => {
                    if (!confirm('Clear all local data and start over?')) return
                    Object.keys(localStorage)
                      .filter(k => k.startsWith('andyou_'))
                      .forEach(k => localStorage.removeItem(k))
                    window.location.reload()
                  }}
                  style={{
                    fontSize: 13,
                    color: '#c97b5a',
                    padding: '8px 0',
                    display: 'block',
                  }}
                >
                  reset & start over
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
