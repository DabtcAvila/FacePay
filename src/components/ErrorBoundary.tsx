'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, Home, Bug, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  showDetails: boolean;
  isReporting: boolean;
  reportSent: boolean;
  copied: boolean;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showDetails?: boolean;
  enableReporting?: boolean;
  enableDebugMode?: boolean;
}

interface ErrorFallbackProps {
  error?: Error;
  errorInfo?: React.ErrorInfo;
  resetError: () => void;
  showDetails: boolean;
  toggleDetails: () => void;
  copyError: () => void;
  copied: boolean;
  isReporting: boolean;
  reportSent: boolean;
  enableReporting: boolean;
  enableDebugMode: boolean;
}

const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({ 
  error, 
  errorInfo,
  resetError, 
  showDetails, 
  toggleDetails, 
  copyError, 
  copied,
  isReporting,
  reportSent,
  enableReporting,
  enableDebugMode
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl border border-red-200 overflow-hidden max-w-2xl w-full"
      >
        {/* Header */}
        <div className="bg-red-500 text-white px-8 py-6">
          <div className="flex items-center space-x-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="bg-white/20 p-3 rounded-full"
            >
              <AlertTriangle className="w-8 h-8" />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold">Oops! Something went wrong</h1>
              <p className="text-red-100 mt-1">
                An unexpected error occurred while processing your request
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-6">
          <div className="space-y-6">
            {/* Error message */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-red-900 mb-2">Error Details</h3>
              <p className="text-red-700 text-sm font-mono">
                {error?.message || 'Unknown error occurred'}
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <Button 
                onClick={resetError}
                className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>

              <Button 
                onClick={() => window.location.href = '/'}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                Go Home
              </Button>

              <Button 
                onClick={toggleDetails}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Bug className="w-4 h-4" />
                {showDetails ? 'Hide' : 'Show'} Details
              </Button>
            </div>

            {/* Error reporting status */}
            {enableReporting && (
              <div className="text-sm text-gray-600">
                {isReporting && (
                  <p className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    Reporting error...
                  </p>
                )}
                {reportSent && (
                  <p className="flex items-center gap-2 text-green-600">
                    <Check className="w-4 h-4" />
                    Error reported successfully. Our team has been notified.
                  </p>
                )}
              </div>
            )}

            {/* Detailed error info */}
            {showDetails && (
              <div className="border-t pt-6">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold text-gray-900">Technical Details</h4>
                  <Button
                    onClick={copyError}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                    disabled={copied}
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy Details
                      </>
                    )}
                  </Button>
                </div>
                
                <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs overflow-auto max-h-96">
                  <div className="space-y-4">
                    <div>
                      <div className="text-yellow-400 font-bold">Error Message:</div>
                      <div className="mt-1 pl-4 border-l-2 border-red-400">
                        {error?.message}
                      </div>
                    </div>
                    
                    {error?.stack && (
                      <div>
                        <div className="text-yellow-400 font-bold">Stack Trace:</div>
                        <div className="mt-1 pl-4 border-l-2 border-blue-400 whitespace-pre-wrap">
                          {error.stack}
                        </div>
                      </div>
                    )}
                    
                    {errorInfo?.componentStack && (
                      <div>
                        <div className="text-yellow-400 font-bold">Component Stack:</div>
                        <div className="mt-1 pl-4 border-l-2 border-purple-400 whitespace-pre-wrap">
                          {errorInfo.componentStack}
                        </div>
                      </div>
                    )}

                    {enableDebugMode && (
                      <div>
                        <div className="text-yellow-400 font-bold">Environment:</div>
                        <div className="mt-1 pl-4 border-l-2 border-green-400">
                          <div>Timestamp: {new Date().toISOString()}</div>
                          <div>URL: {window.location.href}</div>
                          <div>User Agent: {navigator.userAgent}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Help text */}
            <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4">
              <h5 className="font-medium text-gray-700 mb-2">What can you do?</h5>
              <ul className="space-y-1 list-disc list-inside">
                <li>Try refreshing the page or clicking "Try Again"</li>
                <li>Check your internet connection</li>
                <li>Clear your browser cache and cookies</li>
                <li>If the problem persists, contact support with the error details above</li>
              </ul>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { 
      hasError: false,
      showDetails: false,
      isReporting: false,
      reportSent: false,
      copied: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report error to monitoring service (if enabled)
    if (this.props.enableReporting) {
      this.reportError(error, errorInfo);
    }
  }

  reportError = async (error: Error, errorInfo: React.ErrorInfo) => {
    if (this.state.isReporting || this.state.reportSent) return;

    this.setState({ isReporting: true });

    try {
      // Prepare error report
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        userId: localStorage.getItem('userId') || 'anonymous',
      };

      // Send to error reporting service
      await fetch('/api/errors/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorReport),
      });

      this.setState({ reportSent: true });
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    } finally {
      this.setState({ isReporting: false });
    }
  };

  resetError = () => {
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined,
      showDetails: false,
      reportSent: false,
      copied: false
    });
  };

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  copyError = async () => {
    const { error, errorInfo } = this.state;
    if (!error) return;

    const errorText = `
Error: ${error.message}

Stack Trace:
${error.stack}

Component Stack:
${errorInfo?.componentStack}

Timestamp: ${new Date().toISOString()}
URL: ${window.location.href}
User Agent: ${navigator.userAgent}
    `.trim();

    try {
      await navigator.clipboard.writeText(errorText);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch (err) {
      console.error('Failed to copy error details:', err);
    }
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return (
        <FallbackComponent 
          error={this.state.error} 
          errorInfo={this.state.errorInfo}
          resetError={this.resetError}
          showDetails={this.state.showDetails}
          toggleDetails={this.toggleDetails}
          copyError={this.copyError}
          copied={this.state.copied}
          isReporting={this.state.isReporting}
          reportSent={this.state.reportSent}
          enableReporting={this.props.enableReporting || false}
          enableDebugMode={this.props.enableDebugMode || process.env.NODE_ENV === 'development'}
        />
      );
    }

    return this.props.children;
  }
}

// Hook for functional components to handle errors
export function useErrorHandler() {
  return (error: Error, errorInfo?: { componentStack: string }) => {
    console.error('Error caught by useErrorHandler:', error, errorInfo);
    
    // In a real app, you might want to:
    // - Log to an error monitoring service
    // - Show a toast notification
    // - Track analytics event
    
    // For now, we'll just throw to trigger the ErrorBoundary
    throw error;
  };
}

// Specific error types for better handling
export class PaymentError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'PaymentError';
  }
}

export class BiometricError extends Error {
  constructor(
    message: string,
    public code?: string,
    public retry: boolean = true
  ) {
    super(message);
    this.name = 'BiometricError';
  }
}

export class NetworkError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}