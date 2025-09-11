'use client';

import React, { useState } from 'react';
import AdminLayout from '@/components/Admin/Layout/AdminLayout';
import KPICard from '@/components/Admin/Cards/KPICard';
import { 
  FileText, 
  Download, 
  Calendar,
  Filter,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3
} from 'lucide-react';

interface Report {
  id: string;
  name: string;
  type: 'financial' | 'user' | 'transaction' | 'security' | 'analytics';
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'on_demand';
  format: 'pdf' | 'csv' | 'excel' | 'json';
  lastGenerated: string;
  nextScheduled?: string;
  status: 'scheduled' | 'generating' | 'completed' | 'failed';
}

const mockReports: Report[] = [
  {
    id: 'rpt_001',
    name: 'Reporte Financiero Mensual',
    type: 'financial',
    description: 'Resumen completo de ingresos, gastos y métricas financieras del mes',
    frequency: 'monthly',
    format: 'pdf',
    lastGenerated: '2024-01-01T00:00:00Z',
    nextScheduled: '2024-02-01T00:00:00Z',
    status: 'completed',
  },
  {
    id: 'rpt_002',
    name: 'Análisis de Usuarios Semanales',
    type: 'user',
    description: 'Métricas de adquisición, retención y comportamiento de usuarios',
    frequency: 'weekly',
    format: 'excel',
    lastGenerated: '2024-01-15T00:00:00Z',
    nextScheduled: '2024-01-22T00:00:00Z',
    status: 'scheduled',
  },
  {
    id: 'rpt_003',
    name: 'Transacciones Diarias',
    type: 'transaction',
    description: 'Resumen diario de todas las transacciones y su estado',
    frequency: 'daily',
    format: 'csv',
    lastGenerated: '2024-01-20T23:59:00Z',
    nextScheduled: '2024-01-21T23:59:00Z',
    status: 'generating',
  },
  {
    id: 'rpt_004',
    name: 'Reporte de Seguridad',
    type: 'security',
    description: 'Incidentes de seguridad, amenazas detectadas y medidas tomadas',
    frequency: 'weekly',
    format: 'pdf',
    lastGenerated: '2024-01-14T00:00:00Z',
    nextScheduled: '2024-01-21T00:00:00Z',
    status: 'failed',
  },
];

const reportTypes = [
  { id: 'all', name: 'Todos los reportes', count: mockReports.length },
  { id: 'financial', name: 'Financieros', count: mockReports.filter(r => r.type === 'financial').length },
  { id: 'user', name: 'Usuarios', count: mockReports.filter(r => r.type === 'user').length },
  { id: 'transaction', name: 'Transacciones', count: mockReports.filter(r => r.type === 'transaction').length },
  { id: 'security', name: 'Seguridad', count: mockReports.filter(r => r.type === 'security').length },
  { id: 'analytics', name: 'Analytics', count: mockReports.filter(r => r.type === 'analytics').length },
];

const StatusBadge = ({ status }: { status: string }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'completed':
        return { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: CheckCircle };
      case 'generating':
        return { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', icon: Clock };
      case 'scheduled':
        return { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', icon: Calendar };
      case 'failed':
        return { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: AlertCircle };
      default:
        return { color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200', icon: FileText };
    }
  };

  const { color, icon: Icon } = getStatusConfig();
  const statusText = {
    completed: 'Completado',
    generating: 'Generando',
    scheduled: 'Programado',
    failed: 'Fallido'
  }[status] || 'Desconocido';
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      <Icon className="w-3 h-3 mr-1" />
      {statusText}
    </span>
  );
};

const FrequencyBadge = ({ frequency }: { frequency: string }) => {
  const frequencyText = {
    daily: 'Diario',
    weekly: 'Semanal',
    monthly: 'Mensual',
    quarterly: 'Trimestral',
    annual: 'Anual',
    on_demand: 'Bajo demanda'
  }[frequency] || frequency;

  return (
    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
      {frequencyText}
    </span>
  );
};

export default function ReportsPage() {
  const [selectedType, setSelectedType] = useState('all');
  const [reports] = useState<Report[]>(mockReports);

  const filteredReports = selectedType === 'all' 
    ? reports 
    : reports.filter(r => r.type === selectedType);

  const completedReports = reports.filter(r => r.status === 'completed').length;
  const scheduledReports = reports.filter(r => r.status === 'scheduled').length;
  const failedReports = reports.filter(r => r.status === 'failed').length;
  const generatingReports = reports.filter(r => r.status === 'generating').length;

  const handleGenerateReport = (reportId: string) => {
    console.log('Generating report:', reportId);
  };

  const handleDownloadReport = (reportId: string) => {
    console.log('Downloading report:', reportId);
  };

  return (
    <AdminLayout
      title="Generación de Reportes"
      description="Crea y gestiona reportes automáticos del sistema"
    >
      <div className="p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Total Reportes"
            value={reports.length.toString()}
            icon={FileText}
            iconColor="text-blue-600"
          />
          <KPICard
            title="Completados"
            value={completedReports.toString()}
            change={`${((completedReports / reports.length) * 100).toFixed(0)}% del total`}
            changeType="positive"
            icon={CheckCircle}
            iconColor="text-green-600"
          />
          <KPICard
            title="Programados"
            value={scheduledReports.toString()}
            change="Próximas ejecuciones"
            changeType="neutral"
            icon={Calendar}
            iconColor="text-yellow-600"
          />
          <KPICard
            title="Fallidos"
            value={failedReports.toString()}
            change={failedReports > 0 ? "Requieren atención" : "Todo OK"}
            changeType={failedReports > 0 ? "negative" : "positive"}
            icon={AlertCircle}
            iconColor="text-red-600"
          />
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Filter className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Filtrar por tipo:
              </span>
              <div className="flex flex-wrap gap-2">
                {reportTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      selectedType === type.id
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {type.name} ({type.count})
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Reports Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredReports.map((report) => (
            <div key={report.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {report.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {report.description}
                  </p>
                </div>
                <StatusBadge status={report.status} />
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Frecuencia:</span>
                  <FrequencyBadge frequency={report.frequency} />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Formato:</span>
                  <span className="font-medium text-gray-900 dark:text-white uppercase">
                    {report.format}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Última generación:</span>
                  <span className="text-gray-900 dark:text-white">
                    {new Date(report.lastGenerated).toLocaleDateString('es-ES')}
                  </span>
                </div>
                {report.nextScheduled && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Próxima ejecución:</span>
                    <span className="text-gray-900 dark:text-white">
                      {new Date(report.nextScheduled).toLocaleDateString('es-ES')}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => handleGenerateReport(report.id)}
                  disabled={report.status === 'generating'}
                  className={`flex-1 inline-flex items-center justify-center px-3 py-2 border rounded-md text-sm font-medium ${
                    report.status === 'generating'
                      ? 'border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                      : 'border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-900'
                  }`}
                >
                  <BarChart3 className="w-4 h-4 mr-1" />
                  {report.status === 'generating' ? 'Generando...' : 'Generar'}
                </button>
                <button
                  onClick={() => handleDownloadReport(report.id)}
                  disabled={report.status !== 'completed'}
                  className={`flex-1 inline-flex items-center justify-center px-3 py-2 border rounded-md text-sm font-medium ${
                    report.status === 'completed'
                      ? 'border-green-300 text-green-700 hover:bg-green-50 dark:border-green-600 dark:text-green-400 dark:hover:bg-green-900'
                      : 'border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Download className="w-4 h-4 mr-1" />
                  Descargar
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredReports.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              No hay reportes del tipo seleccionado
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}