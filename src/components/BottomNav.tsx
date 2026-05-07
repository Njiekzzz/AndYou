import { useApp } from '../context/AppContext'

interface BottomNavProps {
  onAdd: () => void
  onSpin: () => void
}

export function BottomNav({ onAdd, onSpin }: BottomNavProps) {
  const { activeView, setActiveView } = useApp()

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between px-4"
      style={{
        height: 64,
        background: 'var(--nav-bg)',
        borderTop: '1px solid var(--nav-border)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Segmented pill — Wall / List */}
      <div style={{
        display: 'flex',
        background: 'var(--bg-sunken)',
        borderRadius: 999,
        padding: 3,
        gap: 2,
      }}>
        {(['timeline', 'list'] as const).map(view => {
          const active = activeView === view
          return (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              style={{
                padding: '5px 14px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: active ? 600 : 400,
                background: active ? '#e0a04a' : 'transparent',
                color: active ? '#2a2620' : 'var(--text-muted)',
                transition: 'background 0.2s, color 0.2s',
                letterSpacing: '0.02em',
              }}
            >
              {view === 'timeline' ? 'Wall' : 'List'}
            </button>
          )
        })}
      </div>

      {/* Right — spin + FAB */}
      <div className="flex items-center gap-3">
        <button
          onClick={onSpin}
          className="w-9 h-9 flex items-center justify-center rounded-full transition-opacity hover:opacity-70 active:scale-95"
          title="Surprise us"
          style={{ color: 'var(--text-muted)', background: 'var(--bg-sunken)' }}
        >
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
            <path d="M9 2a7 7 0 1 0 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M16 6V2h-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button
          onClick={onAdd}
          className="flex items-center justify-center transition-transform active:scale-95 hover:scale-105"
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: '#e0a04a',
            color: '#2a2620',
            boxShadow: '0 4px 12px rgba(224,160,74,0.4)',
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
