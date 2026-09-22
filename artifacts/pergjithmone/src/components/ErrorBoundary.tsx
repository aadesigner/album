import React from 'react';

interface Props { children: React.ReactNode; fallback?: React.ReactNode }
interface State { error: Error | null; resetKey: number }

/**
 * Catches render crashes. Transient errors (race conditions, chunk hiccups)
 * auto-recover by remounting children — no scary full-page message.
 * Only after repeated failures do we soft-reload once per session.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, resetKey: 0 };
  private recoverCount = 0;
  private recoverTimer: ReturnType<typeof setTimeout> | null = null;

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);

    // Custom fallback = caller owns recovery (e.g. 3D viewer). Don't remount
    // the whole subtree — that was wiping Editor state when 3D crashed.
    if (this.props.fallback) return;

    if (this.recoverTimer) return;

    this.recoverCount += 1;

    // Silent remount — usually enough for one-off render races.
    if (this.recoverCount <= 3) {
      this.recoverTimer = setTimeout(() => {
        this.recoverTimer = null;
        this.setState((s) => ({ error: null, resetKey: s.resetKey + 1 }));
      }, 40);
      return;
    }

    // Persistent crash: one silent reload per tab session, then give up quietly.
    try {
      if (!sessionStorage.getItem('eb_silent_reload')) {
        sessionStorage.setItem('eb_silent_reload', '1');
        window.location.reload();
        return;
      }
    } catch {
      // ignore storage errors
    }

    // Still broken after reload — clear error and keep trying to remount
    // rather than showing a blocking error screen.
    this.recoverTimer = setTimeout(() => {
      this.recoverTimer = null;
      this.recoverCount = 0;
      this.setState((s) => ({ error: null, resetKey: s.resetKey + 1 }));
    }, 250);
  }

  componentWillUnmount() {
    if (this.recoverTimer) clearTimeout(this.recoverTimer);
  }

  render() {
    if (this.state.error) {
      // Optional custom fallback only if explicitly provided; otherwise a
      // brief branded frame (not null) so a remount race never looks blank.
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100dvh',
            background: '#f7f5f2',
          }}
          aria-busy
        >
          <p
            className="font-serif"
            style={{
              fontSize: 28,
              fontStyle: 'italic',
              fontWeight: 300,
              color: '#1a1a1a',
              margin: 0,
            }}
          >
            Përgjithmonë
          </p>
        </div>
      );
    }
    return (
      <React.Fragment key={this.state.resetKey}>
        {this.props.children}
      </React.Fragment>
    );
  }
}
