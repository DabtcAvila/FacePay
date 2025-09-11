'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Zap, Camera, ArrowRight, Play, CheckCircle, Eye, Fingerprint, Smartphone, AlertTriangle, QrCode, Send, History, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FaceScanAnimation from '@/components/FaceScanAnimation';
import PaymentForm from '@/components/PaymentForm';
import RegistrationFlow from '@/components/RegistrationFlow';
import BiometricWithFallback from '@/components/BiometricWithFallback';
import OptimizedImage, { MobileOptimizedImage } from '@/components/mobile/OptimizedImage';
import { WebAuthnService, type WebAuthnCapabilities } from '@/services/webauthn';

export default function MobileLandingPage() {
  const [showDemo, setShowDemo] = useState(false);
  const [demoMode, setDemoMode] = useState<'scan' | 'payment' | 'register' | 'biometric'>('scan');
  const [webAuthnCapabilities, setWebAuthnCapabilities] = useState<WebAuthnCapabilities | null>(null);
  const [capabilitiesLoading, setCapabilitiesLoading] = useState(true);
  const [biometricReady, setBiometricReady] = useState(false);

  // Check device capabilities on load
  useEffect(() => {
    const checkCapabilities = async () => {
      try {
        const capabilities = await WebAuthnService.checkBrowserCapabilities();
        setWebAuthnCapabilities(capabilities);
        setBiometricReady(capabilities.isSupported && capabilities.isPlatformAuthenticatorAvailable);
      } catch (error) {
        console.error('Error checking capabilities:', error);
      } finally {
        setCapabilitiesLoading(false);
      }
    };
    
    checkCapabilities();
  }, []);

  const handleBiometricAuth = () => {
    setShowDemo(true);
    setDemoMode('biometric');
  };

  const handleBiometricSuccess = (result?: any) => {
    console.log('[MobileLandingPage] Biometric auth success:', result);
    setTimeout(() => {
      setDemoMode('payment');
    }, 1500);
  };

  const closeModal = () => {
    setShowDemo(false);
  };

  const quickActions = [
    {
      id: 'face-scan',
      icon: Camera,
      label: 'Face Scan',
      description: 'Instant auth',
      gradient: 'from-blue-500 to-blue-600',
      action: () => handleBiometricAuth()
    },
    {
      id: 'qr-pay',
      icon: QrCode,
      label: 'QR Pay',
      description: 'Scan & pay',
      gradient: 'from-green-500 to-green-600',
      action: () => {
        setShowDemo(true);
        setDemoMode('scan');
      }
    },
    {
      id: 'send-money',
      icon: Send,
      label: 'Send',
      description: 'To contacts',
      gradient: 'from-purple-500 to-purple-600',
      action: () => {
        setShowDemo(true);
        setDemoMode('payment');
      }
    },
    {
      id: 'history',
      icon: History,
      label: 'History',
      description: 'Past payments',
      gradient: 'from-orange-500 to-orange-600',
      action: () => {
        // Navigate to history (in real app)
        console.log('Navigate to history');
      }
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 pb-safe">
      {/* Mobile Header - Compact */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-sm">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-bold text-lg text-gray-900">FacePay</span>
                {biometricReady && (
                  <div className="flex items-center space-x-1">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    <span className="text-xs text-green-600 font-medium">
                      {webAuthnCapabilities?.biometricTypes.includes('face') ? 'Face ID' : 'Touch ID'} Ready
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowDemo(true);
                setDemoMode('register');
              }}
              className="text-sm px-3 py-1"
            >
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Demo Modal */}
      <AnimatePresence>
        {showDemo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex-1">
                  <h3 className="text-xl font-bold">
                    {demoMode === 'biometric' ? 'Biometric Auth' :
                     demoMode === 'register' ? 'Create Account' :
                     demoMode === 'payment' ? 'Quick Payment' :
                     'Face Recognition'}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {demoMode === 'biometric' ? 'Use your device biometrics' :
                     demoMode === 'register' ? 'Get started with FacePay' :
                     demoMode === 'payment' ? 'Complete your transaction' :
                     'Experience face scanning technology'}
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                >
                  ×
                </button>
              </div>

              {demoMode === 'biometric' && (
                <BiometricWithFallback 
                  userId={`demo-user-${Date.now()}`}
                  userName="demo@facepay.com"
                  mode="demo"
                  title="Mobile Biometric Auth"
                  subtitle="Touch sensor or look at camera"
                  onSuccess={handleBiometricSuccess}
                  onError={(error) => console.error('Biometric error:', error)}
                  onCancel={closeModal}
                  showFallbackOptions={true}
                />
              )}

              {demoMode === 'scan' && (
                <div className="text-center space-y-6">
                  <FaceScanAnimation 
                    size="lg"
                    onScanComplete={() => {
                      setTimeout(() => setDemoMode('payment'), 1000);
                    }}
                  />
                  <p className="text-gray-600">
                    Scanning for payment confirmation...
                  </p>
                </div>
              )}

              {demoMode === 'payment' && (
                <PaymentForm 
                  amount={25.99}
                  recipient="Demo Store"
                  onPaymentComplete={closeModal}
                />
              )}

              {demoMode === 'register' && (
                <RegistrationFlow onRegistrationComplete={closeModal} />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section - Mobile Optimized */}
      <section className="px-4 py-8">
        <div className="text-center space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <h1 className="text-3xl font-bold text-gray-900 leading-tight">
              Pay with Your
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent block">
                Face
              </span>
            </h1>
            <p className="text-lg text-gray-600 px-4">
              The fastest and most secure way to pay. Just look at your phone.
            </p>
          </motion.div>

          {/* Device Status Card */}
          {!capabilitiesLoading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl p-4 border border-gray-200 mx-2 shadow-sm"
            >
              <div className="flex items-center justify-center space-x-2 mb-2">
                {biometricReady ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                )}
                <span className="font-semibold text-center">
                  {biometricReady ? 'Your Device is Ready!' : 'Demo Mode Available'}
                </span>
              </div>
              
              {webAuthnCapabilities && (
                <div className="flex justify-center items-center space-x-4 text-sm text-gray-600">
                  {webAuthnCapabilities.biometricTypes.includes('face') && (
                    <div className="flex items-center space-x-1">
                      <Eye className="w-4 h-4" />
                      <span>Face ID</span>
                    </div>
                  )}
                  {webAuthnCapabilities.biometricTypes.includes('fingerprint') && (
                    <div className="flex items-center space-x-1">
                      <Fingerprint className="w-4 h-4" />
                      <span>Touch ID</span>
                    </div>
                  )}
                  {webAuthnCapabilities.deviceInfo?.isMobile && (
                    <div className="flex items-center space-x-1">
                      <Smartphone className="w-4 h-4" />
                      <span>Mobile</span>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* Primary CTA Button - Thumb Friendly */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Button
              onClick={handleBiometricAuth}
              className="w-full mx-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg py-4 rounded-2xl font-semibold shadow-xl"
            >
              <Shield className="w-6 h-6 mr-3" />
              {biometricReady ? 'Use Biometric Auth' : 'Try Demo Mode'}
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Quick Actions Grid - One-Thumb Operation */}
      <section className="px-4 py-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 px-2">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-4">
          {quickActions.map((action, index) => (
            <motion.button
              key={action.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 * index }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={action.action}
              className={`bg-gradient-to-br ${action.gradient} text-white p-6 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-200 min-h-[120px] flex flex-col items-center justify-center space-y-2`}
            >
              <action.icon className="w-8 h-8" />
              <div className="text-center">
                <p className="font-semibold text-base">{action.label}</p>
                <p className="text-xs opacity-90">{action.description}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </section>

      {/* Face Scan Preview */}
      <section className="px-4 py-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl p-6 mx-2 text-white shadow-xl"
        >
          <div className="text-center space-y-4">
            <h3 className="text-xl font-bold">See it in Action</h3>
            <div className="flex justify-center">
              <FaceScanAnimation size="lg" />
            </div>
            <p className="text-blue-100">
              Secure facial recognition technology
            </p>
            <Button
              onClick={() => {
                setShowDemo(true);
                setDemoMode('scan');
              }}
              className="bg-white/20 hover:bg-white/30 text-white border-white/30 w-full py-3 rounded-xl font-semibold"
            >
              <Play className="w-5 h-5 mr-2" />
              Watch Demo
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Features - Mobile Focused */}
      <section className="px-4 py-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 px-2">Why FacePay?</h2>
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm"
          >
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Lightning Fast</h3>
                <p className="text-sm text-gray-600">Pay in under 2 seconds</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm"
          >
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Ultra Secure</h3>
                <p className="text-sm text-gray-600">Military-grade biometric encryption</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm"
          >
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Eye className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">No Passwords</h3>
                <p className="text-sm text-gray-600">Your face is your password</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="px-4 py-8 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="text-center space-y-4"
        >
          <h2 className="text-2xl font-bold text-gray-900">
            Ready to get started?
          </h2>
          <p className="text-gray-600 px-4">
            Join millions using biometric payments
          </p>
          <div className="space-y-3 px-2">
            <Button
              onClick={() => {
                setShowDemo(true);
                setDemoMode('register');
              }}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg py-4 rounded-2xl font-semibold shadow-xl"
            >
              Create Free Account
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              onClick={handleBiometricAuth}
              variant="outline"
              className="w-full py-3 rounded-xl font-semibold border-2"
            >
              Try Biometric Demo
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Add safe area padding for devices with home indicators */}
      <div className="pb-safe" />
    </div>
  );
}