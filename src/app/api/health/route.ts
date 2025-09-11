import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Health check interface
interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  details?: any;
  error?: string;
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  service: string;
  version: string;
  environment: string;
  uptime: number;
  checks: HealthCheck[];
  summary: {
    healthy: number;
    degraded: number;
    unhealthy: number;
    total: number;
  };
}

// Individual health check functions
async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    // Test database connection with a simple query
    await prisma.$queryRaw`SELECT 1`;
    const responseTime = Date.now() - start;
    
    return {
      name: 'database',
      status: responseTime < 1000 ? 'healthy' : 'degraded',
      responseTime,
      details: {
        type: 'PostgreSQL',
        connectionPool: 'active'
      }
    };
  } catch (error) {
    return {
      name: 'database',
      status: 'unhealthy',
      responseTime: Date.now() - start,
      error: (error as Error).message
    };
  }
}

async function checkMemory(): Promise<HealthCheck> {
  try {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
      const heapUsagePercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);
      
      // Consider degraded if using more than 80% of heap
      const status = heapUsagePercent > 90 ? 'unhealthy' : heapUsagePercent > 80 ? 'degraded' : 'healthy';
      
      return {
        name: 'memory',
        status,
        details: {
          heapUsedMB,
          heapTotalMB,
          heapUsagePercent,
          rss: Math.round(memUsage.rss / 1024 / 1024),
          external: Math.round(memUsage.external / 1024 / 1024)
        }
      };
    } else {
      return {
        name: 'memory',
        status: 'healthy',
        details: { message: 'Memory monitoring not available in this environment' }
      };
    }
  } catch (error) {
    return {
      name: 'memory',
      status: 'unhealthy',
      error: (error as Error).message
    };
  }
}

async function checkDisk(): Promise<HealthCheck> {
  try {
    if (typeof process !== 'undefined' && process.cwd) {
      // This is a simplified disk check - in production you might want to use fs.stat
      return {
        name: 'disk',
        status: 'healthy',
        details: {
          cwd: process.cwd(),
          platform: process.platform,
          arch: process.arch
        }
      };
    } else {
      return {
        name: 'disk',
        status: 'healthy',
        details: { message: 'Disk monitoring not available in this environment' }
      };
    }
  } catch (error) {
    return {
      name: 'disk',
      status: 'unhealthy',
      error: (error as Error).message
    };
  }
}

async function checkExternalServices(): Promise<HealthCheck[]> {
  const checks: HealthCheck[] = [];
  
  // Check if we can reach external APIs (optional)
  const externalChecks = [
    { name: 'stripe', url: 'https://api.stripe.com/v1' },
    // Add other external service checks as needed
  ];

  for (const service of externalChecks) {
    const start = Date.now();
    try {
      // Simple connectivity check - just check if the service responds
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
      
      const response = await fetch(service.url, {
        method: 'HEAD',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      const responseTime = Date.now() - start;
      
      checks.push({
        name: service.name,
        status: response.ok ? 'healthy' : 'degraded',
        responseTime,
        details: {
          statusCode: response.status,
          url: service.url
        }
      });
    } catch (error) {
      checks.push({
        name: service.name,
        status: 'unhealthy',
        responseTime: Date.now() - start,
        error: (error as Error).message
      });
    }
  }
  
  return checks;
}

async function checkEnvironment(): Promise<HealthCheck> {
  try {
    const requiredEnvVars = [
      'DATABASE_URL',
      'NEXTAUTH_SECRET',
      'NEXTAUTH_URL'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    return {
      name: 'environment',
      status: missingVars.length === 0 ? 'healthy' : 'unhealthy',
      details: {
        nodeVersion: process.version,
        nodeEnv: process.env.NODE_ENV,
        missingVars: missingVars.length > 0 ? missingVars : undefined,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    };
  } catch (error) {
    return {
      name: 'environment',
      status: 'unhealthy',
      error: (error as Error).message
    };
  }
}

function getUptime(): number {
  return typeof process !== 'undefined' && process.uptime ? Math.floor(process.uptime()) : 0;
}

function determineOverallStatus(checks: HealthCheck[]): 'healthy' | 'degraded' | 'unhealthy' {
  const unhealthyChecks = checks.filter(check => check.status === 'unhealthy');
  const degradedChecks = checks.filter(check => check.status === 'degraded');
  
  if (unhealthyChecks.length > 0) {
    return 'unhealthy';
  } else if (degradedChecks.length > 0) {
    return 'degraded';
  } else {
    return 'healthy';
  }
}

export async function GET() {
  const startTime = Date.now();
  
  try {
    // Run all health checks in parallel
    const [
      databaseCheck,
      memoryCheck,
      diskCheck,
      environmentCheck,
      ...externalChecks
    ] = await Promise.all([
      checkDatabase(),
      checkMemory(),
      checkDisk(),
      checkEnvironment(),
      ...await checkExternalServices()
    ]);

    const allChecks = [
      databaseCheck,
      memoryCheck,
      diskCheck,
      environmentCheck,
      ...externalChecks
    ];

    // Calculate summary
    const summary = {
      healthy: allChecks.filter(c => c.status === 'healthy').length,
      degraded: allChecks.filter(c => c.status === 'degraded').length,
      unhealthy: allChecks.filter(c => c.status === 'unhealthy').length,
      total: allChecks.length
    };

    const overallStatus = determineOverallStatus(allChecks);
    const totalResponseTime = Date.now() - startTime;

    const response: HealthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      service: 'FacePay API',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'unknown',
      uptime: getUptime(),
      checks: allChecks,
      summary
    };

    // Return appropriate HTTP status code based on health
    const statusCode = overallStatus === 'healthy' ? 200 : 
                     overallStatus === 'degraded' ? 200 : 503;

    return NextResponse.json(response, {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Response-Time': `${totalResponseTime}ms`
      }
    });
    
  } catch (error) {
    // Fallback response if health check system itself fails
    const errorResponse: HealthResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'FacePay API',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'unknown',
      uptime: getUptime(),
      checks: [{
        name: 'health_system',
        status: 'unhealthy',
        error: (error as Error).message
      }],
      summary: {
        healthy: 0,
        degraded: 0,
        unhealthy: 1,
        total: 1
      }
    };

    return NextResponse.json(errorResponse, {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Response-Time': `${Date.now() - startTime}ms`
      }
    });
  }
}

// Optional: Add a simple HEAD endpoint for basic uptime monitoring
export async function HEAD() {
  return new NextResponse(null, { 
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}
// Prevent static generation
export const dynamic = 'force-dynamic'
