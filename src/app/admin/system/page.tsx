'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/Admin/Layout/AdminLayout';
import KPICard from '@/components/Admin/Cards/KPICard';
import {
  Activity,
  Server,
  Database,
  Zap,
  Clock,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';

interface SystemHealth {
  overall: {
    status: 'healthy' | 'warning' | 'degraded' | 'unhealthy';
    responseTime: number;
    timestamp: string;
    uptime: {
      hours: number;
      minutes: number;
      formatted: string;
    };
  };
  services: {
    database: {
      status: 'healthy' | 'slow' | 'degraded' | 'unhealthy';
      latency: number;
      message: string;
    };
    api: {
      status: 'healthy' | 'slow' | 'degraded' | 'unhealthy';
      latency: number;
      message: string;
    };
    faceRecognition: {
      status: 'healthy' | 'slow' | 'degraded' | 'unhealthy';
      latency: number;
      message: string;
    };
  };
  metrics: {
    memory: {
      status: 'healthy' | 'warning' | 'critical';
      used: number;
      total: number;
      percentage: number;
    };
    storage: {
      status: 'healthy' | 'warning' | 'critical';
      used: number;
      total: number;
      percentage: number;
    };
    transactions: {
      status: 'healthy' | 'warning' | 'critical';
      recentCount: number;
      errorRate: number;
      activeUsers: number;
    };
  };
  alerts: Array<{
    level: 'critical' | 'warning';
    message: string;
    service: string;
  }>;
}

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'healthy':
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'warning':
    case 'slow':
    case 'degraded':
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    case 'critical':
    case 'unhealthy':
      return <XCircle className="w-5 h-5 text-red-500" />;
    default:
      return <Clock className="w-5 h-5 text-gray-500" />;
  }
};

const StatusBadge = ({ status }: { status: string }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'healthy':
        return { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', text: 'Saludable' };
      case 'warning':
        return { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', text: 'Advertencia' };
      case 'slow':
        return { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', text: 'Lento' };
      case 'degraded':
        return { color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200', text: 'Degradado' };
      case 'critical':
        return { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', text: 'Crítico' };
      case 'unhealthy':
        return { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', text: 'No saludable' };
      default:
        return { color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200', text: 'Desconocido' };
    }
  };

  const { color, text } = getStatusConfig();
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      <StatusIcon status={status} />
      <span className="ml-1">{text}</span>
    </span>
  );
};

const ServiceCard = ({ 
  title, 
  icon: Icon, 
  status, 
  latency, 
  message 
}: { 
  title: string; 
  icon: any; 
  status: string; 
  latency: number; 
  message: string; 
}) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center">
        <Icon className="w-6 h-6 text-gray-600 dark:text-gray-300 mr-3" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>
      <StatusBadge status={status} />
    </div>
    <div className="space-y-2">
      <div className="flex justify-between">
        <span className="text-sm text-gray-500 dark:text-gray-400">Latencia:</span>
        <span className="text-sm font-medium text-gray-900 dark:text-white">{latency}ms</span>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300">{message}</p>
    </div>
  </div>
);

const MetricCard = ({ 
  title, 
  icon: Icon, 
  status, 
  value, 
  total, 
  percentage, 
  unit 
}: { 
  title: string; 
  icon: any; 
  status: string; 
  value: number; 
  total?: number; 
  percentage?: number; 
  unit: string; 
}) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center">
        <Icon className="w-6 h-6 text-gray-600 dark:text-gray-300 mr-3" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>
      <StatusBadge status={status} />
    </div>
    <div className="space-y-2">
      <div className="flex justify-between">
        <span className="text-sm text-gray-500 dark:text-gray-400">Usado:</span>
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {value.toLocaleString()} {unit}
        </span>
      </div>
      {total && (
        <div className="flex justify-between">
          <span className="text-sm text-gray-500 dark:text-gray-400">Total:</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {total.toLocaleString()} {unit}
          </span>
        </div>
      )}
      {percentage !== undefined && (
        <>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${
                status === 'healthy' ? 'bg-green-500' : 
                status === 'warning' ? 'bg-yellow-500' : 
                'bg-red-500'
              }`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
          <div className="text-right">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {percentage.toFixed(1)}%
            </span>
          </div>
        </>
      )}
    </div>
  </div>
);

export default function SystemPage() {
  const [healthData, setHealthData] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchSystemHealth = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/system/health');
      if (response.ok) {
        const data = await response.json();
        setHealthData(data.data);
      } else {
        console.error('Failed to fetch system health');
      }
    } catch (error) {
      console.error('Error fetching system health:', error);
    } finally {
      setIsLoading(false);
      setLastRefresh(new Date());
    }
  };

  useEffect(() => {
    fetchSystemHealth();
    const interval = setInterval(fetchSystemHealth, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    fetchSystemHealth();
  };

  if (isLoading && !healthData) {
    return (
      <AdminLayout
        title="Estado del Sistema"
        description="Monitoreo de salud y rendimiento del sistema"
      >
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Estado del Sistema"
      description="Monitoreo de salud y rendimiento del sistema"
    >
      <div className="p-6 space-y-6">
        {/* Header with refresh button */}
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Última actualización: {lastRefresh.toLocaleTimeString('es-ES')}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>

        {/* Overall System Status */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <KPICard
            title="Estado General"
            value={healthData?.overall.status === 'healthy' ? 'Saludable' : 
                   healthData?.overall.status === 'warning' ? 'Advertencia' :
                   healthData?.overall.status === 'degraded' ? 'Degradado' : 'No saludable'}
            icon={Activity}
            variant={
              healthData?.overall.status === 'healthy' ? 'success' :
              healthData?.overall.status === 'warning' ? 'warning' :
              'error'
            }
          />
          <KPICard
            title="Tiempo de Respuesta"
            value={`${healthData?.overall.responseTime || 0}ms`}
            icon={Zap}
            variant="transactions"
          />
          <KPICard
            title="Uptime"
            value={healthData?.overall.uptime.formatted || '0h 0m'}
            icon={Clock}
            variant="users"
          />
          <KPICard
            title="Alertas Activas"
            value={healthData?.alerts.length.toString() || '0'}
            icon={AlertTriangle}
            variant={healthData?.alerts.length === 0 ? 'success' : 'error'}
          />
        </div>

        {/* Alerts Section */}
        {healthData?.alerts && healthData.alerts.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Alertas del Sistema
              </h3>
            </div>
            <div className="p-6 space-y-3">
              {healthData.alerts.map((alert, index) => (
                <div
                  key={index}
                  className={`flex items-center p-4 rounded-lg ${
                    alert.level === 'critical'
                      ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                      : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                  }`}
                >
                  <AlertTriangle className={`w-5 h-5 mr-3 ${
                    alert.level === 'critical' ? 'text-red-500' : 'text-yellow-500'
                  }`} />
                  <div>
                    <p className={`font-medium ${
                      alert.level === 'critical' 
                        ? 'text-red-800 dark:text-red-200' 
                        : 'text-yellow-800 dark:text-yellow-200'
                    }`}>
                      {alert.message}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Servicio: {alert.service}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Services Status */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Estado de Servicios
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ServiceCard
              title="Base de Datos"
              icon={Database}
              status={healthData?.services.database.status || 'unknown'}
              latency={healthData?.services.database.latency || 0}
              message={healthData?.services.database.message || 'Desconocido'}
            />
            <ServiceCard
              title="API Gateway"
              icon={Server}
              status={healthData?.services.api.status || 'unknown'}
              latency={healthData?.services.api.latency || 0}
              message={healthData?.services.api.message || 'Desconocido'}
            />
            <ServiceCard
              title="Reconocimiento Facial"
              icon={Shield}
              status={healthData?.services.faceRecognition.status || 'unknown'}
              latency={healthData?.services.faceRecognition.latency || 0}
              message={healthData?.services.faceRecognition.message || 'Desconocido'}
            />
          </div>
        </div>

        {/* System Metrics */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Métricas del Sistema
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard
              title="Memoria"
              icon={Activity}
              status={healthData?.metrics.memory.status || 'unknown'}
              value={healthData?.metrics.memory.used || 0}
              total={healthData?.metrics.memory.total || 0}
              percentage={healthData?.metrics.memory.percentage || 0}
              unit="MB"
            />
            <MetricCard
              title="Almacenamiento"
              icon={Database}
              status={healthData?.metrics.storage.status || 'unknown'}
              value={healthData?.metrics.storage.used || 0}
              total={healthData?.metrics.storage.total || 0}
              percentage={healthData?.metrics.storage.percentage || 0}
              unit="MB"
            />
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Activity className="w-6 h-6 text-gray-600 dark:text-gray-300 mr-3" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Transacciones</h3>
                </div>
                <StatusBadge status={healthData?.metrics.transactions.status || 'unknown'} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Recientes (5min):</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {healthData?.metrics.transactions.recentCount || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Tasa de Error:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {(healthData?.metrics.transactions.errorRate || 0).toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Usuarios Activos:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {healthData?.metrics.transactions.activeUsers || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}