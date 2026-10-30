import { Component, type ErrorInfo, type ReactNode } from 'react';
import { SYSTEM_CHANNELS } from '@shared/ipc/system';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * App-level error boundary: logs renderer errors through the
 * `system:report-error` channel and renders a minimal fallback
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, _info: ErrorInfo): void {
    void window.api.invoke(SYSTEM_CHANNELS.REPORT_ERROR, {
      message: error.message,
      stack: error.stack,
    });
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="app-bootstrap-loader">
          <h1 className="gradient-text" style={{ fontSize: '2.5rem', letterSpacing: '1px' }}>
            CodeNexus
          </h1>
          <p className="pill-error">{this.state.error.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}