# FacePay Developer Quickstart Guide

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/facepay/api)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/node-18+-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-5+-blue.svg)](https://www.typescriptlang.org/)

Welcome to FacePay! This guide will get you up and running with our advanced biometric payment platform in minutes.

## 🚀 Quick Start (5 Minutes)

### Prerequisites
- Node.js 18+ and npm/yarn
- PostgreSQL database
- Stripe account (for payments)
- Git

### 1. Clone and Setup
```bash
# Clone the repository
git clone https://github.com/facepay/api.git
cd facepay

# Install dependencies
npm install

# Setup environment
cp .env.example .env
```

### 2. Configure Environment
Edit `.env` file with your settings:

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/facepay"

# Authentication
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_EXPIRATION="3600"

# WebAuthn (Biometric Authentication)
WEBAUTHN_RP_NAME="FacePay"
WEBAUTHN_RP_ID="localhost"
WEBAUTHN_ORIGIN="http://localhost:3000"

# Stripe Payments
STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key"
STRIPE_PUBLISHABLE_KEY="pk_test_your_stripe_publishable_key"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"

# Application
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
NODE_ENV="development"
PORT=3000
```

### 3. Database Setup
```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Initialize with sample data
npm run db:init
```

### 4. Start Development Server
```bash
npm run dev
```

🎉 **That's it!** FacePay is now running at `http://localhost:3000`

## 📱 Test Your Setup

### Quick Health Check
```bash
curl http://localhost:3000/api/health
```

Should return:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "environment": "development"
}
```

### Test Authentication
```bash
# Login with demo account
curl -X POST http://localhost:3000/api/auth/demo-login
```

## 🎯 Common Integration Patterns

### 1. Basic Authentication Flow

```javascript
// Login user
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'demo@facepay.com',
    password: 'demo123456'
  })
});

const { data } = await loginResponse.json();
const accessToken = data.tokens.accessToken;

// Use token for authenticated requests
const profileResponse = await fetch('/api/users/profile', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
```

### 2. Payment Processing

```javascript
// Create Stripe checkout session
const checkoutResponse = await fetch('/api/payments/stripe/checkout', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    amount: 29.99,
    currency: 'USD',
    description: 'Premium Features',
    successUrl: 'https://yourapp.com/success',
    cancelUrl: 'https://yourapp.com/cancel'
  })
});

const checkout = await checkoutResponse.json();
// Redirect user to checkout.data.sessionUrl
window.location.href = checkout.data.sessionUrl;
```

### 3. Biometric Authentication (WebAuthn)

```javascript
// Start biometric registration
const startReg = await fetch('/api/webauthn/register/start', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${accessToken}` }
});

const { data: options } = await startReg.json();

// Use browser WebAuthn API
const credential = await navigator.credentials.create({
  publicKey: options.options
});

// Complete registration
const completeReg = await fetch('/api/webauthn/register/complete', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    credentialId: credential.id,
    clientDataJSON: bufferToBase64(credential.response.clientDataJSON),
    attestationObject: bufferToBase64(credential.response.attestationObject),
    name: 'My Device'
  })
});
```

### 4. Transaction Management

```javascript
// List transactions with filtering
const transactions = await fetch('/api/transactions?status=completed&limit=10', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});

// Create new transaction
const newTransaction = await fetch('/api/transactions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    amount: 49.99,
    currency: 'USD',
    description: 'API Test Payment',
    paymentMethodId: 'pm_123'
  })
});
```

## 🔧 Advanced Configuration

### Environment-Specific Settings

#### Development
```bash
NODE_ENV=development
WEBAUTHN_RP_ID=localhost
WEBAUTHN_ORIGIN=http://localhost:3000
LOG_LEVEL=debug
```

#### Staging
```bash
NODE_ENV=staging
WEBAUTHN_RP_ID=api-staging.facepay.com
WEBAUTHN_ORIGIN=https://staging.facepay.com
LOG_LEVEL=info
```

#### Production
```bash
NODE_ENV=production
WEBAUTHN_RP_ID=api.facepay.com
WEBAUTHN_ORIGIN=https://facepay.com
LOG_LEVEL=warn
```

### Database Configuration

#### Local PostgreSQL
```bash
DATABASE_URL="postgresql://facepay:password@localhost:5432/facepay"
```

#### Cloud Database (Supabase)
```bash
DATABASE_URL="postgresql://user:pass@db.supabase.co:5432/postgres"
```

#### Connection Pooling
```bash
DATABASE_URL="postgresql://user:pass@host:5432/db?pgbouncer=true&connection_limit=10"
```

### Redis Configuration (Optional)
```bash
REDIS_URL="redis://localhost:6379"
REDIS_PASSWORD="your-redis-password"
```

## 🧪 Testing

### Run Test Suite
```bash
# All tests
npm test

# Specific test categories
npm run test:api          # API endpoint tests
npm run test:components   # Component tests
npm run test:services     # Service layer tests

# Critical tests only
npm run test:critical

# With coverage
npm run test:coverage
```

### API Testing with Postman
1. Import the collection: `/docs/facepay.postman_collection.json`
2. Set environment variables:
   - `baseUrl`: `http://localhost:3000/api`
   - `accessToken`: (auto-filled after login)
3. Run the full test suite

### Manual Testing Checklist

#### ✅ Authentication
- [ ] User registration
- [ ] User login
- [ ] Token refresh
- [ ] Demo login (dev only)

#### ✅ Biometric Authentication
- [ ] WebAuthn registration start
- [ ] WebAuthn registration complete
- [ ] WebAuthn authentication start
- [ ] WebAuthn authentication complete
- [ ] Credential management

#### ✅ Payments
- [ ] Stripe checkout session creation
- [ ] Payment method management
- [ ] Transaction processing
- [ ] Refund processing

#### ✅ User Management
- [ ] Profile retrieval
- [ ] Profile updates
- [ ] Account deletion

## 🚨 Troubleshooting

### Common Issues

#### Database Connection Errors
```bash
# Check database status
npx prisma db pull

# Reset database
npx prisma db push --force-reset
npm run db:init
```

#### WebAuthn Issues
```bash
# Ensure HTTPS in production
# Check RP_ID matches domain
# Verify browser WebAuthn support
```

#### Stripe Integration Issues
```bash
# Verify webhook endpoints
# Check API key permissions
# Test with Stripe CLI
stripe listen --forward-to localhost:3000/api/payments/stripe/webhook
```

#### Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Use different port
PORT=3001 npm run dev
```

### Debugging Tips

#### Enable Debug Logging
```bash
LOG_LEVEL=debug npm run dev
```

#### Database Query Logging
```bash
# Add to .env
DATABASE_URL="postgresql://...?logging=true"
```

#### API Response Logging
```javascript
// Add to middleware
console.log('API Response:', {
  method: request.method,
  url: request.url,
  status: response.status,
  time: Date.now() - start
});
```

## 📚 API Documentation

### Interactive Documentation
- **Swagger UI**: `http://localhost:3000/api/docs` (coming soon)
- **Postman Collection**: `/docs/facepay.postman_collection.json`
- **API Reference**: `/docs/API.md`

### Key Endpoints

#### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/refresh` - Token refresh

#### Payments
- `POST /api/payments/stripe/checkout` - Create payment
- `GET /api/payments/methods` - List payment methods
- `GET /api/payments/analytics` - Payment analytics

#### Transactions
- `GET /api/transactions` - List transactions
- `POST /api/transactions` - Create transaction
- `POST /api/transactions/{id}/refund` - Process refund

#### WebAuthn
- `POST /api/webauthn/register/start` - Start biometric registration
- `POST /api/webauthn/authenticate/start` - Start biometric auth
- `GET /api/webauthn/credentials` - List credentials

### Rate Limits
- Authentication: 10 requests/minute per IP
- Standard endpoints: 1000 requests/hour per user
- Payment processing: 100 requests/hour per user

## 🏗️ Architecture Overview

### Tech Stack
- **Frontend**: Next.js 14, React 18, TypeScript
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL with optimized indexes
- **Authentication**: JWT + WebAuthn biometrics
- **Payments**: Stripe integration
- **Security**: Advanced threat detection, rate limiting
- **Testing**: Jest, Supertest, React Testing Library

### Project Structure
```
facepay/
├── src/
│   ├── app/
│   │   ├── api/              # API endpoints
│   │   ├── auth/             # Auth pages
│   │   ├── payments/         # Payment pages
│   │   └── dashboard/        # User dashboard
│   ├── components/           # React components
│   ├── lib/                  # Utility libraries
│   ├── middleware/           # API middleware
│   └── services/            # Business logic
├── docs/                    # Documentation
├── __tests__/              # Test suites
├── prisma/                 # Database schema
└── scripts/               # Setup scripts
```

### Data Models

#### Core Entities
- **User**: Authentication and profile data
- **Transaction**: Payment transactions and history
- **PaymentMethod**: Stored payment methods
- **WebAuthnCredential**: Biometric credentials
- **Session**: User sessions and security

#### Relationships
```
User 1:N Transaction
User 1:N PaymentMethod
User 1:N WebAuthnCredential
User 1:N Session
```

## 🔒 Security Best Practices

### Development Security
```javascript
// Always validate input
const schema = z.object({
  email: z.string().email(),
  amount: z.number().positive()
});

// Use prepared statements (Prisma handles this)
const user = await prisma.user.findUnique({
  where: { email: validatedEmail }
});

// Sanitize sensitive data
const safeUser = {
  id: user.id,
  email: user.email,
  name: user.name
  // Never return password hash
};
```

### Production Checklist
- [ ] HTTPS enabled
- [ ] Environment variables secured
- [ ] Database credentials rotated
- [ ] API keys restricted
- [ ] Rate limiting configured
- [ ] Logging and monitoring setup
- [ ] Backup strategy implemented

## 🚀 Deployment

### Quick Deploy Options

#### Vercel (Recommended)
```bash
npm install -g vercel
vercel --prod
```

#### Docker
```bash
docker build -t facepay .
docker run -p 3000:3000 facepay
```

#### Traditional Server
```bash
npm run build
npm start
```

### Environment Variables for Production
```bash
NODE_ENV=production
DATABASE_URL="postgresql://prod-user:pass@prod-host:5432/facepay"
JWT_SECRET="production-secret-key"
WEBAUTHN_RP_ID="api.yourdomain.com"
WEBAUTHN_ORIGIN="https://yourdomain.com"
STRIPE_SECRET_KEY="sk_live_your_live_key"
```

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Make changes and add tests
4. Run test suite: `npm test`
5. Commit changes: `git commit -m 'Add amazing feature'`
6. Push to branch: `git push origin feature/amazing-feature`
7. Create Pull Request

### Code Style
```bash
# Format code
npm run format

# Lint code
npm run lint

# Type check
npm run type-check
```

## 📞 Support & Resources

### Documentation
- **API Reference**: `/docs/API.md`
- **Postman Collection**: `/docs/facepay.postman_collection.json`
- **Architecture Guide**: `/docs/ARCHITECTURE.md`

### Community & Support
- **GitHub Issues**: [Report bugs and request features](https://github.com/facepay/api/issues)
- **Discussions**: [Community discussions](https://github.com/facepay/api/discussions)
- **Email Support**: api-support@facepay.com
- **Security Issues**: security@facepay.com

### Learning Resources
- [WebAuthn Guide](https://webauthn.guide/)
- [Stripe Documentation](https://stripe.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://prisma.io/docs)

## 🗺️ Roadmap

### Version 1.1 (Q2 2024)
- [ ] GraphQL API
- [ ] Real-time webhooks
- [ ] Advanced analytics dashboard
- [ ] Multi-factor authentication
- [ ] SDK for popular languages

### Version 1.2 (Q3 2024)
- [ ] Cryptocurrency payments
- [ ] Advanced fraud detection
- [ ] International payment methods
- [ ] Mobile SDK
- [ ] Marketplace features

### Version 2.0 (Q4 2024)
- [ ] AI-powered risk assessment
- [ ] Blockchain integration
- [ ] Advanced biometric modalities
- [ ] Enterprise features
- [ ] White-label solutions

---

## 🎉 You're Ready!

Congratulations! You now have a fully functional FacePay development environment. Here are some next steps:

1. **Explore the API**: Use the Postman collection to test all endpoints
2. **Build integrations**: Start with basic auth and payments
3. **Add biometrics**: Implement WebAuthn for your users
4. **Customize**: Modify the codebase for your specific needs
5. **Deploy**: Push to production when ready

### Quick Links
- 📖 [Full API Documentation](/docs/API.md)
- 🧪 [Postman Collection](/docs/facepay.postman_collection.json)
- 🏗️ [Architecture Guide](/docs/ARCHITECTURE.md)
- 🐛 [Report Issues](https://github.com/facepay/api/issues)
- 💬 [Get Help](mailto:api-support@facepay.com)

**Happy coding!** 🚀

---

*Last updated: January 15, 2024*  
*Guide version: 2.0.0*  
*Compatible with FacePay API v1.0.0*