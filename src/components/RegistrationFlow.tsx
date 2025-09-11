'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Lock, ShieldCheck, Camera, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FaceScanAnimation from './FaceScanAnimation';

interface RegistrationFlowProps {
  onRegistrationComplete?: (userData: any) => void;
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export default function RegistrationFlow({ onRegistrationComplete }: RegistrationFlowProps) {
  const [currentStep, setCurrentStep] = useState<'personal' | 'security' | 'biometric' | 'complete'>('personal');
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [isScanning, setIsScanning] = useState(false);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [biometricEnrolled, setBiometricEnrolled] = useState(false);

  const steps = [
    { key: 'personal', title: 'Personal Info', icon: User },
    { key: 'security', title: 'Security', icon: Lock },
    { key: 'biometric', title: 'Biometric', icon: Camera },
    { key: 'complete', title: 'Complete', icon: CheckCircle }
  ];

  const validatePersonalInfo = () => {
    const newErrors: Partial<FormData> = {};
    
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email format';
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateSecurity = () => {
    const newErrors: Partial<FormData> = {};
    
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePersonalInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validatePersonalInfo()) {
      setCurrentStep('security');
    }
  };

  const handleSecuritySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateSecurity()) {
      setCurrentStep('biometric');
    }
  };

  const handleBiometricEnrollment = () => {
    setIsScanning(true);
  };

  const handleFaceScanComplete = () => {
    setIsScanning(false);
    setBiometricEnrolled(true);
    setTimeout(() => {
      setCurrentStep('complete');
      onRegistrationComplete?.({
        ...formData,
        biometricEnabled: true,
        registrationDate: new Date()
      });
    }, 1500);
  };

  const getCurrentStepIndex = () => {
    return steps.findIndex(step => step.key === currentStep);
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Your Account</h2>
        <p className="text-gray-600">Join FacePay for secure biometric payments</p>
      </div>

      {/* Step Indicator */}
      <div className="flex justify-between items-center">
        {steps.map((step, index) => {
          const currentIndex = getCurrentStepIndex();
          const isActive = index <= currentIndex;
          const isCurrent = index === currentIndex;
          const Icon = step.icon;
          
          return (
            <div key={step.key} className="flex flex-col items-center">
              <motion.div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isActive ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
                }`}
                animate={{ 
                  scale: isCurrent ? 1.1 : 1,
                  backgroundColor: isActive ? '#3B82F6' : '#E5E7EB'
                }}
                transition={{ duration: 0.3 }}
              >
                <Icon className="w-5 h-5" />
              </motion.div>
              <span className={`text-xs mt-1 ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                {step.title}
              </span>
            </div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* Personal Information */}
        {currentStep === 'personal' && (
          <motion.form
            key="personal"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onSubmit={handlePersonalInfoSubmit}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.firstName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                />
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
                />
                {errors.lastName && (
                  <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.phone ? 'border-red-500' : 'border-gray-300'
                }`}
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              />
              {errors.phone && (
                <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
              )}
            </div>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
              <User className="w-4 h-4 mr-2" />
              Continue
            </Button>
          </motion.form>
        )}

        {/* Security Settings */}
        {currentStep === 'security' && (
          <motion.form
            key="security"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onSubmit={handleSecuritySubmit}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.password ? 'border-red-500' : 'border-gray-300'
                }`}
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              />
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password}</p>
              )}
              <div className="mt-2 space-y-1">
                <div className={`flex items-center text-xs ${
                  formData.password.length >= 8 ? 'text-green-600' : 'text-gray-400'
                }`}>
                  <div className={`w-2 h-2 rounded-full mr-2 ${
                    formData.password.length >= 8 ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                  At least 8 characters
                </div>
                <div className={`flex items-center text-xs ${
                  /[A-Z]/.test(formData.password) ? 'text-green-600' : 'text-gray-400'
                }`}>
                  <div className={`w-2 h-2 rounded-full mr-2 ${
                    /[A-Z]/.test(formData.password) ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                  Uppercase letter
                </div>
                <div className={`flex items-center text-xs ${
                  /[0-9]/.test(formData.password) ? 'text-green-600' : 'text-gray-400'
                }`}>
                  <div className={`w-2 h-2 rounded-full mr-2 ${
                    /[0-9]/.test(formData.password) ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                  Number
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                }`}
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              />
              {errors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start">
                <ShieldCheck className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 mb-1">Security Notice</p>
                  <p className="text-blue-800">
                    Your password is encrypted and never stored in plain text. We recommend using a strong, unique password.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setCurrentStep('personal')}
                className="flex-1"
              >
                Back
              </Button>
              <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                <Lock className="w-4 h-4 mr-2" />
                Continue
              </Button>
            </div>
          </motion.form>
        )}

        {/* Biometric Enrollment */}
        {currentStep === 'biometric' && (
          <motion.div
            key="biometric"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Biometric Enrollment</h3>
              <p className="text-gray-600">
                Set up face recognition for secure, passwordless payments
              </p>
            </div>

            {!biometricEnrolled ? (
              <>
                <div className="flex justify-center">
                  <FaceScanAnimation 
                    isScanning={isScanning}
                    onScanComplete={handleFaceScanComplete}
                    size="lg"
                  />
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-yellow-900 mb-1">Privacy & Security</p>
                      <ul className="text-yellow-800 space-y-1">
                        <li>• Your biometric data is processed locally</li>
                        <li>• Face templates are encrypted and never shared</li>
                        <li>• You can disable this feature anytime</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setCurrentStep('security')}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button 
                    onClick={handleBiometricEnrollment}
                    disabled={isScanning}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {isScanning ? 'Scanning...' : 'Enroll Face'}
                  </Button>
                </div>
              </>
            ) : (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center space-y-4"
              >
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-green-700">Biometric Enrolled Successfully!</h4>
                  <p className="text-sm text-green-600">Your face has been registered securely</p>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Registration Complete */}
        {currentStep === 'complete' && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="text-center space-y-6"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            >
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
            </motion.div>

            <div>
              <h3 className="text-xl font-bold text-green-700 mb-2">Welcome to FacePay!</h3>
              <p className="text-gray-600">Your account has been created successfully</p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-left">
              <h4 className="font-medium text-green-900 mb-2">Account Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-700">Name:</span>
                  <span className="text-green-900">{formData.firstName} {formData.lastName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Email:</span>
                  <span className="text-green-900">{formData.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Biometric:</span>
                  <span className="text-green-900">✓ Enabled</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                Start Using FacePay
              </Button>
              <Button variant="outline" className="w-full">
                Account Settings
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}