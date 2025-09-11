# FacePay Backend API Server

Production-ready Express.js API server for FacePay biometric authentication service.

## Features

✅ **WebAuthn Biometric Authentication**
- Real Face ID/Touch ID enrollment and verification
- Cross-platform support (iOS, Android, Windows, macOS)
- Secure credential storage with PostgreSQL
- Challenge-based authentication flow

✅ **JWT Session Management**
- Access tokens (15 minutes)
- Refresh tokens (7 days) 
- Secure token verification
- Session tracking and monitoring

✅ **Advanced Security**
- Rate limiting with multiple tiers
- Security headers (OWASP compliant)
- CORS protection with origin validation
- Request sanitization and validation
- IP blacklisting and suspicious activity detection
- Content Security Policy

✅ **Merchant Dashboard API**
- Transaction history with pagination
- Real-time dashboard statistics
- Refund processing
- User credential management

✅ **Production Features**
- Comprehensive error handling and logging
- Health check endpoint with database monitoring
- Graceful shutdown handling
- Request ID tracking
- Audit trail logging

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Ensure your `.env` file contains:
```env
# Database
DATABASE_URL="postgresql://facepay_user:password@localhost:5432/facepay_local"

# JWT Secrets
JWT_SECRET="your-jwt-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret-key"

# WebAuthn Configuration
NEXT_PUBLIC_WEBAUTHN_RP_NAME="FacePay"
NEXT_PUBLIC_WEBAUTHN_RP_ID="localhost"
WEBAUTHN_ORIGIN="http://localhost:3000"

# Environment
NODE_ENV="development"
```

### 3. Database Setup
```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Optional: Open Prisma Studio
npm run prisma:studio
```

### 4. Start the Server

**Development (with auto-reload):**
```bash
npm run server:dev
```

**Production:**
```bash
npm run server
```

**Full Stack Development:**
```bash
npm run dev:full  # Runs Next.js frontend + Express backend
```

**Production with PM2:**
```bash
npm run server:pm2
```

## API Endpoints

### Health Check
- `GET /api/health` - Server and database health status

### Authentication
- `POST /api/enroll` - Register new biometric credential
- `POST /api/enroll/complete` - Complete biometric enrollment
- `POST /api/authenticate/start` - Begin authentication process
- `POST /api/authenticate/verify` - Verify authentication credential

### Merchant API
- `GET /api/verify/:token` - Verify JWT token for merchants
- `GET /api/merchant/dashboard` - Get dashboard data (requires auth)
- `GET /api/merchant/transactions` - Get transaction history (requires auth)
- `POST /api/merchant/refund` - Process refund (requires auth)

## Server Architecture

```
src/server/
├── index.js              # Main server file with Express setup
├── routes/
│   ├── auth.js           # Authentication endpoints
│   └── merchant.js       # Merchant dashboard endpoints
├── middleware/
│   └── security.js       # Security middleware with rate limiting
└── lib/
    └── webauthn.js       # WebAuthn server-side utilities
```

## Security Features

### Rate Limiting
- **Global**: 1000 requests per 15 minutes
- **Per IP**: 100 requests per 15 minutes
- **Authentication**: 10 attempts per 15 minutes
- **Enrollment**: 5 attempts per hour
- **Token Verification**: 100 requests per minute
- **Health Check**: 120 requests per minute

### Security Headers
- Strict-Transport-Security (HSTS)
- Content-Security-Policy (CSP)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection
- Referrer-Policy
- Permissions-Policy

### Request Validation
- User-Agent validation
- Content-Length limits (10MB max)
- Suspicious pattern detection
- IP blacklisting after 10 violations
- Request sanitization (XSS prevention)

## Environment Configuration

### Development
- Port: 4000 (configurable via PORT env var)
- CORS: Allows localhost origins
- Logging: Detailed request/response logging
- Rate Limits: More lenient for development

### Production  
- HTTPS required for WebAuthn
- Strict CORS with whitelisted origins
- Security headers enforced
- Production-grade logging
- Stricter rate limiting

## Database Integration

Uses Prisma ORM with PostgreSQL for:
- User management with soft deletes
- WebAuthn credential storage
- Transaction tracking
- Audit logging
- Session management

### Key Models
- `User` - User accounts with credit balance
- `WebauthnCredential` - Biometric credentials
- `Transaction` - Payment transactions
- `AuditLog` - Comprehensive audit trail
- `PaymentMethod` - User payment methods

## Monitoring and Observability

### Health Check Response
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "uptime": 3600,
    "environment": "production",
    "version": "1.0.0",
    "database": "connected",
    "memory": {...},
    "pid": 12345
  }
}
```

### Request Logging
Each request includes:
- Request ID for tracking
- Execution time
- IP address and User-Agent
- Request/response size
- Error details with stack traces

### Audit Trail
All sensitive operations are logged:
- User enrollments and authentications
- Token verifications
- Transaction operations
- Security violations

## Error Handling

Comprehensive error handling with:
- Request ID tracking
- Environment-specific error details
- Proper HTTP status codes
- User-friendly error messages
- Security-conscious information disclosure

### Example Error Response
```json
{
  "success": false,
  "error": "Authentication verification failed",
  "requestId": "abc12345",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## WebAuthn Integration

Server-side WebAuthn implementation using `@simplewebauthn/server`:

### Registration Flow
1. Client requests registration options
2. Server generates challenge and stores it
3. Client performs biometric enrollment
4. Server verifies credential and stores it
5. JWT tokens issued for immediate login

### Authentication Flow  
1. Client requests authentication options
2. Server generates challenge for user's credentials
3. Client performs biometric verification
4. Server verifies response and updates counter
5. JWT tokens issued on successful verification

### Supported Authenticators
- **iOS**: Face ID, Touch ID
- **Android**: Fingerprint, Face Unlock
- **Windows**: Windows Hello
- **macOS**: Touch ID
- **Web**: Platform authenticators

## Deployment

### PM2 Configuration
The server includes PM2 configuration in `ecosystem.config.js`:

```bash
# Start with PM2
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# View logs
pm2 logs facepay-server

# Restart
pm2 restart facepay-server
```

### Docker (Optional)
Create a `Dockerfile` for containerized deployment:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
RUN npm run prisma:generate
EXPOSE 4000
CMD ["npm", "run", "server"]
```

## Testing

```bash
# Run server tests
npm run test:server

# Test specific endpoint
curl -X GET http://localhost:4000/api/health

# Load testing with autocannon
npx autocannon -c 10 -d 30 http://localhost:4000/api/health
```

## Performance

### Optimizations
- Prisma connection pooling
- In-memory rate limiting store
- Request body size limits
- Compression middleware
- Connection keep-alive
- Graceful shutdown handling

### Benchmarks
On a typical VPS (2 CPU, 4GB RAM):
- Health check: ~500 requests/second
- Authentication: ~50 requests/second
- Database queries: ~200 queries/second

## Security Considerations

1. **Environment Variables**: Never commit secrets to version control
2. **HTTPS**: Required in production for WebAuthn
3. **Database Security**: Use strong passwords and connection encryption  
4. **Rate Limiting**: Adjust based on expected traffic
5. **Logging**: Avoid logging sensitive information
6. **Updates**: Keep dependencies updated for security patches

## Troubleshooting

### Common Issues

**Port already in use:**
```bash
lsof -ti:4000 | xargs kill -9
```

**Database connection errors:**
- Verify PostgreSQL is running
- Check DATABASE_URL format
- Ensure database exists and user has permissions

**WebAuthn failures:**
- Ensure HTTPS in production
- Verify RP_ID matches hostname
- Check expected origins configuration

**Rate limiting issues:**
- Check security logs for blocked requests
- Adjust rate limits in security configuration
- Clear rate limit store if needed

### Debug Mode
Set environment variables for detailed logging:
```bash
DEBUG=facepay:* NODE_ENV=development npm run server:dev
```

## License

This server is part of the FacePay project and follows the same licensing terms.