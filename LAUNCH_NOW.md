# 🚀 LAUNCH NOW - Complete Supabase Setup Guide

## ⚡ Quick Setup (2 minutes total)

### Step 1: Create Supabase Account (30 seconds)
1. Go to https://supabase.com
2. Click "Start your project" 
3. Sign up with GitHub (fastest option)
4. Create a new project:
   - **Project Name**: `FacePay`
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to your users
   - Click "Create new project"

### Step 2: Initialize Database Schema (1 minute)

#### Option A: Copy-Paste SQL (Fastest)
1. In Supabase Dashboard → SQL Editor
2. Copy the entire content from `supabase-init.sql` file
3. Paste and click "Run"

#### Option B: Upload SQL File
1. In Supabase Dashboard → SQL Editor
2. Click "New snippet" → "Upload"
3. Upload the `supabase-init.sql` file
4. Click "Run"

### Step 3: Get Your Environment Variables (30 seconds)

Go to Settings → API and copy these values:

```bash
# Replace your DATABASE_URL in .env.local with:
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Add these Supabase-specific variables:
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[YOUR-ANON-KEY]"
SUPABASE_SERVICE_ROLE_KEY="[YOUR-SERVICE-ROLE-KEY]"

# Keep your existing variables:
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here-change-in-production"
JWT_SECRET="your-jwt-secret-change-in-production"
JWT_REFRESH_SECRET="your-refresh-secret-change-in-production"

# WebAuthn Configuration
WEBAUTHN_RP_NAME="FacePay"
WEBAUTHN_RP_ID="localhost"
WEBAUTHN_ORIGIN="http://localhost:3000"

# FacePay Features
INITIAL_CREDIT_BONUS=100
REFERRAL_BONUS=50
CETES_ANNUAL_RATE=0.105
INVESTMENT_ENABLED=true
PREMIUM_MONTHLY_PRICE=29
PREMIUM_FEATURES_ENABLED=false
ENABLE_REFERRAL_SYSTEM=true
VIRAL_SHARING_BONUS=10
```

### Step 4: Verify Setup (Test Queries)

Run these queries in Supabase SQL Editor to verify everything works:

#### Test 1: Check Tables Created
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```
**Expected**: Should return 16 tables (users, biometric_data, transactions, etc.)

#### Test 2: Create Test User
```sql
INSERT INTO users (email, name, credit_balance) 
VALUES ('test@facepay.com', 'Test User', 10000)
RETURNING id, email, name, credit_balance, created_at;
```
**Expected**: Should return the created user with ID and timestamp

#### Test 3: Check Indexes
```sql
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```
**Expected**: Should return 50+ indexes for performance optimization

#### Test 4: Verify Relations
```sql
-- This should work without errors (foreign key constraints)
INSERT INTO webauthn_credentials (
  credential_id, 
  public_key, 
  user_id
) VALUES (
  'test-credential-123',
  'test-public-key',
  (SELECT id FROM users WHERE email = 'test@facepay.com')
);
```
**Expected**: Should insert successfully without foreign key errors

### Step 5: Update Prisma Connection

Run these commands in your project:

```bash
# Update Prisma to use new database
npx prisma db pull

# Generate Prisma client
npx prisma generate

# Optional: Reset if needed
# npx prisma db push --force-reset
```

## 🎯 Production Deployment

### Environment Variables for Production

```bash
# Production Database URL
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?pgbouncer=true&connection_limit=1"

# Production Supabase URLs
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[PROD-ANON-KEY]"
SUPABASE_SERVICE_ROLE_KEY="[PROD-SERVICE-ROLE-KEY]"

# Production Auth
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="[GENERATE-NEW-SECRET]"
JWT_SECRET="[GENERATE-NEW-SECRET]"
JWT_REFRESH_SECRET="[GENERATE-NEW-SECRET]"

# Production WebAuthn
WEBAUTHN_RP_NAME="FacePay"
WEBAUTHN_RP_ID="your-domain.com"
WEBAUTHN_ORIGIN="https://your-domain.com"
```

### Security Checklist
- [ ] Enable Row Level Security (RLS) in Supabase
- [ ] Set up proper auth policies
- [ ] Enable real-time subscriptions if needed
- [ ] Configure database backups
- [ ] Set up monitoring and alerts

## 🔥 Key Features Enabled

✅ **Biometric Authentication** - Face ID, Touch ID, WebAuthn
✅ **Credit System** - Internal credits with investment features  
✅ **Multi-Payment** - Cards, crypto, bank transfers
✅ **Full Audit Trail** - Complete transaction history
✅ **Analytics & Monitoring** - Performance, errors, user behavior
✅ **A/B Testing** - Built-in experimentation framework
✅ **Soft Deletes** - Data recovery and compliance
✅ **High Performance** - 50+ optimized database indexes

## 🆘 Troubleshooting

### Common Issues:

**Database Connection Failed**
```bash
# Check if DATABASE_URL format is correct
echo $DATABASE_URL
# Should start with: postgresql://postgres:
```

**Missing Tables**
```bash
# Run the SQL initialization again
# Or use: npx prisma db push
```

**Permission Denied**
- Make sure you're using the SERVICE_ROLE_KEY for server operations
- Use ANON_KEY only for client-side operations

**WebAuthn Not Working**
- Verify WEBAUTHN_RP_ID matches your domain
- Ensure HTTPS in production (required for WebAuthn)

---

## 🎉 You're Ready to Launch!

Your FacePay app now has:
- ✅ Production-ready database
- ✅ Biometric authentication 
- ✅ Payment processing
- ✅ Analytics & monitoring
- ✅ Scalable infrastructure

**Next Steps**: Deploy to Vercel/Netlify and update production environment variables!