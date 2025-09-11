'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Shield, Zap, DollarSign, Lock } from 'lucide-react';
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
    <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Secure Payment</h2>
        <p className="text-gray-600">Complete your transaction with biometric verification</p>
      </div>

      {/* Payment Steps Indicator */}
      <div className="flex justify-between items-center">
        {['Details', 'Verify', 'Process', 'Complete'].map((step, index) => {
          const currentIndex = ['details', 'verification', 'processing', 'complete'].indexOf(paymentStep);
          const isActive = index <= currentIndex;
          const isCurrent = index === currentIndex;
          
          return (
            <div key={step} className="flex flex-col items-center">
              <motion.div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  isActive ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
                }`}
                animate={{ 
                  scale: isCurrent ? 1.1 : 1,
                  backgroundColor: isActive ? '#3B82F6' : '#E5E7EB'
                }}
                transition={{ duration: 0.3 }}
              >
                {index + 1}
              </motion.div>
              <span className={`text-xs mt-1 ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                {step}
              </span>
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
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <DollarSign className="w-6 h-6 text-blue-600 mr-1" />
                <span className="text-3xl font-bold text-blue-900">{formData.amount.toFixed(2)}</span>
              </div>
              {recipient && (
                <p className="text-sm text-blue-700">To: {recipient}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="What's this payment for?"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            {/* Payment Method Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Payment Method
              </label>
              <div className="space-y-2">
                <motion.div
                  className={`border-2 rounded-lg p-3 cursor-pointer transition-colors ${
                    paymentMethod === 'face' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                  onClick={() => setPaymentMethod('face')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center">
                    <Shield className="w-5 h-5 text-blue-600 mr-3" />
                    <div>
                      <p className="font-medium text-gray-900">Biometric Verification</p>
                      <p className="text-sm text-gray-500">Secure face recognition</p>
                    </div>
                    <div className="ml-auto">
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        paymentMethod === 'face' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                      }`}>
                        {paymentMethod === 'face' && (
                          <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5" />
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  className={`border-2 rounded-lg p-3 cursor-pointer transition-colors ${
                    paymentMethod === 'card' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                  onClick={() => setPaymentMethod('card')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center">
                    <CreditCard className="w-5 h-5 text-gray-600 mr-3" />
                    <div>
                      <p className="font-medium text-gray-900">Credit Card</p>
                      <p className="text-sm text-gray-500">Traditional payment</p>
                    </div>
                    <div className="ml-auto">
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        paymentMethod === 'card' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                      }`}>
                        {paymentMethod === 'card' && (
                          <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5" />
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full payment-flow-glow bg-blue-600 hover:bg-blue-700"
            >
              <Lock className="w-4 h-4 mr-2" />
              Proceed to Payment
            </Button>
            
            {onCancel && (
              <Button 
                type="button"
                onClick={onCancel}
                variant="outline"
                className="w-full mt-3 text-gray-600 hover:text-gray-800"
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
                <Shield className="w-5 h-5 text-yellow-600 mr-2" />
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