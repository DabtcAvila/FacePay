'use client';

// DEPRECATED: This component is deprecated. Use BiometricWithFallback with preferredMethod="camera" instead.
// BiometricWithFallback provides the same camera functionality plus intelligent fallbacks.
// This component is kept for backward compatibility only.

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  CheckCircle, 
  X, 
  AlertCircle, 
  Play,
  RefreshCw,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  const [scanProgress, setScanProgress] = useState(0);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [permissionState, setPermissionState] = useState<'unknown' | 'granted' | 'denied' | 'prompt'>('unknown');

  // Enhanced camera initialization with better error handling
  const startCamera = useCallback(async () => {
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

      // Try constraints in order of preference
      for (const constraint of constraints) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraint);
          break;
        } catch (constraintError) {
          lastError = constraintError as Error;
          console.warn('Failed with constraint:', constraint, constraintError);
        }
      }

      if (!stream) {
        throw lastError || new Error('Failed to get camera stream');
      }

      if (videoRef.current) {
        // Clean up any existing stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        // Configure video element
        videoRef.current.playsInline = true;
        videoRef.current.muted = true;
        videoRef.current.autoplay = true;
        
        // Wait for video to be ready
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          await playPromise;
        }
        
        // Wait for video to actually start showing frames
        await new Promise((resolve) => {
          const checkVideo = () => {
            if (videoRef.current && videoRef.current.videoWidth > 0) {
              resolve(true);
            } else {
              setTimeout(checkVideo, 100);
            }
          };
          checkVideo();
        });
        
        setStatus('active');
        
        // Auto-start scanning after video is properly initialized
        setTimeout(() => {
          if (videoRef.current && streamRef.current) {
            startScanning();
          }
        }, 1500);
      }
    } catch (err) {
      console.error('Camera error:', err);
      setStatus('error');
      
      // Enhanced error handling with specific messages
      if (err instanceof Error) {
        switch (err.name) {
          case 'NotAllowedError':
            setError('Camera access denied. Please allow camera permissions in your browser settings and refresh the page.');
            break;
          case 'NotFoundError':
            setError('No camera found on this device. Please connect a camera or use demo mode.');
            break;
          case 'NotReadableError':
            setError('Camera is already in use by another application. Please close other apps using the camera.');
            break;
          case 'OverconstrainedError':
            setError('Camera constraints not supported. Trying with basic settings...');
            // Auto-retry with basic constraints
            setTimeout(() => {
              if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                navigator.mediaDevices.getUserMedia({ video: true, audio: false })
                  .then(stream => {
                    if (videoRef.current) {
                      videoRef.current.srcObject = stream;
                      streamRef.current = stream;
                      videoRef.current.play();
                      setStatus('active');
                      setError('');
                      setTimeout(startScanning, 1000);
                    }
                  })
                  .catch(() => {
                    setError('Camera configuration failed. Please use demo mode.');
                  });
              }
            }, 2000);
            break;
          case 'SecurityError':
            setError('Camera access blocked by security settings. Please enable camera access for this site.');
            break;
          default:
            setError(`Camera error: ${err.message}. You can try demo mode instead.`);
        }
      } else {
        setError('Unknown camera error occurred. Please try demo mode.');
      }
    }
  }, []);

  // Enhanced scanning simulation
  const startScanning = useCallback(() => {
    if (status !== 'active' && status !== 'demo') {
      console.warn('Cannot start scanning, invalid status:', status);
      return;
    }
    
    setStatus('scanning');
    setScanProgress(0);
    
    // Realistic progress animation with variable speeds
    const progressInterval = setInterval(() => {
      setScanProgress(prev => {
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
          
          return 100;
        }
        
        return newProgress;
      });
    }, 150); // Slightly slower for more realistic feel
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

  // Enhanced cleanup camera stream
  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped camera track:', track.kind);
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStatus('idle');
    setScanProgress(0);
  }, []);

  const handleCancel = () => {
    cleanup();
    onCancel?.();
  };

  // Check camera permissions on mount
  React.useEffect(() => {
    const checkPermissions = async () => {
      try {
        if ('permissions' in navigator) {
          const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
          setPermissionState(permission.state);
          
          permission.addEventListener('change', () => {
            setPermissionState(permission.state);
          });
        }
      } catch (error) {
        console.warn('Cannot check camera permissions:', error);
      }
    };
    
    checkPermissions();
    
    // Cleanup on unmount
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const retry = () => {
    cleanup(); // Clean up first
    setError('');
    setScanProgress(0);
    setStatus('idle');
    
    // Small delay to ensure cleanup is complete
    setTimeout(() => {
      if (isDemoMode) {
        startDemoMode();
      } else {
        startCamera();
      }
    }, 500);
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
              console.error('Video element error:', e);
              setError('Video playback failed. Please try demo mode.');
              setStatus('error');
            }}
            onLoadedMetadata={() => {
              console.log('Video metadata loaded');
            }}
            onCanPlay={() => {
              console.log('Video can play');
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
            <p className="text-sm text-gray-600 mt-1">
              {Math.round(scanProgress)}% complete
            </p>
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
        
        <Button onClick={handleCancel} variant="ghost" size="sm">
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