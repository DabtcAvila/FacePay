'use client';

import React, { useState } from 'react';
import AdminLayout from '@/components/Admin/Layout/AdminLayout';
import DataTable from '@/components/Admin/Tables/DataTable';
import KPICard from '@/components/Admin/Cards/KPICard';
import { ColumnDef } from '@tanstack/react-table';
import { 
  MessageSquare, 
  Plus, 
  MoreHorizontal,
  Eye,
  MessageCircle,
  CheckCircle,
  Clock,
  AlertTriangle,
  User,
  Calendar
} from 'lucide-react';

interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  userId: string;
  userName: string;
  userEmail: string;
  category: 'technical' | 'billing' | 'account' | 'security' | 'general';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  responseTime?: number; // in hours
  resolutionTime?: number; // in hours
}

const mockTickets: SupportTicket[] = [
  {
    id: 'tkt_001',
    subject: 'No puedo acceder con Face ID',
    description: 'El reconocimiento facial no funciona en mi dispositivo iPhone 12',
    userId: 'user_001',
    userName: 'Juan Pérez',
    userEmail: 'juan.perez@email.com',
    category: 'technical',
    priority: 'high',
    status: 'in_progress',
    assignedTo: 'Maria García',
    createdAt: '2024-01-20T10:30:00Z',
    updatedAt: '2024-01-20T14:15:00Z',
    responseTime: 2.5,
  },
  {
    id: 'tkt_002',
    subject: 'Problema con cargo en tarjeta',
    description: 'Me han cobrado dos veces la misma transacción',
    userId: 'user_002',
    userName: 'Ana Rodríguez',
    userEmail: 'ana.rodriguez@email.com',
    category: 'billing',
    priority: 'urgent',
    status: 'open',
    createdAt: '2024-01-20T15:20:00Z',
    updatedAt: '2024-01-20T15:20:00Z',
  },
  {
    id: 'tkt_003',
    subject: 'Cuenta bloqueada',
    description: 'Mi cuenta ha sido bloqueada sin motivo aparente',
    userId: 'user_003',
    userName: 'Carlos López',
    userEmail: 'carlos.lopez@email.com',
    category: 'account',
    priority: 'high',
    status: 'resolved',
    assignedTo: 'Pedro Martín',
    createdAt: '2024-01-19T09:15:00Z',
    updatedAt: '2024-01-20T11:30:00Z',
    responseTime: 1.5,
    resolutionTime: 26.25,
  },
  {
    id: 'tkt_004',
    subject: 'Pregunta sobre comisiones',
    description: '¿Cuáles son las comisiones por transacción internacional?',
    userId: 'user_004',
    userName: 'Laura Sánchez',
    userEmail: 'laura.sanchez@email.com',
    category: 'general',
    priority: 'low',
    status: 'closed',
    assignedTo: 'Sofia Ruiz',
    createdAt: '2024-01-18T14:45:00Z',
    updatedAt: '2024-01-19T10:20:00Z',
    responseTime: 0.5,
    resolutionTime: 19.58,
  },
];

const PriorityBadge = ({ priority }: { priority: string }) => {
  const getPriorityConfig = () => {
    switch (priority) {
      case 'low':
        return { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', text: 'Baja' };
      case 'medium':
        return { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', text: 'Media' };
      case 'high':
        return { color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200', text: 'Alta' };
      case 'urgent':
        return { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', text: 'Urgente' };
      default:
        return { color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200', text: 'Normal' };
    }
  };

  const { color, text } = getPriorityConfig();
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {text}
    </span>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'open':
        return { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: AlertTriangle, text: 'Abierto' };
      case 'in_progress':
        return { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', icon: Clock, text: 'En proceso' };
      case 'resolved':
        return { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: CheckCircle, text: 'Resuelto' };
      case 'closed':
        return { color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200', icon: CheckCircle, text: 'Cerrado' };
      default:
        return { color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200', icon: MessageSquare, text: 'Desconocido' };
    }
  };

  const { color, icon: Icon, text } = getStatusConfig();
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      <Icon className="w-3 h-3 mr-1" />
      {text}
    </span>
  );
};

const CategoryBadge = ({ category }: { category: string }) => {
  const getCategoryText = () => {
    switch (category) {
      case 'technical': return 'Técnico';
      case 'billing': return 'Facturación';
      case 'account': return 'Cuenta';
      case 'security': return 'Seguridad';
      case 'general': return 'General';
      default: return category;
    }
  };

  return (
    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
      {getCategoryText()}
    </span>
  );
};

const ActionMenu = ({ ticket }: { ticket: SupportTicket }) => {
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
            <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
              <MessageCircle className="w-4 h-4 mr-2" />
              Responder
            </button>
            <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
              <User className="w-4 h-4 mr-2" />
              Asignar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function SupportPage() {
  const [tickets] = useState<SupportTicket[]>(mockTickets);

  const columns: ColumnDef<SupportTicket>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: ({ row }) => (
        <span className="font-mono text-sm text-gray-600 dark:text-gray-400">
          {row.original.id.replace('tkt_', '#')}
        </span>
      ),
    },
    {
      accessorKey: 'subject',
      header: 'Asunto',
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">
            {row.original.subject}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
            {row.original.description}
          </div>
        </div>
      ),
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
            {row.original.userEmail}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'category',
      header: 'Categoría',
      cell: ({ row }) => <CategoryBadge category={row.original.category} />,
    },
    {
      accessorKey: 'priority',
      header: 'Prioridad',
      cell: ({ row }) => <PriorityBadge priority={row.original.priority} />,
    },
    {
      accessorKey: 'status',
      header: 'Estado',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'assignedTo',
      header: 'Asignado a',
      cell: ({ row }) => (
        <span className="text-sm text-gray-900 dark:text-white">
          {row.original.assignedTo || 'Sin asignar'}
        </span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Creado',
      cell: ({ row }) => {
        const date = new Date(row.original.createdAt);
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
      cell: ({ row }) => <ActionMenu ticket={row.original} />,
    },
  ];

  const openTickets = tickets.filter(t => t.status === 'open').length;
  const inProgressTickets = tickets.filter(t => t.status === 'in_progress').length;
  const resolvedTickets = tickets.filter(t => t.status === 'resolved').length;
  const avgResponseTime = tickets
    .filter(t => t.responseTime)
    .reduce((sum, t) => sum + (t.responseTime || 0), 0) / tickets.filter(t => t.responseTime).length || 0;

  return (
    <AdminLayout
      title="Tickets de Soporte"
      description="Gestiona y responde a las consultas de los usuarios"
    >
      <div className="p-6 space-y-6">
        {/* Header Actions */}
        <div className="flex justify-between items-center">
          <div></div>
          <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Ticket
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Tickets Abiertos"
            value={openTickets.toString()}
            change="Requieren atención"
            changeType={openTickets > 0 ? "negative" : "positive"}
            icon={AlertTriangle}
            iconColor="text-red-600"
          />
          <KPICard
            title="En Proceso"
            value={inProgressTickets.toString()}
            change="Siendo atendidos"
            changeType="neutral"
            icon={Clock}
            iconColor="text-yellow-600"
          />
          <KPICard
            title="Resueltos"
            value={resolvedTickets.toString()}
            change={`${((resolvedTickets / tickets.length) * 100).toFixed(0)}% del total`}
            changeType="positive"
            icon={CheckCircle}
            iconColor="text-green-600"
          />
          <KPICard
            title="Tiempo Respuesta Promedio"
            value={`${avgResponseTime.toFixed(1)}h`}
            change="Último mes"
            changeType="neutral"
            icon={MessageSquare}
            iconColor="text-blue-600"
          />
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Actividad Reciente
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="h-2 w-2 bg-red-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Nuevo ticket de alta prioridad
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    #002 - Problema con cargo en tarjeta - Hace 2 horas
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Ticket resuelto
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    #003 - Cuenta bloqueada - Resuelto por Pedro Martín
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Ticket asignado
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    #001 - Face ID - Asignado a Maria García
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Support Tickets Table */}
        <DataTable
          data={tickets}
          columns={columns}
          title="Lista de Tickets de Soporte"
        />
      </div>
    </AdminLayout>
  );
}