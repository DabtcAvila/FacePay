'use client';

import React, { useState } from 'react';
import { usePaymentMonitoring } from '@/hooks/usePaymentMonitoring';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUpIcon, 
  TrendingDownIcon, 
  AlertTriangleIcon, 
  CheckCircleIcon,
  RefreshCwIcon,
  ActivityIcon,
  DollarSignIcon,
  ClockIcon,
  UsersIcon,
  ShieldAlertIcon
} from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  loading?: boolean;
}

function MetricCard({ title, value, change, changeType = 'neutral', icon, loading }: MetricCardProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {loading ? '...' : value}
          </p>
          {change !== undefined && !loading && (
            <div className={`flex items-center mt-1 text-sm ${
              changeType === 'positive' ? 'text-green-600' :
              changeType === 'negative' ? 'text-red-600' :
              'text-gray-600'
            }`}>
              {changeType === 'positive' ? <TrendingUpIcon className="w-4 h-4 mr-1" /> :
               changeType === 'negative' ? <TrendingDownIcon className="w-4 h-4 mr-1" /> : null}
              {Math.abs(change)}%
            </div>
          )}
        </div>
        <div className="text-gray-400">
          {icon}
        </div>
      </div>
    </Card>
  );
}

interface AlertCardProps {
  alert: any;
  onAcknowledge: (id: string) => void;
}

function AlertCard({ alert, onAcknowledge }: AlertCardProps) {
  const severityColors = {
    low: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
  };

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <AlertTriangleIcon className={`w-5 h-5 mt-0.5 ${
            alert.severity === 'critical' ? 'text-red-500' :
            alert.severity === 'high' ? 'text-orange-500' :
            alert.severity === 'medium' ? 'text-yellow-500' :
            'text-blue-500'
          }`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <Badge className={severityColors[alert.severity as keyof typeof severityColors]}>
                {alert.severity.toUpperCase()}
              </Badge>
              <Badge variant="outline">
                {alert.type.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              {alert.title}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {alert.message}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              {new Date(alert.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onAcknowledge(alert.id)}
          className="ml-4"
        >
          <CheckCircleIcon className="w-4 h-4 mr-1" />
          Acknowledge
        </Button>
      </div>
    </Card>
  );
}

interface AnomalyIndicatorProps {
  anomalies: any;
  onRefresh: () => void;
  loading: boolean;
}

function AnomalyIndicator({ anomalies, onRefresh, loading }: AnomalyIndicatorProps) {
  if (!anomalies) return null;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Anomaly Detection
        </h3>
        <Button
          size="sm"
          variant="outline"
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCwIcon className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          {anomalies.isAnomaly ? (
            <ShieldAlertIcon className="w-5 h-5 text-red-500" />
          ) : (
            <CheckCircleIcon className="w-5 h-5 text-green-500" />
          )}
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {anomalies.isAnomaly ? 'Anomaly Detected' : 'Normal Activity'}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Confidence: {(anomalies.confidence * 100).toFixed(1)}%
            </p>
          </div>
        </div>

        {anomalies.isAnomaly && anomalies.reasons.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reasons:
            </p>
            <ul className="list-disc list-inside space-y-1">
              {anomalies.reasons.map((reason: string, index: number) => (
                <li key={index} className="text-sm text-gray-600 dark:text-gray-400">
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}

export function PaymentMonitoringDashboard() {
  const [period, setPeriod] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  
  const {
    metrics,
    alerts,
    anomalies,
    loading,
    errors,
    acknowledgeAlert,
    refreshMetrics,
    refreshAlerts,
    runAnomalyDetection,
    isConnected,
    lastUpdate
  } = usePaymentMonitoring({
    autoRefresh: true,
    refreshInterval: 30000,
    realtime: true
  });

  const handlePeriodChange = (newPeriod: '1h' | '24h' | '7d' | '30d') => {
    setPeriod(newPeriod);
    refreshMetrics(newPeriod);
  };

  const handleRefreshAll = async () => {
    await Promise.all([
      refreshMetrics(period),
      refreshAlerts(),
      runAnomalyDetection()
    ]);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Payment Monitoring
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Real-time transaction monitoring and alerts
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Connection Status */}
          <div className="flex items-center space-x-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-gray-600 dark:text-gray-400">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {/* Last Update */}
          {lastUpdate && (
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Last update: {lastUpdate.toLocaleTimeString()}
            </p>
          )}

          {/* Period Selector */}
          <div className="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
            {(['1h', '24h', '7d', '30d'] as const).map((p) => (
              <button
                key={p}
                onClick={() => handlePeriodChange(p)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  period === p
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <Button onClick={handleRefreshAll} variant="outline">
            <RefreshCwIcon className="w-4 h-4 mr-2" />
            Refresh All
          </Button>
        </div>
      </div>

      {/* Error Messages */}
      {(errors.metrics || errors.alerts || errors.anomalies) && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex">
            <AlertTriangleIcon className="w-5 h-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Errors occurred while loading data
              </h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                <ul className="list-disc list-inside space-y-1">
                  {errors.metrics && <li>Metrics: {errors.metrics}</li>}
                  {errors.alerts && <li>Alerts: {errors.alerts}</li>}
                  {errors.anomalies && <li>Anomalies: {errors.anomalies}</li>}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Transactions"
          value={metrics?.totalTransactions.toLocaleString() || '0'}
          icon={<ActivityIcon className="w-8 h-8" />}
          loading={loading.metrics}
        />
        <MetricCard
          title="Success Rate"
          value={`${metrics?.successRate.toFixed(1)}%` || '0%'}
          changeType={metrics && metrics.successRate >= 95 ? 'positive' : 'negative'}
          icon={<CheckCircleIcon className="w-8 h-8" />}
          loading={loading.metrics}
        />
        <MetricCard
          title="Total Volume"
          value={`$${metrics?.totalVolume.toLocaleString()}` || '$0'}
          icon={<DollarSignIcon className="w-8 h-8" />}
          loading={loading.metrics}
        />
        <MetricCard
          title="Avg Response Time"
          value={`${metrics?.averageResponseTime.toFixed(0)}ms` || '0ms'}
          changeType={metrics && metrics.averageResponseTime < 2000 ? 'positive' : 'negative'}
          icon={<ClockIcon className="w-8 h-8" />}
          loading={loading.metrics}
        />
      </div>

      {/* Charts and Detailed Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Transaction Breakdown
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Successful</span>
                <span className="text-sm font-medium text-green-600">
                  {metrics.successfulTransactions} ({metrics.successRate.toFixed(1)}%)
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Failed</span>
                <span className="text-sm font-medium text-red-600">
                  {metrics.failedTransactions} ({metrics.failureRate.toFixed(1)}%)
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Average Amount</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  ${metrics.averageAmount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Peak Volume</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  ${metrics.peakVolume.toLocaleString()}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Top Failure Reasons
            </h3>
            <div className="space-y-3">
              {metrics.topFailureReasons.length > 0 ? (
                metrics.topFailureReasons.map((reason, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400 truncate mr-2">
                      {reason.reason}
                    </span>
                    <span className="text-sm font-medium text-red-600">
                      {reason.count}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-500 text-center py-4">
                  No failure data available
                </p>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Alerts and Anomalies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Alerts */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Active Alerts ({alerts.length})
            </h3>
            <Button size="sm" variant="outline" onClick={refreshAlerts} disabled={loading.alerts}>
              <RefreshCwIcon className={`w-4 h-4 mr-1 ${loading.alerts ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {loading.alerts ? (
              <Card className="p-6 text-center">
                <ActivityIcon className="w-6 h-6 animate-spin mx-auto mb-2" />
                <p className="text-gray-600 dark:text-gray-400">Loading alerts...</p>
              </Card>
            ) : alerts.length > 0 ? (
              alerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onAcknowledge={acknowledgeAlert}
                />
              ))
            ) : (
              <Card className="p-6 text-center">
                <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-2" />
                <p className="text-gray-600 dark:text-gray-400">No active alerts</p>
              </Card>
            )}
          </div>
        </div>

        {/* Anomaly Detection */}
        <AnomalyIndicator
          anomalies={anomalies}
          onRefresh={runAnomalyDetection}
          loading={loading.anomalies}
        />
      </div>
    </div>
  );
}