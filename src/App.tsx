import { AppProvider, useApp } from './context/AppContext'
import { OnboardingScreen } from './components/OnboardingScreen'
import { MainApp } from './components/MainApp'

function AppInner() {
  const { user, wall, isLoading } = useApp()

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center dot-grid" style={{ background: 'var(--bg)' }}>
        <div className="text-center">
          <div className="text-2xl font-light tracking-widest mb-2" style={{ color: 'var(--text-secondary)' }}>& you</div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>loading your wall…</div>
        </div>
      </div>
    )
  }

  if (!user || !wall) {
    return <OnboardingScreen />
  }

  return <MainApp />
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  )
}
