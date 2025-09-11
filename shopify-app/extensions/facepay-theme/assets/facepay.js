/**
 * FacePay Theme Extension JavaScript
 * Handles biometric authentication in the storefront
 */

class FacePay {
  constructor() {
    this.initialized = false;
    this.settings = {};
    this.currentAuth = null;
    this.init();
  }

  async init() {
    if (this.initialized) return;
    
    try {
      // Check if FacePay is enabled for this shop
      const response = await fetch('/apps/facepay/api/settings');
      if (!response.ok) {
        console.log('FacePay not available for this shop');
        return;
      }
      
      this.settings = await response.json();
      if (!this.settings.isActive) {
        console.log('FacePay is not active');
        return;
      }
      
      this.setupEventListeners();
      this.initialized = true;
      console.log('FacePay initialized successfully');
      
    } catch (error) {
      console.error('FacePay initialization failed:', error);
    }
  }

  setupEventListeners() {
    // Handle Face ID button clicks
    document.addEventListener('click', (e) => {
      if (e.target.matches('#facepay-face-id, #facepay-face-id *')) {
        e.preventDefault();
        this.handleFaceIDAuth();
      }
    });

    // Handle WebAuthn button clicks
    document.addEventListener('click', (e) => {
      if (e.target.matches('#facepay-webauthn, #facepay-webauthn *')) {
        e.preventDefault();
        this.handleWebAuthnAuth();
      }
    });
  }

  async handleFaceIDAuth() {
    if (!this.settings.enableFaceID) {
      this.showError('Face ID is not enabled');
      return;
    }

    try {
      this.showStatus('Starting Face ID authentication...');
      
      // Check camera permission
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported in this browser');
      }

      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });

      // Create video element for face detection
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.muted = true;
      video.style.position = 'fixed';
      video.style.top = '50%';
      video.style.left = '50%';
      video.style.transform = 'translate(-50%, -50%)';
      video.style.zIndex = '10000';
      video.style.border = '2px solid #007aff';
      video.style.borderRadius = '8px';
      video.style.width = '320px';
      video.style.height = '240px';

      // Add overlay
      const overlay = document.createElement('div');
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      overlay.style.backgroundColor = 'rgba(0,0,0,0.8)';
      overlay.style.zIndex = '9999';
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.flexDirection = 'column';

      const instructions = document.createElement('p');
      instructions.textContent = 'Position your face in the frame';
      instructions.style.color = 'white';
      instructions.style.marginBottom = '1rem';
      instructions.style.fontSize = '1.1rem';

      const closeBtn = document.createElement('button');
      closeBtn.textContent = '✕ Cancel';
      closeBtn.style.position = 'absolute';
      closeBtn.style.top = '20px';
      closeBtn.style.right = '20px';
      closeBtn.style.background = 'rgba(255,255,255,0.2)';
      closeBtn.style.color = 'white';
      closeBtn.style.border = 'none';
      closeBtn.style.padding = '10px';
      closeBtn.style.borderRadius = '4px';
      closeBtn.style.cursor = 'pointer';

      overlay.appendChild(instructions);
      overlay.appendChild(video);
      overlay.appendChild(closeBtn);
      document.body.appendChild(overlay);

      const cleanup = () => {
        stream.getTracks().forEach(track => track.stop());
        document.body.removeChild(overlay);
      };

      closeBtn.onclick = () => {
        cleanup();
        this.hideStatus();
      };

      // Simulate face recognition after 3 seconds
      setTimeout(async () => {
        try {
          this.showStatus('Analyzing face...');
          
          // Simulate face recognition API call
          const authResult = await fetch('/apps/facepay/api/authenticate/face', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              method: 'face',
              timestamp: Date.now(),
            }),
          });

          const result = await authResult.json();
          
          cleanup();
          
          if (result.success) {
            this.handleAuthSuccess(result, 'face');
          } else {
            throw new Error(result.error || 'Face recognition failed');
          }
          
        } catch (error) {
          cleanup();
          this.showError(error.message);
        }
      }, 3000);

    } catch (error) {
      console.error('Face ID error:', error);
      this.showError(error.message);
    }
  }

  async handleWebAuthnAuth() {
    if (!this.settings.enableWebAuthn) {
      this.showError('WebAuthn is not enabled');
      return;
    }

    if (!window.PublicKeyCredential) {
      this.showError('WebAuthn is not supported in this browser');
      return;
    }

    try {
      this.showStatus('Starting device authentication...');

      // Get authentication options
      const optionsResponse = await fetch('/apps/facepay/api/webauthn/options', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!optionsResponse.ok) {
        throw new Error('Failed to get authentication options');
      }

      const options = await optionsResponse.json();

      this.showStatus('Touch your fingerprint or look at your device...');

      // Start WebAuthn authentication
      const credential = await navigator.credentials.get({
        publicKey: options,
      });

      if (!credential) {
        throw new Error('No credential returned');
      }

      this.showStatus('Verifying authentication...');

      // Verify with server
      const verifyResponse = await fetch('/apps/facepay/api/webauthn/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credential: {
            id: credential.id,
            rawId: Array.from(new Uint8Array(credential.rawId)),
            response: {
              authenticatorData: Array.from(new Uint8Array(credential.response.authenticatorData)),
              clientDataJSON: Array.from(new Uint8Array(credential.response.clientDataJSON)),
              signature: Array.from(new Uint8Array(credential.response.signature)),
              userHandle: credential.response.userHandle ? 
                Array.from(new Uint8Array(credential.response.userHandle)) : null,
            },
            type: credential.type,
          },
        }),
      });

      const result = await verifyResponse.json();

      if (result.success) {
        this.handleAuthSuccess(result, 'webauthn');
      } else {
        throw new Error(result.error || 'Authentication verification failed');
      }

    } catch (error) {
      console.error('WebAuthn error:', error);
      
      if (error.name === 'NotAllowedError') {
        this.showError('Authentication was cancelled');
      } else if (error.name === 'InvalidStateError') {
        this.showError('No registered device found');
      } else {
        this.showError(error.message || 'Device authentication failed');
      }
    }
  }

  handleAuthSuccess(result, method) {
    this.currentAuth = {
      verified: true,
      method: method,
      userId: result.userId,
      timestamp: Date.now(),
    };

    this.showSuccess();
    
    // Store auth state
    sessionStorage.setItem('facepay_auth', JSON.stringify(this.currentAuth));
    
    // Redirect to checkout or next step
    this.proceedToCheckout();
  }

  proceedToCheckout() {
    // Add authenticated state to cart attributes
    if (this.currentAuth) {
      fetch('/cart/update.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attributes: {
            'facepay_verified': 'true',
            'facepay_method': this.currentAuth.method,
            'facepay_timestamp': this.currentAuth.timestamp.toString(),
          },
        }),
      }).then(() => {
        // Redirect to checkout
        window.location.href = '/checkout';
      }).catch((error) => {
        console.error('Failed to update cart:', error);
        // Still proceed to checkout
        window.location.href = '/checkout';
      });
    }
  }

  showStatus(message) {
    const statusEl = document.getElementById('facepay-status');
    const statusText = document.getElementById('facepay-status-text');
    
    if (statusEl && statusText) {
      statusText.textContent = message;
      statusEl.style.display = 'block';
    }
    
    this.hideError();
    this.hideSuccess();
  }

  showError(message) {
    const errorEl = document.getElementById('facepay-error');
    const errorText = document.getElementById('facepay-error-text');
    
    if (errorEl && errorText) {
      errorText.textContent = message;
      errorEl.style.display = 'block';
    }
    
    this.hideStatus();
    this.hideSuccess();
  }

  showSuccess() {
    const successEl = document.getElementById('facepay-success');
    
    if (successEl) {
      successEl.style.display = 'block';
    }
    
    this.hideStatus();
    this.hideError();
  }

  hideStatus() {
    const statusEl = document.getElementById('facepay-status');
    if (statusEl) statusEl.style.display = 'none';
  }

  hideError() {
    const errorEl = document.getElementById('facepay-error');
    if (errorEl) errorEl.style.display = 'none';
  }

  hideSuccess() {
    const successEl = document.getElementById('facepay-success');
    if (successEl) successEl.style.display = 'none';
  }
}

// Initialize FacePay when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new FacePay();
  });
} else {
  new FacePay();
}