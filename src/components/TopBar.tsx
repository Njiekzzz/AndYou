import { useApp } from '../context/AppContext'
import { Avatar } from './Avatar'

interface TopBarProps {
  onOpenSettings?: () => void
}

export function TopBar({ onOpenSettings }: TopBarProps) {
  const { user, partner, toggleTheme, theme } = useApp()

  return (
    <div
      className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4"
      style={{
        height: 52,
        background: 'var(--nav-bg)',
        borderBottom: '1px solid var(--nav-border)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="flex items-center gap-2">
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
          className="text-base font-light tracking-widest"
          style={{ color: 'var(--text-primary)' }}
        >
          & you
        </span>
      </div>

      <div className="flex items-center gap-2">
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="w-8 h-8 flex items-center justify-center rounded-full transition-opacity hover:opacity-70"
            title="Settings"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="2" stroke="var(--text-secondary)" strokeWidth="1.5"/>
              <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        )}
        <button
          onClick={toggleTheme}
          className="w-8 h-8 flex items-center justify-center rounded-full transition-opacity hover:opacity-70"
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark' ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="4" stroke="var(--text-secondary)" strokeWidth="1.5"/>
              <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.22 3.22l1.06 1.06M11.72 11.72l1.06 1.06M3.22 12.78l1.06-1.06M11.72 4.28l1.06-1.06" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M13.5 9.5A6 6 0 0 1 6.5 2.5a6 6 0 1 0 7 7z" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
