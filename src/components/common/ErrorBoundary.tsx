import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught application error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center space-y-4">
            <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
              !
            </div>
            <h2 className="text-xl font-bold font-poppins text-slate-900">Something went wrong</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              An unexpected error occurred. Click below to reload the library application.
            </p>
            {this.state.error?.message && (
              <div className="bg-slate-100 p-3 rounded-lg text-xs font-mono text-slate-700 text-left overflow-auto max-h-32">
                {this.state.error.message}
              </div>
            )}
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = '/';
              }}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all cursor-pointer shadow-md"
            >
              Reload Portal Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
