import { NextRequest, NextResponse } from 'next/server'
import { APIVersionManager } from '@/lib/api-version'

// Force this route to be dynamic
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const specific = searchParams.get('version')

    if (specific) {
      // Get specific version info
      const versionInfo = APIVersionManager.getVersion(specific)
      if (!versionInfo) {
        return NextResponse.json(
          { error: `Version ${specific} not found` },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        data: {
          ...versionInfo,
          requestedVersion: specific
        }
      })
    }

    // Get all versions info
    const allVersions = APIVersionManager.getAllVersions()
    const currentVersion = APIVersionManager.getCurrentVersion()
    const latestVersion = APIVersionManager.getLatestVersion()

    const response = NextResponse.json({
      success: true,
      data: {
        current: {
          ...currentVersion
        },
        latest: {
          ...latestVersion
        },
        all: Object.entries(allVersions).map(([key, value]) => ({
          ...value,
          versionKey: key
        })),
        deprecationInfo: {
          policy: 'API versions are supported for at least 12 months after deprecation announcement',
          migrationGuide: 'https://docs.facepay.com/api/migration',
          supportContact: 'api-support@facepay.com'
        },
        compatibility: {
          minimumSupported: 'v1',
          recommended: 'v1.1',
          beta: 'v2'
        }
      }
    })

    // Add version headers
    response.headers.set('API-Version', 'v1')
    response.headers.set('API-Version-Latest', 'v1.1')
    response.headers.set('Cache-Control', 'public, max-age=3600')

    return response

  } catch (error) {
    console.error('Error getting version info:', error)
    return NextResponse.json(
      { error: 'Failed to get version information' },
      { status: 500 }
    )
  }
}