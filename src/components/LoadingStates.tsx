'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, ShieldCheck, CreditCard, CheckCircle, Clock } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <motion.div
      className={`${sizeClasses[size]} ${className}`}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    >
      <Loader2 className="w-full h-full" />
    </motion.div>
  );
};

interface PaymentProcessingProps {
  step: 'verifying' | 'processing' | 'confirming';
  amount?: number;
  method?: string;
}

export const PaymentProcessing: React.FC<PaymentProcessingProps> = ({
  step,
  amount,
  method
}) => {
  const steps = [
    { key: 'verifying', label: 'Verifying Identity', icon: ShieldCheck },
    { key: 'processing', label: 'Processing Payment', icon: CreditCard },
    { key: 'confirming', label: 'Confirming Transaction', icon: CheckCircle }
  ];

  const currentStepIndex = steps.findIndex(s => s.key === step);

  return (
    <div className="card-premium p-8 max-w-md w-full">
      <div className="text-center">
        <motion.div
          className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <LoadingSpinner size="lg" className="text-blue-600" />
        </motion.div>

        <h3 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">
          {steps[currentStepIndex]?.label}
        </h3>
        <p className="text-gray-600 mb-6 text-base">
          Please wait while we securely process your transaction
        </p>

        {/* Progress Steps */}
        <div className="flex justify-center items-center space-x-2 mb-6 bg-gray-50/50 rounded-2xl p-4 dark:bg-gray-800/50">
          {steps.map((stepItem, index) => {
            const isActive = index <= currentStepIndex;
            const isCurrent = index === currentStepIndex;
            const Icon = stepItem.icon;
            
            return (
              <div key={stepItem.key} className="flex items-center">
                <motion.div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${
                    isActive 
                      ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25' 
                      : 'bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                  }`}
                  animate={{
                    scale: isCurrent ? [1, 1.1, 1] : 1,
                  }}
                  transition={{ 
                    duration: isCurrent ? 1.5 : 0.3,
                    repeat: isCurrent ? Infinity : 0
                  }}
                >
                  <Icon className="w-6 h-6" />
                </motion.div>
                {index < steps.length - 1 && (
                  <div className={`w-6 h-0.5 mx-3 rounded-full transition-colors ${
                    isActive ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Transaction Details */}
        {amount && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 space-y-3 border border-blue-200/50 dark:border-blue-800/50">
            <div className="flex justify-between text-sm">
              <span className="text-blue-800 dark:text-blue-300 font-medium">Amount:</span>
              <span className="font-bold text-blue-900 dark:text-blue-100">${amount.toFixed(2)}</span>
            </div>
            {method && (
              <div className="flex justify-between text-sm">
                <span className="text-blue-800 dark:text-blue-300 font-medium">Method:</span>
                <span className="text-blue-900 dark:text-blue-100 font-semibold">{method}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-blue-800 dark:text-blue-300 font-medium">Status:</span>
              <span className="text-blue-900 dark:text-blue-100 font-semibold">{steps[currentStepIndex]?.label}</span>
            </div>
          </div>
        )}

        {/* Security Notice */}
        <div className="mt-6 flex items-center justify-center text-xs text-gray-500">
          <ShieldCheck className="w-3 h-3 mr-1" />
          <span>Your data is encrypted and secure</span>
        </div>
      </div>
    </div>
  );
};

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => {
  return (
    <motion.div
      className={`bg-gray-200 rounded ${className}`}
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
    />
  );
};

export const CheckoutSkeleton: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Skeleton */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <Skeleton className="h-8 w-48 mb-6" />
            
            <div className="space-y-4">
              {[1, 2, 3].map((item) => (
                <div key={item} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                  <Skeleton className="w-16 h-16 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <div className="text-right space-y-1">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t">
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </div>

        {/* Sidebar Skeleton */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <Skeleton className="h-6 w-32 mb-4" />
            
            <div className="space-y-3">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="flex justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>

            <div className="border-t pt-3 mt-3">
              <div className="flex justify-between">
                <Skeleton className="h-5 w-12" />
                <Skeleton className="h-5 w-20" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface LoadingOverlayProps {
  message?: string;
  subMessage?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  message = "Loading...",
  subMessage
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="card-premium p-8 max-w-sm w-full mx-4"
      >
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <LoadingSpinner size="lg" className="text-blue-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2 tracking-tight">
            {message}
          </h3>
          {subMessage && (
            <p className="text-sm text-gray-600 leading-relaxed">
              {subMessage}
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

interface ProgressBarProps {
  progress: number;
  className?: string;
  showPercentage?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  className = '',
  showPercentage = false
}) => {
  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between items-center mb-2">
        {showPercentage && (
          <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
            {Math.round(progress)}%
          </span>
        )}
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 shadow-inner">
        <motion.div
          className="bg-gradient-to-r from-blue-600 to-purple-600 h-3 rounded-full shadow-sm"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </div>
  );
};