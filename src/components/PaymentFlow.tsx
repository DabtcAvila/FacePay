'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WebAuthnService, type WebAuthnCapabilities, type WebAuthnError } from '@/services/webauthn';
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

type PaymentState = 'initial' | 'authenticating' | 'processing' | 'success' | 'error';

interface BiometricStatus {
  isAvailable: boolean;
  deviceInfo?: WebAuthnCapabilities;
  error?: WebAuthnError;
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
  const [isCheckingCapabilities, setIsCheckingCapabilities] = useState(true);
  const [countdown, setCountdown] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);

  // Check biometric capabilities when component mounts
  useEffect(() => {
    if (isOpen) {
      checkBiometricCapabilities();
      setPaymentState('initial');
      setProcessingProgress(0);
      setCountdown(0);
    }
  }, [isOpen]);

  // Countdown timer effect
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const checkBiometricCapabilities = useCallback(async () => {
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
            isUserVerificationSupported: true,
            biometricTypes: ['face', 'fingerprint'],
            deviceInfo: {
              platform: 'iOS',
              userAgent: 'demo',
              isMobile: true,
              isIOS: true,
              isAndroid: false,
              isMacOS: false,
              isWindows: false
            }
          }
        });
      } else {
        const capabilities = await WebAuthnService.checkBrowserCapabilities();
        setBiometricStatus({
          isAvailable: capabilities.isSupported && capabilities.isPlatformAuthenticatorAvailable,
          deviceInfo: capabilities
        });
      }
    } catch (error) {
      const webAuthnError = WebAuthnService.handleWebAuthnError(error);
      setBiometricStatus({
        isAvailable: false,
        error: webAuthnError
      });
    } finally {
      setIsCheckingCapabilities(false);
    }
  }, [demoMode]);

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

  const handleAuthentication = useCallback(async () => {
    if (!biometricStatus.isAvailable) return;

    setPaymentState('authenticating');
    setCountdown(30); // 30 second timeout

    try {
      if (demoMode) {
        // Demo mode simulation
        await sleep(2000 + Math.random() * 1000);
        
        // Simulate random success/failure for demo
        if (Math.random() > 0.1) { // 90% success rate in demo
          setPaymentState('processing');
          setCountdown(0);
          
          // Simulate processing with progress
          await simulateProgress(setProcessingProgress);
          await sleep(500);
          
          setPaymentState('success');
          onSuccess?.({
            verified: true,
            transactionId: `demo_${Date.now()}`,
            timestamp: new Date(),
            demo: true
          });
        } else {
          throw new Error('Demo authentication failed');
        }
      } else {
        // Real WebAuthn flow
        const authStart = await WebAuthnService.startAuthentication('user_' + Date.now());
        if (!authStart.success) {
          throw new Error('Failed to start authentication');
        }

        // Create credential request
        const credential = await navigator.credentials.get({
          publicKey: authStart.options as PublicKeyCredentialRequestOptions
        });

        if (!credential) {
          throw new Error('Authentication cancelled');
        }

        setPaymentState('processing');
        setCountdown(0);

        // Complete authentication
        const authComplete = await WebAuthnService.completeAuthentication(credential, 'user');
        
        if (authComplete.success && authComplete.result.verified) {
          await simulateProgress(setProcessingProgress);
          await sleep(500);
          
          setPaymentState('success');
          onSuccess?.(authComplete.result);
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
    setCountdown(0);
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

            {/* Authentication Content */}
            <div className="relative min-h-[200px] flex items-center justify-center">
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
              ) : !biometricStatus.isAvailable ? (
                renderUnsupported()
              ) : paymentState === 'success' ? (
                renderSuccess()
              ) : paymentState === 'error' ? (
                renderError()
              ) : paymentState === 'processing' ? (
                renderProcessing()
              ) : (
                renderBiometricPrompt()
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-4">
              {paymentState === 'initial' && biometricStatus.isAvailable && (
                <Button
                  onClick={handleAuthentication}
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-xl"
                  size="lg"
                >
                  <span className="flex items-center space-x-2">
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
                  >
                    Try Again
                  </Button>
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

              {(paymentState === 'initial' || paymentState === 'authenticating') && (
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="w-full h-12"
                  size="lg"
                  disabled={paymentState === 'authenticating'}
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
              <span>Secured with end-to-end encryption</span>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PaymentFlow;