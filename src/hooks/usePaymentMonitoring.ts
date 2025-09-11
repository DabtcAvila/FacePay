import { useState, useEffect, useCallback, useRef } from 'react';
import { TransactionData, AlertData, MetricsData, AnomalyDetectionResult } from '@/services/payment-monitoring';

interface UsePaymentMonitoringOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  realtime?: boolean;
}

interface UsePaymentMonitoringReturn {
  // Data
  metrics: MetricsData | null;
  alerts: AlertData[];
  anomalies: AnomalyDetectionResult | null;
  
  // Loading states
  loading: {
    metrics: boolean;
    alerts: boolean;
    anomalies: boolean;
  };
  
  // Error states
  errors: {
    metrics: string | null;
    alerts: string | null;
    anomalies: string | null;
  };
  
  // Actions
  trackTransaction: (transaction: TransactionData) => Promise<boolean>;
  acknowledgeAlert: (alertId: string) => Promise<boolean>;
  refreshMetrics: (period?: '1h' | '24h' | '7d' | '30d') => Promise<void>;
  refreshAlerts: () => Promise<void>;
  runAnomalyDetection: () => Promise<void>;
  
  // Real-time data
  isConnected: boolean;
  lastUpdate: Date | null;
}

export function usePaymentMonitoring(options: UsePaymentMonitoringOptions = {}): UsePaymentMonitoringReturn {
  const {
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds
    realtime = false
  } = options;

  // State
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyDetectionResult | null>(null);
  const [loading, setLoading] = useState({
    metrics: true,
    alerts: true,
    anomalies: false
  });
  const [errors, setErrors] = useState({
    metrics: null as string | null,
    alerts: null as string | null,
    anomalies: null as string | null
  });
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Refs
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch metrics
  const refreshMetrics = useCallback(async (period: '1h' | '24h' | '7d' | '30d' = '24h') => {
    setLoading(prev => ({ ...prev, metrics: true }));
    setErrors(prev => ({ ...prev, metrics: null }));

    try {
      const response = await fetch(`/api/monitoring/metrics?period=${period}`);
      const data = await response.json();

      if (data.success) {
        setMetrics(data.data);
        setLastUpdate(new Date());
      } else {
        throw new Error(data.error || 'Failed to fetch metrics');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setErrors(prev => ({ ...prev, metrics: errorMessage }));
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(prev => ({ ...prev, metrics: false }));
    }
  }, []);

  // Fetch alerts
  const refreshAlerts = useCallback(async () => {
    setLoading(prev => ({ ...prev, alerts: true }));
    setErrors(prev => ({ ...prev, alerts: null }));

    try {
      const response = await fetch('/api/monitoring/alerts?active=true');
      const data = await response.json();

      if (data.success) {
        setAlerts(data.data);
        setLastUpdate(new Date());
      } else {
        throw new Error(data.error || 'Failed to fetch alerts');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setErrors(prev => ({ ...prev, alerts: errorMessage }));
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(prev => ({ ...prev, alerts: false }));
    }
  }, []);

  // Run anomaly detection
  const runAnomalyDetection = useCallback(async () => {
    setLoading(prev => ({ ...prev, anomalies: true }));
    setErrors(prev => ({ ...prev, anomalies: null }));

    try {
      const response = await fetch('/api/monitoring/anomalies');
      const data = await response.json();

      if (data.success) {
        setAnomalies(data.data);
        setLastUpdate(new Date());
      } else {
        throw new Error(data.error || 'Failed to detect anomalies');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setErrors(prev => ({ ...prev, anomalies: errorMessage }));
      console.error('Error detecting anomalies:', error);
    } finally {
      setLoading(prev => ({ ...prev, anomalies: false }));
    }
  }, []);

  // Track transaction
  const trackTransaction = useCallback(async (transaction: TransactionData): Promise<boolean> => {
    try {
      const response = await fetch('/api/monitoring/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transaction)
      });

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Error tracking transaction:', error);
      return false;
    }
  }, []);

  // Acknowledge alert
  const acknowledgeAlert = useCallback(async (alertId: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/monitoring/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ alertId, action: 'acknowledge' })
      });

      const data = await response.json();
      
      if (data.success) {
        // Update local alerts state
        setAlerts(prev => prev.filter(alert => alert.id !== alertId));
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      return false;
    }
  }, []);

  // Set up WebSocket connection for real-time updates
  useEffect(() => {
    if (!realtime) return;

    // Note: This is a mock WebSocket setup
    // In production, you would connect to a real WebSocket server
    const connectWebSocket = () => {
      try {
        // This would be a real WebSocket connection in production
        // wsRef.current = new WebSocket('ws://localhost:3000/ws/monitoring');
        
        // Mock connection for demonstration
        setIsConnected(true);
        console.log('WebSocket connected (mock)');

        // Simulate real-time updates
        const mockRealtime = setInterval(() => {
          // Simulate receiving updates
          setLastUpdate(new Date());
        }, 10000);

        return () => {
          clearInterval(mockRealtime);
        };
      } catch (error) {
        console.error('WebSocket connection error:', error);
        setIsConnected(false);
      }
    };

    const cleanup = connectWebSocket();

    return () => {
      if (cleanup) cleanup();
      if (wsRef.current) {
        wsRef.current.close();
        setIsConnected(false);
      }
    };
  }, [realtime]);

  // Set up auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const refresh = async () => {
      await Promise.all([
        refreshMetrics(),
        refreshAlerts()
      ]);
    };

    // Initial load
    refresh();

    // Set up interval
    intervalRef.current = setInterval(refresh, refreshInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, refreshMetrics, refreshAlerts]);

  // Run initial anomaly detection
  useEffect(() => {
    runAnomalyDetection();
  }, [runAnomalyDetection]);

  return {
    // Data
    metrics,
    alerts,
    anomalies,
    
    // Loading states
    loading,
    
    // Error states
    errors,
    
    // Actions
    trackTransaction,
    acknowledgeAlert,
    refreshMetrics,
    refreshAlerts,
    runAnomalyDetection,
    
    // Real-time data
    isConnected,
    lastUpdate
  };
}