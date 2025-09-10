'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  Scan, 
  History, 
  User, 
  CreditCard,
  Bell,
  Settings,
  Plus,
  Camera,
  QrCode,
  Send,
  Receipt,
  Zap
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface BottomNavProps {
  onQuickAction?: (action: string) => void;
  className?: string;
}

interface NavItem {
  id: string;
  icon: React.ComponentType<any>;
  activeIcon?: React.ComponentType<any>;
  label: string;
  href?: string;
  isCenter?: boolean;
  action?: () => void;
  badge?: number;
}

interface QuickActionItem {
  id: string;
  icon: React.ComponentType<any>;
  label: string;
  color: string;
  action: () => void;
}

export default function BottomNav({ onQuickAction, className }: BottomNavProps) {
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Main navigation items - WhatsApp-style with center action
  const navItems: NavItem[] = [
    {
      id: 'home',
      icon: Home,
      label: 'Home',
      href: '/dashboard'
    },
    {
      id: 'pay',
      icon: CreditCard,
      label: 'Pay',
      href: '/payments'
    },
    {
      id: 'scan',
      icon: Scan,
      label: 'Scan',
      isCenter: true,
      action: () => setShowQuickActions(true)
    },
    {
      id: 'history',
      icon: History,
      label: 'History',
      href: '/history',
      badge: 3 // Example notification badge
    },
    {
      id: 'profile',
      icon: User,
      label: 'Profile',
      href: '/profile'
    }
  ];

  // Quick actions that appear when center button is pressed
  const quickActions: QuickActionItem[] = [
    {
      id: 'face-scan',
      icon: Camera,
      label: 'Face Scan',
      color: 'from-blue-500 to-blue-600',
      action: () => {
        onQuickAction?.('face-scan');
        setShowQuickActions(false);
      }
    },
    {
      id: 'qr-scan',
      icon: QrCode,
      label: 'QR Code',
      color: 'from-green-500 to-green-600',
      action: () => {
        onQuickAction?.('qr-scan');
        setShowQuickActions(false);
      }
    },
    {
      id: 'send-money',
      icon: Send,
      label: 'Send Money',
      color: 'from-purple-500 to-purple-600',
      action: () => {
        onQuickAction?.('send-money');
        setShowQuickActions(false);
      }
    },
    {
      id: 'quick-pay',
      icon: Zap,
      label: 'Quick Pay',
      color: 'from-orange-500 to-orange-600',
      action: () => {
        onQuickAction?.('quick-pay');
        setShowQuickActions(false);
      }
    },
    {
      id: 'request-money',
      icon: Receipt,
      label: 'Request',
      color: 'from-pink-500 to-pink-600',
      action: () => {
        onQuickAction?.('request-money');
        setShowQuickActions(false);
      }
    }
  ];

  const isActive = (href?: string) => {
    if (!href || !mounted) return false;
    return pathname === href || pathname.startsWith(href + '/');
  };

  if (!mounted) return null;

  return (
    <>
      {/* Quick Actions Overlay */}
      <AnimatePresence>
        {showQuickActions && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
              onClick={() => setShowQuickActions(false)}
            />

            {/* Quick Actions Panel */}
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed bottom-24 left-4 right-4 z-50"
            >
              <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/20">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Quick Actions</h3>
                  <p className="text-sm text-gray-600">Choose your payment method</p>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  {quickActions.slice(0, 3).map((action, index) => (
                    <motion.button
                      key={action.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={action.action}
                      className={`relative p-4 rounded-2xl bg-gradient-to-br ${action.color} text-white shadow-lg hover:shadow-xl transition-all duration-200 group`}
                    >
                      <div className="flex flex-col items-center space-y-2">
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                          <action.icon className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-medium text-center">{action.label}</span>
                      </div>
                    </motion.button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {quickActions.slice(3).map((action, index) => (
                    <motion.button
                      key={action.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: (index + 3) * 0.05 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={action.action}
                      className={`p-3 rounded-xl bg-gradient-to-br ${action.color} text-white shadow-md hover:shadow-lg transition-all duration-200`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                          <action.icon className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-medium">{action.label}</span>
                      </div>
                    </motion.button>
                  ))}
                </div>

                {/* Close indicator */}
                <div className="flex justify-center mt-4">
                  <div className="w-12 h-1 bg-gray-300 rounded-full" />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Navigation Bar */}
      <div className={cn("fixed bottom-0 left-0 right-0 z-30", className)}>
        {/* Main Navigation */}
        <div className="bg-white/95 backdrop-blur-xl border-t border-gray-200/50 shadow-lg">
          {/* Safe area inset for devices with home indicators */}
          <div className="safe-area-inset-bottom">
            <div className="relative flex items-end justify-around px-2 py-2">
              {navItems.map((item) => {
                const isActiveItem = isActive(item.href);
                const isCenter = item.isCenter;

                if (isCenter) {
                  return (
                    <button
                      key={item.id}
                      onClick={item.action}
                      className="relative flex flex-col items-center justify-center p-3 -mt-4"
                    >
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="w-14 h-14 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-xl shadow-blue-500/25"
                      >
                        <item.icon className="w-7 h-7 text-white" />
                      </motion.div>
                      <span className="text-xs font-medium text-gray-700 mt-1">
                        {item.label}
                      </span>

                      {/* Animated pulse for center button */}
                      <motion.div
                        className="absolute top-2 left-1/2 transform -translate-x-1/2 w-16 h-16 border-2 border-blue-400 rounded-full"
                        animate={{
                          scale: [1, 1.2, 1],
                          opacity: [0.3, 0.1, 0.3]
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      />
                    </button>
                  );
                }

                const NavContent = (
                  <div className="relative flex flex-col items-center justify-center p-3 min-h-[64px]">
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="relative"
                    >
                      <div className={cn(
                        "w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200",
                        isActiveItem 
                          ? "bg-blue-100" 
                          : "hover:bg-gray-100"
                      )}>
                        <item.icon className={cn(
                          "w-5 h-5 transition-colors duration-200",
                          isActiveItem 
                            ? "text-blue-600" 
                            : "text-gray-600"
                        )} />
                      </div>

                      {/* Notification badge */}
                      {item.badge && item.badge > 0 && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white"
                        >
                          {item.badge > 9 ? '9+' : item.badge}
                        </motion.div>
                      )}
                    </motion.div>

                    <span className={cn(
                      "text-xs font-medium mt-1 transition-colors duration-200",
                      isActiveItem 
                        ? "text-blue-600" 
                        : "text-gray-600"
                    )}>
                      {item.label}
                    </span>

                    {/* Active indicator */}
                    {isActiveItem && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="absolute -bottom-1 w-1 h-1 bg-blue-600 rounded-full"
                        initial={false}
                      />
                    )}
                  </div>
                );

                return item.href ? (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="flex-1 max-w-[80px]"
                  >
                    {NavContent}
                  </Link>
                ) : (
                  <button
                    key={item.id}
                    onClick={item.action}
                    className="flex-1 max-w-[80px]"
                  >
                    {NavContent}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom spacer to prevent content from hiding behind nav */}
      <div className="h-20 md:h-0" />
    </>
  );
}

// Hook for using the bottom navigation
export function useBottomNav() {
  const [activeQuickAction, setActiveQuickAction] = useState<string | null>(null);

  const handleQuickAction = (action: string) => {
    setActiveQuickAction(action);
    console.log(`Quick action triggered: ${action}`);
    
    // Handle different actions
    switch (action) {
      case 'face-scan':
        // Trigger face scan
        break;
      case 'qr-scan':
        // Trigger QR code scanner
        break;
      case 'send-money':
        // Navigate to send money
        break;
      case 'quick-pay':
        // Open quick pay modal
        break;
      case 'request-money':
        // Open request money modal
        break;
      default:
        console.warn('Unknown quick action:', action);
    }

    // Clear after action
    setTimeout(() => setActiveQuickAction(null), 100);
  };

  return {
    activeQuickAction,
    handleQuickAction
  };
}

// Mobile layout wrapper with bottom navigation
export function MobileLayoutWithBottomNav({ 
  children, 
  onQuickAction,
  className 
}: {
  children: React.ReactNode;
  onQuickAction?: (action: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("relative min-h-screen bg-gray-50", className)}>
      {/* Main content with bottom padding */}
      <main className="pb-20">
        {children}
      </main>
      
      {/* Bottom Navigation */}
      <BottomNav onQuickAction={onQuickAction} />
    </div>
  );
}