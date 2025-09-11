# 🔐 FacePay SDK v1.0.0-production

> **Production-Ready Biometric Payment Authentication** - Complete payment solution with Face ID, Touch ID, and Stripe integration in just one line of code.

[![Bundle Size](https://img.shields.io/badge/bundle%20size-14.8KB%20gzipped-brightgreen)](./facepay-sdk.js)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue)](./facepay-sdk.d.ts)
[![WebAuthn](https://img.shields.io/badge/WebAuthn-Compatible-orange)](https://webauthn.guide/)
[![Stripe](https://img.shields.io/badge/Stripe-Integrated-blueviolet)](https://stripe.com)
[![Cross Platform](https://img.shields.io/badge/Cross%20Platform-iOS%20%7C%20Android%20%7C%20Windows%20%7C%20macOS-lightgrey)](./examples/)

## ✨ Features

- **🚀 One-Line Integration**: Single script tag, works immediately
- **💳 Complete Payment Solution**: Biometric authentication + Stripe payments  
- **🔐 Universal Biometrics**: Face ID, Touch ID, Windows Hello, Android Fingerprint
- **📱 Mobile Optimized**: Beautiful responsive UI modal
- **⚡ Ultra Fast**: 14.8KB gzipped, zero dependencies
- **🛡️ Enterprise Security**: WebAuthn standard, auto-retry, fallbacks
- **📊 Built-in Analytics**: A/B testing, conversion tracking
- **🧑‍💻 Developer Friendly**: Full TypeScript support, comprehensive examples

## 🚀 Quick Start

### 1. Single Line Integration

```html
<!-- Include via CDN -->
<script src="https://cdn.facepay.com/v1/facepay.js"></script>
```

### 2. Initialize & Process Payments (3 lines!)

```javascript
// Initialize with your API key
FacePay.init('pk_live_your_api_key_here');

// Process biometric payment
FacePay.authenticate({
  amount: 99.99,
  currency: 'USD',
  onSuccess: (result) => console.log('Payment successful!', result),
  onError: (error) => console.log('Payment failed:', error)
});
```

**That's it!** The SDK handles everything: biometric authentication, payment processing, beautiful UI, error handling, and analytics.

## 🎯 Production Examples

### E-commerce Checkout

```javascript
// Initialize once in your app
FacePay.init('pk_live_your_key', {
  stripeKey: 'pk_test_stripe_key',
  environment: 'production'
});

// On checkout button click
document.getElementById('checkout').onclick = async () => {
  try {
    const result = await FacePay.authenticate({
      amount: cart.total,
      currency: 'USD',
      userId: user.email,
      showModal: true,
      metadata: {
        orderId: order.id,
        items: cart.items.length
      }
    });
    
    // Payment successful!
    window.location.href = '/success';
    
  } catch (error) {
    if (error.code === 'USER_CANCELLED') {
      // User cancelled, show retry option
      showRetryButton();
    } else if (error.code === 'NOT_SUPPORTED') {
      // Fallback to card payment
      showCardPayment();
    } else {
      // Show error message
      showError(error.message);
    }
  }
};
```

### Subscription Payments

```javascript
// Monthly subscription
FacePay.authenticate({
  amount: 29.99,
  currency: 'USD',
  userId: user.id,
  metadata: {
    subscriptionId: 'premium_monthly',
    billingCycle: 'monthly'
  },
  onSuccess: (result) => {
    // Activate premium features
    activatePremiumSubscription(result);
    showWelcomeModal();
  },
  onError: (error) => {
    // Handle payment failure
    logPaymentError(error);
    showRetryOptions();
  }
});
```

### Mobile App Integration

```javascript
// Perfect for mobile PWAs and hybrid apps
if (await FacePay.isSupported()) {
  const support = await FacePay.isSupported();
  
  if (support.device.isMobile) {
    // Show biometric payment as primary option
    showBiometricPayButton(support.type); // "Face ID", "Touch ID", etc.
  } else {
    // Desktop with Windows Hello, etc.
    showDesktopBiometricOption(support.type);
  }
} else {
  // Fallback to traditional payment methods
  showCardPaymentOnly();
}
```

## 📊 Advanced Configuration

### Full Configuration Options

```javascript
FacePay.init('pk_live_your_key', {
  // Stripe integration
  stripeKey: 'pk_live_stripe_key',
  
  // Environment
  environment: 'production', // 'development', 'staging', 'production'
  
  // UI customization
  theme: 'auto', // 'light', 'dark', 'auto'
  customCSS: `
    .facepay-modal { border-radius: 20px; }
    .facepay-btn-primary { background: #your-brand-color; }
  `,
  
  // Localization
  locale: 'en-US', // 'es-ES', 'fr-FR', 'de-DE', etc.
  
  // Performance
  timeout: 60000, // 60 seconds
  
  // Development
  debug: false // Enable for development
});
```

### Analytics & A/B Testing

```javascript
// The SDK automatically tracks:
// - Authentication attempts
// - Success/failure rates  
// - Device capabilities
// - Performance metrics
// - User journey analytics

// Custom event tracking
FacePay.analytics.track('custom_event', {
  property1: 'value1',
  property2: 'value2'
});

// A/B test different UI variants
const variant = FacePay.getABTestVariant('modal_design');
if (variant === 'modern') {
  // Show modern UI
} else {
  // Show classic UI
}
```

## 🌍 Framework Integration

### React

```jsx
import { useState, useEffect } from 'react';
import FacePay from '@facepay/sdk';

function PaymentButton({ amount, onSuccess, onError }) {
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    FacePay.init('pk_live_your_key');
    FacePay.isSupported().then(support => setIsSupported(support.supported));
  }, []);

  const handlePayment = async () => {
    try {
      const result = await FacePay.authenticate({
        amount,
        currency: 'USD',
        userId: user.id
      });
      onSuccess(result);
    } catch (error) {
      onError(error);
    }
  };

  return isSupported ? (
    <button onClick={handlePayment}>
      🔐 Pay ${amount} with Face ID
    </button>
  ) : (
    <CardPaymentButton amount={amount} />
  );
}
```

### Vue.js

```vue
<template>
  <button v-if="isSupported" @click="processPayment" :disabled="processing">
    🔐 Pay ${{ amount }} with {{ biometricType }}
  </button>
  <card-payment v-else :amount="amount" />
</template>

<script>
import FacePay from '@facepay/sdk';

export default {
  data() {
    return {
      isSupported: false,
      biometricType: '',
      processing: false
    };
  },

  async mounted() {
    FacePay.init('pk_live_your_key');
    const support = await FacePay.isSupported();
    this.isSupported = support.supported;
    this.biometricType = support.type;
  },

  methods: {
    async processPayment() {
      this.processing = true;
      try {
        const result = await FacePay.authenticate({
          amount: this.amount,
          currency: 'USD'
        });
        this.$emit('success', result);
      } catch (error) {
        this.$emit('error', error);
      } finally {
        this.processing = false;
      }
    }
  }
};
</script>
```

### Angular

```typescript
import { Component, OnInit } from '@angular/core';
import FacePay from '@facepay/sdk';

@Component({
  selector: 'app-payment',
  template: `
    <button *ngIf="isSupported" 
            (click)="processPayment()" 
            [disabled]="processing">
      🔐 Pay ${{ amount }} with {{ biometricType }}
    </button>
    <app-card-payment *ngIf="!isSupported" [amount]="amount"></app-card-payment>
  `
})
export class PaymentComponent implements OnInit {
  isSupported = false;
  biometricType = '';
  processing = false;

  async ngOnInit() {
    FacePay.init('pk_live_your_key');
    const support = await FacePay.isSupported();
    this.isSupported = support.supported;
    this.biometricType = support.type;
  }

  async processPayment() {
    this.processing = true;
    try {
      const result = await FacePay.authenticate({
        amount: this.amount,
        currency: 'USD'
      });
      this.paymentSuccess.emit(result);
    } catch (error) {
      this.paymentError.emit(error);
    } finally {
      this.processing = false;
    }
  }
}
```

## 🛡️ Security & Compliance

### Security Features

- **WebAuthn Standard**: Built on W3C WebAuthn specification
- **End-to-End Encryption**: All biometric data encrypted
- **No Data Storage**: Biometric data never leaves the device
- **HTTPS Required**: Enforced for production use
- **CSP Compatible**: Works with strict Content Security Policies
- **PCI DSS Compliant**: When used with certified payment processors

### Privacy by Design

```javascript
// The SDK never stores or transmits:
// ❌ Biometric templates
// ❌ Fingerprint images
// ❌ Face recognition data
// ❌ Personal identifiable information

// Only cryptographic signatures are used:
// ✅ Public key cryptography
// ✅ Challenge-response authentication
// ✅ Device attestation
// ✅ Encrypted communication
```

## 🌍 Browser Support

| Browser | Version | Face ID | Touch ID | Windows Hello | Android Biometric |
|---------|---------|---------|----------|---------------|-------------------|
| **Chrome** | 85+ | ✅ | ✅ | ✅ | ✅ |
| **Safari** | 14+ | ✅ | ✅ | ❌ | ❌ |
| **Firefox** | 87+ | ⚠️ | ⚠️ | ✅ | ✅ |
| **Edge** | 85+ | ✅ | ✅ | ✅ | ✅ |
| **Mobile Safari** | 14+ | ✅ | ✅ | ❌ | ❌ |
| **Chrome Mobile** | 85+ | ✅ | ❌ | ❌ | ✅ |

⚠️ = Limited support or requires feature flags

## 🔧 Development & Testing

### Development Setup

```bash
# Install via NPM
npm install @facepay/sdk

# Or download directly
curl -O https://cdn.facepay.com/v1/facepay.js
```

### Testing Environment

```javascript
// Use test keys for development
FacePay.init('pk_test_your_test_key', {
  environment: 'development',
  debug: true,
  stripeKey: 'pk_test_stripe_test_key'
});

// Test different scenarios
FacePay.authenticate({
  amount: 1.00, // Test with $1.00
  currency: 'USD',
  userId: 'test@example.com'
});
```

### Error Handling

```javascript
try {
  const result = await FacePay.authenticate(params);
} catch (error) {
  switch (error.code) {
    case 'NOT_SUPPORTED':
      // Show card payment fallback
      showCardPayment();
      break;
      
    case 'USER_CANCELLED':
      // User cancelled, show retry option
      showRetryButton();
      break;
      
    case 'TIMEOUT':
      // Authentication timed out
      showTimeoutMessage();
      break;
      
    case 'PAYMENT_FAILED':
      // Payment processing failed
      showPaymentError(error.message);
      break;
      
    case 'NETWORK_ERROR':
      // Network connectivity issues
      showNetworkError();
      break;
      
    default:
      // Unknown error
      showGenericError(error.message);
  }
}
```

## 📊 Analytics & Monitoring

### Built-in Analytics

The SDK automatically tracks:

- **Authentication Success Rate**: Conversion metrics
- **Device Compatibility**: Browser and OS support stats
- **Performance Metrics**: Loading times, authentication speed
- **Error Rates**: Detailed error categorization
- **User Journey**: Step-by-step flow analysis

### Custom Analytics Integration

```javascript
// Google Analytics
FacePay.init('pk_live_key', {
  analytics: (event, data) => {
    gtag('event', event, {
      event_category: 'biometric_payment',
      event_label: data.biometric_type,
      value: data.amount
    });
  }
});

// Segment
FacePay.init('pk_live_key', {
  analytics: (event, data) => {
    analytics.track(event, data);
  }
});

// Custom analytics
FacePay.init('pk_live_key', {
  analytics: (event, data) => {
    fetch('/analytics/track', {
      method: 'POST',
      body: JSON.stringify({ event, data })
    });
  }
});
```

## 🎨 UI Customization

### Theme Customization

```javascript
FacePay.init('pk_live_key', {
  theme: 'light', // 'light', 'dark', 'auto'
  customCSS: `
    /* Customize the payment modal */
    .facepay-modal {
      border-radius: 20px;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
    }
    
    /* Brand colors */
    .facepay-btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
    }
    
    /* Custom logo */
    .facepay-logo::before {
      content: '';
      background: url('/your-logo.svg') no-repeat;
      width: 24px;
      height: 24px;
    }
    
    /* Mobile optimizations */
    @media (max-width: 480px) {
      .facepay-dialog {
        margin: 8px;
        border-radius: 16px;
      }
    }
  `
});
```

### Custom Modal Content

```javascript
// Disable built-in modal and create custom UI
FacePay.authenticate({
  amount: 99.99,
  showModal: false, // Disable built-in modal
  onSuccess: (result) => {
    showCustomSuccessModal(result);
  },
  onError: (error) => {
    showCustomErrorModal(error);
  }
});

// Create your own payment UI
function showCustomPaymentModal() {
  // Your custom modal implementation
  const modal = createModal({
    title: 'Secure Payment',
    content: 'Complete your purchase with biometric authentication',
    onConfirm: () => FacePay.authenticate({ /* ... */ })
  });
}
```

## 🔄 Migration Guide

### From v1.0.0 to v1.0.0-production

```javascript
// OLD API (v1.0.0)
const facePay = new FacePay({
  apiKey: 'your-key',
  baseUrl: 'https://api.com'
});
await facePay.enroll('user@example.com');
await facePay.authenticate('user@example.com');

// NEW API (v1.0.0-production)
FacePay.init('pk_live_your_key');
await FacePay.authenticate({
  amount: 99.99,
  currency: 'USD',
  userId: 'user@example.com'
});
```

### Breaking Changes

1. **Simplified Initialization**: No more constructor, use `FacePay.init()`
2. **Payment Integration**: Built-in Stripe support
3. **UI Modal**: Automatic beautiful modal (can be disabled)
4. **New Error Codes**: Updated error handling system
5. **Analytics**: Built-in tracking and A/B testing

## 📦 API Reference

### FacePay.init(apiKey, options)

Initialize the SDK with your API key and configuration.

```typescript
FacePay.init(apiKey: string, options?: {
  stripeKey?: string;
  environment?: 'development' | 'staging' | 'production';
  timeout?: number;
  debug?: boolean;
  theme?: 'light' | 'dark' | 'auto';
  customCSS?: string;
  locale?: string;
}): void
```

### FacePay.authenticate(params)

Process biometric authentication and payment.

```typescript
FacePay.authenticate(params: {
  amount?: number;
  currency?: string;
  userId?: string;
  onSuccess?: (result: AuthResult) => void;
  onError?: (error: FacePayError) => void;
  onCancel?: (error: FacePayError) => void;
  showModal?: boolean;
  metadata?: Record<string, any>;
}): Promise<AuthResult>
```

### FacePay.isSupported()

Check if biometric authentication is supported.

```typescript
FacePay.isSupported(): Promise<{
  supported: boolean;
  type: string;
  device: DeviceInfo;
}>
```

### Error Codes

```typescript
enum ErrorCodes {
  NOT_SUPPORTED = 'NOT_SUPPORTED',
  USER_CANCELLED = 'USER_CANCELLED',
  TIMEOUT = 'TIMEOUT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  INVALID_CONFIG = 'INVALID_CONFIG',
  STRIPE_ERROR = 'STRIPE_ERROR'
}
```

## 🤝 Support & Resources

### Documentation
- **API Reference**: [docs.facepay.com/api](https://docs.facepay.com/api)
- **Integration Guide**: [docs.facepay.com/integration](https://docs.facepay.com/integration)
- **Security Guide**: [docs.facepay.com/security](https://docs.facepay.com/security)

### Examples
- **Vanilla JS**: [examples/vanilla-js.html](./examples/vanilla-js.html)
- **React**: [examples/react-example.jsx](./examples/react-example.jsx)  
- **Vue.js**: [examples/vue-example.vue](./examples/vue-example.vue)
- **Angular**: [examples/angular-example.ts](./examples/angular-example.ts)

### Community & Support
- **GitHub Issues**: [github.com/facepay/sdk/issues](https://github.com/facepay/sdk/issues)
- **Discord Community**: [discord.gg/facepay](https://discord.gg/facepay)
- **Stack Overflow**: Tag your questions with `facepay-sdk`
- **Email Support**: [support@facepay.com](mailto:support@facepay.com)

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.

## 🚀 Roadmap

### v1.1 (Next Quarter)
- [ ] Enhanced error recovery strategies
- [ ] Multi-factor authentication support
- [ ] Additional payment processors (PayPal, Apple Pay)
- [ ] Advanced fraud detection

### v1.2 (Future)
- [ ] Offline capability with sync
- [ ] Voice biometric authentication  
- [ ] Enterprise SSO integration
- [ ] Advanced analytics dashboard

---

**Made with ❤️ by the FacePay Team**

*Secure payments shouldn't be complex. FacePay makes them simple, fast, and beautiful.*