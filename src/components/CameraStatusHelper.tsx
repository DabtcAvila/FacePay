'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Camera, 
  AlertCircle, 
  WifiOff, 
  Shield, 
  Smartphone, 
  Eye, 
  Fingerprint,
  RefreshCw,
  CheckCircle,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CameraStatusHelperProps {
  status: 'checking' | 'requesting' | 'granted' | 'denied' | 'not-supported' | 'error';
  error?: string;
  deviceInfo?: {
    isIOS: boolean;
    isMobile: boolean;
    hasFaceID: boolean;
    hasTouchID: boolean;
    supportsBiometrics: boolean;
  };
  onRetry?: () => void;
  onSwitchToBiometric?: () => void;
  onCancel?: () => void;
  retryAttempts?: number;
  maxRetries?: number;
}

export default function CameraStatusHelper({
  status,
  error,
  deviceInfo,
  onRetry,
  onSwitchToBiometric,
  onCancel,
  retryAttempts = 0,
  maxRetries = 3
}: CameraStatusHelperProps) {
  
  const getStatusInfo = () => {
    switch (status) {
      case 'checking':
        return {
          icon: Camera,
          iconColor: 'text-blue-500',
          title: 'Checking Camera Availability',
          message: 'Detecting camera capabilities...',
          loading: true
        };
      
      case 'requesting':
        return {
          icon: Camera,
          iconColor: 'text-yellow-500',
          title: 'Camera Permission Required',
          message: deviceInfo?.isIOS 
            ? 'Please allow camera access when Safari asks for permission'
            : 'Please allow camera access to continue with Face ID',
          loading: true
        };
      
      case 'granted':
        return {
          icon: CheckCircle,
          iconColor: 'text-green-500',
          title: 'Camera Ready',
          message: 'Camera access granted successfully',
          loading: false
        };
      
      case 'denied':
        return {
          icon: X,
          iconColor: 'text-red-500',
          title: 'Camera Access Denied',
          message: 'Please enable camera permissions to use Face ID',
          loading: false,
          showInstructions: true
        };
      
      case 'not-supported':
        return {
          icon: AlertCircle,
          iconColor: 'text-orange-500',
          title: 'Camera Not Supported',
          message: 'Your browser or device doesn\'t support camera access',
          loading: false,
          showAlternatives: true
        };
      
      case 'error':
        return {
          icon: AlertCircle,
          iconColor: 'text-red-500',
          title: 'Camera Error',
          message: error || 'An unexpected error occurred with the camera',
          loading: false,
          canRetry: retryAttempts < maxRetries
        };
      
      default:
        return {
          icon: Camera,
          iconColor: 'text-gray-500',
          title: 'Unknown Status',
          message: 'Camera status unknown',
          loading: false
        };
    }
  };

  const statusInfo = getStatusInfo();

  const renderPermissionInstructions = () => (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
      <h4 className="font-semibold text-blue-800 mb-2">
        How to enable camera access:
      </h4>
      <ol className="text-blue-700 text-sm space-y-1 list-decimal list-inside">
        {deviceInfo?.isIOS ? (
          <>
            <li>Look for the camera permission popup in Safari</li>
            <li>Tap "Allow" to grant camera access</li>
            <li>If no popup appears, go to Safari Settings → Privacy & Security → Camera → Allow</li>
            <li>Refresh this page and try again</li>
          </>
        ) : (
          <>
            <li>Look for the camera icon in your browser's address bar</li>
            <li>Click on it and select "Allow" for camera access</li>
            <li>If blocked, click the lock/camera icon and change permissions</li>
            <li>Refresh the page and try again</li>
          </>
        )}
      </ol>
    </div>
  );

  const renderAlternatives = () => (
    <div className="space-y-4 mt-4">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-semibold text-yellow-800 mb-2">
          Try these alternatives instead:
        </h4>
        <div className="space-y-2">
          {deviceInfo?.supportsBiometrics && (
            <Button
              onClick={onSwitchToBiometric}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center"
            >
              {deviceInfo.hasFaceID ? (
                <><Eye className="w-4 h-4 mr-2" />Use Face ID</>
              ) : deviceInfo.hasTouchID ? (
                <><Fingerprint className="w-4 h-4 mr-2" />Use Touch ID</>
              ) : (
                <><Shield className="w-4 h-4 mr-2" />Use Device Biometrics</>
              )}
            </Button>
          )}
          <div className="text-sm text-gray-600">
            <p>• Use a different browser (Chrome, Firefox, Safari)</p>
            <p>• Try on a different device with camera support</p>
            <p>• Ensure you're on a secure (HTTPS) connection</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRetrySection = () => (
    <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
      {statusInfo.canRetry && onRetry && (
        <Button 
          onClick={onRetry} 
          variant="outline" 
          className="flex items-center"
          disabled={retryAttempts >= maxRetries}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
          {retryAttempts > 0 && (
            <span className="ml-2 text-xs bg-gray-200 px-2 py-1 rounded">
              {retryAttempts}/{maxRetries}
            </span>
          )}
        </Button>
      )}
      
      {deviceInfo?.supportsBiometrics && onSwitchToBiometric && (
        <Button 
          onClick={onSwitchToBiometric}
          className="flex items-center"
        >
          {deviceInfo.hasFaceID ? (
            <><Eye className="w-4 h-4 mr-2" />Try Face ID</>
          ) : deviceInfo.hasTouchID ? (
            <><Fingerprint className="w-4 h-4 mr-2" />Try Touch ID</>
          ) : (
            <><Shield className="w-4 h-4 mr-2" />Try Biometrics</>
          )}
        </Button>
      )}
    </div>
  );

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-6">
        {/* Status Header */}
        <div className="text-center mb-4">
          <motion.div
            className={`w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center`}
            animate={statusInfo.loading ? {
              scale: [1, 1.1, 1],
              rotate: statusInfo.icon === Camera ? [0, 0, 0] : [0, 360, 0]
            } : {}}
            transition={statusInfo.loading ? {
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            } : {}}
          >
            <statusInfo.icon className={`w-8 h-8 ${statusInfo.iconColor}`} />
          </motion.div>
          
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {statusInfo.title}
          </h3>
          
          <p className="text-gray-600">
            {statusInfo.message}
          </p>
          
          {statusInfo.loading && (
            <motion.div
              className="mt-3 h-1 bg-gray-200 rounded-full overflow-hidden"
              initial={{ width: 0 }}
            >
              <motion.div
                className="h-full bg-blue-500 rounded-full"
                animate={{ width: "100%" }}
                transition={{ duration: 3, repeat: Infinity }}
              />
            </motion.div>
          )}
        </div>

        {/* Device Info */}
        {deviceInfo && (
          <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
            <div className="flex items-center space-x-2 mb-2">
              <Smartphone className="w-4 h-4 text-gray-500" />
              <span className="font-medium text-gray-700">Device Information</span>
            </div>
            <div className="space-y-1 text-gray-600">
              <div>Platform: {deviceInfo.isIOS ? 'iOS' : deviceInfo.isMobile ? 'Mobile' : 'Desktop'}</div>
              {deviceInfo.hasFaceID && <div>✓ Face ID Available</div>}
              {deviceInfo.hasTouchID && <div>✓ Touch ID Available</div>}
              {deviceInfo.supportsBiometrics && <div>✓ Biometric Authentication Supported</div>}
            </div>
          </div>
        )}

        {/* Error Details */}
        {error && status === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-800 mb-1">Error Details</h4>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        {statusInfo.showInstructions && renderPermissionInstructions()}
        
        {/* Alternatives */}
        {statusInfo.showAlternatives && renderAlternatives()}
        
        {/* Actions */}
        {(statusInfo.canRetry || (deviceInfo?.supportsBiometrics && status !== 'granted')) && renderRetrySection()}
        
        {/* Network Status */}
        {typeof navigator !== 'undefined' && !navigator.onLine && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2 text-yellow-700">
              <WifiOff className="w-4 h-4" />
              <span className="text-sm">You're offline - Some features may not work properly</span>
            </div>
          </div>
        )}
        
        {/* Cancel Button */}
        {onCancel && (
          <div className="mt-6 pt-4 border-t border-gray-200 text-center">
            <Button
              onClick={onCancel}
              variant="ghost"
              className="text-gray-500 hover:text-gray-700"
            >
              Back to Demo Selection
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}