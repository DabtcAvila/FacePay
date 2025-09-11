---
sidebar_position: 1
title: 5-Minute Quickstart
description: Get FacePay running in your application in just 5 minutes with our ultra-simple integration guide.
keywords: [quickstart, getting started, integration, setup, biometric authentication]
---

# 5-Minute Quickstart

Get FacePay running in your application in just **5 minutes**. This guide will take you from zero to a working biometric authentication system.

## Prerequisites

Before you start, make sure you have:

- ✅ **HTTPS environment** (required for biometric APIs)
- ✅ **Modern browser** with WebAuthn support  
- ✅ **Device with biometrics** (Face ID, Touch ID, fingerprint, etc.)
- ✅ **FacePay API key** (get one free at [dashboard.facepay.com](https://dashboard.facepay.com))

:::tip Development Setup
For local development, `localhost` works fine - you don't need HTTPS. However, production deployments **must** use HTTPS.
:::

## Step 1: Include the SDK (30 seconds)

Add FacePay to your project using one of these methods:

### CDN (Fastest)
```html
<script src="https://cdn.facepay.com/sdk/v1/facepay.js"></script>
```

### NPM Install
```bash
npm install @facepay/sdk
```

### Direct Download
```html
<script src="./facepay.js"></script>
```

## Step 2: Initialize FacePay (1 minute)

Create your FacePay instance with your API credentials:

```javascript live
// Initialize FacePay
const facePay = new FacePay({
  apiKey: 'pk_test_abcd1234...', // Your publishable API key
  baseUrl: 'https://api.facepay.com', // API endpoint
  debug: true // Enable console logs for development
});

console.log('FacePay initialized!');
```

:::info API Keys
Get your free API key at [dashboard.facepay.com](https://dashboard.facepay.com). Use `pk_test_` keys for development and `pk_live_` keys for production.
:::

## Step 3: Check Device Support (30 seconds)

Before proceeding, verify that the user's device supports biometric authentication:

```javascript live
async function checkSupport() {
  try {
    const support = await facePay.isSupported();
    
    if (support.supported) {
      console.log('✅ Biometric auth supported!');
      console.log(`Available: ${support.biometricType}`);
      return true;
    } else {
      console.log('❌ Biometric auth not supported');
      console.log('Issues:', support.issues);
      return false;
    }
  } catch (error) {
    console.error('Support check failed:', error.message);
    return false;
  }
}

// Run the check
checkSupport();
```

## Step 4: Enroll a User (1 minute)

Register a user for biometric authentication. This creates their biometric credential:

```javascript live
async function enrollUser(email) {
  try {
    // Start enrollment process
    const result = await facePay.enroll({
      userId: email,
      userName: email,
      userDisplayName: email.split('@')[0] // Use part before @ as display name
    });

    if (result.success) {
      console.log('✅ User enrolled successfully!');
      console.log('Credential ID:', result.credentialId);
      console.log('Biometric Type:', result.biometricType);
      return result;
    } else {
      console.log('❌ Enrollment failed');
      return null;
    }
  } catch (error) {
    console.error('Enrollment error:', error.message);
    
    // Handle common errors
    if (error.code === 'USER_CANCELLED') {
      console.log('💡 User cancelled the biometric prompt');
    } else if (error.code === 'NOT_SUPPORTED') {
      console.log('💡 This device does not support biometrics');
    }
    
    return null;
  }
}

// Example enrollment
// enrollUser('demo@example.com');
```

## Step 5: Authenticate a User (1 minute)

Once enrolled, users can authenticate using their biometrics:

```javascript live
async function authenticateUser(email) {
  try {
    // Start authentication process
    const result = await facePay.authenticate({
      email: email
    });

    if (result.success && result.verified) {
      console.log('✅ Authentication successful!');
      console.log('User verified:', result.user.email);
      console.log('Used biometric:', result.biometricType);
      
      // User is now authenticated - proceed with your app logic
      return result;
    } else {
      console.log('❌ Authentication failed');
      return null;
    }
  } catch (error) {
    console.error('Authentication error:', error.message);
    
    // Handle common errors
    if (error.code === 'USER_CANCELLED') {
      console.log('💡 User cancelled authentication');
    } else if (error.code === 'AUTHENTICATION_FAILED') {
      console.log('💡 Biometric verification failed');
    }
    
    return null;
  }
}

// Example authentication  
// authenticateUser('demo@example.com');
```

## Complete Example

Here's a complete working example that puts it all together:

```html
<!DOCTYPE html>
<html>
<head>
    <title>FacePay Quickstart</title>
    <script src="https://cdn.facepay.com/sdk/v1/facepay.js"></script>
</head>
<body>
    <div>
        <h1>FacePay Authentication Demo</h1>
        
        <input type="email" id="email" placeholder="Enter your email" value="demo@example.com">
        
        <button onclick="checkSupport()">1. Check Support</button>
        <button onclick="enrollUser()">2. Enroll User</button>
        <button onclick="authenticateUser()">3. Authenticate</button>
        
        <div id="output"></div>
    </div>

    <script>
        // Initialize FacePay
        const facePay = new FacePay({
            apiKey: 'pk_test_your_key_here',
            baseUrl: 'https://api.facepay.com',
            debug: true
        });

        const output = document.getElementById('output');
        
        function log(message) {
            output.innerHTML += '<p>' + message + '</p>';
            console.log(message);
        }

        async function checkSupport() {
            const support = await facePay.isSupported();
            if (support.supported) {
                log('✅ ' + support.biometricType + ' supported!');
            } else {
                log('❌ Biometrics not supported: ' + support.issues.join(', '));
            }
        }

        async function enrollUser() {
            const email = document.getElementById('email').value;
            try {
                const result = await facePay.enroll(email);
                log('✅ User enrolled: ' + result.biometricType);
            } catch (error) {
                log('❌ Enrollment failed: ' + error.message);
            }
        }

        async function authenticateUser() {
            const email = document.getElementById('email').value;
            try {
                const result = await facePay.authenticate(email);
                if (result.verified) {
                    log('✅ Authentication successful!');
                } else {
                    log('❌ Authentication failed');
                }
            } catch (error) {
                log('❌ Authentication error: ' + error.message);
            }
        }
    </script>
</body>
</html>
```

## Next Steps

🎉 **Congratulations!** You now have biometric authentication working in your app. Here's what to explore next:

<div style={{display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '2rem'}}>
  <a href="/docs/getting-started/installation" className="button button--primary">
    📦 Installation Options
  </a>
  <a href="/docs/sdk/javascript/methods" className="button button--secondary">
    📚 SDK Methods
  </a>
  <a href="/docs/getting-started/testing" className="button button--secondary">
    🧪 Testing Guide
  </a>
  <a href="/playground" className="button button--secondary">
    🎮 Try the Playground
  </a>
</div>

### Advanced Features

Ready to take it further? Check out these advanced features:

- **[Error Handling](/docs/sdk/javascript/error-handling)** - Comprehensive error management
- **[Payment Integration](/docs/api/payments/process)** - Add payment processing
- **[Framework Integration](/docs/integrations/frameworks/react)** - React, Vue, Angular guides
- **[Security Best Practices](/docs/security/best-practices)** - Production-ready security
- **[Analytics & Monitoring](/docs/api/analytics/events)** - Track usage and performance

### Common Issues

Having trouble? Check these common solutions:

| Issue | Solution |
|-------|----------|
| "Not supported" error | Ensure HTTPS and modern browser |
| User cancels prompt | Add clear instructions and retry logic |
| Network timeouts | Check API key and internet connection |
| Enrollment fails | Verify biometric hardware is working |

### Get Help

Need assistance? We're here to help:

- **Discord**: [discord.gg/facepay](https://discord.gg/facepay) - Real-time chat
- **GitHub**: [github.com/facepay/sdk/issues](https://github.com/facepay/sdk/issues) - Report bugs
- **Email**: [support@facepay.com](mailto:support@facepay.com) - Direct support

---

**🚀 Ready to build something amazing?** Your users will love the seamless, secure experience that FacePay provides!