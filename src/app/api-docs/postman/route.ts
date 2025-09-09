import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET(request: NextRequest) {
  try {
    const collectionPath = path.join(process.cwd(), 'postman', 'collection.json')
    
    if (!fs.existsSync(collectionPath)) {
      return NextResponse.json(
        { error: 'Postman collection not found' },
        { status: 404 }
      )
    }

    const collection = fs.readFileSync(collectionPath, 'utf8')
    const collectionData = JSON.parse(collection)

    // Update base URL based on environment
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://api.facepay.com/v1'
      : request.nextUrl.origin + '/api'

    // Update collection variables
    collectionData.variable = collectionData.variable?.map((variable: any) => {
      if (variable.key === 'baseUrl') {
        return {
          ...variable,
          value: baseUrl
        }
      }
      return variable
    })

    const response = NextResponse.json(collectionData)
    
    // Set headers for download
    response.headers.set('Content-Disposition', 'attachment; filename="facepay-api-collection.json"')
    response.headers.set('Content-Type', 'application/json')
    response.headers.set('Cache-Control', 'public, max-age=3600')
    
    return response

  } catch (error) {
    console.error('Error serving Postman collection:', error)
    return NextResponse.json(
      { error: 'Failed to serve Postman collection' },
      { status: 500 }
    )
  }
}

// Also support OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}