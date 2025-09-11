'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, ArrowLeft, Shield, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FaceScanAnimation from '@/components/FaceScanAnimation';
import Link from 'next/link';

export default function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup' | 'biometric'>('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    
    if (mode === 'signup') {
      if (!formData.firstName) newErrors.firstName = 'First name is required';
      if (!formData.lastName) newErrors.lastName = 'Last name is required';
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      // Simulate authentication
      console.log('Form submitted:', formData);
    }
  };

  const handleBiometricAuth = () => {
    setIsScanning(true);
  };

  const handleScanComplete = () => {
    setIsScanning(false);
    // Simulate successful authentication
    console.log('Biometric authentication successful');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to home */}
        <Link 
          href="/" 
          className="inline-flex items-center text-gray-600 hover:text-blue-600 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {mode === 'signin' ? 'Welcome Back' : mode === 'signup' ? 'Create Account' : 'Biometric Login'}
            </h1>
            <p className="text-gray-600">
              {mode === 'signin' ? 'Sign in to your FacePay account' : 
               mode === 'signup' ? 'Join FacePay for secure payments' : 
               'Use your face to sign in securely'}
            </p>
          </div>

          {/* Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
            <button
              onClick={() => setMode('signin')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                mode === 'signin' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                mode === 'signup' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Sign Up
            </button>
            <button
              onClick={() => setMode('biometric')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                mode === 'biometric' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Face ID
            </button>
          </div>

          <AnimatePresence mode="wait">
            {/* Biometric Authentication */}
            {mode === 'biometric' && (
              <motion.div
                key="biometric"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="text-center space-y-6"
              >
                <FaceScanAnimation 
                  isScanning={isScanning}
                  onScanComplete={handleScanComplete}
                  size="lg"
                />
                
                <div className="space-y-4">
                  <Button 
                    onClick={handleBiometricAuth}
                    disabled={isScanning}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {isScanning ? 'Scanning...' : 'Start Face Recognition'}
                  </Button>
                  
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                      <Shield className="w-4 h-4 inline mr-2" />
                      Your biometric data is processed locally and never stored
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Traditional Forms */}
            {(mode === 'signin' || mode === 'signup') && (
              <motion.form
                key={mode}
                initial={{ opacity: 0, x: mode === 'signin' ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: mode === 'signin' ? 20 : -20 }}
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                {/* Name fields for signup */}
                {mode === 'signup' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          type="text"
                          className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            errors.firstName ? 'border-red-500' : 'border-gray-300'
                          }`}
                          value={formData.firstName}
                          onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                          placeholder="John"
                        />
                      </div>
                      {errors.firstName && (
                        <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors.lastName ? 'border-red-500' : 'border-gray-300'
                        }`}
                        value={formData.lastName}
                        onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                        placeholder="Doe"
                      />
                      {errors.lastName && (
                        <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="email"
                      className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="john@example.com"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.password ? 'border-red-500' : 'border-gray-300'
                      }`}
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-red-500 text-xs mt-1">{errors.password}</p>
                  )}
                </div>

                {/* Confirm Password for signup */}
                {mode === 'signup' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                        }`}
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        placeholder="Confirm your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>
                    )}
                  </div>
                )}

                {/* Forgot Password for signin */}
                {mode === 'signin' && (
                  <div className="text-right">
                    <a href="#" className="text-sm text-blue-600 hover:text-blue-500">
                      Forgot your password?
                    </a>
                  </div>
                )}

                {/* Submit Button */}
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-3">
                  {mode === 'signin' ? 'Sign In' : 'Create Account'}
                </Button>

                {/* Terms for signup */}
                {mode === 'signup' && (
                  <p className="text-xs text-gray-500 text-center">
                    By creating an account, you agree to our{' '}
                    <a href="#" className="text-blue-600 hover:text-blue-500">Terms of Service</a>{' '}
                    and{' '}
                    <a href="#" className="text-blue-600 hover:text-blue-500">Privacy Policy</a>
                  </p>
                )}

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">
                      {mode === 'signin' ? 'or continue with' : 'or sign up with'}
                    </span>
                  </div>
                </div>

                {/* Social Login */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Google
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('biometric')}
                    className="flex items-center justify-center px-4 py-2 border border-blue-300 rounded-lg text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Face ID
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}