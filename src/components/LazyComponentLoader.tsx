'use client';

import React, { Suspense, lazy, ComponentType } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Cpu, Camera, ShieldCheck } from 'lucide-react';
import { useIntersectionObserver } from '@/hooks/useOptimized';

interface LazyLoaderProps {
  children: React.ReactNode;
  fallback?: React.ComponentType;
  threshold?: number;
  rootMargin?: string;
  className?: string;
}

// Generic lazy loader with intersection observer
export function LazyComponentLoader({ 
  children, 
  fallback: Fallback = DefaultLoader,
  threshold = 0.1,
  rootMargin = '100px',
  className = ''
}: LazyLoaderProps) {
  const [ref, isVisible] = useIntersectionObserver({ 
    threshold, 
    rootMargin 
  });

  return (
    <div ref={ref} className={className}>
      {isVisible ? (
        <Suspense fallback={<Fallback />}>
          {children}
        </Suspense>
      ) : (
        <Fallback />
      )}
    </div>
  );
}

// Default loading component
function DefaultLoader() {
  return (
    <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg border border-gray-200">
      <motion.div
        className="flex flex-col items-center space-y-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <span className="text-sm text-gray-600 font-medium">Loading component...</span>
      </motion.div>
    </div>
  );
}

// Specialized loaders for different component types
export function FaceDetectionLoader() {
  return (
    <div className="flex items-center justify-center p-12 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl border border-blue-200">
      <motion.div
        className="flex flex-col items-center space-y-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="relative">
          <motion.div
            className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center"
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.7, 1, 0.7]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Camera className="w-8 h-8 text-white" />
          </motion.div>
          <motion.div
            className="absolute inset-0 w-16 h-16 border-4 border-blue-300 rounded-full"
            animate={{ rotate: 360 }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear"
            }}
            style={{ borderTopColor: 'transparent' }}
          />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-800 mb-1">Loading Face Detection</h3>
          <p className="text-sm text-gray-600">Initializing camera and AI models...</p>
        </div>
      </motion.div>
    </div>
  );
}

export function WebAuthnLoader() {
  return (
    <div className="flex items-center justify-center p-12 bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl border border-green-200">
      <motion.div
        className="flex flex-col items-center space-y-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="relative">
          <motion.div
            className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center"
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.7, 1, 0.7]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <ShieldCheck className="w-8 h-8 text-white" />
          </motion.div>
          <motion.div
            className="absolute inset-0 w-16 h-16 border-4 border-green-300 rounded-full"
            animate={{ rotate: -360 }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear"
            }}
            style={{ borderBottomColor: 'transparent' }}
          />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-800 mb-1">Loading WebAuthn</h3>
          <p className="text-sm text-gray-600">Setting up secure authentication...</p>
        </div>
      </motion.div>
    </div>
  );
}

export function TensorFlowLoader() {
  return (
    <div className="flex items-center justify-center p-12 bg-gradient-to-br from-purple-50 to-violet-100 rounded-xl border border-purple-200">
      <motion.div
        className="flex flex-col items-center space-y-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="relative">
          <motion.div
            className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center"
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.7, 1, 0.7]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Cpu className="w-8 h-8 text-white" />
          </motion.div>
          <motion.div
            className="absolute inset-0 w-16 h-16 border-4 border-purple-300 rounded-full"
            animate={{ rotate: 360 }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "linear"
            }}
            style={{ borderLeftColor: 'transparent' }}
          />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-800 mb-1">Loading AI Models</h3>
          <p className="text-sm text-gray-600">Initializing TensorFlow.js...</p>
          <div className="mt-2">
            <motion.div 
              className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden"
              initial={{ width: 0 }}
              animate={{ width: 128 }}
              transition={{ duration: 0.5 }}
            >
              <motion.div
                className="h-full bg-gradient-to-r from-purple-500 to-violet-600"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ 
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// HOC for lazy loading heavy components
export function withLazyLoading<P extends object>(
  Component: ComponentType<P>,
  LoaderComponent: ComponentType = DefaultLoader,
  options: { threshold?: number; rootMargin?: string } = {}
) {
  return function LazyWrappedComponent(props: P) {
    return (
      <LazyComponentLoader 
        fallback={LoaderComponent}
        threshold={options.threshold}
        rootMargin={options.rootMargin}
      >
        <Component {...props} />
      </LazyComponentLoader>
    );
  };
}

// Lazy loading for code splitting
export const LazyFaceDetection = lazy(() => 
  import('@/components/RealFaceID').then(module => ({ default: module.default }))
);

export const LazyWebAuthn = lazy(() => 
  import('@/components/WebAuthnDemo').then(module => ({ default: module.default }))
);

export const LazyPaymentFlow = lazy(() => 
  import('@/components/PaymentFlow').then(module => ({ default: module.default }))
);

export const LazyBiometricAuth = lazy(() => 
  import('@/components/BiometricWithFallback').then(module => ({ default: module.default }))
);

// Progressive loading with resource hints
export function PreloadedLazyComponent({ 
  componentImport,
  fallback: Fallback = DefaultLoader,
  preloadOnHover = true,
  className = ''
}: {
  componentImport: () => Promise<{ default: ComponentType<any> }>;
  fallback?: ComponentType;
  preloadOnHover?: boolean;
  className?: string;
}) {
  const [Component, setComponent] = React.useState<ComponentType<any> | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [ref, isVisible] = useIntersectionObserver({ rootMargin: '200px' });

  // Preload on hover
  const handleMouseEnter = React.useCallback(() => {
    if (preloadOnHover && !Component && !isLoading) {
      setIsLoading(true);
      componentImport()
        .then(module => setComponent(() => module.default))
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [componentImport, Component, isLoading, preloadOnHover]);

  // Load when visible
  React.useEffect(() => {
    if (isVisible && !Component && !isLoading) {
      setIsLoading(true);
      componentImport()
        .then(module => setComponent(() => module.default))
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [isVisible, Component, isLoading, componentImport]);

  return (
    <div 
      ref={ref} 
      className={className}
      onMouseEnter={handleMouseEnter}
    >
      {Component ? (
        <Component />
      ) : (
        <Fallback />
      )}
    </div>
  );
}

// Bundle size optimization helper
export function getBundleOptimizedImport<T>(
  importPath: string
): Promise<{ default: ComponentType<T> }> {
  // Add webpack magic comments for better chunk names
  return import(
    /* webpackChunkName: "[request]" */
    /* webpackPrefetch: true */
    importPath
  );
}

// Resource preloader for critical components
export function useComponentPreloader(imports: (() => Promise<any>)[]) {
  React.useEffect(() => {
    // Preload after initial render
    const timer = setTimeout(() => {
      imports.forEach(importFn => {
        importFn().catch(console.error);
      });
    }, 2000); // Wait 2 seconds after initial load

    return () => clearTimeout(timer);
  }, [imports]);
}