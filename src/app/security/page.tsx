'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Key, 
  Smartphone, 
  Eye, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Plus,
  Trash2,
  RefreshCw
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';

interface BiometricMethod {
  id: string;
  type: 'face' | 'fingerprint';
  name: string;
  isActive: boolean;
  createdAt: string;
  lastUsed?: string;
}

interface SecuritySession {
  id: string;
  deviceName: string;
  ipAddress: string;
  location: string;
  userAgent: string;
  isCurrentSession: boolean;
  lastActivity: string;
  createdAt: string;
}

interface SecurityEvent {
  id: string;
  type: 'login' | 'payment' | 'settings_change' | 'biometric_update';
  description: string;
  success: boolean;
  timestamp: string;
  ipAddress?: string;
  deviceInfo?: string;
}

export default function SecurityPage() {
  const [biometricMethods, setBiometricMethods] = useState<BiometricMethod[]>([]);
  const [securitySessions, setSecuritySessions] = useState<SecuritySession[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddBiometric, setShowAddBiometric] = useState(false);

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const fetchSecurityData = async () => {
    try {
      // Mock data - in a real app, these would come from your API
      setBiometricMethods([
        {
          id: '1',
          type: 'face',
          name: 'iPhone Face ID',
          isActive: true,
          createdAt: '2024-01-15T10:00:00Z',
          lastUsed: '2024-01-20T15:30:00Z'
        },
        {
          id: '2',
          type: 'fingerprint',
          name: 'Touch ID',
          isActive: false,
          createdAt: '2024-01-10T14:20:00Z'
        }
      ]);

      setSecuritySessions([
        {
          id: '1',
          deviceName: 'iPhone 15 Pro',
          ipAddress: '192.168.1.100',
          location: 'San Francisco, CA',
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
          isCurrentSession: true,
          lastActivity: '2024-01-20T16:45:00Z',
          createdAt: '2024-01-20T08:00:00Z'
        },
        {
          id: '2',
          deviceName: 'Chrome on MacBook',
          ipAddress: '192.168.1.101',
          location: 'San Francisco, CA',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          isCurrentSession: false,
          lastActivity: '2024-01-19T22:15:00Z',
          createdAt: '2024-01-19T20:00:00Z'
        }
      ]);

      setSecurityEvents([
        {
          id: '1',
          type: 'login',
          description: 'Successful login via Face ID',
          success: true,
          timestamp: '2024-01-20T16:45:00Z',
          ipAddress: '192.168.1.100',
          deviceInfo: 'iPhone 15 Pro'
        },
        {
          id: '2',
          type: 'payment',
          description: 'Payment authorized with biometric verification',
          success: true,
          timestamp: '2024-01-20T15:30:00Z',
          ipAddress: '192.168.1.100'
        },
        {
          id: '3',
          type: 'login',
          description: 'Failed login attempt',
          success: false,
          timestamp: '2024-01-20T12:15:00Z',
          ipAddress: '203.0.113.42',
          deviceInfo: 'Unknown device'
        },
        {
          id: '4',
          type: 'settings_change',
          description: 'Security settings updated',
          success: true,
          timestamp: '2024-01-19T18:20:00Z',
          ipAddress: '192.168.1.101'
        }
      ]);
    } catch (error) {
      console.error('Failed to fetch security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveBiometric = async (id: string) => {
    try {
      // In a real app, make API call to remove biometric method
      setBiometricMethods(prev => prev.filter(method => method.id !== id));
    } catch (error) {
      console.error('Failed to remove biometric method:', error);
    }
  };

  const handleTerminateSession = async (sessionId: string) => {
    try {
      // In a real app, make API call to terminate session
      setSecuritySessions(prev => prev.filter(session => session.id !== sessionId));
    } catch (error) {
      console.error('Failed to terminate session:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEventIcon = (event: SecurityEvent) => {
    if (!event.success) return <XCircle className="w-4 h-4 text-red-600" />;
    
    switch (event.type) {
      case 'login':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'payment':
        return <CheckCircle className="w-4 h-4 text-blue-600" />;
      case 'settings_change':
        return <CheckCircle className="w-4 h-4 text-orange-600" />;
      case 'biometric_update':
        return <CheckCircle className="w-4 h-4 text-purple-600" />;
      default:
        return <CheckCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: Shield },
    { id: 'biometric', name: 'Biometric', icon: Eye },
    { id: 'sessions', name: 'Active Sessions', icon: Smartphone },
    { id: 'activity', name: 'Security Log', icon: Clock }
  ];

  if (loading) {
    return (
      <DashboardLayout activeTab="security">
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeTab="security">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Security Center</h1>
          <p className="text-gray-600 mt-1">Monitor and manage your account security</p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Security Score */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Security Score</h3>
                <div className="bg-green-100 px-3 py-1 rounded-full">
                  <span className="text-green-800 font-semibold">85/100</span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                <div className="bg-green-600 h-3 rounded-full" style={{ width: '85%' }}></div>
              </div>
              <p className="text-gray-600">Your account has strong security measures in place.</p>
            </div>

            {/* Security Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Eye className="w-5 h-5 text-blue-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900">Biometric Auth</h4>
                </div>
                <p className="text-2xl font-bold text-gray-900">{biometricMethods.filter(m => m.isActive).length}</p>
                <p className="text-sm text-gray-600">Active methods</p>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <Smartphone className="w-5 h-5 text-green-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900">Active Sessions</h4>
                </div>
                <p className="text-2xl font-bold text-gray-900">{securitySessions.length}</p>
                <p className="text-sm text-gray-600">Signed in devices</p>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="bg-orange-100 p-2 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900">Failed Attempts</h4>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {securityEvents.filter(e => !e.success).length}
                </p>
                <p className="text-sm text-gray-600">Last 30 days</p>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="bg-purple-100 p-2 rounded-lg">
                    <Key className="w-5 h-5 text-purple-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900">Two-Factor Auth</h4>
                </div>
                <p className="text-2xl font-bold text-red-600">Off</p>
                <p className="text-sm text-gray-600">
                  <button className="text-blue-600 hover:underline">Enable now</button>
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Biometric Tab */}
        {activeTab === 'biometric' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Biometric Authentication</h3>
                <p className="text-gray-600">Manage your biometric authentication methods</p>
              </div>
              <Button
                onClick={() => setShowAddBiometric(true)}
                className="flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Method</span>
              </Button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {biometricMethods.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {biometricMethods.map((method, index) => (
                    <motion.div
                      key={method.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-6 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`p-3 rounded-full ${
                          method.type === 'face' ? 'bg-blue-100' : 'bg-green-100'
                        }`}>
                          {method.type === 'face' ? (
                            <Eye className={`w-6 h-6 ${
                              method.type === 'face' ? 'text-blue-600' : 'text-green-600'
                            }`} />
                          ) : (
                            <Key className="w-6 h-6 text-green-600" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{method.name}</h4>
                          <p className="text-sm text-gray-600 capitalize">
                            {method.type} recognition
                          </p>
                          <p className="text-xs text-gray-500">
                            Added {formatDate(method.createdAt)}
                            {method.lastUsed && (
                              <span> • Last used {formatDate(method.lastUsed)}</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className={`px-3 py-1 rounded-full text-sm ${
                          method.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {method.isActive ? 'Active' : 'Inactive'}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemoveBiometric(method.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <Eye className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No biometric methods configured</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Add Face ID or fingerprint authentication for enhanced security
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Sessions Tab */}
        {activeTab === 'sessions' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Active Sessions</h3>
              <p className="text-gray-600">Devices currently signed into your account</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="divide-y divide-gray-200">
                {securitySessions.map((session, index) => (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-6"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="bg-blue-100 p-3 rounded-full">
                          <Smartphone className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-semibold text-gray-900">{session.deviceName}</h4>
                            {session.isCurrentSession && (
                              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                                Current
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{session.location}</p>
                          <p className="text-xs text-gray-500">
                            IP: {session.ipAddress} • Last active {formatDate(session.lastActivity)}
                          </p>
                        </div>
                      </div>
                      {!session.isCurrentSession && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTerminateSession(session.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          Terminate
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Security Activity</h3>
                <p className="text-gray-600">Recent security events for your account</p>
              </div>
              <Button variant="outline" className="flex items-center space-x-2">
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </Button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="divide-y divide-gray-200">
                {securityEvents.map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-6 flex items-start space-x-4"
                  >
                    <div className="mt-1">
                      {getEventIcon(event)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{event.description}</p>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                        <span>{formatDate(event.timestamp)}</span>
                        {event.ipAddress && <span>IP: {event.ipAddress}</span>}
                        {event.deviceInfo && <span>{event.deviceInfo}</span>}
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs ${
                      event.success
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {event.success ? 'Success' : 'Failed'}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}