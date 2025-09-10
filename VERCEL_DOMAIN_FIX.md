# Vercel Domain Fix Guide

## Common Issue: Typo in Vercel URL

You typed: `facepayai.versel.app` ❌  
Correct URL: `facepayai.vercel.app` ✅

**Note the spelling: "vercel" (with 'c'), not "versel"**

---

## 1. How to Find Your Actual Vercel Deployment URL

### Method 1: Check Vercel Dashboard
1. Go to [vercel.com](https://vercel.com) and log in
2. Find your `facepay` project in the dashboard
3. Click on your project
4. Your deployment URL will be displayed prominently at the top
5. Common formats:
   - `your-project-name.vercel.app`
   - `your-project-name-git-branch.vercel.app` (for branch deployments)
   - `your-project-name-hash.vercel.app` (for specific commits)

### Method 2: Using Vercel CLI
```bash
# Install Vercel CLI if not installed
npm i -g vercel

# Login to Vercel
vercel login

# Check your project's deployments
vercel list

# Get current deployment info
vercel inspect
```

### Method 3: Check Git Integration
If you have GitHub/GitLab integration:
1. Go to your repository on GitHub/GitLab
2. Check the "Environments" or "Deployments" section
3. Vercel deployments will be listed there with URLs

---

## 2. Common Vercel URL Patterns

### Production URLs:
- `facepay.vercel.app`
- `facepay-app.vercel.app`
- `facepayai.vercel.app` ← **This is likely your URL**
- `your-username-facepay.vercel.app`

### Branch/Preview URLs:
- `facepay-git-main.vercel.app` (main branch)
- `facepay-git-develop.vercel.app` (develop branch)
- `facepay-git-feature-branch.vercel.app` (feature branches)

### Commit-specific URLs:
- `facepay-abc123def.vercel.app` (specific commit hash)

---

## 3. How to Add a Custom Domain

### Step 1: Purchase/Configure Domain
1. Buy a domain from any registrar (GoDaddy, Namecheap, Cloudflare, etc.)
2. Or use a subdomain of an existing domain

### Step 2: Add Domain in Vercel Dashboard
1. Go to your project in Vercel dashboard
2. Click "Settings" tab
3. Click "Domains" in the sidebar
4. Click "Add Domain"
5. Enter your custom domain (e.g., `facepay.app` or `app.yourdomain.com`)

### Step 3: Configure DNS Records
Vercel will show you the DNS records to add:

**For Root Domain (facepay.app):**
```
Type: A
Name: @
Value: 76.76.19.61
```

**For Subdomain (app.yourdomain.com):**
```
Type: CNAME
Name: app
Value: cname.vercel-dns.com
```

### Step 4: Wait for Propagation
- DNS changes can take up to 24-48 hours
- Usually works within 15-30 minutes
- Check status in Vercel dashboard

---

## 4. Quick Fixes for Domain Issues

### Issue: "This site can't be reached"
**Solutions:**
1. Check spelling: `vercel.app` (not `versel.app`)
2. Wait 5-10 minutes after deployment
3. Try incognito/private browsing mode
4. Clear browser cache and cookies

### Issue: 404 - Page Not Found
**Solutions:**
1. Ensure your build was successful in Vercel dashboard
2. Check if you're using the correct URL (production vs preview)
3. Verify your `vercel.json` configuration is correct

### Issue: SSL Certificate Errors
**Solutions:**
1. Custom domains: Wait for SSL provisioning (can take up to 24 hours)
2. Try `https://` instead of `http://`
3. Clear browser SSL cache

### Issue: Old Version Loading
**Solutions:**
1. Hard refresh: `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)
2. Clear browser cache
3. Check if you're looking at the right deployment in Vercel dashboard

---

## 5. Troubleshooting Commands

### Check Deployment Status
```bash
# List all deployments
vercel ls

# Get detailed info about current deployment
vercel inspect

# View deployment logs
vercel logs
```

### Force New Deployment
```bash
# Deploy current directory
vercel --prod

# Deploy specific branch
vercel --prod --target production
```

### Check Domain Configuration
```bash
# Check DNS records
nslookup your-domain.com
dig your-domain.com

# Check if domain resolves to Vercel
curl -I https://your-domain.com
```

---

## 6. Current Project Configuration

Based on your `vercel.json`, your project is configured as:
- **Framework**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next` (default)
- **Functions**: API routes in `/api/**/*.ts`
- **Regions**: `iad1`, `sfo1` (East Coast & West Coast US)

### Environment Variables
Make sure these are set in Vercel dashboard under Settings > Environment Variables:
- Database connection strings
- API keys (Stripe, etc.)
- JWT secrets
- Any other secrets from your `.env` files

---

## 7. Support Resources

### Vercel Documentation
- [Custom Domains](https://vercel.com/docs/concepts/projects/custom-domains)
- [DNS Configuration](https://vercel.com/docs/concepts/projects/custom-domains#dns-configuration)
- [Troubleshooting Deployments](https://vercel.com/docs/concepts/deployments/troubleshoot-a-build)

### Common Support Contacts
- Vercel Support: [vercel.com/support](https://vercel.com/support)
- Community: [GitHub Discussions](https://github.com/vercel/vercel/discussions)

---

## Quick Action Items

1. **Check the correct URL**: Replace `versel` with `vercel` in your bookmarks
2. **Verify in Vercel Dashboard**: Log in and check your actual deployment URL
3. **Update any hardcoded URLs**: Search your codebase for any incorrect URLs
4. **Test the corrected URL**: `https://facepayai.vercel.app`

---

*Generated: $(date) - FacePay Project v1.0.0*