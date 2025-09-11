'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CreditCard, 
  Plus, 
  Trash2, 
  Star, 
  Edit3, 
  Wallet, 
  Bitcoin,
  CheckCircle,
  AlertCircle,
  X
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { PaymentMethod } from '@/types';

interface AddPaymentMethodForm {
  type: 'card' | 'bank' | 'crypto';
  provider: 'stripe' | 'ethereum' | 'bitcoin';
  cardNumber?: string;
  expiryMonth?: string;
  expiryYear?: string;
  cvc?: string;
  walletAddress?: string;
  network?: string;
  isDefault: boolean;
}

export default function PaymentMethodsPage() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [formData, setFormData] = useState<AddPaymentMethodForm>({
    type: 'card',
    provider: 'stripe',
    isDefault: false
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch('/api/payments/methods');
      if (response.ok) {
        const data = await response.json();
        setPaymentMethods(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch payment methods:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (formData.type === 'card') {
      if (!formData.cardNumber?.replace(/\s/g, '')) {
        newErrors.cardNumber = 'Card number is required';
      } else if (!/^\d{13,19}$/.test(formData.cardNumber.replace(/\s/g, ''))) {
        newErrors.cardNumber = 'Please enter a valid card number';
      }

      if (!formData.expiryMonth) {
        newErrors.expiryMonth = 'Expiry month is required';
      }

      if (!formData.expiryYear) {
        newErrors.expiryYear = 'Expiry year is required';
      }

      if (!formData.cvc) {
        newErrors.cvc = 'CVC is required';
      } else if (!/^\d{3,4}$/.test(formData.cvc)) {
        newErrors.cvc = 'Please enter a valid CVC';
      }
    } else if (formData.type === 'crypto') {
      if (!formData.walletAddress) {
        newErrors.walletAddress = 'Wallet address is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddPaymentMethod = async () => {
    if (!validateForm()) return;

    setProcessing(true);
    try {
      // For demo purposes, we'll simulate adding a payment method
      // In a real app, you'd integrate with Stripe or other payment processors
      const newMethod: PaymentMethod = {
        id: Date.now().toString(),
        userId: 'user-id',
        type: formData.type,
        provider: formData.provider,
        details: formData.type === 'card' ? {
          last4: formData.cardNumber?.slice(-4),
          brand: 'visa', // This would be detected from the card number
          expMonth: parseInt(formData.expiryMonth || '0'),
          expYear: parseInt(formData.expiryYear || '0')
        } : {
          walletAddress: formData.walletAddress,
          network: formData.network || 'mainnet'
        },
        isDefault: formData.isDefault,
        createdAt: new Date()
      };

      const response = await fetch('/api/payments/methods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: formData.type,
          provider: formData.provider,
          ...(formData.type === 'crypto' && {
            walletAddress: formData.walletAddress,
            network: formData.network
          }),
          isDefault: formData.isDefault
        })
      });

      if (response.ok) {
        await fetchPaymentMethods();
        setShowAddForm(false);
        setFormData({
          type: 'card',
          provider: 'stripe',
          isDefault: false
        });
        setErrors({});
      }
    } catch (error) {
      console.error('Failed to add payment method:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleRemovePaymentMethod = async (id: string) => {
    try {
      const response = await fetch(`/api/payments/methods/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setPaymentMethods(prev => prev.filter(method => method.id !== id));
      }
    } catch (error) {
      console.error('Failed to remove payment method:', error);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const response = await fetch(`/api/payments/methods/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isDefault: true })
      });

      if (response.ok) {
        await fetchPaymentMethods();
      }
    } catch (error) {
      console.error('Failed to set default payment method:', error);
    }
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const getPaymentMethodIcon = (method: PaymentMethod) => {
    if (method.type === 'crypto') {
      return method.provider === 'bitcoin' ? Bitcoin : Wallet;
    }
    return CreditCard;
  };

  const getPaymentMethodLabel = (method: PaymentMethod) => {
    if (method.type === 'crypto') {
      const details = method.details as any;
      return `${method.provider.charAt(0).toUpperCase() + method.provider.slice(1)} Wallet (${details.walletAddress?.slice(0, 6)}...${details.walletAddress?.slice(-4)})`;
    } else {
      const details = method.details as any;
      return `${details.brand?.toUpperCase()} •••• ${details.last4}`;
    }
  };

  if (loading) {
    return (
      <DashboardLayout activeTab="payments">
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeTab="payments">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payment Methods</h1>
            <p className="text-gray-600 mt-1">Manage your cards and crypto wallets</p>
          </div>
          <Button
            onClick={() => setShowAddForm(true)}
            className="flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Payment Method</span>
          </Button>
        </div>

        {/* Payment Methods Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {paymentMethods.map((method, index) => {
            const Icon = getPaymentMethodIcon(method);
            return (
              <motion.div
                key={method.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 relative"
              >
                {method.isDefault && (
                  <div className="absolute top-4 right-4">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      <Star className="w-3 h-3 mr-1" />
                      Default
                    </span>
                  </div>
                )}

                <div className="flex items-center space-x-4 mb-4">
                  <div className={`p-3 rounded-full ${
                    method.type === 'crypto' ? 'bg-orange-100' : 'bg-blue-100'
                  }`}>
                    <Icon className={`w-6 h-6 ${
                      method.type === 'crypto' ? 'text-orange-600' : 'text-blue-600'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">
                      {getPaymentMethodLabel(method)}
                    </p>
                    <p className="text-sm text-gray-500 capitalize">
                      {method.type} • {method.provider}
                    </p>
                  </div>
                </div>

                {method.type === 'card' && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">
                      Expires {(method.details as any).expMonth?.toString().padStart(2, '0')}/{(method.details as any).expYear}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex space-x-2">
                    {!method.isDefault && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSetDefault(method.id)}
                        className="text-xs"
                      >
                        Set Default
                      </Button>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemovePaymentMethod(method.id)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}

          {paymentMethods.length === 0 && (
            <div className="col-span-full text-center py-12">
              <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No payment methods added</p>
              <p className="text-sm text-gray-400 mt-1">
                Add a card or crypto wallet to get started
              </p>
            </div>
          )}
        </div>

        {/* Add Payment Method Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Add Payment Method</h2>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Payment Type Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Payment Type
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, type: 'card', provider: 'stripe' }))}
                        className={`p-4 border rounded-lg flex items-center space-x-3 ${
                          formData.type === 'card'
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <CreditCard className="w-5 h-5" />
                        <span className="font-medium">Card</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, type: 'crypto', provider: 'ethereum' }))}
                        className={`p-4 border rounded-lg flex items-center space-x-3 ${
                          formData.type === 'crypto'
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <Wallet className="w-5 h-5" />
                        <span className="font-medium">Crypto</span>
                      </button>
                    </div>
                  </div>

                  {/* Card Form */}
                  {formData.type === 'card' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Card Number
                        </label>
                        <input
                          type="text"
                          value={formData.cardNumber || ''}
                          onChange={(e) => {
                            const formatted = formatCardNumber(e.target.value);
                            setFormData(prev => ({ ...prev, cardNumber: formatted }));
                          }}
                          placeholder="1234 5678 9012 3456"
                          className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            errors.cardNumber ? 'border-red-300' : 'border-gray-300'
                          }`}
                          maxLength={19}
                        />
                        {errors.cardNumber && (
                          <p className="mt-1 text-sm text-red-600">{errors.cardNumber}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Expiry Month
                          </label>
                          <select
                            value={formData.expiryMonth || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, expiryMonth: e.target.value }))}
                            className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                              errors.expiryMonth ? 'border-red-300' : 'border-gray-300'
                            }`}
                          >
                            <option value="">Month</option>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                              <option key={month} value={month}>
                                {month.toString().padStart(2, '0')}
                              </option>
                            ))}
                          </select>
                          {errors.expiryMonth && (
                            <p className="mt-1 text-sm text-red-600">{errors.expiryMonth}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Expiry Year
                          </label>
                          <select
                            value={formData.expiryYear || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, expiryYear: e.target.value }))}
                            className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                              errors.expiryYear ? 'border-red-300' : 'border-gray-300'
                            }`}
                          >
                            <option value="">Year</option>
                            {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map(year => (
                              <option key={year} value={year}>
                                {year}
                              </option>
                            ))}
                          </select>
                          {errors.expiryYear && (
                            <p className="mt-1 text-sm text-red-600">{errors.expiryYear}</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          CVC
                        </label>
                        <input
                          type="text"
                          value={formData.cvc || ''}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            setFormData(prev => ({ ...prev, cvc: value }));
                          }}
                          placeholder="123"
                          className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            errors.cvc ? 'border-red-300' : 'border-gray-300'
                          }`}
                          maxLength={4}
                        />
                        {errors.cvc && (
                          <p className="mt-1 text-sm text-red-600">{errors.cvc}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Crypto Form */}
                  {formData.type === 'crypto' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Network
                        </label>
                        <select
                          value={formData.provider}
                          onChange={(e) => setFormData(prev => ({ ...prev, provider: e.target.value as 'ethereum' | 'bitcoin' }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="ethereum">Ethereum</option>
                          <option value="bitcoin">Bitcoin</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Wallet Address
                        </label>
                        <input
                          type="text"
                          value={formData.walletAddress || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, walletAddress: e.target.value }))}
                          placeholder={formData.provider === 'ethereum' ? '0x...' : '1...'}
                          className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            errors.walletAddress ? 'border-red-300' : 'border-gray-300'
                          }`}
                        />
                        {errors.walletAddress && (
                          <p className="mt-1 text-sm text-red-600">{errors.walletAddress}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Set as Default */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isDefault"
                      checked={formData.isDefault}
                      onChange={(e) => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isDefault" className="ml-2 text-sm text-gray-900">
                      Set as default payment method
                    </label>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-3 pt-4">
                    <Button
                      onClick={handleAddPaymentMethod}
                      disabled={processing}
                      className="flex-1"
                    >
                      {processing ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        'Add Payment Method'
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowAddForm(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}