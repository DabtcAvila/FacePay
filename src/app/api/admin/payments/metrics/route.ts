import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // In production, this would fetch from your database
    // For now, returning mock data with realistic values
    
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Mock metrics calculation
    const metrics = {
      totalToday: Math.random() * 200000 + 50000,
      totalWeek: Math.random() * 1500000 + 500000,
      totalMonth: Math.random() * 5000000 + 2000000,
      successRate: 95 + Math.random() * 4, // Between 95-99%
      averageTransactionValue: Math.random() * 1000 + 200,
      transactionCount: {
        today: Math.floor(Math.random() * 500) + 100,
        week: Math.floor(Math.random() * 3000) + 800,
        month: Math.floor(Math.random() * 15000) + 5000
      },
      transactionsPerHour: Array.from({ length: 24 }, (_, i) => ({
        hour: `${i.toString().padStart(2, '0')}:00`,
        count: Math.floor(Math.random() * 100) + 10,
        amount: Math.floor(Math.random() * 50000) + 5000
      })),
      topMerchants: [
        {
          id: '1',
          name: 'Tienda Online SA',
          amount: Math.random() * 100000 + 20000,
          transactions: Math.floor(Math.random() * 500) + 100,
          successRate: 98.5,
          category: 'E-commerce'
        },
        {
          id: '2', 
          name: 'Restaurant El Buen Sabor',
          amount: Math.random() * 80000 + 15000,
          transactions: Math.floor(Math.random() * 300) + 80,
          successRate: 97.2,
          category: 'Food & Beverage'
        },
        {
          id: '3',
          name: 'Tech Store MX',
          amount: Math.random() * 120000 + 25000,
          transactions: Math.floor(Math.random() * 200) + 50,
          successRate: 99.1,
          category: 'Technology'
        },
        {
          id: '4',
          name: 'Fashion Boutique',
          amount: Math.random() * 70000 + 12000,
          transactions: Math.floor(Math.random() * 250) + 75,
          successRate: 96.8,
          category: 'Fashion'
        },
        {
          id: '5',
          name: 'Grocery Super',
          amount: Math.random() * 90000 + 18000,
          transactions: Math.floor(Math.random() * 400) + 150,
          successRate: 98.9,
          category: 'Grocery'
        }
      ],
      paymentMethods: [
        { method: 'Tarjeta de Crédito', percentage: 45, amount: Math.random() * 2000000 + 500000 },
        { method: 'Tarjeta de Débito', percentage: 30, amount: Math.random() * 1500000 + 300000 },
        { method: 'SPEI', percentage: 15, amount: Math.random() * 800000 + 200000 },
        { method: 'Efectivo', percentage: 10, amount: Math.random() * 500000 + 100000 }
      ],
      trends: {
        dailyGrowth: (Math.random() - 0.5) * 30, // -15% to +15%
        weeklyGrowth: (Math.random() - 0.5) * 40, // -20% to +20%
        monthlyGrowth: (Math.random() - 0.5) * 50, // -25% to +25%
      },
      alerts: {
        active: Math.floor(Math.random() * 5),
        resolved: Math.floor(Math.random() * 20) + 10
      }
    };

    return NextResponse.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching payment metrics:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor al obtener métricas',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Enable real-time updates
export const dynamic = 'force-dynamic';