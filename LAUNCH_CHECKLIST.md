# FacePay Launch Checklist

## 1. Pre-launch (5 minutes)

- [ ] **GitHub repo ready**
  - [ ] All code committed and pushed
  - [ ] Repository is public/accessible
  - [ ] README.md is up to date
  - [ ] All sensitive data removed from code

- [ ] **Environment variables list**
  - [ ] SUPABASE_URL configured
  - [ ] SUPABASE_ANON_KEY configured
  - [ ] NEXT_PUBLIC_SUPABASE_URL configured
  - [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY configured
  - [ ] All environment variables documented

- [ ] **Domain options**
  - [ ] Domain name decided
  - [ ] DNS settings ready (if custom domain)
  - [ ] SSL certificate considerations

## 2. Launch (10 minutes)

- [ ] **Vercel deployment steps**
  - [ ] Connect GitHub repository to Vercel
  - [ ] Configure environment variables in Vercel
  - [ ] Deploy to production
  - [ ] Verify deployment successful
  - [ ] Test custom domain (if applicable)

- [ ] **Supabase connection**
  - [ ] Verify database connection works
  - [ ] Test authentication flow
  - [ ] Confirm all tables are properly set up
  - [ ] Verify RLS policies are active

- [ ] **First test transaction**
  - [ ] Complete user registration
  - [ ] Test biometric authentication (Face ID/Touch ID)
  - [ ] Create a test payment
  - [ ] Verify transaction recorded in database
  - [ ] Test payment confirmation flow

## 3. Post-launch (immediate)

- [ ] **Share with 10 people**
  - [ ] Family members: ___/___
  - [ ] Friends: ___/___
  - [ ] Colleagues: ___/___
  - [ ] Social media post created
  - [ ] Collect initial feedback

- [ ] **Monitor analytics**
  - [ ] Vercel analytics dashboard checked
  - [ ] Supabase dashboard monitored
  - [ ] Error logs reviewed
  - [ ] Performance metrics noted

- [ ] **Respond to feedback**
  - [ ] Create feedback collection method
  - [ ] Respond to first user comments
  - [ ] Document bugs/issues found
  - [ ] Plan immediate fixes if needed

---

**Launch Date:** _______________  
**Launch Time:** _______________  
**Launched by:** _______________  

**Notes:**
_Use this section to record any issues encountered or important observations during launch_