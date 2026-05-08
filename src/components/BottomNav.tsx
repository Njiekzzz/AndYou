import { useApp } from '../context/AppContext'

interface BottomNavProps {
  onAdd: () => void
  onSpin?: () => void
}

export function BottomNav({ onAdd }: BottomNavProps) {
  const { activeView, setActiveView } = useApp()

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
      height: 72,
      background: 'var(--bottomnav-bg)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderTop: '1px solid var(--cream-dark)',
      paddingBottom: 'env(safe-area-inset-bottom)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 20px',
    }}>

      {/* Left — Wall / List pill toggle */}
      <div style={{
        display: 'flex', gap: 4,
        background: 'var(--cream-dark)',
        borderRadius: 24,
        padding: 4,
      }}>
        {(['timeline', 'list'] as const).map(view => {
          const active = activeView === view
          return (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              style={{
                height: 36, padding: '0 20px',
                borderRadius: 20,
                fontFamily: 'var(--font-sans)',
                fontSize: 14, fontWeight: 500,
                background: active ? 'var(--amber)' : 'transparent',
                color: active ? '#fff' : 'var(--text-muted)',
                border: 'none', cursor: 'pointer',
                transition: 'background 0.18s, color 0.18s',
              }}
            >
              {view === 'timeline' ? 'Wall' : 'List'}
            </button>
          )
        })}
      </div>

      {/* Right — add */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={onAdd}
          style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'var(--amber)',
            border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 12px rgba(212,144,10,0.35)',
          }}
          title="Add item"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
