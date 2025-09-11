'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Menu, 
  X, 
  Home, 
  CreditCard, 
  History, 
  User, 
  Settings, 
  ShieldCheck, 
  LogOut,
  Scan,
  Fingerprint,
  Eye,
  Zap,
  Send,
  QrCode,
  Users,
  ArrowUpRight,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react'
import Link from 'next/link'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { cn } from '@/lib/utils'
import { WebAuthnService, WebAuthnCapabilities } from '@/services/webauthn'

interface MobileMenuProps {
  className?: string
  onQuickAction?: (action: string) => void
}

interface BiometricStatus {
  isEnabled: boolean
  type: 'face' | 'fingerprint' | 'none'
  lastUsed?: Date
  isAvailable: boolean
}

interface QuickAction {
  id: string
  icon: React.ComponentType<any>
  label: string
  description: string
  color: string
  action: () => void
}

const menuItems = [
  { icon: Home, label: 'Dashboard', href: '/dashboard' },
  { icon: CreditCard, label: 'Payments', href: '/payments' },
  { icon: History, label: 'History', href: '/history' },
  { icon: User, label: 'Profile', href: '/profile' },
  { icon: ShieldCheck, label: 'Security', href: '/security' },
  { icon: Settings, label: 'Settings', href: '/settings' },
]

const bottomTabItems = [
  { icon: Home, label: 'Home', href: '/dashboard' },
  { icon: Scan, label: 'Scan', href: '/payments', isCenter: true },
  { icon: History, label: 'History', href: '/history' },
  { icon: User, label: 'Profile', href: '/profile' },
]

export function MobileMenu({ className, onQuickAction }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [biometricStatus, setBiometricStatus] = useState<BiometricStatus>({
    isEnabled: false,
    type: 'none',
    isAvailable: false
  })
  const [webauthnCapabilities, setWebauthnCapabilities] = useState<WebAuthnCapabilities | null>(null)
  const [activeTab, setActiveTab] = useState('/dashboard')

  // Initialize biometric capabilities
  useEffect(() => {
    setMounted(true)
    initializeBiometrics()
  }, [])

  const initializeBiometrics = async () => {
    try {
      const capabilities = await WebAuthnService.checkBrowserCapabilities()
      setWebauthnCapabilities(capabilities)
      
      // Determine biometric type and availability
      let biometricType: 'face' | 'fingerprint' | 'none' = 'none'
      if (capabilities.isPlatformAuthenticatorAvailable && capabilities.biometricTypes.length > 0) {
        biometricType = capabilities.biometricTypes.includes('face') ? 'face' : 
                       capabilities.biometricTypes.includes('fingerprint') ? 'fingerprint' : 'none'
      }

      setBiometricStatus({
        isEnabled: capabilities.isPlatformAuthenticatorAvailable,
        type: biometricType,
        isAvailable: capabilities.isSupported,
        lastUsed: new Date() // Mock last used time
      })
    } catch (error) {
      console.error('Failed to initialize biometrics:', error)
    }
  }

  // Quick actions for payments
  const quickActions: QuickAction[] = [
    {
      id: 'scan-pay',
      icon: QrCode,
      label: 'Scan & Pay',
      description: 'Scan QR code to pay',
      color: 'bg-blue-500',
      action: () => {
        onQuickAction?.('scan-pay')
        setIsOpen(false)
      }
    },
    {
      id: 'send-money',
      icon: Send,
      label: 'Send Money',
      description: 'Send to contacts',
      color: 'bg-green-500',
      action: () => {
        onQuickAction?.('send-money')
        setIsOpen(false)
      }
    },
    {
      id: 'split-bill',
      icon: Users,
      label: 'Split Bill',
      description: 'Split with friends',
      color: 'bg-purple-500',
      action: () => {
        onQuickAction?.('split-bill')
        setIsOpen(false)
      }
    },
    {
      id: 'quick-pay',
      icon: Zap,
      label: 'Quick Pay',
      description: 'Instant payments',
      color: 'bg-orange-500',
      action: () => {
        onQuickAction?.('quick-pay')
        setIsOpen(false)
      }
    }
  ]

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const toggleMenu = () => setIsOpen(!isOpen)

  const handleItemClick = () => {
    setIsOpen(false)
  }

  const getBiometricIcon = () => {
    switch (biometricStatus.type) {
      case 'face': return Eye
      case 'fingerprint': return Fingerprint
      default: return ShieldCheck
    }
  }

  const getBiometricStatusColor = () => {
    if (!biometricStatus.isAvailable) return 'text-gray-400'
    return biometricStatus.isEnabled ? 'text-green-500' : 'text-yellow-500'
  }

  const getBiometricStatusIcon = () => {
    if (!biometricStatus.isAvailable) return XCircle
    return biometricStatus.isEnabled ? CheckCircle : Clock
  }

  if (!mounted) return null

  return (
    <>
      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="flex items-center justify-between px-4 h-16">
          <Link href="/dashboard" className="flex items-center space-x-3">
            <motion.div 
              className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-md"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Scan className="w-5 h-5 text-primary-foreground" />
            </motion.div>
            <div className="flex flex-col">
              <span className="font-bold text-lg text-foreground">FacePay</span>
              {biometricStatus.isAvailable && (
                <div className="flex items-center space-x-1">
                  {React.createElement(getBiometricStatusIcon(), { 
                    className: `w-3 h-3 ${getBiometricStatusColor()}` 
                  })}
                  <span className={`text-xs ${getBiometricStatusColor()}`}>
                    {biometricStatus.type === 'face' ? 'Face ID' : 
                     biometricStatus.type === 'fingerprint' ? 'Touch ID' : 'Biometric'} 
                    {biometricStatus.isEnabled ? ' Ready' : ' Setup'}
                  </span>
                </div>
              )}
            </div>
          </Link>
          
          <div className="flex items-center space-x-2">
            {/* Biometric Status Indicator */}
            {biometricStatus.isAvailable && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center space-x-1"
              >
                {React.createElement(getBiometricIcon(), { 
                  className: `w-5 h-5 ${getBiometricStatusColor()}` 
                })}
              </motion.div>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMenu}
              className="relative z-50 hover:bg-accent transition-colors"
              aria-label="Toggle menu"
            >
              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.3, type: "spring", stiffness: 200 }}
              >
                {isOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </motion.div>
            </Button>
          </div>
        </div>
      </header>

      {/* Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Slide-out Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ 
              type: 'spring', 
              stiffness: 280, 
              damping: 30 
            }}
            className="md:hidden fixed top-0 left-0 bottom-0 z-50 w-80 max-w-[85vw] bg-background/98 backdrop-blur-xl border-r border-border shadow-2xl"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
                <div className="flex items-center space-x-3">
                  <motion.div 
                    className="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg"
                    whileHover={{ scale: 1.05 }}
                  >
                    <Scan className="w-7 h-7 text-primary-foreground" />
                  </motion.div>
                  <div>
                    <h2 className="font-bold text-xl text-foreground">FacePay</h2>
                    <div className="flex items-center space-x-2">
                      <p className="text-sm text-muted-foreground">Secure Payments</p>
                      {biometricStatus.isEnabled && (
                        <Badge variant="secondary" className="text-xs px-2 py-0.5">
                          {biometricStatus.type === 'face' ? 'Face ID' : 'Touch ID'}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Biometric Status Card */}
              {biometricStatus.isAvailable && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mx-4 mt-4 p-4 rounded-xl border border-border bg-gradient-to-r from-primary/5 to-transparent"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {React.createElement(getBiometricIcon(), { 
                        className: `w-6 h-6 ${getBiometricStatusColor()}` 
                      })}
                      <div>
                        <p className="font-medium text-sm">
                          {biometricStatus.type === 'face' ? 'Face ID' : 
                           biometricStatus.type === 'fingerprint' ? 'Touch ID' : 'Biometric Auth'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {biometricStatus.isEnabled ? 'Ready for use' : 'Setup required'}
                        </p>
                      </div>
                    </div>
                    {React.createElement(getBiometricStatusIcon(), { 
                      className: `w-5 h-5 ${getBiometricStatusColor()}` 
                    })}
                  </div>
                </motion.div>
              )}

              {/* Quick Actions */}
              <div className="px-4 pt-4">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-2">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                  {quickActions.map((action, index) => (
                    <motion.button
                      key={action.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 + index * 0.05 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={action.action}
                      className="p-3 rounded-xl bg-gradient-to-br from-background to-accent/20 border border-border hover:border-primary/30 transition-all duration-200 group"
                    >
                      <div className="flex flex-col items-center space-y-2">
                        <div className={`w-8 h-8 ${action.color} rounded-lg flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow`}>
                          <action.icon className="w-4 h-4 text-white" />
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-medium text-foreground">{action.label}</p>
                          <p className="text-xs text-muted-foreground">{action.description}</p>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Navigation Items */}
              <nav className="flex-1 px-4 py-6">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-2">Navigation</h3>
                <ul className="space-y-1">
                  {menuItems.map((item, index) => (
                    <motion.li
                      key={item.href}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + index * 0.1 }}
                    >
                      <Link
                        href={item.href}
                        onClick={handleItemClick}
                        className="flex items-center space-x-3 px-3 py-3 rounded-xl text-foreground hover:bg-accent/70 hover:text-accent-foreground transition-all duration-200 group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-accent/30 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                          <item.icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <span className="font-medium">{item.label}</span>
                        <ArrowUpRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </motion.li>
                  ))}
                </ul>
              </nav>

              {/* Footer */}
              <div className="p-4 border-t border-border bg-gradient-to-r from-destructive/5 to-transparent">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
                  onClick={handleItemClick}
                >
                  <LogOut className="w-5 h-5 mr-3" />
                  Sign Out
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Bottom Tab Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40">
        <div className="bg-background/95 backdrop-blur-xl border-t border-border shadow-2xl">
          {/* Safe area for devices with home indicators */}
          <div className="safe-area-inset-bottom">
            <div className="flex items-center justify-around px-2 py-3 relative">
              {bottomTabItems.map((item, index) => {
                const isActive = activeTab === item.href
                const isCenter = item.isCenter
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setActiveTab(item.href)}
                    className={cn(
                      "flex flex-col items-center justify-center rounded-2xl transition-all duration-300 min-w-0 relative",
                      isCenter 
                        ? "p-4 -mt-6 bg-gradient-to-br from-primary to-primary/80 shadow-xl shadow-primary/25" 
                        : "p-3 flex-1 hover:bg-accent/50",
                      isActive && !isCenter && "bg-accent/70"
                    )}
                  >
                    <motion.div
                      whileHover={{ scale: isCenter ? 1.05 : 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex flex-col items-center space-y-1"
                    >
                      {/* Icon with enhanced styling for center button */}
                      <div className={cn(
                        "rounded-full flex items-center justify-center transition-all duration-200",
                        isCenter 
                          ? "w-12 h-12 bg-white/20 shadow-inner" 
                          : "w-6 h-6"
                      )}>
                        <item.icon className={cn(
                          "transition-colors duration-200",
                          isCenter 
                            ? "w-7 h-7 text-white" 
                            : isActive 
                              ? "w-5 h-5 text-primary" 
                              : "w-5 h-5 text-muted-foreground"
                        )} />
                      </div>
                      
                      {/* Label with enhanced styling */}
                      <span className={cn(
                        "text-xs font-medium transition-colors duration-200 truncate",
                        isCenter 
                          ? "text-white font-semibold" 
                          : isActive 
                            ? "text-primary" 
                            : "text-muted-foreground"
                      )}>
                        {item.label}
                      </span>
                      
                      {/* Active indicator dot */}
                      {isActive && !isCenter && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute -bottom-1 w-1 h-1 bg-primary rounded-full"
                          initial={false}
                        />
                      )}
                    </motion.div>

                    {/* Floating scan button enhancement */}
                    {isCenter && (
                      <motion.div
                        className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background flex items-center justify-center"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ 
                          duration: 2, 
                          repeat: Infinity, 
                          repeatType: "reverse" 
                        }}
                      >
                        <div className="w-1.5 h-1.5 bg-white rounded-full" />
                      </motion.div>
                    )}
                  </Link>
                )
              })}
              
              {/* Biometric quick access */}
              {biometricStatus.isEnabled && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="absolute top-2 right-4 w-8 h-8 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full border border-primary/20 flex items-center justify-center"
                  onClick={() => {
                    // Trigger biometric authentication
                    console.log('Biometric auth triggered')
                  }}
                >
                  {React.createElement(getBiometricIcon(), { 
                    className: `w-4 h-4 ${getBiometricStatusColor()}` 
                  })}
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Spacer for fixed header and bottom bar */}
      <div className="md:hidden h-16" /> {/* Top spacer */}
      <div className="md:hidden h-20" /> {/* Bottom spacer */}
    </>
  )
}

// Mobile-specific layout wrapper with enhanced responsiveness
export function MobileLayout({ 
  children,
  className,
  onQuickAction 
}: { 
  children: React.ReactNode
  className?: string
  onQuickAction?: (action: string) => void
}) {
  return (
    <div className={cn("relative min-h-screen bg-background", className)}>
      <MobileMenu onQuickAction={onQuickAction} />
      
      {/* Mobile content */}
      <main className="md:hidden pt-16 pb-24 min-h-screen">
        <div className="px-4 py-2 max-w-md mx-auto">
          {children}
        </div>
      </main>
      
      {/* Desktop content (hidden on mobile) */}
      <div className="hidden md:block">
        {children}
      </div>
    </div>
  )
}

// Enhanced mobile menu hook for integration with other components
export function useMobileMenu() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('/dashboard')
  
  const closeMenu = () => setIsMenuOpen(false)
  const openMenu = () => setIsMenuOpen(true)
  const toggleMenu = () => setIsMenuOpen(prev => !prev)
  
  const handleQuickAction = (action: string) => {
    console.log(`Quick action: ${action}`)
    // This can be customized by the consuming component
    switch (action) {
      case 'scan-pay':
        // Navigate to scan page or trigger camera
        break
      case 'send-money':
        // Navigate to send money page
        break
      case 'split-bill':
        // Navigate to split bill page
        break
      case 'quick-pay':
        // Show quick pay modal
        break
      default:
        console.log('Unknown action:', action)
    }
  }
  
  return {
    isMenuOpen,
    activeTab,
    setActiveTab,
    closeMenu,
    openMenu,
    toggleMenu,
    handleQuickAction
  }
}