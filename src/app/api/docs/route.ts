import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const baseUrl = request.nextUrl.origin
    const apiBaseUrl = `${baseUrl}/api`

    const documentation = {
      title: 'FacePay API Documentation Hub',
      version: '1.1.0',
      description: 'Complete developer resources for FacePay API integration',
      baseUrl: apiBaseUrl,
      lastUpdated: new Date().toISOString(),

      quickStart: {
        title: 'Quick Start Guide',
        steps: [
          {
            step: 1,
            title: 'Authentication',
            endpoint: `POST ${apiBaseUrl}/auth/register`,
            description: 'Create account and get credentials'
          },
          {
            step: 2,
            title: 'Login & Get Token', 
            endpoint: `POST ${apiBaseUrl}/auth/login`,
            description: 'Authenticate and receive access token'
          },
          {
            step: 3,
            title: 'Make Your First API Call',
            endpoint: `GET ${apiBaseUrl}/users/profile`,
            description: 'Test your integration'
          }
        ]
      },

      specifications: {
        openapi: {
          title: 'OpenAPI 3.0 Specification',
          description: 'Complete API specification in OpenAPI format',
          urls: {
            json: `${apiBaseUrl}/openapi`,
            yaml: `${apiBaseUrl}/openapi?format=yaml`
          }
        },
        postman: {
          title: 'Postman Collection',
          description: 'Ready-to-use Postman collection with examples',
          urls: {
            collection: `${apiBaseUrl}/api-docs/postman`,
            download: `${apiBaseUrl}/api-docs/postman?download=true`
          }
        }
      },

      rateLimiting: {
        title: 'Rate Limiting',
        tiers: [
          { name: 'Free', limit: '100 requests/hour', identifier: 'IP address' },
          { name: 'Pro', limit: '1,000 requests/hour', identifier: 'User ID' },
          { name: 'Enterprise', limit: '10,000 requests/hour', identifier: 'API Key' }
        ],
        documentationUrl: `${apiBaseUrl}/rate-limits`
      },

      versioning: {
        title: 'API Versioning',
        current: 'v1.1',
        latest: 'v1.1',
        versioningUrl: `${apiBaseUrl}/version`
      },

      support: {
        title: 'Developer Support',
        channels: [
          {
            type: 'Documentation',
            url: 'https://docs.facepay.com'
          },
          {
            type: 'API Support',
            email: 'api-support@facepay.com'
          }
        ]
      }
    }

    return NextResponse.json({
      success: true,
      data: documentation
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300'
      }
    })

  } catch (error) {
    console.error('Error generating API documentation:', error)
    return NextResponse.json(
      { error: 'Failed to generate API documentation' },
      { status: 500 }
    )
  }
}