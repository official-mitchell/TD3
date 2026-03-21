/**
 * Error boundary for D3/Leaflet render zones. Phase 18.2.1.
 * Catches rendering errors and shows fallback UI instead of unmounting the app.
 */
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { error as logError } from '../lib/logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logError('error.boundary', { error: error.message, componentStack: errorInfo.componentStack });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center w-full h-full min-h-[120px] bg-[#0A0E1A] border border-[#1A3A5C] rounded">
          <div className="text-center p-4">
            <p className="text-[#E8F4FD] font-mono text-sm font-semibold mb-2">
              SYSTEM ERROR — COMPONENT UNAVAILABLE
            </p>
            <p className="text-[#8BA3C7] text-xs font-mono">{this.state.errorMessage}</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
