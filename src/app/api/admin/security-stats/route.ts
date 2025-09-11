import { NextRequest, NextResponse } from 'next/server'
import { strictSecurity } from '@/middleware/security'
import { requireAuth, getAuthStats, hasPermission } from '@/middleware/auth'
import { createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware'

async function getSecurityStatsHandler(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.error) return auth.error

    // Check admin permissions
    if (!hasPermission(auth.user, 'admin:read_analytics')) {
      return createErrorResponse('Admin access required', 403)
    }

    // Get authentication statistics
    const authStats = getAuthStats()
    
    // Get system security status
    const securityStatus = {
      ...authStats,
      rateLimitingEnabled: true,
      corsEnabled: true,
      securityHeadersEnabled: true,
      threatDetectionEnabled: true,
      anomalyDetectionEnabled: true,
      fraudDetectionEnabled: true,
      securityLoggingEnabled: true,
      webhookSecurityEnabled: true,
      lastUpdated: new Date().toISOString()
    }

    return createSuccessResponse(securityStatus, 'Security statistics retrieved')

  } catch (error) {
    console.error('Security stats error:', error)
    return createErrorResponse('Failed to retrieve security statistics', 500)
  }
}

// Apply security middleware and export
export const GET = strictSecurity(getSecurityStatsHandler)