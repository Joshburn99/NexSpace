import React from "react";

type State = { hasError: boolean; error?: Error };

export class AppErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false };
  
  static getDerivedStateFromError(error: Error) { 
    return { hasError: true, error }; 
  }
  
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("App crashed:", error, info);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, fontFamily: "ui-sans-serif" }}>
          <h2>Something went wrong.</h2>
          <p>UI kept running — details are in the console.</p>
          <pre style={{ whiteSpace: "pre-wrap", background:"#f6f6f6", padding:12, borderRadius:8 }}>
            {String(this.state.error)}
          </pre>
          <button onClick={() => this.setState({ hasError: false, error: undefined })}>
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}