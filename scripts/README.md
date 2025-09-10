# FacePay Scripts

This directory contains various scripts to help with FacePay deployment, development, and maintenance.

## Scripts Overview

### 🚀 `quick-start.sh`
**One-command setup for FacePay development**

```bash
npm run setup
# or
./scripts/quick-start.sh
```

**What it does:**
- Checks all dependencies (Node.js, npm, git)
- Installs npm packages
- Creates .env.local template if missing
- Sets up database schema
- Initializes demo data
- Runs quality checks
- Starts development server

**Prerequisites:**
- Node.js 18+
- PostgreSQL database (local or Supabase)

---

### 🗄️ `init-db.js`
**Database initialization with demo data**

```bash
npm run db:init          # Initialize with demo data
npm run db:fresh         # Clear and reinitialize
node scripts/init-db.js  # Direct execution
```

**What it creates:**
- 4 demo users with $250-$1000 credits each
- Biometric data for face authentication
- WebAuthn credentials for each user
- Sample payment methods (card, crypto, bank)
- Transaction history with receipts
- Analytics and A/B testing data
- Audit logs for compliance

**Demo Users:**
- `demo@facepay.com` - $500.00 credits
- `john.doe@example.com` - $250.00 credits
- `jane.smith@example.com` - $750.00 credits
- `merchant@facepay.com` - $1000.00 credits

---

### ✅ `deployment-checklist.md`
**Complete checklist for production deployment**

Covers:
- Pre-deployment requirements
- Environment variable setup
- Security configuration
- Performance optimization
- Testing procedures
- Monitoring setup

---

### 📋 Other Files

#### `.env.template`
Template for environment variables with:
- Database configuration
- Authentication secrets
- Payment provider settings
- Monitoring integration
- Security settings

#### `setup-redis.js`
Redis configuration for caching and sessions (if needed)

## Quick Commands

```bash
# Development Setup
npm run setup              # Complete environment setup
npm run dev               # Start development server
npm run db:studio         # Open database GUI

# Database Management  
npm run db:init           # Initialize with demo data
npm run db:fresh          # Fresh database setup
npm run db:push          # Update database schema
npm run db:migrate       # Run migrations

# Testing & Quality
npm run test:critical     # Run critical tests
npm run build            # Test production build
npm run lint             # Check code quality
npm run type-check       # TypeScript validation

# Deployment
npm run deploy           # Pre-deployment checks
vercel --prod           # Deploy to Vercel
npm run health-check    # Test API health
```

## Environment Setup Guide

### 1. Development Environment

```bash
# Clone repository
git clone <your-repo-url>
cd FacePay

# Run complete setup
npm run setup

# Start coding!
npm run dev
```

### 2. Production Environment

```bash
# 1. Create Supabase database
# 2. Deploy to Vercel
# 3. Configure environment variables
# 4. Initialize database

# See DEPLOYMENT_GUIDE.md for detailed steps
```

## File Structure

```
scripts/
├── quick-start.sh           # Complete development setup
├── init-db.js              # Database initialization
├── deployment-checklist.md # Production deployment guide
├── setup-redis.js          # Redis configuration
└── README.md               # This file

../
├── .env.template           # Environment variables template
├── DEPLOYMENT_GUIDE.md     # Detailed deployment guide
└── vercel.json            # Vercel deployment config
```

## Dependencies

### Required
- Node.js 18+
- npm 9+
- PostgreSQL database

### Optional
- Redis (for caching)
- Git (for version control)
- Docker (for containerization)

## Troubleshooting

### Common Issues

**1. Database Connection Failed**
```bash
# Check your DATABASE_URL in .env.local
# Ensure database is running and accessible
npm run db:push  # Test connection
```

**2. Environment Variables Missing**
```bash
# Copy template and update values
cp .env.template .env.local
# Edit .env.local with your actual values
```

**3. Build Failures**
```bash
# Check TypeScript errors
npm run type-check

# Fix linting issues
npm run lint:fix

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

**4. Permission Denied on Scripts**
```bash
# Make scripts executable
chmod +x scripts/quick-start.sh
```

### Getting Help

1. Check the logs for specific error messages
2. Review `DEPLOYMENT_GUIDE.md` for detailed instructions
3. Use `scripts/deployment-checklist.md` for systematic troubleshooting
4. Create an issue in the repository if problems persist

## Contributing

When adding new scripts:

1. Make them executable: `chmod +x script-name.sh`
2. Add documentation to this README
3. Include error handling and helpful output
4. Test on fresh environments
5. Update package.json scripts if needed

## License

Same as FacePay project - MIT License