import { Component, type ReactNode, type ErrorInfo } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: 48, textAlign: 'center', fontFamily: "'Inter', sans-serif", color: '#1E293B',
        }}>
          <svg viewBox="0 0 24 24" style={{ width: 48, height: 48, stroke: '#DC2626', fill: 'none', strokeWidth: 1.5, marginBottom: 16 }}>
            <circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" />
          </svg>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 8px' }}>Something went wrong</h2>
          <p style={{ fontSize: 13.5, color: '#64748B', margin: '0 0 4px' }}>An unexpected error occurred. Please try refreshing the page.</p>
          {this.state.error && (
            <p style={{ fontSize: 12, color: '#94A3B8', margin: 0, fontFamily: "'JetBrains Mono', monospace" }}>
              {this.state.error.message}
            </p>
          )}
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: 20, padding: '10px 24px', borderRadius: 10, border: 'none',
              background: '#2563EB', color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Refresh page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
