'use client';

import React from 'react';
import AdminLayout from '@/components/Admin/Layout/AdminLayout';
import KPICard from '@/components/Admin/Cards/KPICard';
import AdminLineChart from '@/components/Admin/Charts/LineChart';
import AdminBarChart from '@/components/Admin/Charts/BarChart';
import AdminPieChart from '@/components/Admin/Charts/PieChart';
import {
  Users,
  CreditCard,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  Activity,
  Globe,
} from 'lucide-react';

// Mock data
const revenueData = [
  { name: 'Ene', value: 45000 },
  { name: 'Feb', value: 52000 },
  { name: 'Mar', value: 48000 },
  { name: 'Abr', value: 61000 },
  { name: 'May', value: 55000 },
  { name: 'Jun', value: 67000 },
];

const transactionData = [
  { name: 'Lun', value: 120 },
  { name: 'Mar', value: 195 },
  { name: 'Mié', value: 234 },
  { name: 'Jue', value: 167 },
  { name: 'Vie', value: 289 },
  { name: 'Sáb', value: 156 },
  { name: 'Dom', value: 98 },
];

const paymentMethodsData = [
  { name: 'Face ID', value: 45, color: '#3B82F6' },
  { name: 'Tarjeta', value: 30, color: '#10B981' },
  { name: 'PayPal', value: 15, color: '#F59E0B' },
  { name: 'Crypto', value: 10, color: '#EF4444' },
];

const recentTransactions = [
  {
    id: 1,
    user: 'Juan Pérez',
    amount: '$125.00',
    method: 'Face ID',
    status: 'Completado',
    time: 'Hace 2 min',
  },
  {
    id: 2,
    user: 'María García',
    amount: '$89.50',
    method: 'Tarjeta',
    status: 'Completado',
    time: 'Hace 5 min',
  },
  {
    id: 3,
    user: 'Carlos López',
    amount: '$234.75',
    method: 'Face ID',
    status: 'Pendiente',
    time: 'Hace 8 min',
  },
  {
    id: 4,
    user: 'Ana Rodríguez',
    amount: '$67.25',
    method: 'PayPal',
    status: 'Completado',
    time: 'Hace 12 min',
  },
];

export default function AdminDashboard() {
  return (
    <AdminLayout 
      title="Dashboard" 
      description="Resumen general del sistema FacePay"
    >
      <div className="p-6 space-y-6">
        {/* KPIs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Usuarios Totales"
            value="12,847"
            change="+12.5% vs mes anterior"
            changeType="positive"
            icon={Users}
            variant="users"
          />
          <KPICard
            title="Transacciones Hoy"
            value="1,259"
            change="+8.2% vs ayer"
            changeType="positive"
            icon={CreditCard}
            variant="success"
          />
          <KPICard
            title="Ingresos del Mes"
            value="$387,450"
            change="+15.3% vs mes anterior"
            changeType="positive"
            icon={DollarSign}
            variant="warning"
          />
          <KPICard
            title="Tasa de Éxito"
            value="98.7%"
            change="+0.8% vs mes anterior"
            changeType="positive"
            icon={TrendingUp}
            variant="transactions"
          />
        </div>

        {/* Security KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KPICard
            title="Intentos de Fraude Bloqueados"
            value="45"
            change="-23% vs mes anterior"
            changeType="positive"
            icon={ShieldCheck}
            variant="error"
          />
          <KPICard
            title="Alertas de Seguridad"
            value="12"
            change="+2 desde ayer"
            changeType="negative"
            icon={AlertTriangle}
            variant="warning"
          />
          <KPICard
            title="Uptime del Sistema"
            value="99.9%"
            change="Sin cambios"
            changeType="neutral"
            icon={Activity}
            variant="success"
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AdminLineChart
            data={revenueData}
            title="Ingresos Mensuales"
            color="#3B82F6"
            height={300}
          />
          <AdminBarChart
            data={transactionData}
            title="Transacciones por Día"
            color="#10B981"
            height={300}
          />
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Payment Methods Chart */}
          <div className="lg:col-span-1">
            <AdminPieChart
              data={paymentMethodsData}
              title="Métodos de Pago"
              height={300}
            />
          </div>

          {/* Recent Transactions */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Transacciones Recientes
                </h3>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {transaction.user}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {transaction.method} • {transaction.time}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {transaction.amount}
                        </p>
                        <p className={`text-sm ${
                          transaction.status === 'Completado'
                            ? 'text-green-600 dark:text-green-400'
                            : transaction.status === 'Pendiente'
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {transaction.status}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                <a
                  href="/admin/transactions"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500"
                >
                  Ver todas las transacciones →
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Estado del Sistema
            </h3>
          </div>
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center">
                <div className="h-3 w-3 bg-green-500 rounded-full mr-3"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">API Gateway</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Operativo</p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="h-3 w-3 bg-green-500 rounded-full mr-3"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Base de Datos</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Operativo</p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="h-3 w-3 bg-yellow-500 rounded-full mr-3"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Reconocimiento Facial</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Degradado</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}