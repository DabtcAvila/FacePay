'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Zap, Globe, Camera, ArrowRight, Play, CheckCircle, Menu, X, Smartphone, Fingerprint, Eye, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FaceScanAnimation from '@/components/FaceScanAnimation';
import PaymentForm from '@/components/PaymentForm';
import RegistrationFlow from '@/components/RegistrationFlow';
import WebAuthnDemo from '@/components/WebAuthnDemo';
import SimpleFaceIDDemo from '@/components/SimpleFaceIDDemo';
import NativeBiometric from '@/components/NativeBiometric';
import { WebAuthnService, type WebAuthnCapabilities } from '@/services/webauthn';

export default function LandingPage() {
  const [showDemo, setShowDemo] = useState(false);
  const [demoMode, setDemoMode] = useState<'scan' | 'payment' | 'register' | 'webauthn' | 'faceid' | 'native'>('scan');
  const [isScanning, setIsScanning] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [webAuthnCapabilities, setWebAuthnCapabilities] = useState<WebAuthnCapabilities | null>(null);
  const [capabilitiesLoading, setCapabilitiesLoading] = useState(true);
  const [biometricReady, setBiometricReady] = useState(false);
  const [demoError, setDemoError] = useState<string>('');

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
    setDemoError(''); // Clear any previous errors
    setShowDemo(true);
    // Choose the best available demo mode based on capabilities
    if (biometricReady) {
      setDemoMode('native');
    } else {
      setDemoMode('scan');
      setIsScanning(true);
    }
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
    setDemoError(''); // Clear any previous errors
    setShowDemo(true);
    setDemoMode('webauthn');
  };

  const handleNativeBiometricDemo = () => {
    setDemoError(''); // Clear any previous errors
    setShowDemo(true);
    setDemoMode('native');
  };

  const handleScanComplete = () => {
    setIsScanning(false);
    setTimeout(() => {
      setDemoMode('payment');
    }, 1000);
  };

  const handleBiometricSuccess = () => {
    setDemoError(''); // Clear any errors on success
    setTimeout(() => {
      setDemoMode('payment');
    }, 1000);
  };

  // Reset states when closing modal
  const closeModal = () => {
    setShowDemo(false);
    setDemoError('');
    setIsScanning(false);
    setMobileMenuOpen(false);
  };

  const features = [
    {
      icon: Shield,
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
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
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
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">
                    {demoMode === 'native' ? 'Real Biometric Authentication' :
                     demoMode === 'webauthn' ? 'WebAuthn Demo' :
                     demoMode === 'faceid' ? 'Face Recognition Demo' :
                     demoMode === 'register' ? 'Create Account' :
                     'FacePay Demo'}
                  </h3>
                  
                  {/* Demo instructions */}
                  <p className="text-sm text-gray-600 mt-1">
                    {demoMode === 'native' ? 'Use your device\'s REAL Face ID, Touch ID, or Windows Hello' :
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

              {demoMode === 'native' && (
                <NativeBiometric 
                  userId={`demo-user-${Date.now()}`}
                  userName="demo@facepay.com"
                  mode="demo"
                  onSuccess={handleBiometricSuccess}
                  onError={(error) => console.error('Native biometric error:', error)}
                  onCancel={closeModal}
                />
              )}

              {demoMode === 'webauthn' && (
                <WebAuthnDemo 
                  userId={`demo-user-${Date.now()}`}
                  userName="demo@facepay.com"
                  mode="demo"
                  onSuccess={handleBiometricSuccess}
                  onError={(error) => console.error('WebAuthn error:', error)}
                />
              )}

              {demoMode === 'faceid' && (
                <SimpleFaceIDDemo 
                  onScanComplete={handleBiometricSuccess}
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
                          setDemoError('');
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
                        setDemoError('');
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
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 sm:mb-6 leading-tight">
              The Future of
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent block sm:inline">
                {' '}Payments
              </span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-6 sm:mb-8 max-w-3xl mx-auto px-2">
              Experience revolutionary biometric payments with FacePay. Secure, instant, and passwordless 
              transactions using advanced facial recognition technology.
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
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-4">
              {biometricReady ? (
                <>
                  <Button
                    onClick={handleNativeBiometricDemo}
                    className="bg-blue-600 hover:bg-blue-700 text-base sm:text-lg px-6 sm:px-8 py-2.5 sm:py-3 payment-flow-glow w-full sm:w-auto"
                  >
                    <Shield className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    Use Real {webAuthnCapabilities?.biometricTypes.includes('face') ? 'Face ID' : webAuthnCapabilities?.biometricTypes.includes('fingerprint') ? 'Touch ID' : 'Biometrics'}
                  </Button>
                  
                  <Button
                    onClick={handleFaceIDDemo}
                    variant="outline"
                    className="text-base sm:text-lg px-6 sm:px-8 py-2.5 sm:py-3 w-full sm:w-auto"
                  >
                    <Camera className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    Camera Demo
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={handleDemoClick}
                    className="bg-blue-600 hover:bg-blue-700 text-base sm:text-lg px-6 sm:px-8 py-2.5 sm:py-3 payment-flow-glow w-full sm:w-auto"
                  >
                    <Play className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    Try Demo Mode
                  </Button>
                  
                  <Button
                    onClick={handleFaceIDDemo}
                    variant="outline"
                    className="text-base sm:text-lg px-6 sm:px-8 py-2.5 sm:py-3 w-full sm:w-auto"
                  >
                    <Camera className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    Camera Demo
                  </Button>
                </>
              )}
              
              <Button
                onClick={() => { setShowDemo(true); setDemoMode('register'); }}
                variant="outline"
                className="text-base sm:text-lg px-6 sm:px-8 py-2.5 sm:py-3 w-full sm:w-auto"
              >
                Create Account
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
              </Button>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-12 sm:mb-16"
          >
            {stats.map((stat, index) => (
              <div key={stat.label} className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                  className="text-2xl sm:text-3xl font-bold text-blue-600 mb-1 sm:mb-2"
                >
                  {stat.value}
                </motion.div>
                <div className="text-sm sm:text-base text-gray-600">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Hero Visual - Enhanced with Real Device Info */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="relative max-w-4xl mx-auto"
        >
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-4 sm:p-8 shadow-2xl">
            <div className="bg-white rounded-xl p-4 sm:p-6">
              <div className="flex flex-col md:flex-row items-center justify-between mb-4">
                <div className="flex-1 mb-4 sm:mb-6 md:mb-0">
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
                    {biometricReady ? 'Ready for Biometric Authentication' : 'Secure Payment Processing'}
                  </h3>
                  <div className="space-y-2 sm:space-y-3">
                    <div className={`flex items-center ${biometricReady ? 'text-green-600' : 'text-yellow-600'}`}>
                      {biometricReady ? (
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" />
                      )}
                      <span className="text-sm sm:text-base">
                        {biometricReady ? 'REAL biometric verification active' : 'Demo mode available - no real biometrics'}
                      </span>
                    </div>
                    <div className="flex items-center text-green-600">
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" />
                      <span className="text-sm sm:text-base">End-to-end encryption</span>
                    </div>
                    <div className="flex items-center text-green-600">
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" />
                      <span className="text-sm sm:text-base">Real-time fraud detection</span>
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <FaceScanAnimation size="lg" />
                </div>
              </div>
              
              {/* Device Capabilities Summary */}
              {webAuthnCapabilities && !capabilitiesLoading && (
                <div className="border-t pt-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-600 mb-1">Platform</div>
                      <div className="text-sm font-semibold">
                        {webAuthnCapabilities.deviceInfo?.isMobile ? 'Mobile' : 'Desktop'}
                      </div>
                    </div>
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-600 mb-1">WebAuthn</div>
                      <div className="text-sm font-semibold">
                        {webAuthnCapabilities.isSupported ? 'Supported' : 'Not Available'}
                      </div>
                    </div>
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-600 mb-1">Biometrics</div>
                      <div className="text-sm font-semibold">
                        {webAuthnCapabilities.biometricTypes.length > 0 
                          ? webAuthnCapabilities.biometricTypes.join(', ')
                          : 'Demo Mode'
                        }
                      </div>
                    </div>
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-600 mb-1">Status</div>
                      <div className={`text-sm font-semibold ${
                        biometricReady ? 'text-green-600' : 'text-yellow-600'
                      }`}>
                        {biometricReady ? 'Ready' : 'Demo Only'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-12 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">Why Choose FacePay?</h2>
            <p className="text-lg sm:text-xl text-gray-600">
              Leading the revolution in biometric payment technology
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="text-center group"
                >
                  <div className={`w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 sm:mb-6 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`w-6 h-6 sm:w-8 sm:h-8 ${feature.color}`} />
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3">{feature.title}</h3>
                  <p className="text-sm sm:text-base text-gray-600">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 sm:mb-6">
              Ready to Transform Your Payments?
            </h2>
            <p className="text-lg sm:text-xl text-blue-100 mb-6 sm:mb-8 max-w-2xl mx-auto">
              Join millions of users worldwide who trust FacePay for secure, instant transactions
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center max-w-md mx-auto sm:max-w-none">
              <Button
                onClick={() => {
                  setDemoMode('register');
                  setShowDemo(true);
                }}
                className="bg-white text-blue-600 hover:bg-gray-100 text-base sm:text-lg px-6 sm:px-8 py-2.5 sm:py-3"
              >
                Start Free Trial
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
              </Button>
              <Button
                onClick={biometricReady ? handleNativeBiometricDemo : handleDemoClick}
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-blue-600 text-base sm:text-lg px-6 sm:px-8 py-2.5 sm:py-3"
              >
                {biometricReady ? (
                  <>
                    <Shield className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    Real {webAuthnCapabilities?.biometricTypes.includes('face') ? 'Face ID' : webAuthnCapabilities?.biometricTypes.includes('fingerprint') ? 'Touch ID' : 'Biometrics'}
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    Watch Demo
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            <div className="col-span-1 sm:col-span-2 md:col-span-1">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <span className="text-lg sm:text-xl font-bold">FacePay</span>
              </div>
              <p className="text-gray-400 text-sm sm:text-base">
                The future of biometric payments is here.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Product</h4>
              <ul className="space-y-1.5 sm:space-y-2 text-gray-400 text-sm sm:text-base">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Company</h4>
              <ul className="space-y-1.5 sm:space-y-2 text-gray-400 text-sm sm:text-base">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Press</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Support</h4>
              <ul className="space-y-1.5 sm:space-y-2 text-gray-400 text-sm sm:text-base">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-6 sm:mt-8 pt-6 sm:pt-8 text-center text-gray-400">
            <p className="text-sm sm:text-base">&copy; 2024 FacePay. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}