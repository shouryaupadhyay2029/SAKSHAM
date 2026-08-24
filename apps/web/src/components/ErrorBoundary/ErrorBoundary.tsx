import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[SAKSHAM] ErrorBoundary caught an error in ${this.props.name || 'Component'}:`, error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          padding: '24px',
          background: 'rgba(18, 50, 36, 0.05)',
          border: '1px dashed rgba(244, 124, 32, 0.3)',
          borderRadius: '12px',
          color: '#FAF8F3',
          textAlign: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          margin: '20px auto',
          maxWidth: '500px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#F47C20', fontSize: '16px', fontWeight: 600 }}>
            {this.props.name || 'Component'} Temporarily Unavailable
          </h3>
          <p style={{ margin: 0, fontSize: '13px', opacity: 0.8, color: '#FAF8F3' }}>
            A rendering error occurred. SAKSHAM systems remain online.
          </p>
          <button 
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              marginTop: '12px',
              padding: '6px 12px',
              background: '#F47C20',
              border: 'none',
              borderRadius: '4px',
              color: '#FAF8F3',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
