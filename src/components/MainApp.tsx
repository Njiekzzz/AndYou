import { useState, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useApp } from '../context/AppContext'
import { TopBar } from './TopBar'
import { BottomNav } from './BottomNav'
import { TimelineCanvas } from './TimelineCanvas'
import { ListView } from './ListView'
import { ExpandedCard } from './ExpandedCard'
import { AddItemSheet } from './AddItemSheet'
import { SettingsSheet } from './SettingsSheet'
import { MomentumCounter } from './MomentumCounter'
import { BucketItem } from '../types'

export function MainApp() {
  const { activeView, items } = useApp()
  const [selectedItem, setSelectedItem] = useState<BucketItem | null>(null)
  const [addSheetOpen, setAddSheetOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [spinTarget, setSpinTarget] = useState<string | null>(null)

  const handleSpin = useCallback(() => {
    const eligible = items.filter(i => i.status !== 'done' && i.status !== 'proposed')
    if (eligible.length === 0) return

    // Rapid scroll simulation then settle
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
        ) : (
          <ListView
            key="list"
            onItemClick={setSelectedItem}
          />
        )}
      </AnimatePresence>

      {activeView === 'timeline' && <MomentumCounter />}

      <BottomNav
        onAdd={() => setAddSheetOpen(true)}
        onSpin={handleSpin}
      />

      <AnimatePresence>
        {selectedItem && (
          <ExpandedCard
            key={selectedItem.id}
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
          />
        )}
      </AnimatePresence>

      <AddItemSheet
        open={addSheetOpen}
        onClose={() => setAddSheetOpen(false)}
      />

      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  )
}
