'use client';

import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  TrendingUp, 
  AlertTriangle, 
  Filter, 
  Search, 
  RefreshCw,
  Eye,
  RotateCcw,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Download
} from 'lucide-react';
import AdminLayout from '@/components/Admin/Layout/AdminLayout';
import SimpleBarChart from '@/components/Admin/Charts/SimpleBarChart';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// Types
interface PaymentMetrics {
  totalToday: number;
  totalWeek: number;
  totalMonth: number;
  successRate: number;
  transactionsPerHour: Array<{ hour: string; count: number }>;
  topMerchants: Array<{ name: string; amount: number; transactions: number }>;
}

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  status: 'success' | 'pending' | 'failed' | 'refunded';
  merchantName: string;
  userEmail: string;
  createdAt: string;
  paymentMethod: string;
  description?: string;
}

interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  status: 'active' | 'resolved';
}

// Mock data generators
const generateMockMetrics = (): PaymentMetrics => ({
  totalToday: 125430.50,
  totalWeek: 789234.75,
  totalMonth: 3456789.25,
  successRate: 97.8,
  transactionsPerHour: Array.from({ length: 24 }, (_, i) => ({
    hour: `${i.toString().padStart(2, '0')}:00`,
    count: Math.floor(Math.random() * 100) + 10
  })),
  topMerchants: [
    { name: 'Tienda Online SA', amount: 45230.50, transactions: 234 },
    { name: 'Restaurant El Buen Sabor', amount: 38750.25, transactions: 156 },
    { name: 'Tech Store MX', amount: 32140.75, transactions: 89 },
    { name: 'Fashion Boutique', amount: 28900.00, transactions: 145 },
    { name: 'Grocery Super', amount: 25680.30, transactions: 298 }
  ]
});

const generateMockTransactions = (): Transaction[] => 
  Array.from({ length: 50 }, (_, i) => ({
    id: `tx_${Date.now()}_${i}`,
    amount: Math.floor(Math.random() * 5000) + 100,
    currency: 'MXN',
    status: ['success', 'pending', 'failed', 'refunded'][Math.floor(Math.random() * 4)] as Transaction['status'],
    merchantName: ['Tienda Online SA', 'Restaurant El Buen Sabor', 'Tech Store MX', 'Fashion Boutique'][Math.floor(Math.random() * 4)],
    userEmail: `user${i}@example.com`,
    createdAt: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
    paymentMethod: ['Tarjeta de Crédito', 'Tarjeta de Débito', 'SPEI', 'Efectivo'][Math.floor(Math.random() * 4)],
    description: `Pago #${1000 + i}`
  }));

const generateMockAlerts = (): Alert[] => [
  {
    id: '1',
    type: 'error',
    title: 'Falla en Gateway de Pagos',
    message: 'El gateway de Stripe está reportando errores intermitentes',
    timestamp: new Date(Date.now() - 300000).toISOString(),
    status: 'active'
  },
  {
    id: '2',
    type: 'warning',
    title: 'Alta tasa de rechazos',
    message: 'La tasa de rechazos ha aumentado un 15% en la última hora',
    timestamp: new Date(Date.now() - 600000).toISOString(),
    status: 'active'
  },
  {
    id: '3',
    type: 'info',
    title: 'Mantenimiento programado',
    message: 'Mantenimiento del sistema programado para mañana a las 02:00 AM',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    status: 'active'
  }
];

export default function PaymentsAdminPage() {
  const [metrics, setMetrics] = useState<PaymentMetrics>(generateMockMetrics());
  const [transactions, setTransactions] = useState<Transaction[]>(generateMockTransactions());
  const [alerts, setAlerts] = useState<Alert[]>(generateMockAlerts());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  // Filter transactions
  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = tx.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tx.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tx.merchantName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || tx.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

  const formatDate = (dateString: string) => 
    new Date(dateString).toLocaleString('es-MX');

  const getStatusBadge = (status: Transaction['status']) => {
    const variants = {
      success: 'bg-green-100 text-green-800 border-green-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      failed: 'bg-red-100 text-red-800 border-red-200',
      refunded: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    
    const labels = {
      success: 'Exitoso',
      pending: 'Pendiente',
      failed: 'Fallido',
      refunded: 'Reembolsado'
    };

    return (
      <Badge className={`${variants[status]} border font-medium`}>
        {labels[status]}
      </Badge>
    );
  };

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'error': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'info': return <CheckCircle className="h-5 w-5 text-blue-500" />;
      default: return <CheckCircle className="h-5 w-5 text-blue-500" />;
    }
  };

  const handleRefund = async (transactionId: string) => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/payments/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId })
      });
      
      if (response.ok) {
        // Update transaction status
        setTransactions(prev => 
          prev.map(tx => tx.id === transactionId ? { ...tx, status: 'refunded' } : tx)
        );
      }
    } catch (error) {
      console.error('Error processing refund:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (transactionId: string) => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/payments/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId })
      });
      
      if (response.ok) {
        // Update transaction status
        setTransactions(prev => 
          prev.map(tx => tx.id === transactionId ? { ...tx, status: 'pending' } : tx)
        );
      }
    } catch (error) {
      console.error('Error retrying payment:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setLoading(true);
    // Simulate API calls
    await new Promise(resolve => setTimeout(resolve, 1000));
    setMetrics(generateMockMetrics());
    setTransactions(generateMockTransactions());
    setAlerts(generateMockAlerts());
    setLoading(false);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(generateMockMetrics());
    }, 30000); // Refresh metrics every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <AdminLayout 
      title="Dashboard de Pagos" 
      description="Monitoreo en tiempo real de transacciones y métricas de pago"
    >
      <div className="space-y-8">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <Button 
              onClick={refreshData} 
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <Button variant="outline" className="border-gray-300 hover:bg-gray-50">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Alerts Section */}
        {alerts.filter(a => a.status === 'active').length > 0 && (
          <Card className="p-6 border-l-4 border-l-orange-400 bg-orange-50/50 backdrop-blur-sm">
            <div className="flex items-start space-x-4">
              <AlertTriangle className="h-6 w-6 text-orange-500 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-3">Alertas Activas</h3>
                <div className="space-y-2">
                  {alerts.filter(a => a.status === 'active').map((alert) => (
                    <div key={alert.id} className="flex items-start space-x-3 p-3 bg-white/60 rounded-lg">
                      {getAlertIcon(alert.type)}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">{alert.title}</p>
                        <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDate(alert.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200/50 backdrop-blur-sm">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-600 rounded-lg">
                <DollarSign className="h-8 w-8 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-700">Hoy</p>
                <p className="text-2xl font-bold text-blue-900">{formatCurrency(metrics.totalToday)}</p>
                <p className="text-xs text-blue-600 flex items-center mt-1">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  +12.5% vs ayer
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100/50 border-green-200/50 backdrop-blur-sm">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-600 rounded-lg">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-700">Esta Semana</p>
                <p className="text-2xl font-bold text-green-900">{formatCurrency(metrics.totalWeek)}</p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  +8.3% vs sem. anterior
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200/50 backdrop-blur-sm">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-purple-600 rounded-lg">
                <Clock className="h-8 w-8 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-purple-700">Este Mes</p>
                <p className="text-2xl font-bold text-purple-900">{formatCurrency(metrics.totalMonth)}</p>
                <p className="text-xs text-purple-600 flex items-center mt-1">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  +15.7% vs mes anterior
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-200/50 backdrop-blur-sm">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-orange-600 rounded-lg">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-orange-700">Tasa de Éxito</p>
                <p className="text-2xl font-bold text-orange-900">{metrics.successRate}%</p>
                <p className="text-xs text-orange-600 flex items-center mt-1">
                  <ArrowDownRight className="h-3 w-3 mr-1" />
                  -0.2% vs ayer
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 backdrop-blur-sm bg-white/80">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Transacciones por Hora</h3>
            <div className="h-64">
              <SimpleBarChart 
                data={metrics.transactionsPerHour}
                xAxisKey="hour"
                dataKey="count"
                color="#3b82f6"
                height={250}
                showGrid={true}
              />
            </div>
          </Card>

          <Card className="p-6 backdrop-blur-sm bg-white/80">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Merchants</h3>
            <div className="space-y-4">
              {metrics.topMerchants.slice(0, 5).map((merchant, index) => (
                <div key={merchant.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{merchant.name}</p>
                      <p className="text-sm text-gray-600">{merchant.transactions} transacciones</p>
                    </div>
                  </div>
                  <p className="font-bold text-gray-900">{formatCurrency(merchant.amount)}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Transactions Table */}
        <Card className="backdrop-blur-sm bg-white/80">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h3 className="text-lg font-semibold text-gray-900">Transacciones Recientes</h3>
              
              {/* Search and Filter */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por ID, email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Todos los estados</option>
                  <option value="success">Exitoso</option>
                  <option value="pending">Pendiente</option>
                  <option value="failed">Fallido</option>
                  <option value="refunded">Reembolsado</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transacción
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Comercio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransactions.slice(0, 20).map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <p className="text-sm font-medium text-gray-900">{transaction.id}</p>
                        <p className="text-xs text-gray-500">{transaction.paymentMethod}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm font-medium text-gray-900">
                        {formatCurrency(transaction.amount)}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(transaction.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm text-gray-900">{transaction.merchantName}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm text-gray-900">{transaction.userEmail}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm text-gray-900">{formatDate(transaction.createdAt)}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <Button size="sm" variant="outline" className="h-8">
                        <Eye className="h-3 w-3" />
                      </Button>
                      {transaction.status === 'success' && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleRefund(transaction.id)}
                          disabled={loading}
                          className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      )}
                      {transaction.status === 'failed' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleRetry(transaction.id)}
                          disabled={loading}
                          className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}