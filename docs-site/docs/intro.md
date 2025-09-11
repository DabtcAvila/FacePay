---
sidebar_position: 1
title: Welcome to FacePay
description: Biometric Authentication Made Simple - The future of secure, passwordless payments is here.
keywords: [biometric authentication, facial recognition, WebAuthn, payments, API, SDK]
---

# Welcome to FacePay

**Biometric Authentication Made Simple** - The future of secure, passwordless payments is here.

FacePay is a revolutionary biometric payment platform that combines **facial recognition** and **WebAuthn** technologies to create the most secure and user-friendly authentication experience possible. Say goodbye to passwords, PINs, and complicated checkout flows.

## What is FacePay?

FacePay transforms how users authenticate and make payments by leveraging:

- **🔐 Biometric Authentication**: Face ID, Touch ID, Windows Hello, and Android Biometric
- **⚡ WebAuthn Standards**: Industry-standard FIDO2 protocols for maximum security
- **💳 Universal Payments**: Support for Stripe, MercadoPago, SPEI, and more
- **🌍 Cross-Platform**: Works on iOS, Android, Windows, macOS, and all modern browsers
- **🛡️ Enterprise Security**: PCI DSS compliant with advanced fraud detection

## Why Choose FacePay?

### For Developers
- **5-minute integration** with any existing system
- **24KB SDK** with zero dependencies
- **Comprehensive APIs** with OpenAPI documentation
- **Multiple SDKs** for every platform and framework
- **World-class support** with active community

### For Businesses
- **Reduce checkout abandonment** by 40%+
- **Increase conversion rates** with seamless UX
- **Eliminate fraud** with biometric verification
- **Lower support costs** - no password resets
- **Future-proof** your authentication system

### For Users
- **No passwords** to remember or forget
- **Instant authentication** in under 2 seconds
- **Universal compatibility** across all devices
- **Maximum security** with biometric data
- **Privacy first** - data never leaves the device

## Quick Start

Get up and running with FacePay in just 5 minutes:

```javascript live
// 1. Include the SDK
// <script src="https://cdn.facepay.com/sdk/v1/facepay.js"></script>

// 2. Initialize
const facePay = new FacePay({ 
  apiKey: 'your-api-key',
  baseUrl: 'https://your-api.com' 
});

// 3. Enroll user
await facePay.enroll('user@example.com');

// 4. Authenticate
const result = await facePay.authenticate('user@example.com');
if (result.verified) {
  console.log('✅ User authenticated!');
}
```

## Core Features

### 🔒 Multi-Factor Biometric Authentication
- **Primary**: Facial recognition using device cameras
- **Secondary**: WebAuthn passkeys (Touch ID, Face ID, Windows Hello)
- **Fallback**: Traditional authentication methods when biometrics unavailable

### 💸 Integrated Payment Processing
- **Stripe**: Full integration with Stripe Payment Intents
- **MercadoPago**: Latin America's leading payment processor
- **SPEI**: Direct bank transfers in Mexico
- **Extensible**: Add any payment provider via webhooks

### 🚀 Developer Experience
- **5-line integration** for basic functionality
- **Comprehensive error handling** with recovery suggestions
- **Real-time diagnostics** for debugging
- **TypeScript support** with full type definitions
- **Interactive playground** to test without coding

### 🏗️ Enterprise Ready
- **Scalable architecture** handling millions of transactions
- **99.9% uptime SLA** with global infrastructure
- **SOC 2 Type II** and PCI DSS compliance
- **24/7 monitoring** with real-time alerts
- **Dedicated support** for enterprise customers

## Platform Support

| Platform | Face ID | Touch ID | Windows Hello | Android Biometric |
|----------|---------|----------|---------------|-------------------|
| **iOS Safari** | ✅ | ✅ | ❌ | ❌ |
| **Android Chrome** | ✅ | ❌ | ❌ | ✅ |
| **Windows Chrome** | ✅ | ❌ | ✅ | ❌ |
| **macOS Safari** | ✅ | ✅ | ❌ | ❌ |
| **Linux Firefox** | ⚠️ | ❌ | ❌ | ❌ |

*⚠️ = Limited support or requires additional configuration*

## Security & Compliance

FacePay is built with security at its core:

- **Biometric data** never leaves the user's device
- **End-to-end encryption** for all communications
- **Zero-knowledge architecture** - we can't access your data
- **Regular security audits** by third-party experts
- **GDPR, CCPA compliant** with built-in privacy controls

## Next Steps

import Link from '@docusaurus/Link';

<div style={{display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '2rem'}}>
  <Link to="/docs/getting-started/quickstart" className="button button--primary button--lg">
    🚀 Quick Start Guide
  </Link>
  <Link to="/docs/sdk/overview" className="button button--secondary button--lg">
    📚 SDK Documentation
  </Link>
  <Link to="/playground" className="button button--secondary button--lg">
    🎮 Try the Playground
  </Link>
  <Link to="/docs/integrations/overview" className="button button--secondary button--lg">
    🔌 View Integrations
  </Link>
</div>

## Community & Support

Join thousands of developers building the future of authentication:

- **Discord**: [discord.gg/facepay](https://discord.gg/facepay) - Real-time help and discussions
- **GitHub**: [github.com/facepay/sdk](https://github.com/facepay/sdk) - Issues, feature requests, and contributions
- **Stack Overflow**: [stackoverflow.com/questions/tagged/facepay](https://stackoverflow.com/questions/tagged/facepay) - Technical Q&A
- **Email Support**: [support@facepay.com](mailto:support@facepay.com) - Direct technical assistance

---

**Ready to revolutionize your authentication experience?** Let's get started! 🚀