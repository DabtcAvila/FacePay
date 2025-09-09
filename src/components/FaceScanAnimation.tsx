'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FaceScanAnimationProps {
  isScanning?: boolean;
  onScanComplete?: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function FaceScanAnimation({ 
  isScanning = false, 
  onScanComplete, 
  size = 'md',
  className = '' 
}: FaceScanAnimationProps) {
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStage, setScanStage] = useState<'idle' | 'detecting' | 'scanning' | 'complete'>('idle');

  const sizeClasses = {
    sm: 'w-24 h-24',
    md: 'w-32 h-32',
    lg: 'w-48 h-48'
  };

  useEffect(() => {
    if (isScanning && scanStage === 'idle') {
      setScanStage('detecting');
      setScanProgress(0);
      
      // Simulate face detection
      const detectTimer = setTimeout(() => {
        setScanStage('scanning');
        
        // Simulate scanning progress
        const scanInterval = setInterval(() => {
          setScanProgress(prev => {
            if (prev >= 100) {
              clearInterval(scanInterval);
              setScanStage('complete');
              setTimeout(() => {
                onScanComplete?.();
                setScanStage('idle');
                setScanProgress(0);
              }, 1000);
              return 100;
            }
            return prev + 2;
          });
        }, 50);
        
        return () => clearInterval(scanInterval);
      }, 1500);
      
      return () => clearTimeout(detectTimer);
    }
  }, [isScanning, scanStage, onScanComplete]);

  return (
    <div className={`relative flex items-center justify-center ${sizeClasses[size]} ${className}`}>
      {/* Face outline */}
      <div className="relative">
        <motion.div
          className="border-2 border-blue-500 rounded-full aspect-square"
          style={{ width: '100%', height: '100%' }}
          animate={{
            borderColor: scanStage === 'complete' ? '#10B981' : 
                        scanStage === 'scanning' ? '#3B82F6' :
                        scanStage === 'detecting' ? '#F59E0B' : '#6B7280'
          }}
          transition={{ duration: 0.3 }}
        >
          {/* Detection rings */}
          <AnimatePresence>
            {scanStage === 'detecting' && (
              <>
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="absolute inset-0 border-2 border-yellow-400 rounded-full face-detection-ring"
                    initial={{ scale: 0.8, opacity: 1 }}
                    animate={{ scale: 1.4, opacity: 0 }}
                    exit={{ scale: 1.4, opacity: 0 }}
                    transition={{
                      duration: 1.5,
                      delay: i * 0.5,
                      repeat: scanStage === 'detecting' ? Infinity : 0
                    }}
                  />
                ))}
              </>
            )}
          </AnimatePresence>

          {/* Scanning progress */}
          {scanStage === 'scanning' && (
            <div className="absolute inset-2 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="50%"
                  cy="50%"
                  r="45%"
                  fill="none"
                  stroke="rgba(59, 130, 246, 0.2)"
                  strokeWidth="2"
                />
                <motion.circle
                  cx="50%"
                  cy="50%"
                  r="45%"
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="2"
                  strokeDasharray="283"
                  initial={{ strokeDashoffset: 283 }}
                  animate={{ strokeDashoffset: 283 - (283 * scanProgress) / 100 }}
                  transition={{ duration: 0.1 }}
                />
              </svg>
            </div>
          )}

          {/* Face features */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-3/5 h-3/5">
              {/* Eyes */}
              <motion.div 
                className="absolute top-1/3 left-1/4 w-2 h-2 bg-blue-500 rounded-full"
                animate={{
                  backgroundColor: scanStage === 'complete' ? '#10B981' : '#3B82F6',
                  scale: scanStage === 'scanning' ? [1, 1.2, 1] : 1
                }}
                transition={{ duration: 0.5, repeat: scanStage === 'scanning' ? Infinity : 0 }}
              />
              <motion.div 
                className="absolute top-1/3 right-1/4 w-2 h-2 bg-blue-500 rounded-full"
                animate={{
                  backgroundColor: scanStage === 'complete' ? '#10B981' : '#3B82F6',
                  scale: scanStage === 'scanning' ? [1, 1.2, 1] : 1
                }}
                transition={{ duration: 0.5, delay: 0.1, repeat: scanStage === 'scanning' ? Infinity : 0 }}
              />
              
              {/* Mouth */}
              <motion.div 
                className="absolute bottom-1/3 left-1/2 transform -translate-x-1/2 w-4 h-2 border-b-2 border-blue-500 rounded-b-full"
                animate={{
                  borderColor: scanStage === 'complete' ? '#10B981' : '#3B82F6'
                }}
              />
            </div>
          </div>

          {/* Success checkmark */}
          <AnimatePresence>
            {scanStage === 'complete' && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
              >
                <motion.svg
                  className="w-8 h-8 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <motion.path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </motion.svg>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Status text */}
      <div className="absolute -bottom-8 text-center">
        <motion.p 
          className="text-sm font-medium"
          animate={{
            color: scanStage === 'complete' ? '#10B981' : 
                   scanStage === 'scanning' ? '#3B82F6' :
                   scanStage === 'detecting' ? '#F59E0B' : '#6B7280'
          }}
        >
          {scanStage === 'idle' && 'Ready to scan'}
          {scanStage === 'detecting' && 'Detecting face...'}
          {scanStage === 'scanning' && `Scanning... ${scanProgress}%`}
          {scanStage === 'complete' && 'Complete!'}
        </motion.p>
      </div>
    </div>
  );
}