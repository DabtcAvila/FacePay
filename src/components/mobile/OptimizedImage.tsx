'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
  priority?: boolean;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  sizes?: string;
  quality?: number;
  onLoad?: () => void;
  onError?: () => void;
}

export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  style,
  priority = false,
  placeholder = 'empty',
  blurDataURL,
  sizes,
  quality = 75,
  onLoad,
  onError
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [imageSrc, setImageSrc] = useState(
    placeholder === 'blur' && blurDataURL ? blurDataURL : ''
  );
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver>();

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority) return; // Skip lazy loading for priority images

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observerRef.current?.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Load images 50px before they come into view
        threshold: 0.1
      }
    );

    const currentRef = imgRef.current;
    if (currentRef) {
      observerRef.current.observe(currentRef);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [priority]);

  // Generate optimized image URLs for different screen densities
  const generateOptimizedSrc = (originalSrc: string, targetWidth?: number) => {
    // In a real implementation, you would integrate with a service like:
    // - Next.js Image Optimization
    // - Cloudinary
    // - ImageKit
    // - Custom image optimization service
    
    if (!targetWidth) return originalSrc;
    
    // Example: Add query parameters for optimization
    const url = new URL(originalSrc, window.location.origin);
    url.searchParams.set('w', targetWidth.toString());
    url.searchParams.set('q', quality.toString());
    url.searchParams.set('fm', 'webp'); // Use WebP format if supported
    
    return url.toString();
  };

  // Generate srcSet for responsive images
  const generateSrcSet = (originalSrc: string, baseWidth?: number) => {
    if (!baseWidth) return '';
    
    const densities = [1, 1.5, 2, 3]; // Support different screen densities
    return densities
      .map(density => {
        const width = Math.round(baseWidth * density);
        return `${generateOptimizedSrc(originalSrc, width)} ${density}x`;
      })
      .join(', ');
  };

  // Load the actual image when in view
  useEffect(() => {
    if (!isInView) return;

    const img = new Image();
    
    img.onload = () => {
      setImageSrc(src);
      setIsLoading(false);
      onLoad?.();
    };
    
    img.onerror = () => {
      setHasError(true);
      setIsLoading(false);
      onError?.();
    };
    
    // Set up responsive loading
    if (width) {
      img.srcset = generateSrcSet(src, width);
    }
    img.src = generateOptimizedSrc(src, width);
  }, [isInView, src, width, quality, onLoad, onError]);

  const imageElement = (
    <div
      ref={imgRef}
      className={cn(
        "relative overflow-hidden bg-gray-100 rounded-lg",
        className
      )}
      style={{ 
        width: width ? `${width}px` : 'auto',
        height: height ? `${height}px` : 'auto',
        aspectRatio: width && height ? `${width}/${height}` : 'auto',
        ...style
      }}
    >
      {/* Loading placeholder */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 animate-pulse">
          {placeholder === 'blur' && blurDataURL ? (
            <motion.img
              src={blurDataURL}
              alt=""
              className="w-full h-full object-cover filter blur-sm scale-110"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center space-y-2">
              <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
              <span className="text-xs text-gray-400 font-medium">Loading...</span>
            </div>
          )}
        </div>
      )}

      {/* Error placeholder */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 border-2 border-dashed border-gray-200">
          <div className="flex flex-col items-center justify-center space-y-2">
            <ImageIcon className="w-8 h-8 text-gray-300" />
            <span className="text-xs text-gray-400 text-center px-2">
              Image failed to load
            </span>
          </div>
        </div>
      )}

      {/* Actual image */}
      {imageSrc && !hasError && (
        <motion.img
          src={imageSrc}
          alt={alt}
          className={cn(
            "w-full h-full object-cover",
            isLoading && "opacity-0"
          )}
          style={{
            width: width ? `${width}px` : 'auto',
            height: height ? `${height}px` : 'auto'
          }}
          srcSet={width ? generateSrcSet(src, width) : undefined}
          sizes={sizes}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoading ? 0 : 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          onLoad={() => {
            setIsLoading(false);
            onLoad?.();
          }}
          onError={() => {
            setHasError(true);
            setIsLoading(false);
            onError?.();
          }}
        />
      )}

      {/* Subtle loading overlay */}
      {isLoading && imageSrc && !hasError && (
        <motion.div
          className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </motion.div>
      )}
    </div>
  );

  return imageElement;
}

// Specialized component for mobile-optimized images
export function MobileOptimizedImage({
  src,
  alt,
  className,
  priority = false,
  aspectRatio = '16/9',
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  aspectRatio?: string;
  sizes?: string;
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      className={cn("w-full", className)}
      style={{ aspectRatio }}
      priority={priority}
      sizes={sizes}
      placeholder="blur"
      quality={80}
    />
  );
}

// Avatar component with optimizations
export function OptimizedAvatar({
  src,
  alt,
  size = 40,
  className,
  fallback
}: {
  src: string;
  alt: string;
  size?: number;
  className?: string;
  fallback?: React.ReactNode;
}) {
  const [hasError, setHasError] = useState(false);

  return (
    <div
      className={cn(
        "relative rounded-full overflow-hidden bg-gray-100 border border-gray-200",
        className
      )}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      {hasError ? (
        <div className="w-full h-full flex items-center justify-center">
          {fallback || (
            <span className="text-gray-400 text-xs font-medium">
              {alt.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      ) : (
        <OptimizedImage
          src={src}
          alt={alt}
          width={size}
          height={size}
          className="rounded-full"
          quality={90}
          onError={() => setHasError(true)}
        />
      )}
    </div>
  );
}

// Icon component with lazy loading for large icon sets
export function OptimizedIcon({
  src,
  alt,
  size = 24,
  className
}: {
  src: string;
  alt: string;
  size?: number;
  className?: string;
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn("flex-shrink-0", className)}
      quality={90}
      priority={false}
    />
  );
}

// Background image component with mobile optimizations
export function OptimizedBackgroundImage({
  src,
  alt,
  children,
  className,
  overlay = false,
  overlayOpacity = 0.3
}: {
  src: string;
  alt: string;
  children?: React.ReactNode;
  className?: string;
  overlay?: boolean;
  overlayOpacity?: number;
}) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      <OptimizedImage
        src={src}
        alt={alt}
        className="absolute inset-0 w-full h-full object-cover"
        priority={true}
        quality={70}
      />
      
      {overlay && (
        <div 
          className="absolute inset-0 bg-black"
          style={{ opacity: overlayOpacity }}
        />
      )}
      
      {children && (
        <div className="relative z-10">
          {children}
        </div>
      )}
    </div>
  );
}