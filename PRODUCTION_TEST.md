# FacePay Production Testing Checklist
**URL:** https://facepayai.vercel.app  
**Last Updated:** September 10, 2025  
**Testing Environment:** Production

---

## 🏠 1. Homepage Load Test

### Basic Functionality
- [ ] **Homepage loads within 3 seconds**
  - [ ] https://facepayai.vercel.app responds with 200 status
  - [ ] Main navigation appears correctly
  - [ ] Hero section renders with FacePay branding
  - [ ] Call-to-action buttons are visible and functional
  - [ ] Footer loads with proper links

- [ ] **Core Assets Loading**
  - [ ] CSS styles applied correctly (no FOUC)
  - [ ] Fonts load properly (Google Fonts)
  - [ ] Images and icons render
  - [ ] Favicon appears in browser tab

- [ ] **Performance Metrics**
  - [ ] Lighthouse Performance Score > 90
  - [ ] First Contentful Paint < 1.5s
  - [ ] Largest Contentful Paint < 2.5s
  - [ ] Cumulative Layout Shift < 0.1

### Security Headers Check
- [ ] **Security Headers Present**
  - [ ] X-Frame-Options: DENY
  - [ ] X-Content-Type-Options: nosniff
  - [ ] X-XSS-Protection: 1; mode=block
  - [ ] Strict-Transport-Security present
  - [ ] Content-Security-Policy configured
  - [ ] Permissions-Policy allows camera/payment

---

## 👤 2. Face ID Demo Functionality

### Demo Page Navigation
- [ ] **Demo Page Access**
  - [ ] Navigate to https://facepayai.vercel.app/demo
  - [ ] Page loads without errors
  - [ ] Four demo modes visible:
    - [ ] Advanced Face ID (AI Demo)
    - [ ] Simple Face ID (Camera Demo)
    - [ ] Biometric Demo (Simulated)
    - [ ] **Real Face ID** (Actual biometric)

### Real Face ID Testing (Primary Feature)
- [ ] **iOS Device Testing**
  - [ ] Click "Real Face ID" button
  - [ ] Click "Use Real Face ID"
  - [ ] Native Face ID prompt appears
  - [ ] Successful authentication shows confirmation
  - [ ] Error handling for failed authentication
  - [ ] Cancel functionality works properly

- [ ] **Android Device Testing**
  - [ ] Biometric prompt appears (fingerprint/face)
  - [ ] Successful authentication confirmed
  - [ ] Fallback to PIN/password if needed
  - [ ] Proper error messages displayed

- [ ] **Desktop Testing**
  - [ ] Windows Hello integration (if available)
  - [ ] macOS Touch ID integration
  - [ ] Graceful fallback for unsupported devices
  - [ ] Clear messaging about device capabilities

### Camera Fallback Mode
- [ ] **Camera Access**
  - [ ] Camera permission requested properly
  - [ ] Live camera feed appears
  - [ ] Face detection overlay shows
  - [ ] Progress indicators work
  - [ ] Success/failure states display correctly

- [ ] **Error Scenarios**
  - [ ] Camera permission denied handling
  - [ ] No camera available error
  - [ ] Poor lighting conditions
  - [ ] No face detected timeout
  - [ ] Multiple faces detected handling

### Demo Modes Testing
- [ ] **Advanced Face ID Demo**
  - [ ] Animation plays smoothly
  - [ ] Progress bar 0-100% works
  - [ ] Success screen appears
  - [ ] "Try Real Authentication" button works

- [ ] **Simple Face ID Demo**
  - [ ] Basic camera simulation
  - [ ] Quick success demonstration
  - [ ] Clean UI without distractions

- [ ] **Biometric Demo**
  - [ ] Simulated biometric flow
  - [ ] Visual feedback appropriate
  - [ ] Educational content clear

---

## 📱 3. Mobile Responsiveness

### Viewport Testing
- [ ] **iPhone/iOS Safari**
  - [ ] Viewport meta tag configured
  - [ ] Touch targets minimum 44px
  - [ ] Face ID prompts work natively
  - [ ] Orientation changes handled
  - [ ] Safe area insets respected

- [ ] **Android Chrome**
  - [ ] Material Design principles followed
  - [ ] Biometric prompts appear correctly
  - [ ] Back button navigation works
  - [ ] PWA manifest loads

### Screen Sizes
- [ ] **Mobile (320px - 768px)**
  - [ ] Navigation collapses to hamburger menu
  - [ ] Demo buttons stack vertically
  - [ ] Camera view fits screen properly
  - [ ] Text remains legible
  - [ ] Touch targets are accessible

- [ ] **Tablet (768px - 1024px)**
  - [ ] Layout adapts appropriately
  - [ ] Demo cards arrange in grid
  - [ ] Navigation remains accessible
  - [ ] Camera interface scales well

- [ ] **Desktop (1024px+)**
  - [ ] Full layout displays
  - [ ] Hover states work
  - [ ] Keyboard navigation available
  - [ ] Multi-column layouts render

### Touch Interactions
- [ ] **Gesture Support**
  - [ ] Tap targets respond immediately
  - [ ] Swipe gestures work (if implemented)
  - [ ] Pinch-to-zoom disabled where appropriate
  - [ ] Long press handles gracefully

---

## ⚡ 4. API Health Check

### Core API Endpoints
- [ ] **Health Check**
  ```bash
  curl https://facepayai.vercel.app/api/health
  ```
  - [ ] Returns 200 status
  - [ ] Response includes service status
  - [ ] Timestamp is current
  - [ ] Version information present

- [ ] **Authentication APIs**
  ```bash
  # Test user registration
  curl -X POST https://facepayai.vercel.app/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","name":"Test User","password":"test123"}'
  ```
  - [ ] Registration endpoint responds
  - [ ] Login endpoint accessible
  - [ ] JWT tokens issued correctly
  - [ ] Refresh token flow works

### WebAuthn APIs
- [ ] **Registration Flow**
  - [ ] `/api/webauthn/register/start` returns options
  - [ ] `/api/webauthn/register/complete` verifies credentials
  - [ ] Proper error responses for invalid data
  - [ ] CORS headers configured correctly

- [ ] **Authentication Flow**
  - [ ] `/api/webauthn/authenticate/start` works
  - [ ] `/api/webauthn/authenticate/complete` validates
  - [ ] Timeout handling implemented
  - [ ] Concurrent request handling

### Database Connectivity
- [ ] **Database Operations**
  - [ ] User creation works
  - [ ] Credential storage functions
  - [ ] Transaction logging active
  - [ ] Query performance acceptable (< 500ms)

### Payment APIs
- [ ] **Payment Processing**
  - [ ] Stripe integration active
  - [ ] Payment intent creation
  - [ ] Webhook handling functional
  - [ ] Error responses appropriate

---

## 🚨 5. Common Issues and Fixes

### WebAuthn Issues

#### Issue: "WebAuthn not supported"
**Symptoms:**
- Browser shows unsupported error
- Fallback mode not triggered
- Console errors about navigator.credentials

**Fixes:**
1. **Check HTTPS:** WebAuthn requires HTTPS (except localhost)
   ```bash
   # Verify SSL certificate
   curl -I https://facepayai.vercel.app
   ```

2. **Browser Compatibility:**
   - Update to latest browser version
   - Clear browser cache and cookies
   - Disable browser extensions temporarily

3. **Device Support:**
   - Ensure device has biometric sensors
   - Check privacy settings allow biometric access
   - Verify Face ID/Touch ID is enrolled

#### Issue: "Operation timed out"
**Symptoms:**
- Face ID prompt appears but times out
- User sees "Authentication timed out" message
- Backend logs show timeout errors

**Fixes:**
1. **Extend Timeout:**
   - Check API timeout configuration (currently 30s)
   - Increase user interaction timeout to 60s
   - Add retry mechanism for network issues

2. **User Education:**
   - Show clear instructions before authentication
   - Provide visual feedback during process
   - Explain timeout reasons to users

#### Issue: "Camera access denied"
**Symptoms:**
- Fallback camera mode fails
- Permission denied in browser
- Black screen instead of camera feed

**Fixes:**
1. **Permission Handling:**
   ```javascript
   // Check permission status
   navigator.permissions.query({name: 'camera'})
   ```

2. **User Instructions:**
   - Show how to enable camera in browser settings
   - Provide alternative authentication methods
   - Clear messaging about privacy

### Performance Issues

#### Issue: Slow page loading
**Symptoms:**
- Homepage takes > 5 seconds to load
- Lighthouse performance score < 70
- Users report slow experience

**Fixes:**
1. **Check CDN:**
   - Verify Vercel edge function deployment
   - Check regional deployment status
   - Monitor cache hit rates

2. **Optimize Assets:**
   ```bash
   # Analyze bundle size
   npm run build
   npm run analyze
   ```

3. **Database Performance:**
   - Check database connection pooling
   - Monitor query execution times
   - Optimize database indexes

#### Issue: Mobile responsiveness broken
**Symptoms:**
- Layout appears zoomed on mobile
- Touch targets too small
- Horizontal scrolling appears

**Fixes:**
1. **Viewport Configuration:**
   ```html
   <meta name="viewport" content="width=device-width, initial-scale=1">
   ```

2. **CSS Media Queries:**
   - Test all breakpoints
   - Verify touch target sizes (44px minimum)
   - Check safe area handling for notched devices

### API Errors

#### Issue: 500 Internal Server Error
**Symptoms:**
- API endpoints return 500 status
- Health check fails
- Database connection errors

**Fixes:**
1. **Check Environment Variables:**
   ```bash
   # Verify all required env vars are set
   - DATABASE_URL
   - NEXTAUTH_SECRET
   - NEXTAUTH_URL
   ```

2. **Database Connection:**
   - Verify database is running
   - Check connection string format
   - Test database connectivity

3. **Monitor Logs:**
   ```bash
   # Check Vercel function logs
   vercel logs --app=facepayai
   ```

#### Issue: CORS errors
**Symptoms:**
- Browser console shows CORS errors
- API calls from frontend fail
- Preflight requests blocked

**Fixes:**
1. **Verify CORS Configuration:**
   - Check vercel.json CORS headers
   - Ensure allowed origins include production URL
   - Verify credentials handling

2. **Test CORS:**
   ```bash
   # Test preflight request
   curl -X OPTIONS https://facepayai.vercel.app/api/auth/login \
     -H "Origin: https://facepayai.vercel.app" \
     -H "Access-Control-Request-Method: POST"
   ```

### Security Issues

#### Issue: Mixed content warnings
**Symptoms:**
- Browser shows "Not Secure" warning
- Some resources load over HTTP
- CSP violations in console

**Fixes:**
1. **Force HTTPS:**
   - Verify all external resources use HTTPS
   - Check Strict-Transport-Security header
   - Update any hardcoded HTTP URLs

2. **Content Security Policy:**
   - Review CSP configuration in vercel.json
   - Add necessary domains to allowed sources
   - Test CSP with browser dev tools

---

## 🧪 Testing Scripts

### Automated Health Check
```bash
#!/bin/bash
# Run this script to test basic functionality

BASE_URL="https://facepayai.vercel.app"

echo "🏠 Testing homepage..."
curl -f -s -o /dev/null "$BASE_URL" && echo "✅ Homepage OK" || echo "❌ Homepage FAILED"

echo "⚡ Testing health endpoint..."
curl -f -s "$BASE_URL/api/health" | jq . && echo "✅ Health API OK" || echo "❌ Health API FAILED"

echo "🔐 Testing WebAuthn endpoints..."
curl -f -s -X POST "$BASE_URL/api/webauthn/register/start" \
  -H "Content-Type: application/json" \
  -d '{}' > /dev/null && echo "✅ WebAuthn OK" || echo "❌ WebAuthn FAILED"

echo "📱 Testing demo page..."
curl -f -s -o /dev/null "$BASE_URL/demo" && echo "✅ Demo Page OK" || echo "❌ Demo Page FAILED"
```

### Performance Testing
```bash
#!/bin/bash
# Performance benchmark script

echo "🚀 Running Lighthouse audit..."
npx lighthouse https://facepayai.vercel.app --output json --quiet | jq '.categories.performance.score * 100'

echo "⏱️ Testing API response times..."
time curl -s https://facepayai.vercel.app/api/health > /dev/null
```

---

## 📊 Testing Checklist Summary

### Pre-Test Setup
- [ ] Clear browser cache and cookies
- [ ] Test on multiple devices/browsers
- [ ] Ensure stable internet connection
- [ ] Have test user accounts ready

### Critical Path Testing
- [ ] Homepage loads successfully
- [ ] Demo page accessible
- [ ] Real Face ID triggers native prompts
- [ ] API health check passes
- [ ] Mobile layout renders correctly

### Post-Test Actions
- [ ] Document any issues found
- [ ] Create tickets for bug fixes
- [ ] Share test results with team
- [ ] Schedule follow-up testing

---

## 📞 Support Information

**If you encounter issues:**
1. Check this document for common fixes
2. Review browser console for error messages
3. Test on different browsers/devices
4. Check network connectivity
5. Contact development team with detailed error descriptions

**Emergency Contacts:**
- Development Team: [Contact Information]
- Server Issues: Check Vercel dashboard
- Database Issues: Check database provider status

---

*Last updated: September 10, 2025*  
*Next review: Every deployment*