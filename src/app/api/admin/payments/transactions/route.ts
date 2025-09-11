import { NextRequest, NextResponse } from 'next/server';

interface TransactionFilters {
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  merchant?: string;
  paymentMethod?: string;
  page?: number;
  limit?: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const filters: TransactionFilters = {
      status: searchParams.get('status') || undefined,
      search: searchParams.get('search') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      merchant: searchParams.get('merchant') || undefined,
      paymentMethod: searchParams.get('paymentMethod') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20')
    };

    // Generate mock transactions with realistic data
    const statuses = ['success', 'pending', 'failed', 'refunded'];
    const merchants = [
      'Tienda Online SA',
      'Restaurant El Buen Sabor', 
      'Tech Store MX',
      'Fashion Boutique',
      'Grocery Super',
      'Café Central',
      'Librería Moderna',
      'Farmacia San Juan'
    ];
    const paymentMethods = [
      'Tarjeta de Crédito',
      'Tarjeta de Débito', 
      'SPEI',
      'Efectivo',
      'Transferencia'
    ];

    // Generate base transactions
    const allTransactions = Array.from({ length: 500 }, (_, i) => {
      const createdAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000); // Last 30 days
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const merchant = merchants[Math.floor(Math.random() * merchants.length)];
      const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
      
      return {
        id: `tx_${Date.now()}_${i.toString().padStart(3, '0')}`,
        amount: Math.floor(Math.random() * 10000) + 50,
        currency: 'MXN',
        status: status as 'success' | 'pending' | 'failed' | 'refunded',
        merchantId: `merchant_${Math.floor(Math.random() * 8) + 1}`,
        merchantName: merchant,
        userId: `user_${Math.floor(Math.random() * 1000) + 1}`,
        userEmail: `user${Math.floor(Math.random() * 1000) + 1}@example.com`,
        paymentMethod,
        paymentMethodDetails: {
          last4: Math.floor(Math.random() * 9999).toString().padStart(4, '0'),
          brand: ['Visa', 'Mastercard', 'American Express'][Math.floor(Math.random() * 3)]
        },
        description: `Pago #${1000 + i}`,
        reference: `REF${Math.floor(Math.random() * 999999) + 100000}`,
        createdAt: createdAt.toISOString(),
        updatedAt: createdAt.toISOString(),
        fees: {
          platform: Math.floor(Math.random() * 100) + 10,
          gateway: Math.floor(Math.random() * 50) + 5
        },
        metadata: {
          ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          source: ['web', 'mobile', 'api'][Math.floor(Math.random() * 3)]
        }
      };
    });

    // Apply filters
    let filteredTransactions = allTransactions.filter(tx => {
      if (filters.status && filters.status !== 'all' && tx.status !== filters.status) {
        return false;
      }
      
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (!tx.id.toLowerCase().includes(searchLower) && 
            !tx.userEmail.toLowerCase().includes(searchLower) &&
            !tx.merchantName.toLowerCase().includes(searchLower) &&
            !tx.reference.toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      if (filters.merchant && tx.merchantName !== filters.merchant) {
        return false;
      }

      if (filters.paymentMethod && tx.paymentMethod !== filters.paymentMethod) {
        return false;
      }

      if (filters.dateFrom) {
        const txDate = new Date(tx.createdAt);
        const fromDate = new Date(filters.dateFrom);
        if (txDate < fromDate) {
          return false;
        }
      }

      if (filters.dateTo) {
        const txDate = new Date(tx.createdAt);
        const toDate = new Date(filters.dateTo);
        if (txDate > toDate) {
          return false;
        }
      }

      return true;
    });

    // Sort by creation date (newest first)
    filteredTransactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Pagination
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);
    
    // Calculate summary statistics
    const summary = {
      total: filteredTransactions.length,
      totalAmount: filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0),
      statusCounts: {
        success: filteredTransactions.filter(tx => tx.status === 'success').length,
        pending: filteredTransactions.filter(tx => tx.status === 'pending').length,
        failed: filteredTransactions.filter(tx => tx.status === 'failed').length,
        refunded: filteredTransactions.filter(tx => tx.status === 'refunded').length,
      },
      averageAmount: filteredTransactions.length > 0 
        ? filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0) / filteredTransactions.length 
        : 0,
      successRate: filteredTransactions.length > 0
        ? (filteredTransactions.filter(tx => tx.status === 'success').length / filteredTransactions.length) * 100
        : 0
    };

    const pagination = {
      current: page,
      limit,
      total: filteredTransactions.length,
      pages: Math.ceil(filteredTransactions.length / limit),
      hasNext: endIndex < filteredTransactions.length,
      hasPrev: page > 1
    };

    return NextResponse.json({
      success: true,
      data: {
        transactions: paginatedTransactions,
        summary,
        pagination,
        filters: filters
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor al obtener transacciones',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Enable real-time updates
export const dynamic = 'force-dynamic';