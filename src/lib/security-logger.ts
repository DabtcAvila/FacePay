import { NextRequest } from 'next/server'
import { prisma } from './prisma'

// Security event types
export enum SecurityEventType {
  AUTHENTICATION_SUCCESS = 'authentication_success',
  AUTHENTICATION_FAILED = 'authentication_failed',
  AUTHORIZATION_DENIED = 'authorization_denied',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  DATA_BREACH_ATTEMPT = 'data_breach_attempt',
  INJECTION_ATTEMPT = 'injection_attempt',
  BRUTE_FORCE_ATTEMPT = 'brute_force_attempt',
  SESSION_HIJACK_ATTEMPT = 'session_hijack_attempt',
  UNUSUAL_LOGIN_LOCATION = 'unusual_login_location',
  PAYMENT_FRAUD_ATTEMPT = 'payment_fraud_attempt',
  ACCOUNT_LOCKOUT = 'account_lockout',
  PASSWORD_RESET_ABUSE = 'password_reset_abuse',
  API_ABUSE = 'api_abuse',
  MALFORMED_REQUEST = 'malformed_request',
  INVALID_TOKEN = 'invalid_token',
  EXPIRED_SESSION = 'expired_session',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
  DATA_EXPORT_SUSPICIOUS = 'data_export_suspicious',
  WEBHOOK_MANIPULATION = 'webhook_manipulation'
}

// Security severity levels
export enum SecuritySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Security event interface
export interface SecurityEvent {
  type: SecurityEventType
  severity: SecuritySeverity
  userId?: string
  sessionId?: string
  ipAddress: string
  userAgent: string
  path: string
  method: string
  timestamp: Date
  details: Record<string, any>
  resolved: boolean
  investigationNotes?: string
}

// Threat detection patterns
const THREAT_PATTERNS = {
  // SQL Injection patterns
  sqlInjection: [
    /(\bUNION\b.*\bSELECT\b)/i,
    /(\bDROP\b.*\bTABLE\b)/i,
    /(\bINSERT\b.*\bINTO\b)/i,
    /(\bUPDATE\b.*\bSET\b)/i,
    /(\bDELETE\b.*\bFROM\b)/i,
    /('.*OR.*'.*=.*')/i,
    /(--|\#|\*\/)/,
    /(\bEXEC\b|\bEXECUTE\b)/i
  ],
  
  // XSS patterns
  xss: [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe[^>]*>/i,
    /<embed[^>]*>/i,
    /<object[^>]*>/i,
    /eval\s*\(/i,
    /expression\s*\(/i
  ],
  
  // Path traversal
  pathTraversal: [
    /\.\.\//,
    /\.\.\\/,
    /%2e%2e%2f/i,
    /%2e%2e%5c/i,
    /\.\.%2f/i,
    /\.\.%5c/i
  ],
  
  // Command injection
  commandInjection: [
    /;\s*(ls|cat|echo|pwd|whoami|id|uname)/i,
    /\|\s*(ls|cat|echo|pwd|whoami|id|uname)/i,
    /`.*`/,
    /\$\(.*\)/,
    /&\s*(ls|cat|echo|pwd|whoami|id|uname)/i
  ],
  
  // NoSQL injection
  nosqlInjection: [
    /\$where/i,
    /\$ne/i,
    /\$in/i,
    /\$nin/i,
    /\$regex/i,
    /\$gt/i,
    /\$lt/i,
    /\$or/i,
    /\$and/i
  ]
}

// Security logger class
class CoreSecurityLogger {
  private static instance: CoreSecurityLogger
  private eventBuffer: SecurityEvent[] = []
  private bufferSize = 100
  private flushInterval = 30000 // 30 seconds
  
  private constructor() {
    // Schedule periodic flush
    if (typeof setInterval !== 'undefined') {
      setInterval(() => this.flushBuffer(), this.flushInterval)
    }
  }
  
  public static getInstance(): CoreSecurityLogger {
    if (!CoreSecurityLogger.instance) {
      CoreSecurityLogger.instance = new CoreSecurityLogger()
    }
    return CoreSecurityLogger.instance
  }
  
  // Log security event
  public async logEvent(event: Omit<SecurityEvent, 'timestamp' | 'resolved'>): Promise<void> {
    const fullEvent: SecurityEvent = {
      ...event,
      timestamp: new Date(),
      resolved: false
    }
    
    // Add to buffer
    this.eventBuffer.push(fullEvent)
    
    // Console log for immediate visibility
    const severity = fullEvent.severity.toUpperCase()
    const prefix = `[SECURITY-${severity}]`
    
    console.warn(prefix, {
      type: fullEvent.type,
      path: fullEvent.path,
      ip: fullEvent.ipAddress,
      userId: fullEvent.userId,
      details: fullEvent.details,
      timestamp: fullEvent.timestamp.toISOString()
    })
    
    // Flush buffer if it's full or if it's a critical event
    if (this.eventBuffer.length >= this.bufferSize || 
        fullEvent.severity === SecuritySeverity.CRITICAL) {
      await this.flushBuffer()
    }
  }
  
  // Flush events to database
  private async flushBuffer(): Promise<void> {
    if (this.eventBuffer.length === 0) return
    
    const eventsToFlush = [...this.eventBuffer]
    this.eventBuffer = []
    
    try {
      // Note: This assumes you have a securityEvents table in your database
      // You would need to create this table or use an external logging service
      console.log(`[Security Logger] Flushing ${eventsToFlush.length} security events`)
      
      // In a real implementation, you would save to database:
      // await prisma.securityEvent.createMany({ data: eventsToFlush })
      
      // For now, we'll write to a local log file or external service
      await this.writeToExternalLog(eventsToFlush)
      
    } catch (error) {
      console.error('[Security Logger] Failed to flush events:', error)
      // Re-add events to buffer for retry
      this.eventBuffer.unshift(...eventsToFlush)
    }
  }
  
  // Write to external logging service
  private async writeToExternalLog(events: SecurityEvent[]): Promise<void> {
    // This could be replaced with actual external logging service
    // like DataDog, Splunk, ELK stack, etc.
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      service: 'facepay-api',
      events: events.map(event => ({
        ...event,
        timestamp: event.timestamp.toISOString()
      }))
    }
    
    // In production, send to your logging service
    // await fetch('https://your-logging-service.com/api/logs', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(logEntry)
    // })
    
    // For now, just log to console with structured format
    console.log('[Security Events]', JSON.stringify(logEntry, null, 2))
  }
  
  // Analyze request for threats
  public analyzeRequest(request: NextRequest, requestBody?: any): {
    threats: Array<{ type: string; severity: SecuritySeverity; details: any }>
    riskScore: number
  } {
    const threats: Array<{ type: string; severity: SecuritySeverity; details: any }> = []
    let riskScore = 0
    
    const url = request.nextUrl.toString()
    const userAgent = request.headers.get('user-agent') || ''
    const referer = request.headers.get('referer') || ''
    
    // Analyze URL for threats
    this.analyzeString(url, 'url').forEach(threat => {
      threats.push(threat)
      riskScore += this.getThreatScore(threat.severity)
    })
    
    // Analyze user agent
    this.analyzeString(userAgent, 'user_agent').forEach(threat => {
      threats.push(threat)
      riskScore += this.getThreatScore(threat.severity)
    })
    
    // Analyze request body if provided
    if (requestBody) {
      const bodyString = typeof requestBody === 'string' ? 
        requestBody : JSON.stringify(requestBody)
      
      this.analyzeString(bodyString, 'request_body').forEach(threat => {
        threats.push(threat)
        riskScore += this.getThreatScore(threat.severity)
      })
    }
    
    // Check for suspicious patterns
    threats.push(...this.detectSuspiciousPatterns(request))
    
    return { threats, riskScore }
  }
  
  // Analyze string for threat patterns
  private analyzeString(str: string, source: string): Array<{ type: string; severity: SecuritySeverity; details: any }> {
    const threats: Array<{ type: string; severity: SecuritySeverity; details: any }> = []
    
    // Check SQL injection
    THREAT_PATTERNS.sqlInjection.forEach(pattern => {
      const match = str.match(pattern)
      if (match) {
        threats.push({
          type: 'sql_injection',
          severity: SecuritySeverity.HIGH,
          details: { source, pattern: pattern.toString(), match: match[0] }
        })
      }
    })
    
    // Check XSS
    THREAT_PATTERNS.xss.forEach(pattern => {
      const match = str.match(pattern)
      if (match) {
        threats.push({
          type: 'xss_attempt',
          severity: SecuritySeverity.HIGH,
          details: { source, pattern: pattern.toString(), match: match[0] }
        })
      }
    })
    
    // Check path traversal
    THREAT_PATTERNS.pathTraversal.forEach(pattern => {
      const match = str.match(pattern)
      if (match) {
        threats.push({
          type: 'path_traversal',
          severity: SecuritySeverity.MEDIUM,
          details: { source, pattern: pattern.toString(), match: match[0] }
        })
      }
    })
    
    // Check command injection
    THREAT_PATTERNS.commandInjection.forEach(pattern => {
      const match = str.match(pattern)
      if (match) {
        threats.push({
          type: 'command_injection',
          severity: SecuritySeverity.CRITICAL,
          details: { source, pattern: pattern.toString(), match: match[0] }
        })
      }
    })
    
    // Check NoSQL injection
    THREAT_PATTERNS.nosqlInjection.forEach(pattern => {
      const match = str.match(pattern)
      if (match) {
        threats.push({
          type: 'nosql_injection',
          severity: SecuritySeverity.HIGH,
          details: { source, pattern: pattern.toString(), match: match[0] }
        })
      }
    })
    
    return threats
  }
  
  // Detect suspicious patterns
  private detectSuspiciousPatterns(request: NextRequest): Array<{ type: string; severity: SecuritySeverity; details: any }> {
    const threats: Array<{ type: string; severity: SecuritySeverity; details: any }> = []
    const userAgent = request.headers.get('user-agent') || ''
    const path = request.nextUrl.pathname
    
    // Detect bot-like user agents
    const botPatterns = [
      /bot/i, /crawler/i, /spider/i, /scraper/i,
      /automated/i, /script/i, /python/i, /curl/i,
      /wget/i, /httpie/i, /postman/i
    ]
    
    if (botPatterns.some(pattern => pattern.test(userAgent))) {
      threats.push({
        type: 'bot_detection',
        severity: SecuritySeverity.LOW,
        details: { userAgent, suspiciousPattern: true }
      })
    }
    
    // Detect scanner tools
    const scannerPatterns = [
      /nmap/i, /nikto/i, /sqlmap/i, /burp/i, /owasp/i,
      /zap/i, /nessus/i, /openvas/i, /acunetix/i
    ]
    
    if (scannerPatterns.some(pattern => pattern.test(userAgent))) {
      threats.push({
        type: 'scanner_detection',
        severity: SecuritySeverity.HIGH,
        details: { userAgent, scannerTool: true }
      })
    }
    
    // Detect unusual paths
    const suspiciousPaths = [
      /admin/i, /config/i, /backup/i, /.env/i,
      /phpinfo/i, /wp-admin/i, /.git/i, /debug/i,
      /test/i, /tmp/i, /var/i, /etc/i
    ]
    
    if (suspiciousPaths.some(pattern => pattern.test(path))) {
      threats.push({
        type: 'suspicious_path',
        severity: SecuritySeverity.MEDIUM,
        details: { path, attemptedAccess: true }
      })
    }
    
    return threats
  }
  
  // Get threat score based on severity
  private getThreatScore(severity: SecuritySeverity): number {
    switch (severity) {
      case SecuritySeverity.LOW: return 1
      case SecuritySeverity.MEDIUM: return 3
      case SecuritySeverity.HIGH: return 7
      case SecuritySeverity.CRITICAL: return 15
      default: return 0
    }
  }
}

// Utility functions for easy logging
export const securityLogger = CoreSecurityLogger.getInstance()

// Simple interface for admin API compatibility
export class AdminSecurityLogger {
  private component: string;

  constructor(component: string) {
    this.component = component;
  }

  async log(
    action: string,
    actor: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      // Use the existing security logger system
      await securityLogger.logEvent({
        type: action as any, // Convert to SecurityEventType if needed
        severity: SecuritySeverity.MEDIUM,
        userId: actor === 'admin' ? undefined : actor,
        ipAddress: 'localhost', // In real app, get from request
        userAgent: 'admin-api',
        path: `/admin/${this.component}`,
        method: 'API',
        details: {
          ...metadata,
          component: this.component,
          action,
          actor
        }
      });
    } catch (error) {
      console.error(`[${this.component}] Security logging failed:`, error);
    }
  }
}

// For backward compatibility with admin APIs
export { AdminSecurityLogger as SecurityLogger }

export function logAuthSuccess(userId: string, request: NextRequest, sessionId?: string): void {
  securityLogger.logEvent({
    type: SecurityEventType.AUTHENTICATION_SUCCESS,
    severity: SecuritySeverity.LOW,
    userId,
    sessionId,
    ipAddress: getClientIP(request),
    userAgent: request.headers.get('user-agent') || 'unknown',
    path: request.nextUrl.pathname,
    method: request.method,
    details: {
      timestamp: new Date().toISOString(),
      success: true
    }
  })
}

export function logAuthFailure(request: NextRequest, reason: string, userId?: string): void {
  securityLogger.logEvent({
    type: SecurityEventType.AUTHENTICATION_FAILED,
    severity: SecuritySeverity.MEDIUM,
    userId,
    ipAddress: getClientIP(request),
    userAgent: request.headers.get('user-agent') || 'unknown',
    path: request.nextUrl.pathname,
    method: request.method,
    details: {
      reason,
      timestamp: new Date().toISOString()
    }
  })
}

export function logRateLimitExceeded(request: NextRequest, limit: number, window: number): void {
  securityLogger.logEvent({
    type: SecurityEventType.RATE_LIMIT_EXCEEDED,
    severity: SecuritySeverity.MEDIUM,
    ipAddress: getClientIP(request),
    userAgent: request.headers.get('user-agent') || 'unknown',
    path: request.nextUrl.pathname,
    method: request.method,
    details: {
      limit,
      window,
      timestamp: new Date().toISOString()
    }
  })
}

export function logSuspiciousActivity(request: NextRequest, activity: string, userId?: string, severity: SecuritySeverity = SecuritySeverity.MEDIUM): void {
  securityLogger.logEvent({
    type: SecurityEventType.SUSPICIOUS_ACTIVITY,
    severity,
    userId,
    ipAddress: getClientIP(request),
    userAgent: request.headers.get('user-agent') || 'unknown',
    path: request.nextUrl.pathname,
    method: request.method,
    details: {
      activity,
      timestamp: new Date().toISOString()
    }
  })
}

export function logPaymentFraud(request: NextRequest, details: any, userId?: string): void {
  securityLogger.logEvent({
    type: SecurityEventType.PAYMENT_FRAUD_ATTEMPT,
    severity: SecuritySeverity.CRITICAL,
    userId,
    ipAddress: getClientIP(request),
    userAgent: request.headers.get('user-agent') || 'unknown',
    path: request.nextUrl.pathname,
    method: request.method,
    details: {
      ...details,
      timestamp: new Date().toISOString()
    }
  })
}

// Threat analysis middleware
export function analyzeThreatLevel(request: NextRequest, requestBody?: any): {
  shouldBlock: boolean
  threats: any[]
  riskScore: number
} {
  const analysis = securityLogger.analyzeRequest(request, requestBody)
  const shouldBlock = analysis.riskScore >= 10 || 
    analysis.threats.some(threat => threat.severity === SecuritySeverity.CRITICAL)
  
  if (shouldBlock) {
    logSuspiciousActivity(
      request, 
      'High-risk request blocked by threat analysis', 
      undefined, 
      SecuritySeverity.HIGH
    )
  }
  
  return {
    shouldBlock,
    threats: analysis.threats,
    riskScore: analysis.riskScore
  }
}

// Helper function to get client IP
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const real = request.headers.get('x-real-ip')
  const connectingIP = request.headers.get('x-connecting-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  return real || connectingIP || 'unknown'
}

// Anomaly detection for user behavior
export class AnomalyDetector {
  private static userPatterns = new Map<string, {
    locations: Set<string>
    devices: Set<string>
    timings: number[]
    paths: Map<string, number>
  }>()
  
  public static analyzeUserBehavior(userId: string, request: NextRequest): {
    anomalies: string[]
    riskScore: number
  } {
    const ip = getClientIP(request)
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const path = request.nextUrl.pathname
    const currentTime = new Date().getHours()
    
    let userPattern = this.userPatterns.get(userId)
    if (!userPattern) {
      userPattern = {
        locations: new Set(),
        devices: new Set(),
        timings: [],
        paths: new Map()
      }
      this.userPatterns.set(userId, userPattern)
    }
    
    const anomalies: string[] = []
    let riskScore = 0
    
    // Check for new location
    if (!userPattern.locations.has(ip)) {
      anomalies.push('new_location')
      riskScore += 3
      userPattern.locations.add(ip)
    }
    
    // Check for new device
    const deviceFingerprint = userAgent.substring(0, 50)
    if (!userPattern.devices.has(deviceFingerprint)) {
      anomalies.push('new_device')
      riskScore += 2
      userPattern.devices.add(deviceFingerprint)
    }
    
    // Check for unusual timing
    const averageTime = userPattern.timings.reduce((a, b) => a + b, 0) / userPattern.timings.length
    if (userPattern.timings.length > 5 && Math.abs(currentTime - averageTime) > 4) {
      anomalies.push('unusual_timing')
      riskScore += 1
    }
    userPattern.timings.push(currentTime)
    if (userPattern.timings.length > 24) {
      userPattern.timings.shift() // Keep only recent timings
    }
    
    // Check for unusual path access
    const pathCount = userPattern.paths.get(path) || 0
    userPattern.paths.set(path, pathCount + 1)
    
    // If accessing sensitive path for first time
    const sensitivePaths = ['/api/users/profile', '/api/payments/', '/api/transactions/']
    if (pathCount === 0 && sensitivePaths.some(sp => path.startsWith(sp))) {
      anomalies.push('first_time_sensitive_access')
      riskScore += 2
    }
    
    return { anomalies, riskScore }
  }
}