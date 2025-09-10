# FacePay Probable Vercel Deployment URLs

Based on GitHub username: **DabtcAvila** and project: **FacePay**

## ✅ CONFIRMED WORKING URLS (Tested: 2025-09-10)

### 🎯 Primary Production URL
**`https://facepay.vercel.app`** ⭐ **CONFIRMED WORKING**
- Status: ✅ 200 OK
- Title: "FacePay - Secure Digital Payments"
- Type: Main production deployment
- **This is your primary application URL**

### 🔄 Alternative URL
**`https://face-pay.vercel.app`** ⭐ **CONFIRMED WORKING**
- Status: ✅ 200 OK  
- Title: "Create Next App"
- Type: Preview/alternate deployment
- Note: Appears to be a different version or branch

---

## Primary Production URLs (Most Likely)

### Standard Vercel Patterns
1. `https://facepay.vercel.app`
2. `https://facepay-app.vercel.app`
3. `https://facepayai.vercel.app` ⭐ (Mentioned in VERCEL_DOMAIN_FIX.md)
4. `https://face-pay.vercel.app`
5. `https://facepay-dabtcavila.vercel.app`
6. `https://facepay-dabtc-avila.vercel.app`

### Username-Based Patterns
7. `https://dabtcavila-facepay.vercel.app`
8. `https://dabtc-facepay.vercel.app`
9. `https://facepay-git-main-dabtcavila.vercel.app`
10. `https://facepay-dabtcavila-projects.vercel.app`

## Branch-Specific URLs

### Main Branch
- `https://facepay-git-main.vercel.app`
- `https://facepay-git-main-dabtcavila.vercel.app`
- `https://facepayai-git-main.vercel.app`

### Current Branch (agent/backend_api)
- `https://facepay-git-agent-backend-api.vercel.app`
- `https://facepay-git-agent-backend-api-dabtcavila.vercel.app`
- `https://facepayai-git-agent-backend-api.vercel.app`

### Other Agent Branches
- `https://facepay-git-agent-design-ux-dabtcavila.vercel.app`
- `https://facepay-git-agent-frontend-web-dabtcavila.vercel.app`
- `https://facepay-git-agent-growth-ops-dabtcavila.vercel.app`
- `https://facepay-git-agent-mobile-app-dabtcavila.vercel.app`
- `https://facepay-git-agent-payments-orchestrator-dabtcavila.vercel.app`
- `https://facepay-git-agent-qa-ci-cd-dabtcavila.vercel.app`
- `https://facepay-git-agent-wallet-bridge-dabtcavila.vercel.app`
- `https://facepay-git-agent-webauthn-passkeys-dabtcavila.vercel.app`

## Alternative Project Name Variations

### Hyphenated Versions
- `https://face-pay-dabtcavila.vercel.app`
- `https://face-pay-app.vercel.app`
- `https://face-pay-ai.vercel.app`

### Lowercase/Variations
- `https://facepay-platform.vercel.app`
- `https://facepay-bio.vercel.app`
- `https://facepay-auth.vercel.app`
- `https://facepay-biometric.vercel.app`

## Commit-Hash Based URLs (Preview Deployments)
*These follow the pattern: `facepay-[8-char-hash]-dabtcavila.vercel.app`*

Examples based on recent commits:
- `https://facepay-e6634b8d-dabtcavila.vercel.app` (WebAuthn implementation)
- `https://facepay-7aedba8f-dabtcavila.vercel.app` (UX fixes)
- `https://facepay-f69f034a-dabtcavila.vercel.app` (MEGA UPDATE)

## Test Instructions

### Method 1: Manual Testing
Test each URL in this order of priority:

1. **Primary candidates** (most likely to work):
   ```bash
   curl -I https://facepayai.vercel.app
   curl -I https://facepay.vercel.app
   curl -I https://facepay-dabtcavila.vercel.app
   curl -I https://dabtcavila-facepay.vercel.app
   ```

2. **Branch-specific** (if main branch is deployed):
   ```bash
   curl -I https://facepay-git-main-dabtcavila.vercel.app
   curl -I https://facepay-git-agent-backend-api-dabtcavila.vercel.app
   ```

### Method 2: Automated Testing Script
```bash
#!/bin/bash
# Save as test-vercel-urls.sh

URLS=(
    "https://facepayai.vercel.app"
    "https://facepay.vercel.app"
    "https://facepay-app.vercel.app"
    "https://facepay-dabtcavila.vercel.app"
    "https://dabtcavila-facepay.vercel.app"
    "https://facepay-git-main-dabtcavila.vercel.app"
    "https://face-pay.vercel.app"
    "https://facepay-platform.vercel.app"
)

echo "Testing FacePay Vercel URLs..."
echo "=============================="

for url in "${URLS[@]}"; do
    echo -n "Testing $url ... "
    if curl -s -I "$url" | head -n 1 | grep -q "200\|301\|302"; then
        echo "✅ ACCESSIBLE"
        echo "  Status: $(curl -s -I "$url" | head -n 1)"
    else
        echo "❌ Not found"
    fi
done
```

### Method 3: Browser Testing
Open these URLs directly in your browser:
1. https://facepay.vercel.app ⭐ **CONFIRMED WORKING** (Primary production)
2. https://face-pay.vercel.app ⭐ **CONFIRMED WORKING** (Alternative/Preview)
3. https://facepayai.vercel.app ❌ (Not found - mentioned in docs but doesn't exist)
4. https://facepay-dabtcavila.vercel.app ❌ (Not found)

### Method 4: Vercel CLI Discovery
```bash
# Install Vercel CLI if not already installed
npm install -g vercel

# Login to Vercel (will open browser)
vercel login

# List all projects (if you have access)
vercel list

# Get current project info (run from project directory)
cd "/Users/davicho/MASTER proyectos/FacePay"
vercel inspect

# Check deployments
vercel ls
```

## Expected Response Patterns

### Successful Deployment
- **Status Code**: 200 OK
- **Headers**: Should include Vercel-specific headers
- **Content**: HTML page with FacePay branding/content

### Preview/Branch Deployment
- **Status Code**: 200 OK
- **Headers**: May include preview-specific headers
- **Content**: Might show a preview banner or different version

### Not Found
- **Status Code**: 404 Not Found
- **Content**: Vercel's 404 page or custom 404

### Build/Deploy Error
- **Status Code**: 500 Internal Server Error
- **Content**: Vercel error page with build logs

## Notes

1. **Most Likely URL**: Based on the `VERCEL_DOMAIN_FIX.md` file, `https://facepayai.vercel.app` is referenced as a likely URL.

2. **Project Structure**: This is a Next.js project with proper `vercel.json` configuration, so it should deploy successfully.

3. **Branch Strategy**: The project uses multiple agent branches, so there might be separate deployments for each branch.

4. **Custom Domain**: Check if a custom domain is configured (like `facepay.app` or similar).

## Troubleshooting

If none of the URLs work:
1. Check if the project is actually deployed to Vercel
2. Verify the GitHub repository is connected to Vercel
3. Check if the deployment failed (build errors)
4. Confirm the project name and username are correct
5. Look for any custom domain configuration

---

## 📋 QUICK SUMMARY

**✅ WORKING URLS:**
- **Primary**: https://facepay.vercel.app (Use this one!)
- **Alternative**: https://face-pay.vercel.app

**❌ COMMON MISTAKES:**
- ~~https://facepayai.vercel.app~~ (doesn't exist)
- ~~https://facepay-dabtcavila.vercel.app~~ (wrong username pattern)

**🔧 QUICK TEST:**
```bash
# Test the working URLs
curl -I https://facepay.vercel.app
curl -I https://face-pay.vercel.app
```

**📱 FOR MOBILE/SHARING:**
Use the short primary URL: **https://facepay.vercel.app**

---

*Generated: 2025-09-10 - Based on GitHub: DabtcAvila/FacePay*
*Last tested: 2025-09-10 with automated script*