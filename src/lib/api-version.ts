/**
 * API Versioning Configuration
 * Manages API versions, deprecation warnings, and compatibility
 */

export interface APIVersion {
  version: string
  releaseDate: string
  deprecated?: boolean
  deprecationDate?: string
  sunsetDate?: string
  changelog: string[]
  breakingChanges?: string[]
}

export const API_VERSIONS: Record<string, APIVersion> = {
  'v1': {
    version: '1.0.0',
    releaseDate: '2024-01-15',
    changelog: [
      'Initial release of FacePay API',
      'Complete authentication system with JWT tokens',
      'WebAuthn biometric authentication support',
      'Stripe payment integration',
      'Transaction management and history',
      'Real-time analytics and reporting',
      'Comprehensive error handling and validation',
      'Rate limiting and security features'
    ]
  },
  'v1.1': {
    version: '1.1.0',
    releaseDate: '2024-02-01',
    changelog: [
      'Enhanced WebAuthn support for more authenticators',
      'Improved payment method management',
      'Bulk transaction operations',
      'Advanced filtering for transaction history',
      'Performance optimizations',
      'Additional security enhancements'
    ]
  },
  'v2': {
    version: '2.0.0-beta',
    releaseDate: '2024-03-01',
    changelog: [
      'GraphQL API endpoints (beta)',
      'Webhook improvements with retry logic',
      'Multi-currency support expansion',
      'Enhanced biometric algorithms',
      'Real-time notifications via WebSocket',
      'Advanced fraud detection'
    ],
    breakingChanges: [
      'Authentication token format changed',
      'Some endpoint response structures updated',
      'Deprecated endpoints removed from v1'
    ]
  }
}

export const CURRENT_VERSION = 'v1'
export const LATEST_VERSION = 'v1.1'
export const BETA_VERSION = 'v2'

export class APIVersionManager {
  static getCurrentVersion(): APIVersion {
    return API_VERSIONS[CURRENT_VERSION]
  }

  static getLatestVersion(): APIVersion {
    return API_VERSIONS[LATEST_VERSION]
  }

  static getVersion(version: string): APIVersion | undefined {
    return API_VERSIONS[version]
  }

  static isVersionDeprecated(version: string): boolean {
    const versionInfo = API_VERSIONS[version]
    return versionInfo?.deprecated === true
  }

  static getDeprecationWarning(version: string): string | null {
    const versionInfo = API_VERSIONS[version]
    if (versionInfo?.deprecated && versionInfo.sunsetDate) {
      return `API version ${version} is deprecated and will be sunset on ${versionInfo.sunsetDate}. Please migrate to ${LATEST_VERSION}.`
    }
    return null
  }

  static getAllVersions(): Record<string, APIVersion> {
    return API_VERSIONS
  }

  static getVersionFromHeader(acceptVersion?: string): string {
    if (!acceptVersion) return CURRENT_VERSION
    
    // Check if requested version exists
    if (API_VERSIONS[acceptVersion]) {
      return acceptVersion
    }

    // Fall back to current version
    return CURRENT_VERSION
  }

  static createVersionHeaders(version: string): Record<string, string> {
    const headers: Record<string, string> = {
      'API-Version': version,
      'API-Version-Current': CURRENT_VERSION,
      'API-Version-Latest': LATEST_VERSION
    }

    const deprecationWarning = this.getDeprecationWarning(version)
    if (deprecationWarning) {
      headers['API-Deprecation-Warning'] = deprecationWarning
    }

    return headers
  }
}

// Middleware helper for version handling
export function handleAPIVersion(request: Request): {
  version: string
  headers: Record<string, string>
  warnings: string[]
} {
  const acceptVersion = request.headers.get('Accept-Version') || 
                       request.headers.get('API-Version')
  
  const version = APIVersionManager.getVersionFromHeader(acceptVersion || undefined)
  const headers = APIVersionManager.createVersionHeaders(version)
  const warnings: string[] = []

  // Add deprecation warning if applicable
  const deprecationWarning = APIVersionManager.getDeprecationWarning(version)
  if (deprecationWarning) {
    warnings.push(deprecationWarning)
  }

  return { version, headers, warnings }
}