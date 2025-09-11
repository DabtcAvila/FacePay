'use client';

import React, { useState } from 'react';
import AdminLayout from '@/components/Admin/Layout/AdminLayout';
import DataTable from '@/components/Admin/Tables/DataTable';
import KPICard from '@/components/Admin/Cards/KPICard';
import AdminLineChart from '@/components/Admin/Charts/LineChart';
import { ColumnDef } from '@tanstack/react-table';
import { 
  ClipboardList, 
  Eye, 
  ShieldCheck,
  User,
  Database,
  Settings,
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter
} from 'lucide-react';

interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  resourceId?: string;
  ipAddress: string;
  userAgent: string;
  status: 'success' | 'failure' | 'warning';
  details: string;
  changes?: {
    field: string;
    oldValue: string;
    newValue: string;
  }[];
  sessionId: string;
  location: string;
}

const mockAuditLogs: AuditLog[] = [
  {
    id: 'audit_001',
    timestamp: '2024-01-20T14:30:00Z',
    userId: 'admin_001',
    userName: 'Admin Usuario',
    action: 'UPDATE_USER',
    resource: 'user',
    resourceId: 'user_123',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 Chrome/120.0.0.0',
    status: 'success',
    details: 'Usuario bloqueado por actividad sospechosa',
    changes: [
      { field: 'status', oldValue: 'active', newValue: 'blocked' },
      { field: 'blocked_reason', oldValue: '', newValue: 'suspicious_activity' }
    ],
    sessionId: 'sess_abc123',
    location: 'Madrid, ES',
  },
  {
    id: 'audit_002',
    timestamp: '2024-01-20T13:15:00Z',
    userId: 'admin_002',
    userName: 'Maria García',
    action: 'DELETE_TRANSACTION',
    resource: 'transaction',
    resourceId: 'tx_456',
    ipAddress: '203.0.113.45',
    userAgent: 'Mozilla/5.0 Safari/17.0',
    status: 'success',
    details: 'Transacción eliminada por solicitud de reembolso',
    changes: [
      { field: 'status', oldValue: 'completed', newValue: 'deleted' },
      { field: 'reason', oldValue: '', newValue: 'refund_request' }
    ],
    sessionId: 'sess_def456',
    location: 'Barcelona, ES',
  },
  {
    id: 'audit_003',
    timestamp: '2024-01-20T12:45:00Z',
    userId: 'admin_001',
    userName: 'Admin Usuario',
    action: 'LOGIN_ATTEMPT',
    resource: 'auth',
    ipAddress: '198.51.100.23',
    userAgent: 'Mozilla/5.0 Firefox/121.0',
    status: 'failure',
    details: 'Intento de login fallido - contraseña incorrecta',
    sessionId: 'sess_ghi789',
    location: 'Valencia, ES',
  },
  {
    id: 'audit_004',
    timestamp: '2024-01-20T11:20:00Z',
    userId: 'admin_003',
    userName: 'Carlos López',
    action: 'UPDATE_SETTINGS',
    resource: 'system_settings',
    resourceId: 'security_config',
    ipAddress: '203.0.113.66',
    userAgent: 'Mozilla/5.0 Chrome/120.0.0.0',
    status: 'warning',
    details: 'Configuración de seguridad modificada',
    changes: [
      { field: 'max_login_attempts', oldValue: '5', newValue: '3' },
      { field: 'session_timeout', oldValue: '30', newValue: '15' }
    ],
    sessionId: 'sess_jkl012',
    location: 'Sevilla, ES',
  },
  {
    id: 'audit_005',
    timestamp: '2024-01-20T10:05:00Z',
    userId: 'admin_002',
    userName: 'Maria García',
    action: 'VIEW_USER_DATA',
    resource: 'user',
    resourceId: 'user_789',
    ipAddress: '192.0.2.150',
    userAgent: 'Mozilla/5.0 Chrome/120.0.0.0',
    status: 'success',
    details: 'Consulta de datos de usuario para investigación de seguridad',
    sessionId: 'sess_mno345',
    location: 'Madrid, ES',
  },
];

const auditActivityData = [
  { name: '00:00', value: 5 },
  { name: '04:00', value: 2 },
  { name: '08:00', value: 15 },
  { name: '12:00', value: 28 },
  { name: '16:00', value: 34 },
  { name: '20:00', value: 19 },
];

const StatusBadge = ({ status }: { status: string }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'success':
        return { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: CheckCircle };
      case 'failure':
        return { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: AlertTriangle };
      case 'warning':
        return { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', icon: AlertTriangle };
      default:
        return { color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200', icon: Clock };
    }
  };

  const { color, icon: Icon } = getStatusConfig();
  const statusText = {
    success: 'Éxito',
    failure: 'Fallo',
    warning: 'Advertencia'
  }[status] || 'Desconocido';
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      <Icon className="w-3 h-3 mr-1" />
      {statusText}
    </span>
  );
};

const ActionBadge = ({ action }: { action: string }) => {
  const getActionConfig = () => {
    const actionTypes: { [key: string]: { color: string; icon: any } } = {
      'LOGIN_ATTEMPT': { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', icon: ShieldCheck },
      'UPDATE_USER': { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200', icon: User },
      'DELETE_TRANSACTION': { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: Database },
      'UPDATE_SETTINGS': { color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200', icon: Settings },
      'VIEW_USER_DATA': { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: Eye },
    };
    
    return actionTypes[action] || { color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200', icon: ClipboardList };
  };

  const { color, icon: Icon } = getActionConfig();
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      <Icon className="w-3 h-3 mr-1" />
      {action.replace(/_/g, ' ').toLowerCase()}
    </span>
  );
};

export default function AuditPage() {
  const [auditLogs] = useState<AuditLog[]>(mockAuditLogs);
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');

  const columns: ColumnDef<AuditLog>[] = [
    {
      accessorKey: 'timestamp',
      header: 'Fecha y Hora',
      cell: ({ row }) => {
        const date = new Date(row.original.timestamp);
        return (
          <div>
            <div className="font-medium text-gray-900 dark:text-white text-sm">
              {date.toLocaleDateString('es-ES')}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {date.toLocaleTimeString('es-ES')}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'userName',
      header: 'Usuario',
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">
            {row.original.userName}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {row.original.userId}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'action',
      header: 'Acción',
      cell: ({ row }) => <ActionBadge action={row.original.action} />,
    },
    {
      accessorKey: 'resource',
      header: 'Recurso',
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">
            {row.original.resource}
          </div>
          {row.original.resourceId && (
            <div className="text-sm text-gray-500 dark:text-gray-400 font-mono">
              {row.original.resourceId}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Estado',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'details',
      header: 'Detalles',
      cell: ({ row }) => (
        <div className="max-w-xs truncate" title={row.original.details}>
          {row.original.details}
        </div>
      ),
    },
    {
      accessorKey: 'ipAddress',
      header: 'IP / Ubicación',
      cell: ({ row }) => (
        <div>
          <div className="font-mono text-sm text-gray-900 dark:text-white">
            {row.original.ipAddress}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {row.original.location}
          </div>
        </div>
      ),
    },
  ];

  const totalLogs = auditLogs.length;
  const successfulActions = auditLogs.filter(log => log.status === 'success').length;
  const failedActions = auditLogs.filter(log => log.status === 'failure').length;
  const warningActions = auditLogs.filter(log => log.status === 'warning').length;

  const handleExport = () => {
    console.log('Exporting audit logs...');
  };

  return (
    <AdminLayout
      title="Logs de Auditoría"
      description="Registro completo de todas las acciones administrativas"
    >
      <div className="p-6 space-y-6">
        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Filter className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Rango de tiempo:
              </span>
              <select
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="1h">Última hora</option>
                <option value="24h">Últimas 24 horas</option>
                <option value="7d">Últimos 7 días</option>
                <option value="30d">Últimos 30 días</option>
                <option value="90d">Últimos 90 días</option>
              </select>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Total de Acciones"
            value={totalLogs.toString()}
            change="Últimas 24h"
            changeType="neutral"
            icon={ClipboardList}
            variant="users"
          />
          <KPICard
            title="Exitosas"
            value={successfulActions.toString()}
            change={`${((successfulActions / totalLogs) * 100).toFixed(1)}% del total`}
            changeType="positive"
            icon={CheckCircle}
            variant="success"
          />
          <KPICard
            title="Fallidas"
            value={failedActions.toString()}
            change={failedActions > 0 ? "Revisar causas" : "Todo OK"}
            changeType={failedActions > 0 ? "negative" : "positive"}
            icon={AlertTriangle}
            variant="error"
          />
          <KPICard
            title="Advertencias"
            value={warningActions.toString()}
            change="Acciones sensibles"
            changeType="neutral"
            icon={AlertTriangle}
            variant="warning"
          />
        </div>

        {/* Activity Chart */}
        <AdminLineChart
          data={auditActivityData}
          title="Actividad de Auditoría por Hora"
          color="#8B5CF6"
          height={300}
        />

        {/* Critical Actions Alert */}
        {warningActions > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Acciones Críticas Detectadas
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  Se han detectado {warningActions} acciones que requieren revisión. 
                  Estas incluyen cambios en configuraciones críticas de seguridad.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Acciones Más Frecuentes
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {['UPDATE_USER', 'VIEW_USER_DATA', 'LOGIN_ATTEMPT', 'UPDATE_SETTINGS'].map((action, index) => {
                  const count = auditLogs.filter(log => log.action === action).length;
                  return (
                    <div key={action} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {action.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Top Users */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Usuarios Más Activos
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {['Admin Usuario', 'Maria García', 'Carlos López'].map((user, index) => {
                  const count = auditLogs.filter(log => log.userName === user).length;
                  return (
                    <div key={user} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="h-8 w-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            {user.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {user}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                        {count} acciones
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Audit Logs Table */}
        <DataTable
          data={auditLogs}
          columns={columns}
          title="Registro de Auditoría"
          onExport={handleExport}
        />
      </div>
    </AdminLayout>
  );
}