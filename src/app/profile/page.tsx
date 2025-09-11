'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Mail, 
  Shield, 
  Key, 
  Bell, 
  Globe, 
  Trash2, 
  Save,
  Eye,
  EyeOff,
  Camera
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { User as UserType } from '@/types';

interface ProfileFormData {
  name: string;
  email: string;
}

interface SecuritySettings {
  enableFaceRecognition: boolean;
  enableWebAuthn: boolean;
  requireBiometric: boolean;
  twoFactorAuth: boolean;
}

interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  transactionAlerts: boolean;
  securityAlerts: boolean;
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserType | null>(null);
  const [profileData, setProfileData] = useState<ProfileFormData>({
    name: '',
    email: ''
  });
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    enableFaceRecognition: false,
    enableWebAuthn: false,
    requireBiometric: false,
    twoFactorAuth: false
  });
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    transactionAlerts: true,
    securityAlerts: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/users/profile');
      if (response.ok) {
        const data = await response.json();
        const userData = data.data;
        setUser(userData);
        setProfileData({
          name: userData.name || '',
          email: userData.email || ''
        });

        // Load security settings based on user's biometric data
        setSecuritySettings({
          enableFaceRecognition: userData.biometricData?.some((b: any) => b.type === 'face' && b.isActive) || false,
          enableWebAuthn: true, // Assuming WebAuthn is available
          requireBiometric: userData.biometricData?.length > 0 || false,
          twoFactorAuth: false // This would come from user settings
        });
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!profileData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (profileData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!profileData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveProfile = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData)
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.data);
        // Show success message
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const response = await fetch('/api/users/profile', {
        method: 'DELETE'
      });

      if (response.ok) {
        // Redirect to login or home page
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Failed to delete account:', error);
    }
  };

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'danger', name: 'Danger Zone', icon: Trash2 }
  ];

  if (loading) {
    return (
      <DashboardLayout activeTab="profile">
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeTab="profile">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
          <p className="text-gray-600 mt-1">Manage your account settings and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mr-3 ${
                      activeTab === tab.id ? 'text-blue-700' : 'text-gray-400'
                    }`} />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6"
                >
                  <div className="flex items-center space-x-6 mb-8">
                    <div className="relative">
                      <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-2xl">
                          {profileData.name?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      </div>
                      <button className="absolute bottom-0 right-0 bg-white rounded-full p-1.5 shadow-md border border-gray-200">
                        <Camera className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Profile Picture</h3>
                      <p className="text-sm text-gray-600">Upload a new profile picture</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={profileData.name}
                        onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                        className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors.name ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Enter your full name"
                      />
                      {errors.name && (
                        <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                        className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors.email ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Enter your email address"
                      />
                      {errors.email && (
                        <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                      )}
                    </div>

                    <div className="pt-4">
                      <Button
                        onClick={handleSaveProfile}
                        disabled={saving}
                        className="flex items-center space-x-2"
                      >
                        {saving ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 space-y-6"
                >
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Settings</h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Shield className="w-5 h-5 text-blue-600" />
                          <div>
                            <p className="font-medium text-gray-900">Face Recognition</p>
                            <p className="text-sm text-gray-600">Use your face to authenticate payments</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={securitySettings.enableFaceRecognition}
                            onChange={(e) => setSecuritySettings(prev => ({
                              ...prev,
                              enableFaceRecognition: e.target.checked
                            }))}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Key className="w-5 h-5 text-green-600" />
                          <div>
                            <p className="font-medium text-gray-900">WebAuthn / Passkeys</p>
                            <p className="text-sm text-gray-600">Use hardware keys or biometrics for authentication</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={securitySettings.enableWebAuthn}
                            onChange={(e) => setSecuritySettings(prev => ({
                              ...prev,
                              enableWebAuthn: e.target.checked
                            }))}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Shield className="w-5 h-5 text-purple-600" />
                          <div>
                            <p className="font-medium text-gray-900">Require Biometric Auth</p>
                            <p className="text-sm text-gray-600">Always require biometric verification for payments</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={securitySettings.requireBiometric}
                            onChange={(e) => setSecuritySettings(prev => ({
                              ...prev,
                              requireBiometric: e.target.checked
                            }))}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Password & Authentication</h3>
                    <div className="space-y-3">
                      <Button variant="outline" className="w-full justify-start">
                        <Key className="w-4 h-4 mr-2" />
                        Change Password
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <Shield className="w-4 h-4 mr-2" />
                        Setup Two-Factor Authentication
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 space-y-6"
                >
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h3>
                    
                    <div className="space-y-4">
                      {Object.entries(notificationSettings).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900 capitalize">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </p>
                            <p className="text-sm text-gray-600">
                              {getNotificationDescription(key)}
                            </p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={value}
                              onChange={(e) => setNotificationSettings(prev => ({
                                ...prev,
                                [key]: e.target.checked
                              }))}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Danger Zone Tab */}
              {activeTab === 'danger' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6"
                >
                  <div className="border border-red-200 rounded-lg p-6 bg-red-50">
                    <h3 className="text-lg font-semibold text-red-900 mb-2">Danger Zone</h3>
                    <p className="text-red-700 mb-6">
                      These actions are permanent and cannot be undone. Please be careful.
                    </p>

                    {!showDeleteConfirm ? (
                      <Button
                        variant="outline"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="border-red-300 text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Account
                      </Button>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-white border border-red-200 rounded-lg p-4">
                          <h4 className="font-semibold text-red-900 mb-2">Are you absolutely sure?</h4>
                          <p className="text-sm text-red-700 mb-4">
                            This action will permanently delete your account and all associated data. 
                            This cannot be undone.
                          </p>
                          <div className="flex space-x-3">
                            <Button
                              onClick={handleDeleteAccount}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Yes, Delete Account
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setShowDeleteConfirm(false)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function getNotificationDescription(key: string): string {
  const descriptions: Record<string, string> = {
    emailNotifications: 'Receive updates via email',
    pushNotifications: 'Get notifications on your device',
    smsNotifications: 'Receive SMS alerts for important updates',
    transactionAlerts: 'Get notified about all transactions',
    securityAlerts: 'Receive alerts about security events'
  };
  return descriptions[key] || 'Configure this notification setting';
}