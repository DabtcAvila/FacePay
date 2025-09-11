'use client';

import React, { useState } from 'react';
import AdminLayout from '@/components/Admin/Layout/AdminLayout';
import DataTable from '@/components/Admin/Tables/DataTable';
import KPICard from '@/components/Admin/Cards/KPICard';
import AdminLineChart from '@/components/Admin/Charts/LineChart';
import AdminBarChart from '@/components/Admin/Charts/BarChart';
import { ColumnDef } from '@tanstack/react-table';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Eye, 
  Ban,
  MoreHorizontal,
  MapPin,
  Clock,
  User,
  Lock,
  Unlock,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface SecurityEvent {
  id: string;
  type: 'failed_login' | 'suspicious_activity' | 'fraud_attempt' | 'data_breach' | 'unauthorized_access' | 'biometric_spoofing';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  userName?: string;
  ipAddress: string;
  location: string;
  userAgent: string;
  description: string;
  timestamp: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  actions: string[];
}

// Mock data
const mockSecurityEvents: SecurityEvent[] = [
  {
    id: 'sec_001',
    type: 'biometric_spoofing',
    severity: 'critical',
    userId: 'user_001',
    userName: 'Usuario Sospechoso',
    ipAddress: '192.168.1.100',
    location: 'Madrid, ES',
    userAgent: 'Chrome/120.0.0.0',
    description: 'Intento de falsificación biométrica detectado usando imagen estática',
    timestamp: '2024-01-20T14:30:00Z',
    resolved: false,
    actions: ['Bloquear usuario', 'Notificar autoridades', 'Revisar sistema'],
  },
  {
    id: 'sec_002',
    type: 'failed_login',
    severity: 'medium',
    userId: 'user_002',
    userName: 'Juan Pérez',
    ipAddress: '203.0.113.45',
    location: 'Barcelona, ES',
    userAgent: 'Safari/17.0',
    description: 'Múltiples intentos fallidos de inicio de sesión (5 intentos en 10 minutos)',
    timestamp: '2024-01-20T13:15:00Z',
    resolved: true,
    resolvedBy: 'admin',
    resolvedAt: '2024-01-20T13:45:00Z',
    actions: ['Bloqueo temporal', 'Notificación por email'],
  },
  {
    id: 'sec_003',
    type: 'suspicious_activity',
    severity: 'high',
    userId: 'user_003',
    userName: 'María García',
    ipAddress: '198.51.100.23',
    location: 'Valencia, ES',
    userAgent: 'Chrome/120.0.0.0',
    description: 'Transacciones inusuales desde nueva ubicación geográfica',
    timestamp: '2024-01-20T11:00:00Z',
    resolved: false,
    actions: ['Verificación adicional', 'Contactar usuario'],
  },
  {
    id: 'sec_004',
    type: 'fraud_attempt',
    severity: 'critical',
    ipAddress: '203.0.113.66',
    location: 'Unknown',
    userAgent: 'Unknown Bot',
    description: 'Intento automatizado de creación de cuentas falsas',
    timestamp: '2024-01-20T09:30:00Z',
    resolved: true,
    resolvedBy: 'security_team',
    resolvedAt: '2024-01-20T10:00:00Z',
    actions: ['Bloqueo IP', 'Actualizar reglas WAF'],
  },
  {
    id: 'sec_005',
    type: 'unauthorized_access',
    severity: 'high',
    userId: 'user_004',
    userName: 'Carlos López',
    ipAddress: '192.0.2.150',
    location: 'Sevilla, ES',
    userAgent: 'Firefox/121.0',
    description: 'Acceso desde dispositivo no reconocido sin autenticación 2FA',
    timestamp: '2024-01-20T08:45:00Z',
    resolved: false,
    actions: ['Requiere 2FA', 'Verificar dispositivo'],
  },
];

const threatsByHourData = [
  { name: '00:00', value: 2 },
  { name: '04:00', value: 1 },
  { name: '08:00', value: 8 },
  { name: '12:00', value: 12 },
  { name: '16:00', value: 15 },
  { name: '20:00', value: 7 },
];

const threatsByTypeData = [
  { name: 'Intentos fallidos', value: 45 },
  { name: 'Actividad sospechosa', value: 23 },
  { name: 'Fraude', value: 12 },
  { name: 'Acceso no autorizado', value: 8 },
  { name: 'Suplantación biométrica', value: 3 },
];

const SeverityBadge = ({ severity }: { severity: string }) => {
  const getSeverityConfig = () => {
    switch (severity) {
      case 'low':
        return { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', icon: CheckCircle, text: 'Baja' };
      case 'medium':
        return { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', icon: AlertCircle, text: 'Media' };
      case 'high':
        return { color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200', icon: AlertTriangle, text: 'Alta' };
      case 'critical':
        return { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: XCircle, text: 'Crítica' };
      default:
        return { color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200', icon: AlertCircle, text: 'Desconocida' };
    }
  };

  const { color, icon: Icon, text } = getSeverityConfig();
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      <Icon className="w-3 h-3 mr-1" />
      {text}
    </span>
  );
};

const TypeBadge = ({ type }: { type: string }) => {
  const getTypeConfig = () => {
    switch (type) {
      case 'failed_login':
        return { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', text: 'Intento fallido' };
      case 'suspicious_activity':
        return { color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200', text: 'Actividad sospechosa' };
      case 'fraud_attempt':
        return { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', text: 'Intento de fraude' };
      case 'data_breach':
        return { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200', text: 'Filtración' };
      case 'unauthorized_access':
        return { color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200', text: 'Acceso no autorizado' };
      case 'biometric_spoofing':
        return { color: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200', text: 'Suplantación biométrica' };
      default:
        return { color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200', text: 'Otro' };
    }
  };

  const { color, text } = getTypeConfig();
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {text}
    </span>
  );
};

const StatusBadge = ({ resolved }: { resolved: boolean }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
    resolved 
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
  }`}>
    {resolved ? (
      <>
        <CheckCircle className="w-3 h-3 mr-1" />
        Resuelto
      </>
    ) : (
      <>
        <AlertCircle className="w-3 h-3 mr-1" />
        Pendiente
      </>
    )}
  </span>
);

const ActionMenu = ({ event }: { event: SecurityEvent }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-10">
          <div className="py-1">
            <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
              <Eye className="w-4 h-4 mr-2" />
              Ver detalles
            </button>
            {!event.resolved && (
              <button className="flex items-center w-full px-4 py-2 text-sm text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-700">
                <CheckCircle className="w-4 h-4 mr-2" />
                Marcar como resuelto
              </button>
            )}
            {event.userId && (
              <button className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700">
                <Ban className="w-4 h-4 mr-2" />
                Bloquear usuario
              </button>
            )}
            <button className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700">
              <Lock className="w-4 h-4 mr-2" />
              Bloquear IP
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function SecurityPage() {
  const [securityEvents] = useState<SecurityEvent[]>(mockSecurityEvents);

  const columns: ColumnDef<SecurityEvent>[] = [
    {
      accessorKey: 'timestamp',
      header: 'Fecha y Hora',
      cell: ({ row }) => {
        const date = new Date(row.original.timestamp);
        return (
          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              {date.toLocaleDateString('es-ES')}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {date.toLocaleTimeString('es-ES')}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'type',
      header: 'Tipo',
      cell: ({ row }) => <TypeBadge type={row.original.type} />,
    },
    {
      accessorKey: 'severity',
      header: 'Severidad',
      cell: ({ row }) => <SeverityBadge severity={row.original.severity} />,
    },
    {
      accessorKey: 'userName',
      header: 'Usuario',
      cell: ({ row }) => (
        <div>
          {row.original.userName ? (
            <>
              <div className="font-medium text-gray-900 dark:text-white">
                {row.original.userName}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {row.original.userId}
              </div>
            </>
          ) : (
            <span className="text-gray-500 dark:text-gray-400">N/A</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'location',
      header: 'Ubicación',
      cell: ({ row }) => (
        <div>
          <div className="flex items-center text-gray-900 dark:text-white">
            <MapPin className="w-3 h-3 mr-1" />
            {row.original.location}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {row.original.ipAddress}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Descripción',
      cell: ({ row }) => (
        <div className="max-w-xs truncate" title={row.original.description}>
          {row.original.description}
        </div>
      ),
    },
    {
      accessorKey: 'resolved',
      header: 'Estado',
      cell: ({ row }) => <StatusBadge resolved={row.original.resolved} />,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => <ActionMenu event={row.original} />,
    },
  ];

  const totalEvents = securityEvents.length;
  const criticalEvents = securityEvents.filter(e => e.severity === 'critical').length;
  const unresolvedEvents = securityEvents.filter(e => !e.resolved).length;
  const resolvedToday = securityEvents.filter(e => {
    if (!e.resolved || !e.resolvedAt) return false;
    const today = new Date().toDateString();
    const resolvedDate = new Date(e.resolvedAt).toDateString();
    return today === resolvedDate;
  }).length;

  const handleExport = () => {
    console.log('Exporting security events data...');
  };

  return (
    <AdminLayout
      title="Logs de Seguridad"
      description="Monitorea y gestiona eventos de seguridad del sistema"
    >
      <div className="p-6 space-y-6">
        {/* Security KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Eventos Totales"
            value={totalEvents.toString()}
            change="Últimas 24h"
            changeType="neutral"
            icon={ShieldCheck}
            variant="users"
          />
          <KPICard
            title="Eventos Críticos"
            value={criticalEvents.toString()}
            change={`${((criticalEvents / totalEvents) * 100).toFixed(1)}% del total`}
            changeType="negative"
            icon={AlertTriangle}
            variant="error"
          />
          <KPICard
            title="Sin Resolver"
            value={unresolvedEvents.toString()}
            change="Requieren atención"
            changeType="negative"
            icon={AlertCircle}
            variant="warning"
          />
          <KPICard
            title="Resueltos Hoy"
            value={resolvedToday.toString()}
            change="Eventos procesados"
            changeType="positive"
            icon={CheckCircle}
            variant="success"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AdminLineChart
            data={threatsByHourData}
            title="Amenazas por Hora"
            color="#EF4444"
            height={300}
          />
          <AdminBarChart
            data={threatsByTypeData}
            title="Tipos de Amenazas"
            color="#F97316"
            height={300}
          />
        </div>

        {/* Real-time Security Alerts */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Alertas en Tiempo Real
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {securityEvents
                .filter(e => !e.resolved && e.severity === 'critical')
                .slice(0, 3)
                .map((event) => (
                  <div key={event.id} className="flex items-start space-x-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-red-900 dark:text-red-100">
                          Evento Crítico - {event.id}
                        </p>
                        <span className="text-xs text-red-600 dark:text-red-400">
                          {new Date(event.timestamp).toLocaleTimeString('es-ES')}
                        </span>
                      </div>
                      <p className="text-sm text-red-800 dark:text-red-200 mt-1">
                        {event.description}
                      </p>
                      <div className="flex items-center space-x-4 mt-2">
                        <span className="text-xs text-red-600 dark:text-red-400">
                          Usuario: {event.userName || 'N/A'}
                        </span>
                        <span className="text-xs text-red-600 dark:text-red-400">
                          IP: {event.ipAddress}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Security Events Table */}
        <DataTable
          data={securityEvents}
          columns={columns}
          title="Registro de Eventos de Seguridad"
          onExport={handleExport}
        />
      </div>
    </AdminLayout>
  );
}