import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { Avatar } from './Avatar'
import { ProfileSheet } from './ProfileSheet'
import { ThemeToggle } from './ThemeToggle'

interface TopBarProps {
  onOpenSettings?: () => void
}

export function TopBar({ onOpenSettings }: TopBarProps) {
  const { user, partner, wall } = useApp()
  const [profileOpen, setProfileOpen] = useState(false)

  return (
    <>
    <div
      className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4"
      style={{
        height: 52,
        background: 'var(--nav-bg)',
        borderBottom: '1px solid var(--nav-border)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <button
        className="flex items-center gap-2"
        onClick={() => setProfileOpen(true)}
        style={{ background: 'none', padding: '4px 0' }}
      >
        <div className="flex items-center" style={{ position: 'relative', width: user && partner ? 44 : 28 }}>
          {user && (
            <Avatar
              name={user.name}
              color={user.avatar_color}
              size={26}
              borderColor="var(--avatar-border)"
              borderWidth={1.5}
            />
          )}
          {partner && (
            <Avatar
              name={partner.name}
              color={partner.avatar_color}
              size={26}
              borderColor="var(--avatar-border)"
              borderWidth={1.5}
              style={{ position: 'absolute', left: 16 }}
            />
          )}
        </div>
        <span
          style={{
            fontFamily: '"Fraunces", Georgia, serif',
            fontSize: 22,
            fontWeight: 400,
            letterSpacing: '-0.01em',
            lineHeight: 1,
            color: 'var(--text-primary)',
          }}
        >
          <span style={{ fontStyle: 'italic', color: '#c8745a' }}>&</span>you
        </span>
      </button>

      {/* Wall name centered — Fraunces italic */}
      {wall?.name && (
        <div style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: 'var(--font-display)',
          fontSize: 17,
          fontWeight: 400,
          fontStyle: 'italic',
          color: 'var(--text-primary)',
          letterSpacing: '-0.01em',
          pointerEvents: 'none',
          maxWidth: '38%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {wall.name}
        </div>
      )}

      <div className="flex items-center gap-2">
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="w-8 h-8 flex items-center justify-center rounded-full transition-opacity hover:opacity-70"
            title="Settings"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="3" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
        <ThemeToggle />
      </div>
    </div>
    <ProfileSheet open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  )
}
