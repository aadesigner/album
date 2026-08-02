import React from 'react';

interface Props { children: React.ReactNode; fallback?: React.ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return this.props.fallback ?? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '100dvh', gap: 16, padding: 32,
          fontFamily: 'system-ui, sans-serif', background: '#fafaf9',
        }}>
          <p style={{ fontSize: 32 }}>⚠️</p>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>
            Diçka shkoi keq
          </h2>
          <p style={{ fontSize: 14, color: '#666', margin: 0, textAlign: 'center' }}>
            {this.state.error.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 8, padding: '10px 24px', borderRadius: 24, border: 'none',
              background: '#1a1a1a', color: '#fff', fontSize: 13, fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Rifresko faqen
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
