# FacePay Multi-Tenant Architecture Setup Guide

This guide walks you through setting up the complete multi-tenant architecture for FacePay, designed to handle thousands of merchants with complete data isolation.

## 🏗️ Architecture Overview

The multi-tenant system provides:
- **Complete data isolation** between merchants
- **Automatic API key-based authentication**
- **Per-merchant rate limiting and usage tracking**
- **Scalable billing and analytics system**
- **Production-ready security measures**

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- Redis (recommended for production)
- Stripe account (for payments)

## 🚀 Quick Setup

### 1. Database Migration

First, backup your existing database and migrate to the multi-tenant schema:

```bash
# Backup existing database
pg_dump $DATABASE_URL > facepay_backup.sql

# Apply the new multi-tenant schema
cp prisma/schema-multitenant.prisma prisma/schema.prisma
npx prisma db push --force-reset

# Generate new Prisma client
npx prisma generate
```

### 2. Environment Variables

Add these variables to your `.env` file:

```env
# Multi-tenant configuration
ENABLE_MULTITENANCY=true
DEFAULT_MERCHANT_PLAN=starter
REQUIRE_KYC_FOR_LIVE=true

# Rate limiting (use Redis URL for production)
RATE_LIMIT_STORE=memory
REDIS_URL=redis://localhost:6379

# Billing configuration
BILLING_ENABLED=true
BILLING_CURRENCY=MXN
BILLING_TAX_RATE=0.16

# Security
JWT_SECRET=your-super-secret-jwt-key
WEBHOOK_SIGNING_SECRET=your-webhook-secret
```

### 3. Initialize Default Merchant (Optional)

Create a default merchant account for testing:

```bash
node scripts/create-default-merchant.js
```

## 📁 File Structure

The multi-tenant implementation adds these key files:

```
src/
├── middleware/
│   └── multitenancy.ts          # Multi-tenant request isolation
├── lib/
│   ├── multi-tenant-prisma.ts   # Auto-scoped Prisma client
│   └── rate-limiter.ts          # Advanced rate limiting
├── app/
│   ├── api/merchants/           # Merchant management APIs
│   │   ├── signup/              # Merchant onboarding
│   │   ├── verify/              # KYC verification
│   │   ├── dashboard/           # Analytics dashboard
│   │   ├── settings/            # Merchant settings
│   │   └── keys/                # API key management
│   └── merchant/                # Merchant dashboard UI
│       ├── layout.tsx           # Dashboard layout
│       └── page.tsx             # Main dashboard
├── tests/
│   └── multi-tenant/
│       └── isolation.test.ts    # Data isolation tests
└── prisma/
    └── schema-multitenant.prisma # Multi-tenant database schema
```

## 🔧 API Usage

### Merchant Onboarding

1. **Sign Up**:
```bash
curl -X POST /api/merchants/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "merchant@example.com",
    "companyName": "Example Corp",
    "businessType": "corporation",
    "billingEmail": "billing@example.com",
    "billingAddress": {
      "street": "123 Business St",
      "city": "Business City",
      "state": "BC",
      "zipCode": "12345",
      "country": "US"
    },
    "agreeToTerms": true
  }'
```

2. **Complete KYC**:
```bash
curl -X POST /api/merchants/verify \
  -H "Authorization: Bearer sk_test_..." \
  -H "Content-Type: application/json" \
  -d '{
    "documents": {
      "identityDocument": {
        "type": "passport",
        "fileUrl": "https://...",
        "number": "123456789"
      }
    },
    "businessInfo": {
      "description": "Payment processing business",
      "industry": "fintech",
      "monthlyVolume": 100000
    }
  }'
```

### Using Multi-tenant APIs

All API calls require a valid API key in the Authorization header:

```bash
# Create a payment with merchant isolation
curl -X POST /api/payments \
  -H "Authorization: Bearer sk_live_your_secret_key" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "currency": "MXN",
    "payment_method": "pm_card_visa"
  }'
```

## 🔒 Security Features

### API Key Types

- **Public Keys** (`pk_test_...`, `pk_live_...`): Client-side, limited permissions
- **Secret Keys** (`sk_test_...`, `sk_live_...`): Server-side, full permissions
- **Webhook Secrets** (`whsec_...`): For webhook signature verification

### Permission System

API keys support granular permissions:
- `payments:read` / `payments:write`
- `transactions:read` / `transactions:write`  
- `customers:read` / `customers:write`
- `webhooks:read` / `webhooks:write`
- `analytics:read`
- `refunds:write`

### Rate Limiting

Automatic rate limiting by plan:

| Plan | Per Minute | Per Hour | Per Day |
|------|------------|----------|---------|
| Starter | 100 | 1,000 | 10,000 |
| Growth | 500 | 10,000 | 100,000 |
| Enterprise | 2,000 | 50,000 | 1,000,000 |

## 📊 Analytics & Billing

### Usage Tracking

The system automatically tracks:
- API calls by endpoint
- Transaction volume
- Storage usage
- Webhook deliveries

### Billing Metrics

- **API Calls**: $0.001 per call (varies by endpoint)
- **Payments**: $0.05 per payment processed
- **Biometric**: $0.10 per biometric verification
- **Webhooks**: $0.0001 per webhook delivery

### Dashboard Metrics

Merchants get real-time access to:
- Transaction volume and success rates
- Revenue analytics with comparison periods
- User growth and activity metrics
- Error rates and system health
- Top payment methods
- Webhook performance

## 🧪 Testing

Run the complete multi-tenant test suite:

```bash
# Unit tests
npm test src/tests/multi-tenant/

# Integration tests
npm run test:integration

# Load testing (optional)
npm run test:load -- --merchants=100 --concurrent=50
```

### Data Isolation Tests

The test suite verifies:
- ✅ Users cannot access other merchants' data
- ✅ Transactions are properly isolated
- ✅ Analytics events are merchant-scoped
- ✅ API keys work only for their merchant
- ✅ Webhooks are properly isolated
- ✅ Audit logs are merchant-specific
- ✅ Aggregation queries respect isolation

## 🚀 Production Deployment

### Database Configuration

For production, ensure:

1. **Connection pooling**: Use PgBouncer or similar
2. **Read replicas**: For analytics queries
3. **Partitioning**: For large tables like `transactions`
4. **Indexes**: All tenant-aware indexes are present

```sql
-- Example additional indexes for performance
CREATE INDEX CONCURRENTLY idx_transactions_merchant_created 
ON transactions(merchant_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_analytics_merchant_date 
ON analytics_events(merchant_id, timestamp DESC);
```

### Redis Configuration

For production rate limiting:

```env
RATE_LIMIT_STORE=redis
REDIS_URL=redis://your-redis-cluster:6379
REDIS_CLUSTER_MODE=true
```

### Monitoring

Set up monitoring for:
- Multi-tenant middleware performance
- Rate limiting accuracy
- Data isolation integrity
- Billing accuracy
- Webhook delivery success

## 📈 Scaling Considerations

### Database Sharding

For high-scale deployments, consider:

1. **Horizontal partitioning** by merchant_id
2. **Separate databases** for analytics vs transactional data
3. **Archive old data** to cold storage

### Caching Strategy

```typescript
// Merchant data caching
const merchantCache = new Map();
const CACHE_TTL = 300000; // 5 minutes

// Rate limit state in Redis
const rateLimitKey = `rl:${merchantId}:${window}`;
```

### Load Balancing

Distribute requests by:
- **Merchant ID hash**: Consistent merchant routing
- **Geographic region**: Reduce latency
- **Load patterns**: Separate heavy vs light merchants

## 🔧 Maintenance

### Regular Tasks

1. **Clean up expired API keys**:
```bash
node scripts/cleanup-expired-keys.js
```

2. **Archive old usage data**:
```bash
node scripts/archive-usage-data.js --older-than=1y
```

3. **Update billing cycles**:
```bash
node scripts/process-monthly-billing.js
```

### Health Checks

Monitor these endpoints:
- `GET /api/health` - System health
- `GET /api/merchants/dashboard` - Per-merchant health
- `GET /api/admin/system/health` - Administrative health

## 🆘 Troubleshooting

### Common Issues

**Rate limiting not working**:
- Check `RATE_LIMIT_STORE` configuration
- Verify Redis connection
- Check merchant plan settings

**Data leakage between merchants**:
- Run isolation tests: `npm run test:isolation`
- Check middleware is properly installed
- Verify all queries use scoped client

**Performance issues**:
- Check database indexes
- Monitor connection pool usage
- Verify caching is working

**Billing discrepancies**:
- Run billing audit: `npm run audit:billing`
- Check usage tracking logs
- Verify rate limiting accuracy

## 📞 Support

For issues with the multi-tenant system:

1. Run diagnostics: `npm run diagnose:multitenant`
2. Check logs: `tail -f logs/multitenant.log`
3. Review test results: `npm run test:multitenant -- --verbose`

## 🎯 Next Steps

After setup:

1. **Create your first merchant** via the signup API
2. **Test the isolation** with multiple merchant accounts
3. **Set up monitoring** and alerting
4. **Configure billing** based on your business model
5. **Customize the dashboard** for your brand

The multi-tenant architecture is now ready to scale to thousands of merchants with complete isolation and enterprise-grade security! 🚀