# BiometricWithFallback - Unified Biometric Authentication Component

## Overview

`BiometricWithFallback` is the unified, intelligent biometric authentication component that consolidates all biometric authentication methods with automatic fallback handling.

## Migration Guide

This component replaces the following deprecated components:

### From WebAuthnDemo
```tsx
// OLD - Deprecated
<WebAuthnDemo 
  userId="user-123"
  userName="user@example.com"
  mode="authentication"
  onSuccess={handleSuccess}
  onError={handleError}
/>

// NEW - Recommended
<BiometricWithFallback
  userId="user-123"
  userName="user@example.com"
  mode="authentication"
  onSuccess={handleSuccess}
  onError={handleError}
  showFallbackOptions={true}
/>
```

### From SimpleFaceIDDemo
```tsx
// OLD - Deprecated
<SimpleFaceIDDemo
  onScanComplete={handleComplete}
  onCancel={handleCancel}
/>

// NEW - Recommended
<BiometricWithFallback
  mode="demo"
  preferredMethod="camera"
  onSuccess={handleComplete}
  onCancel={handleCancel}
  showFallbackOptions={true}
/>
```

### From NativeBiometric
```tsx
// OLD - Deprecated
<NativeBiometric
  userId="user-123"
  userName="user@example.com"
  mode="authentication"
  onSuccess={handleSuccess}
  onError={handleError}
/>

// NEW - Recommended
<BiometricWithFallback
  userId="user-123"
  userName="user@example.com"
  mode="authentication"
  preferredMethod="biometric"
  onSuccess={handleSuccess}
  onError={handleError}
  showFallbackOptions={true}
/>
```

## Features

- **Intelligent Method Selection**: Automatically selects the best available authentication method
- **Multiple Fallbacks**: Biometric → Camera → Visual Demo
- **Real WebAuthn Integration**: Supports actual device biometrics (Face ID, Touch ID, Windows Hello)
- **Camera Support**: Fallback to camera-based face detection
- **Visual Demo**: Always-working demo mode for testing and showcasing
- **Responsive UI**: Modern, animated interface with progress indicators
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Device Detection**: Automatic detection of device capabilities
- **Offline Support**: Works without network connectivity

## Props

```tsx
interface BiometricWithFallbackProps {
  userId?: string                    // User identifier
  userName?: string                  // User email/name
  onSuccess?: (result: BiometricAuthResult) => void
  onError?: (error: WebAuthnError) => void
  onCancel?: () => void
  mode?: 'authentication' | 'registration' | 'demo'
  title?: string                     // Custom title
  subtitle?: string                  // Custom subtitle
  className?: string                 // Additional CSS classes
  showFallbackOptions?: boolean      // Show method switching controls
  preferredMethod?: AuthMethod       // Force specific method
}
```

## Usage Examples

### Basic Authentication
```tsx
<BiometricWithFallback
  userId="user-123"
  userName="user@example.com"
  onSuccess={(result) => {
    console.log('Auth successful:', result.method);
    redirectToApp();
  }}
  onError={(error) => {
    console.error('Auth failed:', error.message);
  }}
/>
```

### Demo Mode
```tsx
<BiometricWithFallback
  mode="demo"
  title="Experience Biometric Auth"
  subtitle="Try our secure authentication system"
  showFallbackOptions={true}
  onSuccess={() => showSuccessMessage()}
/>
```

### Force Camera Method
```tsx
<BiometricWithFallback
  preferredMethod="camera"
  showFallbackOptions={false}
  onSuccess={handleCameraSuccess}
/>
```

## Migration Benefits

1. **Reduced Bundle Size**: One component instead of four
2. **Better UX**: Intelligent fallbacks prevent dead ends
3. **Easier Maintenance**: Single component to update and fix
4. **Consistent Interface**: Unified API across all auth methods
5. **Better Error Handling**: Comprehensive error recovery
6. **Future-Proof**: Easy to add new authentication methods

## Deprecated Components

The following components are deprecated and will be removed in a future version:

- `WebAuthnDemo` → Use `BiometricWithFallback`
- `SimpleFaceIDDemo` → Use `BiometricWithFallback` with `preferredMethod="camera"`
- `NativeBiometric` → Use `BiometricWithFallback` with `preferredMethod="biometric"`

These components are kept for backward compatibility but should not be used in new code.