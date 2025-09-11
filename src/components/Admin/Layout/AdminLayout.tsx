'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  ShieldCheck, 
  BarChart3, 
  Settings, 
  Webhook, 
  FileText, 
  MessageSquare, 
  ClipboardList,
  Menu,
  X,
  LogOut,
  Bell,
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Usuarios', href: '/admin/users', icon: Users },
  { name: 'Pagos', href: '/admin/payments', icon: CreditCard },
  { name: 'Transacciones', href: '/admin/transactions', icon: CreditCard },
  { name: 'Seguridad', href: '/admin/security', icon: ShieldCheck },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { name: 'Configuración', href: '/admin/settings', icon: Settings },
  { name: 'Webhooks', href: '/admin/webhooks', icon: Webhook },
  { name: 'Reportes', href: '/admin/reports', icon: FileText },
  { name: 'Soporte', href: '/admin/support', icon: MessageSquare },
  { name: 'Auditoría', href: '/admin/audit', icon: ClipboardList },
];

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export default function AdminLayout({ children, title, description }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-blue-900/10 dark:to-purple-900/10">
      {/* Mobile sidebar */}
      <div className={cn(
        "fixed inset-0 z-50 lg:hidden",
        sidebarOpen ? "block" : "hidden"
      )}>
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-full max-w-xs flex-col bg-white/90 backdrop-blur-xl border-r border-white/20 dark:bg-gray-900/90 dark:border-gray-700/30">
          <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-sm">FP</span>
              </div>
              <span className="ml-2 text-lg font-bold text-gray-900 dark:text-white">
                FacePay Admin
              </span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200",
                    isActive
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25"
                      : "text-gray-700 hover:text-gray-900 hover:bg-white/60 hover:shadow-md dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800/60"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex min-h-0 flex-1 flex-col bg-white/90 backdrop-blur-xl border-r border-white/20 shadow-xl dark:bg-gray-900/90 dark:border-gray-700/30">
          <div className="flex h-16 items-center px-6 border-b border-gray-200/50 dark:border-gray-700/50">
            <div className="h-8 w-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-sm">FP</span>
            </div>
            <span className="ml-3 text-lg font-bold text-gray-900 dark:text-white">
              FacePay Admin
            </span>
          </div>
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200",
                    isActive
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25"
                      : "text-gray-700 hover:text-gray-900 hover:bg-white/60 hover:shadow-md dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800/60"
                  )}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col">
        {/* Top navigation */}
        <div className="sticky top-0 z-10 flex h-16 bg-white/90 backdrop-blur-xl border-b border-white/20 shadow-sm dark:bg-gray-900/90 dark:border-gray-700/30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="px-4 text-gray-400 hover:text-gray-600 hover:bg-gray-100/50 rounded-lg mx-2 my-2 transition-colors lg:hidden"
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <div className="flex flex-1 items-center justify-between px-4 lg:px-6">
            {/* Search */}
            <div className="flex-1 max-w-lg">
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Buscar usuarios, transacciones..."
                  className="block w-full rounded-xl border-0 bg-gray-100/60 dark:bg-gray-800/60 py-2 pl-10 pr-4 text-gray-900 dark:text-white placeholder:text-gray-400 focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 sm:text-sm backdrop-blur-sm transition-all duration-200"
                />
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center space-x-3 ml-6">
              <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100/50 rounded-lg transition-colors dark:hover:text-gray-300 dark:hover:bg-gray-800/50">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
              </button>
              <button className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100/50 rounded-lg px-3 py-2 transition-colors dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800/50">
                <div className="h-8 w-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-sm font-bold text-white">A</span>
                </div>
                <span className="text-sm font-medium hidden sm:block">Admin</span>
              </button>
              <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors dark:hover:text-red-400 dark:hover:bg-red-900/20">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Page header */}
        {title && (
          <div className="bg-white/50 backdrop-blur-xl border-b border-white/20 dark:bg-gray-900/50 dark:border-gray-700/30">
            <div className="px-4 lg:px-6 py-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                {title}
              </h1>
              {description && (
                <p className="mt-2 text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                  {description}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Main content area */}
        <main className="flex-1 p-4 lg:p-6">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}