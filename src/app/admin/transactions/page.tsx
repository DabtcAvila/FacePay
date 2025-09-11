'use client';

import React, { useState } from 'react';
import AdminLayout from '@/components/Admin/Layout/AdminLayout';
import DataTable from '@/components/Admin/Tables/DataTable';
import KPICard from '@/components/Admin/Cards/KPICard';
import AdminLineChart from '@/components/Admin/Charts/LineChart';
import { ColumnDef } from '@tanstack/react-table';
import { 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  RefreshCw,
  MoreHorizontal,
  Eye,
  Download,
  RotateCcw,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle
} from 'lucide-react';

interface Transaction {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  currency: string;
  method: 'face_id' | 'card' | 'paypal' | 'crypto';
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  type: 'payment' | 'refund' | 'withdrawal';
  merchantId?: string;
  merchantName?: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  fees: number;
  netAmount: number;
}

// Mock data
const mockTransactions: Transaction[] = [
  {
    id: 'tx_001',
    userId: 'user_001',
    userName: 'Juan Pérez',
    amount: 125.00,
    currency: 'USD',
    method: 'face_id',
    status: 'completed',
    type: 'payment',
    merchantId: 'merchant_001',
    merchantName: 'Coffee Shop Pro',
    description: 'Pago en Coffee Shop Pro',
    createdAt: '2024-01-20T14:30:00Z',
    updatedAt: '2024-01-20T14:30:15Z',
    fees: 3.75,
    netAmount: 121.25,
  },
  {
    id: 'tx_002',
    userId: 'user_002',
    userName: 'María García',
    amount: 89.50,
    currency: 'USD',
    method: 'card',
    status: 'completed',
    type: 'payment',
    merchantId: 'merchant_002',
    merchantName: 'SuperMarket Plus',
    description: 'Compra en SuperMarket Plus',
    createdAt: '2024-01-20T09:15:00Z',
    updatedAt: '2024-01-20T09:15:12Z',
    fees: 2.69,
    netAmount: 86.81,
  },
  {
    id: 'tx_003',
    userId: 'user_003',
    userName: 'Carlos López',
    amount: 234.75,
    currency: 'USD',
    method: 'face_id',
    status: 'pending',
    type: 'payment',
    merchantId: 'merchant_003',
    merchantName: 'Tech Store',
    description: 'Compra de electrónicos',
    createdAt: '2024-01-20T08:45:00Z',
    updatedAt: '2024-01-20T08:45:00Z',
    fees: 7.04,
    netAmount: 227.71,
  },
  {
    id: 'tx_004',
    userId: 'user_004',
    userName: 'Ana Rodríguez',
    amount: 67.25,
    currency: 'USD',
    method: 'paypal',
    status: 'failed',
    type: 'payment',
    merchantId: 'merchant_001',
    merchantName: 'Coffee Shop Pro',
    description: 'Intento de pago fallido',
    createdAt: '2024-01-19T16:20:00Z',
    updatedAt: '2024-01-19T16:20:30Z',
    fees: 0,
    netAmount: 0,
  },
  {
    id: 'tx_005',
    userId: 'user_005',
    userName: 'Luis Martínez',
    amount: 150.00,
    currency: 'USD',
    method: 'face_id',
    status: 'refunded',
    type: 'refund',
    merchantId: 'merchant_002',
    merchantName: 'SuperMarket Plus',
    description: 'Reembolso de compra',
    createdAt: '2024-01-19T11:30:00Z',
    updatedAt: '2024-01-19T11:35:00Z',
    fees: -4.50,
    netAmount: 145.50,
  },
];

const transactionVolumeData = [
  { name: '00:00', value: 45 },
  { name: '04:00', value: 12 },
  { name: '08:00', value: 89 },
  { name: '12:00', value: 156 },
  { name: '16:00', value: 234 },
  { name: '20:00', value: 178 },
];

const StatusBadge = ({ status }: { status: string }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'completed':
        return { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: CheckCircle, text: 'Completado' };
      case 'pending':
        return { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', icon: Clock, text: 'Pendiente' };
      case 'failed':
        return { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: XCircle, text: 'Fallido' };
      case 'refunded':
        return { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', icon: RotateCcw, text: 'Reembolsado' };
      default:
        return { color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200', icon: AlertCircle, text: 'Desconocido' };
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

const MethodBadge = ({ method }: { method: string }) => {
  const getMethodConfig = () => {
    switch (method) {
      case 'face_id':
        return { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', text: 'Face ID' };
      case 'card':
        return { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200', text: 'Tarjeta' };
      case 'paypal':
        return { color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200', text: 'PayPal' };
      case 'crypto':
        return { color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200', text: 'Crypto' };
      default:
        return { color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200', text: 'Desconocido' };
    }
  };

  const { color, text } = getMethodConfig();
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {text}
    </span>
  );
};

const TypeBadge = ({ type }: { type: string }) => {
  const getTypeConfig = () => {
    switch (type) {
      case 'payment':
        return { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', text: 'Pago' };
      case 'refund':
        return { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', text: 'Reembolso' };
      case 'withdrawal':
        return { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', text: 'Retiro' };
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

const ActionMenu = ({ transaction }: { transaction: Transaction }) => {
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
              <Download className="w-4 h-4 mr-2" />
              Descargar recibo
            </button>
            {transaction.status === 'completed' && (
              <button className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700">
                <RotateCcw className="w-4 h-4 mr-2" />
                Procesar reembolso
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function TransactionsPage() {
  const [transactions] = useState<Transaction[]>(mockTransactions);

  const columns: ColumnDef<Transaction>[] = [
    {
      accessorKey: 'id',
      header: 'ID Transacción',
      cell: ({ row }) => (
        <span className="font-mono text-sm">
          {row.original.id}
        </span>
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
            {row.original.merchantName || 'N/A'}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'amount',
      header: 'Monto',
      cell: ({ row }) => (
        <div className="text-right">
          <div className="font-semibold text-gray-900 dark:text-white">
            ${row.original.amount.toFixed(2)}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Neto: ${row.original.netAmount.toFixed(2)}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'method',
      header: 'Método',
      cell: ({ row }) => <MethodBadge method={row.original.method} />,
    },
    {
      accessorKey: 'type',
      header: 'Tipo',
      cell: ({ row }) => <TypeBadge type={row.original.type} />,
    },
    {
      accessorKey: 'status',
      header: 'Estado',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'createdAt',
      header: 'Fecha',
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
      cell: ({ row }) => <ActionMenu transaction={row.original} />,
    },
  ];

  const completedTransactions = transactions.filter(t => t.status === 'completed').length;
  const pendingTransactions = transactions.filter(t => t.status === 'pending').length;
  const totalVolume = transactions.reduce((sum, t) => sum + (t.status === 'completed' ? t.amount : 0), 0);
  const totalFees = transactions.reduce((sum, t) => sum + (t.status === 'completed' ? t.fees : 0), 0);

  const handleExport = () => {
    console.log('Exporting transactions data...');
  };

  return (
    <AdminLayout
      title="Historial de Transacciones"
      description="Monitorea y gestiona todas las transacciones del sistema"
    >
      <div className="p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Total Transacciones"
            value={transactions.length.toString()}
            change="Hoy"
            changeType="neutral"
            icon={CreditCard}
            variant="users"
          />
          <KPICard
            title="Completadas"
            value={completedTransactions.toString()}
            change={`${((completedTransactions / transactions.length) * 100).toFixed(1)}% del total`}
            changeType="positive"
            icon={CheckCircle}
            variant="success"
          />
          <KPICard
            title="Volumen Total"
            value={`$${totalVolume.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`}
            change="Hoy"
            changeType="positive"
            icon={DollarSign}
            variant="warning"
          />
          <KPICard
            title="Comisiones"
            value={`$${totalFees.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`}
            change="Hoy"
            changeType="positive"
            icon={TrendingUp}
            variant="transactions"
          />
        </div>

        {/* Transaction Volume Chart */}
        <AdminLineChart
          data={transactionVolumeData}
          title="Volumen de Transacciones por Hora"
          color="#3B82F6"
          height={300}
        />

        {/* Transactions Table */}
        <DataTable
          data={transactions}
          columns={columns}
          title="Lista de Transacciones"
          onExport={handleExport}
        />
      </div>
    </AdminLayout>
  );
}