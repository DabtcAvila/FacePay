# FacePay Backend API Documentation

## Overview
This document provides comprehensive documentation for all FacePay backend API endpoints. All APIs are built with Next.js API routes, TypeScript, Prisma, and follow RESTful conventions.

## Base URL
```
http://localhost:3000/api
```

## Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## 📋 API Endpoints Summary

### Authentication & Users
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh JWT tokens
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `DELETE /api/users/profile` - Delete user account

### Biometric Data
- `POST /api/biometric/face` - Store face data (encrypted)
- `PUT /api/biometric/face` - Verify face data
- `GET /api/biometric/face` - Get user's face data records
- `DELETE /api/biometric/face` - Remove face data

### Payment Processing (Stripe)
- `POST /api/payments/stripe/setup-intent` - Create setup intent
- `POST /api/payments/stripe/payment-intent` - Create payment intent
- `PUT /api/payments/stripe/payment-intent` - Confirm payment intent

### Payment Methods
- `GET /api/payments/methods` - List payment methods
- `POST /api/payments/methods` - Add payment method
- `GET /api/payments/methods/[id]` - Get specific payment method
- `PUT /api/payments/methods/[id]` - Update payment method
- `DELETE /api/payments/methods/[id]` - Delete payment method

### Transactions
- `GET /api/transactions` - List transactions (paginated)
- `POST /api/transactions` - Create transaction
- `GET /api/transactions/[id]` - Get specific transaction
- `PUT /api/transactions/[id]` - Update transaction
- `DELETE /api/transactions/[id]` - Delete transaction

### WebAuthn
- `POST /api/webauthn/register-options` - Get registration options
- `POST /api/webauthn/register-verify` - Verify registration
- `POST /api/webauthn/authenticate-options` - Get authentication options
- `POST /api/webauthn/authenticate-verify` - Verify authentication

### Analytics
- `GET /api/analytics/stats` - Get user statistics
- `GET /api/health` - Health check

---

## 🔐 Authentication Endpoints

### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "name": "John Doe",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "clxxxx",
      "email": "user@example.com",
      "name": "John Doe",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 900
    }
  },
  "message": "User registered successfully"
}
```

### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

---

## 👤 User Management Endpoints

### Get User Profile
```http
GET /api/users/profile
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "clxxxx",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "biometricData": [
      {
        "id": "clxxxx",
        "type": "face",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "isActive": true
      }
    ],
    "paymentMethods": [...],
    "_count": {
      "transactions": 5
    }
  }
}
```

---

## 🔍 Biometric Data Endpoints

### Store Face Data
```http
POST /api/biometric/face
Authorization: Bearer <token>
Content-Type: application/json

{
  "faceData": "base64-encoded-face-template",
  "replaceExisting": true
}
```

### Verify Face Data
```http
PUT /api/biometric/face
Authorization: Bearer <token>
Content-Type: application/json

{
  "faceData": "base64-encoded-face-template",
  "threshold": 0.8
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "verified": true,
    "confidence": 0.95,
    "threshold": 0.8,
    "userId": "clxxxx"
  }
}
```

---

## 💳 Payment Processing Endpoints

### Create Setup Intent (Add Payment Method)
```http
POST /api/payments/stripe/setup-intent
Authorization: Bearer <token>
Content-Type: application/json

{
  "paymentMethodTypes": ["card"]
}
```

### Create Payment Intent
```http
POST /api/payments/stripe/payment-intent
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 10.99,
  "currency": "USD",
  "paymentMethodId": "pm_xxxxxx",
  "description": "Payment for service"
}
```

---

## 💰 Payment Methods Endpoints

### List Payment Methods
```http
GET /api/payments/methods
Authorization: Bearer <token>
```

### Add Payment Method
```http
POST /api/payments/methods
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "card",
  "provider": "stripe",
  "stripePaymentMethodId": "pm_xxxxxx",
  "isDefault": true
}
```

---

## 📊 Transaction Endpoints

### List Transactions (Paginated)
```http
GET /api/transactions?page=1&limit=20&status=completed&sortBy=createdAt&sortOrder=desc
Authorization: Bearer <token>
```

### Create Transaction
```http
POST /api/transactions
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 25.50,
  "currency": "USD",
  "paymentMethodId": "clxxxx",
  "description": "Product purchase",
  "metadata": {
    "productId": "prod_123",
    "quantity": 2
  }
}
```

---

## 🔑 WebAuthn Endpoints

### Get Registration Options
```http
POST /api/webauthn/register-options
Authorization: Bearer <token>
```

### Verify Registration
```http
POST /api/webauthn/register-verify
Authorization: Bearer <token>
Content-Type: application/json

{
  "credential": {
    "id": "credential-id",
    "rawId": "raw-credential-id",
    "response": {
      "attestationObject": "attestation-object",
      "clientDataJSON": "client-data-json"
    },
    "type": "public-key"
  }
}
```

---

## 📈 Analytics Endpoints

### Get User Statistics
```http
GET /api/analytics/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalTransactions": 25,
      "completedTransactions": 23,
      "failedTransactions": 2,
      "totalAmount": 1250.50,
      "paymentMethodsCount": 3,
      "biometricDataCount": 1,
      "successRate": 92
    },
    "breakdown": {
      "byStatus": {
        "completed": 23,
        "failed": 2
      },
      "byPaymentMethod": {
        "card": 2,
        "crypto": 1
      }
    },
    "trends": {
      "monthlyVolume": [...]
    },
    "recentActivity": [...]
  }
}
```

---

## 🏥 Health Check

### Health Check
```http
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "FacePay API",
  "version": "1.0.0"
}
```

---

## 🔧 Error Responses

All API endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message here"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate data)
- `500` - Internal Server Error

---

## 🧪 Testing the APIs

### Quick Test Commands

#### 1. Health Check
```bash
curl http://localhost:3000/api/health
```

#### 2. Register User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User","password":"password123"}'
```

#### 3. Login User
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

#### 4. Get Profile (with token)
```bash
curl http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🔒 Security Features

1. **JWT Authentication**: 15-minute access tokens with 7-day refresh tokens
2. **Encrypted Biometric Data**: Face data encrypted using AES-256-GCM
3. **Input Validation**: Zod schemas for all request validation
4. **Rate Limiting**: Built-in Next.js rate limiting (can be extended)
5. **CORS Protection**: Configured for specific origins
6. **SQL Injection Protection**: Prisma ORM with parameterized queries

---

## 🚀 Quick Setup

1. Copy `.env.example` to `.env` and fill in values
2. Run `npm install`
3. Run `npx prisma db push` to create database tables
4. Run `npm run dev` to start the server
5. Test endpoints using the examples above

---

## 📝 Notes

- All monetary amounts are in decimal format (e.g., 10.99)
- Timestamps are in ISO 8601 format
- Face data should be base64-encoded biometric templates
- WebAuthn endpoints require proper browser integration
- Stripe endpoints require valid Stripe keys
- All endpoints support JSON request/response format only