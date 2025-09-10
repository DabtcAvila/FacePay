'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  AlertCircle, 
  Camera, 
  Shield, 
  RefreshCw,
  Eye,
  HelpCircle,
  Settings,
  Wifi
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export type CameraError = 
  | 'CAMERA_NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'CAMERA_IN_USE'
  | 'CAMERA_TIMEOUT'
  | 'STREAM_FAILED'
  | 'DEVICE_NOT_SUPPORTED'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

interface CameraErrorInfo {
  title: string;
  message: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  suggestions: string[];
  isRecoverable: boolean;
  showSettings?: boolean;
  priority: 'low' | 'medium' | 'high';
}

const ERROR_INFO: Record<CameraError, CameraErrorInfo> = {
  PERMISSION_DENIED: {
    title: 'Camera Permission Required',
    message: 'Camera access was blocked. Please allow camera permissions to continue.',
    icon: Shield,
    color: 'text-red-600',
    bgColor: 'bg-red-50 border-red-200',
    suggestions: [
      'Click the camera icon in your browser address bar',
      'Select "Allow" for camera permissions',
      'Refresh the page after changing permissions',
      'Try demo mode if permissions cannot be granted'
    ],
    isRecoverable: true,
    showSettings: true,
    priority: 'high'
  },
  CAMERA_NOT_FOUND: {
    title: 'No Camera Detected',
    message: 'No camera was found on this device.',
    icon: Camera,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 border-orange-200',
    suggestions: [
      'Connect a camera to your device',
      'Check that your camera is properly connected',
      'Try using a different browser',
      'Use demo mode for testing purposes'
    ],
    isRecoverable: false,
    priority: 'medium'
  },
  CAMERA_IN_USE: {
    title: 'Camera Already In Use',
    message: 'The camera is being used by another application.',
    icon: AlertCircle,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 border-amber-200',
    suggestions: [
      'Close other applications using the camera',
      'Close other browser tabs that might be using the camera',
      'Restart your browser',
      'Try demo mode instead'
    ],
    isRecoverable: true,
    priority: 'high'
  },
  CAMERA_TIMEOUT: {
    title: 'Camera Initialization Timeout',
    message: 'Camera took too long to initialize.',
    icon: RefreshCw,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50 border-yellow-200',
    suggestions: [
      'Try again with a slower connection',
      'Check your camera hardware',
      'Use a different browser',
      'Switch to demo mode'
    ],
    isRecoverable: true,
    priority: 'medium'
  },
  STREAM_FAILED: {
    title: 'Camera Stream Failed',
    message: 'Failed to establish camera stream.',
    icon: AlertCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50 border-red-200',
    suggestions: [
      'Check camera hardware connection',
      'Try refreshing the page',
      'Update your browser',
      'Use demo mode as fallback'
    ],
    isRecoverable: true,
    priority: 'high'
  },
  DEVICE_NOT_SUPPORTED: {
    title: 'Device Not Supported',
    message: 'This device does not support camera access.',
    icon: HelpCircle,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50 border-gray-200',
    suggestions: [
      'Try using a modern browser (Chrome, Firefox, Safari)',
      'Update your browser to the latest version',
      'Use a device with camera support',
      'Demo mode is available for testing'
    ],
    isRecoverable: false,
    priority: 'low'
  },
  NETWORK_ERROR: {
    title: 'Network Connection Issue',
    message: 'Network connectivity may be affecting camera access.',
    icon: Wifi,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200',
    suggestions: [
      'Check your internet connection',
      'Try again when connection is stable',
      'Demo mode works offline',
      'Contact support if problem persists'
    ],
    isRecoverable: true,
    priority: 'medium'
  },
  UNKNOWN_ERROR: {
    title: 'Unexpected Error',
    message: 'An unexpected error occurred while accessing the camera.',
    icon: AlertCircle,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50 border-gray-200',
    suggestions: [
      'Try refreshing the page',
      'Check browser console for details',
      'Try demo mode instead',
      'Contact support if problem continues'
    ],
    isRecoverable: true,
    priority: 'medium'
  }
};

interface CameraErrorHelperProps {
  error: CameraError;
  className?: string;
  onRetry?: () => void;
  onSwitchToDemo?: () => void;
  onOpenSettings?: () => void;
  showActions?: boolean;
}

export default function CameraErrorHelper({
  error,
  className = '',
  onRetry,
  onSwitchToDemo,
  onOpenSettings,
  showActions = true
}: CameraErrorHelperProps) {
  const errorInfo = ERROR_INFO[error];
  const Icon = errorInfo.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg border p-4 ${errorInfo.bgColor} ${className}`}
    >
      <div className="flex items-start space-x-3">
        <div className={`flex-shrink-0 ${errorInfo.color}`}>
          <Icon className="h-6 w-6" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-semibold ${errorInfo.color}`}>
            {errorInfo.title}
          </h3>
          <p className={`mt-1 text-sm ${errorInfo.color.replace('600', '700')}`}>
            {errorInfo.message}
          </p>
          
          {/* Suggestions */}
          <div className="mt-3">
            <p className={`text-xs font-medium ${errorInfo.color} mb-2`}>
              Suggestions:
            </p>
            <ul className={`text-xs ${errorInfo.color.replace('600', '600')} space-y-1`}>
              {errorInfo.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-2 text-gray-400">•</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Action buttons */}
          {showActions && (
            <div className="mt-4 flex flex-wrap gap-2">
              {errorInfo.isRecoverable && onRetry && (
                <Button
                  onClick={onRetry}
                  size="sm"
                  variant="outline"
                  className="text-xs"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Try Again
                </Button>
              )}
              
              {onSwitchToDemo && (
                <Button
                  onClick={onSwitchToDemo}
                  size="sm"
                  variant="outline"
                  className="text-xs"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  Demo Mode
                </Button>
              )}
              
              {errorInfo.showSettings && onOpenSettings && (
                <Button
                  onClick={onOpenSettings}
                  size="sm"
                  variant="outline"
                  className="text-xs"
                >
                  <Settings className="w-3 h-3 mr-1" />
                  Settings
                </Button>
              )}
            </div>
          )}
          
          {/* Priority indicator */}
          <div className="mt-2 flex items-center">
            <div className={`w-2 h-2 rounded-full mr-2 ${
              errorInfo.priority === 'high' ? 'bg-red-500' :
              errorInfo.priority === 'medium' ? 'bg-yellow-500' :
              'bg-green-500'
            }`} />
            <span className="text-xs text-gray-500 capitalize">
              {errorInfo.priority} priority
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Helper function to determine error type from native errors
export function classifyError(error: Error | DOMException): CameraError {
  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();

  if (name === 'notallowederror' || message.includes('permission') || message.includes('denied')) {
    return 'PERMISSION_DENIED';
  }
  
  if (name === 'notfounderror' || message.includes('no camera') || message.includes('not found')) {
    return 'CAMERA_NOT_FOUND';
  }
  
  if (name === 'notreadableerror' || message.includes('in use') || message.includes('already')) {
    return 'CAMERA_IN_USE';
  }
  
  if (message.includes('timeout') || message.includes('timed out')) {
    return 'CAMERA_TIMEOUT';
  }
  
  if (message.includes('stream') || message.includes('track')) {
    return 'STREAM_FAILED';
  }
  
  if (message.includes('network') || message.includes('connection')) {
    return 'NETWORK_ERROR';
  }
  
  if (message.includes('not supported') || name === 'notsupportederror') {
    return 'DEVICE_NOT_SUPPORTED';
  }
  
  return 'UNKNOWN_ERROR';
}