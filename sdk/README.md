# 🔐 FacePay SDK v1.0.0

> **Biometric Authentication Made Simple** - Production-ready WebAuthn SDK in just 5 lines of code.

[![Bundle Size](https://img.shields.io/badge/bundle%20size-24KB-brightgreen)](./facepay.js)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue)](./types.d.ts)
[![WebAuthn](https://img.shields.io/badge/WebAuthn-Compatible-orange)](https://webauthn.guide/)
[![Cross Platform](https://img.shields.io/badge/Cross%20Platform-iOS%20%7C%20Android%20%7C%20Windows%20%7C%20macOS-lightgrey)](./demo.html)

## ✨ Features

- **🚀 Ultra Simple**: 5-line integration, 24KB bundle size
- **🔐 Real Biometrics**: Face ID, Touch ID, Windows Hello, Android Fingerprint
- **📱 Universal**: Works on all modern browsers and platforms
- **⚡ Fast**: Zero dependencies, optimized for performance
- **🛡️ Secure**: Built on WebAuthn standard with auto-retry and fallbacks
- **🧑‍💻 Developer Friendly**: Full TypeScript support, comprehensive error handling

## 🚀 Quick Start

### 1. Include the SDK

```html
<!-- CDN -->
<script src="https://cdn.facepay.com/sdk/v1/facepay.js"></script>

<!-- Local -->
<script src="./facepay.js"></script>

<!-- ES Module -->
import FacePay from './facepay.js';

<!-- Node.js -->
const FacePay = require('./facepay.js');
```

### 2. Initialize & Use (5 lines!)

```javascript
// Initialize
const facePay = new FacePay({ 
  apiKey: 'your-api-key', 
  baseUrl: 'https://your-api.com' 
});

// Enroll user
await facePay.enroll('user@example.com');

// Authenticate  
const result = await facePay.authenticate('user@example.com');

// Check result
if (result.verified) console.log('✅ Authenticated!');
```

## 📖 Complete Documentation

### Initialization

```javascript
const facePay = new FacePay({
  apiKey: 'your-api-key',        // Your API key
  baseUrl: 'https://api.com',    // Your backend URL
  timeout: 60000,                // Timeout in ms (optional)
  debug: true                    // Enable debug logs (optional)
});
```

### Core Methods

#### `enroll(user, options)`
Register a user for biometric authentication.

```javascript
// Simple enrollment
await facePay.enroll('user@example.com');

// Advanced enrollment
await facePay.enroll({
  userId: 'user123',
  userName: 'john@example.com',
  userDisplayName: 'John Doe'
}, { timeout: 30000 });
```

**Returns:** `EnrollmentResult`
```typescript
{
  success: boolean,
  credentialId: string,
  biometricType: string,        // "Face ID", "Touch ID", etc.
  verified: boolean,
  metadata: {
    timestamp: string,
    deviceType: 'mobile' | 'desktop',
    platform: string
  }
}
```

#### `authenticate(user, options)`
Authenticate a user with biometric data.

```javascript
// Simple authentication
const result = await facePay.authenticate('user@example.com');

// Advanced authentication
const result = await facePay.authenticate({
  email: 'user@example.com',
  userId: 'user123'
});
```

**Returns:** `AuthenticationResult`
```typescript
{
  success: boolean,
  credentialId: string,
  biometricType: string,
  verified: boolean,
  user: { email: string, id?: string },
  metadata: {
    timestamp: string,
    deviceType: 'mobile' | 'desktop', 
    platform: string
  }
}
```

#### `verify(credential, options)`
Verify a biometric credential (utility function).

```javascript
const verification = await facePay.verify(credential);
console.log(verification.valid); // true/false
```

### Utility Methods

#### `isSupported()`
Check if biometric authentication is supported.

```javascript
const support = await facePay.isSupported();
console.log(support.supported);      // boolean
console.log(support.biometricType);  // "Face ID", "Touch ID", etc.
console.log(support.deviceInfo);     // Device details
console.log(support.issues);         // Any blocking issues
```

#### `test()`
Test SDK functionality and readiness.

```javascript
const test = await facePay.test();
console.log(test.overall);  // 'pass', 'fail', or 'error'
console.log(test.ready);    // boolean - ready for use
console.log(test.tests);    // Detailed test results
```

#### `getDiagnostics()`
Get detailed diagnostic information for debugging.

```javascript
const diag = await facePay.getDiagnostics();
console.log(diag.version);        // SDK version
console.log(diag.capabilities);   // Device capabilities
console.log(diag.environment);    // Environment info
console.log(diag.issues);         // Any issues found
```

### Static Methods

```javascript
// Check support without instance
const support = await FacePay.isSupported();

// Run tests without instance  
const test = await FacePay.test();

// Access version and error codes
console.log(FacePay.version);      // "1.0.0"
console.log(FacePay.ERROR_CODES);  // Error code constants
```

## 🎯 Error Handling

The SDK provides comprehensive error handling with specific error codes and suggestions:

```javascript
try {
  await facePay.authenticate('user@example.com');
} catch (error) {
  console.log(error.code);            // Error code (e.g., 'USER_CANCELLED')
  console.log(error.message);         // Human-readable message
  console.log(error.isRecoverable);   // Can user retry?
  console.log(error.suggestedAction); // What should user do?
}
```

### Error Codes

| Code | Description | Recoverable |
|------|-------------|-------------|
| `NOT_SUPPORTED` | Device/browser doesn't support biometrics | ❌ |
| `USER_CANCELLED` | User cancelled biometric prompt | ✅ |
| `TIMEOUT` | Operation timed out | ✅ |
| `SECURITY_ERROR` | Security requirements not met (e.g., need HTTPS) | ❌ |
| `NETWORK_ERROR` | Network/API communication failed | ✅ |
| `REGISTRATION_FAILED` | Biometric enrollment failed | ✅ |
| `AUTHENTICATION_FAILED` | Biometric authentication failed | ✅ |
| `VERIFICATION_FAILED` | Credential verification failed | ✅ |

## 🌍 Browser Support

| Browser | Version | Face ID | Touch ID | Windows Hello | Android Biometric |
|---------|---------|---------|----------|---------------|-------------------|
| **Chrome** | 67+ | ✅ | ✅ | ✅ | ✅ |
| **Safari** | 14+ | ✅ | ✅ | ❌ | ❌ |
| **Firefox** | 60+ | ⚠️ | ⚠️ | ✅ | ✅ |
| **Edge** | 79+ | ✅ | ✅ | ✅ | ✅ |
| **Mobile Safari** | 14+ | ✅ | ✅ | ❌ | ❌ |
| **Chrome Mobile** | 67+ | ✅ | ❌ | ❌ | ✅ |

*⚠️ = Limited support or requires additional setup*

## 📋 Requirements

- **HTTPS**: Required for production (localhost works for development)
- **Modern Browser**: WebAuthn support required
- **Biometric Hardware**: Face ID, Touch ID, Windows Hello, or fingerprint sensor
- **User Gesture**: Biometric prompts must be triggered by user interaction

## 🎬 Demo

Open [`demo.html`](./demo.html) in your browser to see the SDK in action:

1. **System Check**: Verify your device compatibility
2. **Interactive Demo**: Try enrollment and authentication
3. **Real-time Logs**: Watch the SDK work step by step
4. **Test Suite**: Run comprehensive functionality tests

```bash
# Serve demo locally
python -m http.server 8000
# or
npx serve .
# or  
php -S localhost:8000

# Open http://localhost:8000/demo.html
```

## 🔧 Advanced Usage

### Custom Error Handling

```javascript
const facePay = new FacePay({
  apiKey: 'your-key',
  errorHandler: (error) => {
    // Custom error processing
    analytics.track('biometric_error', { code: error.code });
    showUserFriendlyMessage(error.suggestedAction);
  }
});
```

### Request Interceptors

```javascript
const facePay = new FacePay({
  apiKey: 'your-key',
  requestInterceptor: (request) => {
    // Add custom headers
    request.headers['X-Custom-Header'] = 'value';
    return request;
  }
});
```

### Analytics Integration

```javascript
const facePay = new FacePay({
  apiKey: 'your-key',
  analytics: (event, data) => {
    // Track biometric events
    gtag('event', event, { custom_parameter: data });
  }
});
```

## 🏗️ Backend Integration

The SDK expects your backend to implement these endpoints:

### Registration Endpoints
```
POST /api/webauthn/register/start
POST /api/webauthn/register/complete
```

### Authentication Endpoints  
```
POST /api/webauthn/authenticate/start
POST /api/webauthn/authenticate/complete
```

### Demo Endpoints (for testing)
```
POST /api/webauthn/demo-register/start
POST /api/webauthn/demo-register/complete
```

Refer to the [FacePay Backend Documentation](../src/app/api/webauthn/) for implementation details.

## 🔍 Debugging

Enable debug mode to see detailed logs:

```javascript
const facePay = new FacePay({ debug: true });

// Or enable later
facePay.config.debug = true;
```

Use diagnostic tools:

```javascript
// Get comprehensive system info
const diag = await facePay.getDiagnostics();
console.table(diag.capabilities);

// Test everything
const test = await facePay.test();
console.log('SDK Ready:', test.ready);
```

## 📦 Bundle Information

- **Size**: 24KB uncompressed (< 8KB gzipped)
- **Dependencies**: Zero runtime dependencies
- **ES Modules**: Compatible with modern bundlers
- **Tree Shaking**: Unused code can be eliminated
- **CDN Ready**: Optimized for CDN delivery

## 🔄 Framework Integration

### React

```jsx
import { useState, useEffect } from 'react';
import FacePay from './facepay.js';

function BiometricAuth() {
  const [facePay] = useState(() => new FacePay({ apiKey: 'key' }));
  const [supported, setSupported] = useState(false);
  
  useEffect(() => {
    facePay.isSupported().then(result => setSupported(result.supported));
  }, []);

  const handleAuth = async () => {
    try {
      const result = await facePay.authenticate('user@example.com');
      console.log('Authenticated!', result);
    } catch (error) {
      console.error('Auth failed:', error.message);
    }
  };

  return supported ? (
    <button onClick={handleAuth}>🔐 Authenticate</button>
  ) : (
    <p>Biometric auth not supported</p>
  );
}
```

### Vue.js

```vue
<template>
  <div>
    <button v-if="supported" @click="authenticate">
      🔐 Authenticate
    </button>
    <p v-else>Biometric auth not supported</p>
  </div>
</template>

<script>
import FacePay from './facepay.js';

export default {
  data() {
    return {
      facePay: new FacePay({ apiKey: 'your-key' }),
      supported: false
    };
  },
  
  async mounted() {
    const support = await this.facePay.isSupported();
    this.supported = support.supported;
  },
  
  methods: {
    async authenticate() {
      try {
        const result = await this.facePay.authenticate('user@example.com');
        console.log('Success!', result);
      } catch (error) {
        console.error('Failed:', error.message);
      }
    }
  }
};
</script>
```

### Angular

```typescript
import { Component, OnInit } from '@angular/core';
import FacePay from './facepay.js';

@Component({
  selector: 'app-biometric-auth',
  template: `
    <button *ngIf="supported" (click)="authenticate()">
      🔐 Authenticate
    </button>
    <p *ngIf="!supported">Biometric auth not supported</p>
  `
})
export class BiometricAuthComponent implements OnInit {
  private facePay = new FacePay({ apiKey: 'your-key' });
  supported = false;

  async ngOnInit() {
    const support = await this.facePay.isSupported();
    this.supported = support.supported;
  }

  async authenticate() {
    try {
      const result = await this.facePay.authenticate('user@example.com');
      console.log('Authenticated!', result);
    } catch (error) {
      console.error('Auth failed:', error.message);
    }
  }
}
```

## 🚨 Security Best Practices

1. **Always use HTTPS** in production
2. **Validate credentials** on your backend
3. **Store minimal user data** required for authentication
4. **Implement proper session management**
5. **Use unique user identifiers**
6. **Monitor for suspicious activity**
7. **Keep SDK updated** for security patches

## 📝 License

MIT License - see [LICENSE](../LICENSE) for details.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

- **Documentation**: [https://docs.facepay.com](https://docs.facepay.com)
- **GitHub Issues**: [https://github.com/facepay/sdk/issues](https://github.com/facepay/sdk/issues)
- **Email**: support@facepay.com
- **Discord**: [https://discord.gg/facepay](https://discord.gg/facepay)

## 🎯 Roadmap

- **v1.1**: Enhanced error recovery and retry strategies
- **v1.2**: Multi-factor authentication support  
- **v1.3**: Offline capability and sync
- **v1.4**: Advanced analytics and reporting
- **v1.5**: Enterprise features and SSO integration

---

**Made with ❤️ by the FacePay Team**

*Biometric authentication shouldn't be complex. FacePay makes it simple.*