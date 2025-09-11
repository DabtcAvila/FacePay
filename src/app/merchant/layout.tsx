/**
 * Merchant Dashboard Layout
 * Multi-tenant merchant interface layout with navigation
 */

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  BarChart3, 
  CreditCard, 
  Users, 
  Settings, 
  Key, 
  FileText, 
  AlertCircle,
  Bell,
  LogOut,
  ChevronDown,
  Menu,
  X
} from 'lucide-react';

interface MerchantData {
  id: string;
  companyName: string;
  email: string;
  plan: string;
  kycStatus: string;
  testMode: boolean;
}

const navigation = [
  { name: 'Dashboard', href: '/merchant', icon: BarChart3 },
  { name: 'Transactions', href: '/merchant/transactions', icon: CreditCard },
  { name: 'Customers', href: '/merchant/customers', icon: Users },
  { name: 'API Keys', href: '/merchant/keys', icon: Key },
  { name: 'Webhooks', href: '/merchant/webhooks', icon: FileText },
  { name: 'Settings', href: '/merchant/settings', icon: Settings },
];

export default function MerchantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [merchant, setMerchant] = useState<MerchantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    loadMerchantData();
  }, []);

  const loadMerchantData = async () => {
    try {
      const response = await fetch('/api/merchants/dashboard');
      if (response.ok) {
        const data = await response.json();
        setMerchant(data.merchant);
      } else if (response.status === 401) {
        router.push('/merchant/auth');
      }
    } catch (error) {
      console.error('Failed to load merchant data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/merchant/auth');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Required</h2>
          <p className="text-gray-600 mb-4">Please authenticate to access the merchant dashboard</p>
          <Link
            href="/merchant/auth"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 flex z-40 md:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
          
          <SidebarContent merchant={merchant} pathname={pathname} />
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <SidebarContent merchant={merchant} pathname={pathname} />
      </div>

      {/* Main content */}
      <div className="md:pl-64 flex flex-col flex-1">
        {/* Top navigation */}
        <div className="sticky top-0 z-10 flex-shrink-0 flex h-16 bg-white shadow">
          <button
            type="button"
            className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <div className="flex-1 px-4 flex justify-between">
            <div className="flex-1 flex">
              <div className="w-full flex md:ml-0">
                <div className="relative w-full text-gray-400 focus-within:text-gray-600">
                  <div className="flex items-center h-16">
                    <h1 className="text-xl font-semibold text-gray-900">
                      {getPageTitle(pathname)}
                    </h1>
                    {merchant.testMode && (
                      <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Test Mode
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="ml-4 flex items-center md:ml-6">
              {/* Notifications */}
              <button
                type="button"
                className="bg-white p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Bell className="h-6 w-6" />
              </button>

              {/* Profile dropdown */}
              <div className="ml-3 relative">
                <div className="flex items-center text-sm text-gray-700">
                  <span className="font-medium">{merchant.companyName}</span>
                  <ChevronDown className="ml-2 h-4 w-4" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

function SidebarContent({ 
  merchant, 
  pathname 
}: { 
  merchant: MerchantData; 
  pathname: string; 
}) {
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white border-r border-gray-200">
      <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
        {/* Logo */}
        <div className="flex items-center flex-shrink-0 px-4">
          <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">FP</span>
          </div>
          <span className="ml-3 text-xl font-semibold text-gray-900">FacePay</span>
        </div>

        {/* Navigation */}
        <nav className="mt-8 flex-1 px-2 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <item.icon
                  className={`mr-3 flex-shrink-0 h-5 w-5 ${
                    isActive ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'
                  }`}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Merchant info */}
      <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
        <div className="flex-shrink-0 w-full group block">
          <div className="flex items-center">
            <div>
              <div className="h-9 w-9 rounded-full bg-indigo-500 flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {merchant.companyName[0].toUpperCase()}
                </span>
              </div>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                {merchant.companyName}
              </p>
              <div className="flex items-center">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  merchant.kycStatus === 'verified' 
                    ? 'bg-green-100 text-green-800'
                    : merchant.kycStatus === 'in_review'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {merchant.kycStatus}
                </span>
                <span className="ml-2 text-xs text-gray-500 capitalize">
                  {merchant.plan}
                </span>
              </div>
            </div>
            <button
              onClick={() => {/* Handle logout */}}
              className="ml-3 text-gray-400 hover:text-gray-500"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function getPageTitle(pathname: string): string {
  const titles: Record<string, string> = {
    '/merchant': 'Dashboard',
    '/merchant/transactions': 'Transactions',
    '/merchant/customers': 'Customers',
    '/merchant/keys': 'API Keys',
    '/merchant/webhooks': 'Webhooks',
    '/merchant/settings': 'Settings',
    '/merchant/billing': 'Billing',
    '/merchant/support': 'Support'
  };
  
  return titles[pathname] || 'Dashboard';
}