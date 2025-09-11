import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { monitoring } from '@/lib/monitoring'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

/**
 * Production cleanup cron job
 * Runs daily at 2 AM to clean up old data and maintain database health
 * 
 * This endpoint should only be called by Vercel Cron or trusted sources
 * Configure in vercel.json:
 * "crons": [{ "path": "/api/cron/cleanup", "schedule": "0 2 * * *" }]
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

interface CleanupResult {
  task: string
  itemsDeleted: number
  timeTakenMs: number
  success: boolean
  error?: string
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Verify authentication
    if (!verifyCronAuth(request)) {
      console.warn('[Cron] Unauthorized cleanup attempt:', {
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
        timestamp: new Date().toISOString()
      })
      
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('[Cron] Starting daily cleanup job...')
    const results: CleanupResult[] = []

    // 1. Clean up expired WebAuthn challenges (older than 1 hour)
    const challengeCleanupStart = Date.now()
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      
      // Clean up expired WebAuthn challenges stored in user records
      const expiredChallengesCount = await prisma.user.updateMany({
        where: {
          currentChallenge: { not: null },
          updatedAt: {
            lt: oneHourAgo
          }
        },
        data: {
          currentChallenge: null
        }
      })

      results.push({
        task: 'expired_webauthn_challenges',
        itemsDeleted: expiredChallengesCount.count,
        timeTakenMs: Date.now() - challengeCleanupStart,
        success: true
      })
    } catch (error) {
      results.push({
        task: 'expired_webauthn_challenges',
        itemsDeleted: 0,
        timeTakenMs: Date.now() - challengeCleanupStart,
        success: false,
        error: (error as Error).message
      })
    }

    // 2. Clean up old audit logs (keep only last 90 days)
    const auditCleanupStart = Date.now()
    try {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      
      const oldAuditLogsCount = await prisma.auditLog.deleteMany({
        where: {
          createdAt: {
            lt: ninetyDaysAgo
          }
        }
      })

      results.push({
        task: 'old_audit_logs',
        itemsDeleted: oldAuditLogsCount.count,
        timeTakenMs: Date.now() - auditCleanupStart,
        success: true
      })
    } catch (error) {
      results.push({
        task: 'old_audit_logs',
        itemsDeleted: 0,
        timeTakenMs: Date.now() - auditCleanupStart,
        success: false,
        error: (error as Error).message
      })
    }

    // 3. Clean up failed transactions (older than 7 days)
    const failedTxCleanupStart = Date.now()
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      
      const failedTransactionsCount = await prisma.transaction.deleteMany({
        where: {
          status: 'failed',
          createdAt: {
            lt: sevenDaysAgo
          }
        }
      })

      results.push({
        task: 'failed_transactions',
        itemsDeleted: failedTransactionsCount.count,
        timeTakenMs: Date.now() - failedTxCleanupStart,
        success: true
      })
    } catch (error) {
      results.push({
        task: 'failed_transactions',
        itemsDeleted: 0,
        timeTakenMs: Date.now() - failedTxCleanupStart,
        success: false,
        error: (error as Error).message
      })
    }

    // 4. Clean up orphaned WebAuthn credentials (where user was soft-deleted)
    const orphanedCredsCleanupStart = Date.now()
    try {
      const orphanedCredentials = await prisma.webauthnCredential.deleteMany({
        where: {
          user: {
            isActive: false,
            deletedAt: { not: null }
          }
        }
      })

      results.push({
        task: 'orphaned_webauthn_credentials',
        itemsDeleted: orphanedCredentials.count,
        timeTakenMs: Date.now() - orphanedCredsCleanupStart,
        success: true
      })
    } catch (error) {
      results.push({
        task: 'orphaned_webauthn_credentials',
        itemsDeleted: 0,
        timeTakenMs: Date.now() - orphanedCredsCleanupStart,
        success: false,
        error: (error as Error).message
      })
    }

    // 5. Clean up old completed transactions metadata (older than 1 year)
    const archiveCleanupStart = Date.now()
    try {
      const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
      
      // Clear metadata from old completed transactions to save space
      const clearedTransactions = await prisma.transaction.updateMany({
        where: {
          status: 'completed',
          completedAt: {
            lt: oneYearAgo
          }
        },
        data: {
          metadata: Prisma.DbNull
        }
      })

      results.push({
        task: 'clear_old_transaction_metadata',
        itemsDeleted: clearedTransactions.count,
        timeTakenMs: Date.now() - archiveCleanupStart,
        success: true
      })
    } catch (error) {
      results.push({
        task: 'clear_old_transaction_metadata',
        itemsDeleted: 0,
        timeTakenMs: Date.now() - archiveCleanupStart,
        success: false,
        error: (error as Error).message
      })
    }

    // 6. Database maintenance - Update statistics
    const maintenanceStart = Date.now()
    try {
      // Run database maintenance commands if using PostgreSQL
      // This is database-specific and might need adjustment
      if (process.env.DATABASE_URL?.includes('postgres')) {
        // In a real implementation, you might run ANALYZE or VACUUM commands
        // For now, we'll just log that maintenance would run here
        console.log('[Cron] Database maintenance tasks would run here')
      }

      results.push({
        task: 'database_maintenance',
        itemsDeleted: 0,
        timeTakenMs: Date.now() - maintenanceStart,
        success: true
      })
    } catch (error) {
      results.push({
        task: 'database_maintenance',
        itemsDeleted: 0,
        timeTakenMs: Date.now() - maintenanceStart,
        success: false,
        error: (error as Error).message
      })
    }

    const totalTime = Date.now() - startTime
    const totalItemsDeleted = results.reduce((sum, result) => sum + result.itemsDeleted, 0)
    const failedTasks = results.filter(r => !r.success)

    // Log cleanup summary
    console.log('[Cron] Daily cleanup completed:', {
      totalItemsDeleted,
      totalTimeTakenMs: totalTime,
      tasksRun: results.length,
      tasksSuccessful: results.length - failedTasks.length,
      tasksFailed: failedTasks.length,
      timestamp: new Date().toISOString()
    })

    // Report to monitoring if there were failures
    if (failedTasks.length > 0) {
      monitoring.captureException(new Error(`Cleanup job had ${failedTasks.length} failed tasks`), {
        extra: { failedTasks },
        tags: { job: 'daily_cleanup' }
      })
    }

    // Track performance metric
    monitoring.trackPerformanceMetric('daily_cleanup', totalTime, {
      success: failedTasks.length === 0,
      items_deleted: totalItemsDeleted,
      tasks_run: results.length
    })

    return NextResponse.json({
      success: true,
      message: 'Daily cleanup completed',
      summary: {
        totalItemsDeleted,
        totalTimeTakenMs: totalTime,
        tasksRun: results.length,
        tasksSuccessful: results.length - failedTasks.length,
        tasksFailed: failedTasks.length
      },
      details: results,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    const totalTime = Date.now() - startTime
    
    console.error('[Cron] Daily cleanup failed:', error)
    
    monitoring.captureException(error as Error, {
      extra: { 
        duration: totalTime,
        context: 'daily_cleanup_cron'
      },
      tags: { job: 'daily_cleanup' }
    })

    return NextResponse.json({
      success: false,
      error: 'Cleanup job failed',
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