'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  CheckCircle, 
  X, 
  AlertCircle, 
  Smartphone,
  Shield,
  Fingerprint,
  Eye,
  Loader2,
  WifiOff,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WebAuthnService, type WebAuthnCapabilities, type WebAuthnError } from '@/services/webauthn';

interface FaceIDDemoProps {
  onScanComplete?: (method: 'camera' | 'webauthn') => void;
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [cameraStatus, setCameraStatus] = useState<'requesting' | 'active' | 'error' | 'denied' | 'not-supported'>('requesting');
  const [faceDetected, setFaceDetected] = useState(false);
  const [scanStage, setScanStage] = useState<'detecting' | 'scanning' | 'complete' | 'webauthn'>('detecting');
  const [scanProgress, setScanProgress] = useState(0);
  const [error, setError] = useState<string>('');
  const [faceBox, setFaceBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [webauthnCapabilities, setWebauthnCapabilities] = useState<WebAuthnCapabilities | null>(null);
  const [isWebAuthnInProgress, setIsWebAuthnInProgress] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [authMethod, setAuthMethod] = useState<'camera' | 'webauthn' | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<{
    isIOS: boolean;
    isMobile: boolean;
    hasFaceID: boolean;
    hasTouchID: boolean;
    supportsBiometrics: boolean;
  } | null>(null);

  // Check device capabilities and initialize
  const checkCapabilities = useCallback(async () => {
    try {
      // Check WebAuthn capabilities
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

      // For iOS devices with biometric support, prefer WebAuthn
      if (deviceInfo.isIOS && deviceInfo.supportsBiometrics && enableWebAuthnFallback) {
        setAuthMethod('webauthn');
        setScanStage('webauthn');
      } else {
        setAuthMethod('camera');
        initializeCamera();
      }
    } catch (err) {
      console.error('Capability check error:', err);
      // Fallback to camera method
      setAuthMethod('camera');
      initializeCamera();
    }
  }, [enableWebAuthnFallback]);

  // Initialize camera with iOS optimizations
  const initializeCamera = useCallback(async () => {
    try {
      setCameraStatus('requesting');
      setError('');
      setRetryCount(prev => prev + 1);

      // Check if camera is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraStatus('not-supported');
        setError('Camera is not supported on this browser.');
        return;
      }

      // iOS-specific constraints for better compatibility
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          facingMode: 'user',
          // iOS-specific optimizations
          frameRate: { ideal: 30, max: 30 },
          aspectRatio: { ideal: 4/3 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        // iOS requires explicit play() call
        videoRef.current.playsInline = true;
        videoRef.current.muted = true;
        
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          await playPromise;
        }
        
        setCameraStatus('active');
        setAuthMethod('camera');
        
        // Start face detection once video is loaded
        videoRef.current.onloadedmetadata = () => {
          startFaceDetection();
        };
      }
    } catch (err) {
      console.error('Camera error:', err);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setCameraStatus('denied');
          setError('Camera access denied. Please allow camera permissions and try again.');
        } else if (err.name === 'NotFoundError') {
          setCameraStatus('error');
          setError('No camera found on this device.');
        } else if (err.name === 'NotSupportedError') {
          setCameraStatus('not-supported');
          setError('Camera is not supported on this browser or device.');
        } else if (err.name === 'OverconstrainedError') {
          setCameraStatus('error');
          setError('Camera constraints cannot be satisfied. Please try a different device.');
        } else {
          setCameraStatus('error');
          setError(`Camera error: ${err.message}`);
        }
        
        // Suggest WebAuthn fallback if available
        if (enableWebAuthnFallback && webauthnCapabilities?.isPlatformAuthenticatorAvailable) {
          setTimeout(() => {
            setError(prev => prev + ' You can try using biometric authentication instead.');
          }, 2000);
        }
      }
    }
  }, [enableWebAuthnFallback, webauthnCapabilities]);

  // WebAuthn biometric authentication
  const initiateWebAuthn = useCallback(async () => {
    if (!userId || !userName || !webauthnCapabilities?.isPlatformAuthenticatorAvailable) {
      return;
    }

    setIsWebAuthnInProgress(true);
    setError('');

    try {
      // First try authentication (user might already be registered)
      const authResult = await WebAuthnService.startAuthentication(userId);
      
      if (authResult.success && authResult.options) {
        const credential = await navigator.credentials.create({
          publicKey: {
            ...authResult.options,
            timeout: 60000,
            userVerification: 'required'
          }
        });

        if (credential) {
          const verificationResult = await WebAuthnService.completeAuthentication(credential, userId);
          if (verificationResult.success) {
            setScanStage('complete');
            setTimeout(() => {
              onScanComplete?.('webauthn');
            }, 1000);
            return;
          }
        }
      }
      
      // If authentication fails, try registration
      const regResult = await WebAuthnService.startRegistration(userId, userName);
      
      if (regResult.success && regResult.options) {
        const credential = await navigator.credentials.create({
          publicKey: {
            ...regResult.options,
            timeout: 60000,
            authenticatorSelection: {
              authenticatorAttachment: 'platform',
              userVerification: 'required',
              residentKey: 'preferred'
            }
          }
        });

        if (credential) {
          const verificationResult = await WebAuthnService.completeRegistration(credential, userId);
          if (verificationResult.success) {
            setScanStage('complete');
            setTimeout(() => {
              onScanComplete?.('webauthn');
            }, 1000);
            return;
          }
        }
      }

      throw new Error('Biometric authentication failed');
      
    } catch (err: any) {
      console.error('WebAuthn error:', err);
      const webauthnError = WebAuthnService.handleWebAuthnError(err);
      setError(webauthnError.message);
      
      // Offer camera fallback
      if (webauthnError.isRecoverable) {
        setTimeout(() => {
          setError(prev => prev + ' You can try using the camera scanner instead.');
        }, 2000);
      }
    } finally {
      setIsWebAuthnInProgress(false);
    }
  }, [userId, userName, webauthnCapabilities, onScanComplete]);

  // Enhanced face detection with better iOS compatibility
  const detectFace = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas || scanStage !== 'detecting') return;

    const context = canvas.getContext('2d');
    if (!context) return;

    // Ensure video is ready
    if (video.readyState < 2) {
      setTimeout(detectFace, 100);
      return;
    }

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    try {
      context.drawImage(video, 0, 0);
      
      // Enhanced mock face detection with more realistic timing
      const detectionDelay = deviceInfo?.isIOS ? 1500 : 2000; // Slightly faster on iOS
      
      setTimeout(() => {
        if (scanStage === 'detecting') {
          setFaceDetected(true);
          setScanStage('scanning');
          
          // More realistic face bounding box
          const mockFaceBox = {
            x: (video.videoWidth || 640) * 0.25,
            y: (video.videoHeight || 480) * 0.2,
            width: (video.videoWidth || 640) * 0.5,
            height: (video.videoHeight || 480) * 0.6
          };
          setFaceBox(mockFaceBox);
          
          // Enhanced scanning progress with variable speed
          let progress = 0;
          const scanInterval = setInterval(() => {
            progress += Math.random() * 3 + 1; // Variable progress speed
            setScanProgress(Math.min(progress, 100));
            
            if (progress >= 100) {
              clearInterval(scanInterval);
              setScanStage('complete');
              setTimeout(() => {
                onScanComplete?.('camera');
              }, 1500);
            }
          }, 80);
        }
      }, detectionDelay);
    } catch (err) {
      console.error('Face detection error:', err);
      setError('Failed to process camera feed. Please try again.');
    }
  }, [scanStage, onScanComplete, deviceInfo]);

  const startFaceDetection = useCallback(() => {
    if (cameraStatus === 'active') {
      detectFace();
    }
  }, [cameraStatus, detectFace]);

  // Clean up camera stream
  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Initialize based on device capabilities
  useEffect(() => {
    checkCapabilities();
    return cleanup;
  }, [checkCapabilities, cleanup]);

  // Handle WebAuthn initialization
  useEffect(() => {
    if (scanStage === 'webauthn' && !isWebAuthnInProgress && authMethod === 'webauthn') {
      initiateWebAuthn();
    }
  }, [scanStage, isWebAuthnInProgress, authMethod, initiateWebAuthn]);

  // Auto-retry logic for failed attempts
  useEffect(() => {
    if (cameraStatus === 'error' && retryCount < 3 && authMethod === 'camera') {
      const retryTimeout = setTimeout(() => {
        console.log(`Auto-retry attempt ${retryCount + 1}`);
        initializeCamera();
      }, 3000);
      
      return () => clearTimeout(retryTimeout);
    }
  }, [cameraStatus, retryCount, authMethod, initializeCamera]);

  const handleCancel = () => {
    cleanup();
    setIsWebAuthnInProgress(false);
    onCancel?.();
  };

  const switchToCamera = () => {
    setAuthMethod('camera');
    setScanStage('detecting');
    setError('');
    initializeCamera();
  };

  const switchToWebAuthn = () => {
    cleanup();
    setAuthMethod('webauthn');
    setScanStage('webauthn');
    setError('');
    initiateWebAuthn();
  };

  const retry = () => {
    setError('');
    setRetryCount(0);
    if (authMethod === 'camera') {
      initializeCamera();
    } else {
      initiateWebAuthn();
    }
  };

  const renderCameraView = () => (
    <div className="relative w-full max-w-lg mx-auto">
      <div className="relative bg-black rounded-2xl overflow-hidden aspect-[4/3]">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        
        {/* Face detection overlay */}
        {faceBox && (
          <motion.div
            className="absolute border-2 rounded-lg pointer-events-none"
            style={{
              left: `${(faceBox.x / (videoRef.current?.videoWidth || 1)) * 100}%`,
              top: `${(faceBox.y / (videoRef.current?.videoHeight || 1)) * 100}%`,
              width: `${(faceBox.width / (videoRef.current?.videoWidth || 1)) * 100}%`,
              height: `${(faceBox.height / (videoRef.current?.videoHeight || 1)) * 100}%`,
            }}
            animate={{
              borderColor: 
                scanStage === 'complete' ? '#10B981' : 
                scanStage === 'scanning' ? '#3B82F6' : '#F59E0B',
              opacity: 1,
              scale: 1
            }}
            initial={{ opacity: 0, scale: 0.8 }}
          >
            {/* Corner indicators */}
            {[0, 1, 2, 3].map((corner) => (
              <div
                key={corner}
                className={`absolute w-4 h-4 ${
                  corner === 0 ? 'top-0 left-0' :
                  corner === 1 ? 'top-0 right-0' :
                  corner === 2 ? 'bottom-0 left-0' : 'bottom-0 right-0'
                }`}
              >
                <div 
                  className={`w-full h-full ${
                    scanStage === 'complete' ? 'bg-green-500' : 
                    scanStage === 'scanning' ? 'bg-blue-500' : 'bg-yellow-500'
                  }`}
                  style={{
                    clipPath: corner === 0 ? 'polygon(0 0, 100% 0, 100% 25%, 25% 25%, 25% 100%, 0 100%)' :
                             corner === 1 ? 'polygon(0 0, 100% 0, 100% 100%, 75% 100%, 75% 25%, 0 25%)' :
                             corner === 2 ? 'polygon(0 0, 25% 0, 25% 75%, 100% 75%, 100% 100%, 0 100%)' :
                             'polygon(75% 0, 100% 0, 100% 100%, 0 100%, 0 75%, 75% 75%)'
                  }}
                />
              </div>
            ))}
            
            {/* Scanning progress bar */}
            {scanStage === 'scanning' && (
              <div className="absolute bottom-2 left-2 right-2">
                <div className="bg-black/50 rounded-full p-1">
                  <motion.div
                    className="h-1 bg-blue-500 rounded-full"
                    style={{ width: `${scanProgress}%` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${scanProgress}%` }}
                  />
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Scanning animation overlay */}
        {scanStage === 'scanning' && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.3, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="w-full h-full bg-gradient-to-b from-transparent via-blue-500/20 to-transparent" />
          </motion.div>
        )}
      </div>
      
      {/* Hidden canvas for face detection processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );

  const renderStatus = () => (
    <div className="text-center space-y-4">
      <div className="flex items-center justify-center space-x-2">
        {scanStage === 'complete' ? (
          <CheckCircle className="w-6 h-6 text-green-500" />
        ) : scanStage === 'scanning' ? (
          <motion.div
            className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        ) : (
          <Camera className="w-6 h-6 text-yellow-500" />
        )}
        
        <motion.p 
          className="text-lg font-medium"
          animate={{
            color: scanStage === 'complete' ? '#10B981' : 
                   scanStage === 'scanning' ? '#3B82F6' : '#F59E0B'
          }}
        >
          {scanStage === 'detecting' && 'Position your face in the frame'}
          {scanStage === 'scanning' && `Scanning face... ${scanProgress}%`}
          {scanStage === 'complete' && 'Face verification complete!'}
        </motion.p>
      </div>
      
      {scanStage === 'detecting' && (
        <p className="text-sm text-gray-600">
          Make sure your face is clearly visible and well-lit
        </p>
      )}
    </div>
  );

  const renderError = () => (
    <div className="text-center space-y-6">
      <div className="flex items-center justify-center space-x-2 text-red-500">
        <AlertCircle className="w-8 h-8" />
        <h3 className="text-xl font-semibold">Camera Error</h3>
      </div>
      
      <p className="text-gray-600">{error}</p>
      
      <div className="space-y-3">
        {cameraStatus === 'denied' && (
          <div className="text-sm text-gray-500 space-y-2">
            <p>To use FaceID:</p>
            <ol className="text-left list-decimal list-inside space-y-1">
              <li>Click the camera icon in your browser's address bar</li>
              <li>Select "Allow" for camera access</li>
              <li>Refresh the page and try again</li>
            </ol>
          </div>
        )}
        
        <Button onClick={initializeCamera} variant="outline">
          Try Again
        </Button>
      </div>
    </div>
  );

  const renderRequestingPermission = () => (
    <div className="text-center space-y-6">
      <motion.div
        className="w-16 h-16 mx-auto border-4 border-blue-500 border-t-transparent rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
      
      <div>
        <h3 className="text-xl font-semibold mb-2">Requesting Camera Access</h3>
        <p className="text-gray-600">Please allow camera access to continue</p>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">FaceID Demo</h2>
        <Button onClick={handleCancel} variant="ghost" size="sm">
          <X className="w-5 h-5" />
        </Button>
      </div>
      
      <div className="space-y-8">
        {cameraStatus === 'requesting' && renderRequestingPermission()}
        {(cameraStatus === 'error' || cameraStatus === 'denied') && renderError()}
        {cameraStatus === 'active' && (
          <>
            {renderCameraView()}
            {renderStatus()}
          </>
        )}
      </div>
      
      <AnimatePresence>
        {scanStage === 'complete' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg text-center"
          >
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-green-700 font-medium">
              Face verification successful! You can now proceed with secure payments.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}