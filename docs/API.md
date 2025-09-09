# FacePay API Documentation

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/facepay/api)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Status](https://img.shields.io/badge/status-production-brightgreen.svg)](https://api.facepay.com/health)

## Overview

FacePay is a cutting-edge biometric payment platform that combines advanced facial recognition technology with secure payment processing. Our API provides comprehensive endpoints for user management, payment processing, biometric authentication, and transaction handling.

### 🔑 Key Features

- **🔐 Biometric Authentication**: WebAuthn-based face recognition and fingerprint authentication
- **💳 Multi-Payment Support**: Stripe, crypto, and traditional payment methods  
- **🛡️ Enhanced Security**: Advanced threat detection and anomaly analysis
- **📊 Analytics Dashboard**: Comprehensive payment and security analytics
- **🔄 Real-time Processing**: Instant transaction processing and validation
- **⚡ High Performance**: 99.9% uptime with sub-200ms response times

## Base URLs

| Environment | Base URL | Description |
|------------|----------|-------------|
| Production | `https://api.facepay.com/v1` | Live production API |
| Staging | `https://api-staging.facepay.com/v1` | Testing environment |
| Development | `http://localhost:3000/api` | Local development |

## Authentication

FacePay API uses JWT (JSON Web Tokens) for authentication. Most endpoints require an `Authorization` header with a valid JWT token.

### Getting Started

1. **Register/Login** to get your JWT tokens
2. **Include the token** in all authenticated requests
3. **Refresh tokens** before they expire

### Authentication Header Format

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### Token Types

| Token Type | Purpose | Lifetime | Refresh |
|-----------|---------|----------|---------|
| Access Token | API authentication | 1 hour | Required |
| Refresh Token | Token renewal | 30 days | Optional |

### Example Authentication Flow

```javascript
// 1. Login to get tokens
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'securepassword'
  })
});

const { tokens } = await loginResponse.json();

// 2. Use access token for API calls
const apiResponse = await fetch('/api/users/profile', {
  headers: {
    'Authorization': `Bearer ${tokens.accessToken}`
  }
});

// 3. Refresh token when needed
const refreshResponse = await fetch('/api/auth/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    refreshToken: tokens.refreshToken
  })
});
```

## Rate Limiting

FacePay implements rate limiting to ensure fair usage and system stability:

| Endpoint Category | Limit | Window | Headers |
|------------------|--------|---------|---------|
| Standard endpoints | 1000 req/hour | Per user | `X-Rate-Limit-*` |
| Authentication | 10 req/minute | Per IP | `X-Rate-Limit-*` |
| Payment processing | 100 req/hour | Per user | `X-Rate-Limit-*` |
| WebAuthn | 20 req/minute | Per user | `X-Rate-Limit-*` |

### Rate Limit Headers

```http
X-Rate-Limit-Limit: 1000
X-Rate-Limit-Remaining: 999  
X-Rate-Limit-Reset: 1640995200
X-Rate-Limit-Window: 3600
```

## Error Handling

All API responses follow a consistent error format:

### Error Response Structure

```json
{
  "success": false,
  "error": "Human readable error message",
  "code": "ERROR_CODE_CONSTANT", 
  "details": {
    "additional": "contextual information"
  }
}
```

### HTTP Status Codes

| Status | Meaning | Usage |
|--------|---------|-------|
| `200` | OK | Successful request |
| `201` | Created | Resource created successfully |
| `400` | Bad Request | Invalid request parameters |
| `401` | Unauthorized | Authentication required |
| `403` | Forbidden | Insufficient permissions |
| `404` | Not Found | Resource not found |
| `409` | Conflict | Resource conflict (e.g., duplicate email) |
| `422` | Unprocessable Entity | Validation errors |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Server error |
| `503` | Service Unavailable | Service temporarily unavailable |

### Common Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| `UNAUTHORIZED` | Invalid or missing authentication | Provide valid JWT token |
| `FORBIDDEN` | Insufficient permissions | Check user permissions |
| `VALIDATION_ERROR` | Request validation failed | Fix request parameters |
| `RATE_LIMIT_EXCEEDED` | Too many requests | Wait and retry |
| `RESOURCE_NOT_FOUND` | Requested resource not found | Check resource ID |
| `PAYMENT_FAILED` | Payment processing error | Check payment details |
| `BIOMETRIC_FAILED` | Biometric authentication failed | Retry biometric auth |

## Pagination

List endpoints support cursor-based pagination:

### Parameters

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `page` | integer | 1 | - | Page number (1-based) |
| `limit` | integer | 20 | 100 | Items per page |
| `sortBy` | string | `createdAt` | - | Sort field |
| `sortOrder` | string | `desc` | - | Sort direction (`asc`/`desc`) |

### Response Format

```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

## API Endpoints

### 🔐 Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/login` | User login with email/password |
| `POST` | `/auth/register` | Create new user account |
| `POST` | `/auth/refresh` | Refresh access token |
| `POST` | `/auth/demo-login` | Quick demo login (dev only) |

#### Login Example

```bash
curl -X POST https://api.facepay.com/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123"
  }'
```

### 👤 Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/users/profile` | Get user profile |
| `PUT` | `/users/profile` | Update user profile |
| `DELETE` | `/users/profile` | Delete user account |

#### Get Profile Example

```bash
curl -X GET https://api.facepay.com/v1/users/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 💳 Payments

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/payments/stripe/checkout` | Create Stripe checkout session |
| `GET` | `/payments/stripe/checkout` | Get checkout session details |
| `GET` | `/payments/methods` | List payment methods |
| `POST` | `/payments/methods` | Add payment method |
| `DELETE` | `/payments/methods/{id}` | Delete payment method |
| `GET` | `/payments/analytics` | Payment analytics |

#### Create Checkout Session Example

```bash
curl -X POST https://api.facepay.com/v1/payments/stripe/checkout \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 29.99,
    "currency": "USD",
    "description": "Premium Feature Access",
    "successUrl": "https://yourapp.com/success",
    "cancelUrl": "https://yourapp.com/cancel"
  }'
```

### 📊 Transactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/transactions` | List transactions with pagination |
| `POST` | `/transactions` | Create new transaction |
| `GET` | `/transactions/{id}` | Get transaction details |
| `POST` | `/transactions/{id}/refund` | Refund transaction |
| `GET` | `/transactions/history` | Detailed transaction history |
| `POST` | `/transactions/bulk` | Bulk transaction operations |

#### List Transactions Example

```bash
curl -X GET "https://api.facepay.com/v1/transactions?page=1&limit=20&status=completed" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 🔒 WebAuthn (Biometric Authentication)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/webauthn/register/start` | Start biometric registration |
| `POST` | `/webauthn/register/complete` | Complete biometric registration |
| `POST` | `/webauthn/authenticate/start` | Start biometric authentication |
| `POST` | `/webauthn/authenticate/complete` | Complete biometric authentication |
| `GET` | `/webauthn/credentials` | List registered credentials |
| `DELETE` | `/webauthn/credentials` | Delete biometric credential |
| `POST` | `/biometric/face` | Face verification |

#### WebAuthn Registration Flow

```javascript
// 1. Start registration
const startResponse = await fetch('/api/webauthn/register/start', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});
const options = await startResponse.json();

// 2. Use browser WebAuthn API
const credential = await navigator.credentials.create({
  publicKey: options.data
});

// 3. Complete registration
const completeResponse = await fetch('/api/webauthn/register/complete', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    credentialId: credential.id,
    clientDataJSON: credential.response.clientDataJSON,
    attestationObject: credential.response.attestationObject,
    name: 'iPhone Face ID'
  })
});
```

### 📈 Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/analytics/stats` | Get analytics statistics |
| `GET` | `/payments/analytics` | Payment-specific analytics |

#### Analytics Example

```bash
curl -X GET "https://api.facepay.com/v1/analytics/stats?period=month" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 🏥 Health & Monitoring

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | System health check |
| `GET` | `/admin/security-stats` | Security statistics (admin only) |

#### Health Check Example

```bash
curl -X GET https://api.facepay.com/v1/health
```

## WebAuthn Integration

FacePay leverages WebAuthn for secure biometric authentication. Here's how to integrate:

### 1. Registration Process

```javascript
async function registerBiometric() {
  try {
    // Get registration options from server
    const optionsResponse = await fetch('/api/webauthn/register/start', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    const { data: options } = await optionsResponse.json();
    
    // Create credential using WebAuthn
    const credential = await navigator.credentials.create({
      publicKey: {
        ...options,
        challenge: base64ToBuffer(options.challenge),
        user: {
          ...options.user,
          id: base64ToBuffer(options.user.id)
        }
      }
    });
    
    // Complete registration on server
    const registrationResponse = await fetch('/api/webauthn/register/complete', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        credentialId: credential.id,
        clientDataJSON: bufferToBase64(credential.response.clientDataJSON),
        attestationObject: bufferToBase64(credential.response.attestationObject),
        name: 'My Biometric Device'
      })
    });
    
    console.log('Biometric registration successful!');
  } catch (error) {
    console.error('Registration failed:', error);
  }
}
```

### 2. Authentication Process

```javascript
async function authenticateWithBiometric(email) {
  try {
    // Get authentication options
    const optionsResponse = await fetch('/api/webauthn/authenticate/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    
    const { data: options } = await optionsResponse.json();
    
    // Perform authentication
    const assertion = await navigator.credentials.get({
      publicKey: {
        ...options,
        challenge: base64ToBuffer(options.challenge),
        allowCredentials: options.allowCredentials.map(cred => ({
          ...cred,
          id: base64ToBuffer(cred.id)
        }))
      }
    });
    
    // Complete authentication
    const authResponse = await fetch('/api/webauthn/authenticate/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        credentialId: assertion.id,
        clientDataJSON: bufferToBase64(assertion.response.clientDataJSON),
        authenticatorData: bufferToBase64(assertion.response.authenticatorData),
        signature: bufferToBase64(assertion.response.signature)
      })
    });
    
    const { data: authResult } = await authResponse.json();
    
    // Store tokens and redirect
    localStorage.setItem('accessToken', authResult.tokens.accessToken);
    localStorage.setItem('refreshToken', authResult.tokens.refreshToken);
    
    console.log('Biometric authentication successful!');
  } catch (error) {
    console.error('Authentication failed:', error);
  }
}
```

### 3. Utility Functions

```javascript
function base64ToBuffer(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
```

## Payment Integration

### Stripe Checkout Integration

```javascript
async function createPayment(amount, description) {
  try {
    // Create checkout session
    const response = await fetch('/api/payments/stripe/checkout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: amount,
        currency: 'USD',
        description: description,
        successUrl: `${window.location.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/payment/cancel`,
        mode: 'payment'
      })
    });
    
    const { data } = await response.json();
    
    // Redirect to Stripe Checkout
    window.location.href = data.sessionUrl;
    
  } catch (error) {
    console.error('Payment creation failed:', error);
  }
}

// Handle successful payment
async function handlePaymentSuccess(sessionId) {
  const response = await fetch(`/api/payments/stripe/checkout?session_id=${sessionId}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  
  const sessionDetails = await response.json();
  console.log('Payment completed:', sessionDetails);
}
```

## SDK Examples

### JavaScript/TypeScript SDK

```typescript
import { FacePayAPI } from '@facepay/sdk';

const api = new FacePayAPI({
  baseURL: 'https://api.facepay.com/v1',
  accessToken: 'your-access-token'
});

// User operations
const profile = await api.users.getProfile();
await api.users.updateProfile({ name: 'John Doe' });

// Payment operations
const checkout = await api.payments.createCheckout({
  amount: 29.99,
  description: 'Premium subscription'
});

// Transaction operations
const transactions = await api.transactions.list({
  page: 1,
  limit: 20,
  status: 'completed'
});

// Biometric operations
const credentials = await api.webauthn.listCredentials();
```

### Python SDK

```python
from facepay import FacePayAPI

api = FacePayAPI(
    base_url='https://api.facepay.com/v1',
    access_token='your-access-token'
)

# User operations
profile = api.users.get_profile()
api.users.update_profile(name='John Doe')

# Payment operations
checkout = api.payments.create_checkout(
    amount=29.99,
    description='Premium subscription'
)

# Transaction operations
transactions = api.transactions.list(
    page=1,
    limit=20,
    status='completed'
)
```

## Webhooks

FacePay sends webhooks for important events. Configure webhook endpoints in your dashboard.

### Supported Events

| Event | Description |
|-------|-------------|
| `payment.completed` | Payment successfully processed |
| `payment.failed` | Payment processing failed |
| `user.registered` | New user registered |
| `biometric.registered` | Biometric credential registered |
| `transaction.refunded` | Transaction refunded |

### Webhook Payload Example

```json
{
  "event": "payment.completed",
  "data": {
    "transactionId": "txn_abc123",
    "amount": 29.99,
    "currency": "USD",
    "userId": "usr_def456",
    "timestamp": "2024-01-15T14:30:00Z"
  },
  "signature": "webhook-signature"
}
```

### Verifying Webhooks

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
    
  return signature === expectedSignature;
}
```

## Security Best Practices

### 1. Token Security
- Store tokens securely (HTTPOnly cookies recommended)
- Implement automatic token refresh
- Never expose tokens in URLs or logs
- Use HTTPS for all API communications

### 2. Rate Limiting
- Implement client-side rate limiting
- Handle 429 responses gracefully
- Use exponential backoff for retries

### 3. Error Handling
- Never expose sensitive information in errors
- Log errors securely
- Implement proper fallback mechanisms

### 4. Biometric Security
- Always use HTTPS for biometric operations
- Implement proper error handling for failed authentication
- Provide fallback authentication methods

## Testing

### Postman Collection

Import our Postman collection for easy API testing:

```bash
# Download collection
curl -O https://api.facepay.com/v1/postman/collection.json

# Or use the pre-configured collection
# Available at: https://documenter.getpostman.com/view/facepay-api
```

### Test Environment

Use our staging environment for development:

```
Base URL: https://api-staging.facepay.com/v1
Test Cards: Use Stripe test card numbers
Demo Account: demo@facepay.com / demo123456
```

### Test Data

```json
{
  "testUsers": [
    {
      "email": "test1@facepay.com",
      "password": "testpass123",
      "role": "user"
    },
    {
      "email": "admin@facepay.com", 
      "password": "adminpass123",
      "role": "admin"
    }
  ],
  "testCards": [
    {
      "number": "4242424242424242",
      "exp_month": 12,
      "exp_year": 2025,
      "cvc": "123"
    }
  ]
}
```

## Support

### Documentation
- **Interactive API Docs**: https://api.facepay.com/v1/docs
- **Postman Collection**: https://documenter.getpostman.com/view/facepay-api
- **GitHub Repository**: https://github.com/facepay/api-docs

### Support Channels
- **Technical Support**: api-support@facepay.com
- **Documentation Issues**: docs@facepay.com
- **Security Concerns**: security@facepay.com
- **Business Inquiries**: business@facepay.com

### Response Times
- Critical Issues: < 2 hours
- Standard Support: < 24 hours
- Documentation Updates: < 48 hours

---

**Last Updated**: January 2024  
**API Version**: 1.0.0  
**Documentation Version**: 1.0.0

For the most up-to-date information, visit our [interactive API documentation](https://api.facepay.com/v1/docs).