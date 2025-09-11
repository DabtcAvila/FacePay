/**
 * Merchant Dashboard - Main Page
 * Multi-tenant analytics and overview for merchants
 */

'use client';

import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CreditCard, 
  Users, 
  AlertTriangle,
  Activity,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface DashboardData {
  merchant: {
    id: string;
    companyName: string;
    plan: string;
    kycStatus: string;
    testMode: boolean;
    isLive: boolean;
  };
  metrics: {
    period: string;
    dateRange: {
      start: string;
      end: string;
    };
    transactions: {
      total: number;
      successful: number;
      failed: number;
      successRate: number;
      volume: number;
      averageAmount: number;
    };
    revenue: {
      gross: number;
      fees: number;
      net: number;
      platformFees: number;
    };
    users: {
      total: number;
      new: number;
      active: number;
    };
    errors: {
      total: number;
      critical: number;
    };
    webhooks: {
      total: number;
      successful: number;
      failed: number;
      successRate: number;
    };
  };
  insights: {
    topPaymentMethods: Array<{
      type: string;
      provider: string;
      count: number;
      volume: number;
    }>;
    recentActivity: Array<{
      id: string;
      amount: number;
      currency: string;
      status: string;
      description: string;
      createdAt: string;
      user: {
        email: string;
        name?: string;
      };
      paymentMethod: {
        type: string;
        provider: string;
      };
    }>;
  };
  comparison?: {
    period: string;
    transactions: any;
    growth: {
      transactions: number;
      volume: number;
      successRate: number;
    };
  };
}

export default function MerchantDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');
  const [includeComparison, setIncludeComparison] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [period, includeComparison]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        period,
        includeComparison: includeComparison.toString()
      });
      
      const response = await fetch(`/api/merchants/dashboard?${params}`);
      if (response.ok) {
        const dashboardData = await response.json();
        setData(dashboardData);
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load dashboard</h3>
          <p className="text-gray-600 mb-4">There was an error loading your dashboard data.</p>
          <button
            onClick={loadDashboardData}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {data.merchant.companyName}
            </h1>
            <p className="text-gray-600 mt-1">
              Here's what's happening with your business
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Last Year</option>
            </select>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={includeComparison}
                onChange={(e) => setIncludeComparison(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="ml-2 text-sm text-gray-700">Compare periods</span>
            </label>
          </div>
        </div>
        
        {/* Status alerts */}
        {!data.merchant.isLive && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Account Setup Incomplete
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>Complete your KYC verification to start accepting live payments.</p>
                </div>
                <div className="mt-3">
                  <button className="text-sm font-medium text-yellow-800 hover:text-yellow-900">
                    Complete verification →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(data.metrics.revenue.gross)}
          change={data.comparison?.growth.volume}
          icon={DollarSign}
          trend={data.comparison && data.comparison.growth.volume > 0 ? 'up' : 'down'}
        />
        
        <MetricCard
          title="Transactions"
          value={data.metrics.transactions.total.toLocaleString()}
          change={data.comparison?.growth.transactions}
          icon={CreditCard}
          trend={data.comparison && data.comparison.growth.transactions > 0 ? 'up' : 'down'}
        />
        
        <MetricCard
          title="Success Rate"
          value={`${data.metrics.transactions.successRate.toFixed(1)}%`}
          change={data.comparison?.growth.successRate}
          icon={CheckCircle}
          trend={data.comparison && data.comparison.growth.successRate > 0 ? 'up' : 'down'}
        />
        
        <MetricCard
          title="Active Users"
          value={data.metrics.users.active.toLocaleString()}
          change={undefined}
          icon={Users}
        />
      </div>

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Transactions</h3>
          </div>
          
          <div className="overflow-hidden">
            <div className="divide-y divide-gray-200">
              {data.insights.recentActivity.slice(0, 5).map((transaction) => (
                <div key={transaction.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`flex-shrink-0 h-2.5 w-2.5 rounded-full ${
                      transaction.status === 'completed' 
                        ? 'bg-green-400' 
                        : transaction.status === 'failed'
                        ? 'bg-red-400'
                        : 'bg-yellow-400'
                    }`} />
                    
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(transaction.amount)} {transaction.currency}
                      </div>
                      <div className="text-sm text-gray-500">
                        {transaction.user.name || transaction.user.email}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm text-gray-900">
                      {transaction.paymentMethod.type}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(transaction.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="px-6 py-3 bg-gray-50 text-right">
            <button className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
              View all transactions →
            </button>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Payment Methods</h3>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              {data.insights.topPaymentMethods.map((method, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900 capitalize">
                      {method.type} ({method.provider})
                    </div>
                    <div className="text-sm text-gray-500">
                      {method.count} transactions
                    </div>
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    {formatCurrency(method.volume)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="mt-8 bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">System Health</h3>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="flex items-center justify-center">
                <Activity className="h-8 w-8 text-green-500" />
              </div>
              <div className="mt-2">
                <div className="text-sm font-medium text-gray-900">API Status</div>
                <div className="text-sm text-green-600">Operational</div>
              </div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center">
                <Clock className="h-8 w-8 text-blue-500" />
              </div>
              <div className="mt-2">
                <div className="text-sm font-medium text-gray-900">Webhook Success</div>
                <div className="text-sm text-gray-600">
                  {data.metrics.webhooks.successRate.toFixed(1)}%
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center">
                {data.metrics.errors.critical > 0 ? (
                  <XCircle className="h-8 w-8 text-red-500" />
                ) : (
                  <CheckCircle className="h-8 w-8 text-green-500" />
                )}
              </div>
              <div className="mt-2">
                <div className="text-sm font-medium text-gray-900">Error Rate</div>
                <div className={`text-sm ${data.metrics.errors.critical > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {data.metrics.errors.total} errors
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  change?: number;
  icon: React.ComponentType<any>;
  trend?: 'up' | 'down';
}

function MetricCard({ title, value, change, icon: Icon, trend }: MetricCardProps) {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Icon className="h-6 w-6 text-gray-400" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd className="flex items-baseline">
                <div className="text-2xl font-semibold text-gray-900">{value}</div>
                {change !== undefined && (
                  <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                    trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {trend === 'up' ? (
                      <TrendingUp className="self-center flex-shrink-0 h-4 w-4" />
                    ) : (
                      <TrendingDown className="self-center flex-shrink-0 h-4 w-4" />
                    )}
                    <span className="ml-1">{Math.abs(change).toFixed(1)}%</span>
                  </div>
                )}
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatCurrency(amount: number, currency: string = 'MXN'): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  }).format(amount / 100); // Assuming amounts are stored in cents
}