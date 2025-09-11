/**
 * FacePay SDK - Angular Integration Example
 * 
 * This example shows how to integrate FacePay biometric payment authentication
 * into an Angular application with services, components, and reactive forms.
 */

import { Component, Injectable, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BehaviorSubject, Observable, Subject, takeUntil, catchError, of } from 'rxjs';
import FacePay from '../facepay-sdk.js';

// Interfaces
interface PaymentResult {
  success: boolean;
  amount?: number;
  user?: any;
  timestamp?: string;
  error?: string;
}

interface DeviceSupport {
  supported: boolean;
  type: string;
  device: any;
}

// FacePay Service
@Injectable({
  providedIn: 'root'
})
export class FacePayService {
  private facePay: any;
  private readonly _isInitialized$ = new BehaviorSubject<boolean>(false);
  private readonly _isSupported$ = new BehaviorSubject<boolean>(false);
  private readonly _deviceInfo$ = new BehaviorSubject<any>(null);
  private readonly _error$ = new BehaviorSubject<string | null>(null);

  // Public observables
  public readonly isInitialized$ = this._isInitialized$.asObservable();
  public readonly isSupported$ = this._isSupported$.asObservable();
  public readonly deviceInfo$ = this._deviceInfo$.asObservable();
  public readonly error$ = this._error$.asObservable();

  constructor() {
    this.initializeSDK();
  }

  private async initializeSDK(): Promise<void> {
    try {
      this.facePay = new FacePay();
      
      this.facePay.init('pk_test_demo_key', {
        environment: 'development',
        debug: true,
        stripeKey: 'pk_test_stripe_demo_key',
        theme: 'auto'
      });

      this._isInitialized$.next(true);
      this._error$.next(null);

      // Check device support
      const support = await this.facePay.isSupported();
      this._isSupported$.next(support.supported);
      this._deviceInfo$.next(support.device);

    } catch (error: any) {
      console.error('FacePay initialization failed:', error);
      this._error$.next(error.message);
      this._isInitialized$.next(false);
    }
  }

  public async authenticate(params: any): Promise<PaymentResult> {
    if (!this.facePay || !this._isInitialized$.value) {
      throw new Error('FacePay SDK not initialized');
    }

    try {
      const result = await this.facePay.authenticate(params);
      return {
        success: true,
        amount: params.amount,
        user: result.user,
        timestamp: result.metadata.timestamp
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  public async getVersion(): Promise<any> {
    if (!this.facePay) return null;
    return this.facePay.getVersion();
  }

  public enableDebug(): void {
    if (this.facePay) {
      this.facePay.enableDebug();
    }
  }
}

// Main Component
@Component({
  selector: 'app-facepay-example',
  template: `
    <div class="facepay-container">
      <header class="header">
        <h1>🚀 FacePay Angular Example</h1>
        <p>Biometric payment authentication with Angular</p>
      </header>

      <!-- Initialization Status -->
      <div class="status-card" [ngClass]="getStatusClass()">
        <div *ngIf="!isInitialized && !error" class="loading">
          🔄 Initializing FacePay SDK...
        </div>
        
        <div *ngIf="error" class="error">
          ❌ SDK Error: {{ error }}
        </div>
        
        <div *ngIf="isInitialized && !error" class="success">
          ✅ FacePay SDK initialized successfully
        </div>
      </div>

      <!-- Device Support -->
      <div *ngIf="isInitialized" class="device-support" [ngClass]="{ 'supported': isSupported }">
        <h3>📱 Device Compatibility</h3>
        
        <div *ngIf="isSupported; else notSupported" class="support-details success">
          ✅ Biometric authentication supported
          <br>
          🔐 Type: {{ deviceInfo?.biometricType || 'Unknown' }}
          <br>
          📱 Device: {{ deviceInfo?.isMobile ? 'Mobile' : 'Desktop' }}
          <br>
          🌐 Platform: {{ deviceInfo?.platform }}
        </div>
        
        <ng-template #notSupported>
          <div class="support-details error">
            ❌ Biometric authentication not supported
            <br>
            💳 Please use card payment instead
          </div>
        </ng-template>
      </div>

      <!-- Payment Form -->
      <div *ngIf="isInitialized" class="payment-form">
        <h2>💳 Payment Details</h2>
        
        <form [formGroup]="paymentForm" (ngSubmit)="processPayment()">
          <div class="form-group">
            <label for="amount">Amount ($):</label>
            <input
              id="amount"
              type="number"
              formControlName="amount"
              min="0.01"
              step="0.01"
              [disabled]="isProcessing"
            >
            <div *ngIf="paymentForm.get('amount')?.invalid && paymentForm.get('amount')?.touched" 
                 class="validation-error">
              Please enter a valid amount (minimum $0.01)
            </div>
          </div>

          <div class="form-group">
            <label for="userId">User ID:</label>
            <input
              id="userId"
              type="email"
              formControlName="userId"
              placeholder="user@example.com"
              [disabled]="isProcessing"
            >
            <div *ngIf="paymentForm.get('userId')?.invalid && paymentForm.get('userId')?.touched" 
                 class="validation-error">
              Please enter a valid email address
            </div>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" formControlName="showModal">
              Show payment modal
            </label>
          </div>

          <button
            type="submit"
            class="pay-button"
            [class.processing]="isProcessing"
            [disabled]="!isSupported || isProcessing || paymentForm.invalid"
          >
            <span *ngIf="isProcessing">🔄 Processing...</span>
            <span *ngIf="!isProcessing">
              🔐 Pay ${{ paymentForm.get('amount')?.value | number:'1.2-2' }} 
              with {{ deviceInfo?.biometricType || 'Biometrics' }}
            </span>
          </button>
        </form>
      </div>

      <!-- Payment Result -->
      <div *ngIf="paymentResult" class="result-card" [ngClass]="paymentResult.success ? 'success' : 'error'">
        <h3>{{ paymentResult.success ? '✅ Payment Successful!' : '❌ Payment Failed' }}</h3>
        
        <div *ngIf="paymentResult.success">
          💰 Amount: ${{ paymentResult.amount | number:'1.2-2' }}
          <br>
          👤 User: {{ paymentResult.user?.email || 'Demo User' }}
          <br>
          🕐 Time: {{ paymentResult.timestamp | date:'medium' }}
        </div>
        
        <div *ngIf="!paymentResult.success">
          {{ paymentResult.error }}
          <br>
          <button *ngIf="isRetryable(paymentResult.error)" 
                  class="retry-button" 
                  (click)="processPayment()">
            🔄 Try Again
          </button>
        </div>
      </div>

      <!-- Payment History -->
      <div *ngIf="paymentHistory.length > 0" class="history-section">
        <h3>📊 Payment History</h3>
        <div class="history-list">
          <div *ngFor="let payment of paymentHistory; trackBy: trackPayment" 
               class="history-item" 
               [ngClass]="payment.status">
            <div class="payment-details">
              <span class="status-icon">{{ payment.status === 'success' ? '✅' : '❌' }}</span>
              <span class="amount">${{ payment.amount | number:'1.2-2' }}</span>
              <span class="user">{{ payment.user }}</span>
            </div>
            <div class="timestamp">
              {{ payment.timestamp | date:'short' }}
            </div>
          </div>
        </div>
      </div>

      <!-- Controls -->
      <div class="controls">
        <button (click)="getSDKVersion()" class="control-button">
          📦 Get Version
        </button>
        
        <button (click)="toggleDebug()" class="control-button">
          {{ debugEnabled ? '🐛 Disable Debug' : '🔍 Enable Debug' }}
        </button>
        
        <button (click)="runDiagnostics()" class="control-button">
          🔧 Run Diagnostics
        </button>
      </div>

      <!-- Debug Panel -->
      <details *ngIf="debugEnabled && debugInfo" class="debug-panel">
        <summary>🐛 Debug Information</summary>
        <pre>{{ debugInfo | json }}</pre>
      </details>
    </div>
  `,
  styles: [`
    .facepay-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .header {
      text-align: center;
      margin-bottom: 40px;
    }

    .header h1 {
      color: #1f2937;
      margin-bottom: 8px;
    }

    .header p {
      color: #6b7280;
    }

    .status-card {
      padding: 16px;
      border-radius: 8px;
      margin: 20px 0;
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

    .device-support {
      margin: 20px 0;
      padding: 20px;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
    }

    .device-support.supported {
      background: #f0fdf4;
      border-color: #bbf7d0;
    }

    .device-support h3 {
      margin-top: 0;
    }

    .support-details {
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

    .checkbox-label {
      display: flex !important;
      align-items: center;
      gap: 8px;
    }

    input[type="number"],
    input[type="email"] {
      width: 100%;
      max-width: 300px;
      padding: 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 16px;
    }

    input:focus {
      outline: none;
      border-color: #4f46e5;
      box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
    }

    .validation-error {
      color: #991b1b;
      font-size: 14px;
      margin-top: 4px;
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
      margin: 20px 0;
    }

    .pay-button:hover:not(:disabled) {
      background: #4338ca;
    }

    .pay-button:disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }

    .pay-button.processing {
      background: #6b7280;
    }

    .result-card {
      margin: 20px 0;
      padding: 20px;
      border-radius: 8px;
      border: 1px solid;
    }

    .retry-button {
      margin-top: 12px;
      padding: 8px 16px;
      background: #ef4444;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }

    .history-section {
      margin: 40px 0;
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

    .payment-details {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .amount {
      font-weight: 600;
    }

    .user {
      color: #6b7280;
      font-size: 14px;
    }

    .timestamp {
      color: #9ca3af;
      font-size: 12px;
    }

    .controls {
      display: flex;
      gap: 12px;
      margin: 20px 0;
      flex-wrap: wrap;
    }

    .control-button {
      padding: 8px 16px;
      border: 1px solid #d1d5db;
      background: white;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
    }

    .control-button:hover {
      background: #f9fafb;
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
    }

    @media (max-width: 768px) {
      .facepay-container {
        padding: 12px;
      }

      .payment-form {
        padding: 16px;
      }

      .controls {
        flex-direction: column;
      }

      .control-button {
        width: 100%;
      }

      .history-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }
    }
  `]
})
export class FacePayExampleComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Form
  paymentForm: FormGroup;

  // State
  isInitialized = false;
  isSupported = false;
  deviceInfo: any = null;
  error: string | null = null;
  isProcessing = false;
  debugEnabled = false;

  // Results
  paymentResult: PaymentResult | null = null;
  paymentHistory: any[] = [];
  debugInfo: any = null;

  constructor(
    private facePayService: FacePayService,
    private formBuilder: FormBuilder
  ) {
    this.paymentForm = this.formBuilder.group({
      amount: [99.99, [Validators.required, Validators.min(0.01)]],
      userId: ['demo@example.com', [Validators.required, Validators.email]],
      showModal: [true]
    });
  }

  ngOnInit() {
    // Subscribe to service observables
    this.facePayService.isInitialized$
      .pipe(takeUntil(this.destroy$))
      .subscribe(initialized => this.isInitialized = initialized);

    this.facePayService.isSupported$
      .pipe(takeUntil(this.destroy$))
      .subscribe(supported => this.isSupported = supported);

    this.facePayService.deviceInfo$
      .pipe(takeUntil(this.destroy$))
      .subscribe(info => this.deviceInfo = info);

    this.facePayService.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => this.error = error);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getStatusClass(): string {
    if (this.error) return 'error';
    if (!this.isInitialized) return 'loading';
    return 'success';
  }

  async processPayment() {
    if (this.paymentForm.invalid || this.isProcessing) return;

    this.isProcessing = true;
    this.paymentResult = null;

    const formValue = this.paymentForm.value;

    try {
      const result = await this.facePayService.authenticate({
        amount: formValue.amount,
        currency: 'USD',
        userId: formValue.userId,
        showModal: formValue.showModal,
        metadata: {
          orderId: `order_${Date.now()}`,
          source: 'angular-example'
        }
      });

      this.paymentResult = result;

      // Add to history
      this.paymentHistory.unshift({
        id: Date.now(),
        amount: formValue.amount,
        user: formValue.userId,
        timestamp: new Date().toISOString(),
        status: result.success ? 'success' : 'failed'
      });

    } catch (error: any) {
      this.paymentResult = {
        success: false,
        error: error.message
      };
    } finally {
      this.isProcessing = false;
    }
  }

  async getSDKVersion() {
    try {
      const version = await this.facePayService.getVersion();
      this.paymentResult = {
        success: true,
        error: `SDK Version: ${version?.version || 'Unknown'}`
      };
    } catch (error: any) {
      console.error('Failed to get version:', error);
    }
  }

  toggleDebug() {
    this.debugEnabled = !this.debugEnabled;
    if (this.debugEnabled) {
      this.facePayService.enableDebug();
    }
  }

  async runDiagnostics() {
    try {
      this.debugInfo = {
        sdk: await this.facePayService.getVersion(),
        device: this.deviceInfo,
        support: this.isSupported,
        form: this.paymentForm.value,
        environment: {
          url: window.location.href,
          userAgent: navigator.userAgent
        }
      };
      this.debugEnabled = true;
    } catch (error) {
      console.error('Diagnostics failed:', error);
    }
  }

  isRetryable(error: string): boolean {
    return error.includes('cancelled') || 
           error.includes('timeout') || 
           error.includes('network');
  }

  trackPayment(index: number, payment: any): any {
    return payment.id;
  }
}

// Module (would typically be in a separate file)
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@NgModule({
  declarations: [
    FacePayExampleComponent
  ],
  imports: [
    BrowserModule,
    CommonModule,
    ReactiveFormsModule
  ],
  providers: [
    FacePayService
  ],
  exports: [
    FacePayExampleComponent
  ]
})
export class FacePayModule { }