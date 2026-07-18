import { Component, type ErrorInfo, type ReactNode, type CSSProperties } from "react";

/**
 * Error boundary — catches errors thrown during rendering and displays
 * a fallback UI rather than letting the whole app crash.
 *
 * Wraps the entire app in main.jsx.
 *
 * Note: error boundaries only catch errors in React's render phase.
 * They do NOT catch errors in async code (fetch, setTimeout, event handlers) —
 * those need to be try/catch'd at the call site, which we already do.
 */

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log to console — in production you might send this to a monitoring service
    console.error("App crashed:", error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  override render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    const styles: Record<string, CSSProperties> = {
      page: {
        minHeight: "100vh",
        background: "#0f0f0f",
        color: "#f5f0e8",
        fontFamily: "Georgia, serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      },
      card: {
        maxWidth: "520px",
        background: "#141414",
        border: "1px solid #2a2a2a",
        borderRadius: "10px",
        padding: "2.5rem",
        textAlign: "center",
      },
      title: {
        fontSize: "1.5rem",
        color: "#e8d5b0",
        margin: "0 0 0.75rem",
      },
      msg: {
        color: "#888",
        fontSize: "0.9rem",
        lineHeight: 1.6,
        margin: "0 0 1.5rem",
      },
      detail: {
        background: "#0a0a0a",
        border: "1px solid #1e1e1e",
        borderRadius: "6px",
        padding: "0.75rem 1rem",
        color: "#666",
        fontSize: "0.75rem",
        fontFamily: "monospace",
        textAlign: "left",
        marginBottom: "1.5rem",
        wordBreak: "break-word",
      },
      btnRow: {
        display: "flex",
        gap: "0.6rem",
        justifyContent: "center",
        flexWrap: "wrap",
      },
    };

    const btnStyle = (primary: boolean): CSSProperties => ({
      padding: "0.65rem 1.4rem",
      background: primary ? "#e8d5b0" : "transparent",
      color: primary ? "#0f0f0f" : "#888",
      border: "1px solid",
      borderColor: primary ? "#e8d5b0" : "#2a2a2a",
      borderRadius: "6px",
      cursor: "pointer",
      fontFamily: "inherit",
      fontSize: "0.85rem",
    });

    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h1 style={styles.title}>🍳 Something went wrong</h1>
          <p style={styles.msg}>
            The app hit an unexpected error. Your saved data is safe — just try resetting or refreshing the page.
          </p>
          {this.state.error && <div style={styles.detail}>{this.state.error.toString()}</div>}
          <div style={styles.btnRow}>
            <button onClick={this.handleReset} style={btnStyle(true)}>
              Try Again
            </button>
            <button onClick={() => window.location.reload()} style={btnStyle(false)}>
              Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }
}
