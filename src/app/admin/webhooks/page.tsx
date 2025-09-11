'use client';

import React, { useState } from 'react';
import AdminLayout from '@/components/Admin/Layout/AdminLayout';
import DataTable from '@/components/Admin/Tables/DataTable';
import KPICard from '@/components/Admin/Cards/KPICard';
import { ColumnDef } from '@tanstack/react-table';
import { 
  Webhook, 
  Plus, 
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Send
} from 'lucide-react';

interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  events: string[];
  status: 'active' | 'inactive' | 'failed';
  lastDelivery: string;
  successRate: number;
  totalDeliveries: number;
  failedDeliveries: number;
  createdAt: string;
}

const mockWebhooks: WebhookEndpoint[] = [
  {
    id: 'wh_001',
    name: 'Payment Notifications',
    url: 'https://api.merchant.com/webhooks/payments',
    events: ['payment.completed', 'payment.failed', 'payment.refunded'],
    status: 'active',
    lastDelivery: '2024-01-20T14:30:00Z',
    successRate: 98.5,
    totalDeliveries: 1247,
    failedDeliveries: 19,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'wh_002',
    name: 'User Events',
    url: 'https://crm.company.com/webhooks/users',
    events: ['user.created', 'user.updated', 'user.deleted'],
    status: 'active',
    lastDelivery: '2024-01-20T13:15:00Z',
    successRate: 99.2,
    totalDeliveries: 892,
    failedDeliveries: 7,
    createdAt: '2024-01-05T00:00:00Z',
  },
  {
    id: 'wh_003',
    name: 'Security Alerts',
    url: 'https://security.monitoring.com/api/alerts',
    events: ['security.threat_detected', 'security.breach_attempt'],
    status: 'failed',
    lastDelivery: '2024-01-19T22:45:00Z',
    successRate: 67.3,
    totalDeliveries: 145,
    failedDeliveries: 47,
    createdAt: '2024-01-10T00:00:00Z',
  },
];

const StatusBadge = ({ status }: { status: string }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'active':
        return { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: CheckCircle };
      case 'inactive':
        return { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', icon: Clock };
      case 'failed':
        return { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: XCircle };
      default:
        return { color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200', icon: Clock };
    }
  };

  const { color, icon: Icon } = getStatusConfig();
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      <Icon className="w-3 h-3 mr-1" />
      {status === 'active' ? 'Activo' : status === 'inactive' ? 'Inactivo' : 'Fallido'}
    </span>
  );
};

const ActionMenu = ({ webhook }: { webhook: WebhookEndpoint }) => {
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
              Ver logs
            </button>
            <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </button>
            <button className="flex items-center w-full px-4 py-2 text-sm text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-700">
              <Send className="w-4 h-4 mr-2" />
              Test webhook
            </button>
            <button className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700">
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function WebhooksPage() {
  const [webhooks] = useState<WebhookEndpoint[]>(mockWebhooks);

  const columns: ColumnDef<WebhookEndpoint>[] = [
    {
      accessorKey: 'name',
      header: 'Nombre',
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">
            {row.original.name}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 font-mono">
            {row.original.url}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'events',
      header: 'Eventos',
      cell: ({ row }) => (
        <div className="space-y-1">
          {row.original.events.slice(0, 2).map((event, index) => (
            <span key={index} className="inline-block px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
              {event}
            </span>
          ))}
          {row.original.events.length > 2 && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              +{row.original.events.length - 2} más
            </span>
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
      accessorKey: 'successRate',
      header: 'Tasa de Éxito',
      cell: ({ row }) => (
        <div className="text-right">
          <div className="font-semibold text-gray-900 dark:text-white">
            {row.original.successRate.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {row.original.totalDeliveries} entregas
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'lastDelivery',
      header: 'Última Entrega',
      cell: ({ row }) => {
        const date = new Date(row.original.lastDelivery);
        return (
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {date.toLocaleDateString('es-ES')}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => <ActionMenu webhook={row.original} />,
    },
  ];

  const activeWebhooks = webhooks.filter(w => w.status === 'active').length;
  const failedWebhooks = webhooks.filter(w => w.status === 'failed').length;
  const totalDeliveries = webhooks.reduce((sum, w) => sum + w.totalDeliveries, 0);
  const avgSuccessRate = webhooks.reduce((sum, w) => sum + w.successRate, 0) / webhooks.length;

  return (
    <AdminLayout
      title="Gestión de Webhooks"
      description="Configura y monitorea endpoints de webhook"
    >
      <div className="p-6 space-y-6">
        {/* Header Actions */}
        <div className="flex justify-between items-center">
          <div></div>
          <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Webhook
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Total Webhooks"
            value={webhooks.length.toString()}
            icon={Webhook}
            variant="users"
          />
          <KPICard
            title="Activos"
            value={activeWebhooks.toString()}
            change={`${((activeWebhooks / webhooks.length) * 100).toFixed(0)}% del total`}
            changeType="positive"
            icon={CheckCircle}
            variant="success"
          />
          <KPICard
            title="Con Errores"
            value={failedWebhooks.toString()}
            change={failedWebhooks > 0 ? "Requieren atención" : "Todo OK"}
            changeType={failedWebhooks > 0 ? "negative" : "positive"}
            icon={AlertTriangle}
            variant="error"
          />
          <KPICard
            title="Tasa Éxito Promedio"
            value={`${avgSuccessRate.toFixed(1)}%`}
            change={`${totalDeliveries} entregas totales`}
            changeType="positive"
            icon={Send}
            variant="transactions"
          />
        </div>

        {/* Webhooks Table */}
        <DataTable
          data={webhooks}
          columns={columns}
          title="Endpoints de Webhook"
        />
      </div>
    </AdminLayout>
  );
}