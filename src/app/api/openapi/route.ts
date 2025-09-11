import { NextRequest, NextResponse } from 'next/server'
import { openApiSpec } from '@/lib/openapi-spec'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json'
    const version = searchParams.get('version') || 'latest'

    const spec = openApiSpec.getSpec(version)
    
    if (format === 'yaml') {
      return new NextResponse(openApiSpec.toYaml(spec), {
        headers: {
          'Content-Type': 'application/x-yaml',
          'Content-Disposition': `attachment; filename="facepay-api-${version}.yaml"`,
          'Cache-Control': 'public, max-age=3600'
        }
      })
    }

    return NextResponse.json(spec, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600'
      }
    })

  } catch (error) {
    console.error('Error generating OpenAPI spec:', error)
    return NextResponse.json(
      { error: 'Failed to generate OpenAPI specification' },
      { status: 500 }
    )
  }
}