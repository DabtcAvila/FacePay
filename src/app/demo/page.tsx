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
  Users,
  Globe,
  Lock,
  TrendingUp,
  Star,
  Play,
  Sparkles,
  Wallet,
  QrCode,
  Camera,
  Square,
  BrainCircuit,
  Cpu,
  Database,
  Activity
} from 'lucide-react';
import FaceIDDemo from '@/components/FaceIDDemo';
import WebAuthnDemo from '@/components/WebAuthnDemo';
import PaymentForm from '@/components/PaymentForm';
import { Button } from '@/components/ui/button';

type DemoMode = 'landing' | 'face-id' | 'touch-id' | 'payment' | 'success';

export default function DemoPage() {
  const [currentDemo, setCurrentDemo] = useState<DemoMode>('landing');
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  };

  const floatingVariants = {
    animate: {
      y: [-10, 10, -10],
      transition: {
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  const pulseVariants = {
    animate: {
      scale: [1, 1.05, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

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

  if (currentDemo === 'face-id') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 p-4">
        <div className="container mx-auto max-w-4xl">
          <Button 
            onClick={handleBackToLanding}
            variant="ghost"
            className="mb-4 text-white hover:bg-white/20"
          >
            ← Back to Demo
          </Button>
          
          {/* Enhanced demo container with better error handling */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 shadow-2xl">
            <div className="mb-6 text-center">
              <h2 className="text-3xl font-bold text-white mb-2">Face ID Demo</h2>
              <p className="text-blue-200">Experience secure biometric authentication</p>
            </div>
            
            <FaceIDDemo 
              onScanComplete={handleDemoComplete}
              onCancel={handleBackToLanding}
              userId="demo-user"
              userName="Demo User"
              enableWebAuthnFallback={true}
            />
            
            {/* Alternative authentication methods */}
            <div className="mt-8 border-t border-white/20 pt-6">
              <h3 className="text-lg font-semibold text-white mb-4 text-center">Alternative Methods</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  onClick={() => setCurrentDemo('touch-id')}
                  variant="outline"
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20 flex items-center justify-center py-3"
                >
                  <Fingerprint className="w-5 h-5 mr-2" />
                  Try Touch ID / Biometrics
                </Button>
                <Button 
                  onClick={() => setCurrentDemo('payment')}
                  variant="outline"
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20 flex items-center justify-center py-3"
                >
                  <CreditCard className="w-5 h-5 mr-2" />
                  Skip to Payment Demo
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentDemo === 'touch-id') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 p-4">
        <div className="container mx-auto max-w-4xl">
          <Button 
            onClick={handleBackToLanding}
            variant="ghost"
            className="mb-4 text-white hover:bg-white/20"
          >
            ← Back to Demo
          </Button>
          
          {/* Enhanced biometric demo container */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 shadow-2xl">
            <div className="mb-6 text-center">
              <h2 className="text-3xl font-bold text-white mb-2">Biometric Authentication Demo</h2>
              <p className="text-purple-200">Use your device's built-in security features</p>
            </div>
            
            <WebAuthnDemo
              onSuccess={handleDemoComplete}
              onError={(error) => {
                console.error('Demo error:', error);
                // Show user-friendly error handling
              }}
              userId="demo-user"
              userName="Demo User"
              mode="demo"
            />
            
            {/* Alternative methods */}
            <div className="mt-8 border-t border-white/20 pt-6">
              <h3 className="text-lg font-semibold text-white mb-4 text-center">Other Options</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  onClick={() => setCurrentDemo('face-id')}
                  variant="outline"
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20 flex items-center justify-center py-3"
                >
                  <Eye className="w-5 h-5 mr-2" />
                  Try Face ID / Camera
                </Button>
                <Button 
                  onClick={() => setCurrentDemo('payment')}
                  variant="outline"
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20 flex items-center justify-center py-3"
                >
                  <CreditCard className="w-5 h-5 mr-2" />
                  Skip to Payment Demo
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentDemo === 'payment') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 p-4">
        <div className="container mx-auto max-w-4xl">
          <Button 
            onClick={handleBackToLanding}
            variant="ghost"
            className="mb-4 text-white hover:bg-white/20"
          >
            ← Back to Demo
          </Button>
          
          {/* Enhanced payment demo container */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 shadow-2xl">
            <div className="mb-6 text-center">
              <h2 className="text-3xl font-bold text-white mb-2">Secure Payment Demo</h2>
              <p className="text-green-200">Experience lightning-fast biometric payments</p>
              
              {/* Demo disclaimer */}
              <div className="mt-4 bg-yellow-500/20 border border-yellow-400/30 rounded-lg p-3">
                <div className="flex items-center justify-center space-x-2 text-yellow-200">
                  <Shield className="w-4 h-4" />
                  <span className="text-sm font-medium">Demo Mode - No real payments will be processed</span>
                </div>
              </div>
            </div>
            
            <PaymentForm
              amount={99.99}
              onSuccess={handleDemoComplete}
              onCancel={handleBackToLanding}
              description="Demo Purchase - FacePay Experience"
            />
            
            {/* Go back to authentication demos */}
            <div className="mt-8 border-t border-white/20 pt-6">
              <h3 className="text-lg font-semibold text-white mb-4 text-center">Try Authentication First</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  onClick={() => setCurrentDemo('face-id')}
                  variant="outline"
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20 flex items-center justify-center py-3"
                >
                  <Eye className="w-5 h-5 mr-2" />
                  Face ID Demo
                </Button>
                <Button 
                  onClick={() => setCurrentDemo('touch-id')}
                  variant="outline"
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20 flex items-center justify-center py-3"
                >
                  <Fingerprint className="w-5 h-5 mr-2" />
                  Biometric Demo
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            <Button
              onClick={handleBackToLanding}
              className="btn-primary text-lg px-8 py-4"
            >
              Try Another Demo
            </Button>
            
            <div className="flex items-center justify-center space-x-2 text-green-200">
              <Shield className="w-5 h-5" />
              <span>Secured by FacePay Technology</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 text-white overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          variants={floatingVariants}
          animate="animate"
          className="absolute top-20 left-10 w-32 h-32 bg-blue-500/10 rounded-full blur-xl"
        />
        <motion.div
          variants={floatingVariants}
          animate="animate"
          custom={1}
          className="absolute top-40 right-20 w-48 h-48 bg-purple-500/10 rounded-full blur-xl"
        />
        <motion.div
          variants={floatingVariants}
          animate="animate"
          custom={2}
          className="absolute bottom-20 left-1/3 w-40 h-40 bg-indigo-500/10 rounded-full blur-xl"
        />
      </div>

      {/* Hero Section */}
      <motion.section 
        className="relative min-h-screen flex items-center justify-center px-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="container mx-auto max-w-7xl text-center">
          <motion.div variants={itemVariants} className="mb-8">
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
            variants={itemVariants}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 max-w-4xl mx-auto"
          >
            <motion.div
              className="card-glass p-8 rounded-2xl hover-lift cursor-pointer"
              onClick={() => handleDemoStart('face-id')}
              whileHover={{ y: -5, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Eye className="w-16 h-16 text-blue-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">Face ID Demo</h3>
              <p className="text-gray-300 mb-4">Experience advanced facial recognition with automatic fallback to device biometrics</p>
              <div className="flex items-center justify-center space-x-2 mb-4 text-sm text-blue-300">
                <Camera className="w-4 h-4" />
                <span>Camera + Biometric Support</span>
              </div>
              <Button className="btn-primary w-full">
                <Play className="w-4 h-4 mr-2" />
                Try Face ID
              </Button>
            </motion.div>

            <motion.div
              className="card-glass p-8 rounded-2xl hover-lift cursor-pointer"
              onClick={() => handleDemoStart('touch-id')}
              whileHover={{ y: -5, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Fingerprint className="w-16 h-16 text-purple-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">Biometric Demo</h3>
              <p className="text-gray-300 mb-4">Use Touch ID, Face ID, or Windows Hello for secure authentication</p>
              <div className="flex items-center justify-center space-x-2 mb-4 text-sm text-purple-300">
                <Shield className="w-4 h-4" />
                <span>Platform Biometrics</span>
              </div>
              <Button className="btn-primary w-full">
                <Play className="w-4 h-4 mr-2" />
                Try Biometrics
              </Button>
            </motion.div>

            <motion.div
              className="card-glass p-8 rounded-2xl hover-lift cursor-pointer"
              onClick={() => handleDemoStart('payment')}
              whileHover={{ y: -5, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <CreditCard className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">Payment Demo</h3>
              <p className="text-gray-300 mb-4">Experience the complete secure payment flow with biometric confirmation</p>
              <div className="flex items-center justify-center space-x-2 mb-4 text-sm text-green-300">
                <Zap className="w-4 h-4" />
                <span>Demo Mode - Safe</span>
              </div>
              <Button className="btn-primary w-full">
                <Play className="w-4 h-4 mr-2" />
                Try Payment
              </Button>
            </motion.div>
          </motion.div>

          {/* Stats Section */}
          <motion.div 
            variants={itemVariants}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto"
          >
            <div className="text-center">
              <motion.div 
                className="text-4xl font-bold text-blue-400 mb-2"
                variants={pulseVariants}
                animate="animate"
              >
                0.3s
              </motion.div>
              <p className="text-gray-300">Authentication Time</p>
            </div>
            <div className="text-center">
              <motion.div 
                className="text-4xl font-bold text-purple-400 mb-2"
                variants={pulseVariants}
                animate="animate"
              >
                99.9%
              </motion.div>
              <p className="text-gray-300">Accuracy Rate</p>
            </div>
            <div className="text-center">
              <motion.div 
                className="text-4xl font-bold text-green-400 mb-2"
                variants={pulseVariants}
                animate="animate"
              >
                256-bit
              </motion.div>
              <p className="text-gray-300">Encryption</p>
            </div>
            <div className="text-center">
              <motion.div 
                className="text-4xl font-bold text-yellow-400 mb-2"
                variants={pulseVariants}
                animate="animate"
              >
                1M+
              </motion.div>
              <p className="text-gray-300">Users Secured</p>
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

      {/* Features Section */}
      <section className="py-20 px-4 relative">
        <div className="container mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Revolutionary Features
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Discover the cutting-edge technology that makes FacePay the most secure and convenient payment solution
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: BrainCircuit,
                title: "AI-Powered Recognition",
                description: "Advanced machine learning algorithms ensure accurate biometric identification",
                color: "text-blue-400"
              },
              {
                icon: Shield,
                title: "Military-Grade Security",
                description: "End-to-end encryption with zero-knowledge architecture",
                color: "text-purple-400"
              },
              {
                icon: Zap,
                title: "Lightning Fast",
                description: "Complete transactions in under 300 milliseconds",
                color: "text-yellow-400"
              },
              {
                icon: Smartphone,
                title: "Cross-Platform",
                description: "Works seamlessly across all devices and operating systems",
                color: "text-green-400"
              },
              {
                icon: Database,
                title: "Secure Storage",
                description: "Biometric data never leaves your device",
                color: "text-red-400"
              },
              {
                icon: Activity,
                title: "Real-Time Monitoring",
                description: "Advanced fraud detection and prevention systems",
                color: "text-indigo-400"
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -10, scale: 1.02 }}
                className="card-glass p-8 rounded-2xl"
              >
                <feature.icon className={`w-12 h-12 ${feature.color} mb-4`} />
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-gray-300">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Metrics */}
      <section className="py-20 px-4 bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              Security Metrics
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Trust backed by numbers. See why FacePay is the most secure payment platform.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                metric: "99.97%",
                label: "Uptime Guarantee",
                description: "Always available when you need it"
              },
              {
                metric: "0.001%",
                label: "False Positive Rate",
                description: "Virtually no authentication errors"
              },
              {
                metric: "AES-256",
                label: "Encryption Standard",
                description: "Bank-level security protection"
              },
              {
                metric: "< 1ms",
                label: "Fraud Detection",
                description: "Instant threat identification"
              }
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center card-glass p-8 rounded-2xl"
              >
                <motion.div
                  className="text-4xl font-bold text-blue-400 mb-2"
                  variants={pulseVariants}
                  animate="animate"
                >
                  {stat.metric}
                </motion.div>
                <h3 className="text-xl font-semibold mb-2">{stat.label}</h3>
                <p className="text-gray-400">{stat.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              What Users Say
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Join millions of satisfied users who trust FacePay for their daily transactions
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: "Sarah Chen",
                role: "Tech Executive",
                quote: "FacePay has revolutionized how I make payments. The speed and security are unmatched.",
                rating: 5,
                avatar: "👩‍💼"
              },
              {
                name: "Marcus Rodriguez",
                role: "Small Business Owner",
                quote: "My customers love the convenience. Sales have increased 30% since implementing FacePay.",
                rating: 5,
                avatar: "👨‍💼"
              },
              {
                name: "Dr. Emily Watson",
                role: "Security Researcher",
                quote: "From a security perspective, FacePay's architecture is flawless. Truly next-generation.",
                rating: 5,
                avatar: "👩‍🔬"
              }
            ].map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -5 }}
                className="card-glass p-8 rounded-2xl"
              >
                <div className="flex items-center mb-4">
                  <div className="text-4xl mr-4">{testimonial.avatar}</div>
                  <div>
                    <h3 className="text-xl font-bold">{testimonial.name}</h3>
                    <p className="text-gray-400">{testimonial.role}</p>
                  </div>
                </div>
                <p className="text-gray-300 mb-4 italic">"{testimonial.quote}"</p>
                <div className="flex space-x-1">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20 px-4 bg-gradient-to-r from-purple-900/30 to-blue-900/30 backdrop-blur-sm">
        <div className="container mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              Use Cases
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              FacePay works everywhere you need secure, fast payments
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: CreditCard,
                title: "E-commerce",
                description: "Seamless online shopping experiences"
              },
              {
                icon: Smartphone,
                title: "Mobile Apps",
                description: "In-app purchases made simple"
              },
              {
                icon: QrCode,
                title: "Point of Sale",
                description: "Fast retail transactions"
              },
              {
                icon: Globe,
                title: "International",
                description: "Global payment processing"
              }
            ].map((useCase, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.05 }}
                className="text-center card-glass p-8 rounded-2xl"
              >
                <useCase.icon className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-3">{useCase.title}</h3>
                <p className="text-gray-300">{useCase.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              Ready to Experience the Future?
            </h2>
            <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
              Join the payment revolution. Start using FacePay today and discover 
              why it's the preferred choice for secure, fast transactions.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button 
                className="btn-primary text-lg px-8 py-4"
                onClick={() => handleDemoStart('face-id')}
              >
                <Play className="w-5 h-5 mr-2" />
                Start Demo
              </Button>
              <Button 
                className="btn-secondary text-lg px-8 py-4"
                onClick={() => window.open('/dashboard', '_blank')}
              >
                <ArrowRight className="w-5 h-5 mr-2" />
                Go to Dashboard
              </Button>
            </div>

            <div className="flex justify-center items-center space-x-8 text-sm text-gray-400">
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
      </section>

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
              
              {/* Tips during loading */}
              <div className="mt-6 p-4 bg-blue-500/20 rounded-lg border border-blue-400/30">
                <div className="flex items-center space-x-2 text-blue-200 text-sm">
                  <Shield className="w-4 h-4" />
                  <span>Tip: Allow camera and biometric permissions for the full experience</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}