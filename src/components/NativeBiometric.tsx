'use client';

// DEPRECATED: This component is deprecated. Use BiometricWithFallback with preferredMethod="biometric" instead.
// BiometricWithFallback provides the same native biometric functionality plus intelligent fallbacks.
// This component is kept for backward compatibility only.

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Eye, 
  Fingerprint, 
  Shield, 
  CheckCircle, 
  AlertTriangle, 
  Smartphone, 
  X, 
  RefreshCw,
  Zap,
  Activity,
  Timer,
  Brain
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WebAuthnService, type WebAuthnCapabilities, type WebAuthnError } from '@/services/webauthn';

interface NativeBiometricProps {
  onSuccess?: (result: any) => void;
  onCancel?: () => void;
  onError?: (error: string) => void;
  userId?: string;
  userName?: string;
  mode?: 'authentication' | 'registration' | 'demo';
  showFallbackOptions?: boolean;
}

export default function NativeBiometric({ 
  onSuccess, 
  onCancel, 
  onError,
  userId = `user-${Date.now()}`,
  userName = 'demo@facepay.com',
  mode = 'authentication',
  showFallbackOptions = true
}: NativeBiometricProps) {
  const [capabilities, setCapabilities] = useState<WebAuthnCapabilities | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');
  const [step, setStep] = useState<'checking' | 'ready' | 'processing' | 'success' | 'error' | 'unsupported'>('checking');
  const [biometricType, setBiometricType] = useState<string>('');
  const [deviceInfo, setDeviceInfo] = useState<any>(null);

  useEffect(() => {
    checkBiometricCapabilities();
  }, []);

  const checkBiometricCapabilities = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const caps = await WebAuthnService.checkBrowserCapabilities();
      setCapabilities(caps);
      setDeviceInfo(caps.deviceInfo);
      
      // Determine biometric type based on capabilities and device
      if (caps.biometricTypes.includes('face')) {
        setBiometricType('Face ID');
      } else if (caps.biometricTypes.includes('fingerprint')) {
        setBiometricType('Touch ID');
      } else if (caps.deviceInfo?.isMobile) {
        setBiometricType('Mobile Biometrics');
      } else {
        setBiometricType('Windows Hello / Biometrics');
      }
      
      if (!caps.isSupported) {
        setStep('unsupported');
        setError('WebAuthn is not supported in this browser');
      } else if (!caps.isPlatformAuthenticatorAvailable) {
        setStep('unsupported');
        setError('No biometric authenticator available on this device');
      } else {
        setStep('ready');
      }
    } catch (err) {
      console.error('Error checking biometric capabilities:', err);
      setError('Failed to check biometric capabilities');
      setStep('error');
    } finally {
      setIsLoading(false);
    }
  };

  const startBiometricAuthentication = async () => {
    if (!capabilities?.isSupported || !capabilities.isPlatformAuthenticatorAvailable) {
      setError('Biometric authentication is not available');
      setStep('error');
      return;
    }

    setIsProcessing(true);
    setError('');
    setStep('processing');

    try {
      if (mode === 'registration') {
        await handleRegistration();
      } else {
        await handleAuthentication();
      }
    } catch (err) {
      console.error('Biometric authentication error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      setError(errorMessage);
      setStep('error');
      onError?.(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRegistration = async () => {
    try {
      const result = await WebAuthnService.register({
        userId,
        userName,
        userDisplayName: userName
      });
      
      console.log('Registration successful:', result);
      setStep('success');
      onSuccess?.(result);
    } catch (err) {
      if (err instanceof Error && err.name === 'NotAllowedError') {
        throw new Error('Biometric authentication was cancelled');
      }
      throw err;
    }
  };

  const handleAuthentication = async () => {
    try {
      // For demo mode, we'll try to authenticate, but if no credential exists, we'll register
      try {
        const result = await WebAuthnService.authenticate();
        console.log('Authentication successful:', result);
        setStep('success');
        onSuccess?.(result);
      } catch (authError) {
        // If authentication fails (no credential), try registration
        console.log('No existing credential found, attempting registration...');
        await handleRegistration();
        return;
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'NotAllowedError') {
        throw new Error('Biometric authentication was cancelled');
      }
      throw err;
    }
  };

  const getBiometricIcon = () => {
    if (capabilities?.biometricTypes.includes('face')) {
      return Eye;
    } else if (capabilities?.biometricTypes.includes('fingerprint')) {
      return Fingerprint;
    } else if (capabilities?.deviceInfo?.isMobile) {
      return Smartphone;
    }
    return Shield;
  };

  const renderCheckingState = () => (
    <div className="text-center space-y-6">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="w-16 h-16 mx-auto"
      >
        <Brain className="w-16 h-16 text-blue-500" />
      </motion.div>
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Checking Device Capabilities
        </h3>
        <p className="text-gray-600">
          Detecting available biometric authentication methods...
        </p>
      </div>
    </div>
  );

  const renderReadyState = () => {
    const BiometricIcon = getBiometricIcon();
    
    return (
      <div className="text-center space-y-6">
        <motion.div
          className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <BiometricIcon className="w-12 h-12 text-white" />
        </motion.div>
        
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            {biometricType} Ready
          </h3>
          <p className="text-gray-600 mb-6">
            Use your device's {biometricType.toLowerCase()} to authenticate securely
          </p>
          
          {/* Device Info */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Platform:</span>
                <p className="text-blue-600">
                  {deviceInfo?.isMobile ? 'Mobile Device' : 'Desktop/Laptop'}
                </p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Available:</span>
                <p className="text-green-600">
                  {capabilities?.biometricTypes.join(', ') || 'Platform Auth'}
                </p>
              </div>
            </div>
          </div>
          
          <Button 
            onClick={startBiometricAuthentication} 
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-lg px-8 py-3"
          >
            <Shield className="w-5 h-5 mr-2" />
            Start {biometricType}
          </Button>
        </div>
      </div>
    );
  };

  const renderProcessingState = () => {
    const BiometricIcon = getBiometricIcon();
    
    return (
      <div className="text-center space-y-6">
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
            boxShadow: ['0 0 0 0 rgba(59, 130, 246, 0.7)', '0 0 0 10px rgba(59, 130, 246, 0)', '0 0 0 0 rgba(59, 130, 246, 0)']
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-32 h-32 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg"
        >
          <BiometricIcon className="w-16 h-16 text-white" />
        </motion.div>
        
        <div className="space-y-4">
          <h3 className="text-2xl font-bold text-gray-900">
            Authenticating with {biometricType}
          </h3>
          
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-center space-x-2 text-blue-700">
              <Activity className="w-5 h-5 animate-pulse" />
              <span className="font-medium">
                Please complete the {biometricType.toLowerCase()} prompt on your device
              </span>
            </div>
          </div>
          
          <p className="text-gray-600">
            {capabilities?.biometricTypes.includes('face') 
              ? 'Look at your device\'s camera when prompted'
              : capabilities?.biometricTypes.includes('fingerprint')
              ? 'Place your finger on the sensor when prompted'
              : 'Follow the biometric authentication prompt'}
          </p>
        </div>
      </div>
    );
  };

  const renderSuccessState = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center space-y-6"
    >
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 12 }}
      >
        <CheckCircle className="w-24 h-24 text-green-500 mx-auto" />
      </motion.div>
      
      <div>
        <h3 className="text-2xl font-bold text-green-800 mb-2">
          {biometricType} Authentication Successful!
        </h3>
        <p className="text-green-700">
          Your identity has been verified using your device's biometric authentication
        </p>
        
        <div className="bg-green-50 rounded-lg p-4 mt-4">
          <div className="flex items-center justify-center space-x-2 text-green-700 text-sm">
            <Shield className="w-4 h-4" />
            <span>Secured by {biometricType} • End-to-end encrypted</span>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const renderErrorState = () => (
    <div className="text-center space-y-6">
      <div className="flex items-center justify-center space-x-3 text-red-500">
        <AlertTriangle className="w-12 h-12" />
      </div>
      
      <div>
        <h3 className="text-xl font-semibold text-red-800 mb-2">
          Authentication Failed
        </h3>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-700">{error}</p>
        </div>
        
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Try again or use an alternative authentication method
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={startBiometricAuthentication} className="flex items-center">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            
            {showFallbackOptions && (
              <Button variant="outline" onClick={onCancel} className="flex items-center">
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderUnsupportedState = () => (
    <div className="text-center space-y-6">
      <div className="flex items-center justify-center space-x-3 text-yellow-500">
        <AlertTriangle className="w-12 h-12" />
      </div>
      
      <div>
        <h3 className="text-xl font-semibold text-yellow-800 mb-2">
          Biometric Authentication Not Available
        </h3>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <p className="text-yellow-700">{error}</p>
        </div>
        
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            This device doesn't support biometric authentication or it's not set up.
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 text-left">
            <h4 className="font-medium text-gray-900 mb-2">To use biometric authentication:</h4>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>Ensure Face ID, Touch ID, or Windows Hello is set up on your device</li>
              <li>Use a supported browser (Chrome, Safari, Edge, Firefox)</li>
              <li>Make sure you're on a secure (HTTPS) connection</li>
            </ul>
          </div>
          
          {showFallbackOptions && (
            <Button variant="outline" onClick={onCancel} className="flex items-center">
              <X className="w-4 h-4 mr-2" />
              Continue with Demo Mode
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-md mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-2">
          <Shield className="w-6 h-6 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Native Biometric Auth
          </h2>
        </div>
        
        {onCancel && (
          <Button onClick={onCancel} variant="ghost" size="sm">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
      
      <AnimatePresence mode="wait">
        {isLoading && renderCheckingState()}
        {step === 'ready' && renderReadyState()}
        {step === 'processing' && renderProcessingState()}
        {step === 'success' && renderSuccessState()}
        {step === 'error' && renderErrorState()}
        {step === 'unsupported' && renderUnsupportedState()}
      </AnimatePresence>
    </div>
  );
}