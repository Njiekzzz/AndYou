import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { ProfileSheet } from './ProfileSheet'
import { StatsSheet } from './StatsSheet'

interface TopBarProps {
  onOpenSettings?: () => void
}

export function TopBar({ onOpenSettings }: TopBarProps) {
  const { user, partner, toggleTheme, theme } = useApp()
  const [profileOpen, setProfileOpen] = useState(false)
  const [statsOpen, setStatsOpen] = useState(false)

  const initial = (name: string) => name.charAt(0).toUpperCase()

  return (
    <>
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        height: 64,
        background: 'var(--topbar-bg)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderBottom: '1px solid var(--cream-dark)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px',
      }}>

        {/* Left — avatar stack: opens stats when partner present, else profile */}
        <button
          onClick={() => partner ? setStatsOpen(true) : setProfileOpen(true)}
          style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
        >
          <div style={{ position: 'relative', width: user && partner ? 54 : 36, height: 36 }}>
            {user && (
              <div style={{
                position: 'absolute', left: 0, zIndex: 2,
                width: 36, height: 36, borderRadius: '50%',
                background: user.avatar_color || '#c8a86a',
                border: '2px solid var(--cream)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: '#fff',
              }}>
                {initial(user.name)}
              </div>
            )}
            {partner && (
              <div style={{
                position: 'absolute', left: 18, zIndex: 1,
                width: 36, height: 36, borderRadius: '50%',
                background: partner.avatar_color || '#8a9abf',
                border: '2px solid var(--cream)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: '#fff',
              }}>
                {initial(partner.name)}
              </div>
            )}
          </div>
        </button>

        {/* Center — &you, absolutely centered */}
        <div style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          fontFamily: 'var(--font-serif)',
          fontStyle: 'italic',
          fontSize: 22,
          fontWeight: 400,
          color: 'var(--color-teal)',
          letterSpacing: '-0.01em',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}>
          &amp;you
        </div>

        {/* Right — settings + theme toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer' }}
              title="Settings"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-mid)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>
          )}
          <button
            onClick={toggleTheme}
            style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer' }}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-mid)" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="5"/>
                <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-mid)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      <ProfileSheet open={profileOpen} onClose={() => setProfileOpen(false)} />
      <StatsSheet
        open={statsOpen}
        onClose={() => setStatsOpen(false)}
        onOpenProfile={() => { setStatsOpen(false); setProfileOpen(true) }}
      />
    </>
  )
}
