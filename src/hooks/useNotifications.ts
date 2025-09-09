'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { NotificationPayload } from '../lib/websocket';

interface NotificationHookState {
  notifications: NotificationPayload[];
  unreadCount: number;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
}

interface NotificationPreferences {
  email: {
    payments: boolean;
    security: boolean;
    system: boolean;
    promotions: boolean;
    reminders: boolean;
  };
  sms: {
    payments: boolean;
    security: boolean;
    system: boolean;
    promotions: boolean;
    reminders: boolean;
  };
  push: {
    payments: boolean;
    security: boolean;
    system: boolean;
    promotions: boolean;
    reminders: boolean;
  };
  realtime: {
    payments: boolean;
    security: boolean;
    system: boolean;
    promotions: boolean;
    reminders: boolean;
  };
  quiet_hours: {
    enabled: boolean;
    start_time: string;
    end_time: string;
    timezone: string;
  };
  frequency_limits: {
    max_per_hour: number;
    max_per_day: number;
  };
}

interface UseNotificationsOptions {
  autoConnect?: boolean;
  maxNotifications?: number;
  enableSound?: boolean;
  enableToast?: boolean;
  persistNotifications?: boolean;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const {
    autoConnect = true,
    maxNotifications = 50,
    enableSound = true,
    enableToast = true,
    persistNotifications = true,
  } = options;

  const [state, setState] = useState<NotificationHookState>({
    notifications: [],
    unreadCount: 0,
    isConnected: false,
    isLoading: false,
    error: null,
  });

  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio for notifications
  useEffect(() => {
    if (enableSound && typeof window !== 'undefined') {
      audioRef.current = new Audio('/sounds/notification.mp3');
      audioRef.current.volume = 0.5;
    }
  }, [enableSound]);

  // Load persisted notifications from localStorage
  useEffect(() => {
    if (persistNotifications && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('facepay_notifications');
        if (stored) {
          const notifications = JSON.parse(stored);
          setState(prev => ({
            ...prev,
            notifications,
            unreadCount: notifications.filter((n: NotificationPayload) => !n.read).length,
          }));
        }
      } catch (error) {
        console.warn('Failed to load persisted notifications:', error);
      }
    }
  }, [persistNotifications]);

  // Persist notifications to localStorage
  const persistNotifications_ = useCallback((notifications: NotificationPayload[]) => {
    if (persistNotifications && typeof window !== 'undefined') {
      try {
        localStorage.setItem('facepay_notifications', JSON.stringify(notifications));
      } catch (error) {
        console.warn('Failed to persist notifications:', error);
      }
    }
  }, [persistNotifications]);

  // Connect to WebSocket
  const connect = useCallback(async () => {
    if (socketRef.current?.connected) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Get auth token
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No authentication token available');
      }

      // Create socket connection
      const socket = io({
        path: '/api/socket',
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('Connected to notification service');
        setState(prev => ({ ...prev, isConnected: true, isLoading: false, error: null }));
      });

      socket.on('disconnect', (reason) => {
        console.log('Disconnected from notification service:', reason);
        setState(prev => ({ ...prev, isConnected: false }));
      });

      socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        setState(prev => ({ 
          ...prev, 
          isConnected: false, 
          isLoading: false, 
          error: `Connection failed: ${error.message}` 
        }));
      });

      socket.on('notification', (notification: NotificationPayload) => {
        handleNewNotification(notification);
      });

      socket.on('notification:read:success', ({ notificationId }) => {
        setState(prev => {
          const updatedNotifications = prev.notifications.map(n =>
            n.id === notificationId ? { ...n, read: true } : n
          );
          persistNotifications_(updatedNotifications);
          
          return {
            ...prev,
            notifications: updatedNotifications,
            unreadCount: updatedNotifications.filter(n => !n.read).length,
          };
        });
      });

      socket.on('preferences:update:success', (newPreferences) => {
        setPreferences(newPreferences);
      });

      socket.on('system:status', (statusUpdate) => {
        console.log('System status update:', statusUpdate);
        // Handle system status updates (maintenance mode, etc.)
      });

    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }));
    }
  }, []);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setState(prev => ({ ...prev, isConnected: false }));
  }, []);

  // Handle new notifications
  const handleNewNotification = useCallback((notification: NotificationPayload) => {
    setState(prev => {
      // Check if notification already exists
      if (prev.notifications.some(n => n.id === notification.id)) {
        return prev;
      }

      // Add new notification at the beginning
      const newNotifications = [notification, ...prev.notifications].slice(0, maxNotifications);
      persistNotifications_(newNotifications);

      return {
        ...prev,
        notifications: newNotifications,
        unreadCount: newNotifications.filter(n => !n.read).length,
      };
    });

    // Play sound if enabled
    if (enableSound && audioRef.current) {
      audioRef.current.play().catch(e => console.warn('Could not play notification sound:', e));
    }

    // Show toast notification if enabled
    if (enableToast && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/icons/favicon-32x32.png',
          badge: '/icons/badge.png',
          tag: notification.id,
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification(notification.title, {
              body: notification.message,
              icon: '/icons/favicon-32x32.png',
              badge: '/icons/badge.png',
              tag: notification.id,
            });
          }
        });
      }
    }
  }, [maxNotifications, enableSound, enableToast]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    // Optimistic update
    setState(prev => {
      const updatedNotifications = prev.notifications.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      );
      persistNotifications_(updatedNotifications);
      
      return {
        ...prev,
        notifications: updatedNotifications,
        unreadCount: updatedNotifications.filter(n => !n.read).length,
      };
    });

    // Send to server via WebSocket
    if (socketRef.current?.connected) {
      socketRef.current.emit('notification:read', notificationId);
    } else {
      // Fallback to API call
      try {
        await fetch(`/api/notifications/${notificationId}/read`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          },
        });
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
        // Revert optimistic update
        setState(prev => {
          const revertedNotifications = prev.notifications.map(n =>
            n.id === notificationId ? { ...n, read: false } : n
          );
          persistNotifications_(revertedNotifications);
          
          return {
            ...prev,
            notifications: revertedNotifications,
            unreadCount: revertedNotifications.filter(n => !n.read).length,
          };
        });
      }
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    const unreadIds = state.notifications.filter(n => !n.read).map(n => n.id);
    
    if (unreadIds.length === 0) return;

    // Optimistic update
    setState(prev => {
      const updatedNotifications = prev.notifications.map(n => ({ ...n, read: true }));
      persistNotifications_(updatedNotifications);
      
      return {
        ...prev,
        notifications: updatedNotifications,
        unreadCount: 0,
      };
    });

    try {
      await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationIds: unreadIds }),
      });
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      // Revert optimistic update
      setState(prev => {
        const revertedNotifications = prev.notifications.map((n, index) => ({
          ...n,
          read: unreadIds.includes(n.id) ? false : n.read,
        }));
        persistNotifications_(revertedNotifications);
        
        return {
          ...prev,
          notifications: revertedNotifications,
          unreadCount: revertedNotifications.filter(n => !n.read).length,
        };
      });
    }
  }, [state.notifications]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    // Optimistic update
    const notificationToDelete = state.notifications.find(n => n.id === notificationId);
    setState(prev => {
      const updatedNotifications = prev.notifications.filter(n => n.id !== notificationId);
      persistNotifications_(updatedNotifications);
      
      return {
        ...prev,
        notifications: updatedNotifications,
        unreadCount: updatedNotifications.filter(n => !n.read).length,
      };
    });

    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
    } catch (error) {
      console.error('Failed to delete notification:', error);
      // Revert optimistic update
      if (notificationToDelete) {
        setState(prev => {
          const revertedNotifications = [...prev.notifications, notificationToDelete];
          revertedNotifications.sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          persistNotifications_(revertedNotifications);
          
          return {
            ...prev,
            notifications: revertedNotifications,
            unreadCount: revertedNotifications.filter(n => !n.read).length,
          };
        });
      }
    }
  }, [state.notifications]);

  // Clear all notifications
  const clearAll = useCallback(async () => {
    const currentNotifications = [...state.notifications];
    
    // Optimistic update
    setState(prev => {
      persistNotifications_([]);
      return {
        ...prev,
        notifications: [],
        unreadCount: 0,
      };
    });

    try {
      await fetch('/api/notifications/clear-all', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
    } catch (error) {
      console.error('Failed to clear all notifications:', error);
      // Revert optimistic update
      setState(prev => {
        persistNotifications_(currentNotifications);
        return {
          ...prev,
          notifications: currentNotifications,
          unreadCount: currentNotifications.filter(n => !n.read).length,
        };
      });
    }
  }, [state.notifications]);

  // Refresh notifications from server
  const refreshNotifications = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const response = await fetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (response.ok) {
        const notifications = await response.json();
        setState(prev => {
          persistNotifications_(notifications);
          return {
            ...prev,
            notifications,
            unreadCount: notifications.filter((n: NotificationPayload) => !n.read).length,
            isLoading: false,
          };
        });
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to refresh notifications:', error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: `Failed to refresh: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }));
    }
  }, []);

  // Update notification preferences
  const updatePreferences = useCallback(async (newPreferences: Partial<NotificationPreferences>) => {
    if (!preferences) return;
    const updatedPreferences = { ...preferences, ...newPreferences };
    setPreferences(updatedPreferences);

    // Send via WebSocket if connected
    if (socketRef.current?.connected) {
      socketRef.current.emit('preferences:update', updatedPreferences);
    }

    // Also send via API
    try {
      await fetch('/api/notifications/preferences', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedPreferences),
      });
    } catch (error) {
      console.error('Failed to update preferences:', error);
      // Revert optimistic update
      setPreferences(preferences);
    }
  }, [preferences]);

  // Load preferences
  const loadPreferences = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/preferences', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (response.ok) {
        const prefs = await response.json();
        setPreferences(prefs);
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
      loadPreferences();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect, loadPreferences]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  return {
    // State
    notifications: state.notifications,
    unreadCount: state.unreadCount,
    isConnected: state.isConnected,
    isLoading: state.isLoading,
    error: state.error,
    preferences,

    // Actions
    connect,
    disconnect,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    refreshNotifications,
    updatePreferences,
    loadPreferences,

    // Utilities
    getNotificationById: useCallback((id: string) => 
      state.notifications.find(n => n.id === id), [state.notifications]),
    
    getNotificationsByType: useCallback((type: NotificationPayload['type']) =>
      state.notifications.filter(n => n.type === type), [state.notifications]),
    
    hasUnreadOfType: useCallback((type: NotificationPayload['type']) =>
      state.notifications.some(n => n.type === type && !n.read), [state.notifications]),
  };
}