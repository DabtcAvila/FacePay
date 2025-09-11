import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { SecurityLogger } from '@/lib/security-logger';

const prisma = new PrismaClient();
const securityLogger = new SecurityLogger('admin-system-health-api');

// GET /api/admin/system/health - Get comprehensive system health status
export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();

    // Database health check
    const dbHealthStart = Date.now();
    let dbHealth = 'healthy';
    let dbLatency = 0;
    
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - dbHealthStart;
      if (dbLatency > 1000) dbHealth = 'slow';
      if (dbLatency > 5000) dbHealth = 'degraded';
    } catch (error) {
      dbHealth = 'unhealthy';
      dbLatency = Date.now() - dbHealthStart;
    }

    // API performance metrics
    const apiHealthStart = Date.now();
    let apiHealth = 'healthy';
    let apiLatency = 0;
    
    try {
      // Test internal API call
      const testResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/health`, {
        method: 'GET',
        timeout: 5000
      });
      apiLatency = Date.now() - apiHealthStart;
      apiHealth = testResponse.ok ? 'healthy' : 'degraded';
      if (apiLatency > 2000) apiHealth = 'slow';
    } catch (error) {
      apiHealth = 'unhealthy';
      apiLatency = Date.now() - apiHealthStart;
    }

    // Face recognition service health (mock for now)
    const faceServiceStart = Date.now();
    let faceServiceHealth = 'healthy';
    let faceServiceLatency = 0;
    
    try {
      // In real app, test face recognition service
      // For now, simulate with delay
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
      faceServiceLatency = Date.now() - faceServiceStart;
      faceServiceHealth = Math.random() > 0.1 ? 'healthy' : 'degraded';
    } catch (error) {
      faceServiceHealth = 'unhealthy';
      faceServiceLatency = Date.now() - faceServiceStart;
    }

    // Memory usage
    const memoryUsage = process.memoryUsage();
    const memoryHealthMB = memoryUsage.heapUsed / 1024 / 1024;
    let memoryHealth = 'healthy';
    if (memoryHealthMB > 500) memoryHealth = 'warning';
    if (memoryHealthMB > 1000) memoryHealth = 'critical';

    // Get recent transaction metrics
    const last5Minutes = new Date(Date.now() - 5 * 60 * 1000);
    const recentTransactions = await prisma.transaction.count({
      where: {
        createdAt: { gte: last5Minutes }
      }
    });

    const recentFailures = await prisma.transaction.count({
      where: {
        createdAt: { gte: last5Minutes },
        status: 'FAILED'
      }
    });

    const errorRate = recentTransactions > 0 ? (recentFailures / recentTransactions) * 100 : 0;
    let transactionHealth = 'healthy';
    if (errorRate > 5) transactionHealth = 'warning';
    if (errorRate > 20) transactionHealth = 'critical';

    // Active users in last hour
    const lastHour = new Date(Date.now() - 60 * 60 * 1000);
    const activeUsers = await prisma.transaction.groupBy({
      by: ['userId'],
      where: {
        createdAt: { gte: lastHour }
      },
      _count: { userId: true }
    });

    // System uptime (approximate)
    const uptime = process.uptime();
    const uptimeHours = Math.floor(uptime / 3600);
    const uptimeMinutes = Math.floor((uptime % 3600) / 60);

    // Overall system health
    const healthChecks = [dbHealth, apiHealth, faceServiceHealth, memoryHealth, transactionHealth];
    const unhealthyCount = healthChecks.filter(h => h === 'unhealthy' || h === 'critical').length;
    const degradedCount = healthChecks.filter(h => h === 'degraded' || h === 'warning' || h === 'slow').length;
    
    let overallHealth = 'healthy';
    if (unhealthyCount > 0) overallHealth = 'unhealthy';
    else if (degradedCount > 2) overallHealth = 'degraded';
    else if (degradedCount > 0) overallHealth = 'warning';

    // Get storage usage (mock data)
    const storageUsage = {
      used: 1240, // MB
      total: 5000, // MB
      percentage: 24.8
    };

    let storageHealth = 'healthy';
    if (storageUsage.percentage > 80) storageHealth = 'warning';
    if (storageUsage.percentage > 95) storageHealth = 'critical';

    const totalResponseTime = Date.now() - startTime;

    await securityLogger.log('system_health_checked', 'admin', {
      overallHealth,
      dbHealth,
      apiHealth,
      responseTime: totalResponseTime
    });

    return NextResponse.json({
      success: true,
      data: {
        overall: {
          status: overallHealth,
          responseTime: totalResponseTime,
          timestamp: new Date().toISOString(),
          uptime: {
            seconds: Math.floor(uptime),
            hours: uptimeHours,
            minutes: uptimeMinutes,
            formatted: `${uptimeHours}h ${uptimeMinutes}m`
          }
        },
        services: {
          database: {
            status: dbHealth,
            latency: dbLatency,
            message: dbHealth === 'healthy' ? 'Database connection is stable' : 
                    dbHealth === 'slow' ? 'Database responses are slow' :
                    dbHealth === 'degraded' ? 'Database performance degraded' :
                    'Database connection failed'
          },
          api: {
            status: apiHealth,
            latency: apiLatency,
            message: apiHealth === 'healthy' ? 'API endpoints responding normally' :
                    apiHealth === 'slow' ? 'API responses are slow' :
                    'API endpoints not responding'
          },
          faceRecognition: {
            status: faceServiceHealth,
            latency: faceServiceLatency,
            message: faceServiceHealth === 'healthy' ? 'Face recognition service operational' :
                    'Face recognition service issues detected'
          }
        },
        metrics: {
          memory: {
            status: memoryHealth,
            used: Math.round(memoryHealthMB),
            total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
            percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
          },
          storage: {
            status: storageHealth,
            used: storageUsage.used,
            total: storageUsage.total,
            percentage: storageUsage.percentage
          },
          transactions: {
            status: transactionHealth,
            recentCount: recentTransactions,
            errorRate: Math.round(errorRate * 100) / 100,
            activeUsers: activeUsers.length
          }
        },
        alerts: [
          ...(dbHealth === 'unhealthy' ? [{ level: 'critical', message: 'Database connection failed', service: 'database' }] : []),
          ...(apiHealth === 'unhealthy' ? [{ level: 'critical', message: 'API endpoints not responding', service: 'api' }] : []),
          ...(memoryHealth === 'critical' ? [{ level: 'critical', message: 'High memory usage detected', service: 'memory' }] : []),
          ...(storageHealth === 'critical' ? [{ level: 'critical', message: 'Storage space critically low', service: 'storage' }] : []),
          ...(errorRate > 20 ? [{ level: 'critical', message: `High transaction error rate: ${errorRate.toFixed(1)}%`, service: 'transactions' }] : []),
          ...(errorRate > 5 && errorRate <= 20 ? [{ level: 'warning', message: `Elevated transaction error rate: ${errorRate.toFixed(1)}%`, service: 'transactions' }] : []),
          ...(memoryHealth === 'warning' ? [{ level: 'warning', message: 'Memory usage above normal', service: 'memory' }] : [])
        ]
      }
    });

  } catch (error) {
    await securityLogger.log('system_health_check_error', 'admin', { error: error.message });
    console.error('System health check error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to check system health',
      data: {
        overall: {
          status: 'unhealthy',
          responseTime: Date.now() - Date.now(),
          timestamp: new Date().toISOString()
        }
      }
    }, { status: 500 });
  }
}