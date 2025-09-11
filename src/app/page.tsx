'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Zap, Globe, Camera, ArrowRight, Play, CheckCircle, Menu, X, Smartphone, Fingerprint, Eye, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FaceScanAnimation from '@/components/FaceScanAnimation';
import PaymentForm from '@/components/PaymentForm';
import RegistrationFlow from '@/components/RegistrationFlow';
import BiometricWithFallback from '@/components/BiometricWithFallback';
// Legacy imports - deprecated, use BiometricWithFallback instead
import WebAuthnDemo from '@/components/WebAuthnDemo';
import SimpleFaceIDDemo from '@/components/SimpleFaceIDDemo';
import NativeBiometric from '@/components/NativeBiometric';
import { WebAuthnService, type WebAuthnCapabilities } from '@/services/webauthn';

export default function LandingPage() {
  const [showDemo, setShowDemo] = useState(false);
  const [demoMode, setDemoMode] = useState<'scan' | 'payment' | 'register' | 'webauthn' | 'faceid' | 'native' | 'biometric' | 'unified'>('scan');
  const [isScanning, setIsScanning] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  const handleDemoClick = () => {
    setShowDemo(true);
    setDemoMode('unified'); // Always use unified component for smart fallback
  };

  const handleFaceIDDemo = () => {
    setShowDemo(true);
    setDemoMode('faceid');
  };

  const handleFaceIDError = (error: string) => {
    console.error('FaceID Demo error:', error);
    // SimpleFaceIDDemo handles errors internally, this is kept for compatibility
  };

  const handleWebAuthnDemo = () => {
    setShowDemo(true);
    setDemoMode('webauthn');
  };

  const handleNativeBiometricDemo = () => {
    setShowDemo(true);
    setDemoMode('unified'); // Use unified component
  };

  const handleScanComplete = () => {
    setIsScanning(false);
    setTimeout(() => {
      setDemoMode('payment');
    }, 1000);
  };

  const handleBiometricSuccess = (result?: any) => {
    console.log('[LandingPage] handleBiometricSuccess called with result:', result);
    
    // Show success animation first
    console.log('[LandingPage] Transitioning to payment mode...');
    
    setTimeout(() => {
      console.log('[LandingPage] Setting demo mode to payment');
      setDemoMode('payment');
    }, 1500); // Slightly longer delay to allow success animation
  };

  // Reset states when closing modal
  const closeModal = () => {
    setShowDemo(false);
    setIsScanning(false);
    setMobileMenuOpen(false);
  };

  const features = [
    {
      icon: ShieldCheck,
      title: 'Military-Grade Security',
      description: 'Advanced biometric encryption protects your identity and transactions',
      color: 'text-blue-600'
    },
    {
      icon: Zap,
      title: 'Instant Payments',
      description: 'Complete transactions in seconds with just a glance',
      color: 'text-yellow-600'
    },
    {
      icon: Globe,
      title: 'Global Acceptance',
      description: 'Use FacePay anywhere, anytime with universal compatibility',
      color: 'text-green-600'
    },
    {
      icon: Camera,
      title: 'Passwordless Future',
      description: 'Never remember passwords again - your face is your key',
      color: 'text-purple-600'
    }
  ];

  const stats = [
    { label: 'Active Users', value: '2.5M+' },
    { label: 'Transactions', value: '500M+' },
    { label: 'Success Rate', value: '99.9%' },
    { label: 'Countries', value: '150+' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3 sm:py-4">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <span className="text-lg sm:text-xl font-bold text-gray-900">FacePay</span>
            </div>
            
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-600 hover:text-blue-600 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Desktop navigation */}
            <nav className="hidden md:flex space-x-6">
              <a href="#features" className="text-gray-600 hover:text-blue-600 transition-colors">Features</a>
              <a href="#security" className="text-gray-600 hover:text-blue-600 transition-colors">Security</a>
              <a href="#pricing" className="text-gray-600 hover:text-blue-600 transition-colors">Pricing</a>
              <a href="#contact" className="text-gray-600 hover:text-blue-600 transition-colors">Contact</a>
            </nav>

            {/* Desktop CTA buttons */}
            <div className="hidden md:flex items-center space-x-4">
              <Button variant="outline" onClick={() => { setShowDemo(true); setDemoMode('register'); }} className="text-sm">
                Sign In
              </Button>
              <Button onClick={() => { setShowDemo(true); setDemoMode('register'); }} className="bg-blue-600 hover:bg-blue-700 text-sm">
                Get Started
              </Button>
            </div>
          </div>

          {/* Mobile menu */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="md:hidden border-t border-gray-200 py-4"
              >
                <nav className="flex flex-col space-y-3">
                  <a href="#features" className="text-gray-600 hover:text-blue-600 transition-colors py-2">Features</a>
                  <a href="#security" className="text-gray-600 hover:text-blue-600 transition-colors py-2">Security</a>
                  <a href="#pricing" className="text-gray-600 hover:text-blue-600 transition-colors py-2">Pricing</a>
                  <a href="#contact" className="text-gray-600 hover:text-blue-600 transition-colors py-2">Contact</a>
                  <div className="flex flex-col space-y-2 pt-3 border-t border-gray-200">
                    <Button variant="outline" onClick={() => { setShowDemo(true); setDemoMode('register'); }} className="w-full">
                      Sign In
                    </Button>
                    <Button onClick={() => { setShowDemo(true); setDemoMode('register'); }} className="bg-blue-600 hover:bg-blue-700 w-full">
                      Get Started
                    </Button>
                  </div>
                </nav>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      <AnimatePresence>
        {showDemo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="modal-content p-4 sm:p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">
                    {(demoMode === 'biometric' || demoMode === 'unified') ? 'Smart Biometric Authentication with Fallbacks' :
                     demoMode === 'native' ? 'Real Biometric Authentication' :
                     demoMode === 'webauthn' ? 'WebAuthn Demo' :
                     demoMode === 'faceid' ? 'Face Recognition Demo' :
                     demoMode === 'register' ? 'Create Account' :
                     'FacePay Demo'}
                  </h3>
                  
                  {/* Demo instructions */}
                  <p className="text-sm text-gray-600 mt-1">
                    {(demoMode === 'biometric' || demoMode === 'unified') ? 'Smart authentication that automatically uses the best available method on your device' :
                     demoMode === 'native' ? 'Use your device\'s REAL Face ID, Touch ID, or Windows Hello' :
                     demoMode === 'webauthn' ? 'WebAuthn authentication demo' :
                     demoMode === 'faceid' ? 'Test our face recognition technology with your camera' :
                     demoMode === 'scan' ? 'Experience our face scanning animation' :
                     demoMode === 'register' ? 'Create your FacePay account' :
                     'Try our payment demo'}
                  </p>
                </div>
                
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 ml-4 flex-shrink-0"
                >
                  ✕
                </button>
              </div>

              {(demoMode === 'biometric' || demoMode === 'unified') && (
                <BiometricWithFallback 
                  userId={`demo-user-${Date.now()}`}
                  userName="demo@facepay.com"
                  mode={demoMode === 'unified' ? 'demo' : 'authentication'}
                  title="Smart Biometric Authentication"
                  subtitle="Automatically selects the best authentication method"
                  onSuccess={(result) => {
                    console.log('[LandingPage] BiometricWithFallback onSuccess called with result:', result)
                    handleBiometricSuccess(result)
                  }}
                  onError={(error) => {
                    console.error('[LandingPage] BiometricWithFallback onError called:', error)
                  }}
                  onCancel={closeModal}
                  showFallbackOptions={true}
                />
              )}

              {demoMode === 'native' && (
                <NativeBiometric 
                  userId={`demo-user-${Date.now()}`}
                  userName="demo@facepay.com"
                  mode="demo"
                  onSuccess={(result) => {
                    console.log('[LandingPage] NativeBiometric onSuccess called with result:', result)
                    handleBiometricSuccess(result)
                  }}
                  onError={(error) => {
                    console.error('[LandingPage] Native biometric error:', error)
                  }}
                  onCancel={closeModal}
                />
              )}

              {demoMode === 'webauthn' && (
                <WebAuthnDemo 
                  userId={`demo-user-${Date.now()}`}
                  userName="demo@facepay.com"
                  mode="demo"
                  onSuccess={(result) => {
                    console.log('[LandingPage] WebAuthnDemo onSuccess called with result:', result)
                    handleBiometricSuccess(result)
                  }}
                  onError={(error) => {
                    console.error('[LandingPage] WebAuthn error:', error)
                  }}
                />
              )}

              {demoMode === 'faceid' && (
                <SimpleFaceIDDemo 
                  onScanComplete={(result) => {
                    console.log('[LandingPage] SimpleFaceIDDemo onScanComplete called with result:', result)
                    handleBiometricSuccess(result)
                  }}
                  onCancel={closeModal}
                />
              )}


              {demoMode === 'scan' && (
                <div className="text-center space-y-6">
                  <h4 className="text-xl font-semibold text-gray-900">Try Face Recognition</h4>
                  <FaceScanAnimation 
                    isScanning={isScanning}
                    onScanComplete={handleScanComplete}
                    size="lg"
                  />
                  <p className="text-gray-600">
                    Experience lightning-fast biometric authentication
                  </p>
                  
                  {/* Fallback options in animation demo */}
                  <div className="flex gap-2 justify-center mt-4">
                    {biometricReady && (
                      <Button 
                        onClick={() => {
                            setDemoMode('native');
                        }}
                        variant="outline" 
                        size="sm"
                      >
                        Try Real Biometrics
                      </Button>
                    )}
                    <Button 
                      onClick={() => {
                        setDemoMode('faceid');
                      }}
                      variant="outline" 
                      size="sm"
                    >
                      Camera Demo
                    </Button>
                  </div>
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

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-32">
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-6 sm:mb-8">
              <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200 mb-4">
                <ShieldCheck className="w-4 h-4 mr-2" />
                Enterprise-grade security meets consumer simplicity
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 sm:mb-8 leading-tight tracking-tight">
              The Future of
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent block sm:inline">
                {' '}Biometric Payments
              </span>
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-gray-600 mb-8 sm:mb-10 max-w-4xl mx-auto px-2 leading-relaxed">
              Experience revolutionary payment technology with military-grade facial recognition. 
              Secure, instant, and passwordless transactions that adapt to your lifestyle.
            </p>
          </motion.div>

          {/* Biometric Authentication Options */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-8 sm:mb-12"
          >
            {/* Device Capability Status */}
            {!capabilitiesLoading && (
              <div className="mb-6 p-4 rounded-lg border">
                <div className="flex items-center justify-center space-x-2 mb-3">
                  {biometricReady ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  )}
                  <span className="font-medium">
                    {biometricReady 
                      ? `Real ${webAuthnCapabilities?.deviceInfo?.isMobile ? 'Mobile' : 'Desktop'} Biometric Authentication Ready`
                      : 'Real Biometric Authentication Not Available - Demo Mode Available'
                    }
                  </span>
                </div>
                
                {webAuthnCapabilities && (
                  <div className="text-sm text-gray-600 text-center">
                    {biometricReady ? (
                      <div className="flex justify-center items-center space-x-4">
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
                            <span>Mobile Biometrics</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span>Use demo mode to experience the interface</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-2xl mx-auto">
              {biometricReady ? (
                <>
                  <Button
                    onClick={handleNativeBiometricDemo}
                    className="btn-primary text-lg px-8 py-4 payment-flow-glow w-full sm:w-auto min-w-[200px] shadow-2xl"
                  >
                    <ShieldCheck className="w-5 h-5 mr-3" />
                    Try Smart Biometrics
                    <ArrowRight className="w-5 h-5 ml-3" />
                  </Button>
                  
                  <Button
                    onClick={handleFaceIDDemo}
                    variant="outline"
                    className="text-lg px-8 py-4 w-full sm:w-auto border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-all duration-300"
                  >
                    <Camera className="w-5 h-5 mr-3" />
                    Camera Demo
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={handleDemoClick}
                    className="btn-primary text-lg px-8 py-4 payment-flow-glow w-full sm:w-auto min-w-[200px] shadow-2xl"
                  >
                    <ShieldCheck className="w-5 h-5 mr-3" />
                    Try Demo Experience
                    <ArrowRight className="w-5 h-5 ml-3" />
                  </Button>
                  
                  <Button
                    onClick={handleFaceIDDemo}
                    variant="outline"
                    className="text-lg px-8 py-4 w-full sm:w-auto border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-all duration-300"
                  >
                    <Camera className="w-5 h-5 mr-3" />
                    Camera Demo
                  </Button>
                </>
              )}
            </div>
            
            {/* Secondary CTA */}
            <div className="mt-8 pt-6 border-t border-gray-200 max-w-lg mx-auto">
              <p className="text-gray-600 mb-4 text-center">Ready to get started?</p>
              <Button
                onClick={() => { setShowDemo(true); setDemoMode('register'); }}
                variant="outline"
                className="w-full text-base px-6 py-3 border-2 border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-500 transition-all duration-300"
              >
                Create Your Account
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mb-16 sm:mb-20 max-w-5xl mx-auto"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                className="text-center p-6 bg-white/50 backdrop-blur-sm rounded-2xl border border-gray-200/50 hover:bg-white/70 hover:shadow-lg transition-all duration-300"
              >
                <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                  {stat.value}
                </div>
                <div className="text-sm sm:text-base font-medium text-gray-700">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Hero Visual - Enhanced Interactive Demo Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="relative max-w-6xl mx-auto"
        >
          <div className="card-premium p-6 sm:p-8 lg:p-10 shadow-2xl hover:shadow-3xl transition-all duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              <div className="space-y-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className={`w-3 h-3 rounded-full ${biometricReady ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`}></div>
                  <span className="text-lg font-semibold text-gray-900">
                    {biometricReady ? 'Live Biometric System Ready' : 'Demo Environment Active'}
                  </span>
                </div>
                
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
                  {biometricReady ? 'Your Device Supports Real Biometrics' : 'Experience Our Demo Platform'}
                </h3>
                
                <div className="space-y-4">
                  <div className={`flex items-start space-x-3 ${biometricReady ? 'text-green-700' : 'text-blue-700'}`}>
                    {biometricReady ? (
                      <CheckCircle className="w-6 h-6 mt-0.5 flex-shrink-0" />
                    ) : (
                      <Play className="w-6 h-6 mt-0.5 flex-shrink-0" />
                    )}
                    <div>
                      <p className="font-semibold text-base">
                        {biometricReady ? 'Real Biometric Authentication' : 'Interactive Demo Available'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {biometricReady 
                          ? 'Your device can use Face ID, Touch ID, or Windows Hello for secure authentication'
                          : 'Experience our complete authentication flow without real biometric enrollment'
                        }
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3 text-green-700">
                    <CheckCircle className="w-6 h-6 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-base">Bank-Grade Security</p>
                      <p className="text-sm text-gray-600">256-bit AES encryption with zero-knowledge architecture</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3 text-green-700">
                    <CheckCircle className="w-6 h-6 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-base">Instant Processing</p>
                      <p className="text-sm text-gray-600">Sub-second authentication with 99.97% uptime SLA</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="relative">
                <div className="relative z-10 flex justify-center">
                  <FaceScanAnimation size="lg" />
                </div>
                
                {/* Background glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-3xl scale-150 -z-10"></div>
              </div>
            </div>
            
            {/* Enhanced Device Capabilities */}
            {webAuthnCapabilities && !capabilitiesLoading && (
              <div className="border-t border-gray-200 mt-8 pt-8">
                <h4 className="text-lg font-semibold text-gray-900 mb-6 text-center">Your Device Capabilities</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                    <Smartphone className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                    <div className="text-xs text-gray-600 mb-1">Platform</div>
                    <div className="text-sm font-bold text-gray-900">
                      {webAuthnCapabilities.deviceInfo?.isMobile ? 'Mobile' : 'Desktop'}
                    </div>
                  </div>
                  
                  <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100">
                    <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-green-600" />
                    <div className="text-xs text-gray-600 mb-1">WebAuthn</div>
                    <div className={`text-sm font-bold ${webAuthnCapabilities.isSupported ? 'text-green-700' : 'text-red-600'}`}>
                      {webAuthnCapabilities.isSupported ? 'Supported' : 'Not Available'}
                    </div>
                  </div>
                  
                  <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl border border-purple-100">
                    <Fingerprint className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                    <div className="text-xs text-gray-600 mb-1">Biometrics</div>
                    <div className="text-sm font-bold text-gray-900">
                      {webAuthnCapabilities.biometricTypes.length > 0 
                        ? webAuthnCapabilities.biometricTypes.slice(0,2).join(', ')
                        : 'Demo Mode'
                      }
                    </div>
                  </div>
                  
                  <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border border-orange-100">
                    <Eye className="w-8 h-8 mx-auto mb-2 text-orange-600" />
                    <div className="text-xs text-gray-600 mb-1">Status</div>
                    <div className={`text-sm font-bold ${biometricReady ? 'text-green-700' : 'text-orange-600'}`}>
                      {biometricReady ? 'Ready' : 'Demo Only'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 sm:py-32 bg-gradient-to-b from-white via-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 sm:mb-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-block px-4 py-2 rounded-full text-sm font-medium bg-blue-100 text-blue-700 border border-blue-200 mb-6">
                Enterprise Features
              </span>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Why Industry Leaders
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent block sm:inline">
                  {' '}Choose FacePay
                </span>
              </h2>
              <p className="text-xl sm:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                Revolutionary biometric technology trusted by Fortune 500 companies worldwide
              </p>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="group relative"
                >
                  <div className="card-premium p-8 h-full text-center hover-lift">
                    <div className="relative mb-8">
                      <div className={`w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br ${
                        feature.color === 'text-blue-600' ? 'from-blue-500 to-blue-600' :
                        feature.color === 'text-yellow-600' ? 'from-yellow-500 to-orange-600' :
                        feature.color === 'text-green-600' ? 'from-green-500 to-emerald-600' :
                        'from-purple-500 to-violet-600'
                      } flex items-center justify-center shadow-lg group-hover:shadow-2xl group-hover:scale-110 transition-all duration-500`}>
                        <Icon className="w-10 h-10 text-white" />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-2xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
                    </div>
                    
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 group-hover:text-blue-700 transition-colors duration-300">
                      {feature.title}
                    </h3>
                    
                    <p className="text-gray-600 leading-relaxed">
                      {feature.description}
                    </p>
                    
                    {/* Enhanced feature details */}
                    <div className="mt-6 pt-6 border-t border-gray-100">
                      <div className="flex items-center justify-center space-x-2 text-sm font-medium text-blue-600 group-hover:text-blue-700 transition-colors duration-300">
                        <span>Learn more</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
          
          {/* Additional trust indicators */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-20 text-center"
          >
            <div className="inline-flex items-center space-x-8 p-6 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-lg">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-gray-700">SOC 2 Certified</span>
              </div>
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-gray-700">GDPR Compliant</span>
              </div>
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-gray-700">ISO 27001</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-32 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/90 via-purple-600/90 to-indigo-700/90"></div>
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
            <div className="absolute top-0 right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-4000"></div>
          </div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto"
          >
            <div className="mb-8">
              <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-white/20 text-white/90 border border-white/30 backdrop-blur-sm mb-6">
                <Zap className="w-4 h-4 mr-2" />
                Limited Time: 30-Day Free Trial
              </span>
            </div>
            
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 sm:mb-8 leading-tight">
              Ready to Transform 
              <span className="bg-gradient-to-r from-yellow-300 to-orange-400 bg-clip-text text-transparent block sm:inline">
                {' '}Your Business?
              </span>
            </h2>
            
            <p className="text-xl sm:text-2xl text-blue-100 mb-10 sm:mb-12 max-w-3xl mx-auto leading-relaxed">
              Join Fortune 500 companies using FacePay to secure billions in transactions daily. 
              No setup fees, no commitments.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center max-w-2xl mx-auto mb-12">
              <Button
                onClick={() => {
                  setDemoMode('register');
                  setShowDemo(true);
                }}
                className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-10 py-5 shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-300 w-full sm:w-auto font-semibold"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-3" />
              </Button>
              
              <Button
                onClick={handleDemoClick}
                variant="outline"
                className="border-2 border-white/50 text-white hover:bg-white/10 hover:border-white text-lg px-10 py-5 backdrop-blur-sm w-full sm:w-auto font-semibold transition-all duration-300"
              >
                <ShieldCheck className="w-5 h-5 mr-3" />
                Live Demo
              </Button>
            </div>
            
            {/* Trust indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-2xl mx-auto text-center">
              <div className="text-white/90">
                <div className="text-2xl font-bold mb-1">99.9%</div>
                <div className="text-sm text-blue-100">Uptime SLA</div>
              </div>
              <div className="text-white/90">
                <div className="text-2xl font-bold mb-1">&lt;500ms</div>
                <div className="text-sm text-blue-100">Response Time</div>
              </div>
              <div className="text-white/90">
                <div className="text-2xl font-bold mb-1">256-bit</div>
                <div className="text-sm text-blue-100">Encryption</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
            {/* Brand section */}
            <div className="lg:col-span-2">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold">FacePay</span>
              </div>
              <p className="text-gray-400 text-lg leading-relaxed mb-8 max-w-md">
                Revolutionizing payments with military-grade biometric authentication. 
                Trusted by enterprises worldwide.
              </p>
              
              {/* Newsletter signup */}
              <div className="space-y-4">
                <h4 className="text-white font-semibold">Stay Updated</h4>
                <div className="flex flex-col sm:flex-row gap-3 max-w-md">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                  />
                  <Button className="bg-blue-600 hover:bg-blue-700 px-6 py-3">
                    Subscribe
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Links sections */}
            <div>
              <h4 className="font-semibold mb-6 text-lg">Product</h4>
              <ul className="space-y-4 text-gray-400">
                <li><a href="#features" className="hover:text-white transition-colors hover:underline">Features</a></li>
                <li><a href="#security" className="hover:text-white transition-colors hover:underline">Security</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors hover:underline">Pricing</a></li>
                <li><a href="/api-docs" className="hover:text-white transition-colors hover:underline">API Documentation</a></li>
                <li><a href="/integrations" className="hover:text-white transition-colors hover:underline">Integrations</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-6 text-lg">Company</h4>
              <ul className="space-y-4 text-gray-400">
                <li><a href="/about" className="hover:text-white transition-colors hover:underline">About Us</a></li>
                <li><a href="/careers" className="hover:text-white transition-colors hover:underline">Careers</a></li>
                <li><a href="/press" className="hover:text-white transition-colors hover:underline">Press Kit</a></li>
                <li><a href="/contact" className="hover:text-white transition-colors hover:underline">Contact</a></li>
                <li><a href="/blog" className="hover:text-white transition-colors hover:underline">Blog</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-6 text-lg">Support</h4>
              <ul className="space-y-4 text-gray-400">
                <li><a href="/help" className="hover:text-white transition-colors hover:underline">Help Center</a></li>
                <li><a href="/docs" className="hover:text-white transition-colors hover:underline">Documentation</a></li>
                <li><a href="/status" className="hover:text-white transition-colors hover:underline">System Status</a></li>
                <li><a href="/privacy" className="hover:text-white transition-colors hover:underline">Privacy Policy</a></li>
                <li><a href="/terms" className="hover:text-white transition-colors hover:underline">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          
          {/* Bottom section */}
          <div className="border-t border-gray-800 mt-12 pt-8">
            <div className="flex flex-col lg:flex-row justify-between items-center space-y-6 lg:space-y-0">
              <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-8">
                <p className="text-gray-400">
                  &copy; 2024 FacePay Technologies. All rights reserved.
                </p>
                <div className="flex items-center space-x-6 text-sm text-gray-400">
                  <span className="flex items-center space-x-1">
                    <ShieldCheck className="w-4 h-4 text-green-500" />
                    <span>SOC 2 Certified</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <ShieldCheck className="w-4 h-4 text-green-500" />
                    <span>GDPR Compliant</span>
                  </span>
                </div>
              </div>
              
              {/* Social links */}
              <div className="flex items-center space-x-6">
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <span className="sr-only">Twitter</span>
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"/>
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <span className="sr-only">LinkedIn</span>
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <span className="sr-only">GitHub</span>
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}