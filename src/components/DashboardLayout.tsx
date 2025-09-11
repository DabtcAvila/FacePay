'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  CreditCard, 
  Settings, 
  User, 
  History, 
  ShieldCheck, 
  Bell, 
  Search,
  Menu,
  X,
  LogOut,
  Fingerprint,
  Scan,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WebAuthnService, type WebAuthnCapabilities } from '@/services/webauthn';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab?: string;
  user?: {
    name: string;
    email: string;
    avatar?: string;
    isAuthenticated: boolean;
    biometricEnabled: boolean;
  };
}

interface BiometricStatus {
  isAvailable: boolean;
  isEnabled: boolean;
  isAuthenticated: boolean;
  lastAuthentication?: Date;
  deviceInfo?: WebAuthnCapabilities;
}

export default function DashboardLayout({ 
  children, 
  activeTab = 'dashboard', 
  user = {
    name: 'John Doe',
    email: 'john@example.com',
    isAuthenticated: true,
    biometricEnabled: false
  }
}: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [biometricStatus, setBiometricStatus] = useState<BiometricStatus>({
    isAvailable: false,
    isEnabled: false,
    isAuthenticated: false
  });
  const [isCheckingBiometric, setIsCheckingBiometric] = useState(true);
  const [showBiometricSetup, setShowBiometricSetup] = useState(false);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Check biometric capabilities on mount
  useEffect(() => {
    checkBiometricCapabilities();
  }, []);

  const checkBiometricCapabilities = useCallback(async () => {
    setIsCheckingBiometric(true);
    try {
      const capabilities = await WebAuthnService.checkBrowserCapabilities();
      setBiometricStatus({
        isAvailable: capabilities.isSupported && capabilities.isPlatformAuthenticatorAvailable,
        isEnabled: user.biometricEnabled,
        isAuthenticated: user.isAuthenticated,
        deviceInfo: capabilities
      });
    } catch (error) {
      console.error('Error checking biometric capabilities:', error);
      setBiometricStatus({
        isAvailable: false,
        isEnabled: false,
        isAuthenticated: false
      });
    } finally {
      setIsCheckingBiometric(false);
    }
  }, [user.biometricEnabled, user.isAuthenticated]);

  const navigation = [
    { id: 'dashboard', name: 'Dashboard', icon: Home, href: '/dashboard' },
    { id: 'payments', name: 'Payments', icon: CreditCard, href: '/payments' },
    { id: 'history', name: 'History', icon: History, href: '/history' },
    { id: 'biometric', name: 'Biometric Demo', icon: Fingerprint, href: '/biometric' },
    { id: 'security', name: 'Security', icon: ShieldCheck, href: '/security' },
    { id: 'profile', name: 'Profile', icon: User, href: '/profile' },
    { id: 'settings', name: 'Settings', icon: Settings, href: '/settings' }
  ];

  const getBiometricIcon = () => {
    if (!biometricStatus.deviceInfo) return Fingerprint;
    
    const { biometricTypes, deviceInfo } = biometricStatus.deviceInfo;
    
    if (biometricTypes.includes('face')) {
      return Scan;
    } else if (biometricTypes.includes('fingerprint')) {
      return Fingerprint;
    } else if (deviceInfo.isMobile) {
      return Smartphone;
    }
    return Lock;
  };

  const getBiometricName = () => {
    if (!biometricStatus.deviceInfo) return 'Biometric';
    
    const { biometricTypes, deviceInfo } = biometricStatus.deviceInfo;
    
    if (biometricTypes.includes('face')) {
      return deviceInfo.isIOS ? 'Face ID' : 'Face Recognition';
    } else if (biometricTypes.includes('fingerprint')) {
      return deviceInfo.isIOS ? 'Touch ID' : 'Fingerprint';
    } else if (deviceInfo.isMacOS) {
      return 'Touch ID';
    } else if (deviceInfo.isWindows) {
      return 'Windows Hello';
    }
    return 'Biometric Auth';
  };

  const handleBiometricSetup = () => {
    setShowBiometricSetup(true);
  };

  const closeMobileSidebar = () => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile sidebar backdrop */}
      <AnimatePresence>
        {isSidebarOpen && isMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={closeMobileSidebar}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        initial={false}
        animate={{ 
          x: isMobile ? (isSidebarOpen ? 0 : '-100%') : 0,
          width: isMobile ? '280px' : '256px'
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={`${
          isMobile 
            ? 'fixed inset-y-0 left-0 z-50' 
            : 'relative'
        } w-64 bg-white shadow-xl border-r border-gray-200`}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <span className="text-lg sm:text-xl font-bold text-gray-900">FacePay</span>
            </div>
            {isMobile && (
              <button
                onClick={closeMobileSidebar}
                className="p-1.5 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 mt-6 px-3 sm:px-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <motion.a
                  key={item.id}
                  href={item.href}
                  onClick={closeMobileSidebar}
                  className={`flex items-center px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-r-2 border-blue-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Icon className={`w-5 h-5 mr-3 flex-shrink-0 transition-colors ${
                    isActive ? 'text-blue-700' : 'text-gray-400'
                  }`} />
                  <span className="truncate">{item.name}</span>
                  {isActive && (
                    <motion.div
                      className="ml-auto w-1.5 h-1.5 bg-blue-700 rounded-full"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1 }}
                    />
                  )}
                </motion.a>
              );
            })}

            {/* Biometric Authentication Section */}
            <div className="pt-4 mt-4 border-t border-gray-200">
              <div className="px-3 sm:px-4 mb-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Security
                </p>
              </div>
              
              <motion.div
                className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-3 mx-3 sm:mx-4 mb-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    biometricStatus.isAuthenticated ? 'bg-green-100' :
                    biometricStatus.isAvailable ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    {isCheckingBiometric ? (
                      <motion.div
                        className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                    ) : (
                      React.createElement(getBiometricIcon(), {
                        className: `w-4 h-4 ${
                          biometricStatus.isAuthenticated ? 'text-green-600' :
                          biometricStatus.isAvailable ? 'text-blue-600' : 'text-gray-400'
                        }`
                      })
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {getBiometricName()}
                    </p>
                    <p className="text-xs text-gray-500">
                      {isCheckingBiometric ? 'Checking...' :
                       biometricStatus.isAuthenticated ? 'Authenticated' :
                       biometricStatus.isAvailable ? 'Available' : 'Not supported'}
                    </p>
                  </div>
                  
                  {biometricStatus.isAuthenticated && (
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                  )}
                  {biometricStatus.isAvailable && !biometricStatus.isEnabled && (
                    <motion.button
                      onClick={handleBiometricSetup}
                      className="text-blue-600 hover:text-blue-700 text-xs font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Setup
                    </motion.button>
                  )}
                </div>
              </motion.div>
            </div>
          </nav>

          {/* User section at bottom */}
          <div className="p-3 sm:p-4 border-t border-gray-200">
            <motion.div 
              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="relative w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                {user.avatar ? (
                  <img 
                    src={user.avatar} 
                    alt={user.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-white font-medium text-sm">
                    {user.name.split(' ').map(n => n[0]).join('')}
                  </span>
                )}
                
                {/* Authentication status indicator */}
                <motion.div 
                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                    user.isAuthenticated ? 'bg-green-500' : 'bg-gray-400'
                  }`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2 }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate group-hover:text-gray-700 transition-colors">
                  {user.name}
                </p>
                <div className="flex items-center space-x-1">
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  {biometricStatus.isAuthenticated && (
                    <motion.div
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center text-xs text-green-600"
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Secured
                    </motion.div>
                  )}
                </div>
              </div>
              {isMobile && (
                <motion.button 
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <LogOut className="w-4 h-4" />
                </motion.button>
              )}
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <motion.header 
          className="bg-white/90 backdrop-blur-md shadow-sm border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 sticky top-0 z-30"
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
              {/* Mobile menu button */}
              <motion.button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
              </motion.button>

              {/* Search */}
              <motion.div 
                className="relative flex-1 max-w-md"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search transactions, contacts..."
                  className="pl-10 pr-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full text-sm bg-gray-50/80 focus:bg-white transition-all duration-200 backdrop-blur-sm"
                />
              </motion.div>
            </div>
            
            {/* Right side actions */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Biometric status indicator (desktop) */}
              <AnimatePresence>
                {!isMobile && biometricStatus.isAvailable && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className={`hidden sm:flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                      biometricStatus.isAuthenticated 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {React.createElement(getBiometricIcon(), { className: 'w-3 h-3' })}
                    <span>{biometricStatus.isAuthenticated ? 'Secured' : getBiometricName()}</span>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Notifications */}
              <motion.button 
                className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                <motion.span 
                  className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </motion.button>
              
              {/* User avatar (desktop only) */}
              <motion.div 
                className="hidden sm:flex items-center space-x-2 cursor-pointer p-1 rounded-lg hover:bg-gray-100 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className="relative w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                  {user.avatar ? (
                    <img 
                      src={user.avatar} 
                      alt={user.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-white font-medium text-xs">
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  )}
                  
                  {user.isAuthenticated && (
                    <motion.div 
                      className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border border-white"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3 }}
                    />
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        </motion.header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 to-blue-50/30">
          <motion.div 
            className="h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {children}
          </motion.div>
        </main>

        {/* Biometric Setup Modal */}
        <AnimatePresence>
          {showBiometricSetup && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowBiometricSetup(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                    {React.createElement(getBiometricIcon(), { className: 'w-8 h-8 text-blue-600' })}
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Setup {getBiometricName()}
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Secure your account with {getBiometricName()} for faster and more secure authentication.
                    </p>
                  </div>
                  
                  <div className="space-y-3 pt-4">
                    <Button 
                      className="w-full" 
                      onClick={() => {
                        // Handle biometric setup
                        setShowBiometricSetup(false);
                      }}
                    >
                      Setup {getBiometricName()}
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setShowBiometricSetup(false)}
                    >
                      Maybe Later
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}