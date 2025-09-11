// Mobile-optimized components for FacePay
// Export all mobile components for easy importing

export { default as BottomNav, useBottomNav, MobileLayoutWithBottomNav } from './BottomNav';
export { 
  default as OptimizedImage, 
  MobileOptimizedImage, 
  OptimizedAvatar, 
  OptimizedIcon, 
  OptimizedBackgroundImage 
} from './OptimizedImage';

// Re-export the existing MobileMenu for compatibility
export { MobileMenu, MobileLayout, useMobileMenu } from '../MobileMenu';