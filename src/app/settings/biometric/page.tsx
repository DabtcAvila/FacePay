'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Fingerprint,
  Scan,
  Shield,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  Calendar,
  Clock,
  MapPin,
  Monitor,
  MoreVertical,
  RefreshCw,
  Settings
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { WebAuthnService, type WebAuthnCapabilities } from '@/services/webauthn';

interface BiometricDevice {
  id: string;
  name: string;
  type: 'face' | 'fingerprint' | 'voice' | 'unknown';
  platform: string;
  registeredAt: Date;
  lastUsed: Date;
  isActive: boolean;
  isCurrent: boolean;
}

interface AuthenticationEvent {
  id: string;
  timestamp: Date;
  type: 'success' | 'failed' | 'blocked';
  method: 'face' | 'fingerprint' | 'pin' | 'password';
  device: string;
  location?: string;
  ipAddress?: string;
}

interface BiometricSettings {
  enabled: boolean;
  requireForPayments: boolean;
  requireForLogin: boolean;
  requireForSensitiveActions: boolean;
  fallbackToPin: boolean;
  maxFailedAttempts: number;
  lockoutDuration: number; // minutes
  promptTimeout: number; // seconds
}

export default function BiometricSettingsPage() {
  const [capabilities, setCapabilities] = useState<WebAuthnCapabilities | null>(null);
  const [settings, setSettings] = useState<BiometricSettings>({
    enabled: true,
    requireForPayments: true,
    requireForLogin: true,
    requireForSensitiveActions: true,
    fallbackToPin: true,
    maxFailedAttempts: 3,
    lockoutDuration: 15,
    promptTimeout: 30
  });
  
  const [devices, setDevices] = useState<BiometricDevice[]>([
    {
      id: '1',
      name: 'iPhone 15 Pro - Face ID',
      type: 'face',
      platform: 'iOS 17.1',
      registeredAt: new Date('2024-01-15'),
      lastUsed: new Date('2024-01-20'),
      isActive: true,
      isCurrent: true
    },
    {
      id: '2',
      name: 'MacBook Pro - Touch ID',
      type: 'fingerprint',
      platform: 'macOS Sonoma',
      registeredAt: new Date('2024-01-10'),
      lastUsed: new Date('2024-01-19'),
      isActive: true,
      isCurrent: false
    }
  ]);

  const [authHistory, setAuthHistory] = useState<AuthenticationEvent[]>([
    {
      id: '1',
      timestamp: new Date('2024-01-20T10:30:00'),
      type: 'success',
      method: 'face',
      device: 'iPhone 15 Pro',
      location: 'San Francisco, CA'
    },
    {
      id: '2',
      timestamp: new Date('2024-01-20T09:15:00'),
      type: 'success',
      method: 'fingerprint',
      device: 'MacBook Pro',
      location: 'San Francisco, CA'
    },
    {
      id: '3',
      timestamp: new Date('2024-01-19T18:45:00'),
      type: 'failed',
      method: 'face',
      device: 'iPhone 15 Pro',
      location: 'San Francisco, CA'
    },
    {
      id: '4',
      timestamp: new Date('2024-01-19T14:20:00'),
      type: 'success',
      method: 'face',
      device: 'iPhone 15 Pro',
      location: 'San Francisco, CA'
    }
  ]);

  const [loading, setLoading] = useState(false);
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [showDeviceDetails, setShowDeviceDetails] = useState<string | null>(null);

  // Load capabilities on mount
  useEffect(() => {
    loadCapabilities();
  }, []);

  const loadCapabilities = async () => {
    try {
      const caps = await WebAuthnService.checkBrowserCapabilities();
      setCapabilities(caps);
    } catch (error) {
      console.error('Error loading biometric capabilities:', error);
    }
  };

  const getBiometricIcon = (type?: string) => {
    switch (type) {
      case 'face': return Scan;
      case 'fingerprint': return Fingerprint;
      default: return Shield;
    }
  };

  const getBiometricName = (type?: string, platform?: string) => {
    if (!type) return 'Biometric Authentication';
    
    switch (type) {
      case 'face':
        return platform?.includes('iOS') ? 'Face ID' : 'Face Recognition';
      case 'fingerprint':
        return platform?.includes('iOS') ? 'Touch ID' : 'Fingerprint';
      default:
        return 'Biometric Authentication';
    }
  };

  const handleSettingChange = (key: keyof BiometricSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleToggleBiometric = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      handleSettingChange('enabled', !settings.enabled);
    } catch (error) {
      console.error('Error toggling biometric:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDevice = async () => {
    setLoading(true);
    try {
      // Simulate WebAuthn registration
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Map biometric types to supported device types
      const biometricType = capabilities?.biometricTypes[0]
      const deviceType = (biometricType === 'iris' || biometricType === 'voice') ? 'unknown' : (biometricType || 'unknown')
      
      const newDevice: BiometricDevice = {
        id: Date.now().toString(),
        name: `${capabilities?.deviceInfo.platform} Device`,
        type: deviceType as 'face' | 'fingerprint' | 'voice' | 'unknown',
        platform: capabilities?.deviceInfo.platform || 'Unknown',
        registeredAt: new Date(),
        lastUsed: new Date(),
        isActive: true,
        isCurrent: true
      };
      
      setDevices(prev => [newDevice, ...prev.map(d => ({ ...d, isCurrent: false }))]);
      setShowAddDevice(false);
    } catch (error) {
      console.error('Error adding device:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDevice = (deviceId: string) => {
    setDevices(prev => prev.filter(d => d.id !== deviceId));
  };

  const getEventIcon = (type: string, method: string) => {
    if (type === 'success') return CheckCircle2;
    if (type === 'failed') return AlertTriangle;
    if (type === 'blocked') return Lock;
    return Shield;
  };

  const getEventColor = (type: string) => {
    if (type === 'success') return 'text-green-600 bg-green-100';
    if (type === 'failed') return 'text-yellow-600 bg-yellow-100';
    if (type === 'blocked') return 'text-red-600 bg-red-100';
    return 'text-gray-600 bg-gray-100';
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  return (
    <DashboardLayout activeTab="settings">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Biometric Authentication</h1>
            <p className="text-gray-600 mt-2">Secure your account with Face ID, Touch ID, or fingerprint recognition</p>
          </div>
          
          {capabilities?.isSupported && (
            <div className="flex items-center space-x-3">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                settings.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
              }`}>
                {settings.enabled ? 'Enabled' : 'Disabled'}
              </div>
              <Button
                onClick={handleToggleBiometric}
                disabled={loading}
                variant={settings.enabled ? "destructive" : "default"}
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : settings.enabled ? (
                  'Disable'
                ) : (
                  'Enable'
                )}
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Configuration */}
          <div className="lg:col-span-2 space-y-8">
            {/* Biometric Status */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center space-x-4">
                  <div className={`p-4 rounded-xl ${
                    capabilities?.isSupported && settings.enabled 
                      ? 'bg-green-100' 
                      : 'bg-gray-100'
                  }`}>
                    {capabilities?.biometricTypes?.[0] ? (
                      React.createElement(getBiometricIcon(capabilities.biometricTypes[0]), {
                        className: `w-8 h-8 ${
                          capabilities.isSupported && settings.enabled 
                            ? 'text-green-600' 
                            : 'text-gray-400'
                        }`
                      })
                    ) : (
                      <Shield className={`w-8 h-8 ${
                        capabilities?.isSupported && settings.enabled 
                          ? 'text-green-600' 
                          : 'text-gray-400'
                      }`} />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900">
                      {capabilities?.biometricTypes?.[0] 
                        ? getBiometricName(capabilities.biometricTypes[0], capabilities.deviceInfo.platform)
                        : 'Biometric Authentication'
                      }
                    </h3>
                    <p className="text-gray-600 mt-1">
                      {!capabilities?.isSupported 
                        ? 'Not supported on this device' 
                        : settings.enabled 
                        ? 'Active and protecting your account'
                        : 'Available but currently disabled'
                      }
                    </p>
                  </div>
                  
                  {capabilities?.isSupported && settings.enabled && (
                    <div className="flex items-center space-x-2 text-green-600">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="text-sm font-medium">Secure</span>
                    </div>
                  )}
                </div>

                {capabilities?.isSupported && (
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Platform</p>
                        <p className="font-medium">{capabilities.deviceInfo.platform}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Type</p>
                        <p className="font-medium capitalize">
                          {capabilities.biometricTypes.join(', ') || 'Unknown'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Verification</p>
                        <p className="font-medium">
                          {capabilities.isPlatformAuthenticatorAvailable ? 'Supported' : 'Basic'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Status</p>
                        <p className="font-medium">
                          {capabilities.isPlatformAuthenticatorAvailable ? 'Available' : 'Limited'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Security Settings */}
            {capabilities?.isSupported && settings.enabled && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200"
              >
                <div className="p-6">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <Settings className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Security Configuration</h3>
                  </div>

                  <div className="space-y-6">
                    {/* Authentication Requirements */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-4">Authentication Requirements</h4>
                      <div className="space-y-4">
                        {[
                          {
                            key: 'requireForLogin' as const,
                            title: 'Require for Login',
                            description: 'Use biometric authentication to sign in'
                          },
                          {
                            key: 'requireForPayments' as const,
                            title: 'Require for Payments',
                            description: 'Verify identity before processing payments'
                          },
                          {
                            key: 'requireForSensitiveActions' as const,
                            title: 'Require for Sensitive Actions',
                            description: 'Protect settings changes and data access'
                          }
                        ].map((item) => (
                          <div key={item.key} className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{item.title}</p>
                              <p className="text-sm text-gray-600">{item.description}</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={settings[item.key]}
                                onChange={(e) => handleSettingChange(item.key, e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Security Parameters */}
                    <div className="border-t border-gray-200 pt-6">
                      <h4 className="font-medium text-gray-900 mb-4">Security Parameters</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Max Failed Attempts
                          </label>
                          <select
                            value={settings.maxFailedAttempts}
                            onChange={(e) => handleSettingChange('maxFailedAttempts', parseInt(e.target.value))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value={3}>3 attempts</option>
                            <option value={5}>5 attempts</option>
                            <option value={10}>10 attempts</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Lockout Duration
                          </label>
                          <select
                            value={settings.lockoutDuration}
                            onChange={(e) => handleSettingChange('lockoutDuration', parseInt(e.target.value))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value={5}>5 minutes</option>
                            <option value={15}>15 minutes</option>
                            <option value={30}>30 minutes</option>
                            <option value={60}>1 hour</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Prompt Timeout
                          </label>
                          <select
                            value={settings.promptTimeout}
                            onChange={(e) => handleSettingChange('promptTimeout', parseInt(e.target.value))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value={15}>15 seconds</option>
                            <option value={30}>30 seconds</option>
                            <option value={60}>1 minute</option>
                          </select>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">Fallback to PIN</p>
                            <p className="text-sm text-gray-600">Allow PIN if biometric fails</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={settings.fallbackToPin}
                              onChange={(e) => handleSettingChange('fallbackToPin', e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Registered Devices */}
            {settings.enabled && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <div className="bg-purple-100 p-2 rounded-lg">
                        <Smartphone className="w-5 h-5 text-purple-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">Registered Devices</h3>
                    </div>
                    <Button
                      onClick={() => setShowAddDevice(true)}
                      size="sm"
                      className="flex items-center space-x-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Device</span>
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {devices.map((device) => {
                      const Icon = getBiometricIcon(device.type);
                      return (
                        <motion.div
                          key={device.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center space-x-4">
                            <div className={`p-3 rounded-lg ${device.isActive ? 'bg-green-100' : 'bg-gray-100'}`}>
                              <Icon className={`w-5 h-5 ${device.isActive ? 'text-green-600' : 'text-gray-400'}`} />
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <h4 className="font-medium text-gray-900">{device.name}</h4>
                                {device.isCurrent && (
                                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                    Current Device
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                                <span>{device.platform}</span>
                                <span>•</span>
                                <span>Registered {formatRelativeTime(device.registeredAt)}</span>
                                <span>•</span>
                                <span>Last used {formatRelativeTime(device.lastUsed)}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowDeviceDetails(device.id)}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                            {!device.isCurrent && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveDevice(device.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Authentication History */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="bg-orange-100 p-2 rounded-lg">
                      <Clock className="w-5 h-5 text-orange-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                  </div>
                  <Button variant="ghost" size="sm">
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-4">
                  {authHistory.slice(0, 10).map((event) => {
                    const Icon = getEventIcon(event.type, event.method);
                    return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className={`p-2 rounded-full ${getEventColor(event.type)}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-gray-900 capitalize">
                              {event.method} {event.type}
                            </p>
                            <span className="text-xs text-gray-500">
                              {formatRelativeTime(event.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {event.device}
                          </p>
                          {event.location && (
                            <div className="flex items-center space-x-1 mt-1">
                              <MapPin className="w-3 h-3 text-gray-400" />
                              <span className="text-xs text-gray-500">{event.location}</span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-200">
                  <Button variant="ghost" className="w-full text-sm">
                    View Complete History
                  </Button>
                </div>
              </div>
            </motion.div>

            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-6"
            >
              <h3 className="font-semibold text-gray-900 mb-4">Security Summary</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Success Rate (7 days)</span>
                  <span className="font-semibold text-green-600">94%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Active Devices</span>
                  <span className="font-semibold text-blue-600">{devices.filter(d => d.isActive).length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Last Authentication</span>
                  <span className="font-semibold text-gray-900">
                    {formatRelativeTime(authHistory[0]?.timestamp)}
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Add Device Modal */}
        <AnimatePresence>
          {showAddDevice && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowAddDevice(false)}
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
                    {capabilities?.biometricTypes?.[0] ? (
                      React.createElement(getBiometricIcon(capabilities.biometricTypes[0]), {
                        className: 'w-8 h-8 text-blue-600'
                      })
                    ) : (
                      <Shield className="w-8 h-8 text-blue-600" />
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Add New Device
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Register this device for biometric authentication. You'll be prompted to use your {
                        capabilities?.biometricTypes?.[0] 
                          ? getBiometricName(capabilities.biometricTypes[0], capabilities.deviceInfo.platform)
                          : 'biometric authentication'
                      }.
                    </p>
                  </div>
                  
                  <div className="space-y-3 pt-4">
                    <Button 
                      className="w-full" 
                      onClick={handleAddDevice}
                      disabled={loading}
                    >
                      {loading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        'Register Device'
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setShowAddDevice(false)}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}