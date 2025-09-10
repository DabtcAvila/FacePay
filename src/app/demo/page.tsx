'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Eye, 
  Fingerprint, 
  Shield, 
  CreditCard, 
  Smartphone, 
  Zap,
  CheckCircle,
  ArrowRight,
  Star,
  Play,
  Sparkles,
  Camera,
  BrainCircuit,
  Activity,
  Globe,
  Lock
} from 'lucide-react';
import BiometricWithFallback from '@/components/BiometricWithFallback';
import { useToast } from '@/hooks/useToast';
// Legacy import - use BiometricWithFallback instead
import NativeBiometric from '@/components/NativeBiometric';

type DemoMode = 'landing' | 'face-id' | 'simple-face-id' | 'biometric' | 'real-biometric' | 'unified' | 'success';

// Simple Button Component
const SimpleButton = ({ 
  children, 
  onClick, 
  className = '', 
  variant = 'primary' 
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  className?: string; 
  variant?: 'primary' | 'secondary' | 'outline';
}) => {
  const baseStyles = "inline-flex items-center justify-center px-6 py-3 rounded-lg font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2";
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500",
    secondary: "bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500",
    outline: "border-2 border-white/30 text-white hover:bg-white/20 focus:ring-white"
  };
  
  return (
    <button 
      onClick={onClick}
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

// Simple Face ID Demo Component
const SimpleFaceIDComponent = ({ onComplete, onCancel }: { onComplete: () => void; onCancel: () => void }) => {
  const [step, setStep] = useState<'init' | 'scanning' | 'complete'>('init');

  useEffect(() => {
    if (step === 'init') {
      setTimeout(() => setStep('scanning'), 1000);
    } else if (step === 'scanning') {
      setTimeout(() => {
        setStep('complete');
        setTimeout(onComplete, 1500);
      }, 3000);
    }
  }, [step, onComplete]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
      <div className="relative mb-8">
        <div className="w-48 h-48 border-4 border-blue-400 rounded-full flex items-center justify-center">
          {step === 'init' && (
            <Eye className="w-20 h-20 text-blue-400" />
          )}
          {step === 'scanning' && (
            <div className="relative">
              <Eye className="w-20 h-20 text-blue-400" />
              <div className="absolute inset-0 border-4 border-blue-400 rounded-full animate-ping"></div>
            </div>
          )}
          {step === 'complete' && (
            <CheckCircle className="w-20 h-20 text-green-400" />
          )}
        </div>
      </div>
      
      <h3 className="text-2xl font-bold text-white mb-4">
        {step === 'init' && 'Initializing Face ID...'}
        {step === 'scanning' && 'Scanning Face...'}
        {step === 'complete' && 'Face ID Successful!'}
      </h3>
      
      <p className="text-blue-200 mb-8 max-w-md">
        {step === 'init' && 'Please look at the camera when ready.'}
        {step === 'scanning' && 'Keep your face in the center of the frame.'}
        {step === 'complete' && 'Authentication completed successfully.'}
      </p>
      
      <SimpleButton onClick={onCancel} variant="outline">
        Cancel Demo
      </SimpleButton>
    </div>
  );
};

// Simple Biometric Demo Component
const SimpleBiometricComponent = ({ onComplete, onCancel }: { onComplete: () => void; onCancel: () => void }) => {
  const [step, setStep] = useState<'init' | 'scanning' | 'complete'>('init');

  useEffect(() => {
    if (step === 'init') {
      setTimeout(() => setStep('scanning'), 1000);
    } else if (step === 'scanning') {
      setTimeout(() => {
        setStep('complete');
        setTimeout(onComplete, 1500);
      }, 2500);
    }
  }, [step, onComplete]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
      <div className="relative mb-8">
        <div className="w-48 h-48 border-4 border-purple-400 rounded-full flex items-center justify-center">
          {step === 'init' && (
            <Fingerprint className="w-20 h-20 text-purple-400" />
          )}
          {step === 'scanning' && (
            <div className="relative">
              <Fingerprint className="w-20 h-20 text-purple-400" />
              <div className="absolute inset-0 border-4 border-purple-400 rounded-full animate-pulse"></div>
            </div>
          )}
          {step === 'complete' && (
            <CheckCircle className="w-20 h-20 text-green-400" />
          )}
        </div>
      </div>
      
      <h3 className="text-2xl font-bold text-white mb-4">
        {step === 'init' && 'Preparing Biometric Scan...'}
        {step === 'scanning' && 'Scanning Biometrics...'}
        {step === 'complete' && 'Biometric Authentication Successful!'}
      </h3>
      
      <p className="text-purple-200 mb-8 max-w-md">
        {step === 'init' && 'Please use your device\'s biometric sensor.'}
        {step === 'scanning' && 'Authenticating using device biometrics.'}
        {step === 'complete' && 'Authentication completed successfully.'}
      </p>
      
      <SimpleButton onClick={onCancel} variant="outline">
        Cancel Demo
      </SimpleButton>
    </div>
  );
};

export default function DemoPage() {
  const [currentDemo, setCurrentDemo] = useState<DemoMode>('landing');
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { success, error, warning, info } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDemoStart = (mode: DemoMode) => {
    setIsLoading(true);
    setTimeout(() => {
      setCurrentDemo(mode);
      setIsLoading(false);
    }, 500);
  };

  const handleDemoComplete = () => {
    setCurrentDemo('success');
  };

  const handleBackToLanding = () => {
    setCurrentDemo('landing');
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  // Face ID Demo Screen
  if (currentDemo === 'face-id') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 p-4">
        <div className="container mx-auto max-w-4xl">
          <SimpleButton 
            onClick={handleBackToLanding}
            variant="outline"
            className="mb-4"
          >
            ← Back to Demo
          </SimpleButton>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 shadow-2xl">
            <div className="mb-6 text-center">
              <h2 className="text-3xl font-bold text-white mb-2">Face ID Demo</h2>
              <p className="text-blue-200">Experience secure facial recognition authentication</p>
            </div>
            
            <SimpleFaceIDComponent 
              onComplete={handleDemoComplete}
              onCancel={handleBackToLanding}
            />
          </div>
        </div>
      </div>
    );
  }

  // Simple Face ID Demo Screen
  if (currentDemo === 'simple-face-id') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-blue-900 to-purple-900 p-4">
        <div className="container mx-auto max-w-4xl">
          <SimpleButton 
            onClick={handleBackToLanding}
            variant="outline"
            className="mb-4"
          >
            ← Back to Demo
          </SimpleButton>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 shadow-2xl">
            <div className="mb-6 text-center">
              <h2 className="text-3xl font-bold text-white mb-2">Advanced Face ID with AI</h2>
              <p className="text-green-200">Experience AI-powered facial recognition technology</p>
            </div>
            
            <SimpleFaceIDComponent 
              onComplete={handleDemoComplete}
              onCancel={handleBackToLanding}
            />
          </div>
        </div>
      </div>
    );
  }

  // Biometric Demo Screen
  if (currentDemo === 'biometric') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-4">
        <div className="container mx-auto max-w-4xl">
          <SimpleButton 
            onClick={handleBackToLanding}
            variant="outline"
            className="mb-4"
          >
            ← Back to Demo
          </SimpleButton>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 shadow-2xl">
            <div className="mb-6 text-center">
              <h2 className="text-3xl font-bold text-white mb-2">Biometric Authentication Demo</h2>
              <p className="text-purple-200">Use your device's built-in security features</p>
            </div>
            
            <SimpleBiometricComponent
              onComplete={handleDemoComplete}
              onCancel={handleBackToLanding}
            />
          </div>
        </div>
      </div>
    );
  }

  // Real Biometric Demo Screen
  if (currentDemo === 'real-biometric') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-blue-900 to-purple-900 p-4">
        <div className="container mx-auto max-w-4xl">
          <SimpleButton 
            onClick={handleBackToLanding}
            variant="outline"
            className="mb-4"
          >
            ← Back to Demo
          </SimpleButton>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 shadow-2xl">
            <div className="mb-6 text-center">
              <h2 className="text-3xl font-bold text-white mb-2">Real Device Biometric Authentication</h2>
              <p className="text-green-200">Use your REAL Face ID, Touch ID, or Windows Hello</p>
              <div className="mt-2 inline-flex items-center space-x-2 bg-green-500/20 px-3 py-1 rounded-full text-green-300 text-sm">
                <Shield className="w-4 h-4" />
                <span>REAL BIOMETRICS - NOT SIMULATION</span>
              </div>
            </div>
            
            <div className="bg-white rounded-xl">
              <BiometricWithFallback
                userId={`demo-real-${Date.now()}`}
                userName="demo@facepay.com"
                mode="demo"
                title="Real Device Biometric Authentication"
                subtitle="Use your REAL Face ID, Touch ID, or Windows Hello"
                onSuccess={(result) => {
                  console.log('Real biometric success:', result)
                  handleDemoComplete()
                }}
                onError={(error) => console.error('Real biometric error:', error)}
                onCancel={handleBackToLanding}
                showFallbackOptions={true}
                preferredMethod="biometric"
                className="p-0"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success Screen
  if (currentDemo === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="text-center max-w-2xl"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            className="mb-8"
          >
            <CheckCircle className="w-32 h-32 text-green-400 mx-auto mb-6" />
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-4xl md:text-6xl font-bold text-white mb-6"
          >
            Demo Complete!
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="text-xl text-green-100 mb-8"
          >
            You've experienced the future of secure, biometric payments
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="space-y-4"
          >
            <SimpleButton onClick={handleBackToLanding}>
              Try Another Demo
            </SimpleButton>
            
            <div className="flex items-center justify-center space-x-2 text-green-200 mt-4">
              <Shield className="w-5 h-5" />
              <span>Secured by FacePay Technology</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // Main Landing Page
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 text-white overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ 
            y: [-10, 10, -10],
            transition: { duration: 4, repeat: Infinity, ease: "easeInOut" }
          }}
          className="absolute top-20 left-10 w-32 h-32 bg-blue-500/10 rounded-full blur-xl"
        />
        <motion.div
          animate={{ 
            y: [-15, 15, -15],
            transition: { duration: 5, repeat: Infinity, ease: "easeInOut" }
          }}
          className="absolute top-40 right-20 w-48 h-48 bg-purple-500/10 rounded-full blur-xl"
        />
        <motion.div
          animate={{ 
            y: [-12, 12, -12],
            transition: { duration: 4.5, repeat: Infinity, ease: "easeInOut" }
          }}
          className="absolute bottom-20 left-1/3 w-40 h-40 bg-indigo-500/10 rounded-full blur-xl"
        />
      </div>

      {/* Hero Section */}
      <motion.section 
        className="relative min-h-screen flex items-center justify-center px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className="container mx-auto max-w-7xl text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="mb-8"
          >
            <motion.div
              className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-6 py-3 mb-6"
              whileHover={{ scale: 1.05 }}
            >
              <Sparkles className="w-5 h-5 text-yellow-400" />
              <span className="text-sm font-medium">Revolutionary Payment Technology</span>
            </motion.div>
            
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent">
              FacePay
            </h1>
            
            <p className="text-xl md:text-2xl lg:text-3xl text-blue-200 mb-8 max-w-4xl mx-auto leading-relaxed">
              The Future of Secure Payments is Here
            </p>
            
            <p className="text-lg md:text-xl text-gray-300 mb-12 max-w-3xl mx-auto">
              Experience lightning-fast, ultra-secure payments using advanced biometric authentication. 
              Pay with your face, fingerprint, or device biometrics in milliseconds.
            </p>
          </motion.div>

          {/* Demo Action Buttons */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16 max-w-6xl mx-auto"
          >
            <motion.div
              className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl cursor-pointer border border-white/20"
              onClick={() => handleDemoStart('simple-face-id')}
              whileHover={{ y: -5, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <BrainCircuit className="w-12 h-12 text-blue-400 mx-auto mb-3" />
              <h3 className="text-xl font-bold mb-2">Advanced Face ID</h3>
              <p className="text-gray-300 mb-3 text-sm">AI-powered face detection simulation</p>
              <div className="flex items-center justify-center space-x-2 mb-3 text-xs text-blue-300">
                <Camera className="w-3 h-3" />
                <span>AI Demo</span>
              </div>
              <SimpleButton className="w-full text-sm py-2">
                <Play className="w-3 h-3 mr-2" />
                Try AI Face ID
              </SimpleButton>
            </motion.div>
            
            <motion.div
              className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl cursor-pointer border border-white/20"
              onClick={() => handleDemoStart('face-id')}
              whileHover={{ y: -5, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Eye className="w-12 h-12 text-purple-400 mx-auto mb-3" />
              <h3 className="text-xl font-bold mb-2">Simple Face ID</h3>
              <p className="text-gray-300 mb-3 text-sm">Basic facial recognition simulation</p>
              <div className="flex items-center justify-center space-x-2 mb-3 text-xs text-purple-300">
                <Camera className="w-3 h-3" />
                <span>Camera Demo</span>
              </div>
              <SimpleButton className="w-full text-sm py-2">
                <Play className="w-3 h-3 mr-2" />
                Try Simple Face ID
              </SimpleButton>
            </motion.div>

            <motion.div
              className="bg-white/10 backdrop-blur-sm p-8 rounded-2xl cursor-pointer border border-white/20"
              onClick={() => handleDemoStart('biometric')}
              whileHover={{ y: -5, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Fingerprint className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">Biometric Demo</h3>
              <p className="text-gray-300 mb-4">Simulated Touch ID, Face ID, or Windows Hello authentication</p>
              <div className="flex items-center justify-center space-x-2 mb-4 text-sm text-green-300">
                <Activity className="w-4 h-4" />
                <span>Simulated Demo</span>
              </div>
              <SimpleButton className="w-full">
                <Play className="w-4 h-4 mr-2" />
                Try Simulated Auth
              </SimpleButton>
            </motion.div>
            
            <motion.div
              className="bg-white/10 backdrop-blur-sm p-8 rounded-2xl cursor-pointer border border-green-400/30 relative"
              onClick={() => handleDemoStart('real-biometric')}
              whileHover={{ y: -5, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* "REAL" badge */}
              <div className="absolute -top-2 -right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold animate-pulse">
                REAL
              </div>
              
              <Shield className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2 text-green-100">Real Face ID</h3>
              <p className="text-gray-300 mb-4">Use your device's REAL Face ID, Touch ID, or Windows Hello</p>
              <div className="flex items-center justify-center space-x-2 mb-4 text-sm text-green-300">
                <Shield className="w-4 h-4" />
                <span>Real Device Biometrics</span>
              </div>
              <SimpleButton className="w-full bg-green-600 hover:bg-green-700">
                <Shield className="w-4 h-4 mr-2" />
                Use Real Face ID
              </SimpleButton>
            </motion.div>
          </motion.div>

          {/* Stats Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto"
          >
            <div className="text-center">
              <motion.div 
                className="text-4xl font-bold text-blue-400 mb-2"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                0.3s
              </motion.div>
              <p className="text-gray-300">Authentication Time</p>
            </div>
            <div className="text-center">
              <motion.div 
                className="text-4xl font-bold text-purple-400 mb-2"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              >
                99.9%
              </motion.div>
              <p className="text-gray-300">Accuracy Rate</p>
            </div>
            <div className="text-center">
              <motion.div 
                className="text-4xl font-bold text-green-400 mb-2"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              >
                256-bit
              </motion.div>
              <p className="text-gray-300">Encryption</p>
            </div>
            <div className="text-center">
              <motion.div 
                className="text-4xl font-bold text-yellow-400 mb-2"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
              >
                1M+
              </motion.div>
              <p className="text-gray-300">Users Secured</p>
            </div>
          </motion.div>

          {/* Quick Access */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="mt-16 max-w-2xl mx-auto"
          >
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <SimpleButton onClick={() => window.open('/dashboard', '_blank')}>
                <ArrowRight className="w-5 h-5 mr-2" />
                Go to Dashboard
              </SimpleButton>
              <SimpleButton variant="outline" onClick={() => window.open('/', '_blank')}>
                <Globe className="w-5 h-5 mr-2" />
                Main Website
              </SimpleButton>
            </div>

            <div className="flex justify-center items-center space-x-8 text-sm text-gray-400 mt-8">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4" />
                <span>Enterprise Ready</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4" />
                <span>SOC 2 Compliant</span>
              </div>
              <div className="flex items-center space-x-2">
                <Lock className="w-4 h-4" />
                <span>GDPR Compliant</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/50 rounded-full mt-2"></div>
          </div>
        </motion.div>
      </motion.section>

      {/* Loading Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 text-center max-w-md mx-4"
            >
              <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-white text-lg font-semibold mb-2">Preparing Demo...</p>
              <p className="text-blue-200 text-sm">Setting up secure authentication environment</p>
              
              <div className="mt-6 p-4 bg-blue-500/20 rounded-lg border border-blue-400/30">
                <div className="flex items-center space-x-2 text-blue-200 text-sm">
                  <Shield className="w-4 h-4" />
                  <span>Tip: Allow camera permissions for the full experience</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}