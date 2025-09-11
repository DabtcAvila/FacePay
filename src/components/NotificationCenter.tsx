'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  X, 
  Check, 
  Trash2, 
  Settings, 
  Filter,
  MoreVertical,
  AlertCircle,
  DollarSign,
  ShieldCheck,
  Info,
  Gift,
  Clock,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { NotificationPayload } from '../lib/websocket';
import { useNotifications } from '../hooks/useNotifications';

interface NotificationCenterProps {
  className?: string;
  maxHeight?: string;
}

interface NotificationItemProps {
  notification: NotificationPayload;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
  onAction?: (id: string, action: string) => void;
}

const NotificationIcon = ({ type }: { type: NotificationPayload['type'] }) => {
  const iconProps = { size: 20, className: "flex-shrink-0" };
  
  switch (type) {
    case 'payment':
      return <DollarSign {...iconProps} className="text-green-500" />;
    case 'security':
      return <ShieldCheck {...iconProps} className="text-red-500" />;
    case 'system':
      return <Info {...iconProps} className="text-blue-500" />;
    case 'promotion':
      return <Gift {...iconProps} className="text-purple-500" />;
    case 'reminder':
      return <Clock {...iconProps} className="text-orange-500" />;
    default:
      return <Bell {...iconProps} className="text-gray-500" />;
  }
};

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onRead,
  onDelete,
  onAction,
}) => {
  const [showActions, setShowActions] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) {
        setShowActions(false);
      }
    };

    if (showActions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showActions]);

  const formatTimeAgo = (date: Date | string) => {
    const now = new Date();
    const parsedDate = typeof date === 'string' ? new Date(date) : date;
    const diffInSeconds = Math.floor((now.getTime() - parsedDate.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const getTypeColor = (type: NotificationPayload['type']) => {
    switch (type) {
      case 'payment': return 'bg-green-50 border-green-200';
      case 'security': return 'bg-red-50 border-red-200';
      case 'system': return 'bg-blue-50 border-blue-200';
      case 'promotion': return 'bg-purple-50 border-purple-200';
      case 'reminder': return 'bg-orange-50 border-orange-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const shouldTruncate = notification.message.length > 100;
  const displayMessage = expanded || !shouldTruncate 
    ? notification.message 
    : notification.message.substring(0, 100) + '...';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -300 }}
      className={`
        relative border rounded-lg p-4 mb-3 transition-all duration-200 hover:shadow-md
        ${!notification.read ? 'border-l-4 border-l-blue-500 ' + getTypeColor(notification.type) : 'bg-white border-gray-200'}
        ${!notification.read ? 'shadow-sm' : ''}
      `}
    >
      <div className="flex items-start space-x-3">
        <div className="mt-0.5">
          <NotificationIcon type={notification.type} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                {notification.title}
              </h4>
              <p className={`text-sm mt-1 ${!notification.read ? 'text-gray-700' : 'text-gray-500'}`}>
                {displayMessage}
              </p>
              
              {shouldTruncate && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-xs text-blue-600 hover:text-blue-800 mt-1 font-medium"
                >
                  {expanded ? 'Show less' : 'Show more'}
                </button>
              )}
              
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-500">
                  {formatTimeAgo(notification.timestamp)}
                </span>
                
                {!notification.read && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onRead(notification.id)}
                      className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                    >
                      Mark as read
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <div className="relative ml-2" ref={actionsRef}>
              <button
                onClick={() => setShowActions(!showActions)}
                className="p-1 rounded-full hover:bg-gray-100 transition-colors"
              >
                <MoreVertical size={16} className="text-gray-400" />
              </button>
              
              <AnimatePresence>
                {showActions && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
                  >
                    <div className="py-1">
                      {!notification.read && (
                        <button
                          onClick={() => {
                            onRead(notification.id);
                            setShowActions(false);
                          }}
                          className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Check size={14} />
                          <span>Mark as read</span>
                        </button>
                      )}
                      
                      {notification.metadata?.actionUrl && (
                        <button
                          onClick={() => {
                            if (onAction) onAction(notification.id, 'view');
                            setShowActions(false);
                          }}
                          className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Info size={14} />
                          <span>View Details</span>
                        </button>
                      )}
                      
                      <button
                        onClick={() => {
                          onDelete(notification.id);
                          setShowActions(false);
                        }}
                        className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={14} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          
          {/* Action buttons for specific notification types */}
          {notification.metadata?.actions && (
            <div className="flex space-x-2 mt-3">
              {notification.metadata.actions.map((action: any, index: number) => (
                <button
                  key={index}
                  onClick={() => onAction && onAction(notification.id, action.type)}
                  className={`
                    text-xs px-3 py-1 rounded font-medium transition-colors
                    ${action.primary 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {!notification.read && (
        <div className="absolute top-4 right-4 w-2 h-2 bg-blue-500 rounded-full"></div>
      )}
    </motion.div>
  );
};

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  className = '',
  maxHeight = '500px',
}) => {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    refreshNotifications,
  } = useNotifications();
  
  const [filter, setFilter] = useState<'all' | 'unread' | NotificationPayload['type']>('all');
  const [showFilter, setShowFilter] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilter(false);
      }
    };

    if (showFilter) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilter]);

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notification.read;
    return notification.type === filter;
  });

  const handleNotificationAction = (notificationId: string, action: string) => {
    const notification = notifications.find(n => n.id === notificationId);
    if (!notification) return;

    // Handle specific actions
    switch (action) {
      case 'view':
        if (notification.metadata?.actionUrl) {
          window.open(notification.metadata.actionUrl, '_blank');
        }
        break;
      case 'approve':
        // Handle approval actions
        console.log('Approved:', notificationId);
        break;
      case 'decline':
        // Handle decline actions
        console.log('Declined:', notificationId);
        break;
      default:
        console.log('Action:', action, notificationId);
    }
    
    // Mark as read if not already
    if (!notification.read) {
      markAsRead(notificationId);
    }
  };

  const filterOptions = [
    { value: 'all', label: 'All notifications', count: notifications.length },
    { value: 'unread', label: 'Unread', count: unreadCount },
    { value: 'payment', label: 'Payments', count: notifications.filter(n => n.type === 'payment').length },
    { value: 'security', label: 'Security', count: notifications.filter(n => n.type === 'security').length },
    { value: 'system', label: 'System', count: notifications.filter(n => n.type === 'system').length },
    { value: 'promotion', label: 'Promotions', count: notifications.filter(n => n.type === 'promotion').length },
    { value: 'reminder', label: 'Reminders', count: notifications.filter(n => n.type === 'reminder').length },
  ];

  return (
    <div className={`bg-white rounded-lg shadow-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Bell size={20} className="text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
          {unreadCount > 0 && (
            <span className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Filter dropdown */}
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setShowFilter(!showFilter)}
              className="flex items-center space-x-1 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              <Filter size={14} />
              <span>{filterOptions.find(opt => opt.value === filter)?.label}</span>
              <ChevronDown size={14} />
            </button>
            
            <AnimatePresence>
              {showFilter && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
                >
                  <div className="py-1">
                    {filterOptions.map(option => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setFilter(option.value as any);
                          setShowFilter(false);
                        }}
                        className={`
                          flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-gray-50
                          ${filter === option.value ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}
                        `}
                      >
                        <span>{option.label}</span>
                        <span className="text-xs text-gray-500">({option.count})</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Actions */}
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Mark all read
            </button>
          )}
          
          <button
            onClick={refreshNotifications}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
            disabled={isLoading}
          >
            <Settings 
              size={16} 
              className={`text-gray-400 ${isLoading ? 'animate-spin' : ''}`} 
            />
          </button>
        </div>
      </div>
      
      {/* Notifications list */}
      <div className="relative" style={{ maxHeight }}>
        {isLoading && notifications.length === 0 ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading notifications...</span>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-gray-500">
            <Bell size={48} className="mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No notifications</p>
            <p className="text-sm text-center">
              {filter === 'all' 
                ? "You're all caught up! No new notifications."
                : `No ${filter} notifications at the moment.`
              }
            </p>
          </div>
        ) : (
          <div className="overflow-y-auto p-4" style={{ maxHeight: `calc(${maxHeight} - 80px)` }}>
            <AnimatePresence>
              {filteredNotifications.map(notification => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={markAsRead}
                  onDelete={deleteNotification}
                  onAction={handleNotificationAction}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
      
      {/* Footer */}
      {filteredNotifications.length > 0 && (
        <div className="flex items-center justify-between p-4 border-t border-gray-200">
          <span className="text-sm text-gray-500">
            {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
          </span>
          
          <button
            onClick={clearAll}
            className="text-sm text-red-600 hover:text-red-800 font-medium"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;