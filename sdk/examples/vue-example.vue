<template>
  <div class="app">
    <header>
      <h1>🚀 FacePay Vue.js Example</h1>
      <p>Biometric payment authentication with Vue.js</p>
    </header>

    <main>
      <!-- SDK Initialization Status -->
      <div class="status-section">
        <div v-if="!isInitialized" class="loading">
          🔄 Initializing FacePay SDK...
        </div>
        
        <div v-else-if="initError" class="error">
          ❌ SDK Error: {{ initError.message }}
        </div>
        
        <div v-else class="success">
          ✅ FacePay SDK initialized successfully
        </div>
      </div>

      <!-- Device Support Status -->
      <div v-if="isInitialized" class="device-status" :class="{ supported: isSupported }">
        <h3>📱 Device Compatibility</h3>
        <div v-if="isSupported" class="support-info success">
          ✅ Biometric authentication supported
          <br />
          🔐 Type: {{ deviceInfo?.biometricType || 'Unknown' }}
          <br />
          📱 Device: {{ deviceInfo?.isMobile ? 'Mobile' : 'Desktop' }}
          <br />
          🌐 Platform: {{ deviceInfo?.platform }}
        </div>
        
        <div v-else class="support-info error">
          ❌ Biometric authentication not supported
          <br />
          💳 Please use card payment instead
        </div>
      </div>

      <!-- Payment Form -->
      <div v-if="isInitialized" class="payment-form">
        <h2>💳 Make Payment</h2>
        
        <div class="form-group">
          <label for="amount">Amount:</label>
          <div class="amount-input">
            <span>$</span>
            <input
              id="amount"
              v-model.number="amount"
              type="number"
              min="0.01"
              step="0.01"
              :disabled="isProcessing"
            />
          </div>
        </div>

        <div class="form-group">
          <label for="userId">User ID:</label>
          <input
            id="userId"
            v-model="userId"
            type="email"
            placeholder="user@example.com"
            :disabled="isProcessing"
          />
        </div>

        <button
          @click="processPayment"
          :disabled="!isSupported || isProcessing || amount <= 0"
          class="pay-button"
          :class="{ processing: isProcessing }"
        >
          <span v-if="isProcessing">🔄 Processing...</span>
          <span v-else>
            🔐 Pay ${{ amount.toFixed(2) }} with {{ deviceInfo?.biometricType || 'Biometrics' }}
          </span>
        </button>

        <!-- Show Modal Toggle -->
        <div class="form-group">
          <label>
            <input v-model="showModal" type="checkbox" />
            Show payment modal
          </label>
        </div>
      </div>

      <!-- Payment Result -->
      <div v-if="paymentResult" class="result-section" :class="paymentResult.type">
        <h3>{{ paymentResult.title }}</h3>
        <div v-html="paymentResult.message"></div>
        
        <button
          v-if="paymentResult.type === 'error' && paymentResult.retryable"
          @click="processPayment"
          class="retry-button"
        >
          🔄 Try Again
        </button>
      </div>

      <!-- Payment History -->
      <div v-if="paymentHistory.length > 0" class="history-section">
        <h3>📊 Payment History</h3>
        <div class="history-list">
          <div
            v-for="payment in paymentHistory"
            :key="payment.id"
            class="history-item"
            :class="payment.status"
          >
            <div class="payment-info">
              <span class="status-icon">{{ payment.status === 'success' ? '✅' : '❌' }}</span>
              <span class="amount">${{ payment.amount.toFixed(2) }}</span>
              <span class="user">{{ payment.user }}</span>
            </div>
            <div class="timestamp">
              {{ formatDate(payment.timestamp) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Debug Panel -->
      <details v-if="isInitialized && debugMode" class="debug-panel">
        <summary>🐛 Debug Information</summary>
        <pre>{{ debugInfo }}</pre>
      </details>

      <!-- Controls -->
      <div class="controls">
        <button @click="toggleDebug">
          {{ debugMode ? '🐛 Hide Debug' : '🔍 Show Debug' }}
        </button>
        
        <button @click="getSDKVersion">
          📦 Get Version
        </button>
        
        <button @click="runDiagnostics">
          🔧 Run Diagnostics
        </button>
      </div>
    </main>
  </div>
</template>

<script>
import FacePay from '../facepay-sdk.js';

export default {
  name: 'FacePayVueExample',
  
  data() {
    return {
      // SDK state
      facePay: null,
      isInitialized: false,
      initError: null,
      isSupported: false,
      deviceInfo: null,
      
      // Payment form
      amount: 99.99,
      userId: 'demo@example.com',
      showModal: true,
      isProcessing: false,
      
      // Results
      paymentResult: null,
      paymentHistory: [],
      
      // Debug
      debugMode: false,
      debugInfo: null
    };
  },

  async mounted() {
    await this.initializeSDK();
  },

  methods: {
    async initializeSDK() {
      try {
        this.facePay = new FacePay();
        
        this.facePay.init('pk_test_demo_key', {
          environment: 'development',
          debug: this.debugMode,
          stripeKey: 'pk_test_stripe_demo_key',
          theme: 'auto'
        });
        
        this.isInitialized = true;
        this.initError = null;
        
        // Check device support
        await this.checkSupport();
        
      } catch (error) {
        console.error('SDK initialization failed:', error);
        this.initError = error;
        this.isInitialized = false;
      }
    },

    async checkSupport() {
      if (!this.facePay) return;
      
      try {
        const support = await this.facePay.isSupported();
        this.isSupported = support.supported;
        this.deviceInfo = support.device;
      } catch (error) {
        console.error('Support check failed:', error);
        this.isSupported = false;
      }
    },

    async processPayment() {
      if (!this.facePay || !this.isSupported) return;
      
      this.isProcessing = true;
      this.paymentResult = null;

      try {
        const result = await this.facePay.authenticate({
          amount: this.amount,
          currency: 'USD',
          userId: this.userId,
          showModal: this.showModal,
          metadata: {
            orderId: `order_${Date.now()}`,
            source: 'vue-example'
          },
          onSuccess: (result) => {
            console.log('Payment successful:', result);
            this.handlePaymentSuccess(result);
          },
          onError: (error) => {
            console.error('Payment failed:', error);
            this.handlePaymentError(error);
          },
          onCancel: () => {
            console.log('Payment cancelled');
            this.handlePaymentCancel();
          }
        });

        // Handle direct result (if not using callbacks)
        if (result && result.success) {
          this.handlePaymentSuccess(result);
        }

      } catch (error) {
        console.error('Payment error:', error);
        this.handlePaymentError(error);
      } finally {
        this.isProcessing = false;
      }
    },

    handlePaymentSuccess(result) {
      this.paymentResult = {
        type: 'success',
        title: '✅ Payment Successful!',
        message: `
          💰 Amount: $${this.amount.toFixed(2)}<br>
          👤 User: ${result.user?.email || this.userId}<br>
          🕐 Time: ${this.formatDate(result.metadata.timestamp)}<br>
          🔐 Method: ${result.metadata.biometric_type}
        `,
        retryable: false
      };

      // Add to history
      this.paymentHistory.unshift({
        id: Date.now(),
        amount: this.amount,
        user: result.user?.email || this.userId,
        timestamp: result.metadata.timestamp,
        status: 'success'
      });

      // Emit custom event
      this.$emit('payment-success', result);
    },

    handlePaymentError(error) {
      let title = '❌ Payment Failed';
      let message = error.message || 'Unknown error occurred';
      let retryable = error.isRecoverable !== false;

      if (error.code === 'USER_CANCELLED') {
        title = '⏹️ Payment Cancelled';
        message = 'You cancelled the biometric authentication.';
        retryable = true;
      } else if (error.code === 'NOT_SUPPORTED') {
        title = '❌ Not Supported';
        message = 'Biometric authentication is not supported on this device.';
        retryable = false;
      } else if (error.code === 'TIMEOUT') {
        title = '⏰ Authentication Timeout';
        message = 'The authentication process timed out. Please try again.';
        retryable = true;
      }

      this.paymentResult = {
        type: 'error',
        title,
        message,
        retryable
      };

      // Add to history
      this.paymentHistory.unshift({
        id: Date.now(),
        amount: this.amount,
        user: this.userId,
        timestamp: new Date().toISOString(),
        status: 'failed',
        error: error.message
      });

      // Emit custom event
      this.$emit('payment-error', error);
    },

    handlePaymentCancel() {
      this.paymentResult = {
        type: 'info',
        title: '⏹️ Payment Cancelled',
        message: 'The payment was cancelled by the user.',
        retryable: true
      };

      this.$emit('payment-cancel');
    },

    async getSDKVersion() {
      if (!this.facePay) return;
      
      try {
        const version = this.facePay.getVersion();
        this.paymentResult = {
          type: 'info',
          title: '📦 SDK Version',
          message: `
            Version: ${version.version}<br>
            Features: ${Object.keys(version.features).filter(f => version.features[f]).join(', ')}<br>
            Initialized: ${version.initialized}
          `,
          retryable: false
        };
      } catch (error) {
        console.error('Failed to get version:', error);
      }
    },

    async runDiagnostics() {
      if (!this.facePay) return;
      
      try {
        const support = await this.facePay.isSupported();
        this.debugInfo = {
          sdk: this.facePay.getVersion(),
          device: support.device,
          support: {
            supported: support.supported,
            type: support.type
          },
          environment: {
            url: window.location.href,
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform
          }
        };
        
        this.debugMode = true;
      } catch (error) {
        console.error('Diagnostics failed:', error);
      }
    },

    toggleDebug() {
      this.debugMode = !this.debugMode;
      if (this.facePay) {
        if (this.debugMode) {
          this.facePay.enableDebug();
        }
      }
    },

    formatDate(timestamp) {
      return new Date(timestamp).toLocaleString();
    }
  }
};
</script>

<style scoped>
.app {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
}

header {
  text-align: center;
  margin-bottom: 40px;
}

header h1 {
  color: #1f2937;
  margin-bottom: 8px;
}

header p {
  color: #6b7280;
}

.status-section {
  margin: 20px 0;
  padding: 16px;
  border-radius: 8px;
  text-align: center;
}

.loading {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fcd34d;
}

.success {
  background: #d1fae5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}

.error {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.device-status {
  margin: 20px 0;
  padding: 20px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}

.device-status.supported {
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.device-status h3 {
  margin-top: 0;
  color: #1f2937;
}

.support-info {
  padding: 12px;
  border-radius: 6px;
  margin-top: 12px;
}

.payment-form {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
  margin: 20px 0;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.payment-form h2 {
  margin-top: 0;
  color: #1f2937;
}

.form-group {
  margin: 16px 0;
}

.form-group label {
  display: block;
  margin-bottom: 4px;
  font-weight: 500;
  color: #374151;
}

.amount-input {
  display: flex;
  align-items: center;
  gap: 4px;
}

.amount-input span {
  font-weight: 600;
  color: #374151;
}

input[type="number"],
input[type="email"] {
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 16px;
  width: 200px;
}

input:focus {
  outline: none;
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.pay-button {
  width: 100%;
  background: #4f46e5;
  color: white;
  border: none;
  padding: 16px 24px;
  border-radius: 8px;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin: 20px 0 16px 0;
}

.pay-button:hover:not(:disabled) {
  background: #4338ca;
  transform: translateY(-1px);
}

.pay-button:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  transform: none;
}

.pay-button.processing {
  background: #6b7280;
}

.result-section {
  margin: 20px 0;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid;
}

.result-section.success {
  background: #f0fdf4;
  border-color: #bbf7d0;
  color: #166534;
}

.result-section.error {
  background: #fef2f2;
  border-color: #fecaca;
  color: #991b1b;
}

.result-section.info {
  background: #dbeafe;
  border-color: #bfdbfe;
  color: #1e40af;
}

.result-section h3 {
  margin-top: 0;
}

.retry-button {
  margin-top: 12px;
  padding: 8px 16px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.retry-button:hover {
  background: #dc2626;
}

.history-section {
  margin: 40px 0;
}

.history-section h3 {
  color: #1f2937;
}

.history-list {
  space-y: 8px;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
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

.payment-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-icon {
  font-size: 16px;
}

.amount {
  font-weight: 600;
  font-size: 16px;
}

.user {
  color: #6b7280;
  font-size: 14px;
}

.timestamp {
  color: #9ca3af;
  font-size: 12px;
}

.debug-panel {
  margin: 20px 0;
  padding: 16px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.debug-panel pre {
  background: #f3f4f6;
  padding: 12px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 12px;
  white-space: pre-wrap;
}

.controls {
  display: flex;
  gap: 12px;
  margin: 20px 0;
  flex-wrap: wrap;
}

.controls button {
  padding: 8px 16px;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.controls button:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

@media (max-width: 640px) {
  .app {
    padding: 12px;
  }
  
  .payment-form {
    padding: 16px;
  }
  
  input[type="number"],
  input[type="email"] {
    width: 100%;
    max-width: 300px;
  }
  
  .controls {
    flex-direction: column;
  }
  
  .controls button {
    width: 100%;
  }
  
  .history-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>