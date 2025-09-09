'use client';

import React, { useState, useEffect, useCallback, memo, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Fingerprint,
  Scan,
  Shield,
  Smartphone,
  Lock,
  X,
  Clock,
  Building2,
  DollarSign,
  Loader2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  Camera,
  UserCheck,
  UserPlus,
  Eye,
  ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WebAuthnService, type WebAuthnCapabilities, type WebAuthnError } from '@/services/webauthn';
import { RealFaceID, type FaceVerificationResult, type FaceEnrollmentResult, type FaceIDError } from '@/services/realFaceID';
import FaceIDHelper from '@/components/FaceIDHelper';
import { cn, formatCurrency, sleep } from '@/lib/utils';

interface PaymentDetails {
  amount: number;
  currency: string;
  merchant: string;
  merchantLogo?: string;
  description?: string;
  reference?: string;
  timestamp: Date;
}

interface PaymentFlowProps {
  isOpen: boolean;
  onClose: () => void;
  paymentDetails: PaymentDetails;
  onSuccess?: (result: any) => void;
  onError?: (error: WebAuthnError) => void;
  demoMode?: boolean;
  className?: string;
}

type PaymentState = 'initial' | 'checking_enrollment' | 'enrolling' | 'authenticating' | 'processing' | 'success' | 'error';

type FaceIDMode = 'webauthn' | 'faceid' | 'fallback';

interface BiometricStatus {
  isAvailable: boolean;
  deviceInfo?: WebAuthnCapabilities;
  error?: WebAuthnError;
}

interface FaceIDStatus {
  isInitialized: boolean;
  isUserEnrolled: boolean;
  error?: FaceIDError;
  confidence?: number;
  lastVerification?: Date;
}

const PaymentFlow: React.FC<PaymentFlowProps> = ({
  isOpen,
  onClose,
  paymentDetails,
  onSuccess,
  onError,
  demoMode = false,
  className
}) => {
  const [paymentState, setPaymentState] = useState<PaymentState>('initial');
  const [biometricStatus, setBiometricStatus] = useState<BiometricStatus>({
    isAvailable: false
  });
  const [faceIDStatus, setFaceIDStatus] = useState<FaceIDStatus>({
    isInitialized: false,
    isUserEnrolled: false
  });
  const [authMode, setAuthMode] = useState<FaceIDMode>('faceid');
  const [isCheckingCapabilities, setIsCheckingCapabilities] = useState(true);
  const [countdown, setCountdown] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [enrollmentProgress, setEnrollmentProgress] = useState(0);
  const [verificationProgress, setVerificationProgress] = useState(0);
  const [confidenceScore, setConfidenceScore] = useState<number | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [faceIDError, setFaceIDError] = useState<FaceIDError | null>(null);
  const [detectionAttempts, setDetectionAttempts] = useState(0);
  const [maxDetectionAttempts] = useState(5);

  const initializeBiometricSystems = useCallback(async () => {
    setIsCheckingCapabilities(true);
    try {
      if (demoMode) {
        // Demo mode - simulate capabilities
        await sleep(500);
        setBiometricStatus({
          isAvailable: true,
          deviceInfo: {
            isSupported: true,
            isPlatformAuthenticatorAvailable: true,
            biometricTypes: ['face', 'fingerprint'],
            biometricAvailability: {
              faceID: true,
              touchID: false,
              windowsHello: false,
              androidFingerprint: false,
              androidFace: false
            },
            deviceInfo: {
              platform: 'iOS',
              isMobile: true,
              isIOS: true,
              isAndroid: false,
              isMacOS: false,
              isWindows: false
            }
          }
        });
        
        setFaceIDStatus({
          isInitialized: true,
          isUserEnrolled: Math.random() > 0.3 // 70% chance user is enrolled in demo
        });
      } else {
        // Check WebAuthn capabilities
        const capabilities = await WebAuthnService.checkBrowserCapabilities();
        setBiometricStatus({
          isAvailable: capabilities.isSupported && capabilities.isPlatformAuthenticatorAvailable,
          deviceInfo: capabilities
        });
        
        // Initialize Face ID service
        const faceIDInitialized = await RealFaceID.initialize();
        const userId = 'user_' + Date.now(); // In real app, get from auth context
        
        setFaceIDStatus({
          isInitialized: faceIDInitialized,
          isUserEnrolled: faceIDInitialized ? RealFaceID.isUserEnrolled(userId) : false
        });
      }
    } catch (error) {
      console.error('Biometric initialization failed:', error);
      setBiometricStatus({
        isAvailable: false,
        error: WebAuthnService.handleWebAuthnError(error)
      });
      setFaceIDStatus({
        isInitialized: false,
        isUserEnrolled: false,
        error: 'UNKNOWN_ERROR' as FaceIDError
      });
    } finally {
      setIsCheckingCapabilities(false);
    }
  }, [demoMode]);
  
  const cleanupFaceID = useCallback(() => {
    if (!demoMode) {
      RealFaceID.cleanup();
    }
    setShowCamera(false);
  }, [demoMode]);

  // Check biometric capabilities when component mounts
  useEffect(() => {
    if (isOpen) {
      initializeBiometricSystems();
      setPaymentState('initial');
      setProcessingProgress(0);
      setEnrollmentProgress(0);
      setVerificationProgress(0);
      setCountdown(0);
      setConfidenceScore(null);
      setFaceIDError(null);
      setDetectionAttempts(0);
    }
    
    return () => {
      if (!isOpen) {
        cleanupFaceID();
      }
    };
  }, [isOpen, initializeBiometricSystems, cleanupFaceID]);

  // Countdown timer effect
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const getBiometricIcon = useCallback(() => {
    if (!biometricStatus.deviceInfo) return Fingerprint;
    
    const { biometricTypes, deviceInfo } = biometricStatus.deviceInfo;
    
    if (biometricTypes.includes('face')) {
      return Scan;
    } else if (biometricTypes.includes('fingerprint')) {
      return Fingerprint;
    } else if (deviceInfo.isMobile) {
      return Smartphone;
    }
    return Lock;
  }, [biometricStatus.deviceInfo]);

  const getBiometricName = useCallback(() => {
    if (!biometricStatus.deviceInfo) return 'Biometric';
    
    const { biometricTypes, deviceInfo } = biometricStatus.deviceInfo;
    
    if (biometricTypes.includes('face')) {
      return deviceInfo.isIOS ? 'Face ID' : 'Face Recognition';
    } else if (biometricTypes.includes('fingerprint')) {
      return deviceInfo.isIOS ? 'Touch ID' : 'Fingerprint';
    } else if (deviceInfo.isMacOS) {
      return 'Touch ID';
    } else if (deviceInfo.isWindows) {
      return 'Windows Hello';
    }
    return 'Biometric Auth';
  }, [biometricStatus.deviceInfo]);

  const simulateProgress = useCallback(async (onProgress: (progress: number) => void) => {
    const stages = [10, 25, 40, 60, 80, 95, 100];
    for (const stage of stages) {
      await sleep(200 + Math.random() * 300);
      onProgress(stage);
    }
  }, []);

  const handleEnrollment = useCallback(async () => {
    if (!faceIDStatus.isInitialized) return;
    
    setPaymentState('enrolling');
    setShowCamera(true);
    setCountdown(30);
    setFaceIDError(null);
    setDetectionAttempts(0);
    
    try {
      const userId = 'user_' + Date.now();
      
      if (demoMode) {
        // Demo enrollment simulation with realistic edge cases
        const shouldSucceed = Math.random() > 0.2; // 80% success rate
        
        if (!shouldSucceed) {
          const errors: FaceIDError[] = ['NO_FACE_DETECTED', 'MULTIPLE_FACES_DETECTED', 'POOR_IMAGE_QUALITY'];
          const randomError = errors[Math.floor(Math.random() * errors.length)];
          setFaceIDError(randomError);
          throw new Error(`Demo: ${randomError}`);
        }
        
        await simulateProgress(setEnrollmentProgress);
        await sleep(1000);
        
        setFaceIDStatus(prev => ({ ...prev, isUserEnrolled: true }));
        setPaymentState('initial');
        setEnrollmentProgress(0);
      } else {
        const result: FaceEnrollmentResult = await RealFaceID.enrollUser(userId, setEnrollmentProgress);
        
        if (result.success) {
          setFaceIDStatus(prev => ({ ...prev, isUserEnrolled: true }));
          setConfidenceScore(result.confidence);
          setPaymentState('initial');
        } else {
          // Map specific errors
          if (result.error?.includes('face')) {
            setFaceIDError('NO_FACE_DETECTED');
          } else if (result.error?.includes('quality')) {
            setFaceIDError('POOR_IMAGE_QUALITY');
          } else {
            setFaceIDError('UNKNOWN_ERROR');
          }
          throw new Error(result.error || 'Enrollment failed');
        }
      }
    } catch (error) {
      setPaymentState('error');
      setFaceIDStatus(prev => ({ 
        ...prev, 
        error: faceIDError || 'UNKNOWN_ERROR' as FaceIDError 
      }));
      onError?.(WebAuthnService.handleWebAuthnError(error));
    } finally {
      setShowCamera(false);
      setCountdown(0);
      setEnrollmentProgress(0);
    }
  }, [faceIDStatus.isInitialized, demoMode, onError, simulateProgress, faceIDError]);

  const handleFaceIDAuthentication = useCallback(async () => {
    if (!faceIDStatus.isInitialized || !faceIDStatus.isUserEnrolled) return;

    setPaymentState('authenticating');
    setShowCamera(true);
    setCountdown(30);
    setFaceIDError(null);
    setDetectionAttempts(prev => prev + 1);

    try {
      const userId = 'user_' + Date.now();
      
      if (demoMode) {
        // Demo mode simulation with edge cases
        await simulateProgress(setVerificationProgress);
        
        // Simulate various scenarios based on attempts
        let mockConfidence: number;
        let shouldFail = false;
        
        if (detectionAttempts === 0) {
          // First attempt - higher success rate
          mockConfidence = 0.88 + Math.random() * 0.1;
        } else if (detectionAttempts < 3) {
          // Subsequent attempts - moderate success
          mockConfidence = 0.75 + Math.random() * 0.15;
          shouldFail = Math.random() < 0.3; // 30% chance of failure
        } else {
          // Too many attempts - lower success
          mockConfidence = 0.6 + Math.random() * 0.2;
          shouldFail = Math.random() < 0.5; // 50% chance of failure
        }
        
        // Simulate specific errors
        if (shouldFail) {
          const errors: FaceIDError[] = [
            'NO_FACE_DETECTED', 
            'LOW_CONFIDENCE', 
            'MULTIPLE_FACES_DETECTED',
            'POOR_IMAGE_QUALITY'
          ];
          const randomError = errors[Math.floor(Math.random() * errors.length)];
          setFaceIDError(randomError);
          throw new Error(`Demo: ${randomError}`);
        }
        
        setConfidenceScore(mockConfidence);
        
        if (mockConfidence >= 0.85) {
          setPaymentState('processing');
          setCountdown(0);
          
          await simulateProgress(setProcessingProgress);
          await sleep(500);
          
          setPaymentState('success');
          setDetectionAttempts(0); // Reset on success
          onSuccess?.({
            verified: true,
            confidence: mockConfidence,
            transactionId: `faceid_demo_${Date.now()}`,
            timestamp: new Date(),
            method: 'face_id',
            demo: true
          });
        } else {
          setFaceIDError('LOW_CONFIDENCE');
          throw new Error('Face verification failed - confidence too low');
        }
      } else {
        const result: FaceVerificationResult = await RealFaceID.verifyUser(userId, setVerificationProgress);
        
        if (result.success && result.isMatch) {
          setConfidenceScore(result.confidence);
          setPaymentState('processing');
          setCountdown(0);
          setDetectionAttempts(0); // Reset on success
          
          await simulateProgress(setProcessingProgress);
          await sleep(500);
          
          setPaymentState('success');
          onSuccess?.({
            verified: true,
            confidence: result.confidence,
            transactionId: `faceid_${Date.now()}`,
            timestamp: result.timestamp,
            method: 'face_id',
            userId: result.userId
          });
        } else {
          // Map specific errors based on result
          if (result.error?.includes('face')) {
            setFaceIDError('NO_FACE_DETECTED');
          } else if (result.error?.includes('confidence')) {
            setFaceIDError('LOW_CONFIDENCE');
          } else if (result.error?.includes('multiple')) {
            setFaceIDError('MULTIPLE_FACES_DETECTED');
          } else {
            setFaceIDError('UNKNOWN_ERROR');
          }
          throw new Error(result.error || 'Face verification failed');
        }
      }
    } catch (error) {
      setPaymentState('error');
      setCountdown(0);
      onError?.(WebAuthnService.handleWebAuthnError(error));
    } finally {
      setShowCamera(false);
      setVerificationProgress(0);
    }
  }, [faceIDStatus.isInitialized, faceIDStatus.isUserEnrolled, demoMode, detectionAttempts, onSuccess, onError, simulateProgress]);

  const handleWebAuthnAuthentication = useCallback(async () => {
    if (!biometricStatus.isAvailable) return;

    setPaymentState('authenticating');
    setCountdown(30);

    try {
      if (demoMode) {
        await sleep(2000 + Math.random() * 1000);
        
        if (Math.random() > 0.1) {
          setPaymentState('processing');
          setCountdown(0);
          
          await simulateProgress(setProcessingProgress);
          await sleep(500);
          
          setPaymentState('success');
          onSuccess?.({
            verified: true,
            transactionId: `webauthn_demo_${Date.now()}`,
            timestamp: new Date(),
            method: 'webauthn',
            demo: true
          });
        } else {
          throw new Error('Demo authentication failed');
        }
      } else {
        // TODO: Use real biometric API endpoint
        // Simulate authentication start for demo
        await sleep(1000);

        // TODO: Replace with actual WebAuthn API call
        // For now, simulate successful authentication
        const credential = { id: 'demo_credential_' + Date.now() };

        if (!credential) {
          throw new Error('Authentication cancelled');
        }

        setPaymentState('processing');
        setCountdown(0);

        // TODO: Use real biometric API completion endpoint
        // Simulate successful authentication completion
        
        // Simulate successful verification for demo
        if (true) {
          await simulateProgress(setProcessingProgress);
          await sleep(500);
          
          setPaymentState('success');
          onSuccess?.({ verified: true, biometric: true }); // Demo result
        } else {
          throw new Error('Authentication verification failed');
        }
      }
    } catch (error) {
      const webAuthnError = WebAuthnService.handleWebAuthnError(error);
      setPaymentState('error');
      setCountdown(0);
      onError?.(webAuthnError);
    }
  }, [biometricStatus.isAvailable, demoMode, onSuccess, onError, simulateProgress]);

  const handleRetry = useCallback(() => {
    setPaymentState('initial');
    setProcessingProgress(0);
    setEnrollmentProgress(0);
    setVerificationProgress(0);
    setCountdown(0);
    setConfidenceScore(null);
    setShowCamera(false);
    setFaceIDError(null);
    // Don't reset detection attempts to track retry count
  }, []);
  
  const handleSwitchToFallback = useCallback(() => {
    setAuthMode('webauthn');
    setPaymentState('initial');
    setFaceIDError(null);
    setDetectionAttempts(0);
    setConfidenceScore(null);
  }, []);
  
  const switchAuthMode = useCallback((mode: FaceIDMode) => {
    setAuthMode(mode);
    setPaymentState('initial');
    setConfidenceScore(null);
  }, []);

  const renderPaymentDetails = () => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-gray-50 to-blue-50/50 rounded-2xl p-6 space-y-4"
    >
      {/* Merchant info */}
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
          {paymentDetails.merchantLogo ? (
            <img 
              src={paymentDetails.merchantLogo} 
              alt={paymentDetails.merchant}
              className="w-full h-full rounded-xl object-cover"
            />
          ) : (
            <Building2 className="w-6 h-6 text-white" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">
            {paymentDetails.merchant}
          </h3>
          <p className="text-sm text-gray-600">
            {paymentDetails.description || 'Payment'}
          </p>
        </div>
      </div>

      {/* Amount */}
      <div className="text-center py-4">
        <div className="flex items-center justify-center space-x-2">
          <DollarSign className="w-6 h-6 text-gray-600" />
          <span className="text-4xl font-bold text-gray-900">
            {formatCurrency(paymentDetails.amount, paymentDetails.currency)}
          </span>
        </div>
        {paymentDetails.reference && (
          <p className="text-sm text-gray-500 mt-2">
            Ref: {paymentDetails.reference}
          </p>
        )}
      </div>

      {/* Timestamp */}
      <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
        <Clock className="w-4 h-4" />
        <span>{paymentDetails.timestamp.toLocaleTimeString()}</span>
      </div>
    </motion.div>
  );

  const renderFaceIDPrompt = () => {
    const isEnrolling = paymentState === 'enrolling';
    const isAuthenticating = paymentState === 'authenticating';
    const progress = isEnrolling ? enrollmentProgress : verificationProgress;
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-6"
      >
        {/* Face ID Icon with Camera Preview */}
        <div className="relative">
          <motion.div
            className="w-32 h-32 mx-auto bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center relative overflow-hidden"
            animate={{ 
              boxShadow: (isEnrolling || isAuthenticating)
                ? ['0 0 0 0 rgba(59, 130, 246, 0.4)', '0 0 0 20px rgba(59, 130, 246, 0)']
                : '0 4px 20px rgba(0, 0, 0, 0.1)'
            }}
            transition={{ 
              boxShadow: { 
                duration: 1.5, 
                repeat: (isEnrolling || isAuthenticating) ? Infinity : 0 
              } 
            }}
          >
            {showCamera && !demoMode && RealFaceID.getVideoElement() ? (
              <video
                ref={node => {
                  if (node && RealFaceID.getVideoElement()) {
                    node.srcObject = RealFaceID.getVideoElement()!.srcObject;
                  }
                }}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <Scan className="w-16 h-16 text-blue-600" />
            )}
            
            {(isEnrolling || isAuthenticating) && progress > 0 && (
              <div className="absolute inset-2">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="50%"
                    cy="50%"
                    r="45%"
                    fill="none"
                    stroke="rgba(59, 130, 246, 0.2)"
                    strokeWidth="3"
                  />
                  <motion.circle
                    cx="50%"
                    cy="50%"
                    r="45%"
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth="3"
                    strokeDasharray="283"
                    initial={{ strokeDashoffset: 283 }}
                    animate={{ strokeDashoffset: 283 - (283 * progress) / 100 }}
                    transition={{ duration: 0.5 }}
                  />
                </svg>
              </div>
            )}
          </motion.div>

          {/* Security Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute -bottom-2 -right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center space-x-1"
          >
            <ShieldCheck className="w-3 h-3" />
            <span>SECURE</span>
          </motion.div>

          {demoMode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute -top-2 -left-2 bg-yellow-400 text-yellow-800 text-xs font-bold px-2 py-1 rounded-full flex items-center space-x-1"
            >
              <Sparkles className="w-3 h-3" />
              <span>DEMO</span>
            </motion.div>
          )}
        </div>

        {/* Status Text */}
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-gray-900">
            {isEnrolling ? 'Enrolling Face ID...' : 
             isAuthenticating ? 'Verifying Face ID...' :
             !faceIDStatus.isUserEnrolled ? 'Enroll Face ID' :
             'Face ID Ready'}
          </h3>
          <p className="text-gray-600">
            {isEnrolling ? 'Position your face in the camera and hold steady' :
             isAuthenticating ? 'Look directly at the camera to verify your identity' :
             !faceIDStatus.isUserEnrolled ? 'Set up Face ID to secure your payments' :
             'Confirm your payment with Face ID'}
          </p>
          
          {(isEnrolling || isAuthenticating) && progress > 0 && (
            <p className="text-sm text-blue-600 font-medium">
              {progress}% complete
            </p>
          )}
        </div>

        {/* Confidence Score */}
        {confidenceScore && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-50 border border-green-200 rounded-lg p-3"
          >
            <div className="flex items-center space-x-2">
              <Eye className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                Confidence: {Math.round(confidenceScore * 100)}%
              </span>
            </div>
          </motion.div>
        )}

        {countdown > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center space-x-2 text-sm text-gray-500"
          >
            <Clock className="w-4 h-4" />
            <span>Timeout in {countdown}s</span>
          </motion.div>
        )}
      </motion.div>
    );
  };
  
  const renderBiometricPrompt = () => {
    const BiometricIcon = getBiometricIcon();
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-6"
      >
        <div className="relative">
          <motion.div
            className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center relative overflow-hidden"
            animate={{ 
              boxShadow: paymentState === 'authenticating' 
                ? ['0 0 0 0 rgba(59, 130, 246, 0.4)', '0 0 0 20px rgba(59, 130, 246, 0)']
                : '0 4px 20px rgba(0, 0, 0, 0.1)'
            }}
            transition={{ 
              boxShadow: { 
                duration: 1.5, 
                repeat: paymentState === 'authenticating' ? Infinity : 0 
              } 
            }}
          >
            <BiometricIcon className="w-12 h-12 text-blue-600" />
            
            {paymentState === 'authenticating' && (
              <motion.div
                className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            )}
          </motion.div>

          {demoMode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-800 text-xs font-bold px-2 py-1 rounded-full flex items-center space-x-1"
            >
              <Sparkles className="w-3 h-3" />
              <span>DEMO</span>
            </motion.div>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-gray-900">
            {paymentState === 'authenticating' ? 'Authenticating...' : `Use ${getBiometricName()}`}
          </h3>
          <p className="text-gray-600">
            {paymentState === 'authenticating'
              ? `Please follow the ${getBiometricName()} prompt on your device`
              : `Confirm your payment with ${getBiometricName()}`
            }
          </p>
        </div>

        {countdown > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center space-x-2 text-sm text-gray-500"
          >
            <Clock className="w-4 h-4" />
            <span>Timeout in {countdown}s</span>
          </motion.div>
        )}
      </motion.div>
    );
  };

  const renderProcessing = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-center space-y-6"
    >
      <div className="relative">
        <div className="w-24 h-24 mx-auto bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 className="w-12 h-12 text-green-600" />
          </motion.div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-900">Processing Payment</h3>
        <p className="text-gray-600">Please wait while we process your transaction</p>
        
        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <motion.div
            className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${processingProgress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <p className="text-sm text-gray-500">{processingProgress}% complete</p>
      </div>
    </motion.div>
  );

  const renderSuccess = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center space-y-6"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        className="w-24 h-24 mx-auto bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center"
      >
        <CheckCircle2 className="w-12 h-12 text-green-600" />
      </motion.div>

      <div className="space-y-2">
        <motion.h3
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-xl font-semibold text-gray-900"
        >
          Payment Successful!
        </motion.h3>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-gray-600"
        >
          Your payment of {formatCurrency(paymentDetails.amount, paymentDetails.currency)} has been processed
        </motion.p>
      </div>

      {/* Confetti effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 20 }, (_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full"
            initial={{
              x: Math.random() * 400,
              y: -10,
              rotate: 0,
              scale: Math.random() * 0.5 + 0.5
            }}
            animate={{
              y: 500,
              rotate: 360,
              opacity: [1, 1, 0]
            }}
            transition={{
              duration: 3,
              delay: Math.random() * 2,
              ease: "easeOut"
            }}
          />
        ))}
      </div>
    </motion.div>
  );

  const renderError = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center space-y-6"
    >
      <div className="w-24 h-24 mx-auto bg-gradient-to-br from-red-100 to-pink-100 rounded-full flex items-center justify-center">
        <AlertCircle className="w-12 h-12 text-red-600" />
      </div>

      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-gray-900">Payment Failed</h3>
        <p className="text-gray-600">
          {biometricStatus.error?.message || 'An error occurred during payment processing'}
        </p>
        {biometricStatus.error?.suggestedAction && (
          <p className="text-sm text-gray-500">
            {biometricStatus.error.suggestedAction}
          </p>
        )}
      </div>
    </motion.div>
  );

  const renderUnsupported = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-center space-y-6"
    >
      <div className="w-24 h-24 mx-auto bg-gradient-to-br from-orange-100 to-yellow-100 rounded-full flex items-center justify-center">
        <AlertTriangle className="w-12 h-12 text-orange-600" />
      </div>

      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-gray-900">Biometric Authentication Unavailable</h3>
        <p className="text-gray-600">
          Your device doesn't support biometric authentication or it's not set up.
        </p>
        <p className="text-sm text-gray-500">
          Please use alternative payment methods.
        </p>
      </div>
    </motion.div>
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 50 }}
          className={cn(
            "bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden",
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Secure Payment</h2>
                {demoMode && (
                  <p className="text-xs text-yellow-600 font-medium">Demo Mode</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Payment Details */}
            {renderPaymentDetails()}

            {/* Auth Mode Selector */}
            {!isCheckingCapabilities && (biometricStatus.isAvailable || faceIDStatus.isInitialized) && paymentState === 'initial' && (
              <div className="flex bg-gray-100 rounded-lg p-1 space-x-1">
                <button
                  onClick={() => switchAuthMode('faceid')}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors",
                    authMode === 'faceid' 
                      ? "bg-white text-blue-600 shadow-sm" 
                      : "text-gray-600 hover:text-gray-900"
                  )}
                  disabled={!faceIDStatus.isInitialized}
                >
                  <div className="flex items-center justify-center space-x-1">
                    <Scan className="w-4 h-4" />
                    <span>Face ID</span>
                  </div>
                </button>
                <button
                  onClick={() => switchAuthMode('webauthn')}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors",
                    authMode === 'webauthn' 
                      ? "bg-white text-blue-600 shadow-sm" 
                      : "text-gray-600 hover:text-gray-900"
                  )}
                  disabled={!biometricStatus.isAvailable}
                >
                  <div className="flex items-center justify-center space-x-1">
                    <Fingerprint className="w-4 h-4" />
                    <span>Biometric</span>
                  </div>
                </button>
              </div>
            )}

            {/* Authentication Content */}
            <div className="relative min-h-[280px] flex items-center justify-center">
              {isCheckingCapabilities ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center space-y-4"
                >
                  <motion.div
                    className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  <p className="text-gray-600">Checking device capabilities...</p>
                </motion.div>
              ) : (!biometricStatus.isAvailable && !faceIDStatus.isInitialized) ? (
                renderUnsupported()
              ) : paymentState === 'success' ? (
                renderSuccess()
              ) : paymentState === 'error' ? (
                renderError()
              ) : paymentState === 'processing' ? (
                renderProcessing()
              ) : (paymentState === 'enrolling' || paymentState === 'authenticating') && authMode === 'faceid' ? (
                renderFaceIDPrompt()
              ) : authMode === 'faceid' && faceIDStatus.isInitialized ? (
                <div className="space-y-4">
                  {renderFaceIDPrompt()}
                  {faceIDError && (
                    <FaceIDHelper error={faceIDError} className="mt-4" />
                  )}
                  {paymentState === 'initial' && !faceIDError && (
                    <FaceIDHelper tips className="mt-4" />
                  )}
                </div>
              ) : (
                renderBiometricPrompt()
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-4">
              {paymentState === 'initial' && authMode === 'faceid' && faceIDStatus.isInitialized && !faceIDStatus.isUserEnrolled && (
                <Button
                  onClick={handleEnrollment}
                  className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium rounded-xl"
                  size="lg"
                >
                  <span className="flex items-center justify-center space-x-2">
                    <UserPlus className="w-4 h-4" />
                    <span>Enroll Face ID</span>
                  </span>
                </Button>
              )}
              
              {paymentState === 'initial' && authMode === 'faceid' && faceIDStatus.isInitialized && faceIDStatus.isUserEnrolled && (
                <Button
                  onClick={handleFaceIDAuthentication}
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-xl"
                  size="lg"
                >
                  <span className="flex items-center justify-center space-x-2">
                    <Scan className="w-4 h-4" />
                    <span>Pay with Face ID</span>
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </Button>
              )}
              
              {paymentState === 'initial' && authMode === 'webauthn' && biometricStatus.isAvailable && (
                <Button
                  onClick={handleWebAuthnAuthentication}
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-xl"
                  size="lg"
                >
                  <span className="flex items-center justify-center space-x-2">
                    <span>Pay with {getBiometricName()}</span>
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </Button>
              )}

              {paymentState === 'error' && (
                <div className="space-y-2">
                  <Button
                    onClick={handleRetry}
                    className="w-full h-12"
                    size="lg"
                    disabled={detectionAttempts >= maxDetectionAttempts}
                  >
                    {detectionAttempts >= maxDetectionAttempts ? 'Max Attempts Reached' : 'Try Again'}
                  </Button>
                  
                  {authMode === 'faceid' && detectionAttempts >= 2 && biometricStatus.isAvailable && (
                    <Button
                      onClick={handleSwitchToFallback}
                      variant="outline"
                      className="w-full h-12"
                      size="lg"
                    >
                      Use {getBiometricName()} Instead
                    </Button>
                  )}
                  
                  <Button
                    onClick={onClose}
                    variant="outline"
                    className="w-full h-12"
                    size="lg"
                  >
                    Cancel Payment
                  </Button>
                </div>
              )}

              {paymentState === 'success' && (
                <Button
                  onClick={onClose}
                  className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  size="lg"
                >
                  Done
                </Button>
              )}

              {(paymentState === 'initial' || paymentState === 'authenticating' || paymentState === 'enrolling') && (
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="w-full h-12"
                  size="lg"
                  disabled={paymentState === 'authenticating' || paymentState === 'enrolling'}
                >
                  Cancel
                </Button>
              )}
            </div>

            {/* Security Badge */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex items-center justify-center space-x-2 text-xs text-gray-500 bg-gray-50 rounded-lg p-3"
            >
              <Shield className="w-4 h-4" />
              <span>
                {authMode === 'faceid' 
                  ? 'Biometric data encrypted locally'
                  : 'Secured with end-to-end encryption'
                }
              </span>
            </motion.div>
            
            {/* Detection Attempts Counter */}
            {authMode === 'faceid' && detectionAttempts > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-gray-500 text-center bg-gray-50 rounded-lg p-2"
              >
                <p>Attempts: {detectionAttempts}/{maxDetectionAttempts}</p>
                {detectionAttempts >= 2 && (
                  <p className="text-amber-600 mt-1">
                    Having trouble? Try using biometric authentication instead.
                  </p>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Memoize the component for better performance
const MemoizedPaymentFlow = memo(PaymentFlow, (prevProps, nextProps) => {
  // Custom comparison for optimal re-rendering
  return (
    prevProps.isOpen === nextProps.isOpen &&
    prevProps.demoMode === nextProps.demoMode &&
    prevProps.paymentDetails.amount === nextProps.paymentDetails.amount &&
    prevProps.paymentDetails.merchant === nextProps.paymentDetails.merchant
  );
});

MemoizedPaymentFlow.displayName = 'PaymentFlow';

export default MemoizedPaymentFlow;