/**
 * FacePay SDK - React Integration Example
 * 
 * This example shows how to integrate FacePay biometric payment authentication
 * into a React application with hooks and proper error handling.
 */

import React, { useState, useEffect, useCallback } from 'react';
import FacePay from '../facepay-sdk.js';

// Custom hook for FacePay SDK
function useFacePay(apiKey, options = {}) {
  const [facePay] = useState(() => new FacePay());
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (apiKey) {
      try {
        facePay.init(apiKey, options);
        setIsInitialized(true);
        setError(null);
      } catch (err) {
        setError(err);
        setIsInitialized(false);
      }
    }
  }, [apiKey, options, facePay]);

  useEffect(() => {
    if (isInitialized) {
      facePay.isSupported().then(support => {
        setIsSupported(support.supported);
        setDeviceInfo(support.device);
      }).catch(setError);
    }
  }, [isInitialized, facePay]);

  const authenticate = useCallback(async (params) => {
    if (!isInitialized) {
      throw new Error('FacePay SDK not initialized');
    }
    return await facePay.authenticate(params);
  }, [facePay, isInitialized]);

  return {
    facePay,
    isInitialized,
    isSupported,
    deviceInfo,
    error,
    authenticate
  };
}

// Payment component
function PaymentForm({ onSuccess, onError }) {
  const [amount, setAmount] = useState(99.99);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);

  const { facePay, isInitialized, isSupported, deviceInfo, error, authenticate } = useFacePay(
    'pk_test_your_api_key_here',
    {
      environment: 'development',
      debug: true,
      stripeKey: 'pk_test_stripe_key'
    }
  );

  const handlePayment = async () => {
    if (!isSupported) {
      alert('Biometric authentication is not supported on this device');
      return;
    }

    setIsProcessing(true);
    setResult(null);

    try {
      const paymentResult = await authenticate({
        amount: amount,
        currency: 'USD',
        userId: 'user@example.com',
        showModal: true,
        metadata: {
          orderId: `order_${Date.now()}`,
          productName: 'Premium Subscription'
        },
        onSuccess: (result) => {
          console.log('Payment successful:', result);
          setResult({ success: true, data: result });
          onSuccess?.(result);
        },
        onError: (error) => {
          console.error('Payment failed:', error);
          setResult({ success: false, error });
          onError?.(error);
        },
        onCancel: () => {
          console.log('Payment cancelled by user');
          setResult({ success: false, cancelled: true });
        }
      });

    } catch (error) {
      console.error('Payment error:', error);
      setResult({ success: false, error });
      onError?.(error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (error) {
    return (
      <div className="error-container">
        <h3>❌ SDK Error</h3>
        <p>{error.message}</p>
        <pre>{JSON.stringify(error, null, 2)}</pre>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="loading-container">
        <h3>🔄 Initializing FacePay SDK...</h3>
      </div>
    );
  }

  return (
    <div className="payment-form">
      <h2>🔐 Biometric Payment</h2>
      
      {/* Device Support Status */}
      <div className={`status-card ${isSupported ? 'supported' : 'not-supported'}`}>
        <h3>📱 Device Status</h3>
        {isSupported ? (
          <div className="success">
            ✅ Biometric authentication supported
            <br />
            🔐 Type: {deviceInfo?.biometricType || 'Unknown'}
            <br />
            📱 Device: {deviceInfo?.isMobile ? 'Mobile' : 'Desktop'}
          </div>
        ) : (
          <div className="error">
            ❌ Biometric authentication not supported
            <br />
            💳 Please use card payment instead
          </div>
        )}
      </div>

      {/* Payment Amount */}
      <div className="amount-section">
        <label htmlFor="amount">Payment Amount:</label>
        <div className="amount-input">
          <span>$</span>
          <input
            id="amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            min="0.01"
            step="0.01"
            disabled={isProcessing}
          />
        </div>
      </div>

      {/* Payment Button */}
      <button
        onClick={handlePayment}
        disabled={!isSupported || isProcessing || amount <= 0}
        className={`payment-btn ${isProcessing ? 'processing' : ''}`}
      >
        {isProcessing ? (
          <>🔄 Processing...</>
        ) : (
          <>🔐 Pay ${amount.toFixed(2)} with {deviceInfo?.biometricType || 'Biometrics'}</>
        )}
      </button>

      {/* Payment Result */}
      {result && (
        <div className={`result-card ${result.success ? 'success' : 'error'}`}>
          {result.success ? (
            <div>
              ✅ <strong>Payment Successful!</strong>
              <br />
              💰 Amount: ${result.data.payment?.amount || amount}
              <br />
              👤 User: {result.data.user?.email || 'Demo User'}
              <br />
              🕐 Time: {new Date(result.data.metadata.timestamp).toLocaleString()}
            </div>
          ) : result.cancelled ? (
            <div>
              ⏹️ <strong>Payment Cancelled</strong>
              <br />
              The user cancelled the biometric authentication.
            </div>
          ) : (
            <div>
              ❌ <strong>Payment Failed</strong>
              <br />
              {result.error?.message || 'Unknown error occurred'}
              <br />
              {result.error?.isRecoverable && (
                <button onClick={handlePayment} className="retry-btn">
                  🔄 Try Again
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Debug Information */}
      {deviceInfo && (
        <details className="debug-info">
          <summary>🐛 Debug Information</summary>
          <pre>{JSON.stringify(deviceInfo, null, 2)}</pre>
        </details>
      )}
    </div>
  );
}

// Main App component
function App() {
  const [paymentHistory, setPaymentHistory] = useState([]);

  const handlePaymentSuccess = (result) => {
    setPaymentHistory(prev => [...prev, {
      id: Date.now(),
      amount: result.payment?.amount || 0,
      timestamp: result.metadata.timestamp,
      user: result.user?.email || 'Demo User',
      status: 'success'
    }]);
  };

  const handlePaymentError = (error) => {
    setPaymentHistory(prev => [...prev, {
      id: Date.now(),
      amount: 0,
      timestamp: new Date().toISOString(),
      error: error.message,
      status: 'failed'
    }]);
  };

  return (
    <div className="app">
      <header>
        <h1>🚀 FacePay React Example</h1>
        <p>Biometric payment authentication with React hooks</p>
      </header>

      <main>
        <PaymentForm 
          onSuccess={handlePaymentSuccess} 
          onError={handlePaymentError} 
        />

        {/* Payment History */}
        {paymentHistory.length > 0 && (
          <div className="payment-history">
            <h3>📊 Payment History</h3>
            <div className="history-list">
              {paymentHistory.map(payment => (
                <div key={payment.id} className={`history-item ${payment.status}`}>
                  <div className="payment-details">
                    {payment.status === 'success' ? '✅' : '❌'} 
                    ${payment.amount?.toFixed(2) || '0.00'} - {payment.user}
                  </div>
                  <div className="payment-time">
                    {new Date(payment.timestamp).toLocaleString()}
                  </div>
                  {payment.error && (
                    <div className="payment-error">{payment.error}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// CSS styles (would normally be in a separate file)
const styles = `
  .app {
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .payment-form {
    background: white;
    border-radius: 12px;
    padding: 24px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    margin: 20px 0;
  }

  .status-card {
    padding: 16px;
    border-radius: 8px;
    margin: 16px 0;
    border: 1px solid #e5e7eb;
  }

  .status-card.supported {
    background: #f0fdf4;
    border-color: #bbf7d0;
  }

  .status-card.not-supported {
    background: #fef2f2;
    border-color: #fecaca;
  }

  .amount-section {
    margin: 20px 0;
  }

  .amount-input {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
  }

  .amount-input input {
    padding: 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 16px;
    width: 150px;
  }

  .payment-btn {
    width: 100%;
    background: #4f46e5;
    color: white;
    border: none;
    padding: 16px;
    border-radius: 8px;
    font-size: 18px;
    cursor: pointer;
    transition: background 0.2s;
  }

  .payment-btn:hover:not(:disabled) {
    background: #4338ca;
  }

  .payment-btn:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }

  .payment-btn.processing {
    background: #6b7280;
  }

  .result-card {
    margin: 20px 0;
    padding: 16px;
    border-radius: 8px;
    border: 1px solid;
  }

  .result-card.success {
    background: #f0fdf4;
    border-color: #bbf7d0;
    color: #166534;
  }

  .result-card.error {
    background: #fef2f2;
    border-color: #fecaca;
    color: #991b1b;
  }

  .retry-btn {
    margin-top: 8px;
    padding: 8px 16px;
    background: #ef4444;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .debug-info {
    margin: 20px 0;
    padding: 12px;
    background: #f9fafb;
    border-radius: 6px;
  }

  .debug-info pre {
    background: #f3f4f6;
    padding: 12px;
    border-radius: 4px;
    overflow-x: auto;
    font-size: 12px;
  }

  .payment-history {
    margin: 40px 0;
  }

  .history-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    margin: 8px 0;
  }

  .history-item.success {
    background: #f0fdf4;
    border-color: #bbf7d0;
  }

  .history-item.failed {
    background: #fef2f2;
    border-color: #fecaca;
  }

  .payment-details {
    font-weight: 500;
  }

  .payment-time {
    font-size: 12px;
    color: #6b7280;
  }

  .payment-error {
    font-size: 12px;
    color: #991b1b;
    margin-top: 4px;
  }

  .error-container, .loading-container {
    text-align: center;
    padding: 40px;
  }

  .error-container pre {
    text-align: left;
    background: #f3f4f6;
    padding: 12px;
    border-radius: 6px;
    overflow-x: auto;
  }
`;

// Add styles to document
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

export default App;