import { useApp } from '../context/AppContext'

interface BottomNavProps {
  onAdd: () => void
  onSpin: () => void
}

export function BottomNav({ onAdd, onSpin }: BottomNavProps) {
  const { activeView, setActiveView } = useApp()

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between px-6"
      style={{
        height: 64,
        background: 'var(--nav-bg)',
        borderTop: '1px solid var(--nav-border)',
        backdropFilter: 'blur(12px)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex items-center gap-6">
        <button
          onClick={() => setActiveView('timeline')}
          className="flex flex-col items-center gap-1 transition-opacity"
          style={{ opacity: activeView === 'timeline' ? 1 : 0.4 }}
          title="Timeline"
        >
          <TimelineIcon active={activeView === 'timeline'} />
        </button>
        <button
          onClick={() => setActiveView('list')}
          className="flex flex-col items-center gap-1 transition-opacity"
          style={{ opacity: activeView === 'list' ? 1 : 0.4 }}
          title="List"
        >
          <ListIcon active={activeView === 'list'} />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onSpin}
          className="w-8 h-8 flex items-center justify-center rounded-full transition-opacity hover:opacity-70"
          title="Surprise us"
          style={{ color: 'var(--text-muted)' }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 2a7 7 0 1 0 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M16 6V2h-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button
          onClick={onAdd}
          className="flex items-center justify-center transition-transform active:scale-95"
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: '#e0a04a',
            color: '#2a2620',
          }}
          title="Add item"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 3v12M3 9h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

function TimelineIcon({ active }: { active: boolean }) {
  const color = active ? '#3a7a78' : 'var(--text-primary)'
  return (
    <svg width="22" height="16" viewBox="0 0 22 16" fill="none">
      <line x1="0" y1="8" x2="22" y2="8" stroke={color} strokeWidth={active ? 1.8 : 1.3}/>
      <line x1="5" y1="8" x2="5" y2="2" stroke={color} strokeWidth="1.3"/>
      <line x1="11" y1="8" x2="11" y2="14" stroke={color} strokeWidth="1.3"/>
      <line x1="17" y1="8" x2="17" y2="3" stroke={color} strokeWidth="1.3"/>
      <rect x="2" y="0" width="6" height="4" rx="0.5" stroke={color} strokeWidth="1.3"/>
      <rect x="8" y="12" width="6" height="4" rx="0.5" stroke={color} strokeWidth="1.3"/>
      <rect x="14" y="1" width="6" height="4" rx="0.5" stroke={color} strokeWidth="1.3"/>
    </svg>
  )
}

function ListIcon({ active }: { active: boolean }) {
  const color = active ? '#3a7a78' : 'var(--text-primary)'
  return (
    <svg width="20" height="16" viewBox="0 0 20 16" fill="none">
      <line x1="0" y1="3" x2="14" y2="3" stroke={color} strokeWidth={active ? 1.8 : 1.3} strokeLinecap="round"/>
      <line x1="0" y1="8" x2="20" y2="8" stroke={color} strokeWidth={active ? 1.8 : 1.3} strokeLinecap="round"/>
      <line x1="0" y1="13" x2="10" y2="13" stroke={color} strokeWidth={active ? 1.8 : 1.3} strokeLinecap="round"/>
    </svg>
  )
}
