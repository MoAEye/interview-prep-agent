import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from './App.jsx'
import './index.css'

const sentryDsn = import.meta.env.VITE_SENTRY_DSN
if (typeof sentryDsn === 'string' && sentryDsn.trim()) {
  Sentry.init({
    dsn: sentryDsn.trim(),
    environment: import.meta.env.MODE,
    sendDefaultPii: false,
  })
}

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { err: null }
  }

  static getDerivedStateFromError(err) {
    return { err }
  }

  componentDidCatch(error, errorInfo) {
    if (sentryDsn?.trim()) {
      Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo?.componentStack } } })
    }
  }

  render() {
    if (this.state.err) {
      const e = this.state.err
      return (
        <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', maxWidth: 720, margin: '0 auto' }}>
          <h1 style={{ fontSize: 20, marginBottom: 12 }}>App error</h1>
          <p style={{ color: '#6b7280', marginBottom: 16 }}>
            Open the browser DevTools console (⌥⌘J) for details. After fixing code, save the file and refresh.
          </p>
          <pre
            style={{
              background: '#fef2f2',
              color: '#991b1b',
              padding: 16,
              borderRadius: 8,
              overflow: 'auto',
              fontSize: 13,
              whiteSpace: 'pre-wrap',
            }}
          >
            {String(e?.message || e)}
            {e?.stack ? `\n\n${e.stack}` : ''}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}

const rootEl = document.getElementById('root')
if (!rootEl) {
  document.body.innerHTML = '<p style="font-family:sans-serif;padding:24px">Missing #root in index.html</p>'
} else {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <RootErrorBoundary>
        <App />
      </RootErrorBoundary>
    </React.StrictMode>,
  )
}
