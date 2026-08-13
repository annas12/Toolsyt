import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Music Trend Radar runtime error:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <main className="page-shell">
          <div className="empty-state">
            <div className="empty-icon">!</div>
            <h3>Terjadi error pada tampilan</h3>
            <p>{this.state.error.message}</p>
            <button className="btn primary" onClick={() => window.location.reload()}>
              Muat Ulang Website
            </button>
          </div>
        </main>
      )
    }

    return this.props.children
  }
}
