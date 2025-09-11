'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, ShieldCheck, Zap, DollarSign, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FaceScanAnimation from './FaceScanAnimation';

interface PaymentFormProps {
  amount: number;
  recipient?: string;
  description?: string;
  onSuccess?: (paymentData: any) => void;
  onCancel?: () => void;
  onPaymentComplete?: (paymentData: any) => void;
}

export default function PaymentForm({ 
  amount, 
  recipient, 
  description, 
  onSuccess, 
  onCancel, 
  onPaymentComplete 
}: PaymentFormProps) {
  const [paymentStep, setPaymentStep] = useState<'details' | 'verification' | 'processing' | 'complete'>('details');
  const [isScanning, setIsScanning] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'face' | 'card'>('face');
  const [formData, setFormData] = useState({
    amount: amount,
    description: description || '',
    paymentMethod: 'face'
  });

  const handleFaceScanComplete = () => {
    setIsScanning(false);
    setPaymentStep('processing');
    
    // Simulate payment processing
    setTimeout(() => {
      setPaymentStep('complete');
      const paymentData = {
        amount: formData.amount,
        method: 'biometric',
        timestamp: new Date(),
        recipient
      };
      onPaymentComplete?.(paymentData);
      onSuccess?.(paymentData);
    }, 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentMethod === 'face') {
      setPaymentStep('verification');
      setIsScanning(true);
    } else if (paymentMethod === 'card') {
      await handleStripeCheckout();
    }
  };

  const handleStripeCheckout = async () => {
    try {
      setPaymentStep('processing');
      
      const response = await fetch('/api/payments/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          amount: formData.amount,
          description: formData.description || 'FacePay Payment',
          metadata: {
            recipient: recipient || 'N/A',
            paymentMethod: 'stripe_checkout',
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { data } = await response.json();
      
      // Redirect to Stripe Checkout
      if (data.sessionUrl) {
        window.location.href = data.sessionUrl;
      }
    } catch (error) {
      console.error('Stripe checkout error:', error);
      // Reset to details step on error
      setPaymentStep('details');
      // You might want to show an error message here
    }
  };

  return (
    <div className="max-w-md mx-auto card-premium p-8 space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <ShieldCheck className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">Secure Payment</h2>
        <p className="text-gray-600 text-base">Complete your transaction with biometric verification</p>
      </div>

      {/* Payment Steps Indicator */}
      <div className="flex justify-between items-center bg-gray-50/50 rounded-2xl p-4 dark:bg-gray-800/50">
        {['Details', 'Verify', 'Process', 'Complete'].map((step, index) => {
          const currentIndex = ['details', 'verification', 'processing', 'complete'].indexOf(paymentStep);
          const isActive = index <= currentIndex;
          const isCurrent = index === currentIndex;
          
          return (
            <div key={step} className="flex flex-col items-center relative">
              <motion.div
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-semibold shadow-sm ${
                  isActive 
                    ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25' 
                    : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                }`}
                animate={{ 
                  scale: isCurrent ? 1.1 : 1,
                  boxShadow: isActive ? '0 10px 25px -3px rgba(59, 130, 246, 0.25), 0 4px 6px -2px rgba(59, 130, 246, 0.05)' : 'none'
                }}
                transition={{ duration: 0.3 }}
              >
                {index + 1}
              </motion.div>
              <span className={`text-xs mt-2 font-medium ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
                {step}
              </span>
              {/* Connection line */}
              {index < 3 && (
                <div className={`absolute top-5 left-12 w-8 h-0.5 ${
                  index < currentIndex ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                } transition-colors duration-300`} />
              )}
            </div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* Payment Details */}
        {paymentStep === 'details' && (
          <motion.form
            key="details"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {/* Amount */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 text-center border border-blue-200/50 dark:border-blue-800/50">
              <div className="flex items-center justify-center mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mr-3">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <span className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {formData.amount.toFixed(2)}
                </span>
              </div>
              {recipient && (
                <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">To: {recipient}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="form-label">
                Description (Optional)
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="What's this payment for?"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            {/* Payment Method Selection */}
            <div>
              <label className="form-label">
                Payment Method
              </label>
              <div className="space-y-3">
                <motion.div
                  className={`border-2 rounded-xl p-4 cursor-pointer transition-all duration-200 ${
                    paymentMethod === 'face' 
                      ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg shadow-blue-500/10 dark:from-blue-900/20 dark:to-indigo-900/20 dark:border-blue-400' 
                      : 'border-gray-200 bg-white/50 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:bg-gray-700/50'
                  }`}
                  onClick={() => setPaymentMethod('face')}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mr-4 ${
                      paymentMethod === 'face'
                        ? 'bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg'
                        : 'bg-gray-100 dark:bg-gray-700'
                    }`}>
                      <ShieldCheck className={`w-6 h-6 ${
                        paymentMethod === 'face' ? 'text-white' : 'text-gray-600 dark:text-gray-400'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 dark:text-white">Biometric Verification</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Secure face recognition • Instant</p>
                    </div>
                    <div className="ml-4">
                      <div className={`w-5 h-5 rounded-full border-2 transition-all ${
                        paymentMethod === 'face' 
                          ? 'border-blue-500 bg-blue-500 shadow-sm' 
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {paymentMethod === 'face' && (
                          <motion.div 
                            className="w-2 h-2 bg-white rounded-full mx-auto mt-1"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.2 }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  className={`border-2 rounded-xl p-4 cursor-pointer transition-all duration-200 ${
                    paymentMethod === 'card' 
                      ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg shadow-blue-500/10 dark:from-blue-900/20 dark:to-indigo-900/20 dark:border-blue-400' 
                      : 'border-gray-200 bg-white/50 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:bg-gray-700/50'
                  }`}
                  onClick={() => setPaymentMethod('card')}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mr-4 ${
                      paymentMethod === 'card'
                        ? 'bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg'
                        : 'bg-gray-100 dark:bg-gray-700'
                    }`}>
                      <CreditCard className={`w-6 h-6 ${
                        paymentMethod === 'card' ? 'text-white' : 'text-gray-600 dark:text-gray-400'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 dark:text-white">Credit Card</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Traditional payment • Secure</p>
                    </div>
                    <div className="ml-4">
                      <div className={`w-5 h-5 rounded-full border-2 transition-all ${
                        paymentMethod === 'card' 
                          ? 'border-blue-500 bg-blue-500 shadow-sm' 
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {paymentMethod === 'card' && (
                          <motion.div 
                            className="w-2 h-2 bg-white rounded-full mx-auto mt-1"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.2 }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>

            <Button 
              type="submit" 
              variant="payment"
              size="lg"
              className="w-full mt-6"
            >
              <Lock className="w-4 h-4 mr-2" />
              Proceed to Payment
            </Button>
            
            {onCancel && (
              <Button 
                type="button"
                onClick={onCancel}
                variant="outline"
                className="w-full mt-3"
              >
                Cancel Payment
              </Button>
            )}
          </motion.form>
        )}

        {/* Biometric Verification */}
        {paymentStep === 'verification' && (
          <motion.div
            key="verification"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="text-center space-y-6"
          >
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Biometric Verification</h3>
              <p className="text-gray-600">Look at the camera and stay still</p>
            </div>
            
            <div className="flex justify-center">
              <FaceScanAnimation 
                isScanning={isScanning}
                onScanComplete={handleFaceScanComplete}
                size="lg"
              />
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center">
                <ShieldCheck className="w-5 h-5 text-yellow-600 mr-2" />
                <p className="text-sm text-yellow-800">
                  Your biometric data is processed securely and never stored
                </p>
              </div>
            </div>
            
            {onCancel && (
              <Button 
                onClick={() => {
                  setIsScanning(false);
                  onCancel();
                }}
                variant="outline"
                className="w-full text-gray-600 hover:text-gray-800"
              >
                Cancel Verification
              </Button>
            )}
          </motion.div>
        )}

        {/* Processing */}
        {paymentStep === 'processing' && (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center space-y-6"
          >
            <div>
              <motion.div
                className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-4"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Processing Payment</h3>
              <p className="text-gray-600">Securing your transaction...</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-800">Amount:</span>
                <span className="font-semibold text-blue-900">${formData.amount.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-blue-800">Method:</span>
                <span className="font-semibold text-blue-900">Biometric</span>
              </div>
              {recipient && (
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-blue-800">Recipient:</span>
                  <span className="font-semibold text-blue-900">{recipient}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Complete */}
        {paymentStep === 'complete' && (
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
                <motion.svg
                  className="w-10 h-10 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <motion.path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </motion.svg>
              </div>
            </motion.div>

            <div>
              <h3 className="text-xl font-bold text-green-700 mb-2">Payment Successful!</h3>
              <p className="text-gray-600">Your transaction has been completed securely</p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-left">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-green-800">Amount Paid:</span>
                <span className="font-bold text-green-900">${formData.amount.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-green-800">Transaction ID:</span>
                <span className="font-mono text-xs text-green-900">TXN{Date.now()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-green-800">Timestamp:</span>
                <span className="text-green-900">{new Date().toLocaleTimeString()}</span>
              </div>
            </div>

            <Button 
              onClick={() => setPaymentStep('details')}
              variant="outline"
              className="w-full"
            >
              New Payment
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}