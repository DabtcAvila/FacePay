---
sidebar_position: 1
title: Integration Overview
description: Comprehensive guide to integrating FacePay with your platform - e-commerce, CMS, frameworks, and more.
keywords: [integration, platforms, e-commerce, CMS, frameworks, plugins]
---

# Integration Overview

FacePay integrates seamlessly with virtually any platform, framework, or technology stack. Whether you're building a custom application or using an existing platform like Shopify or WordPress, we've got you covered.

## Platform Categories

### 🛒 E-commerce Platforms

Ready-to-install plugins and extensions:

| Platform | Status | Installation Time | Features |
|----------|--------|-------------------|----------|
| **[Shopify](/docs/integrations/shopify/installation)** | ✅ Available | 5 minutes | Checkout, Admin, Analytics |
| **[WooCommerce](/docs/integrations/woocommerce/installation)** | ✅ Available | 5 minutes | Payment Gateway, Subscriptions |
| **[Magento](/docs/integrations/magento/installation)** | ✅ Available | 10 minutes | Multi-store, B2B Features |
| **BigCommerce** | 🔄 Coming Soon | - | Native App |
| **PrestaShop** | 🔄 Coming Soon | - | Module System |

### 📝 Content Management Systems

Powerful CMS integrations:

| Platform | Status | Installation Time | Features |
|----------|--------|-------------------|----------|
| **[WordPress](/docs/integrations/wordpress/plugin-installation)** | ✅ Available | 3 minutes | Login, Registration, Membership |
| **Drupal** | ✅ Available | 5 minutes | User Management, Commerce |
| **Joomla** | 🔄 Coming Soon | - | Component System |

### ⚛️ JavaScript Frameworks

Native framework support:

| Framework | Status | Package | Features |
|-----------|--------|---------|----------|
| **[React](/docs/integrations/frameworks/react)** | ✅ Available | `@facepay/react` | Hooks, Components |
| **[Vue.js](/docs/integrations/frameworks/vue)** | ✅ Available | `@facepay/vue` | Composables, Components |
| **[Angular](/docs/integrations/frameworks/angular)** | ✅ Available | `@facepay/angular` | Services, Guards |
| **[Svelte](/docs/integrations/frameworks/svelte)** | ✅ Available | `@facepay/svelte` | Stores, Actions |
| **[Next.js](/docs/integrations/frameworks/next-js)** | ✅ Available | SSR Support | API Routes, Middleware |
| **[Nuxt](/docs/integrations/frameworks/nuxt)** | ✅ Available | Module System | Auto-imports, Plugins |

### 📱 Mobile Development

Native mobile SDKs:

| Platform | Status | Package | Features |
|----------|--------|---------|----------|
| **[iOS Native](/docs/integrations/mobile/ios-native)** | ✅ Available | Swift Package | Face ID, Touch ID |
| **[Android Native](/docs/integrations/mobile/android-native)** | ✅ Available | AAR Library | Biometric API |
| **[React Native](/docs/integrations/mobile/react-native)** | ✅ Available | `@facepay/react-native` | Cross-platform |
| **[Flutter](/docs/integrations/mobile/flutter)** | ✅ Available | Dart Package | iOS & Android |
| **Xamarin** | 🔄 Coming Soon | - | Cross-platform |

## Integration Approaches

### 1. **Plug-and-Play Solutions**
Pre-built plugins for popular platforms:
- **One-click installation** from app stores
- **Automatic updates** and security patches
- **Built-in best practices** and optimizations
- **Visual configuration** interfaces

#### Example: Shopify App
```bash
# Install from Shopify App Store
# 1. Visit Shopify App Store
# 2. Search "FacePay"
# 3. Click "Install"
# 4. Configure in 2 minutes
```

### 2. **SDK Integration**
Custom implementation using our SDKs:
- **Full control** over user experience
- **Custom branding** and styling
- **Advanced features** and customization
- **Direct API access**

#### Example: React Integration
```jsx
import { useFacePay } from '@facepay/react';

function CheckoutButton() {
  const { authenticate, isSupported } = useFacePay();
  
  return isSupported ? (
    <button onClick={authenticate}>
      Pay with FacePay
    </button>
  ) : (
    <button>Pay with Card</button>
  );
}
```

### 3. **API Integration**
Direct API implementation:
- **Maximum flexibility** for custom systems
- **Server-side integration** capabilities
- **Webhook support** for real-time events
- **Enterprise features**

#### Example: Direct API
```python
import requests

response = requests.post('https://api.facepay.com/v1/biometric/authenticate', {
  'headers': {'Authorization': 'Bearer ' + jwt_token},
  'json': {'email': 'user@example.com'}
})
```

## Quick Start by Platform

### E-commerce (5 minutes)

1. **Choose your platform**:
   - Shopify → Install app from store
   - WooCommerce → Download WordPress plugin
   - Magento → Install via Composer

2. **Configure settings**:
   - Add API keys
   - Enable biometric checkout
   - Customize appearance

3. **Test integration**:
   - Use test mode
   - Verify checkout flow
   - Check analytics

### Website/App (10 minutes)

1. **Install SDK**:
   ```bash
   npm install @facepay/sdk
   ```

2. **Initialize**:
   ```javascript
   const facePay = new FacePay({
     apiKey: 'pk_test_your_key'
   });
   ```

3. **Implement authentication**:
   ```javascript
   await facePay.enroll('user@example.com');
   await facePay.authenticate('user@example.com');
   ```

### Mobile App (15 minutes)

1. **Add dependency**:
   ```xml
   <!-- Android -->
   <dependency>
     <groupId>com.facepay</groupId>
     <artifactId>facepay-android</artifactId>
   </dependency>
   ```

2. **Initialize SDK**:
   ```java
   FacePay facePay = new FacePay.Builder()
     .setApiKey("pk_test_your_key")
     .build();
   ```

3. **Implement biometrics**:
   ```java
   facePay.authenticate("user@example.com", callback);
   ```

## Integration Features

### 🔐 **Universal Authentication**
- **Biometric login** for existing users
- **Passwordless registration** for new users
- **Multi-factor authentication** support
- **Session management** integration

### 💳 **Payment Processing**
- **Checkout integration** with major processors
- **Subscription billing** support
- **Refund handling** capabilities
- **Payment analytics** and reporting

### 🎨 **Customization**
- **White-label solutions** available
- **Custom branding** and theming
- **Flexible UI components** 
- **Developer-friendly APIs**

### 📊 **Analytics & Monitoring**
- **Real-time dashboards** 
- **Conversion tracking**
- **Security monitoring**
- **Performance metrics**

## Platform-Specific Benefits

### For E-commerce
- **Reduce cart abandonment** by 40%+
- **Increase conversion rates** with seamless checkout
- **Eliminate fraud** with biometric verification
- **Boost customer satisfaction** scores

### For SaaS Applications
- **Improve user onboarding** experience
- **Reduce support tickets** (no password resets)
- **Enhance security** posture
- **Increase user engagement**

### for Mobile Apps
- **Native biometric integration**
- **Offline capability** where supported
- **Cross-platform consistency**
- **App store optimization**

## Getting Started

### 1. **Choose Your Integration Path**

<div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginTop: '2rem'}}>
  <div className="card">
    <div className="card__header">
      <h3>🛒 E-commerce Plugin</h3>
    </div>
    <div className="card__body">
      <p>Pre-built solutions for popular platforms</p>
      <ul>
        <li>Quick installation</li>
        <li>Zero coding required</li>
        <li>Automatic updates</li>
      </ul>
    </div>
    <div className="card__footer">
      <a href="/docs/integrations/shopify/installation" className="button button--primary button--block">
        Get Started
      </a>
    </div>
  </div>

  <div className="card">
    <div className="card__header">
      <h3>⚛️ Custom Integration</h3>
    </div>
    <div className="card__body">
      <p>Build with our SDKs and APIs</p>
      <ul>
        <li>Full customization</li>
        <li>Advanced features</li>
        <li>Developer control</li>
      </ul>
    </div>
    <div className="card__footer">
      <a href="/docs/sdk/overview" className="button button--secondary button--block">
        View SDKs
      </a>
    </div>
  </div>

  <div className="card">
    <div className="card__header">
      <h3>🏢 Enterprise</h3>
    </div>
    <div className="card__body">
      <p>Custom solutions for large organizations</p>
      <ul>
        <li>White-label options</li>
        <li>Dedicated support</li>
        <li>SLA guarantees</li>
      </ul>
    </div>
    <div className="card__footer">
      <a href="mailto:enterprise@facepay.com" className="button button--outline button--block">
        Contact Sales
      </a>
    </div>
  </div>
</div>

### 2. **Get Your API Keys**

1. **Sign up**: [dashboard.facepay.com](https://dashboard.facepay.com)
2. **Create project**: Set up your first project
3. **Copy keys**: Get your publishable and secret keys
4. **Start building**: Follow platform-specific guides

### 3. **Test Integration**

- **Sandbox mode**: Test without real transactions
- **Test credentials**: Use provided test data
- **Debug tools**: Built-in diagnostics and logging
- **Support**: Get help from our team

## Success Stories

### E-commerce Results
- **Shopify merchants** see 45% reduction in cart abandonment
- **WooCommerce stores** report 60% faster checkouts
- **Magento sites** achieve 99.8% fraud reduction

### SaaS Applications
- **B2B platforms** reduce onboarding time by 70%
- **Fintech apps** achieve 99.9% authentication success
- **Healthcare systems** improve compliance ratings

### Mobile Apps
- **iOS apps** see 80% user preference for biometric login
- **Android apps** report 90% reduction in password resets
- **React Native** apps achieve cross-platform consistency

## Integration Support

### Self-Service Resources
- **[Documentation](/docs)** - Comprehensive guides
- **[Code Examples](/docs/sdk/javascript/examples)** - Copy-paste implementations
- **[Video Tutorials](https://youtube.com/facepay)** - Step-by-step walkthroughs
- **[Community Forum](https://community.facepay.com)** - Developer discussions

### Direct Support
- **Discord**: [discord.gg/facepay](https://discord.gg/facepay) - Real-time chat
- **GitHub**: [github.com/facepay](https://github.com/facepay) - Issues and feature requests
- **Email**: [integrations@facepay.com](mailto:integrations@facepay.com) - Integration assistance
- **Video Call**: Schedule a [technical consultation](https://calendly.com/facepay/integration)

### Enterprise Support
- **Dedicated account manager**
- **Priority support queue**
- **Custom integration assistance**
- **SLA guarantees**

## Next Steps

Ready to integrate FacePay? Choose your path:

<div style={{display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '2rem'}}>
  <a href="/docs/integrations/shopify/installation" className="button button--primary">
    🛒 Shopify Integration
  </a>
  <a href="/docs/integrations/frameworks/react" className="button button--secondary">
    ⚛️ React Integration
  </a>
  <a href="/docs/integrations/mobile/react-native" className="button button--secondary">
    📱 React Native
  </a>
  <a href="/docs/integrations/wordpress/plugin-installation" className="button button--secondary">
    📝 WordPress Plugin
  </a>
</div>

---

**Every platform. Every framework. Every use case.** FacePay integrates everywhere. 🌍