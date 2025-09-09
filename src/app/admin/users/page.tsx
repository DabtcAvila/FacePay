'use client';

import React, { useState } from 'react';
import AdminLayout from '@/components/Admin/Layout/AdminLayout';
import DataTable from '@/components/Admin/Tables/DataTable';
import KPICard from '@/components/Admin/Cards/KPICard';
import { ColumnDef } from '@tanstack/react-table';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Shield,
  MoreHorizontal,
  Eye,
  Edit,
  Ban,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive' | 'banned';
  biometricEnabled: boolean;
  registrationDate: string;
  lastActivity: string;
  transactionCount: number;
  totalAmount: number;
}

// Mock data
const mockUsers: User[] = [
  {
    id: '1',
    name: 'Juan Pérez',
    email: 'juan.perez@email.com',
    phone: '+1 234 567 8901',
    status: 'active',
    biometricEnabled: true,
    registrationDate: '2024-01-15',
    lastActivity: '2024-01-20 14:30',
    transactionCount: 45,
    totalAmount: 2350.75,
  },
  {
    id: '2',
    name: 'María García',
    email: 'maria.garcia@email.com',
    phone: '+1 234 567 8902',
    status: 'active',
    biometricEnabled: true,
    registrationDate: '2024-01-10',
    lastActivity: '2024-01-20 09:15',
    transactionCount: 23,
    totalAmount: 1875.50,
  },
  {
    id: '3',
    name: 'Carlos López',
    email: 'carlos.lopez@email.com',
    phone: '+1 234 567 8903',
    status: 'inactive',
    biometricEnabled: false,
    registrationDate: '2023-12-05',
    lastActivity: '2024-01-05 16:45',
    transactionCount: 12,
    totalAmount: 560.25,
  },
  {
    id: '4',
    name: 'Ana Rodríguez',
    email: 'ana.rodriguez@email.com',
    phone: '+1 234 567 8904',
    status: 'banned',
    biometricEnabled: false,
    registrationDate: '2023-11-20',
    lastActivity: '2023-12-15 11:20',
    transactionCount: 8,
    totalAmount: 245.00,
  },
  {
    id: '5',
    name: 'Luis Martínez',
    email: 'luis.martinez@email.com',
    phone: '+1 234 567 8905',
    status: 'active',
    biometricEnabled: true,
    registrationDate: '2024-01-18',
    lastActivity: '2024-01-20 13:10',
    transactionCount: 67,
    totalAmount: 4250.80,
  },
];

const StatusBadge = ({ status }: { status: string }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'active':
        return { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: CheckCircle };
      case 'inactive':
        return { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', icon: Clock };
      case 'banned':
        return { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: XCircle };
      default:
        return { color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200', icon: Clock };
    }
  };

  const { color, icon: Icon } = getStatusConfig();
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      <Icon className="w-3 h-3 mr-1" />
      {status === 'active' ? 'Activo' : status === 'inactive' ? 'Inactivo' : 'Bloqueado'}
    </span>
  );
};

const BiometricBadge = ({ enabled }: { enabled: boolean }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
    enabled 
      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  }`}>
    <Shield className="w-3 h-3 mr-1" />
    {enabled ? 'Habilitado' : 'Deshabilitado'}
  </span>
);

const ActionMenu = ({ user }: { user: User }) => {
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
              <Edit className="w-4 h-4 mr-2" />
              Editar usuario
            </button>
            <button className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700">
              <Ban className="w-4 h-4 mr-2" />
              {user.status === 'banned' ? 'Desbloquear' : 'Bloquear'} usuario
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function UsersPage() {
  const [users] = useState<User[]>(mockUsers);

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: 'name',
      header: 'Usuario',
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">
            {row.original.name}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {row.original.email}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'phone',
      header: 'Teléfono',
    },
    {
      accessorKey: 'status',
      header: 'Estado',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'biometricEnabled',
      header: 'Biométrico',
      cell: ({ row }) => <BiometricBadge enabled={row.original.biometricEnabled} />,
    },
    {
      accessorKey: 'registrationDate',
      header: 'Registro',
      cell: ({ row }) => new Date(row.original.registrationDate).toLocaleDateString('es-ES'),
    },
    {
      accessorKey: 'lastActivity',
      header: 'Última Actividad',
      cell: ({ row }) => {
        const date = new Date(row.original.lastActivity);
        return date.toLocaleDateString('es-ES') + ' ' + date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      },
    },
    {
      accessorKey: 'transactionCount',
      header: 'Transacciones',
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.transactionCount}
        </span>
      ),
    },
    {
      accessorKey: 'totalAmount',
      header: 'Monto Total',
      cell: ({ row }) => (
        <span className="font-medium">
          ${row.original.totalAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => <ActionMenu user={row.original} />,
    },
  ];

  const activeUsers = users.filter(u => u.status === 'active').length;
  const inactiveUsers = users.filter(u => u.status === 'inactive').length;
  const bannedUsers = users.filter(u => u.status === 'banned').length;
  const biometricUsers = users.filter(u => u.biometricEnabled).length;

  const handleExport = () => {
    // Implement export functionality
    console.log('Exporting users data...');
  };

  return (
    <AdminLayout
      title="Gestión de Usuarios"
      description="Administra y supervisa todos los usuarios del sistema"
    >
      <div className="p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Total de Usuarios"
            value={users.length.toString()}
            icon={Users}
            iconColor="text-blue-600"
          />
          <KPICard
            title="Usuarios Activos"
            value={activeUsers.toString()}
            change={`${((activeUsers / users.length) * 100).toFixed(1)}% del total`}
            changeType="positive"
            icon={UserCheck}
            iconColor="text-green-600"
          />
          <KPICard
            title="Usuarios Inactivos"
            value={inactiveUsers.toString()}
            change={`${((inactiveUsers / users.length) * 100).toFixed(1)}% del total`}
            changeType="neutral"
            icon={UserX}
            iconColor="text-yellow-600"
          />
          <KPICard
            title="Biométrico Habilitado"
            value={biometricUsers.toString()}
            change={`${((biometricUsers / users.length) * 100).toFixed(1)}% del total`}
            changeType="positive"
            icon={Shield}
            iconColor="text-purple-600"
          />
        </div>

        {/* Users Table */}
        <DataTable
          data={users}
          columns={columns}
          title="Lista de Usuarios"
          onExport={handleExport}
        />
      </div>
    </AdminLayout>
  );
}