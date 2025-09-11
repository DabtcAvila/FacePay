'use client';

import React, { useState } from 'react';
import AdminLayout from '@/components/Admin/Layout/AdminLayout';
import KPICard from '@/components/Admin/Cards/KPICard';
import AdminLineChart from '@/components/Admin/Charts/LineChart';
import AdminBarChart from '@/components/Admin/Charts/BarChart';
import AdminPieChart from '@/components/Admin/Charts/PieChart';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  CreditCard,
  DollarSign,
  Globe,
  Smartphone,
  Monitor,
  Calendar,
  Filter,
  Clock
} from 'lucide-react';

// Mock data
const revenueGrowthData = [
  { name: 'Ene', value: 45000, users: 1200 },
  { name: 'Feb', value: 52000, users: 1350 },
  { name: 'Mar', value: 48000, users: 1280 },
  { name: 'Abr', value: 61000, users: 1520 },
  { name: 'May', value: 55000, users: 1400 },
  { name: 'Jun', value: 67000, users: 1680 },
  { name: 'Jul', value: 73000, users: 1820 },
  { name: 'Ago', value: 69000, users: 1750 },
  { name: 'Sep', value: 78000, users: 1950 },
  { name: 'Oct', value: 84000, users: 2100 },
  { name: 'Nov', value: 91000, users: 2280 },
  { name: 'Dic', value: 97000, users: 2450 },
];

const userAcquisitionData = [
  { name: 'Orgánico', value: 45 },
  { name: 'Redes sociales', value: 28 },
  { name: 'Referidos', value: 15 },
  { name: 'Publicidad pagada', value: 8 },
  { name: 'Email marketing', value: 4 },
];

const deviceUsageData = [
  { name: 'Móvil', value: 68 },
  { name: 'Escritorio', value: 22 },
  { name: 'Tablet', value: 10 },
];

const transactionsByHourData = [
  { name: '0h', value: 12 },
  { name: '4h', value: 8 },
  { name: '8h', value: 45 },
  { name: '12h', value: 89 },
  { name: '16h', value: 156 },
  { name: '20h', value: 134 },
];

const paymentMethodsData = [
  { name: 'Face ID', value: 152, color: '#3B82F6' },
  { name: 'Tarjeta de crédito', value: 98, color: '#10B981' },
  { name: 'PayPal', value: 45, color: '#F59E0B' },
  { name: 'Transferencia', value: 23, color: '#EF4444' },
  { name: 'Crypto', value: 12, color: '#8B5CF6' },
];

const geographicData = [
  { name: 'Madrid', value: 234 },
  { name: 'Barcelona', value: 189 },
  { name: 'Valencia', value: 98 },
  { name: 'Sevilla', value: 76 },
  { name: 'Bilbao', value: 54 },
  { name: 'Málaga', value: 43 },
];

const cohortData = [
  { name: 'Semana 1', retention: 100, users: 1000, value: 100 },
  { name: 'Semana 2', retention: 65, users: 650, value: 65 },
  { name: 'Semana 3', retention: 45, users: 450, value: 45 },
  { name: 'Semana 4', retention: 35, users: 350, value: 35 },
  { name: 'Mes 2', retention: 28, users: 280, value: 28 },
  { name: 'Mes 3', retention: 22, users: 220, value: 22 },
];

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState('30d');
  const [selectedMetric, setSelectedMetric] = useState('revenue');

  const handleDateRangeChange = (range: string) => {
    setDateRange(range);
    // Implement data filtering logic here
  };

  return (
    <AdminLayout
      title="Analytics Detallado"
      description="Análisis profundo del rendimiento y comportamiento del usuario"
    >
      <div className="p-6 space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <Filter className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Filtros:
            </span>
            <select
              value={dateRange}
              onChange={(e) => handleDateRangeChange(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="7d">Últimos 7 días</option>
              <option value="30d">Últimos 30 días</option>
              <option value="90d">Últimos 90 días</option>
              <option value="1y">Último año</option>
            </select>
          </div>
          <div className="flex items-center space-x-2 mt-2 sm:mt-0">
            <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Última actualización: Hace 5 minutos
            </span>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Ingresos Totales"
            value="$2.4M"
            change="+23.5% vs mes anterior"
            changeType="positive"
            icon={DollarSign}
            iconColor="text-green-600"
          />
          <KPICard
            title="Usuarios Activos"
            value="15,847"
            change="+12.3% vs mes anterior"
            changeType="positive"
            icon={Users}
            iconColor="text-blue-600"
          />
          <KPICard
            title="Transacciones/Día"
            value="2,156"
            change="+8.7% vs ayer"
            changeType="positive"
            icon={CreditCard}
            iconColor="text-purple-600"
          />
          <KPICard
            title="Tasa de Conversión"
            value="3.24%"
            change="+0.5% vs mes anterior"
            changeType="positive"
            icon={TrendingUp}
            iconColor="text-orange-600"
          />
        </div>

        {/* Revenue and User Growth */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AdminLineChart
            data={revenueGrowthData}
            title="Crecimiento de Ingresos"
            dataKey="value"
            color="#10B981"
            height={350}
          />
          <AdminLineChart
            data={revenueGrowthData}
            title="Crecimiento de Usuarios"
            dataKey="users"
            color="#3B82F6"
            height={350}
          />
        </div>

        {/* User Acquisition and Device Usage */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AdminPieChart
            data={userAcquisitionData}
            title="Canales de Adquisición de Usuarios"
            height={350}
          />
          <AdminPieChart
            data={deviceUsageData}
            title="Uso por Dispositivo"
            height={350}
            colors={['#3B82F6', '#10B981', '#F59E0B']}
          />
        </div>

        {/* Transaction Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AdminBarChart
            data={transactionsByHourData}
            title="Transacciones por Hora del Día"
            color="#6366F1"
            height={350}
          />
          <AdminBarChart
            data={paymentMethodsData}
            title="Métodos de Pago Más Populares"
            color="#8B5CF6"
            height={350}
          />
        </div>

        {/* Geographic Distribution */}
        <AdminBarChart
          data={geographicData}
          title="Distribución Geográfica de Usuarios"
          color="#059669"
          height={350}
        />

        {/* User Retention Analysis */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Análisis de Retención de Usuarios
          </h3>
          <AdminLineChart
            data={cohortData}
            title=""
            dataKey="retention"
            xAxisKey="name"
            color="#EF4444"
            height={300}
          />
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            <p>Retención de usuarios por cohorte - Usuarios que se registraron en enero 2024</p>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KPICard
            title="Tiempo Medio de Sesión"
            value="12m 34s"
            change="+1m 23s vs mes anterior"
            changeType="positive"
            icon={Clock}
            iconColor="text-indigo-600"
          />
          <KPICard
            title="Páginas por Sesión"
            value="4.7"
            change="+0.3 vs mes anterior"
            changeType="positive"
            icon={Monitor}
            iconColor="text-cyan-600"
          />
          <KPICard
            title="Tasa de Rebote"
            value="23.4%"
            change="-2.1% vs mes anterior"
            changeType="positive"
            icon={TrendingUp}
            iconColor="text-emerald-600"
          />
        </div>

        {/* Advanced Analytics Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Merchants */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Comercios con Más Transacciones
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {[
                  { name: 'Coffee Shop Pro', transactions: 1234, revenue: 45670 },
                  { name: 'SuperMarket Plus', transactions: 987, revenue: 38450 },
                  { name: 'Tech Store Premium', transactions: 756, revenue: 89230 },
                  { name: 'Fashion Boutique', transactions: 543, revenue: 23100 },
                  { name: 'Restaurant Deluxe', transactions: 432, revenue: 19850 },
                ].map((merchant, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {merchant.name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {merchant.transactions} transacciones
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        ${merchant.revenue.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Trends */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Tendencias Recientes
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Aumento en pagos con Face ID
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      +34% en los últimos 7 días
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Nuevos registros desde móvil
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      +28% en los últimos 7 días
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="h-2 w-2 bg-yellow-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Tiempo de transacción reducido
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      -15% en promedio
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="h-2 w-2 bg-purple-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Satisfacción del cliente
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      4.8/5 puntuación promedio
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}