'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Home, Search, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-2xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
        >
          {/* Error Icon */}
          <div className="relative mb-8">
            <div className="w-32 h-32 mx-auto bg-gradient-to-br from-blue-100 to-purple-100 rounded-3xl flex items-center justify-center mb-6">
              <AlertTriangle className="w-16 h-16 text-blue-600" />
            </div>
            
            {/* Animated rings */}
            <motion.div
              className="absolute inset-0 w-32 h-32 mx-auto border-2 border-blue-200 rounded-3xl"
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.div
              className="absolute inset-0 w-32 h-32 mx-auto border-2 border-purple-200 rounded-3xl"
              animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            />
          </div>

          {/* Error Content */}
          <div className="space-y-6">
            <div>
              <h1 className="text-6xl sm:text-7xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
                404
              </h1>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                Page Not Found
              </h2>
              <p className="text-lg text-gray-600 max-w-lg mx-auto leading-relaxed">
                The page you're looking for doesn't exist or has been moved. 
                Let's get you back to your secure dashboard.
              </p>
            </div>

            {/* Security reminder */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 max-w-md mx-auto"
            >
              <div className="flex items-center space-x-3">
                <ShieldCheck className="w-6 h-6 text-blue-600 flex-shrink-0" />
                <div className="text-left">
                  <h3 className="font-semibold text-blue-900">Security Notice</h3>
                  <p className="text-sm text-blue-700">
                    All FacePay pages are secured with enterprise-grade encryption. 
                    If you believe this is an error, please contact support.
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
              <Link href="/">
                <Button className="btn-primary w-full sm:w-auto text-lg px-8 py-4">
                  <Home className="w-5 h-5 mr-3" />
                  Back to Home
                </Button>
              </Link>
              
              <Link href="/dashboard">
                <Button 
                  variant="outline" 
                  className="w-full sm:w-auto text-lg px-8 py-4 border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50"
                >
                  <ShieldCheck className="w-5 h-5 mr-3" />
                  Dashboard
                </Button>
              </Link>
            </motion.div>

            {/* Help section */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="pt-8 border-t border-gray-200 max-w-md mx-auto"
            >
              <p className="text-gray-500 text-sm mb-4">
                Need help? Try these popular pages:
              </p>
              <div className="flex flex-wrap justify-center gap-4 text-sm">
                <Link href="/auth" className="text-blue-600 hover:text-blue-700 hover:underline transition-colors">
                  Sign In
                </Link>
                <Link href="/payments" className="text-blue-600 hover:text-blue-700 hover:underline transition-colors">
                  Payments
                </Link>
                <Link href="/security" className="text-blue-600 hover:text-blue-700 hover:underline transition-colors">
                  Security
                </Link>
                <Link href="/profile" className="text-blue-600 hover:text-blue-700 hover:underline transition-colors">
                  Profile
                </Link>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}