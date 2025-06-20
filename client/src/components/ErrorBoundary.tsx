import React from 'react';

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  state: { hasError: boolean; error?: Error } = { hasError: false, error: undefined };
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, info: any) {
    console.error('ErrorBoundary caught:', error, info);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-100 text-red-800 rounded-lg m-4">
          <h2 className="text-lg font-semibold mb-2">Something went wrong.</h2>
          <pre className="whitespace-pre-wrap text-sm bg-red-50 p-2 rounded">
            {this.state.error?.message || 'Unknown error occurred'}
          </pre>
          <button
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            onClick={() => this.setState({ hasError: false })}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}