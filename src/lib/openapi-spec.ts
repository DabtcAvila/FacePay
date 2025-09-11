import { OpenAPIV3 } from 'openapi-types'

export class OpenAPISpecGenerator {
  private baseSpec: OpenAPIV3.Document = {
    openapi: '3.0.3',
    info: {
      title: 'FacePay API',
      version: '1.1.0',
      description: `
# FacePay API Documentation

The FacePay API provides secure, biometric-powered payment processing capabilities. 
This RESTful API enables seamless integration of face recognition authentication 
and secure payment processing into your applications.

## Key Features
- **Biometric Authentication**: Face ID and WebAuthn passkey support
- **Secure Payments**: Multiple payment providers (Stripe, MercadoPago, SPEI)
- **Real-time Security**: Advanced fraud detection and threat analysis
- **Comprehensive Analytics**: Payment and user behavior insights
- **Enterprise Security**: PCI DSS compliant with advanced encryption

## Authentication
All endpoints require authentication via JWT tokens. Use the \`/api/auth/login\` 
endpoint to obtain access tokens.

## Rate Limiting
API calls are rate limited to ensure fair usage and system stability:
- **Free Tier**: 100 requests/hour
- **Pro Tier**: 1,000 requests/hour  
- **Enterprise**: 10,000 requests/hour

## Error Handling
The API uses standard HTTP status codes and returns consistent error responses:
- **4xx**: Client errors (invalid request, authentication, etc.)
- **5xx**: Server errors (system failures, maintenance, etc.)
      `,
      contact: {
        name: 'FacePay API Team',
        email: 'api-support@facepay.com',
        url: 'https://docs.facepay.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'https://api.facepay.com/v1',
        description: 'Production server'
      },
      {
        url: 'http://localhost:3000/api',
        description: 'Development server'
      }
    ],
    security: [{ bearerAuth: [] }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string' },
            code: { type: 'string' }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' }
          }
        }
      }
    },
    paths: {
      '/health': {
        get: {
          tags: ['System'],
          summary: 'Health check',
          responses: {
            '200': { description: 'System healthy' }
          }
        }
      },
      '/auth/login': {
        post: {
          tags: ['Authentication'],
          summary: 'User login',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    email: { type: 'string' },
                    password: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Login successful' },
            '401': { description: 'Invalid credentials' }
          }
        }
      }
    }
  }

  public getSpec(version: string = 'latest'): OpenAPIV3.Document {
    return this.baseSpec
  }

  public toYaml(spec: OpenAPIV3.Document): string {
    return JSON.stringify(spec, null, 2)
  }
}

export const openApiSpec = new OpenAPISpecGenerator()