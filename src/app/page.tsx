'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Zap, Globe, Camera, ArrowRight, Play, Star, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FaceScanAnimation from '@/components/FaceScanAnimation';
import PaymentForm from '@/components/PaymentForm';
import RegistrationFlow from '@/components/RegistrationFlow';

export default function LandingPage() {
  const [showDemo, setShowDemo] = useState(false);
  const [demoMode, setDemoMode] = useState<'scan' | 'payment' | 'register'>('scan');
  const [isScanning, setIsScanning] = useState(false);

  const handleDemoClick = () => {
    setShowDemo(true);
    setDemoMode('scan');
    setIsScanning(true);
  };

  const handleScanComplete = () => {
    setIsScanning(false);
    setTimeout(() => {
      setDemoMode('payment');
    }, 1000);
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
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">FacePay</span>
            </div>
            
            <nav className="hidden md:flex space-x-6">
              <a href="#features" className="text-gray-600 hover:text-blue-600 transition-colors">Features</a>
              <a href="#security" className="text-gray-600 hover:text-blue-600 transition-colors">Security</a>
              <a href="#pricing" className="text-gray-600 hover:text-blue-600 transition-colors">Pricing</a>
              <a href="#contact" className="text-gray-600 hover:text-blue-600 transition-colors">Contact</a>
            </nav>

            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => setDemoMode('register')}>
                Sign In
              </Button>
              <Button onClick={() => setDemoMode('register')} className="bg-blue-600 hover:bg-blue-700">
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {showDemo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowDemo(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">FacePay Demo</h3>
                <button
                  onClick={() => setShowDemo(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

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
                </div>
              )}

              {demoMode === 'payment' && (
                <PaymentForm 
                  amount={25.99}
                  recipient="Demo Store"
                  onPaymentComplete={() => setShowDemo(false)}
                />
              )}

              {demoMode === 'register' && (
                <RegistrationFlow onRegistrationComplete={() => setShowDemo(false)} />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              The Future of
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {' '}Payments
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Experience revolutionary biometric payments with FacePay. Secure, instant, and passwordless 
              transactions using advanced facial recognition technology.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
          >
            <Button
              onClick={handleDemoClick}
              className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-3 payment-flow-glow"
            >
              <Play className="w-5 h-5 mr-2" />
              Try Live Demo
            </Button>
            <Button
              onClick={() => setDemoMode('register')}
              variant="outline"
              className="text-lg px-8 py-3"
            >
              Create Account
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16"
          >
            {stats.map((stat, index) => (
              <div key={stat.label} className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                  className="text-3xl font-bold text-blue-600 mb-2"
                >
                  {stat.value}
                </motion.div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Hero Visual */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="relative max-w-4xl mx-auto"
        >
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 shadow-2xl">
            <div className="bg-white rounded-xl p-6 flex flex-col md:flex-row items-center justify-between">
              <div className="flex-1 mb-6 md:mb-0">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Secure Payment Processing
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    <span>Biometric verification active</span>
                  </div>
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    <span>End-to-end encryption</span>
                  </div>
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    <span>Real-time fraud detection</span>
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0">
                <FaceScanAnimation size="lg" />
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Choose FacePay?</h2>
            <p className="text-xl text-gray-600">
              Leading the revolution in biometric payment technology
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
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
                  <div className={`w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`w-8 h-8 ${feature.color}`} />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold text-white mb-6">
              Ready to Transform Your Payments?
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Join millions of users worldwide who trust FacePay for secure, instant transactions
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => {
                  setDemoMode('register');
                  setShowDemo(true);
                }}
                className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-3"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button
                onClick={handleDemoClick}
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-blue-600 text-lg px-8 py-3"
              >
                Watch Demo
                <Play className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">FacePay</span>
              </div>
              <p className="text-gray-400">
                The future of biometric payments is here.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Press</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 FacePay. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}