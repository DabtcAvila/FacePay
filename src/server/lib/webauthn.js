/**
 * WebAuthn Server-Side Utilities
 * Real biometric authentication using SimpleWebAuthn
 * 
 * Features:
 * - Registration credential generation and verification
 * - Authentication challenge generation and verification
 * - Biometric data validation
 * - Device type detection
 * - Security compliance
 */

const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');
const { isoUint8Array } = require('@simplewebauthn/server/helpers');

// WebAuthn Configuration
const WEBAUTHN_CONFIG = {
  // Relying Party (RP) Information
  rpName: process.env.NEXT_PUBLIC_WEBAUTHN_RP_NAME || 'FacePay',
  rpId: process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID || (
    process.env.NODE_ENV === 'production' 
      ? process.env.DOMAIN || 'facepay.app'
      : 'localhost'
  ),
  
  // Origins that are allowed to use this WebAuthn configuration
  expectedOrigins: process.env.NODE_ENV === 'production' 
    ? [
        `https://${process.env.DOMAIN || 'facepay.app'}`,
        process.env.WEBAUTHN_ORIGIN,
        process.env.NEXT_PUBLIC_APP_URL
      ].filter(Boolean)
    : [
        'http://localhost:3000',
        'https://localhost:3000',
        process.env.WEBAUTHN_ORIGIN || 'http://localhost:3000'
      ].filter(Boolean),
  
  // Authentication timeout (60 seconds)
  timeout: 60000,
  
  // Challenge size in bytes
  challengeSize: 32,
  
  // Supported algorithms (EdDSA, ES256, RS256)
  supportedAlgorithmIDs: [-8, -7, -257],
  
  // Authenticator attachment preference
  authenticatorAttachment: 'platform', // Prefer platform authenticators (biometric)
  
  // User verification requirement
  userVerification: 'preferred', // Prefer biometric verification but allow fallback
  
  // Resident key requirement
  residentKey: 'preferred' // Prefer resident keys for better UX
};

/**
 * Generate registration options for new credential
 */
async function generateRegistrationChallenge(user, existingCredentials = []) {
  try {
    console.log(`[WebAuthn] Generating registration options for user ${user.id}`);
    
    // Convert existing credentials to the format expected by SimpleWebAuthn
    const excludeCredentials = existingCredentials.map(cred => ({
      id: cred.credentialId,
      type: 'public-key',
      transports: cred.transports || ['internal']
    }));
    
    const options = await generateRegistrationOptions({
      rpName: WEBAUTHN_CONFIG.rpName,
      rpID: WEBAUTHN_CONFIG.rpId,
      userID: user.id,
      userName: user.email,
      userDisplayName: user.name || user.email,
      timeout: WEBAUTHN_CONFIG.timeout,
      attestationType: 'none', // We don't need attestation for basic auth
      excludeCredentials,
      authenticatorSelection: {
        authenticatorAttachment: WEBAUTHN_CONFIG.authenticatorAttachment,
        userVerification: WEBAUTHN_CONFIG.userVerification,
        residentKey: WEBAUTHN_CONFIG.residentKey,
        requireResidentKey: false
      },
      supportedAlgorithmIDs: WEBAUTHN_CONFIG.supportedAlgorithmIDs,
    });
    
    console.log(`[WebAuthn] Registration options generated:`, {
      rpID: options.rp.id,
      userID: options.user.id,
      timeout: options.timeout,
      challengeLength: options.challenge.length,
      excludedCredentials: excludeCredentials.length,
      algorithms: options.pubKeyCredParams.length
    });
    
    return {
      success: true,
      options,
      challenge: options.challenge // Store this for verification
    };
    
  } catch (error) {
    console.error('[WebAuthn] Failed to generate registration options:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate registration options'
    };
  }
}

/**
 * Verify registration response from client
 */
async function verifyRegistrationChallenge(credential, expectedChallenge, userAgent = '') {
  try {
    console.log(`[WebAuthn] Verifying registration response:`, {
      credentialId: credential.id,
      type: credential.type,
      challengeStored: !!expectedChallenge,
      userAgent: userAgent.substring(0, 100)
    });
    
    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: WEBAUTHN_CONFIG.expectedOrigins,
      expectedRPID: WEBAUTHN_CONFIG.rpId,
    });
    
    console.log(`[WebAuthn] Registration verification result:`, {
      verified: verification.verified,
      credentialId: verification.registrationInfo?.credentialID ? 
        Buffer.from(verification.registrationInfo.credentialID).toString('base64') : 'none',
      credentialPublicKey: verification.registrationInfo?.credentialPublicKey ? 
        Buffer.from(verification.registrationInfo.credentialPublicKey).length + ' bytes' : 'none',
      counter: verification.registrationInfo?.counter,
      credentialDeviceType: verification.registrationInfo?.credentialDeviceType,
      credentialBackedUp: verification.registrationInfo?.credentialBackedUp,
      aaguid: verification.registrationInfo?.aaguid
    });
    
    if (verification.verified && verification.registrationInfo) {
      const { registrationInfo } = verification;
      
      // Analyze biometric usage
      const biometricAnalysis = analyzeBiometricAuthentication(
        registrationInfo,
        userAgent
      );
      
      return {
        success: true,
        verified: true,
        credentialData: {
          credentialId: Buffer.from(registrationInfo.credentialID).toString('base64'),
          publicKey: Buffer.from(registrationInfo.credentialPublicKey).toString('base64'),
          counter: registrationInfo.counter,
          deviceType: registrationInfo.credentialDeviceType || 'single_device',
          backedUp: registrationInfo.credentialBackedUp || false,
          transports: credential.response?.transports || ['internal'],
          aaguid: registrationInfo.aaguid
        },
        biometricVerified: biometricAnalysis.biometricUsed,
        authenticatorType: biometricAnalysis.authenticatorType,
        biometricUsed: biometricAnalysis.biometricUsed
      };
    } else {
      return {
        success: false,
        verified: false,
        error: 'Registration verification failed'
      };
    }
    
  } catch (error) {
    console.error('[WebAuthn] Registration verification failed:', error);
    return {
      success: false,
      verified: false,
      error: error.message || 'Registration verification failed'
    };
  }
}

/**
 * Generate authentication options for existing credential
 */
async function generateAuthenticationChallenge(userCredentials = []) {
  try {
    console.log(`[WebAuthn] Generating authentication options for ${userCredentials.length} credentials`);
    
    // Convert credentials to the format expected by SimpleWebAuthn
    const allowCredentials = userCredentials.map(cred => ({
      id: Buffer.from(cred.credentialId, 'base64'),
      type: 'public-key',
      transports: cred.transports || ['internal']
    }));
    
    const options = await generateAuthenticationOptions({
      timeout: WEBAUTHN_CONFIG.timeout,
      allowCredentials,
      userVerification: WEBAUTHN_CONFIG.userVerification,
      rpID: WEBAUTHN_CONFIG.rpId,
    });
    
    console.log(`[WebAuthn] Authentication options generated:`, {
      rpID: options.rpId,
      timeout: options.timeout,
      challengeLength: options.challenge.length,
      allowedCredentials: allowCredentials.length,
      userVerification: options.userVerification
    });
    
    return {
      success: true,
      options,
      challenge: options.challenge // Store this for verification
    };
    
  } catch (error) {
    console.error('[WebAuthn] Failed to generate authentication options:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate authentication options'
    };
  }
}

/**
 * Verify authentication response from client
 */
async function verifyAuthenticationChallenge(credential, expectedChallenge, storedCredential, userAgent = '') {
  try {
    console.log(`[WebAuthn] Verifying authentication response:`, {
      credentialId: credential.id,
      type: credential.type,
      challengeStored: !!expectedChallenge,
      storedCredentialExists: !!storedCredential,
      userAgent: userAgent.substring(0, 100)
    });
    
    if (!storedCredential) {
      throw new Error('No stored credential found for verification');
    }
    
    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: WEBAUTHN_CONFIG.expectedOrigins,
      expectedRPID: WEBAUTHN_CONFIG.rpId,
      authenticator: {
        credentialID: Buffer.from(storedCredential.credentialId, 'base64'),
        credentialPublicKey: Buffer.from(storedCredential.publicKey, 'base64'),
        counter: parseInt(storedCredential.counter.toString())
      }
    });
    
    console.log(`[WebAuthn] Authentication verification result:`, {
      verified: verification.verified,
      newCounter: verification.authenticationInfo?.newCounter,
      userVerified: verification.authenticationInfo?.userVerified,
      userPresent: verification.authenticationInfo?.userPresent
    });
    
    if (verification.verified && verification.authenticationInfo) {
      const { authenticationInfo } = verification;
      
      // Analyze biometric usage
      const biometricAnalysis = analyzeBiometricAuthentication(
        authenticationInfo,
        userAgent
      );
      
      return {
        success: true,
        verified: true,
        authenticationData: {
          newCounter: authenticationInfo.newCounter,
          userVerified: authenticationInfo.userVerified,
          userPresent: authenticationInfo.userPresent
        },
        biometricVerified: biometricAnalysis.biometricUsed,
        authenticatorType: biometricAnalysis.authenticatorType,
        biometricUsed: biometricAnalysis.biometricUsed
      };
    } else {
      return {
        success: false,
        verified: false,
        error: 'Authentication verification failed'
      };
    }
    
  } catch (error) {
    console.error('[WebAuthn] Authentication verification failed:', error);
    return {
      success: false,
      verified: false,
      error: error.message || 'Authentication verification failed'
    };
  }
}

/**
 * Analyze if biometric authentication was used
 */
function analyzeBiometricAuthentication(authInfo, userAgent = '') {
  const analysis = {
    biometricUsed: false,
    authenticatorType: 'unknown',
    userVerified: authInfo.userVerified || false,
    userPresent: authInfo.userPresent || false,
    deviceInfo: parseUserAgent(userAgent)
  };
  
  // Biometric authentication typically requires user verification
  if (authInfo.userVerified) {
    analysis.biometricUsed = true;
    
    // Determine authenticator type based on device
    if (analysis.deviceInfo.isIOS) {
      analysis.authenticatorType = analysis.deviceInfo.supportsFaceID ? 'face_id' : 'touch_id';
    } else if (analysis.deviceInfo.isAndroid) {
      analysis.authenticatorType = 'android_biometric';
    } else if (analysis.deviceInfo.isMacOS) {
      analysis.authenticatorType = 'touch_id';
    } else if (analysis.deviceInfo.isWindows) {
      analysis.authenticatorType = 'windows_hello';
    } else {
      analysis.authenticatorType = 'platform_biometric';
    }
  } else if (authInfo.userPresent) {
    // User presence without verification might indicate PIN/pattern
    analysis.authenticatorType = 'platform_pin';
  }
  
  return analysis;
}

/**
 * Parse User-Agent to determine device capabilities
 */
function parseUserAgent(userAgent) {
  const ua = userAgent.toLowerCase();
  
  return {
    isIOS: /iphone|ipad|ipod/.test(ua),
    isAndroid: /android/.test(ua),
    isMacOS: /macintosh|mac os x/.test(ua) && !/iphone|ipad|ipod/.test(ua),
    isWindows: /windows|win32|win64/.test(ua),
    isMobile: /mobile|android|iphone|ipad|phone|blackberry|opera mini|iemobile|wpdesktop/.test(ua),
    supportsFaceID: /iphone.*os (1[2-9]|[2-9]\d)/.test(ua), // iOS 12+ for Face ID
    supportsWebAuthn: true // Assume true if we got this far
  };
}

/**
 * Validate WebAuthn configuration
 */
function validateConfiguration() {
  const issues = [];
  
  if (!WEBAUTHN_CONFIG.rpName) {
    issues.push('Missing RP name configuration');
  }
  
  if (!WEBAUTHN_CONFIG.rpId) {
    issues.push('Missing RP ID configuration');
  }
  
  if (!WEBAUTHN_CONFIG.expectedOrigins.length) {
    issues.push('No expected origins configured');
  }
  
  if (issues.length > 0) {
    console.warn('[WebAuthn] Configuration issues:', issues);
    return { valid: false, issues };
  }
  
  console.log('[WebAuthn] Configuration validated successfully:', {
    rpName: WEBAUTHN_CONFIG.rpName,
    rpId: WEBAUTHN_CONFIG.rpId,
    expectedOrigins: WEBAUTHN_CONFIG.expectedOrigins,
    timeout: WEBAUTHN_CONFIG.timeout
  });
  
  return { valid: true, issues: [] };
}

/**
 * Generate secure challenge for manual implementation
 */
function generateSecureChallenge(size = WEBAUTHN_CONFIG.challengeSize) {
  const crypto = require('crypto');
  return crypto.randomBytes(size).toString('base64url');
}

/**
 * Sanitize credential data for storage
 */
function sanitizeCredentialForStorage(credentialData) {
  return {
    credentialId: credentialData.credentialId,
    publicKey: credentialData.publicKey,
    counter: credentialData.counter || 0,
    deviceType: credentialData.deviceType || 'single_device',
    backedUp: Boolean(credentialData.backedUp),
    transports: Array.isArray(credentialData.transports) 
      ? credentialData.transports 
      : ['internal'],
    aaguid: credentialData.aaguid || null
  };
}

/**
 * Check if credential is valid for authentication
 */
function isCredentialValid(credential) {
  if (!credential) return false;
  if (!credential.credentialId || !credential.publicKey) return false;
  if (credential.isActive === false) return false;
  if (credential.deletedAt) return false;
  
  return true;
}

// Initialize and validate configuration on module load
const configValidation = validateConfiguration();
if (!configValidation.valid) {
  console.error('[WebAuthn] Configuration validation failed:', configValidation.issues);
}

module.exports = {
  // Main functions
  generateRegistrationChallenge,
  verifyRegistrationChallenge,
  generateAuthenticationChallenge,
  verifyAuthenticationChallenge,
  
  // Utility functions
  analyzeBiometricAuthentication,
  parseUserAgent,
  validateConfiguration,
  generateSecureChallenge,
  sanitizeCredentialForStorage,
  isCredentialValid,
  
  // Configuration
  WEBAUTHN_CONFIG,
  
  // Constants
  SUPPORTED_TRANSPORTS: ['internal', 'hybrid', 'usb', 'nfc', 'ble'],
  DEVICE_TYPES: ['single_device', 'multi_device'],
  USER_VERIFICATION_LEVELS: ['required', 'preferred', 'discouraged']
};