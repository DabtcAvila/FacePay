'use client';

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

  // Simple camera initialization - no complex permission checks
  const startCamera = useCallback(async () => {
    try {
      setStatus('requesting');
      setError('');
      setIsDemoMode(false);

      // Simple constraints that work on most devices
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
        
        // Simple play without complex promise handling
        videoRef.current.playsInline = true;
        videoRef.current.muted = true;
        
        await videoRef.current.play();
        setStatus('active');
        
        // Auto-start scanning after video loads
        setTimeout(() => {
          startScanning();
        }, 1000);
      }
    } catch (err) {
      console.error('Camera error:', err);
      setStatus('error');
      
      // Simple error messages
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Camera access denied. Please allow camera access and try again.');
        } else if (err.name === 'NotFoundError') {
          setError('No camera found. You can try the demo mode instead.');
        } else {
          setError('Camera not available. You can try the demo mode instead.');
        }
      }
    }
  }, []);

  // Simple scanning simulation
  const startScanning = useCallback(() => {
    setStatus('scanning');
    setScanProgress(0);
    
    // Simple progress animation
    const progressInterval = setInterval(() => {
      setScanProgress(prev => {
        const newProgress = prev + Math.random() * 5 + 2;
        
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
    }, 100);
  }, [onScanComplete, isDemoMode]);

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

  // Cleanup camera stream
  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const handleCancel = () => {
    cleanup();
    onCancel?.();
  };

  const retry = () => {
    setError('');
    setScanProgress(0);
    if (isDemoMode) {
      startDemoMode();
    } else {
      startCamera();
    }
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
            className="w-full h-full object-cover"
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
            {status === 'requesting' && 'Starting camera...'}
            {status === 'active' && 'Position your face in the frame'}
            {status === 'demo' && 'Demo mode - Position yourself'}
            {status === 'scanning' && 'Scanning your face...'}
            {status === 'complete' && 'Scan successful!'}
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
          Keep your face visible and still. Scanning will start automatically.
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
          >
            <Play className="w-5 h-5 mr-2" />
            Start Camera
          </Button>
          
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
        
        <p className="text-sm text-gray-500 mt-4">
          Demo mode works without camera permissions
        </p>
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