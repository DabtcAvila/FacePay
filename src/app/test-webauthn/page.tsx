'use client';

import { useState, useEffect } from 'react';
import { WebAuthnService } from '@/services/webauthn';
import type { WebAuthnCapabilities, WebAuthnError } from '@/services/webauthn';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  result?: any;
  error?: string;
  details?: string;
  timestamp?: Date;
}

interface RegistrationOptions {
  publicKey: {
    challenge: string;
    rp: { name: string; id: string };
    user: { id: string; name: string; displayName: string };
    pubKeyCredParams: Array<{ alg: number; type: string }>;
    timeout: number;
    attestation: string;
    authenticatorSelection: {
      authenticatorAttachment: string;
      userVerification: string;
      residentKey: string;
    };
    excludeCredentials: Array<any>;
  };
}

interface AuthenticationOptions {
  publicKey: {
    challenge: string;
    timeout: number;
    rpId: string;
    userVerification: string;
    allowCredentials: Array<any>;
  };
}

const getErrorDescription = (error: Error): string => {
  const errorMappings: Record<string, string> = {
    'NotAllowedError': 'User cancelled or timeout. The user either cancelled the biometric prompt or it timed out. Try again and make sure to complete the biometric authentication.',
    'InvalidStateError': 'Authenticator already registered. This device/biometric is already registered for this user. Try signing in instead of registering.',
    'NotSupportedError': 'WebAuthn not supported on this device. Your browser or device doesn\'t support WebAuthn/biometric authentication.',
    'SecurityError': 'Security requirements not met. Make sure you\'re using HTTPS and the domain is properly configured.',
    'ConstraintError': 'Constraint error. The authenticator doesn\'t meet the specified requirements (e.g., platform attachment).',
    'UnknownError': 'Unknown error. An unexpected error occurred during the WebAuthn operation.',
    'AbortError': 'Operation aborted. The operation was cancelled or aborted.',
    'NetworkError': 'Network error. Failed to communicate with the server.',
    'TimeoutError': 'Operation timed out. The biometric prompt or server response took too long.',
  };

  return errorMappings[error.name] || `${error.name}: ${error.message}`;
};

const formatJSON = (obj: any): string => {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
};

export default function WebAuthnTestPage() {
  const [capabilities, setCapabilities] = useState<WebAuthnCapabilities | null>(null);
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'Browser Support Check', status: 'pending' },
    { name: 'Platform Authenticator Check', status: 'pending' },
    { name: 'Registration Options Request', status: 'pending' },
    { name: 'Registration Flow Test', status: 'pending' },
    { name: 'Authentication Options Request', status: 'pending' },
    { name: 'Authentication Flow Test', status: 'pending' },
  ]);
  const [logs, setLogs] = useState<string[]>([]);
  const [testUserId] = useState(`test-user-${Date.now()}`);
  const [registeredCredential, setRegisteredCredential] = useState<any>(null);

  const addLog = (message: string, type: 'info' | 'error' | 'success' | 'warn' = 'info') => {
    const timestamp = new Date().toISOString();
    const prefix = type.toUpperCase();
    const logMessage = `[${timestamp}] [${prefix}] ${message}`;
    setLogs(prev => [...prev, logMessage]);
    console.log(logMessage);
  };

  const updateTestStatus = (testName: string, status: TestResult['status'], result?: any, error?: string, details?: string) => {
    setTests(prev => prev.map(test => 
      test.name === testName 
        ? { 
            ...test, 
            status, 
            result, 
            error, 
            details,
            timestamp: new Date() 
          }
        : test
    ));
  };

  useEffect(() => {
    checkBrowserSupport();
  }, []);

  const checkBrowserSupport = async () => {
    updateTestStatus('Browser Support Check', 'running');
    addLog('Starting browser support check...');

    try {
      // Detailed browser support check
      const support = {
        navigator: typeof navigator !== 'undefined',
        credentials: 'credentials' in navigator,
        publicKeyCredential: typeof window !== 'undefined' && !!window.PublicKeyCredential,
        webauthn: typeof window !== 'undefined' && 'credentials' in navigator && !!window.PublicKeyCredential,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        language: navigator.language,
        protocol: window.location.protocol,
        hostname: window.location.hostname,
        port: window.location.port,
        origin: window.location.origin,
      };

      addLog(`Navigator available: ${support.navigator}`);
      addLog(`Credentials API: ${support.credentials}`);
      addLog(`PublicKeyCredential: ${support.publicKeyCredential}`);
      addLog(`WebAuthn supported: ${support.webauthn}`);
      addLog(`Protocol: ${support.protocol}`);
      addLog(`Origin: ${support.origin}`);
      addLog(`User Agent: ${support.userAgent}`);

      if (!support.webauthn) {
        throw new Error('WebAuthn is not supported in this browser');
      }

      if (support.protocol !== 'https:' && support.hostname !== 'localhost') {
        addLog('WARNING: WebAuthn requires HTTPS or localhost', 'warn');
      }

      // Get WebAuthn capabilities using service
      const caps = await WebAuthnService.checkBrowserCapabilities();
      setCapabilities(caps);

      addLog(`Platform authenticator available: ${caps.isPlatformAuthenticatorAvailable}`);
      addLog(`Biometric types: ${caps.biometricTypes.join(', ')}`);
      addLog(`Device info: ${formatJSON(caps.deviceInfo)}`);
      addLog(`Biometric availability: ${formatJSON(caps.biometricAvailability)}`);

      updateTestStatus('Browser Support Check', 'success', support);
      
      // Automatically check platform authenticator
      checkPlatformAuthenticator(caps);

    } catch (error: any) {
      addLog(`Browser support check failed: ${error.message}`, 'error');
      updateTestStatus('Browser Support Check', 'error', null, error.message);
    }
  };

  const checkPlatformAuthenticator = async (caps: WebAuthnCapabilities) => {
    updateTestStatus('Platform Authenticator Check', 'running');
    addLog('Checking platform authenticator availability...');

    try {
      let platformAvailable = false;
      let conditionalAvailable = false;

      if (window.PublicKeyCredential) {
        // Check platform authenticator
        try {
          platformAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          addLog(`Platform authenticator available: ${platformAvailable}`);
        } catch (error: any) {
          addLog(`Error checking platform authenticator: ${error.message}`, 'warn');
        }

        // Check conditional UI
        try {
          if (PublicKeyCredential.isConditionalMediationAvailable) {
            conditionalAvailable = await PublicKeyCredential.isConditionalMediationAvailable();
            addLog(`Conditional UI available: ${conditionalAvailable}`);
          } else {
            addLog('Conditional UI check not available');
          }
        } catch (error: any) {
          addLog(`Error checking conditional UI: ${error.message}`, 'warn');
        }
      }

      const result = {
        platformAvailable,
        conditionalAvailable,
        capabilities: caps,
        biometricTypeName: WebAuthnService.getBiometricTypeName(caps),
        biometricIcon: WebAuthnService.getBiometricIcon(caps),
      };

      updateTestStatus('Platform Authenticator Check', 'success', result);
      addLog(`Platform authenticator check completed successfully`);

      if (!platformAvailable) {
        addLog('WARNING: No platform authenticator available. Biometric authentication will not work.', 'warn');
      }

    } catch (error: any) {
      addLog(`Platform authenticator check failed: ${error.message}`, 'error');
      updateTestStatus('Platform Authenticator Check', 'error', null, error.message);
    }
  };

  const testRegistrationOptions = async () => {
    updateTestStatus('Registration Options Request', 'running');
    addLog('Testing registration options request...');

    try {
      const response = await fetch('/api/webauthn/register/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const responseText = await response.text();
      addLog(`Registration options response status: ${response.status}`);
      addLog(`Registration options response: ${responseText}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${responseText}`);
      }

      const data = JSON.parse(responseText);
      
      if (!data.success || !data.data?.options) {
        throw new Error(`Invalid response format: ${responseText}`);
      }

      const options: RegistrationOptions = data.data.options;
      
      // Validate registration options
      const validation = {
        hasChallenge: !!options.publicKey.challenge,
        challengeLength: options.publicKey.challenge.length,
        hasRP: !!options.publicKey.rp,
        rpId: options.publicKey.rp.id,
        hasUser: !!options.publicKey.user,
        hasAlgorithms: options.publicKey.pubKeyCredParams?.length > 0,
        algorithms: options.publicKey.pubKeyCredParams?.map(p => p.alg),
        timeout: options.publicKey.timeout,
        attestation: options.publicKey.attestation,
        authenticatorAttachment: options.publicKey.authenticatorSelection?.authenticatorAttachment,
        userVerification: options.publicKey.authenticatorSelection?.userVerification,
        residentKey: options.publicKey.authenticatorSelection?.residentKey,
      };

      addLog(`Registration options validation: ${formatJSON(validation)}`);

      updateTestStatus('Registration Options Request', 'success', { options, validation });
      addLog('Registration options request completed successfully');

    } catch (error: any) {
      addLog(`Registration options request failed: ${error.message}`, 'error');
      updateTestStatus('Registration Options Request', 'error', null, getErrorDescription(error));
    }
  };

  const testRegistrationFlow = async () => {
    updateTestStatus('Registration Flow Test', 'running');
    addLog('Testing full registration flow...');

    try {
      // Step 1: Get registration options
      addLog('Step 1: Getting registration options...');
      const optionsResponse = await fetch('/api/webauthn/register/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!optionsResponse.ok) {
        const errorText = await optionsResponse.text();
        throw new Error(`Failed to get registration options: ${errorText}`);
      }

      const optionsData = await optionsResponse.json();
      const options: RegistrationOptions = optionsData.data.options;

      addLog(`Got registration options: ${formatJSON(options.publicKey)}`);

      // Step 2: Create credential using native browser API
      addLog('Step 2: Creating WebAuthn credential...');
      
      // Convert challenge and user ID from base64url
      const challenge = Uint8Array.from(atob(options.publicKey.challenge.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
      const userId = Uint8Array.from(atob(options.publicKey.user.id.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

      const credentialOptions: CredentialCreationOptions = {
        publicKey: {
          challenge,
          rp: options.publicKey.rp,
          user: {
            ...options.publicKey.user,
            id: userId,
          },
          pubKeyCredParams: options.publicKey.pubKeyCredParams,
          timeout: options.publicKey.timeout,
          attestation: options.publicKey.attestation as AttestationConveyancePreference,
          authenticatorSelection: {
            authenticatorAttachment: options.publicKey.authenticatorSelection.authenticatorAttachment as AuthenticatorAttachment,
            userVerification: options.publicKey.authenticatorSelection.userVerification as UserVerificationRequirement,
            residentKey: options.publicKey.authenticatorSelection.residentKey as ResidentKeyRequirement,
          },
          excludeCredentials: options.publicKey.excludeCredentials || [],
        }
      };

      addLog(`Creating credential with options: ${formatJSON(credentialOptions)}`);

      const credential = await navigator.credentials.create(credentialOptions) as PublicKeyCredential | null;

      if (!credential) {
        throw new Error('No credential returned from navigator.credentials.create()');
      }

      addLog(`Credential created successfully: ${credential.id}`);
      addLog(`Credential type: ${credential.type}`);
      addLog(`Credential response type: ${credential.response.constructor.name}`);

      // Step 3: Prepare credential for server
      const attestationResponse = credential.response as AuthenticatorAttestationResponse;
      const credentialForServer = {
        id: credential.id,
        rawId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
        response: {
          attestationObject: btoa(String.fromCharCode(...new Uint8Array(attestationResponse.attestationObject))),
          clientDataJSON: btoa(String.fromCharCode(...new Uint8Array(attestationResponse.clientDataJSON))),
        },
        type: credential.type,
        clientExtensionResults: credential.getClientExtensionResults(),
      };

      addLog(`Credential prepared for server: ${formatJSON(credentialForServer)}`);

      // Step 4: Verify with server
      addLog('Step 3: Verifying credential with server...');
      const verifyResponse = await fetch('/api/webauthn/register/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ credential: credentialForServer }),
        credentials: 'include',
      });

      const verifyText = await verifyResponse.text();
      addLog(`Verification response status: ${verifyResponse.status}`);
      addLog(`Verification response: ${verifyText}`);

      if (!verifyResponse.ok) {
        throw new Error(`Verification failed: ${verifyText}`);
      }

      const verifyData = JSON.parse(verifyText);
      
      if (!verifyData.success) {
        throw new Error(`Verification unsuccessful: ${verifyText}`);
      }

      setRegisteredCredential(credentialForServer);
      updateTestStatus('Registration Flow Test', 'success', { credential: credentialForServer, verification: verifyData });
      addLog('Registration flow completed successfully!', 'success');

    } catch (error: any) {
      addLog(`Registration flow failed: ${error.message}`, 'error');
      addLog(`Error details: ${getErrorDescription(error)}`, 'error');
      updateTestStatus('Registration Flow Test', 'error', null, getErrorDescription(error), error.stack);
    }
  };

  const testAuthenticationOptions = async () => {
    updateTestStatus('Authentication Options Request', 'running');
    addLog('Testing authentication options request...');

    try {
      const response = await fetch('/api/webauthn/authenticate/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: testUserId }),
        credentials: 'include',
      });

      const responseText = await response.text();
      addLog(`Authentication options response status: ${response.status}`);
      addLog(`Authentication options response: ${responseText}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${responseText}`);
      }

      const data = JSON.parse(responseText);
      
      if (!data.success || !data.data?.options) {
        throw new Error(`Invalid response format: ${responseText}`);
      }

      const options: AuthenticationOptions = data.data.options;
      
      // Validate authentication options
      const validation = {
        hasChallenge: !!options.publicKey.challenge,
        challengeLength: options.publicKey.challenge.length,
        timeout: options.publicKey.timeout,
        rpId: options.publicKey.rpId,
        userVerification: options.publicKey.userVerification,
        allowCredentials: options.publicKey.allowCredentials?.length || 0,
      };

      addLog(`Authentication options validation: ${formatJSON(validation)}`);

      updateTestStatus('Authentication Options Request', 'success', { options, validation });
      addLog('Authentication options request completed successfully');

    } catch (error: any) {
      addLog(`Authentication options request failed: ${error.message}`, 'error');
      updateTestStatus('Authentication Options Request', 'error', null, getErrorDescription(error));
    }
  };

  const testAuthenticationFlow = async () => {
    updateTestStatus('Authentication Flow Test', 'running');
    addLog('Testing full authentication flow...');

    if (!registeredCredential) {
      const error = 'No registered credential found. Please run registration test first.';
      addLog(error, 'error');
      updateTestStatus('Authentication Flow Test', 'error', null, error);
      return;
    }

    try {
      // Step 1: Get authentication options
      addLog('Step 1: Getting authentication options...');
      const optionsResponse = await fetch('/api/webauthn/authenticate/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: testUserId }),
        credentials: 'include',
      });

      if (!optionsResponse.ok) {
        const errorText = await optionsResponse.text();
        throw new Error(`Failed to get authentication options: ${errorText}`);
      }

      const optionsData = await optionsResponse.json();
      const options: AuthenticationOptions = optionsData.data.options;

      addLog(`Got authentication options: ${formatJSON(options.publicKey)}`);

      // Step 2: Get credential using native browser API
      addLog('Step 2: Getting WebAuthn credential...');
      
      // Convert challenge from base64url
      const challenge = Uint8Array.from(atob(options.publicKey.challenge.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

      const credentialOptions: CredentialRequestOptions = {
        publicKey: {
          challenge,
          timeout: options.publicKey.timeout,
          rpId: options.publicKey.rpId,
          userVerification: options.publicKey.userVerification as UserVerificationRequirement,
          allowCredentials: options.publicKey.allowCredentials || [],
        }
      };

      addLog(`Getting credential with options: ${formatJSON(credentialOptions)}`);

      const credential = await navigator.credentials.get(credentialOptions) as PublicKeyCredential | null;

      if (!credential) {
        throw new Error('No credential returned from navigator.credentials.get()');
      }

      addLog(`Credential retrieved successfully: ${credential.id}`);

      // Step 3: Prepare credential for server
      const assertionResponse = credential.response as AuthenticatorAssertionResponse;
      const credentialForServer = {
        id: credential.id,
        rawId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
        response: {
          authenticatorData: btoa(String.fromCharCode(...new Uint8Array(assertionResponse.authenticatorData))),
          clientDataJSON: btoa(String.fromCharCode(...new Uint8Array(assertionResponse.clientDataJSON))),
          signature: btoa(String.fromCharCode(...new Uint8Array(assertionResponse.signature))),
          userHandle: assertionResponse.userHandle ? btoa(String.fromCharCode(...new Uint8Array(assertionResponse.userHandle))) : null,
        },
        type: credential.type,
        clientExtensionResults: credential.getClientExtensionResults(),
      };

      addLog(`Credential prepared for server: ${formatJSON(credentialForServer)}`);

      // Step 4: Verify with server
      addLog('Step 3: Verifying credential with server...');
      const verifyResponse = await fetch('/api/webauthn/authenticate/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ credential: credentialForServer }),
        credentials: 'include',
      });

      const verifyText = await verifyResponse.text();
      addLog(`Verification response status: ${verifyResponse.status}`);
      addLog(`Verification response: ${verifyText}`);

      if (!verifyResponse.ok) {
        throw new Error(`Verification failed: ${verifyText}`);
      }

      const verifyData = JSON.parse(verifyText);
      
      if (!verifyData.success) {
        throw new Error(`Verification unsuccessful: ${verifyText}`);
      }

      updateTestStatus('Authentication Flow Test', 'success', { credential: credentialForServer, verification: verifyData });
      addLog('Authentication flow completed successfully!', 'success');

    } catch (error: any) {
      addLog(`Authentication flow failed: ${error.message}`, 'error');
      addLog(`Error details: ${getErrorDescription(error)}`, 'error');
      updateTestStatus('Authentication Flow Test', 'error', null, getErrorDescription(error), error.stack);
    }
  };

  const runAllTests = async () => {
    addLog('Starting comprehensive WebAuthn test suite...', 'info');
    
    // Reset all tests
    setTests(prev => prev.map(test => ({ ...test, status: 'pending' as const, result: undefined, error: undefined, details: undefined, timestamp: undefined })));
    setLogs([]);
    setRegisteredCredential(null);

    // Run tests in sequence
    await checkBrowserSupport();
    // Platform authenticator check runs automatically after browser support
    
    // Wait a bit for UI updates
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testRegistrationOptions();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testRegistrationFlow();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testAuthenticationOptions();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testAuthenticationFlow();

    addLog('Test suite completed!', 'info');
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'running': return '🔄';
      case 'success': return '✅';
      case 'error': return '❌';
      default: return '❓';
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'pending': return 'text-gray-500';
      case 'running': return 'text-blue-500';
      case 'success': return 'text-green-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">WebAuthn Debug Test Suite</h1>
      
      <div className="mb-6">
        <p className="text-gray-600 mb-4">
          This comprehensive test suite helps diagnose WebAuthn/biometric authentication issues.
          Each test provides detailed logging and error information to identify problems.
        </p>
        
        <div className="flex gap-4 mb-4">
          <button
            onClick={runAllTests}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Run All Tests
          </button>
          <button
            onClick={clearLogs}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Clear Logs
          </button>
        </div>
      </div>

      {/* Test Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {tests.map((test, index) => (
          <div key={index} className="border rounded-lg p-4 bg-white shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm">{test.name}</h3>
              <span className={`text-xl ${getStatusColor(test.status)}`}>
                {getStatusIcon(test.status)}
              </span>
            </div>
            <div className={`text-sm ${getStatusColor(test.status)}`}>
              {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
            </div>
            {test.timestamp && (
              <div className="text-xs text-gray-500 mt-1">
                {test.timestamp.toLocaleTimeString()}
              </div>
            )}
            {test.error && (
              <div className="text-xs text-red-600 mt-2 p-2 bg-red-50 rounded">
                <strong>Error:</strong> {test.error}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Browser Capabilities */}
      {capabilities && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Browser Capabilities</h2>
          <div className="bg-white border rounded-lg p-4 shadow">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">WebAuthn Support</h3>
                <ul className="text-sm space-y-1">
                  <li>Supported: {capabilities.isSupported ? '✅' : '❌'}</li>
                  <li>Platform Authenticator: {capabilities.isPlatformAuthenticatorAvailable ? '✅' : '❌'}</li>
                  <li>Biometric Types: {capabilities.biometricTypes.join(', ') || 'None detected'}</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Device Information</h3>
                <ul className="text-sm space-y-1">
                  <li>Platform: {capabilities.deviceInfo.platform}</li>
                  <li>Mobile: {capabilities.deviceInfo.isMobile ? '✅' : '❌'}</li>
                  <li>iOS: {capabilities.deviceInfo.isIOS ? '✅' : '❌'}</li>
                  <li>Android: {capabilities.deviceInfo.isAndroid ? '✅' : '❌'}</li>
                  <li>macOS: {capabilities.deviceInfo.isMacOS ? '✅' : '❌'}</li>
                  <li>Windows: {capabilities.deviceInfo.isWindows ? '✅' : '❌'}</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Biometric Availability</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 text-sm">
                <div>Face ID: {capabilities.biometricAvailability.faceID ? '✅' : '❌'}</div>
                <div>Touch ID: {capabilities.biometricAvailability.touchID ? '✅' : '❌'}</div>
                <div>Windows Hello: {capabilities.biometricAvailability.windowsHello ? '✅' : '❌'}</div>
                <div>Android Face: {capabilities.biometricAvailability.androidFace ? '✅' : '❌'}</div>
                <div>Android Fingerprint: {capabilities.biometricAvailability.androidFingerprint ? '✅' : '❌'}</div>
              </div>
            </div>

            <div className="mt-4">
              <h3 className="font-semibold mb-2">Recommended Authentication</h3>
              <p className="text-sm text-gray-600">
                {WebAuthnService.getBiometricIcon(capabilities)} {WebAuthnService.getBiometricTypeName(capabilities)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Individual Test Buttons */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Individual Tests</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={checkBrowserSupport}
            className="p-4 border rounded-lg hover:bg-gray-50 text-left"
          >
            <h3 className="font-semibold">1. Browser Support</h3>
            <p className="text-sm text-gray-600">Check WebAuthn API availability</p>
          </button>
          
          <button
            onClick={testRegistrationOptions}
            className="p-4 border rounded-lg hover:bg-gray-50 text-left"
          >
            <h3 className="font-semibold">2. Registration Options</h3>
            <p className="text-sm text-gray-600">Test server registration endpoint</p>
          </button>
          
          <button
            onClick={testRegistrationFlow}
            className="p-4 border rounded-lg hover:bg-gray-50 text-left"
          >
            <h3 className="font-semibold">3. Registration Flow</h3>
            <p className="text-sm text-gray-600">Full biometric registration test</p>
          </button>
          
          <button
            onClick={testAuthenticationOptions}
            className="p-4 border rounded-lg hover:bg-gray-50 text-left"
          >
            <h3 className="font-semibold">4. Auth Options</h3>
            <p className="text-sm text-gray-600">Test server authentication endpoint</p>
          </button>
          
          <button
            onClick={testAuthenticationFlow}
            className="p-4 border rounded-lg hover:bg-gray-50 text-left"
          >
            <h3 className="font-semibold">5. Authentication Flow</h3>
            <p className="text-sm text-gray-600">Full biometric authentication test</p>
          </button>
        </div>
      </div>

      {/* Test Results */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Test Results</h2>
        <div className="space-y-4">
          {tests.filter(test => test.result || test.error).map((test, index) => (
            <div key={index} className="bg-white border rounded-lg p-4 shadow">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">{test.name}</h3>
                <span className={getStatusColor(test.status)}>
                  {getStatusIcon(test.status)} {test.status}
                </span>
              </div>
              
              {test.result && (
                <div className="mb-2">
                  <h4 className="font-medium text-sm text-green-600 mb-1">Result:</h4>
                  <pre className="text-xs bg-green-50 p-2 rounded overflow-auto max-h-40">
                    {formatJSON(test.result)}
                  </pre>
                </div>
              )}
              
              {test.error && (
                <div className="mb-2">
                  <h4 className="font-medium text-sm text-red-600 mb-1">Error:</h4>
                  <div className="text-xs bg-red-50 p-2 rounded">
                    {test.error}
                  </div>
                </div>
              )}
              
              {test.details && (
                <div>
                  <h4 className="font-medium text-sm text-gray-600 mb-1">Details:</h4>
                  <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-40">
                    {test.details}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Debug Logs */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Debug Logs</h2>
        <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-xs max-h-96 overflow-auto">
          {logs.length === 0 ? (
            <div className="text-gray-500">No logs yet. Run tests to see detailed logging information.</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="mb-1">{log}</div>
            ))
          )}
        </div>
      </div>

      {/* Common Issues Help */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4 text-blue-800">Common Issues & Solutions</h2>
        <div className="space-y-4 text-sm">
          <div>
            <h3 className="font-semibold text-blue-700">NotSupportedError</h3>
            <p>WebAuthn not supported. Try Chrome/Safari on a device with biometric sensors (iPhone with Face ID/Touch ID, Mac with Touch ID, Windows with Windows Hello).</p>
          </div>
          <div>
            <h3 className="font-semibold text-blue-700">NotAllowedError</h3>
            <p>User cancelled or timeout. Make sure to complete the biometric prompt when it appears. Check if biometric authentication is enabled in device settings.</p>
          </div>
          <div>
            <h3 className="font-semibold text-blue-700">SecurityError</h3>
            <p>Security requirements not met. Ensure you're using HTTPS (or localhost for development) and the domain is properly configured.</p>
          </div>
          <div>
            <h3 className="font-semibold text-blue-700">InvalidStateError</h3>
            <p>Authenticator already registered. Try authentication instead, or clear existing credentials and register again.</p>
          </div>
          <div>
            <h3 className="font-semibold text-blue-700">No Platform Authenticator</h3>
            <p>Device doesn't have a built-in biometric sensor or it's disabled. Check device settings for Face ID, Touch ID, Windows Hello, etc.</p>
          </div>
        </div>
      </div>
    </div>
  );
}