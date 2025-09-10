# FacePay Production Deployment Checklist

## ⚠️ CRITICAL - Security & Environment

### 1. Environment Variables
- [ ] **Replace ALL placeholder values in `.env.production`**
- [ ] **Generate new JWT secrets**: `openssl rand -base64 64`
- [ ] **Generate new encryption keys**: `openssl rand -base64 32`
- [ ] **Never use development secrets in production!**
- [ ] **Verify all URLs use your production domain (not localhost)**
- [ ] **Ensure all URLs use HTTPS (not HTTP)**

### 2. Database Configuration
- [ ] **Set up production PostgreSQL database**
  - [ ] Supabase, Railway, AWS RDS, or other provider
  - [ ] Configure connection pooling
  - [ ] Set up automated backups
- [ ] **Run database migrations**: `npm run db:migrate`
- [ ] **Test database connection**: `npm run health-check`
- [ ] **Configure database security (restrict access, use SSL)**

### 3. Domain & SSL
- [ ] **Configure custom domain in Vercel/deployment platform**
- [ ] **Verify SSL certificate is properly configured**
- [ ] **Update WebAuthn configuration for your domain**:
  - `WEBAUTHN_RP_ID=yourdomain.com`
  - `WEBAUTHN_ORIGIN=https://yourdomain.com`
- [ ] **Test WebAuthn on production domain**

## 🔐 External Services Setup

### 4. Payment Processing
- [ ] **Stripe Production Setup**:
  - [ ] Create Stripe account
  - [ ] Get live API keys (not test keys!)
  - [ ] Configure webhook endpoints
  - [ ] Test payment flows in test mode first
  - [ ] Verify webhook signatures
- [ ] **MercadoPago (if using)**:
  - [ ] Production credentials
  - [ ] Test Latin American payment methods

### 5. Monitoring & Error Tracking
- [ ] **Sentry Configuration**:
  - [ ] Create Sentry project
  - [ ] Configure error tracking
  - [ ] Test error reporting
  - [ ] Set up alert rules
- [ ] **Analytics (Mixpanel/Google Analytics)**:
  - [ ] Production API keys
  - [ ] Test event tracking
  - [ ] Verify GDPR compliance

### 6. Email & Communication
- [ ] **SendGrid or SMTP Setup**:
  - [ ] Production API keys
  - [ ] Verify sender reputation
  - [ ] Test transactional emails
  - [ ] Set up email templates
- [ ] **Notification Webhooks**:
  - [ ] Slack/Discord webhooks for alerts
  - [ ] Test critical notifications

## 🚀 Deployment Configuration

### 7. Vercel/Platform Configuration
- [ ] **Environment Variables in Platform**:
  - [ ] Copy all `.env.production` variables
  - [ ] Never commit secrets to git!
  - [ ] Use platform's environment variable settings
- [ ] **Build Configuration**:
  - [ ] Verify build succeeds: `npm run build`
  - [ ] Check bundle size and optimization
  - [ ] Test build locally: `npm run start`

### 8. Security Headers & CORS
- [ ] **Update CORS origins in `middleware.ts`**:
  - [ ] Replace with your production domain
  - [ ] Remove localhost origins
- [ ] **Verify security headers are active**:
  - [ ] Test with security scanners
  - [ ] Check CSP policies work with your domain
  - [ ] Verify HSTS headers

### 9. Cron Jobs & Maintenance
- [ ] **Configure Vercel Cron Jobs**:
  - [ ] Daily cleanup job (2 AM)
  - [ ] Health check job (every 5 minutes)
  - [ ] Generate and set `CRON_SECRET`
- [ ] **Database Maintenance**:
  - [ ] Automated backups
  - [ ] Log rotation
  - [ ] Performance monitoring

## 🧪 Testing & Quality Assurance

### 10. Pre-Deployment Testing
- [ ] **Run all tests**: `npm run test:ci`
- [ ] **Test critical user flows**:
  - [ ] User registration
  - [ ] Biometric authentication
  - [ ] Payment processing
  - [ ] WebAuthn registration/login
- [ ] **Load Testing**:
  - [ ] Test with expected traffic load
  - [ ] Verify rate limiting works
  - [ ] Test database performance

### 11. Security Testing
- [ ] **Security Audit**:
  - [ ] Run security scanners
  - [ ] Test for common vulnerabilities
  - [ ] Verify input validation
  - [ ] Test authentication bypass attempts
- [ ] **Penetration Testing** (recommended):
  - [ ] Third-party security audit
  - [ ] Vulnerability assessment

### 12. Performance Optimization
- [ ] **Frontend Optimization**:
  - [ ] Image optimization
  - [ ] Code splitting
  - [ ] Lazy loading
  - [ ] CDN configuration
- [ ] **API Performance**:
  - [ ] Database query optimization
  - [ ] Caching strategies
  - [ ] Rate limiting tuning

## 📊 Monitoring & Alerting

### 13. Uptime Monitoring
- [ ] **Set up uptime monitors**:
  - [ ] Pingdom, UptimeRobot, or similar
  - [ ] Monitor key endpoints
  - [ ] Alert on downtime
- [ ] **Performance Monitoring**:
  - [ ] Response time tracking
  - [ ] Error rate monitoring
  - [ ] User experience metrics

### 14. Log Management
- [ ] **Structured Logging**:
  - [ ] Configure log aggregation
  - [ ] Set up log retention policies
  - [ ] Monitor for security events
- [ ] **Alerting Rules**:
  - [ ] Critical errors
  - [ ] High error rates
  - [ ] Security incidents
  - [ ] Performance degradation

## 📋 Legal & Compliance

### 15. Legal Requirements
- [ ] **Privacy Policy Updated**
- [ ] **Terms of Service Updated**
- [ ] **GDPR Compliance** (if serving EU users):
  - [ ] Cookie consent
  - [ ] Data processing documentation
  - [ ] User data export/deletion
- [ ] **PCI DSS Compliance** (for payment processing):
  - [ ] Never store card data
  - [ ] Use tokenization
  - [ ] Regular security scans

### 16. Business Continuity
- [ ] **Backup & Recovery Plan**:
  - [ ] Database backups tested
  - [ ] Disaster recovery procedures
  - [ ] RTO/RPO defined
- [ ] **Incident Response Plan**:
  - [ ] Security incident procedures
  - [ ] Communication plan
  - [ ] Rollback procedures

## ✅ Final Verification

### 17. Go-Live Checklist
- [ ] **DNS Configuration**:
  - [ ] Domain pointing to production
  - [ ] SSL certificate active
  - [ ] CDN configured (if using)
- [ ] **Final Tests**:
  - [ ] All critical paths working
  - [ ] Payment processing functional
  - [ ] Email notifications working
  - [ ] Mobile responsiveness verified
  - [ ] Cross-browser compatibility tested

### 18. Post-Deployment Monitoring
- [ ] **Monitor for 48 hours post-launch**:
  - [ ] Error rates
  - [ ] Performance metrics
  - [ ] User feedback
  - [ ] Payment success rates
- [ ] **Documentation Updated**:
  - [ ] Deployment procedures
  - [ ] Troubleshooting guides
  - [ ] API documentation
  - [ ] User guides

## 🚨 Emergency Procedures

### If Something Goes Wrong:
1. **Immediate Actions**:
   - [ ] Check error dashboards (Sentry, logs)
   - [ ] Verify all services are responding
   - [ ] Check payment processor status
   - [ ] Monitor user reports

2. **Rollback Plan**:
   - [ ] Revert to previous deployment
   - [ ] Database rollback procedures
   - [ ] Communication to users
   - [ ] Post-mortem planning

3. **Communication**:
   - [ ] Internal team notification
   - [ ] User communication plan
   - [ ] Status page updates
   - [ ] Customer support preparation

---

## 🔍 Useful Commands

```bash
# Test production build locally
npm run build && npm run start

# Run critical tests
npm run test:critical

# Health check
curl -f https://yourdomain.com/api/health

# Test webhook endpoints
curl -X POST https://yourdomain.com/api/cron/health-check \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Database migrations
npm run db:migrate

# Check bundle size
npm run build -- --analyze
```

## 📚 Additional Resources

- [Next.js Production Checklist](https://nextjs.org/docs/going-to-production)
- [Vercel Deployment Docs](https://vercel.com/docs/deployments)
- [Stripe Production Checklist](https://stripe.com/docs/development/checklist)
- [OWASP Security Checklist](https://owasp.org/www-project-web-security-testing-guide/)

---

**⚠️ Remember: Never deploy to production without completing this entire checklist!**

**🔒 Security is paramount - when in doubt, get a security audit before going live.**