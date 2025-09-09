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

  // Check current camera permission status
  const checkCameraPermission = useCallback(async (): Promise<'granted' | 'denied' | 'prompt' | 'unknown'> => {
    try {
      if (!navigator.permissions) {
        return 'unknown';
      }
      
      const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
      return result.state;
    } catch (err) {
      console.log('Permission query not supported:', err);
      return 'unknown';
    }
  }, []);

  // Initialize camera with enhanced permission handling
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

      // Check current permission status first
      const permissionStatus = await checkCameraPermission();
      console.log('Camera permission status:', permissionStatus);

      // If permission is denied, show error immediately
      if (permissionStatus === 'denied') {
        setCameraStatus('denied');
        setError('Camera access denied. Please allow camera permissions and try again.');
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

      // Request camera access with timeout
      const stream = await Promise.race([
        navigator.mediaDevices.getUserMedia(constraints),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Camera request timeout')), 15000)
        )
      ]);

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
        
        // Set status to active immediately after successful getUserMedia
        setCameraStatus('active');
        setAuthMethod('camera');
        
        // Start face detection once video is loaded
        videoRef.current.onloadedmetadata = () => {
          startFaceDetection();
        };
        
        // If video loads immediately, start detection
        if (videoRef.current.readyState >= 2) {
          startFaceDetection();
        }
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
        } else if (err.message === 'Camera request timeout') {
          setCameraStatus('error');
          setError('Camera permission request timed out. Please refresh and try again.');
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
  }, [enableWebAuthnFallback, webauthnCapabilities, checkCameraPermission]);

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
        const credential = await navigator.credentials.get({
          publicKey: {
            ...authResult.options,
            timeout: 60000
          } as PublicKeyCredentialRequestOptions
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
              authenticatorAttachment: 'platform' as AuthenticatorAttachment,
              userVerification: 'required' as UserVerificationRequirement,
              residentKey: 'preferred' as ResidentKeyRequirement
            }
          } as PublicKeyCredentialCreationOptions
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

  // Listen for permission changes
  useEffect(() => {
    let permissionStatus: PermissionStatus | null = null;
    
    const setupPermissionListener = async () => {
      try {
        if (navigator.permissions) {
          permissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
          
          const handlePermissionChange = () => {
            console.log('Camera permission changed to:', permissionStatus?.state);
            
            // If permission was granted and we're in requesting state, restart camera
            if (permissionStatus?.state === 'granted' && cameraStatus === 'requesting' && authMethod === 'camera') {
              console.log('Permission granted, restarting camera...');
              initializeCamera();
            }
            // If permission was denied, update status
            else if (permissionStatus?.state === 'denied' && authMethod === 'camera') {
              setCameraStatus('denied');
              setError('Camera access denied. Please allow camera permissions and try again.');
            }
          };
          
          permissionStatus.addEventListener('change', handlePermissionChange);
        }
      } catch (err) {
        console.log('Could not set up permission listener:', err);
      }
    };

    if (authMethod === 'camera') {
      setupPermissionListener();
    }

    return () => {
      if (permissionStatus) {
        permissionStatus.removeEventListener('change', () => {});
      }
    };
  }, [authMethod, cameraStatus, initializeCamera]);

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

  // Auto-retry logic for failed attempts (only once)
  useEffect(() => {
    if (cameraStatus === 'error' && retryCount === 1 && authMethod === 'camera') {
      const retryTimeout = setTimeout(() => {
        console.log('Auto-retry attempt after initial failure');
        initializeCamera();
      }, 2000);
      
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
    setScanStage('detecting');
    setFaceDetected(false);
    setScanProgress(0);
    setFaceBox(null);
    
    // Clean up any existing stream before retry
    cleanup();
    
    if (authMethod === 'camera') {
      initializeCamera();
    } else {
      setScanStage('webauthn');
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
            
            {/* Enhanced scanning progress bar */}
            {scanStage === 'scanning' && (
              <div className="absolute bottom-2 left-2 right-2">
                <div className="bg-black/60 rounded-full p-1.5 backdrop-blur-sm">
                  <motion.div
                    className="h-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full relative overflow-hidden"
                    initial={{ width: 0 }}
                    animate={{ width: `${scanProgress}%` }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  >
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                      animate={{ x: [-100, 200] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    />
                  </motion.div>
                </div>
                <div className="text-center mt-1">
                  <span className="text-xs text-white font-medium">
                    {Math.round(scanProgress)}%
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Enhanced scanning animation overlay */}
        {scanStage === 'scanning' && (
          <>
            <motion.div
              className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.3, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div className="w-full h-full bg-gradient-to-b from-transparent via-blue-500/20 to-transparent" />
            </motion.div>
            
            {/* Scanning line animation */}
            <motion.div
              className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent pointer-events-none"
              animate={{ y: [0, (videoRef.current?.offsetHeight || 400) - 2] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            />
          </>
        )}
      </div>
      
      {/* Hidden canvas for face detection processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );

  const renderStatus = () => (
    <div className="text-center space-y-4">
      <div className="flex items-center justify-center space-x-3">
        {scanStage === 'complete' ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 10 }}
          >
            <CheckCircle className="w-8 h-8 text-green-500" />
          </motion.div>
        ) : scanStage === 'scanning' ? (
          <motion.div
            className="w-7 h-7 border-3 border-blue-500 border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        ) : scanStage === 'webauthn' ? (
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {deviceInfo?.hasFaceID ? (
              <Eye className="w-7 h-7 text-blue-500" />
            ) : deviceInfo?.hasTouchID ? (
              <Fingerprint className="w-7 h-7 text-blue-500" />
            ) : (
              <Shield className="w-7 h-7 text-blue-500" />
            )}
          </motion.div>
        ) : (
          <Camera className="w-7 h-7 text-yellow-500" />
        )}
        
        <motion.div 
          className="text-center"
          animate={{
            color: scanStage === 'complete' ? '#10B981' : 
                   (scanStage === 'scanning' || scanStage === 'webauthn') ? '#3B82F6' : '#F59E0B'
          }}
        >
          <p className="text-lg font-semibold">
            {scanStage === 'detecting' && 'Position your face in the frame'}
            {scanStage === 'scanning' && 'Analyzing your face...'}
            {scanStage === 'webauthn' && (
              deviceInfo?.hasFaceID ? 'Use Face ID to authenticate' :
              deviceInfo?.hasTouchID ? 'Use Touch ID to authenticate' :
              'Use biometric authentication'
            )}
            {scanStage === 'complete' && 'Authentication successful!'}
          </p>
          {scanStage === 'scanning' && (
            <p className="text-sm text-gray-600 mt-1">
              {scanProgress}% complete
            </p>
          )}
        </motion.div>
      </div>
      
      {scanStage === 'detecting' && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            Make sure your face is clearly visible and well-lit
          </p>
          {deviceInfo?.isIOS && (
            <p className="text-xs text-blue-600">
              For better security, consider using Face ID instead
            </p>
          )}
        </div>
      )}
      
      {scanStage === 'webauthn' && isWebAuthnInProgress && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            {deviceInfo?.hasFaceID ? 
              'Look at your device to authenticate with Face ID' :
            deviceInfo?.hasTouchID ? 
              'Place your finger on the Touch ID sensor' :
              'Follow the prompts on your device to authenticate'
            }
          </p>
        </div>
      )}
      
      {/* Method switching buttons */}
      {authMethod && scanStage !== 'complete' && !isWebAuthnInProgress && (
        <div className="flex justify-center space-x-3 mt-4">
          {authMethod === 'webauthn' && (
            <Button 
              onClick={switchToCamera} 
              variant="outline" 
              size="sm"
              disabled={cameraStatus === 'not-supported'}
            >
              <Camera className="w-4 h-4 mr-2" />
              Use Camera
            </Button>
          )}
          {authMethod === 'camera' && webauthnCapabilities?.isPlatformAuthenticatorAvailable && (
            <Button 
              onClick={switchToWebAuthn} 
              variant="outline" 
              size="sm"
            >
              {deviceInfo?.hasFaceID ? (
                <><Eye className="w-4 h-4 mr-2" />Use Face ID</>
              ) : deviceInfo?.hasTouchID ? (
                <><Fingerprint className="w-4 h-4 mr-2" />Use Touch ID</>
              ) : (
                <><Shield className="w-4 h-4 mr-2" />Use Biometrics</>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );

  const renderError = () => {
    const isNetworkError = error.includes('network') || error.includes('connection');
    const isPermissionError = cameraStatus === 'denied';
    const isUnsupportedError = cameraStatus === 'not-supported';
    
    return (
      <div className="text-center space-y-6">
        <div className="flex items-center justify-center space-x-3 text-red-500">
          {isNetworkError ? (
            <WifiOff className="w-8 h-8" />
          ) : (
            <AlertCircle className="w-8 h-8" />
          )}
          <h3 className="text-xl font-semibold">
            {isNetworkError ? 'Connection Error' :
             isPermissionError ? 'Permission Required' :
             isUnsupportedError ? 'Not Supported' : 'Authentication Error'}
          </h3>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 font-medium">{error}</p>
        </div>
        
        <div className="space-y-4">
          {isPermissionError && (
            <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-4">
              <p className="font-medium mb-2">To enable camera access:</p>
              <ol className="text-left list-decimal list-inside space-y-1">
                {deviceInfo?.isIOS ? (
                  <>
                    <li>Go to Settings → Safari → Camera</li>
                    <li>Select "Allow" or "Ask"</li>
                    <li>Refresh this page and try again</li>
                  </>
                ) : (
                  <>
                    <li>Click the camera icon in your browser's address bar</li>
                    <li>Select "Allow" for camera access</li>
                    <li>Refresh the page and try again</li>
                  </>
                )}
              </ol>
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {!isUnsupportedError && (
              <Button onClick={retry} variant="outline" className="flex items-center">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
                {retryCount > 0 && retryCount < 3 && (
                  <span className="ml-2 text-xs bg-gray-200 px-2 py-1 rounded">
                    Attempt {retryCount + 1}
                  </span>
                )}
              </Button>
            )}
            
            {/* Offer alternative authentication method */}
            {webauthnCapabilities?.isPlatformAuthenticatorAvailable && authMethod === 'camera' && (
              <Button onClick={switchToWebAuthn} className="flex items-center">
                {deviceInfo?.hasFaceID ? (
                  <><Eye className="w-4 h-4 mr-2" />Try Face ID</>
                ) : deviceInfo?.hasTouchID ? (
                  <><Fingerprint className="w-4 h-4 mr-2" />Try Touch ID</>
                ) : (
                  <><Shield className="w-4 h-4 mr-2" />Try Biometrics</>
                )}
              </Button>
            )}
            
            {authMethod === 'webauthn' && cameraStatus !== 'not-supported' && (
              <Button onClick={switchToCamera} variant="outline" className="flex items-center">
                <Camera className="w-4 h-4 mr-2" />
                Try Camera
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderRequestingPermission = () => (
    <div className="text-center space-y-6">
      <motion.div
        className="w-16 h-16 mx-auto border-4 border-blue-500 border-t-transparent rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
      
      <div>
        <h3 className="text-xl font-semibold mb-2">
          {authMethod === 'webauthn' ? 'Initializing Biometric Authentication' : 'Requesting Camera Access'}
        </h3>
        <p className="text-gray-600">
          {authMethod === 'webauthn' ? 
            'Please wait while we set up secure authentication...' :
            'Please allow camera access to continue'
          }
        </p>
        {deviceInfo?.isIOS && authMethod === 'camera' && (
          <p className="text-sm text-blue-600 mt-2">
            You may see a permission prompt from Safari
          </p>
        )}
      </div>
    </div>
  );

  const renderWebAuthnInterface = () => (
    <div className="text-center space-y-8">
      <div className="relative">
        {/* Biometric icon with pulsing animation */}
        <motion.div
          className="w-32 h-32 mx-auto bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg"
          animate={{ 
            scale: isWebAuthnInProgress ? [1, 1.05, 1] : 1,
            boxShadow: isWebAuthnInProgress ? 
              ['0 10px 25px rgba(59, 130, 246, 0.3)', '0 15px 35px rgba(59, 130, 246, 0.4)', '0 10px 25px rgba(59, 130, 246, 0.3)'] : 
              '0 10px 25px rgba(59, 130, 246, 0.3)'
          }}
          transition={{ duration: 2, repeat: isWebAuthnInProgress ? Infinity : 0 }}
        >
          {deviceInfo?.hasFaceID ? (
            <Eye className="w-16 h-16 text-white" />
          ) : deviceInfo?.hasTouchID ? (
            <Fingerprint className="w-16 h-16 text-white" />
          ) : (
            <Shield className="w-16 h-16 text-white" />
          )}
        </motion.div>
        
        {/* Loading spinner overlay */}
        {isWebAuthnInProgress && (
          <motion.div
            className="absolute inset-0 border-4 border-transparent border-t-white rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        )}
      </div>
      
      <div className="space-y-4">
        <h3 className="text-2xl font-bold text-gray-900">
          {deviceInfo?.hasFaceID ? 'Authenticate with Face ID' :
           deviceInfo?.hasTouchID ? 'Authenticate with Touch ID' :
           'Authenticate with Biometrics'}
        </h3>
        
        <div className="space-y-2">
          <p className="text-gray-600">
            {deviceInfo?.hasFaceID ? 
              'Look at your device to verify your identity' :
            deviceInfo?.hasTouchID ? 
              'Place your finger on the Touch ID sensor' :
              'Use your device\'s biometric authentication'
            }
          </p>
          
          {isWebAuthnInProgress && (
            <p className="text-blue-600 font-medium">
              Follow the prompts on your device...
            </p>
          )}
        </div>
        
        {/* Security badges */}
        <div className="flex justify-center space-x-4 pt-4">
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Shield className="w-4 h-4" />
            <span>Secure</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Smartphone className="w-4 h-4" />
            <span>Device Protected</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-3">
          <h2 className="text-2xl font-bold text-gray-900">
            {authMethod === 'webauthn' ? 
              (deviceInfo?.hasFaceID ? 'Face ID Authentication' :
               deviceInfo?.hasTouchID ? 'Touch ID Authentication' :
               'Biometric Authentication') :
              'Face Recognition'
            }
          </h2>
          
          {/* Device indicator */}
          {deviceInfo && (
            <div className="flex items-center space-x-1 text-sm text-gray-500">
              <Smartphone className="w-4 h-4" />
              {deviceInfo.isIOS ? 'iOS' : 'Web'}
            </div>
          )}
        </div>
        
        <Button onClick={handleCancel} variant="ghost" size="sm">
          <X className="w-5 h-5" />
        </Button>
      </div>
      
      <div className="space-y-8">
        {/* Loading states */}
        {(cameraStatus === 'requesting' || (authMethod === 'webauthn' && !webauthnCapabilities)) && renderRequestingPermission()}
        
        {/* Error states */}
        {((cameraStatus === 'error' || cameraStatus === 'denied' || cameraStatus === 'not-supported') && authMethod === 'camera') || 
         (error && authMethod === 'webauthn') ? renderError() : null}
        
        {/* Camera interface */}
        {cameraStatus === 'active' && authMethod === 'camera' && (
          <>
            {renderCameraView()}
            {renderStatus()}
          </>
        )}
        
        {/* WebAuthn interface */}
        {authMethod === 'webauthn' && scanStage === 'webauthn' && !error && renderWebAuthnInterface()}
        
        {/* Status for WebAuthn complete */}
        {authMethod === 'webauthn' && scanStage !== 'webauthn' && renderStatus()}
      </div>
      
      {/* Success message */}
      <AnimatePresence>
        {scanStage === 'complete' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mt-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl text-center shadow-sm"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 10, delay: 0.2 }}
            >
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            </motion.div>
            
            <h3 className="text-lg font-semibold text-green-800 mb-2">
              {authMethod === 'webauthn' ? 
                (deviceInfo?.hasFaceID ? 'Face ID verification successful!' :
                 deviceInfo?.hasTouchID ? 'Touch ID verification successful!' :
                 'Biometric verification successful!') :
                'Face recognition successful!'
              }
            </h3>
            
            <p className="text-green-700">
              You can now proceed with secure payments.
            </p>
            
            {/* Security confirmation */}
            <div className="flex justify-center items-center space-x-2 mt-3 text-sm text-green-600">
              <Shield className="w-4 h-4" />
              <span>Identity verified securely</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Network status indicator */}
      {typeof navigator !== 'undefined' && !navigator.onLine && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
          <div className="flex items-center justify-center space-x-2 text-yellow-700">
            <WifiOff className="w-4 h-4" />
            <span className="text-sm">Offline - Some features may be limited</span>
          </div>
        </div>
      )}
    </div>
  );
}