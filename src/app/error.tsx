'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, Home, ShieldCheck, Bug, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-2xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
        >
          {/* Error Icon */}
          <div className="relative mb-8">
            <div className="w-32 h-32 mx-auto bg-gradient-to-br from-red-100 to-orange-100 rounded-3xl flex items-center justify-center mb-6">
              <AlertTriangle className="w-16 h-16 text-red-600" />
            </div>
            
            {/* Animated rings */}
            <motion.div
              className="absolute inset-0 w-32 h-32 mx-auto border-2 border-red-200 rounded-3xl"
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.div
              className="absolute inset-0 w-32 h-32 mx-auto border-2 border-orange-200 rounded-3xl"
              animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            />
          </div>

          {/* Error Content */}
          <div className="space-y-6">
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold text-red-600 mb-4">
                System Error
              </h1>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                Something went wrong
              </h2>
              <p className="text-lg text-gray-600 max-w-lg mx-auto leading-relaxed">
                We encountered an unexpected error. Your data is safe and secure. 
                Please try again or contact our support team.
              </p>
            </div>

            {/* Error details */}
            {process.env.NODE_ENV === 'development' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="bg-gray-100 border border-gray-200 rounded-xl p-6 max-w-lg mx-auto text-left"
              >
                <div className="flex items-center space-x-3 mb-3">
                  <Bug className="w-5 h-5 text-gray-600" />
                  <h3 className="font-semibold text-gray-900">Debug Information</h3>
                </div>
                <div className="text-sm text-gray-700 font-mono bg-white p-3 rounded border overflow-x-auto">
                  {error.message}
                </div>
                {error.digest && (
                  <p className="text-xs text-gray-500 mt-2">
                    Error ID: {error.digest}
                  </p>
                )}
              </motion.div>
            )}

            {/* Security notice */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 max-w-md mx-auto"
            >
              <div className="flex items-center space-x-3">
                <ShieldCheck className="w-6 h-6 text-blue-600 flex-shrink-0" />
                <div className="text-left">
                  <h3 className="font-semibold text-blue-900">Your Data is Safe</h3>
                  <p className="text-sm text-blue-700">
                    All transactions and personal information remain secure. 
                    This error does not affect your account security.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Action buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto"
            >
              <Button 
                onClick={() => reset()}
                className="btn-primary w-full sm:w-auto text-lg px-8 py-4"
              >
                <RefreshCw className="w-5 h-5 mr-3" />
                Try Again
              </Button>
              
              <Button 
                onClick={() => window.location.href = '/'}
                variant="outline" 
                className="w-full sm:w-auto text-lg px-8 py-4 border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50"
              >
                <Home className="w-5 h-5 mr-3" />
                Back to Home
              </Button>
            </motion.div>

            {/* Support section */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="pt-8 border-t border-gray-200 max-w-md mx-auto"
            >
              <p className="text-gray-500 text-sm mb-4">
                Still having trouble? Our support team is here to help 24/7
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.href = 'mailto:support@facepay.com'}
                  className="text-sm border-gray-300 hover:border-blue-500 hover:bg-blue-50"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Email Support
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('/help', '_blank')}
                  className="text-sm border-gray-300 hover:border-blue-500 hover:bg-blue-50"
                >
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Help Center
                </Button>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}