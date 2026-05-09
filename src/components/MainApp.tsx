import { useState, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useApp } from '../context/AppContext'
import { TopBar } from './TopBar'
import { BottomNav } from './BottomNav'
import { TimelineCanvas } from './TimelineCanvas'
import { ListView } from './ListView'
import { DaresBoard } from './DaresBoard'
import { ExpandedCard } from './ExpandedCard'
import { AddItemSheet } from './AddItemSheet'
import { AddDareSheet } from './AddDareSheet'
import { SettingsSheet } from './SettingsSheet'
import { MomentumCounter } from './MomentumCounter'
import { BucketItem } from '../types'

export function MainApp() {
  const { activeView, items, dares } = useApp()
  const [selectedItem, setSelectedItem] = useState<BucketItem | null>(null)
  const [addSheetOpen, setAddSheetOpen] = useState(false)
  const [editItem, setEditItem] = useState<BucketItem | null>(null)
  const [addDareOpen, setAddDareOpen] = useState(false)
  const [editDareId, setEditDareId] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [spinTarget, setSpinTarget] = useState<string | null>(null)

  const handleSpin = useCallback(() => {
    const eligible = items.filter(i => i.status !== 'done' && i.status !== 'proposed')
    if (eligible.length === 0) return

    let count = 0
    const totalFlips = 8 + Math.floor(Math.random() * 6)
    const interval = setInterval(() => {
      const random = eligible[Math.floor(Math.random() * eligible.length)]
      setSpinTarget(random.id)
      count++
      if (count >= totalFlips) {
        clearInterval(interval)
        const final = eligible[Math.floor(Math.random() * eligible.length)]
        setSpinTarget(final.id)
        setTimeout(() => setSpinTarget(null), 3000)
      }
    }, 120)
  }, [items])

  const handleOpenAdd = useCallback(() => {
    if (activeView === 'dares') {
      setEditDareId(null)
      setAddDareOpen(true)
    } else {
      setEditItem(null)
      setAddSheetOpen(true)
    }
  }, [activeView])

  const handleEditItem = useCallback((item: BucketItem) => {
    setSelectedItem(null)
    setEditItem(item)
    setAddSheetOpen(true)
  }, [])

  const handleSheetClose = useCallback(() => {
    setAddSheetOpen(false)
    setEditItem(null)
  }, [])

  const handleOpenAddDare = useCallback((editId?: string) => {
    setEditDareId(editId ?? null)
    setAddDareOpen(true)
  }, [])

  return (
    <>
      <TopBar onOpenSettings={() => setSettingsOpen(true)} />

      <AnimatePresence mode="wait">
        {activeView === 'timeline' ? (
          <TimelineCanvas
            key="timeline"
            onItemClick={setSelectedItem}
            spinTarget={spinTarget}
          />
        ) : activeView === 'list' ? (
          <ListView
            key="list"
            onItemClick={setSelectedItem}
          />
        ) : (
          <DaresBoard
            key="dares"
            onAddDare={handleOpenAddDare}
          />
        )}
      </AnimatePresence>

      {activeView === 'timeline' && <MomentumCounter />}

      <BottomNav
        onAdd={handleOpenAdd}
        pulseAdd={activeView === 'dares' && dares.length === 0}
      />

      <AnimatePresence>
        {selectedItem && (
          <ExpandedCard
            key={selectedItem.id}
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onEdit={handleEditItem}
          />
        )}
      </AnimatePresence>

      <AddItemSheet
        open={addSheetOpen}
        onClose={handleSheetClose}
        editItem={editItem}
      />

      <AddDareSheet
        open={addDareOpen}
        onClose={() => { setAddDareOpen(false); setEditDareId(null) }}
        editDareId={editDareId}
      />

      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  )
}
