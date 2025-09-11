'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CreditCard, 
  ShieldCheck, 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Lock,
  User,
  Mail,
  Phone,
  MapPin,
  Truck,
  Star,
  Camera
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import PaymentForm from '@/components/PaymentForm';
import FaceScanAnimation from '@/components/FaceScanAnimation';
import ErrorBoundary, { PaymentError, BiometricError } from '@/components/ErrorBoundary';
import { LoadingOverlay, PaymentProcessing } from '@/components/LoadingStates';

interface CheckoutItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface ShippingInfo {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

export default function CheckoutPage() {
  const [currentStep, setCurrentStep] = useState<'cart' | 'shipping' | 'payment' | 'confirmation'>('cart');
  const [paymentMethod, setPaymentMethod] = useState<'biometric' | 'stripe'>('biometric');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<'verifying' | 'processing' | 'confirming'>('verifying');
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [transactionId, setTransactionId] = useState<string>('');
  const [isBiometricSupported, setIsBiometricSupported] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  // Mock cart items - in real app this would come from context/store
  const [cartItems] = useState<CheckoutItem[]>([
    { id: '1', name: 'Premium Coffee Beans', price: 24.99, quantity: 2 },
    { id: '2', name: 'Artisan Chocolate', price: 12.50, quantity: 1 },
    { id: '3', name: 'Organic Tea Set', price: 35.00, quantity: 1 }
  ]);

  const [shippingInfo, setShippingInfo] = useState<ShippingInfo>({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: ''
  });

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = 5.99;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  const steps = [
    { key: 'cart', label: 'Cart', description: 'Review items' },
    { key: 'shipping', label: 'Shipping', description: 'Delivery info' },
    { key: 'payment', label: 'Payment', description: 'Secure checkout' },
    { key: 'confirmation', label: 'Complete', description: 'Order confirmed' }
  ];

  const handlePaymentComplete = async (paymentData: any) => {
    setIsProcessing(true);
    setPaymentStatus('idle');
    setErrorMessage('');
    
    try {
      // Step 1: Verify biometric data (if using biometric payment)
      if (paymentMethod === 'biometric') {
        setProcessingStep('verifying');
        await simulateBiometricVerification();
      }
      
      // Step 2: Process payment
      setProcessingStep('processing');
      const result = await simulatePaymentProcessing(paymentData);
      
      // Step 3: Confirm transaction
      setProcessingStep('confirming');
      await simulateTransactionConfirmation(result);
      
      // Success
      setTransactionId(`TXN-${Date.now()}`);
      setPaymentStatus('success');
      setCurrentStep('confirmation');
      setRetryCount(0);
      
    } catch (error) {
      setPaymentStatus('error');
      
      if (error instanceof BiometricError) {
        setErrorMessage(`Biometric verification failed: ${error.message}`);
        if (error.retry && retryCount < 3) {
          setRetryCount(prev => prev + 1);
        } else {
          setIsBiometricSupported(false);
          setPaymentMethod('stripe');
          setErrorMessage('Biometric authentication unavailable. Please use card payment.');
        }
      } else if (error instanceof PaymentError) {
        setErrorMessage(`Payment failed: ${error.message}`);
      } else {
        setErrorMessage('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const simulateBiometricVerification = async () => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Simulate potential biometric failures
    const random = Math.random();
    if (random < 0.1) { // 10% chance of failure
      throw new BiometricError('Face not detected clearly', 'FACE_NOT_CLEAR', true);
    }
    if (random < 0.05) { // 5% chance of system error
      throw new BiometricError('Biometric system unavailable', 'SYSTEM_ERROR', false);
    }
  };

  const simulatePaymentProcessing = async (paymentData: any) => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate payment processing
    const random = Math.random();
    if (random < 0.05) { // 5% chance of payment failure
      throw new PaymentError('Insufficient funds', 'INSUFFICIENT_FUNDS');
    }
    
    return {
      transactionId: `TXN-${Date.now()}`,
      amount: total,
      status: 'processed'
    };
  };

  const simulateTransactionConfirmation = async (result: any) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Final confirmation step
    return result;
  };

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Validate shipping info
    const requiredFields = ['fullName', 'email', 'address', 'city', 'state', 'zipCode'];
    const isValid = requiredFields.every(field => shippingInfo[field as keyof ShippingInfo]?.trim());
    
    if (isValid) {
      setCurrentStep('payment');
    } else {
      setErrorMessage('Please fill in all required shipping information.');
    }
  };

  const getCurrentStepIndex = () => {
    return steps.findIndex(step => step.key === currentStep);
  };

  return (
    <ErrorBoundary>
      {isProcessing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <PaymentProcessing 
            step={processingStep}
            amount={total}
            method={paymentMethod === 'biometric' ? 'FacePay Biometric' : 'Credit Card'}
          />
        </div>
      )}
      
      <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => window.history.back()}
                className="mr-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
            </div>
            <div className="text-sm text-gray-600">
              Secure Checkout with FacePay
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {steps.map((step, index) => {
              const isActive = index <= getCurrentStepIndex();
              const isCurrent = step.key === currentStep;
              
              return (
                <div key={step.key} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <motion.div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                        isActive ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                      }`}
                      animate={{ 
                        scale: isCurrent ? 1.1 : 1,
                        backgroundColor: isActive ? '#2563EB' : '#E5E7EB'
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      {index + 1}
                    </motion.div>
                    <div className="text-center mt-2">
                      <p className={`text-sm font-medium ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                        {step.label}
                      </p>
                      <p className={`text-xs ${isActive ? 'text-blue-500' : 'text-gray-400'}`}>
                        {step.description}
                      </p>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-16 h-0.5 mx-4 ${isActive ? 'bg-blue-600' : 'bg-gray-200'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {/* Cart Review */}
              {currentStep === 'cart' && (
                <motion.div
                  key="cart"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white rounded-2xl shadow-sm p-6"
                >
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Review Your Order</h2>
                  
                  <div className="space-y-4">
                    {cartItems.map((item) => (
                      <div key={item.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                        <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                          <div className="text-gray-400 text-xs">IMG</div>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{item.name}</h3>
                          <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">${(item.price * item.quantity).toFixed(2)}</p>
                          <p className="text-sm text-gray-600">${item.price.toFixed(2)} each</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 pt-6 border-t">
                    <Button 
                      onClick={() => setCurrentStep('shipping')}
                      className="w-full"
                    >
                      Continue to Shipping
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Shipping Information */}
              {currentStep === 'shipping' && (
                <motion.div
                  key="shipping"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white rounded-2xl shadow-sm p-6"
                >
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Shipping Information</h2>
                  
                  <form onSubmit={handleShippingSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          <User className="w-4 h-4 inline mr-1" />
                          Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          value={shippingInfo.fullName}
                          onChange={(e) => setShippingInfo(prev => ({ ...prev, fullName: e.target.value }))}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          <Mail className="w-4 h-4 inline mr-1" />
                          Email *
                        </label>
                        <input
                          type="email"
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          value={shippingInfo.email}
                          onChange={(e) => setShippingInfo(prev => ({ ...prev, email: e.target.value }))}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          <Phone className="w-4 h-4 inline mr-1" />
                          Phone
                        </label>
                        <input
                          type="tel"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          value={shippingInfo.phone}
                          onChange={(e) => setShippingInfo(prev => ({ ...prev, phone: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <MapPin className="w-4 h-4 inline mr-1" />
                        Address *
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={shippingInfo.address}
                        onChange={(e) => setShippingInfo(prev => ({ ...prev, address: e.target.value }))}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                        <input
                          type="text"
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          value={shippingInfo.city}
                          onChange={(e) => setShippingInfo(prev => ({ ...prev, city: e.target.value }))}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                        <input
                          type="text"
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          value={shippingInfo.state}
                          onChange={(e) => setShippingInfo(prev => ({ ...prev, state: e.target.value }))}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code *</label>
                        <input
                          type="text"
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          value={shippingInfo.zipCode}
                          onChange={(e) => setShippingInfo(prev => ({ ...prev, zipCode: e.target.value }))}
                        />
                      </div>
                    </div>

                    {errorMessage && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center">
                        <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                        <p className="text-sm text-red-700">{errorMessage}</p>
                      </div>
                    )}

                    <div className="flex space-x-4 pt-4">
                      <Button 
                        type="button"
                        variant="outline"
                        onClick={() => setCurrentStep('cart')}
                        className="flex-1"
                      >
                        Back to Cart
                      </Button>
                      <Button type="submit" className="flex-1">
                        Continue to Payment
                      </Button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* Payment */}
              {currentStep === 'payment' && (
                <motion.div
                  key="payment"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white rounded-2xl shadow-sm p-6"
                >
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Payment Method</h2>
                  
                  {/* Payment Method Selection */}
                  <div className="mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <motion.div
                        className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                          paymentMethod === 'biometric' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                        } ${!isBiometricSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={() => isBiometricSupported && setPaymentMethod('biometric')}
                        whileHover={{ scale: isBiometricSupported ? 1.02 : 1 }}
                        whileTap={{ scale: isBiometricSupported ? 0.98 : 1 }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="relative">
                              <ShieldCheck className="w-6 h-6 text-blue-600 mr-3" />
                              {!isBiometricSupported && (
                                <XCircle className="w-3 h-3 text-red-500 absolute -top-1 -right-1" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center">
                                <p className="font-medium text-gray-900">FacePay Biometric</p>
                                {retryCount > 0 && (
                                  <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                                    Retry {retryCount}/3
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-500">
                                {isBiometricSupported ? 'Secure face recognition' : 'Currently unavailable'}
                              </p>
                              <div className="flex items-center mt-1">
                                <Camera className="w-3 h-3 text-green-600 mr-1" />
                                <span className="text-xs text-green-600">Camera required</span>
                              </div>
                            </div>
                          </div>
                          {paymentMethod === 'biometric' && isBiometricSupported && (
                            <div className="flex items-center space-x-1">
                              <Star className="w-4 h-4 text-yellow-500 fill-current" />
                              <span className="text-xs text-gray-600">Recommended</span>
                            </div>
                          )}
                        </div>
                      </motion.div>

                      <motion.div
                        className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                          paymentMethod === 'stripe' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                        }`}
                        onClick={() => setPaymentMethod('stripe')}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center">
                          <CreditCard className="w-6 h-6 text-gray-600 mr-3" />
                          <div>
                            <p className="font-medium text-gray-900">Credit/Debit Card</p>
                            <p className="text-sm text-gray-500">Traditional payment</p>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  </div>

                  {/* Payment Form */}
                  {paymentMethod === 'biometric' ? (
                    <PaymentForm
                      amount={total}
                      recipient="Online Store"
                      onPaymentComplete={handlePaymentComplete}
                    />
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-6 text-center">
                      <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Stripe payment integration would be implemented here</p>
                      <Button 
                        onClick={() => handlePaymentComplete({ method: 'stripe' })}
                        className="mt-4"
                        disabled={isProcessing}
                      >
                        {isProcessing ? 'Processing...' : 'Pay with Card'}
                      </Button>
                    </div>
                  )}

                  <div className="mt-6 pt-6 border-t">
                    <Button 
                      variant="outline"
                      onClick={() => setCurrentStep('shipping')}
                      className="w-full"
                    >
                      Back to Shipping
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Confirmation */}
              {currentStep === 'confirmation' && (
                <motion.div
                  key="confirmation"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-white rounded-2xl shadow-sm p-6 text-center"
                >
                  {paymentStatus === 'success' ? (
                    <>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                        className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
                      >
                        <CheckCircle className="w-10 h-10 text-green-600" />
                      </motion.div>

                      <h2 className="text-2xl font-bold text-green-700 mb-2">Order Confirmed!</h2>
                      <p className="text-gray-600 mb-6">Thank you for your purchase. Your order has been successfully processed.</p>

                      {/* Receipt */}
                      <div className="bg-white border-2 border-green-200 rounded-lg p-6 text-left mb-6 shadow-sm">
                        <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
                          <h4 className="font-semibold text-gray-900">Receipt</h4>
                          <span className="text-xs text-gray-500">
                            {new Date().toLocaleString()}
                          </span>
                        </div>
                        
                        {/* Transaction Details */}
                        <div className="space-y-3 mb-4">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Transaction ID:</span>
                            <span className="font-mono text-gray-900 text-xs">{transactionId}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Payment Method:</span>
                            <div className="flex items-center">
                              {paymentMethod === 'biometric' ? (
                                <>
                                  <ShieldCheck className="w-3 h-3 text-blue-600 mr-1" />
                                  <span className="text-gray-900">FacePay Biometric</span>
                                </>
                              ) : (
                                <>
                                  <CreditCard className="w-3 h-3 text-gray-600 mr-1" />
                                  <span className="text-gray-900">Credit Card</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Order Items */}
                        <div className="border-t border-gray-200 pt-3 mb-4">
                          <h5 className="text-sm font-medium text-gray-900 mb-2">Items Purchased</h5>
                          {cartItems.map((item) => (
                            <div key={item.id} className="flex justify-between text-sm py-1">
                              <span className="text-gray-600">
                                {item.name} x{item.quantity}
                              </span>
                              <span className="text-gray-900">
                                ${(item.price * item.quantity).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Order Summary */}
                        <div className="border-t border-gray-200 pt-3 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Subtotal:</span>
                            <span className="text-gray-900">${subtotal.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Shipping:</span>
                            <span className="text-gray-900">${shipping.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Tax:</span>
                            <span className="text-gray-900">${tax.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-base font-semibold border-t pt-2">
                            <span className="text-gray-900">Total Paid:</span>
                            <span className="text-green-700">${total.toFixed(2)}</span>
                          </div>
                        </div>

                        {/* Shipping Info */}
                        <div className="border-t border-gray-200 pt-3 mt-4">
                          <h5 className="text-sm font-medium text-gray-900 mb-2">Delivery Address</h5>
                          <div className="text-sm text-gray-600">
                            <p>{shippingInfo.fullName}</p>
                            <p>{shippingInfo.address}</p>
                            <p>{shippingInfo.city}, {shippingInfo.state} {shippingInfo.zipCode}</p>
                            {shippingInfo.email && <p className="mt-1">{shippingInfo.email}</p>}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Button className="w-full bg-green-600 hover:bg-green-700">
                          <Truck className="w-4 h-4 mr-2" />
                          Track Your Order
                        </Button>
                        <div className="grid grid-cols-2 gap-3">
                          <Button variant="outline" className="w-full">
                            <Mail className="w-4 h-4 mr-2" />
                            Email Receipt
                          </Button>
                          <Button variant="outline" className="w-full">
                            Continue Shopping
                          </Button>
                        </div>
                        
                        {/* Estimated Delivery */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                          <div className="flex items-center mb-2">
                            <Truck className="w-4 h-4 text-blue-600 mr-2" />
                            <span className="font-medium text-blue-900">Estimated Delivery</span>
                          </div>
                          <p className="text-sm text-blue-800">
                            Your order will arrive in 3-5 business days
                          </p>
                          <p className="text-xs text-blue-600 mt-1">
                            Expected delivery: {new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                        className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6"
                      >
                        <XCircle className="w-10 h-10 text-red-600" />
                      </motion.div>

                      <h2 className="text-2xl font-bold text-red-700 mb-2">Payment Failed</h2>
                      <p className="text-gray-600 mb-6">{errorMessage || 'Something went wrong with your payment. Please try again.'}</p>

                      <Button 
                        onClick={() => setCurrentStep('payment')}
                        className="w-full"
                      >
                        Try Again
                      </Button>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal ({cartItems.length} items)</span>
                  <span className="text-gray-900">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="text-gray-900">${shipping.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax</span>
                  <span className="text-gray-900">${tax.toFixed(2)}</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between font-semibold text-lg">
                    <span className="text-gray-900">Total</span>
                    <span className="text-gray-900">${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center text-sm text-gray-600">
                  <Lock className="w-4 h-4 mr-2" />
                  <span>Secure checkout with 256-bit SSL encryption</span>
                </div>
              </div>

              {/* Security Features */}
              <div className="mt-4 space-y-2 text-xs text-gray-500">
                <div className="flex items-center">
                  <ShieldCheck className="w-3 h-3 mr-2" />
                  <span>Biometric authentication</span>
                </div>
                <div className="flex items-center">
                  <Lock className="w-3 h-3 mr-2" />
                  <span>PCI DSS compliant</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-3 h-3 mr-2" />
                  <span>30-day money back guarantee</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </ErrorBoundary>
  );
}