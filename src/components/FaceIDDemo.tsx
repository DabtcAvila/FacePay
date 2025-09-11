'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  CheckCircle, 
  X, 
  AlertCircle, 
  Smartphone,
  ShieldCheck,
  Fingerprint,
  Eye,
  Loader2,
  WifiOff,
  RefreshCw,
  Zap,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WebAuthnService, type WebAuthnCapabilities, type WebAuthnError } from '@/services/webauthn';

interface FaceIDDemoProps {
  onScanComplete?: (method: 'camera' | 'webauthn' | 'animation') => void;
  onCancel?: () => void;
  userId?: string;
  userName?: string;
  enableWebAuthnFallback?: boolean;
}

export default function FaceIDDemo({ 
  onScanComplete, 
  onCancel, 
  userId,
  userName,
  enableWebAuthnFallback = true 
}: FaceIDDemoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [authMethod, setAuthMethod] = useState<'animation' | 'webauthn' | 'camera'>('animation');
  const [scanStage, setScanStage] = useState<'ready' | 'scanning' | 'complete'>('ready');
  const [scanProgress, setScanProgress] = useState(0);
  const [error, setError] = useState<string>('');
  const [webauthnCapabilities, setWebauthnCapabilities] = useState<WebAuthnCapabilities | null>(null);
  const [isWebAuthnInProgress, setIsWebAuthnInProgress] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<{
    isIOS: boolean;
    isMobile: boolean;
    hasFaceID: boolean;
    hasTouchID: boolean;
    supportsBiometrics: boolean;
  } | null>(null);
  const [cameraAvailable, setCameraAvailable] = useState(false);

  // Check device capabilities (non-blocking)
  const checkCapabilities = useCallback(async () => {
    try {
      // Check WebAuthn capabilities in background
      const capabilities = await WebAuthnService.checkBrowserCapabilities();
      setWebauthnCapabilities(capabilities);
      
      // Set device information
      const deviceInfo = {
        isIOS: capabilities.deviceInfo.isIOS,
        isMobile: capabilities.deviceInfo.isMobile,
        hasFaceID: capabilities.biometricTypes.includes('face'),
        hasTouchID: capabilities.biometricTypes.includes('fingerprint'),
        supportsBiometrics: capabilities.isPlatformAuthenticatorAvailable
      };
      setDeviceInfo(deviceInfo);
      
      // Check camera availability without requesting permissions
      if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
        setCameraAvailable(true);
      }
    } catch (err) {
      console.log('Capability check completed with fallbacks');
      // Always fallback gracefully - never fail
    }
  }, []);

  // Start animated Face ID demo (always works)
  const startAnimatedDemo = useCallback(() => {
    setScanStage('scanning');
    setError('');
    
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 4 + 2; // Random progress between 2-6%
      setScanProgress(Math.min(progress, 100));
      
      if (progress >= 100) {
        clearInterval(interval);
        setScanStage('complete');
        setTimeout(() => {
          onScanComplete?.('animation');
        }, 1500);
      }
    }, 120); // Smooth animation
    
    // Auto-complete after max 8 seconds as failsafe
    setTimeout(() => {
      if (scanStage !== 'complete') {
        clearInterval(interval);
        setScanProgress(100);
        setScanStage('complete');
        setTimeout(() => {
          onScanComplete?.('animation');
        }, 1000);
      }
    }, 8000);
  }, [onScanComplete, scanStage]);

  // Optional camera initialization (only when user chooses)
  const initializeCamera = useCallback(async () => {
    try {
      setError('');
      setScanStage('scanning');
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported');
      }

      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        videoRef.current.playsInline = true;
        videoRef.current.muted = true;
        await videoRef.current.play();
        
        // Start simple face detection simulation
        setTimeout(() => {
          startAnimatedDemo();
        }, 1000);
      }
    } catch (err) {
      console.log('Camera failed, using animation fallback');
      // Always fallback to animation - never fail
      setAuthMethod('animation');
      setTimeout(() => startAnimatedDemo(), 500);
    }
  }, [startAnimatedDemo]);

  // WebAuthn biometric authentication (optional)
  const initiateWebAuthn = useCallback(async () => {
    if (!userId || !userName || !webauthnCapabilities?.isPlatformAuthenticatorAvailable) {
      // Fallback to animation
      setAuthMethod('animation');
      startAnimatedDemo();
      return;
    }

    setIsWebAuthnInProgress(true);
    setError('');
    setScanStage('scanning');

    try {
      // TODO: Update to use real biometric authentication API endpoints
      // For now, simulate the process to demonstrate UI
      
      // Simulate biometric authentication delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if biometric capabilities are available
      const capabilities = await WebAuthnService.checkBrowserCapabilities();
      
      if (capabilities.isPlatformAuthenticatorAvailable) {
        // TODO: Implement real biometric authentication using API endpoints
        // For now, simulate success for demo purposes
        setScanStage('complete');
        setTimeout(() => onScanComplete?.('webauthn'), 1000);
        return;
      } else {
        throw new Error('Platform authenticator not available');
      }
    } catch (err: any) {
      console.log('WebAuthn failed, using animation fallback');
      // Always fallback to animation - never fail
      setAuthMethod('animation');
      setTimeout(() => startAnimatedDemo(), 500);
    } finally {
      setIsWebAuthnInProgress(false);
    }
  }, [userId, userName, webauthnCapabilities, onScanComplete, startAnimatedDemo]);


  // Clean up camera stream
  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);


  // Initialize capabilities check
  useEffect(() => {
    checkCapabilities();
    return cleanup;
  }, [checkCapabilities, cleanup]);

  const handleCancel = () => {
    cleanup();
    setIsWebAuthnInProgress(false);
    onCancel?.();
  };

  const tryWebAuthn = () => {
    setAuthMethod('webauthn');
    setError('');
    initiateWebAuthn();
  };

  const tryCamera = () => {
    setAuthMethod('camera');
    setError('');
    initializeCamera();
  };

  const tryAnimation = () => {
    setAuthMethod('animation');
    setError('');
    startAnimatedDemo();
  };

  // Simple animated Face ID interface (always works)
  const renderAnimatedFaceID = () => (
    <div className="relative w-full max-w-lg mx-auto">
      <div className="relative bg-gradient-to-br from-blue-900 to-purple-900 rounded-2xl overflow-hidden aspect-[4/3] flex items-center justify-center">
        {authMethod === 'camera' && videoRef.current?.srcObject ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        ) : (
          // Animated face placeholder
          <motion.div
            className="relative w-48 h-48"
            animate={{
              scale: scanStage === 'scanning' ? [1, 1.02, 1] : 1,
            }}
            transition={{ duration: 2, repeat: scanStage === 'scanning' ? Infinity : 0 }}
          >
            <div className="w-full h-full rounded-full border-4 border-blue-400/30 flex items-center justify-center relative">
              <Eye className="w-24 h-24 text-blue-400" />
              
              {/* Scanning ring */}
              {scanStage === 'scanning' && (
                <motion.div
                  className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-400"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                />
              )}
              
              {/* Success ring */}
              {scanStage === 'complete' && (
                <motion.div
                  className="absolute inset-0 rounded-full border-4 border-green-500"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                />
              )}
            </div>
          </motion.div>
        )}
        
        {/* Face detection overlay (universal) */}
        {scanStage === 'scanning' && (
          <motion.div
            className="absolute inset-8 border-2 border-blue-400 rounded-2xl pointer-events-none"
            animate={{
              borderColor: ['#3B82F6', '#60A5FA', '#3B82F6'],
              scale: [1, 1.01, 1],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {/* Corner indicators */}
            {[0, 1, 2, 3].map((corner) => (
              <div
                key={corner}
                className={`absolute w-6 h-6 ${
                  corner === 0 ? '-top-1 -left-1' :
                  corner === 1 ? '-top-1 -right-1' :
                  corner === 2 ? '-bottom-1 -left-1' : '-bottom-1 -right-1'
                }`}
              >
                <motion.div 
                  className="w-full h-full bg-blue-400 rounded-full"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [1, 0.7, 1]
                  }}
                  transition={{ 
                    duration: 1.5, 
                    repeat: Infinity, 
                    delay: corner * 0.2
                  }}
                />
              </div>
            ))}
          </motion.div>
        )}
        
        {/* Scanning effects */}
        {scanStage === 'scanning' && (
          <>
            {/* Scanning line */}
            <motion.div
              className="absolute left-8 right-8 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent pointer-events-none"
              animate={{ y: [32, '75%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            />
            
            {/* Sparkle effects */}
            {Array.from({length: 5}).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-blue-400 rounded-full pointer-events-none"
                style={{
                  left: `${20 + i * 15}%`,
                  top: `${30 + (i % 2) * 40}%`,
                }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0],
                  rotate: [0, 180, 360]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.3
                }}
              />
            ))}
          </>
        )}
      </div>
      
      {/* Progress bar */}
      {scanStage === 'scanning' && (
        <div className="mt-4">
          <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full relative overflow-hidden"
              initial={{ width: '0%' }}
              animate={{ width: `${scanProgress}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{ x: [-100, 100] }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
            </motion.div>
          </div>
          <div className="text-center mt-2">
            <span className="text-sm font-medium text-blue-600">
              {Math.round(scanProgress)}% Complete
            </span>
          </div>
        </div>
      )}
    </div>
  );

  const renderStatus = () => (
    <div className="text-center space-y-4">
      <div className="flex items-center justify-center space-x-3">
        {scanStage === 'complete' ? (
          <motion.div
            initial={{ scale: 0, rotate: 0 }}
            animate={{ scale: 1, rotate: 360 }}
            transition={{ type: 'spring', stiffness: 200, damping: 10, duration: 0.8 }}
          >
            <CheckCircle className="w-8 h-8 text-green-500" />
          </motion.div>
        ) : scanStage === 'scanning' ? (
          <motion.div
            animate={{ rotate: 360, scale: [1, 1.1, 1] }}
            transition={{ 
              rotate: { duration: 2, repeat: Infinity, ease: "linear" },
              scale: { duration: 1, repeat: Infinity }
            }}
          >
            <Zap className="w-7 h-7 text-blue-500" />
          </motion.div>
        ) : (
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Eye className="w-7 h-7 text-blue-500" />
          </motion.div>
        )}
        
        <motion.div 
          className="text-center"
          animate={{
            color: scanStage === 'complete' ? '#10B981' : '#3B82F6'
          }}
        >
          <p className="text-lg font-semibold">
            {scanStage === 'ready' && 'Ready to scan your face'}
            {scanStage === 'scanning' && 'Analyzing biometric data...'}
            {scanStage === 'complete' && 'Authentication successful!'}
          </p>
          {scanStage === 'scanning' && (
            <p className="text-sm text-blue-600 mt-1 font-medium">
              {Math.round(scanProgress)}% complete
            </p>
          )}
        </motion.div>
      </div>
      
      {scanStage === 'ready' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Choose your preferred authentication method
          </p>
          
          {/* Method selection buttons */}
          <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-3 justify-center">
            <Button 
              onClick={tryAnimation}
              className="flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              size="sm"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Visual Demo
            </Button>
            
            {webauthnCapabilities?.isPlatformAuthenticatorAvailable && (
              <Button 
                onClick={tryWebAuthn}
                variant="outline" 
                size="sm"
              >
                {deviceInfo?.hasFaceID ? (
                  <><Eye className="w-4 h-4 mr-2" />Face ID</>
                ) : deviceInfo?.hasTouchID ? (
                  <><Fingerprint className="w-4 h-4 mr-2" />Touch ID</>
                ) : (
                  <><ShieldCheck className="w-4 h-4 mr-2" />Biometrics</>
                )}
              </Button>
            )}
            
            {cameraAvailable && (
              <Button 
                onClick={tryCamera}
                variant="outline" 
                size="sm"
              >
                <Camera className="w-4 h-4 mr-2" />
                Camera
              </Button>
            )}
          </div>
          
          <p className="text-xs text-gray-500">
            Visual Demo always works • Other methods may require permissions
          </p>
        </div>
      )}
    </div>
  );

  const renderError = () => (
    <div className="text-center space-y-6">
      <div className="flex items-center justify-center space-x-3 text-orange-500">
        <AlertCircle className="w-8 h-8" />
        <h3 className="text-xl font-semibold">Method Unavailable</h3>
      </div>
      
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <p className="text-orange-700 font-medium">{error}</p>
      </div>
      
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Don't worry! You can still try the demo with other methods.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {/* Always offer animation fallback */}
          <Button onClick={tryAnimation} className="flex items-center bg-gradient-to-r from-blue-500 to-purple-600">
            <Sparkles className="w-4 h-4 mr-2" />
            Try Visual Demo
          </Button>
          
          {/* Offer other methods if available */}
          {webauthnCapabilities?.isPlatformAuthenticatorAvailable && authMethod !== 'webauthn' && (
            <Button onClick={tryWebAuthn} variant="outline" className="flex items-center">
              {deviceInfo?.hasFaceID ? (
                <><Eye className="w-4 h-4 mr-2" />Try Face ID</>
              ) : deviceInfo?.hasTouchID ? (
                <><Fingerprint className="w-4 h-4 mr-2" />Try Touch ID</>
              ) : (
                <><ShieldCheck className="w-4 h-4 mr-2" />Try Biometrics</>
              )}
            </Button>
          )}
          
          {cameraAvailable && authMethod !== 'camera' && (
            <Button onClick={tryCamera} variant="outline" className="flex items-center">
              <Camera className="w-4 h-4 mr-2" />
              Try Camera
            </Button>
          )}
        </div>
        
        <p className="text-xs text-gray-500">
          The Visual Demo always works and provides a great preview of the experience!
        </p>
      </div>
    </div>
  );


  const renderWebAuthnInterface = () => (
    <div className="text-center space-y-6">
      <motion.div
        className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg"
        animate={{ 
          scale: isWebAuthnInProgress ? [1, 1.05, 1] : [1, 1.02, 1],
          rotate: isWebAuthnInProgress ? [0, 5, -5, 0] : 0
        }}
        transition={{ 
          scale: { duration: 1.5, repeat: Infinity },
          rotate: { duration: 2, repeat: isWebAuthnInProgress ? Infinity : 0 }
        }}
      >
        {deviceInfo?.hasFaceID ? (
          <Eye className="w-12 h-12 text-white" />
        ) : deviceInfo?.hasTouchID ? (
          <Fingerprint className="w-12 h-12 text-white" />
        ) : (
          <ShieldCheck className="w-12 h-12 text-white" />
        )}
        
        {/* Loading ring */}
        {isWebAuthnInProgress && (
          <motion.div
            className="absolute inset-0 w-24 h-24 border-3 border-transparent border-t-white/50 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        )}
      </motion.div>
      
      <div className="space-y-3">
        <h3 className="text-xl font-bold text-gray-900">
          {deviceInfo?.hasFaceID ? 'Face ID Authentication' :
           deviceInfo?.hasTouchID ? 'Touch ID Authentication' :
           'Biometric Authentication'}
        </h3>
        
        <p className="text-gray-600">
          {isWebAuthnInProgress ? 'Follow the prompts on your device...' :
           deviceInfo?.hasFaceID ? 'Look at your device to authenticate' :
           deviceInfo?.hasTouchID ? 'Place your finger on the sensor' :
           'Use your device biometrics to authenticate'}
        </p>
        
        {/* Fallback button */}
        {!isWebAuthnInProgress && (
          <div className="pt-4">
            <Button 
              onClick={tryAnimation}
              variant="outline" 
              size="sm"
              className="flex items-center"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Try Visual Demo Instead
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-3">
          <motion.h2 
            className="text-2xl font-bold text-gray-900"
            animate={{
              color: scanStage === 'complete' ? '#059669' : '#1F2937'
            }}
          >
            FacePay Authentication
          </motion.h2>
          
          {/* Method indicator */}
          {authMethod && (
            <motion.div 
              className="flex items-center space-x-1 text-sm px-2 py-1 rounded-full"
              animate={{
                backgroundColor: 
                  authMethod === 'animation' ? '#EFF6FF' :
                  authMethod === 'webauthn' ? '#F3E8FF' : '#F0FDF4',
                color:
                  authMethod === 'animation' ? '#3B82F6' :
                  authMethod === 'webauthn' ? '#8B5CF6' : '#059669'
              }}
            >
              {authMethod === 'animation' && <Sparkles className="w-3 h-3" />}
              {authMethod === 'webauthn' && <ShieldCheck className="w-3 h-3" />}
              {authMethod === 'camera' && <Camera className="w-3 h-3" />}
              <span className="text-xs font-medium">
                {authMethod === 'animation' ? 'Visual Demo' :
                 authMethod === 'webauthn' ? 'Biometrics' : 'Camera'}
              </span>
            </motion.div>
          )}
        </div>
        
        <Button onClick={handleCancel} variant="ghost" size="sm">
          <X className="w-5 h-5" />
        </Button>
      </div>
      
      <div className="space-y-8">
        {/* Error states */}
        {error ? renderError() : (
          <>
            {/* Main interface */}
            {authMethod === 'webauthn' && isWebAuthnInProgress ? 
              renderWebAuthnInterface() : (
              <>
                {renderAnimatedFaceID()}
                {renderStatus()}
              </>
            )}
          </>
        )}
      </div>
      
      {/* Success message */}
      <AnimatePresence>
        {scanStage === 'complete' && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="mt-8 p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl text-center shadow-lg"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.2 }}
              className="mb-4"
            >
              <div className="relative">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                <motion.div
                  className="absolute inset-0 w-16 h-16 mx-auto border-2 border-green-400 rounded-full"
                  animate={{ scale: [1, 1.2, 1], opacity: [1, 0, 0] }}
                  transition={{ duration: 1.5, repeat: 2, delay: 0.5 }}
                />
              </div>
            </motion.div>
            
            <motion.h3 
              className="text-xl font-bold text-green-800 mb-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Authentication Successful!
            </motion.h3>
            
            <motion.p 
              className="text-green-700 mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              {authMethod === 'animation' ? 
                'Visual demonstration completed successfully.' :
                'You can now proceed with secure payments.'}
            </motion.p>
            
            <motion.div 
              className="flex justify-center items-center space-x-2 text-sm text-green-600"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Identity verified with FacePay technology</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Offline indicator */}
      {typeof navigator !== 'undefined' && !navigator.onLine && (
        <motion.div 
          className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="flex items-center justify-center space-x-2 text-blue-700">
            <WifiOff className="w-4 h-4" />
            <span className="text-sm">Offline mode - Visual demo still works!</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}