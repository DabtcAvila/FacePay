import { useCallback, useState } from "react";
import { Button, Card, BlockStack, Text, InlineStack, Icon } from "@shopify/polaris";
import { SecurityMajor, MobileMajor } from "@shopify/polaris-icons";
import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
} from "@simplewebauthn/browser";

interface WebAuthnAuthProps {
  mode: 'register' | 'login';
  onSuccess: (credential: any) => void;
  onError: (error: string) => void;
  isLoading?: boolean;
}

export function WebAuthnAuth({ mode, onSuccess, onError, isLoading = false }: WebAuthnAuthProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleWebAuthn = useCallback(async () => {
    if (!browserSupportsWebAuthn()) {
      onError('WebAuthn is not supported in this browser');
      return;
    }

    setIsProcessing(true);

    try {
      if (mode === 'register') {
        // Get registration options from server
        const optionsResponse = await fetch('/api/webauthn/register/options', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: 'user@example.com', // This would come from the customer data
          }),
        });

        const options = await optionsResponse.json();

        if (!optionsResponse.ok) {
          throw new Error(options.error || 'Failed to get registration options');
        }

        // Start registration
        const attResp = await startRegistration(options);

        // Verify registration
        const verificationResponse = await fetch('/api/webauthn/register/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(attResp),
        });

        const verificationResult = await verificationResponse.json();

        if (!verificationResponse.ok || !verificationResult.verified) {
          throw new Error('Registration verification failed');
        }

        onSuccess(verificationResult);
      } else {
        // Login mode
        // Get authentication options
        const optionsResponse = await fetch('/api/webauthn/login/options', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const options = await optionsResponse.json();

        if (!optionsResponse.ok) {
          throw new Error(options.error || 'Failed to get login options');
        }

        // Start authentication
        const asseResp = await startAuthentication(options);

        // Verify authentication
        const verificationResponse = await fetch('/api/webauthn/login/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(asseResp),
        });

        const verificationResult = await verificationResponse.json();

        if (!verificationResponse.ok || !verificationResult.verified) {
          throw new Error('Authentication verification failed');
        }

        onSuccess(verificationResult);
      }
    } catch (error: any) {
      console.error('WebAuthn error:', error);
      
      if (error.name === 'NotAllowedError') {
        onError('Authentication was cancelled or timed out');
      } else if (error.name === 'InvalidStateError') {
        onError('This device is already registered');
      } else if (error.name === 'NotSupportedError') {
        onError('Your device does not support this type of authentication');
      } else {
        onError(error.message || 'Authentication failed');
      }
    } finally {
      setIsProcessing(false);
    }
  }, [mode, onSuccess, onError]);

  if (!browserSupportsWebAuthn()) {
    return (
      <Card>
        <BlockStack gap="400">
          <Text variant="headingMd" as="h3">
            Device Authentication
          </Text>
          <Text color="critical">
            Your browser doesn't support secure device authentication. 
            Please use a modern browser like Chrome, Firefox, Safari, or Edge.
          </Text>
        </BlockStack>
      </Card>
    );
  }

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <Text variant="headingMd" as="h3">
            Device Authentication
          </Text>
          <Icon source={SecurityMajor} color="base" />
        </InlineStack>

        <Text color="subdued">
          {mode === 'register' 
            ? 'Set up secure device authentication using your fingerprint, face, or security key.'
            : 'Authenticate using your registered device credential.'
          }
        </Text>

        <BlockStack gap="200">
          <InlineStack gap="200" align="center">
            <Icon source={MobileMajor} color="subdued" />
            <Text color="subdued">Touch ID / Face ID</Text>
          </InlineStack>
          <InlineStack gap="200" align="center">
            <Icon source={SecurityMajor} color="subdued" />
            <Text color="subdued">Windows Hello / Security Keys</Text>
          </InlineStack>
        </BlockStack>

        <Button
          variant="primary"
          fullWidth
          onClick={handleWebAuthn}
          disabled={isLoading || isProcessing}
          loading={isLoading || isProcessing}
        >
          {isProcessing
            ? `${mode === 'register' ? 'Registering' : 'Authenticating'}...`
            : mode === 'register'
            ? 'Set Up Device Authentication'
            : 'Authenticate with Device'
          }
        </Button>

        <Text variant="bodySm" color="subdued" alignment="center">
          Your biometric data stays secure on your device and is never shared.
        </Text>
      </BlockStack>
    </Card>
  );
}