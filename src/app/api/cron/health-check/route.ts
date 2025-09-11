import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { monitoring } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

/**
 * Production health check cron job
 * Runs every 5 minutes to monitor system health and alert on issues
 * 
 * This endpoint should only be called by Vercel Cron or trusted sources
 * Configure in vercel.json
 */

// Verify this is a legitimate cron request
function verifyCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET || process.env.WEBHOOK_SECRET
  
  // In production, always require authentication
  if (process.env.NODE_ENV === 'production') {
    if (!authHeader || !cronSecret) {
      return false
    }
    
    // Verify Bearer token or Vercel cron signature
    const token = authHeader.replace('Bearer ', '')
    return token === cronSecret
  }
  
  // Allow in development for testing
  return true
}

interface HealthCheckResult {
  service: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  responseTime: number
  details?: any
  error?: string
}

async function checkDatabaseHealth(): Promise<HealthCheckResult> {
  const startTime = Date.now()
  
  try {
    // Test basic connectivity
    await prisma.$queryRaw`SELECT 1`
    
    // Check if we can perform a simple read operation
    const userCount = await prisma.user.count()
    
    const responseTime = Date.now() - startTime
    
    return {
      service: 'database',
      status: responseTime > 2000 ? 'degraded' : 'healthy',
      responseTime,
      details: {
        userCount,
        connectionPool: 'active'
      }
    }
  } catch (error) {
    return {
      service: 'database',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: (error as Error).message
    }
  }
}

async function checkExternalServices(): Promise<HealthCheckResult[]> {
  const checks: HealthCheckResult[] = []
  
  // Check Stripe API
  const stripeCheck = await checkExternalService(
    'stripe',
    'https://api.stripe.com/v1',
    { 'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}` }
  )
  checks.push(stripeCheck)
  
  // Check Sentry (if configured)
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    const sentryCheck = await checkExternalService(
      'sentry',
      'https://sentry.io/api/0/',
      {}
    )
    checks.push(sentryCheck)
  }
  
  return checks
}

async function checkExternalService(
  serviceName: string, 
  url: string, 
  headers: Record<string, string>
): Promise<HealthCheckResult> {
  const startTime = Date.now()
  
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    const responseTime = Date.now() - startTime
    
    return {
      service: serviceName,
      status: response.ok ? 'healthy' : 'degraded',
      responseTime,
      details: {
        statusCode: response.status,
        url
      }
    }
  } catch (error) {
    return {
      service: serviceName,
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: (error as Error).message
    }
  }
}

async function checkSystemMetrics(): Promise<HealthCheckResult> {
  const startTime = Date.now()
  
  try {
    const metrics: any = {
      nodeVersion: process.version,
      platform: process.platform,
      uptime: process.uptime(),
      environment: process.env.NODE_ENV
    }
    
    // Memory usage (if available)
    if (process.memoryUsage) {
      const memUsage = process.memoryUsage()
      metrics.memory = {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024),
        rss: Math.round(memUsage.rss / 1024 / 1024)
      }
      
      const heapUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100
      const status = heapUsagePercent > 90 ? 'unhealthy' : heapUsagePercent > 70 ? 'degraded' : 'healthy'
      
      return {
        service: 'system',
        status,
        responseTime: Date.now() - startTime,
        details: metrics
      }
    }
    
    return {
      service: 'system',
      status: 'healthy',
      responseTime: Date.now() - startTime,
      details: metrics
    }
  } catch (error) {
    return {
      service: 'system',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: (error as Error).message
    }
  }
}

async function checkRecentErrors(): Promise<HealthCheckResult> {
  const startTime = Date.now()
  
  try {
    // Check for recent failed transactions (last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    
    const recentFailedTransactions = await prisma.transaction.count({
      where: {
        status: 'failed',
        createdAt: {
          gte: fiveMinutesAgo
        }
      }
    })
    
    // Check for recent authentication failures
    const recentAuthFailures = await prisma.auditLog.count({
      where: {
        action: 'auth_failure',
        createdAt: {
          gte: fiveMinutesAgo
        }
      }
    })
    
    const totalIssues = recentFailedTransactions + recentAuthFailures
    const status = totalIssues > 10 ? 'unhealthy' : totalIssues > 5 ? 'degraded' : 'healthy'
    
    return {
      service: 'error_monitoring',
      status,
      responseTime: Date.now() - startTime,
      details: {
        recentFailedTransactions,
        recentAuthFailures,
        totalIssues,
        timeWindow: '5 minutes'
      }
    }
  } catch (error) {
    return {
      service: 'error_monitoring',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: (error as Error).message
    }
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Verify authentication
    if (!verifyCronAuth(request)) {
      console.warn('[Cron] Unauthorized health check attempt:', {
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
        timestamp: new Date().toISOString()
      })
      
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Run all health checks in parallel
    const [
      databaseHealth,
      systemHealth,
      errorMonitoring,
      ...externalServices
    ] = await Promise.all([
      checkDatabaseHealth(),
      checkSystemMetrics(),
      checkRecentErrors(),
      ...await checkExternalServices()
    ])

    const allChecks = [databaseHealth, systemHealth, errorMonitoring, ...externalServices]
    
    // Determine overall health status
    const unhealthyServices = allChecks.filter(check => check.status === 'unhealthy')
    const degradedServices = allChecks.filter(check => check.status === 'degraded')
    
    const overallStatus = unhealthyServices.length > 0 ? 'unhealthy' :
                         degradedServices.length > 0 ? 'degraded' : 'healthy'
    
    const totalTime = Date.now() - startTime
    
    const healthReport = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      totalCheckTime: totalTime,
      services: {
        healthy: allChecks.filter(c => c.status === 'healthy').length,
        degraded: degradedServices.length,
        unhealthy: unhealthyServices.length,
        total: allChecks.length
      },
      checks: allChecks
    }
    
    // Log health status
    if (overallStatus !== 'healthy') {
      console.warn(`[Health Check] System status: ${overallStatus}`, {
        unhealthyServices: unhealthyServices.map(s => s.service),
        degradedServices: degradedServices.map(s => s.service),
        timestamp: new Date().toISOString()
      })
    }
    
    // Alert monitoring system if there are critical issues
    if (unhealthyServices.length > 0) {
      const criticalServices = unhealthyServices.filter(s => 
        ['database', 'system'].includes(s.service)
      )
      
      if (criticalServices.length > 0) {
        monitoring.captureException(
          new Error(`Critical system health issues detected`),
          {
            extra: { 
              unhealthyServices: criticalServices,
              healthReport 
            },
            tags: { 
              job: 'health_check',
              severity: 'critical' 
            }
          }
        )
      }
    }
    
    // Track health check performance
    monitoring.trackPerformanceMetric('health_check', totalTime, {
      overall_status: overallStatus,
      services_checked: allChecks.length,
      services_unhealthy: unhealthyServices.length
    })
    
    return NextResponse.json(healthReport)
    
  } catch (error) {
    const totalTime = Date.now() - startTime
    
    console.error('[Cron] Health check failed:', error)
    
    monitoring.captureException(error as Error, {
      extra: { 
        duration: totalTime,
        context: 'health_check_cron'
      },
      tags: { 
        job: 'health_check',
        severity: 'high'
      }
    })
    
    return NextResponse.json({
      status: 'unhealthy',
      error: 'Health check system failure',
      message: (error as Error).message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Only allow POST requests
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}