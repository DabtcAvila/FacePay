---
sidebar_position: 1
title: JavaScript SDK Installation
description: Install and configure the FacePay JavaScript SDK in your web application.
keywords: [JavaScript, installation, setup, CDN, NPM, bundle]
---

# JavaScript SDK Installation

Get the FacePay JavaScript SDK running in your web application with multiple installation options.

## Installation Methods

### CDN (Recommended for Quick Start)

The fastest way to get started - just include the script tag:

```html
<!-- Latest version -->
<script src="https://cdn.facepay.com/sdk/v1/facepay.js"></script>

<!-- Specific version (recommended for production) -->
<script src="https://cdn.facepay.com/sdk/v1.2.0/facepay.js"></script>

<!-- Minified version -->
<script src="https://cdn.facepay.com/sdk/v1/facepay.min.js"></script>
```

#### CDN Usage Example
```html
<!DOCTYPE html>
<html>
<head>
    <title>FacePay Demo</title>
    <script src="https://cdn.facepay.com/sdk/v1/facepay.js"></script>
</head>
<body>
    <script>
        const facePay = new FacePay({
            apiKey: 'pk_test_your_key_here'
        });
    </script>
</body>
</html>
```

### NPM Package

For modern web applications with build tools:

```bash
# Install the package
npm install @facepay/sdk

# Or with Yarn
yarn add @facepay/sdk

# Or with pnpm
pnpm add @facepay/sdk
```

#### ES Module Usage
```javascript
import FacePay from '@facepay/sdk';

const facePay = new FacePay({
  apiKey: 'pk_test_your_key_here'
});
```

#### CommonJS Usage
```javascript
const FacePay = require('@facepay/sdk');

const facePay = new FacePay({
  apiKey: 'pk_test_your_key_here'
});
```

### Direct Download

Download the SDK file directly and include it in your project:

1. **Download**: [facepay.js](https://cdn.facepay.com/sdk/v1/facepay.js)
2. **Include**: Place in your project directory
3. **Reference**: Include in your HTML

```html
<script src="./js/facepay.js"></script>
```

## Package Information

| Attribute | Value |
|-----------|-------|
| **Size** | 24KB uncompressed, &lt;8KB gzipped |
| **Dependencies** | Zero runtime dependencies |
| **Formats** | UMD, ES Module, CommonJS |
| **TypeScript** | Full type definitions included |
| **Browser Support** | Chrome 67+, Safari 14+, Firefox 60+, Edge 79+ |

## Framework Integration

### React
```bash
npm install @facepay/sdk
```

```jsx
import { useState, useEffect } from 'react';
import FacePay from '@facepay/sdk';

function BiometricAuth() {
  const [facePay] = useState(() => new FacePay({
    apiKey: process.env.REACT_APP_FACEPAY_KEY
  }));
  
  return (
    <button onClick={() => facePay.authenticate('user@example.com')}>
      Authenticate
    </button>
  );
}
```

### Vue.js
```bash
npm install @facepay/sdk
```

```vue
<template>
  <button @click="authenticate">Authenticate</button>
</template>

<script>
import FacePay from '@facepay/sdk';

export default {
  data() {
    return {
      facePay: new FacePay({
        apiKey: process.env.VUE_APP_FACEPAY_KEY
      })
    };
  },
  methods: {
    async authenticate() {
      await this.facePay.authenticate('user@example.com');
    }
  }
};
</script>
```

### Angular
```bash
npm install @facepay/sdk
```

```typescript
import { Component } from '@angular/core';
import FacePay from '@facepay/sdk';

@Component({
  selector: 'app-auth',
  template: '<button (click)="authenticate()">Authenticate</button>'
})
export class AuthComponent {
  private facePay = new FacePay({
    apiKey: environment.facePayKey
  });

  async authenticate() {
    await this.facePay.authenticate('user@example.com');
  }
}
```

### Next.js
```bash
npm install @facepay/sdk
```

```jsx
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import to avoid SSR issues
const FacePay = dynamic(() => import('@facepay/sdk'), {
  ssr: false
});

export default function AuthPage() {
  const [facePay, setFacePay] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('@facepay/sdk').then((FacePayModule) => {
        setFacePay(new FacePayModule.default({
          apiKey: process.env.NEXT_PUBLIC_FACEPAY_KEY
        }));
      });
    }
  }, []);

  return facePay ? (
    <button onClick={() => facePay.authenticate('user@example.com')}>
      Authenticate
    </button>
  ) : null;
}
```

## Build Tool Configuration

### Webpack
```javascript
// webpack.config.js
module.exports = {
  resolve: {
    alias: {
      '@facepay/sdk': require.resolve('@facepay/sdk/dist/facepay.js')
    }
  }
};
```

### Vite
```javascript
// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    alias: {
      '@facepay/sdk': '@facepay/sdk/dist/facepay.js'
    }
  }
});
```

### Rollup
```javascript
// rollup.config.js
import resolve from '@rollup/plugin-node-resolve';

export default {
  plugins: [
    resolve({
      preferBuiltins: false
    })
  ]
};
```

## TypeScript Configuration

The SDK includes full TypeScript definitions. No additional `@types` package needed!

```typescript
import FacePay, { 
  FacePayConfig, 
  EnrollmentResult, 
  AuthenticationResult 
} from '@facepay/sdk';

const config: FacePayConfig = {
  apiKey: 'pk_test_your_key_here',
  baseUrl: 'https://api.facepay.com',
  timeout: 30000
};

const facePay = new FacePay(config);

// All methods are fully typed
const enrollment: EnrollmentResult = await facePay.enroll('user@example.com');
const auth: AuthenticationResult = await facePay.authenticate('user@example.com');
```

### Type Definitions
```typescript
// Available types
interface FacePayConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  debug?: boolean;
}

interface EnrollmentResult {
  success: boolean;
  credentialId: string;
  biometricType: string;
  verified: boolean;
  metadata: {
    timestamp: string;
    deviceType: 'mobile' | 'desktop';
    platform: string;
  };
}

interface AuthenticationResult {
  success: boolean;
  credentialId: string;
  biometricType: string;
  verified: boolean;
  user: {
    email: string;
    id?: string;
  };
  metadata: {
    timestamp: string;
    deviceType: 'mobile' | 'desktop';
    platform: string;
  };
}
```

## Environment Variables

Set up your API keys using environment variables:

### Development (.env)
```bash
# React
REACT_APP_FACEPAY_KEY=pk_test_your_development_key

# Vue.js
VUE_APP_FACEPAY_KEY=pk_test_your_development_key

# Next.js
NEXT_PUBLIC_FACEPAY_KEY=pk_test_your_development_key

# Vite
VITE_FACEPAY_KEY=pk_test_your_development_key
```

### Production
```bash
# Production keys start with pk_live_
FACEPAY_KEY=pk_live_your_production_key
```

## Bundle Analysis

### Check Bundle Size
```bash
# Install bundle analyzer
npm install --save-dev webpack-bundle-analyzer

# Analyze your bundle
npx webpack-bundle-analyzer dist/main.js
```

### Tree Shaking
The SDK supports tree shaking for optimal bundle sizes:

```javascript
// Import only what you need
import { FacePay } from '@facepay/sdk/core';
import { isSupported } from '@facepay/sdk/utils';

// This will exclude unused methods from your bundle
const facePay = new FacePay({ apiKey: 'pk_test_...' });
const supported = await isSupported();
```

## Content Security Policy (CSP)

If using CSP headers, add these directives:

```http
Content-Security-Policy: 
  script-src 'self' https://cdn.facepay.com;
  connect-src 'self' https://api.facepay.com;
  img-src 'self' data: https://cdn.facepay.com;
```

### CSP for CDN Usage
```html
<meta http-equiv="Content-Security-Policy" 
      content="script-src 'self' https://cdn.facepay.com; connect-src 'self' https://api.facepay.com;">
```

## Troubleshooting

### Common Issues

#### Module Not Found
```bash
# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

#### TypeScript Errors
```bash
# Ensure TypeScript version compatibility
npm install --save-dev typescript@^4.5.0

# Update tsconfig.json
{
  "compilerOptions": {
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true
  }
}
```

#### Build Errors
```javascript
// If using older bundlers, try explicit imports
const FacePay = require('@facepay/sdk').default;
// or
import * as FacePayModule from '@facepay/sdk';
const FacePay = FacePayModule.default;
```

### Version Compatibility

| FacePay SDK | Node.js | Browser | TypeScript |
|-------------|---------|---------|------------|
| 1.x | 14+ | ES2017+ | 4.5+ |
| 2.x | 16+ | ES2020+ | 4.7+ |

## Next Steps

Now that you have the SDK installed, learn how to use it:

<div style={{display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '2rem'}}>
  <a href="/docs/sdk/javascript/initialization" className="button button--primary">
    ⚙️ Initialization
  </a>
  <a href="/docs/sdk/javascript/methods" className="button button--secondary">
    📝 Methods Reference
  </a>
  <a href="/docs/sdk/javascript/examples" className="button button--secondary">
    💡 Code Examples
  </a>
  <a href="/docs/getting-started/quickstart" className="button button--secondary">
    🚀 Quick Start
  </a>
</div>

## Support

Need help with installation?

- **GitHub Issues**: [Report installation issues](https://github.com/facepay/sdk/issues)
- **Discord**: [Get real-time help](https://discord.gg/facepay)
- **Email**: [support@facepay.com](mailto:support@facepay.com)

---

**Installation complete!** You're ready to start building with FacePay. 🎉