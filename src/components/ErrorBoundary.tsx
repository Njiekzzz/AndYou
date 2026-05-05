import { Component, ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', padding: 32,
          background: 'var(--bg)', color: 'var(--text-primary)', textAlign: 'center',
        }}>
          <div style={{ fontSize: 22, marginBottom: 8, fontWeight: 300, letterSpacing: '0.1em' }}>& you</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>something went wrong</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 24, maxWidth: 280, wordBreak: 'break-all' }}>
            {this.state.error.message}
          </div>
          <button
            onClick={() => { this.setState({ error: null }); window.location.reload() }}
            style={{ fontSize: 13, padding: '10px 20px', background: 'var(--text-primary)', color: 'var(--bg)', borderRadius: 6 }}
          >
            reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
