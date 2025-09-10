'use client';

// DEPRECATED: This component is deprecated. Use BiometricWithFallback with preferredMethod="camera" instead.
// BiometricWithFallback provides the same camera functionality plus intelligent fallbacks.
// This component is kept for backward compatibility only.

import React, { useState, useRef, useCallback } from 'react';
import CameraErrorHelper, { classifyError, type CameraError } from '@/components/CameraErrorHelper';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  CheckCircle, 
  X, 
  AlertCircle, 
  Play,
  RefreshCw,
  Eye,
  Timer,
  StopCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  withTimeout, 
  TimeoutError, 
  TimeoutHandler, 
  TIMEOUTS, 
  isTimeoutError, 
  getTimeoutMessage 
} from '@/utils/timeout';

interface SimpleFaceIDDemoProps {
  onScanComplete?: (method: 'camera' | 'demo') => void;
  onCancel?: () => void;
}

type ScanStatus = 'idle' | 'requesting' | 'active' | 'scanning' | 'complete' | 'error' | 'demo';

export default function SimpleFaceIDDemo({ 
  onScanComplete, 
  onCancel 
}: SimpleFaceIDDemoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [error, setError] = useState<string>('');
  const [cameraError, setCameraError] = useState<CameraError | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [permissionState, setPermissionState] = useState<'unknown' | 'granted' | 'denied' | 'prompt'>('unknown');
  const [isTakingLonger, setIsTakingLonger] = useState(false);
  const [showCancelButton, setShowCancelButton] = useState(false);
  const [timeoutMessage, setTimeoutMessage] = useState<string>('');
  
  const timeoutHandlerRef = useRef<TimeoutHandler | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // CRÍTICO: Inicialización de cámara ultra segura con cleanup preventivo y timeouts
  const startCamera = useCallback(async () => {
    console.log('[SimpleFaceIDDemo] Starting camera initialization');
    
    // Reset timeout states
    setIsTakingLonger(false);
    setShowCancelButton(false);
    setTimeoutMessage('');
    
    // Create abort controller for this operation
    abortControllerRef.current = new AbortController();
    
    // Set up timeout handler for camera initialization
    timeoutHandlerRef.current = new TimeoutHandler(
      () => {
        setIsTakingLonger(true);
        setShowCancelButton(true);
        setTimeoutMessage(getTimeoutMessage('Camera initialization', TIMEOUTS.CAMERA_INIT));
      }
    );
    
    // CRÍTICO: Limpiar completamente antes de empezar
    cleanup();
    
    // Timeout general para toda la inicialización
    const initTimeout = setTimeout(() => {
      console.log('[SimpleFaceIDDemo] Camera initialization timeout');
      cleanup();
      setStatus('error');
      setError('Camera initialization timed out. Please try demo mode.');
    }, 20000); // 20 segundos máximo

    try {
      setStatus('requesting');
      setError('');
      setIsDemoMode(false);

      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported on this device');
      }

      // Progressive constraints - try ideal first, then fallback
      const constraints: MediaStreamConstraints[] = [
        {
          video: {
            width: { ideal: 640, min: 320 },
            height: { ideal: 480, min: 240 },
            facingMode: 'user',
            frameRate: { ideal: 30, min: 15 }
          },
          audio: false
        },
        {
          video: {
            width: { ideal: 320 },
            height: { ideal: 240 },
            facingMode: 'user'
          },
          audio: false
        },
        {
          video: true,
          audio: false
        }
      ];

      let stream: MediaStream | null = null;
      let lastError: Error | null = null;

      // Try constraints in order of preference with timeout
      for (const constraint of constraints) {
        try {
          console.log('[SimpleFaceIDDemo] Trying constraint:', constraint);
          stream = await timeoutHandlerRef.current!.execute(
            () => navigator.mediaDevices.getUserMedia(constraint),
            TIMEOUTS.CAMERA_INIT,
            'Camera access timed out. Please check camera permissions.',
            'camera-access'
          );
          console.log('[SimpleFaceIDDemo] Got stream with', stream.getTracks().length, 'tracks');
          
          // Check if operation was aborted
          if (abortControllerRef.current?.signal.aborted) {
            stream.getTracks().forEach(track => track.stop());
            throw new Error('Camera initialization was cancelled');
          }
          
          break;
        } catch (constraintError) {
          lastError = constraintError as Error;
          console.warn('[SimpleFaceIDDemo] Failed with constraint:', constraint, constraintError);
        }
      }

      if (!stream) {
        throw lastError || new Error('Failed to get camera stream');
      }

      // CRÍTICO: Verificar que el stream está activo antes de usar
      const videoTrack = stream.getVideoTracks()[0];
      if (!videoTrack || videoTrack.readyState !== 'live') {
        stream.getTracks().forEach(track => track.stop());
        throw new Error('Camera stream is not active');
      }

      if (videoRef.current) {
        console.log('[SimpleFaceIDDemo] Setting up video element');
        
        // CRÍTICO: Cleanup cualquier stream existente
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        // Configure video element
        videoRef.current.playsInline = true;
        videoRef.current.muted = true;
        videoRef.current.autoplay = true;
        
        // Wait for video to be ready with timeout
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          await Promise.race([
            playPromise,
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Video play timeout')), 5000)
            )
          ]);
        }
        
        // Wait for video to actually start showing frames with timeout
        await Promise.race([
          new Promise((resolve) => {
            const checkVideo = () => {
              if (videoRef.current && videoRef.current.videoWidth > 0) {
                console.log('[SimpleFaceIDDemo] Video dimensions:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
                resolve(true);
              } else {
                setTimeout(checkVideo, 100);
              }
            };
            checkVideo();
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Video metadata timeout')), 10000)
          )
        ]);
        
        clearTimeout(initTimeout); // Cancelar timeout si todo va bien
        setStatus('active');
        console.log('[SimpleFaceIDDemo] Camera successfully initialized');
        
        // Auto-start scanning after video is properly initialized
        const scanTimeout = setTimeout(() => {
          if (videoRef.current && streamRef.current && status !== 'error') {
            console.log('[SimpleFaceIDDemo] Auto-starting scanning');
            startScanning();
          }
        }, 1500);
        
        // Cleanup del timeout si el componente se desmonta
        return () => clearTimeout(scanTimeout);
      } else {
        stream.getTracks().forEach(track => track.stop());
        throw new Error('Video element not available');
      }
    } catch (err) {
      clearTimeout(initTimeout);
      console.error('[SimpleFaceIDDemo] Camera initialization failed:', err);
      
      // CRÍTICO: Cleanup en caso de error
      cleanup();
      setStatus('error');
      
      // Enhanced error handling with timeout support
      if (isTimeoutError(err)) {
        setError('Camera initialization timed out. Please check your camera permissions and try again.');
      } else if (err instanceof Error) {
        switch (err.name) {
          case 'NotAllowedError':
            setError('Camera access denied. Please allow camera permissions and try again.');
            break;
          case 'NotFoundError':
            setError('No camera found. Please connect a camera or use demo mode.');
            break;
          case 'NotReadableError':
            setError('Camera busy. Please close other apps using the camera and try again.');
            break;
          case 'OverconstrainedError':
            setError('Camera constraints not supported. Falling back to demo mode.');
            // Auto fallback to demo mode
            setTimeout(() => {
              console.log('[SimpleFaceIDDemo] Auto-switching to demo mode');
              startDemoMode();
            }, 2000);
            break;
          case 'SecurityError':
            setError('Camera access blocked by security settings.');
            break;
          default:
            setError(`Camera error: ${err.message}. Try demo mode instead.`);
        }
      } else {
        setError('Unknown camera error. Please use demo mode.');
      }
    }
  }, [cleanup, startScanning, startDemoMode, status]);

  // Enhanced scanning simulation with timeout
  const startScanning = useCallback(() => {
    if (status !== 'active' && status !== 'demo') {
      console.warn('Cannot start scanning, invalid status:', status);
      return;
    }
    
    setStatus('scanning');
    setScanProgress(0);
    setIsTakingLonger(false);
    setShowCancelButton(false);
    
    // Create abort controller for scanning
    abortControllerRef.current = new AbortController();
    
    // Set up timeout handler for face detection
    timeoutHandlerRef.current = new TimeoutHandler(
      () => {
        setIsTakingLonger(true);
        setShowCancelButton(true);
        setTimeoutMessage(getTimeoutMessage('Face detection', TIMEOUTS.FACE_DETECTION));
      }
    );
    
    // Use timeout handler for face detection simulation
    timeoutHandlerRef.current!.execute(
      () => {
        return new Promise<void>((resolve) => {
          // Realistic progress animation with variable speeds
          const progressInterval = setInterval(() => {
            setScanProgress(prev => {
              // Check if operation was aborted
              if (abortControllerRef.current?.signal.aborted) {
                clearInterval(progressInterval);
                return prev;
              }
              
              // Simulate real face detection with slower start, faster middle, slower end
              let increment;
              if (prev < 20) {
                increment = Math.random() * 3 + 1; // Slow start
              } else if (prev < 80) {
                increment = Math.random() * 6 + 3; // Fast middle
              } else {
                increment = Math.random() * 2 + 0.5; // Slow finish
              }
              
              const newProgress = Math.min(prev + increment, 100);
              
              if (newProgress >= 100) {
                clearInterval(progressInterval);
                setStatus('complete');
                
                // Auto-complete after brief delay
                setTimeout(() => {
                  onScanComplete?.(isDemoMode ? 'demo' : 'camera');
                }, 1500);
                
                resolve();
                return 100;
              }
              
              return newProgress;
            });
          }, 150); // Slightly slower for more realistic feel
        });
      },
      TIMEOUTS.FACE_DETECTION,
      'Face detection timed out. Please ensure your face is visible and well-lit.',
      'face-detection'
    ).catch((error) => {
      if (isTimeoutError(error)) {
        setError('Face detection timed out. Please try again or use demo mode.');
        setStatus('error');
      }
    });
  }, [onScanComplete, isDemoMode, status]);

  // Demo mode - no camera required
  const startDemoMode = useCallback(() => {
    setStatus('demo');
    setError('');
    setIsDemoMode(true);
    
    // Simulate demo scanning
    setTimeout(() => {
      startScanning();
    }, 1000);
  }, [startScanning]);

  // CRÍTICO: Cleanup ultra robusto para evitar streams colgados
  const cleanup = useCallback(() => {
    console.log('[SimpleFaceIDDemo] Starting comprehensive cleanup');
    
    // Clean up timeout handler
    if (timeoutHandlerRef.current) {
      console.log('[SimpleFaceIDDemo] Cancelling timeout handler');
      timeoutHandlerRef.current.cancel();
      timeoutHandlerRef.current = null;
    }
    
    // Clean up abort controller
    if (abortControllerRef.current) {
      console.log('[SimpleFaceIDDemo] Aborting operations');
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Limpiar stream de cámara con verificación completa
    if (streamRef.current) {
      console.log('[SimpleFaceIDDemo] Stopping camera stream with', streamRef.current.getTracks().length, 'tracks');
      streamRef.current.getTracks().forEach((track, index) => {
        const initialState = track.readyState;
        track.stop();
        console.log(`[SimpleFaceIDDemo] Track ${index} (${track.kind}): ${initialState} -> ${track.readyState}`);
      });
      streamRef.current = null;
    } else {
      console.log('[SimpleFaceIDDemo] No active stream to clean');
    }
    
    // Limpiar video element completamente
    if (videoRef.current) {
      console.log('[SimpleFaceIDDemo] Clearing video element');
      videoRef.current.pause();
      videoRef.current.srcObject = null;
      videoRef.current.src = '';
      videoRef.current.load(); // Forzar reset completo
    }
    
    // Reset estados
    setStatus('idle');
    setScanProgress(0);
    setError('');
    setPermissionState('unknown');
    setIsTakingLonger(false);
    setShowCancelButton(false);
    setTimeoutMessage('');
    
    console.log('[SimpleFaceIDDemo] Cleanup completed');
  }, []);

  // Cancel current operation
  const cancelCurrentOperation = useCallback(() => {
    console.log('[SimpleFaceIDDemo] Cancelling current operation');
    cleanup();
    setError('Operation cancelled by user');
  }, [cleanup]);

  const handleCancel = () => {
    console.log('[SimpleFaceIDDemo] User cancelled, cleaning up');
    cleanup();
    
    // Asegurar que el cleanup se complete antes de la callback
    setTimeout(() => {
      onCancel?.();
    }, 100);
  };

  // Check camera permissions on mount
  React.useEffect(() => {
    const checkPermissions = async () => {
      try {
        if ('permissions' in navigator) {
          const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
          setPermissionState(permission.state);
          
          const handlePermissionChange = () => {
            console.log('[SimpleFaceIDDemo] Camera permission changed to:', permission.state);
            setPermissionState(permission.state);
            
            // Si se revoca el permiso mientras se usa la cámara, hacer cleanup
            if (permission.state === 'denied' && streamRef.current) {
              console.log('[SimpleFaceIDDemo] Permission denied, cleaning up stream');
              cleanup();
              setError('Camera access was revoked. Please refresh and grant permission.');
            }
          };
          
          permission.addEventListener('change', handlePermissionChange);
          
          // Cleanup listener
          return () => permission.removeEventListener('change', handlePermissionChange);
        }
      } catch (error) {
        console.warn('[SimpleFaceIDDemo] Cannot check camera permissions:', error);
      }
    };
    
    checkPermissions();
    
    // CRÍTICO: Cleanup ultra robusto en unmount
    return () => {
      console.log('[SimpleFaceIDDemo] Component unmounting, forcing cleanup');
      cleanup();
      
      // Verificación adicional para asegurar que no queden streams
      if (streamRef.current) {
        console.warn('[SimpleFaceIDDemo] Stream still active during unmount, forcing stop');
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [cleanup]);

  const retry = () => {
    console.log('[SimpleFaceIDDemo] Retrying with method:', isDemoMode ? 'demo' : 'camera');
    
    // CRÍTICO: Cleanup forzado antes de reintentar
    cleanup();
    setError('');
    setCameraError(null);
    setScanProgress(0);
    setStatus('idle');
    
    // Delay más largo para asegurar cleanup completo
    setTimeout(() => {
      if (isDemoMode) {
        console.log('[SimpleFaceIDDemo] Retrying with demo mode');
        startDemoMode();
      } else {
        console.log('[SimpleFaceIDDemo] Retrying with camera');
        startCamera();
      }
    }, 1000); // Aumentado a 1 segundo
  };

  // Render camera view
  const renderCameraView = () => (
    <div className="relative w-full max-w-lg mx-auto">
      <div className="relative bg-black rounded-2xl overflow-hidden aspect-[4/3]">
        {status !== 'demo' ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            controls={false}
            className="w-full h-full object-cover"
            onError={(e) => {
              console.error('[SimpleFaceIDDemo] Video element error:', e);
              cleanup(); // Limpiar inmediatamente en caso de error de video
              setError('Video playback failed. Please try demo mode.');
              setStatus('error');
            }}
            onLoadedMetadata={() => {
              console.log('[SimpleFaceIDDemo] Video metadata loaded, dimensions:', 
                videoRef.current?.videoWidth, 'x', videoRef.current?.videoHeight);
            }}
            onCanPlay={() => {
              console.log('[SimpleFaceIDDemo] Video can play');
            }}
            onEnded={() => {
              console.log('[SimpleFaceIDDemo] Video ended unexpectedly');
              cleanup();
              setError('Camera stream ended. Please try again.');
              setStatus('error');
            }}
          />
        ) : (
          // Demo mode - show placeholder
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
            <div className="text-center text-white">
              <Eye className="w-16 h-16 mx-auto mb-4 opacity-60" />
              <p className="text-lg font-medium">Demo Mode</p>
              <p className="text-sm opacity-80">Simulating face detection</p>
            </div>
          </div>
        )}
        
        {/* Simple face detection overlay */}
        {status === 'scanning' && (
          <motion.div
            className="absolute inset-4 border-2 rounded-lg"
            animate={{
              borderColor: scanProgress > 80 ? '#10B981' : '#3B82F6',
              opacity: 1
            }}
            initial={{ opacity: 0 }}
          >
            {/* Simple corner indicators */}
            {[0, 1, 2, 3].map((corner) => (
              <div
                key={corner}
                className={`absolute w-6 h-6 ${
                  corner === 0 ? 'top-0 left-0' :
                  corner === 1 ? 'top-0 right-0' :
                  corner === 2 ? 'bottom-0 left-0' : 'bottom-0 right-0'
                }`}
              >
                <div 
                  className={`w-full h-full ${
                    scanProgress > 80 ? 'bg-green-500' : 'bg-blue-500'
                  } opacity-80`}
                  style={{
                    clipPath: corner === 0 ? 'polygon(0 0, 100% 0, 100% 30%, 30% 30%, 30% 100%, 0 100%)' :
                             corner === 1 ? 'polygon(0 0, 100% 0, 100% 100%, 70% 100%, 70% 30%, 0 30%)' :
                             corner === 2 ? 'polygon(0 0, 30% 0, 30% 70%, 100% 70%, 100% 100%, 0 100%)' :
                             'polygon(70% 0, 100% 0, 100% 100%, 0 100%, 0 70%, 70% 70%)'
                  }}
                />
              </div>
            ))}
            
            {/* Progress bar */}
            <div className="absolute bottom-4 left-4 right-4">
              <div className="bg-black/60 rounded-full p-2 backdrop-blur-sm">
                <motion.div
                  className={`h-2 rounded-full ${
                    scanProgress > 80 ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${scanProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <div className="text-center mt-2">
                <span className="text-sm text-white font-medium">
                  {Math.round(scanProgress)}%
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Scanning animation */}
        {status === 'scanning' && (
          <motion.div
            className="absolute left-0 right-0 h-0.5 bg-blue-400 opacity-80"
            animate={{ 
              y: [20, (videoRef.current?.offsetHeight || 300) - 40],
              opacity: [0.8, 0.3, 0.8]
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              ease: 'linear' 
            }}
          />
        )}
      </div>
    </div>
  );

  // Render status message
  const renderStatus = () => (
    <div className="text-center space-y-4">
      <div className="flex items-center justify-center space-x-3">
        {status === 'complete' ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            <CheckCircle className="w-8 h-8 text-green-500" />
          </motion.div>
        ) : status === 'scanning' ? (
          <motion.div
            className="w-7 h-7 border-3 border-blue-500 border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        ) : status === 'requesting' ? (
          <motion.div
            className="w-7 h-7 border-3 border-yellow-500 border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        ) : (
          <Camera className="w-7 h-7 text-blue-500" />
        )}
        
        <div className="text-center">
          <p className="text-lg font-semibold">
            {status === 'idle' && 'Ready to scan'}
            {status === 'requesting' && 'Initializing camera...'}
            {status === 'active' && 'Look directly at the camera'}
            {status === 'demo' && 'Demo mode - Face detection simulation'}
            {status === 'scanning' && 'Analyzing facial features...'}
            {status === 'complete' && 'Authentication successful!'}
          </p>
          {status === 'scanning' && (
            <div className="mt-1">
              <p className="text-sm text-gray-600">
                {Math.round(scanProgress)}% complete
              </p>
              {isTakingLonger && (
                <p className="text-xs text-yellow-600 mt-1 flex items-center justify-center">
                  <Timer className="w-3 h-3 mr-1" />
                  Taking longer than expected...
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      
      {status === 'active' && (
        <p className="text-sm text-gray-600">
          Keep your face centered and visible. Detection will begin automatically.
        </p>
      )}
      
      {status === 'requesting' && (
        <p className="text-sm text-gray-600">
          Please allow camera access when prompted by your browser.
        </p>
      )}
      
      {/* Timeout message and cancel button */}
      {isTakingLonger && timeoutMessage && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-yellow-700">{timeoutMessage}</p>
        </div>
      )}
      
      {/* Cancel button when operation is taking longer */}
      {showCancelButton && (status === 'scanning' || status === 'requesting') && (
        <Button
          onClick={cancelCurrentOperation}
          variant="outline"
          className="flex items-center gap-2"
        >
          <StopCircle className="w-4 h-4" />
          Cancel Operation
        </Button>
      )}
    </div>
  );

  // Render error state
  const renderError = () => (
    <div className="text-center space-y-6">
      <div className="flex items-center justify-center space-x-3 text-red-500">
        <AlertCircle className="w-8 h-8" />
        <h3 className="text-xl font-semibold">Camera Error</h3>
      </div>
      
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">{error}</p>
      </div>
      
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={retry} variant="outline" className="flex items-center">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
          
          <Button onClick={startDemoMode} className="flex items-center">
            <Eye className="w-4 h-4 mr-2" />
            Use Demo Mode
          </Button>
        </div>
        
        <p className="text-sm text-gray-600">
          Demo mode works without camera access and simulates the face scanning experience.
        </p>
      </div>
    </div>
  );

  // Render initial state
  const renderInitial = () => (
    <div className="text-center space-y-6">
      <div className="w-24 h-24 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
        <Camera className="w-12 h-12 text-blue-600" />
      </div>
      
      <div>
        <h3 className="text-xl font-semibold mb-2">Face ID Authentication</h3>
        <p className="text-gray-600 mb-6">
          Choose how you'd like to authenticate
        </p>
        
        <div className="space-y-3">
          <Button 
            onClick={startCamera} 
            className="w-full flex items-center justify-center"
            size="lg"
            disabled={permissionState === 'denied'}
          >
            <Play className="w-5 h-5 mr-2" />
            {permissionState === 'denied' ? 'Camera Blocked' : 'Start Camera'}
          </Button>
          
          {permissionState === 'denied' && (
            <p className="text-sm text-red-600 mt-2 text-center">
              Camera access is blocked. Please enable it in your browser settings.
            </p>
          )}
          
          {permissionState === 'granted' && (
            <p className="text-sm text-green-600 mt-2 text-center flex items-center justify-center">
              <CheckCircle className="w-4 h-4 mr-1" />
              Camera access granted
            </p>
          )}
          
          <Button 
            onClick={startDemoMode} 
            variant="outline" 
            className="w-full flex items-center justify-center"
            size="lg"
          >
            <Eye className="w-5 h-5 mr-2" />
            Demo Mode
          </Button>
        </div>
        
        <div className="text-center mt-4">
          <p className="text-sm text-gray-500 mb-2">
            Demo mode works without camera permissions
          </p>
          <p className="text-xs text-gray-400">
            Camera Demo uses your device's actual camera for testing
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {isDemoMode ? 'Face ID Demo' : 'Face ID Scan'}
        </h2>
        
        <Button 
          onClick={handleCancel} 
          variant="ghost" 
          size="sm"
          className="text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>
      
      <div className="space-y-8">
        {status === 'idle' && renderInitial()}
        {status === 'error' && renderError()}
        {(status === 'requesting' || status === 'active' || status === 'demo' || status === 'scanning') && (
          <>
            {renderCameraView()}
            {renderStatus()}
          </>
        )}
      </div>
      
      {/* Success message */}
      <AnimatePresence>
        {status === 'complete' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mt-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl text-center"
          >
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-green-800 mb-2">
              {isDemoMode ? 'Demo completed successfully!' : 'Face recognition successful!'}
            </h3>
            <p className="text-green-700">
              You can now proceed with secure payments.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}