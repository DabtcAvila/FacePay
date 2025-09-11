---
sidebar_position: 1
title: API Overview
description: Complete overview of the FacePay API - secure, RESTful APIs for biometric authentication and payments.
keywords: [API, REST, authentication, biometric, WebAuthn, payments, endpoints]
---

# FacePay API Overview

The **FacePay API** provides secure, RESTful endpoints for biometric authentication and payment processing. Built on modern standards like WebAuthn and FIDO2, it offers enterprise-grade security with developer-friendly APIs.

## API Fundamentals

### Base URL
```
https://api.facepay.com/v1
```

### Authentication
All API requests require authentication using API keys or JWT tokens:

```http
Authorization: Bearer <your-jwt-token>
# OR
X-API-Key: <your-api-key>
```

### Content Type
```http
Content-Type: application/json
```

### Rate Limiting
API calls are rate-limited to ensure system stability:

| Tier | Rate Limit | Burst Limit |
|------|------------|-------------|
| **Free** | 100 req/hour | 10 req/min |
| **Pro** | 1,000 req/hour | 50 req/min |
| **Enterprise** | 10,000 req/hour | 200 req/min |

## API Structure

### Core Endpoints

#### Authentication APIs
Manage user authentication and session management:
- `POST /auth/login` - User login
- `POST /auth/register` - User registration  
- `POST /auth/refresh` - Refresh JWT tokens
- `DELETE /auth/logout` - User logout

#### Biometric APIs
Handle biometric enrollment and verification:
- `POST /biometric/enroll` - Enroll biometric data
- `POST /biometric/authenticate` - Authenticate with biometrics
- `POST /biometric/verify` - Verify biometric credential
- `GET /biometric/credentials` - List user credentials

#### WebAuthn APIs
WebAuthn/FIDO2 standard endpoints:
- `POST /webauthn/register/options` - Get registration options
- `POST /webauthn/register/verify` - Verify registration
- `POST /webauthn/authenticate/options` - Get authentication options
- `POST /webauthn/authenticate/verify` - Verify authentication

#### Payment APIs
Process payments with biometric authentication:
- `POST /payments/process` - Process payment
- `POST /payments/stripe/checkout` - Stripe integration
- `POST /payments/mercadopago/checkout` - MercadoPago integration
- `POST /payments/refund` - Process refunds

## Quick Start Example

Here's a complete authentication flow using the API:

### 1. Register a User
```bash
curl -X POST https://api.facepay.com/v1/auth/register \
  -H "Content-Type: application/json" \
  -H "X-API-Key: pk_test_your_key" \
  -d '{
    "email": "user@example.com",
    "name": "John Doe"
  }'
```

### 2. Get Registration Options
```bash
curl -X POST https://api.facepay.com/v1/webauthn/register/options \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt-token>" \
  -d '{
    "userId": "user_123",
    "userName": "user@example.com",
    "userDisplayName": "John Doe"
  }'
```

### 3. Complete Registration
```bash
curl -X POST https://api.facepay.com/v1/webauthn/register/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt-token>" \
  -d '{
    "credentialId": "credential_data...",
    "clientDataJSON": "client_data...",
    "attestationObject": "attestation_data..."
  }'
```

### 4. Authenticate User
```bash
curl -X POST https://api.facepay.com/v1/webauthn/authenticate/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt-token>" \
  -d '{
    "credentialId": "credential_data...",
    "clientDataJSON": "client_data...",
    "authenticatorData": "auth_data...",
    "signature": "signature_data..."
  }'
```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "email": "user@example.com",
    "verified": true
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req_abc123"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "AUTHENTICATION_FAILED",
    "message": "Biometric authentication failed",
    "details": "User verification did not complete successfully"
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req_abc123"
  }
}
```

## Status Codes

The API uses standard HTTP status codes:

| Code | Meaning | Description |
|------|---------|-------------|
| **200** | OK | Request successful |
| **201** | Created | Resource created successfully |
| **400** | Bad Request | Invalid request parameters |
| **401** | Unauthorized | Invalid or missing authentication |
| **403** | Forbidden | Insufficient permissions |
| **404** | Not Found | Resource not found |
| **409** | Conflict | Resource already exists |
| **429** | Too Many Requests | Rate limit exceeded |
| **500** | Internal Server Error | Server error |
| **503** | Service Unavailable | Service temporarily unavailable |

## Error Codes

Common error codes you'll encounter:

### Authentication Errors
- `INVALID_API_KEY` - API key is invalid or expired
- `INVALID_JWT_TOKEN` - JWT token is invalid or expired
- `AUTHENTICATION_FAILED` - User authentication failed
- `USER_NOT_FOUND` - User does not exist

### Biometric Errors
- `BIOMETRIC_NOT_SUPPORTED` - Device doesn't support biometrics
- `ENROLLMENT_FAILED` - Biometric enrollment failed
- `VERIFICATION_FAILED` - Biometric verification failed
- `CREDENTIAL_NOT_FOUND` - Biometric credential not found

### Payment Errors
- `PAYMENT_FAILED` - Payment processing failed
- `INSUFFICIENT_FUNDS` - Insufficient funds
- `CARD_DECLINED` - Payment card declined
- `PAYMENT_PROVIDER_ERROR` - External payment provider error

### System Errors
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `INTERNAL_SERVER_ERROR` - Server error
- `SERVICE_UNAVAILABLE` - Service temporarily down
- `MAINTENANCE_MODE` - System under maintenance

## SDK Integration

The API is designed to work seamlessly with our SDKs:

### JavaScript SDK
```javascript
import FacePay from '@facepay/sdk';

const facePay = new FacePay({
  apiKey: 'pk_test_your_key',
  baseUrl: 'https://api.facepay.com/v1'
});

// SDK automatically handles API calls
await facePay.enroll('user@example.com');
await facePay.authenticate('user@example.com');
```

### Server SDKs
```python
# Python example
import facepay

client = facepay.Client(api_key='sk_test_your_key')
result = client.users.authenticate(
    user_id='user_123',
    biometric_data=biometric_data
)
```

## Webhooks

Subscribe to real-time events:

```json
{
  "event": "biometric.authentication.completed",
  "data": {
    "userId": "user_123",
    "success": true,
    "biometricType": "Face ID",
    "timestamp": "2024-01-15T10:30:00Z"
  },
  "metadata": {
    "eventId": "evt_abc123",
    "apiVersion": "v1"
  }
}
```

### Available Events
- `biometric.enrollment.completed`
- `biometric.authentication.completed`
- `payment.processed`
- `payment.failed`
- `user.registered`
- `security.anomaly.detected`

## Security Features

### Encryption
- **TLS 1.3** for transport encryption
- **AES-256** for data at rest
- **End-to-end encryption** for biometric data

### Authentication
- **JWT tokens** with RS256 signing
- **API key authentication** with rate limiting
- **FIDO2/WebAuthn** compliance

### Compliance
- **PCI DSS Level 1** certified
- **SOC 2 Type II** compliant
- **GDPR** and **CCPA** compliant
- **ISO 27001** certified

## Testing

### Sandbox Environment
```
https://api.sandbox.facepay.com/v1
```

### Test API Keys
```
# Publishable key (client-side)
pk_test_abcdef123456...

# Secret key (server-side)  
sk_test_abcdef123456...
```

### Test Cards
```json
{
  "number": "4242424242424242",
  "exp_month": 12,
  "exp_year": 2025,
  "cvc": "123"
}
```

## Monitoring & Analytics

### Health Check
```bash
curl https://api.facepay.com/v1/health
```

### Status Page
Monitor API status: [status.facepay.com](https://status.facepay.com)

### Real-time Metrics
- Response times
- Success rates
- Error rates
- Geographic distribution

## OpenAPI Specification

Full OpenAPI/Swagger documentation available:

- **Interactive Explorer**: [api-docs.facepay.com](https://api-docs.facepay.com)
- **OpenAPI JSON**: [api.facepay.com/v1/openapi.json](https://api.facepay.com/v1/openapi.json)
- **Postman Collection**: [Download Collection](https://api.facepay.com/v1/postman)

## Next Steps

Explore specific API endpoints:

<div style={{display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '2rem'}}>
  <a href="/docs/api/auth/login" className="button button--primary">
    🔐 Authentication APIs
  </a>
  <a href="/docs/api/biometric/enrollment" className="button button--secondary">
    👤 Biometric APIs
  </a>
  <a href="/docs/api/webauthn/register" className="button button--secondary">
    🔑 WebAuthn APIs
  </a>
  <a href="/docs/api/payments/process" className="button button--secondary">
    💳 Payment APIs
  </a>
</div>

### Resources

- **[Postman Collection](https://api.facepay.com/v1/postman)** - Import and test APIs
- **[OpenAPI Spec](https://api.facepay.com/v1/openapi.json)** - Generate client SDKs
- **[Rate Limits Guide](/docs/api/rate-limits)** - Understanding API limits
- **[Webhook Guide](/docs/api/webhooks)** - Real-time event handling
- **[Error Handling](/docs/api/errors)** - Comprehensive error reference

## Support

Need help with the API?

- **Interactive Docs**: [api-docs.facepay.com](https://api-docs.facepay.com)
- **Discord**: [discord.gg/facepay](https://discord.gg/facepay)
- **GitHub**: [github.com/facepay/api/issues](https://github.com/facepay/api/issues)
- **Email**: [api-support@facepay.com](mailto:api-support@facepay.com)

---

**Secure, fast, and developer-friendly.** Start building with the FacePay API today! 🚀