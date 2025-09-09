'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// Analytics Dashboard Types
interface AnalyticsDashboardData {
  events: any[];
  aggregated: {
    eventCounts: { eventName: string; count: number }[];
    uniqueUsers: number;
    uniqueSessions: number;
    topPages: { url: string; views: number }[];
    conversions: {
      total: number;
      totalValue: number;
      averageValue: number;
    };
    biometricSuccessRates: {
      method: string;
      successRate: number;
      totalAttempts: number;
      successfulAttempts: number;
    }[];
    hourlyDistribution: { hour: number; count: number }[];
  };
  timeRange: string;
  totalEvents: number;
}

interface ErrorData {
  errors: any[];
  statistics: {
    errorsBySeverity: { severity: string; count: number }[];
    topErrors: { fingerprint: string; count: number; message: string }[];
    errorsByUrl: { url: string; count: number }[];
    affectedUsersCount: number;
  };
}

interface PerformanceData {
  statistics: {
    webVitals: Record<string, { average: number; min: number; max: number; count: number }>;
    averageMetrics: { name: string; average: number; count: number }[];
    performanceByUrl: { url: string; metrics: any }[];
    devicePerformance: { platform: string; averageLoadTime: number; sampleCount: number }[];
  };
}

interface AlertData {
  alerts: Array<{
    id: string;
    type: string;
    message: string;
    severity: string;
    timestamp: string;
    resolved: boolean;
  }>;
  statistics: {
    alertsBySeverity: { severity: string; count: number }[];
    resolutionStats: { resolved: number; unresolved: number };
  };
}

const AnalyticsDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'performance' | 'errors' | 'alerts'>('analytics');
  const [timeRange, setTimeRange] = useState('24h');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    analytics?: AnalyticsDashboardData;
    errors?: ErrorData;
    performance?: PerformanceData;
    alerts?: AlertData;
  }>({});

  useEffect(() => {
    loadData();
  }, [timeRange, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const endpoints = {
        analytics: `/api/analytics?timeRange=${timeRange}&limit=100`,
        errors: `/api/monitoring/errors?timeRange=${timeRange}`,
        performance: `/api/monitoring/performance?timeRange=${timeRange}`,
        alerts: `/api/monitoring/alerts?timeRange=${timeRange}`
      };

      const response = await fetch(endpoints[activeTab]);
      if (response.ok) {
        const result = await response.json();
        setData(prev => ({ ...prev, [activeTab]: result.data }));
      }
    } catch (error) {
      console.error(`Failed to load ${activeTab} data:`, error);
    } finally {
      setLoading(false);
    }
  };

  const timeRangeOptions = [
    { value: '1h', label: 'Last Hour' },
    { value: '24h', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      case 'info': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const TabButton: React.FC<{ tab: string; label: string; isActive: boolean }> = ({ tab, label, isActive }) => (
    <Button
      variant={isActive ? "default" : "outline"}
      onClick={() => setActiveTab(tab as any)}
      className={`px-6 py-2 ${isActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
    >
      {label}
    </Button>
  );

  const renderAnalyticsTab = () => {
    const analytics = data.analytics;
    if (!analytics) return <div>Loading analytics data...</div>;

    return (
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(analytics.totalEvents)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Unique Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(analytics.aggregated.uniqueUsers)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(analytics.aggregated.uniqueSessions)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Conversion Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(analytics.aggregated.conversions.totalValue)}</div>
              <div className="text-sm text-gray-500">{analytics.aggregated.conversions.total} conversions</div>
            </CardContent>
          </Card>
        </div>

        {/* Top Events */}
        <Card>
          <CardHeader>
            <CardTitle>Top Events</CardTitle>
            <CardDescription>Most frequent events in the selected time range</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.aggregated.eventCounts.slice(0, 10).map((event, index) => (
                <div key={event.eventName} className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                      #{index + 1}
                    </span>
                    <span className="font-medium">{event.eventName}</span>
                  </div>
                  <span className="text-sm text-gray-600">{formatNumber(event.count)} events</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Biometric Success Rates */}
        {analytics.aggregated.biometricSuccessRates.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Biometric Authentication</CardTitle>
              <CardDescription>Success rates by authentication method</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.aggregated.biometricSuccessRates.map((method) => (
                  <div key={method.method} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="font-medium capitalize">{method.method.replace('_', ' ')}</span>
                      <Badge variant={method.successRate >= 95 ? "default" : method.successRate >= 80 ? "secondary" : "destructive"}>
                        {method.successRate.toFixed(1)}% success
                      </Badge>
                    </div>
                    <span className="text-sm text-gray-600">
                      {method.successfulAttempts}/{method.totalAttempts} attempts
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Pages */}
        <Card>
          <CardHeader>
            <CardTitle>Top Pages</CardTitle>
            <CardDescription>Most visited pages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.aggregated.topPages.slice(0, 8).map((page, index) => (
                <div key={page.url} className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                      #{index + 1}
                    </span>
                    <span className="font-medium text-sm truncate max-w-md">{page.url}</span>
                  </div>
                  <span className="text-sm text-gray-600">{formatNumber(page.views)} views</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderErrorsTab = () => {
    const errors = data.errors;
    if (!errors) return <div>Loading error data...</div>;

    return (
      <div className="space-y-6">
        {/* Error Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Errors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{errors.errors.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Affected Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{errors.statistics.affectedUsersCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Unique Errors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{errors.statistics.topErrors.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Errors by Severity */}
        <Card>
          <CardHeader>
            <CardTitle>Errors by Severity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {errors.statistics.errorsBySeverity.map((severity) => (
                <div key={severity.severity} className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-3">
                    <Badge className={getSeverityColor(severity.severity)}>
                      {severity.severity}
                    </Badge>
                  </div>
                  <span className="text-sm font-medium">{formatNumber(severity.count)} errors</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Errors */}
        <Card>
          <CardHeader>
            <CardTitle>Most Frequent Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {errors.statistics.topErrors.slice(0, 10).map((error, index) => (
                <div key={error.fingerprint} className="border-l-4 border-red-400 pl-4 py-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm text-red-800">
                        {error.message}
                      </div>
                    </div>
                    <Badge variant="outline" className="ml-4">
                      {error.count} occurrences
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderPerformanceTab = () => {
    const performance = data.performance;
    if (!performance) return <div>Loading performance data...</div>;

    return (
      <div className="space-y-6">
        {/* Web Vitals */}
        <Card>
          <CardHeader>
            <CardTitle>Web Vitals</CardTitle>
            <CardDescription>Core performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Object.entries(performance.statistics.webVitals || {}).map(([name, data]) => (
                <div key={name} className="text-center">
                  <div className="text-lg font-bold">
                    {name === 'CLS' ? data.average.toFixed(3) : Math.round(data.average)}
                    {name === 'CLS' ? '' : 'ms'}
                  </div>
                  <div className="text-sm text-gray-600">{name}</div>
                  <div className="text-xs text-gray-500">
                    {data.count} samples
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Performance by Device */}
        {performance.statistics.devicePerformance?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Performance by Device</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {performance.statistics.devicePerformance.map((device) => (
                  <div key={device.platform} className="flex items-center justify-between py-2">
                    <div className="flex items-center space-x-3">
                      <span className="font-medium">{device.platform}</span>
                      <span className="text-sm text-gray-500">({device.sampleCount} samples)</span>
                    </div>
                    <span className="font-mono text-sm">
                      {Math.round(device.averageLoadTime)}ms
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Performing Pages */}
        <Card>
          <CardHeader>
            <CardTitle>Performance by Page</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {performance.statistics.performanceByUrl?.slice(0, 10).map((page, index) => (
                <div key={page.url} className="py-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm truncate max-w-md">{page.url}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-xs">
                    {Object.entries(page.metrics).map(([metric, data]: [string, any]) => (
                      <div key={metric} className="text-center">
                        <div className="font-mono">{Math.round(data.average)}ms</div>
                        <div className="text-gray-500">{metric.replace('web_vital_', '').toUpperCase()}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderAlertsTab = () => {
    const alerts = data.alerts;
    if (!alerts) return <div>Loading alerts data...</div>;

    const unresolvedAlerts = alerts.alerts.filter(alert => !alert.resolved);
    const resolvedAlerts = alerts.alerts.filter(alert => alert.resolved);

    return (
      <div className="space-y-6">
        {/* Alert Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Active Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{unresolvedAlerts.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Resolved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{resolvedAlerts.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Resolution Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {alerts.alerts.length > 0 ? Math.round((resolvedAlerts.length / alerts.alerts.length) * 100) : 0}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Alerts */}
        {unresolvedAlerts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>Active Alerts</span>
                <Badge variant="destructive">{unresolvedAlerts.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {unresolvedAlerts.slice(0, 10).map((alert) => (
                  <div key={alert.id} className="border-l-4 border-red-400 pl-4 py-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <Badge className={getSeverityColor(alert.severity)}>
                            {alert.severity}
                          </Badge>
                          <Badge variant="outline">
                            {alert.type}
                          </Badge>
                        </div>
                        <div className="font-medium text-sm">
                          {alert.message}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(alert.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          // In a real app, this would call the resolve alert API
                          console.log('Resolve alert:', alert.id);
                        }}
                      >
                        Resolve
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Alerts by Severity */}
        <Card>
          <CardHeader>
            <CardTitle>Alerts by Severity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.statistics.alertsBySeverity.map((severity) => (
                <div key={severity.severity} className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-3">
                    <Badge className={getSeverityColor(severity.severity)}>
                      {severity.severity}
                    </Badge>
                  </div>
                  <span className="text-sm font-medium">{formatNumber(severity.count)} alerts</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
        <p className="text-gray-600">Monitor your application's performance, errors, and user behavior</p>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-8 bg-white p-4 rounded-lg shadow">
        <div className="flex space-x-2">
          <TabButton tab="analytics" label="Analytics" isActive={activeTab === 'analytics'} />
          <TabButton tab="performance" label="Performance" isActive={activeTab === 'performance'} />
          <TabButton tab="errors" label="Errors" isActive={activeTab === 'errors'} />
          <TabButton tab="alerts" label="Alerts" isActive={activeTab === 'alerts'} />
        </div>

        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            {timeRangeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <Button onClick={loadData} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-gray-50 min-h-screen -mx-6 -mb-6 px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-gray-600">Loading {activeTab} data...</div>
          </div>
        ) : (
          <>
            {activeTab === 'analytics' && renderAnalyticsTab()}
            {activeTab === 'performance' && renderPerformanceTab()}
            {activeTab === 'errors' && renderErrorsTab()}
            {activeTab === 'alerts' && renderAlertsTab()}
          </>
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;