import React, { Component } from 'react';
import '../stylesheets/ErrorBoundary.css';

/**
 * React Error Boundary component that catches JavaScript errors anywhere in its
 * child component tree, logs the error, and displays a recovery fallback UI
 * instead of the component tree that crashed.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    // Only log full error details in development; in production just log a generic marker
    if (!import.meta.env.PROD) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  resetErrorBoundary = () => {
    if (this.props.onReset) {
      this.props.onReset();
    }
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  handleReload = () => {
    if (typeof window !== 'undefined' && window.location) {
      window.location.reload();
    }
  };

  handleGoHome = () => {
    if (typeof window !== 'undefined' && window.location) {
      window.location.href = '/';
    }
  };

  toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render() {
    const { hasError, error, errorInfo, showDetails } = this.state;
    const { fallback, fallbackRender, children } = this.props;
    const isDev = !import.meta.env.PROD;

    if (hasError) {
      if (fallbackRender) {
        return fallbackRender({
          error,
          errorInfo,
          resetErrorBoundary: this.resetErrorBoundary,
        });
      }

      if (fallback) {
        return fallback;
      }

      return (
        <div className="error-boundary-container" role="alert">
          <div className="error-boundary-card">
            <div className="error-boundary-icon-wrapper">
              <svg
                className="error-boundary-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>

            <h2 className="error-boundary-title">Something went wrong</h2>
            <p className="error-boundary-message">
              An unexpected render error occurred in this view. You can try recovering the view or return to safety.
            </p>

            {isDev && error && (
              <div className="error-boundary-summary">
                <code>{error.message || error.toString()}</code>
              </div>
            )}

            <div className="error-boundary-actions">
              <button
                type="button"
                className="btn-error-action btn-primary-action"
                onClick={this.resetErrorBoundary}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  width="16"
                  height="16"
                >
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                Try Again
              </button>

              <button
                type="button"
                className="btn-error-action btn-secondary-action"
                onClick={this.handleReload}
              >
                Reload Page
              </button>

              <button
                type="button"
                className="btn-error-action btn-outline-action"
                onClick={this.handleGoHome}
              >
                Return to Home
              </button>
            </div>

            {isDev && (
              <div className="error-boundary-details-toggle">
                <button
                  type="button"
                  className="btn-details-toggle"
                  onClick={this.toggleDetails}
                  aria-expanded={showDetails}
                >
                  {showDetails ? 'Hide technical details ▲' : 'Show technical details ▼'}
                </button>

                {showDetails && (
                  <div className="error-boundary-details-content">
                    <p className="details-heading">Stack Trace:</p>
                    <pre className="details-stack">
                      {error?.stack || 'No stack trace available'}
                      {errorInfo?.componentStack && `\n\nComponent Stack:\n${errorInfo.componentStack}`}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
