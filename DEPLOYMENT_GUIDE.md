# FacePay Deployment Guide - Zero Cost Infrastructure

This guide will help you deploy FacePay using completely free services: Vercel (frontend/API) and Supabase (database).

## Prerequisites

- Node.js 18+ installed
- Git installed
- GitHub account
- Email address for account creation

## 1. Supabase Setup (Free PostgreSQL Database)

### Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project" → "Sign up" (use GitHub for faster setup)
3. Click "New project"
4. Fill in:
   - **Name**: `facepay-production` (or your preferred name)
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to your users
5. Click "Create new project"
6. Wait 2-3 minutes for setup to complete

### Get Database Connection Details
1. In your Supabase dashboard, go to **Settings** → **Database**
2. Scroll down to "Connection string" section
3. Copy the **URI** connection string (it looks like):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
4. Replace `[YOUR-PASSWORD]` with the password you created

### Configure Database Security
1. Go to **Authentication** → **Settings**
2. Under "Site URL", add your domain (we'll update this after Vercel deployment)
3. Go to **SQL Editor**
4. Create a new query and run our database initialization (we'll provide the script)

## 2. Vercel Deployment (Free Hosting)

### Prepare Your Repository
1. Ensure your code is pushed to GitHub
2. Make sure your `package.json` has the correct build scripts

### Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "Start Deploying" → "Continue with GitHub"
3. Import your FacePay repository
4. Configure the project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build` (should auto-detect)
   - **Output Directory**: `.next` (should auto-detect)

### Environment Variables Configuration
In the Vercel deployment settings, add these environment variables:

#### Required Database Variables
```bash
# Supabase Database
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

#### Authentication & Security
```bash
# JWT Secret (generate a random 64-character string)
JWT_SECRET="your-super-secure-random-string-64-chars-minimum-here-make-it-complex"

# NextAuth Secret (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET="your-nextauth-secret-32-chars-minimum"

# App URLs (update after deployment)
NEXTAUTH_URL="https://your-app.vercel.app"
NEXT_PUBLIC_APP_URL="https://your-app.vercel.app"
```

#### Payment Providers (Optional - Free Tiers)
```bash
# Stripe (create free account at stripe.com)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# MercadoPago (for Latin America - create free account)
MERCADOPAGO_ACCESS_TOKEN="your-mp-token"
MERCADOPAGO_PUBLIC_KEY="your-mp-public-key"
```

#### WebAuthn Configuration
```bash
# WebAuthn settings
WEBAUTHN_RP_NAME="FacePay"
WEBAUTHN_RP_ID="your-app.vercel.app"  # Update with your domain
WEBAUTHN_ORIGIN="https://your-app.vercel.app"  # Update with your domain
```

#### Optional Monitoring (Free Tiers)
```bash
# Sentry (free tier: 5K errors/month)
NEXT_PUBLIC_SENTRY_DSN="https://your-sentry-dsn"

# Mixpanel (free tier: 20M events/month)
NEXT_PUBLIC_MIXPANEL_TOKEN="your-mixpanel-token"
```

### Deploy!
1. Click "Deploy"
2. Wait 2-5 minutes for build completion
3. Your app will be available at `https://your-project.vercel.app`

## 3. Post-Deployment Configuration

### Update Environment Variables
1. Copy your Vercel app URL (e.g., `https://facepay-xyz.vercel.app`)
2. Update these environment variables in Vercel:
   ```bash
   NEXTAUTH_URL="https://your-actual-vercel-url.vercel.app"
   NEXT_PUBLIC_APP_URL="https://your-actual-vercel-url.vercel.app"
   WEBAUTHN_RP_ID="your-actual-vercel-url.vercel.app"
   WEBAUTHN_ORIGIN="https://your-actual-vercel-url.vercel.app"
   ```

### Update Supabase Settings
1. In Supabase dashboard → **Authentication** → **Settings**
2. Update "Site URL" to your Vercel URL
3. Add your Vercel URL to "Additional Redirect URLs"

### Initialize Database
1. Run the database initialization script (see below)
2. Or use the Vercel CLI: `vercel env pull .env.local && npm run db:init`

## 4. Domain Configuration

### Option A: Free Subdomain (Recommended for Testing)
- Use your Vercel URL: `https://your-project.vercel.app`
- No additional cost
- SSL certificate included
- Perfect for development and demos

### Option B: Custom Domain (Optional)
1. **Buy a domain** (costs $10-15/year):
   - Namecheap, GoDaddy, or Cloudflare Registrar
   - Recommended: `.com`, `.app`, or `.dev`

2. **Configure in Vercel**:
   - Go to your project → **Settings** → **Domains**
   - Add your custom domain
   - Follow DNS configuration instructions

3. **Update Environment Variables**:
   - Replace all Vercel URLs with your custom domain
   - Redeploy the application

## 5. Security Setup

### SSL/HTTPS
- Automatically provided by Vercel (free)
- Includes wildcard certificates
- Auto-renewal handled

### Environment Security
- Never commit `.env` files to Git
- Use Vercel's environment variable dashboard
- Rotate secrets regularly

### Database Security
- Supabase includes automatic backups
- Row Level Security (RLS) policies configured
- Connection pooling included

## 6. Monitoring & Analytics

### Free Monitoring Options
1. **Vercel Analytics** (free tier):
   - Enable in Vercel dashboard
   - Basic page views and performance metrics

2. **Supabase Dashboard**:
   - Database metrics and logs
   - Real-time data viewer
   - Performance insights

3. **Browser DevTools**:
   - Console for error tracking
   - Network tab for performance
   - Lighthouse for audits

## 7. Backup & Recovery

### Automatic Backups
- Supabase: Daily automatic backups (free tier: 7 days retention)
- Vercel: Automatic deployments from Git
- Git: Version control for code

### Manual Backup
```bash
# Database backup (run locally)
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Code backup (already in Git)
git push origin main
```

## 8. Scaling Considerations

### Free Tier Limits
- **Vercel**: 100GB bandwidth, 100 deployments/day
- **Supabase**: 500MB database, 2GB bandwidth
- **Stripe**: Unlimited test transactions, $0 fees on first $1M

### Upgrade Path
When you're ready to scale:
1. Vercel Pro: $20/month (more bandwidth, better performance)
2. Supabase Pro: $25/month (8GB database, 250GB bandwidth)
3. Custom domain: $10-15/year
4. Stripe: 2.9% + 30¢ per transaction

## 9. Troubleshooting

### Common Issues
1. **Build Failures**:
   - Check build logs in Vercel
   - Ensure all dependencies are in `package.json`
   - Verify environment variables are set

2. **Database Connection Issues**:
   - Verify DATABASE_URL format
   - Check Supabase project status
   - Ensure IP whitelist includes 0.0.0.0/0 for Vercel

3. **WebAuthn Issues**:
   - Verify HTTPS is working
   - Check RP_ID matches your domain exactly
   - Ensure origin URL is correct

### Support Resources
- Vercel: [vercel.com/support](https://vercel.com/support)
- Supabase: [supabase.com/docs](https://supabase.com/docs)
- FacePay: Check GitHub issues or create a new one

## 10. Success Checklist

- [ ] Supabase project created and configured
- [ ] Database initialized with tables and sample data
- [ ] Vercel deployment completed successfully
- [ ] Environment variables configured
- [ ] HTTPS working properly
- [ ] Authentication flow tested
- [ ] Payment integration tested (if configured)
- [ ] WebAuthn/biometric authentication working
- [ ] Mobile responsive design verified

## Next Steps

1. Test all functionality thoroughly
2. Set up monitoring and alerts
3. Configure payment providers
4. Implement proper error tracking
5. Plan for production scaling

Your FacePay application is now deployed with zero upfront costs! 🚀

---

**Total Monthly Cost: $0** (within free tier limits)
**Total Setup Time: 30-60 minutes**
**Ongoing Maintenance: Minimal**