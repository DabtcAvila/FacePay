---
sidebar_position: 1
title: SDK Overview
description: Comprehensive overview of FacePay SDK - the world's simplest biometric authentication SDK.
keywords: [SDK, biometric authentication, WebAuthn, JavaScript, TypeScript]
---

# FacePay SDK Overview

The **FacePay SDK** is a production-ready JavaScript library that makes biometric authentication incredibly simple. With just **24KB** and **zero dependencies**, it provides world-class security with developer-friendly APIs.

## Features

### 🚀 Ultra Simple Integration
- **5-line integration** for basic functionality
- **24KB bundle size** (< 8KB gzipped)
- **Zero runtime dependencies**
- **TypeScript support** with full type definitions
- **Tree-shakable** for optimal bundle sizes

### 🔐 Advanced Biometric Authentication
- **Face ID** on iOS/macOS Safari
- **Touch ID** on iOS/macOS devices  
- **Windows Hello** on Windows devices
- **Android Biometric** on Android Chrome
- **WebAuthn standard** for maximum compatibility

### 🛡️ Enterprise Security
- **Biometric data** never leaves the device
- **End-to-end encryption** for all communications
- **FIDO2/WebAuthn compliance** with industry standards
- **Automatic fallbacks** when biometrics unavailable
- **Comprehensive error handling** with recovery suggestions

### 🌍 Universal Compatibility
- **All modern browsers** (Chrome 67+, Safari 14+, Firefox 60+, Edge 79+)
- **Cross-platform** (iOS, Android, Windows, macOS, Linux)
- **Framework agnostic** (works with React, Vue, Angular, vanilla JS)
- **Mobile responsive** with touch-optimized interfaces

## Quick Example

Here's how simple it is to add biometric authentication to your app:

```javascript live
// 1. Initialize the SDK
const facePay = new FacePay({
  apiKey: 'pk_test_your_key_here',
  baseUrl: 'https://api.facepay.com'
});

// 2. Check if biometrics are supported
const isSupported = await facePay.isSupported();
console.log('Biometric support:', isSupported.supported);

// 3. Enroll a user
const enrollment = await facePay.enroll('user@example.com');
console.log('Enrollment success:', enrollment.success);

// 4. Authenticate the user
const auth = await facePay.authenticate('user@example.com');
console.log('Authentication success:', auth.verified);
```

## SDK Methods

### Core Methods

#### `new FacePay(config)`
Initialize the FacePay SDK with your configuration.

```javascript
const facePay = new FacePay({
  apiKey: 'pk_test_...',     // Required: Your API key
  baseUrl: 'https://...',    // Required: Your backend URL
  timeout: 60000,            // Optional: Request timeout (ms)
  debug: false               // Optional: Enable debug logging
});
```

#### `enroll(user, options?)`
Register a user for biometric authentication.

```javascript
// Simple enrollment
await facePay.enroll('user@example.com');

// Advanced enrollment with options
await facePay.enroll({
  userId: 'user_123',
  userName: 'user@example.com', 
  userDisplayName: 'John Doe'
}, {
  timeout: 30000,
  requireUserVerification: true
});
```

**Returns**: `EnrollmentResult`
```typescript
{
  success: boolean;
  credentialId: string;
  biometricType: string;        // "Face ID", "Touch ID", etc.
  verified: boolean;
  metadata: {
    timestamp: string;
    deviceType: 'mobile' | 'desktop';
    platform: string;
  }
}
```

#### `authenticate(user, options?)`
Authenticate a user with their biometric data.

```javascript
// Simple authentication
const result = await facePay.authenticate('user@example.com');

// Advanced authentication
const result = await facePay.authenticate({
  email: 'user@example.com',
  userId: 'user_123'
}, {
  timeout: 30000,
  allowCredentials: ['credential_id_1', 'credential_id_2']
});
```

**Returns**: `AuthenticationResult`
```typescript
{
  success: boolean;
  credentialId: string;
  biometricType: string;
  verified: boolean;
  user: { 
    email: string; 
    id?: string;
    displayName?: string;
  };
  metadata: {
    timestamp: string;
    deviceType: 'mobile' | 'desktop';
    platform: string;
  }
}
```

### Utility Methods

#### `isSupported()`
Check if biometric authentication is supported on the current device.

```javascript
const support = await facePay.isSupported();

console.log(support.supported);      // boolean
console.log(support.biometricType);  // "Face ID", "Touch ID", etc.
console.log(support.deviceInfo);     // Detailed device info
console.log(support.issues);         // Array of blocking issues
```

#### `test()`
Run comprehensive SDK tests to verify functionality.

```javascript
const testResults = await facePay.test();

console.log(testResults.overall);    // 'pass' | 'fail' | 'error'
console.log(testResults.ready);      // boolean
console.log(testResults.tests);      // Detailed test results
```

#### `getDiagnostics()`
Get detailed diagnostic information for debugging.

```javascript
const diagnostics = await facePay.getDiagnostics();

console.log(diagnostics.version);        // SDK version
console.log(diagnostics.capabilities);   // Device capabilities
console.log(diagnostics.environment);    // Environment info
console.log(diagnostics.issues);         // Any issues found
```

#### `verify(credential, options?)`
Verify a biometric credential (utility function).

```javascript
const verification = await facePay.verify(credential, {
  challenge: 'custom_challenge',
  origin: 'https://yoursite.com'
});

console.log(verification.valid);     // boolean
console.log(verification.details);   // Verification details
```

## Error Handling

The SDK provides comprehensive error handling with specific error codes:

```javascript
try {
  await facePay.authenticate('user@example.com');
} catch (error) {
  console.log('Error code:', error.code);
  console.log('Message:', error.message);
  console.log('Recoverable:', error.isRecoverable);
  console.log('Suggestion:', error.suggestedAction);
}
```

### Common Error Codes

| Code | Description | Recoverable | Action |
|------|-------------|-------------|--------|
| `NOT_SUPPORTED` | Device/browser doesn't support biometrics | ❌ | Show alternative auth |
| `USER_CANCELLED` | User cancelled biometric prompt | ✅ | Allow retry |
| `TIMEOUT` | Operation timed out | ✅ | Retry with longer timeout |
| `SECURITY_ERROR` | Security requirements not met | ❌ | Ensure HTTPS |
| `NETWORK_ERROR` | Network/API communication failed | ✅ | Check connection |
| `REGISTRATION_FAILED` | Biometric enrollment failed | ✅ | Retry enrollment |
| `AUTHENTICATION_FAILED` | Biometric verification failed | ✅ | Try again |

## Static Methods & Properties

Access SDK information without creating an instance:

```javascript
// Check support without instance
const support = await FacePay.isSupported();

// Run tests without instance
const tests = await FacePay.test();

// Access version and constants
console.log(FacePay.version);         // "1.0.0"
console.log(FacePay.ERROR_CODES);     // Error code constants
```

## Configuration Options

### Initialization Options

```typescript
interface FacePayConfig {
  apiKey: string;                    // Your publishable API key
  baseUrl: string;                   // Your backend API URL
  timeout?: number;                  // Request timeout (default: 60000ms)
  debug?: boolean;                   // Enable debug logging (default: false)
  
  // Advanced options
  errorHandler?: (error: FacePayError) => void;
  requestInterceptor?: (request: Request) => Request;
  responseInterceptor?: (response: Response) => Response;
  analytics?: (event: string, data: any) => void;
}
```

### Method Options

```typescript
// Enrollment options
interface EnrollmentOptions {
  timeout?: number;
  requireUserVerification?: boolean;
  authenticatorAttachment?: 'platform' | 'cross-platform';
  userVerification?: 'required' | 'preferred' | 'discouraged';
}

// Authentication options  
interface AuthenticationOptions {
  timeout?: number;
  allowCredentials?: string[];
  userVerification?: 'required' | 'preferred' | 'discouraged';
}
```

## Browser Support

| Browser | Version | Face ID | Touch ID | Windows Hello | Android Biometric |
|---------|---------|---------|----------|---------------|-------------------|
| **Chrome** | 67+ | ✅ | ✅ | ✅ | ✅ |
| **Safari** | 14+ | ✅ | ✅ | ❌ | ❌ |
| **Firefox** | 60+ | ⚠️ | ⚠️ | ✅ | ✅ |
| **Edge** | 79+ | ✅ | ✅ | ✅ | ✅ |

*⚠️ = Limited support or requires additional setup*

## Requirements

### Technical Requirements
- **HTTPS**: Required in production (localhost OK for development)
- **Modern Browser**: WebAuthn support required
- **User Gesture**: Biometric prompts must be triggered by user interaction

### Device Requirements
- **Biometric Hardware**: Face ID, Touch ID, Windows Hello, or fingerprint sensor
- **Operating System**: 
  - iOS 14+ (for Face ID/Touch ID)
  - Android 9+ (for fingerprint/face unlock)
  - Windows 10+ (for Windows Hello)
  - macOS 10.15+ (for Touch ID)

## Framework Integration

### React Hook Example
```jsx
import { useState, useEffect } from 'react';
import FacePay from '@facepay/sdk';

function useFacePay() {
  const [facePay] = useState(() => new FacePay({
    apiKey: process.env.REACT_APP_FACEPAY_KEY
  }));
  
  const [isSupported, setIsSupported] = useState(false);
  
  useEffect(() => {
    facePay.isSupported().then(result => {
      setIsSupported(result.supported);
    });
  }, []);
  
  return { facePay, isSupported };
}
```

### Vue Composable Example
```vue
<script setup>
import { ref, onMounted } from 'vue';
import FacePay from '@facepay/sdk';

const facePay = new FacePay({
  apiKey: import.meta.env.VITE_FACEPAY_KEY
});

const isSupported = ref(false);

onMounted(async () => {
  const support = await facePay.isSupported();
  isSupported.value = support.supported;
});
</script>
```

## Next Steps

Ready to integrate FacePay into your app? Choose your path:

<div style={{display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '2rem'}}>
  <a href="/docs/sdk/javascript/installation" className="button button--primary">
    📦 JavaScript SDK
  </a>
  <a href="/docs/sdk/react/installation" className="button button--secondary">
    ⚛️ React SDK
  </a>
  <a href="/docs/sdk/vue/installation" className="button button--secondary">
    💚 Vue.js SDK  
  </a>
  <a href="/docs/sdk/angular/installation" className="button button--secondary">
    🅰️ Angular SDK
  </a>
</div>

<div style={{display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '1rem'}}>
  <a href="/docs/sdk/mobile/ios" className="button button--outline">
    📱 iOS SDK
  </a>
  <a href="/docs/sdk/mobile/android" className="button button--outline">
    🤖 Android SDK
  </a>
  <a href="/docs/sdk/server/node" className="button button--outline">
    🟢 Node.js SDK
  </a>
  <a href="/docs/sdk/server/python" className="button button--outline">
    🐍 Python SDK
  </a>
</div>

### Resources

- **[API Reference](/docs/api/overview)** - Complete API documentation
- **[Integration Guides](/docs/integrations/overview)** - Platform-specific guides
- **[Security Best Practices](/docs/security/best-practices)** - Production security
- **[Error Handling Guide](/docs/sdk/javascript/error-handling)** - Handle errors gracefully
- **[Playground](/playground)** - Test the SDK interactively

---

**The world's simplest biometric authentication SDK.** Get started today! 🚀