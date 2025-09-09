# Payment History & Refunds API Documentation

## Overview

This document describes the comprehensive payment history, refund processing, and receipt generation APIs implemented for the FacePay system.

## Authentication

All APIs require authentication via Bearer token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## APIs Implemented

### 1. Enhanced Transaction History API

#### GET `/api/transactions/history`

Retrieves paginated transaction history with advanced filtering and optional analytics.

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 20) - Items per page
- `status` (optional) - Filter by status: pending, completed, failed, refunded
- `paymentMethod` (optional) - Filter by payment method type
- `dateFrom` (optional) - ISO date string for start date
- `dateTo` (optional) - ISO date string for end date
- `amountMin` (optional) - Minimum amount filter
- `amountMax` (optional) - Maximum amount filter
- `search` (optional) - Search in transaction description
- `sortBy` (optional, default: createdAt) - Sort field: createdAt, completedAt, amount, status
- `sortOrder` (optional, default: desc) - Sort order: asc, desc
- `includeAnalytics` (optional, default: false) - Include analytics data

**Example Response:**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "trans_123",
        "amount": 100.00,
        "currency": "USD",
        "status": "completed",
        "description": "Payment for services",
        "createdAt": "2023-01-01T00:00:00Z",
        "completedAt": "2023-01-01T00:01:00Z",
        "paymentMethod": {
          "type": "card",
          "provider": "stripe"
        },
        "isRefunded": false,
        "refundInfo": null
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5,
      "hasNext": true,
      "hasPrev": false
    },
    "analytics": {
      "summary": {
        "totalTransactions": 100,
        "totalAmount": 5000.00,
        "completedAmount": 4500.00,
        "refundedAmount": 200.00,
        "netAmount": 4300.00
      }
    }
  }
}
```

### 2. Refund Processing API

#### POST `/api/transactions/{id}/refund`

Processes a refund for a completed transaction.

**Request Body:**
```json
{
  "amount": 50.00, // Optional, defaults to full amount
  "reason": "Customer requested refund",
  "metadata": {
    "refundType": "partial",
    "requestedBy": "customer"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transaction": {
      "id": "trans_123",
      "status": "refunded",
      // ... other transaction fields
    },
    "refund": {
      "id": "refund_trans_123_1234567890",
      "amount": 50.00,
      "reason": "Customer requested refund",
      "status": "processed",
      "processedAt": "2023-01-01T00:05:00Z"
    }
  },
  "message": "Refund processed successfully"
}
```

#### GET `/api/transactions/{id}/refund`

Retrieves refund information for a transaction.

### 3. Receipt Generation API

#### GET `/api/transactions/{id}/receipt`

Generates receipts in multiple formats.

**Query Parameters:**
- `format` (optional, default: json) - Receipt format: json, html, pdf

**JSON Format Response:**
```json
{
  "success": true,
  "data": {
    "receiptId": "RCP-12345678",
    "transactionId": "trans_123",
    "date": "2023-01-01T00:00:00Z",
    "customer": {
      "name": "John Doe",
      "email": "john@example.com"
    },
    "transaction": {
      "amount": 100.00,
      "currency": "USD",
      "description": "Payment for services",
      "status": "completed",
      "paymentMethod": {
        "type": "card",
        "provider": "stripe",
        "lastFour": "****-1234"
      }
    },
    "businessInfo": {
      "name": "FacePay",
      "address": "123 Payment Street, Fintech City, FC 12345",
      "taxId": "TAX123456789",
      "support": "support@facepay.com"
    },
    "generated": "2023-01-01T00:10:00Z"
  }
}
```

**HTML Format:**
Returns a styled HTML receipt suitable for display or printing.

### 4. Payment Analytics API

#### GET `/api/payments/analytics`

Provides comprehensive payment analytics with time series data.

**Query Parameters:**
- `period` (optional, default: 30d) - Time period: 7d, 30d, 90d, 1y, all
- `granularity` (optional, default: day) - Data granularity: day, week, month
- `timezone` (optional, default: UTC) - Timezone for data aggregation
- `includeRefunds` (optional, default: true) - Include refunded transactions
- `currency` (optional) - Filter by currency

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "30d",
    "dateRange": {
      "start": "2023-01-01T00:00:00Z",
      "end": "2023-01-31T23:59:59Z"
    },
    "overview": {
      "totalTransactions": 500,
      "totalAmount": 25000.00,
      "completedAmount": 23000.00,
      "refundedAmount": 1000.00,
      "netAmount": 22000.00,
      "metrics": {
        "completionRate": 92.0,
        "failureRate": 4.0,
        "refundRate": 4.0,
        "averageTransactionAmount": 50.00
      }
    },
    "timeSeries": [
      {
        "date": "2023-01-01",
        "timestamp": "2023-01-01T00:00:00Z",
        "total": 20,
        "totalAmount": 1000.00,
        "completed": 18,
        "completedAmount": 900.00,
        "pending": 1,
        "failed": 1,
        "refunded": 0,
        "netAmount": 900.00
      }
    ],
    "paymentMethods": [
      {
        "type": "card",
        "provider": "stripe",
        "transactionCount": 300,
        "totalAmount": 15000.00,
        "averageAmount": 50.00
      }
    ],
    "failures": {
      "totalFailures": 20,
      "totalFailedAmount": 1000.00,
      "failureReasons": [
        {
          "reason": "Insufficient funds",
          "count": 10
        }
      ]
    }
  }
}
```

### 5. Bulk Operations API

#### POST `/api/transactions/bulk`

Performs bulk operations on multiple transactions.

**Request Body:**
```json
{
  "operation": "refund", // refund, cancel, export
  "transactionIds": ["trans_1", "trans_2", "trans_3"],
  "params": {
    "reason": "Bulk refund operation",
    "format": "csv" // for export operation
  }
}
```

**Supported Operations:**
- `refund` - Bulk refund multiple completed transactions
- `cancel` - Bulk cancel multiple pending transactions
- `export` - Export transaction data in CSV or JSON format

**Response:**
```json
{
  "success": true,
  "data": {
    "operation": "refund",
    "processed": 3,
    "successful": 2,
    "failed": 1,
    "results": {
      "successful": [
        {
          "transactionId": "trans_1",
          "refundAmount": 100.00,
          "refundId": "refund_trans_1_1234567890"
        }
      ],
      "failed": [
        {
          "transactionId": "trans_3",
          "reason": "Transaction already refunded"
        }
      ]
    }
  }
}
```

## Database Schema Updates

The following models have been added to support the new functionality:

### Refund Model
```prisma
model Refund {
  id            String    @id @default(cuid())
  transactionId String
  amount        Float
  reason        String
  status        String    @default("pending")
  processedAt   DateTime?
  createdAt     DateTime  @default(now())
  metadata      Json?
  
  transaction Transaction @relation(fields: [transactionId], references: [id], onDelete: Cascade)
  
  @@map("refunds")
}
```

### Receipt Model
```prisma
model Receipt {
  id            String   @id @default(cuid())
  transactionId String
  receiptNumber String   @unique
  format        String   @default("json")
  data          Json
  generatedAt   DateTime @default(now())
  
  transaction Transaction @relation(fields: [transactionId], references: [id], onDelete: Cascade)
  
  @@map("receipts")
}
```

## Error Handling

All APIs follow consistent error handling:

**Error Response Format:**
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (validation errors)
- `401` - Unauthorized
- `404` - Not Found
- `500` - Internal Server Error

## Rate Limiting

- Standard APIs: 100 requests per minute per user
- Analytics API: 20 requests per minute per user
- Bulk operations: 5 requests per minute per user

## Testing

Use the provided test suite in `test-payment-apis.js` to validate all endpoints:

```bash
node test-payment-apis.js
```

## Security Features

1. **Authentication Required** - All endpoints require valid JWT token
2. **User Isolation** - Users can only access their own transactions
3. **Input Validation** - All inputs are validated using Zod schemas
4. **SQL Injection Protection** - Using Prisma ORM with parameterized queries
5. **Rate Limiting** - Prevents abuse and ensures fair usage
6. **Data Sanitization** - Sensitive payment method details are masked in responses

## Implementation Notes

1. **Refund Processing** - Currently updates database only; integrate with actual payment processors (Stripe, etc.) in production
2. **Receipt Generation** - HTML format is fully implemented; PDF generation requires additional library
3. **Analytics** - Optimized queries with proper indexing for large datasets
4. **Bulk Operations** - Process transactions individually to ensure data consistency
5. **Error Recovery** - Failed operations provide detailed error information for debugging

## Future Enhancements

1. **Real-time Notifications** - WebSocket integration for refund status updates
2. **PDF Receipt Generation** - Implementation using PDF generation library
3. **Advanced Analytics** - Machine learning-based fraud detection
4. **Webhook Support** - External system notifications for transaction events
5. **Multi-currency Support** - Enhanced currency conversion and reporting
6. **Audit Trail** - Comprehensive logging for all payment operations