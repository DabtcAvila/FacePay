'use client';

import { sleep } from '@/lib/utils';

export interface FaceDetectionResult {
  isDetected: boolean;
  confidence: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  landmarks?: {
    leftEye: { x: number; y: number };
    rightEye: { x: number; y: number };
    nose: { x: number; y: number };
    mouth: { x: number; y: number };
  };
  quality?: {
    brightness: number;
    sharpness: number;
    headPose: {
      yaw: number;
      pitch: number;
      roll: number;
    };
  };
}

export interface FaceEnrollmentResult {
  success: boolean;
  userId: string;
  template: string;
  confidence: number;
  error?: string;
}

export interface FaceVerificationResult {
  success: boolean;
  isMatch: boolean;
  confidence: number;
  userId?: string;
  timestamp: Date;
  error?: string;
}

export interface RealFaceIDConfig {
  minConfidence: number;
  maxAttempts: number;
  timeoutMs: number;
  enableLivenessDetection: boolean;
  requireHighQuality: boolean;
}

export type FaceIDState = 
  | 'idle' 
  | 'initializing' 
  | 'detecting' 
  | 'enrolling' 
  | 'verifying' 
  | 'processing' 
  | 'complete' 
  | 'error';

export type FaceIDError = 
  | 'CAMERA_ACCESS_DENIED'
  | 'NO_FACE_DETECTED'
  | 'MULTIPLE_FACES_DETECTED'
  | 'LOW_CONFIDENCE'
  | 'POOR_IMAGE_QUALITY'
  | 'LIVENESS_CHECK_FAILED'
  | 'TIMEOUT'
  | 'USER_NOT_ENROLLED'
  | 'TEMPLATE_CORRUPTED'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

interface StoredFaceTemplate {
  userId: string;
  template: string;
  enrollmentDate: Date;
  confidence: number;
  metadata: {
    deviceInfo: string;
    userAgent: string;
    enrollmentAttempts: number;
  };
}

class RealFaceIDService {
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private mediaStream: MediaStream | null = null;
  private isInitialized = false;
  private detectionInterval: NodeJS.Timeout | null = null;
  
  private readonly config: RealFaceIDConfig = {
    minConfidence: 0.85,
    maxAttempts: 3,
    timeoutMs: 30000,
    enableLivenessDetection: true,
    requireHighQuality: true
  };

  private readonly STORAGE_KEY = 'facepay_face_templates';

  constructor() {
    this.createCanvas();
  }

  private createCanvas(): void {
    if (typeof window !== 'undefined') {
      this.canvasElement = document.createElement('canvas');
      this.canvasElement.width = 640;
      this.canvasElement.height = 480;
    }
  }

  async initialize(): Promise<boolean> {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera API not supported');
      }

      // Request camera permission
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
          frameRate: { ideal: 30 }
        },
        audio: false
      });

      // Create video element
      this.videoElement = document.createElement('video');
      this.videoElement.srcObject = this.mediaStream;
      this.videoElement.autoplay = true;
      this.videoElement.playsInline = true;
      this.videoElement.muted = true;

      await new Promise<void>((resolve, reject) => {
        if (!this.videoElement) return reject(new Error('Video element not created'));
        
        this.videoElement.onloadedmetadata = () => resolve();
        this.videoElement.onerror = () => reject(new Error('Video loading failed'));
        
        setTimeout(() => reject(new Error('Video loading timeout')), 5000);
      });

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Face ID initialization failed:', error);
      this.cleanup();
      return false;
    }
  }

  async detectFace(): Promise<FaceDetectionResult> {
    if (!this.isInitialized || !this.videoElement || !this.canvasElement) {
      throw new Error('Face ID service not initialized');
    }

    try {
      // Capture current frame
      const context = this.canvasElement.getContext('2d');
      if (!context) throw new Error('Canvas context not available');

      context.drawImage(this.videoElement, 0, 0, this.canvasElement.width, this.canvasElement.height);
      const imageData = context.getImageData(0, 0, this.canvasElement.width, this.canvasElement.height);

      // Simulate face detection (in real implementation, use ML model)
      const mockDetection = await this.simulateFaceDetection(imageData);
      
      return mockDetection;
    } catch (error) {
      console.error('Face detection failed:', error);
      return {
        isDetected: false,
        confidence: 0
      };
    }
  }

  private async simulateFaceDetection(imageData: ImageData): Promise<FaceDetectionResult> {
    // Simulate processing time
    await sleep(200 + Math.random() * 300);

    // Analyze image brightness and complexity for realistic simulation
    const data = imageData.data;
    let brightness = 0;
    let complexity = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      brightness += (r + g + b) / 3;
      
      if (i > 0) {
        const prevR = data[i - 4];
        complexity += Math.abs(r - prevR);
      }
    }

    brightness = brightness / (data.length / 4);
    complexity = complexity / (data.length / 4);

    // Simulate realistic face detection based on image quality
    const hasGoodBrightness = brightness > 50 && brightness < 200;
    const hasGoodComplexity = complexity > 10; // Indicates there are features
    const baseConfidence = hasGoodBrightness && hasGoodComplexity ? 0.9 : 0.6;
    const confidence = Math.max(0.3, baseConfidence + (Math.random() * 0.1 - 0.05));

    if (confidence < 0.5) {
      return {
        isDetected: false,
        confidence
      };
    }

    return {
      isDetected: true,
      confidence,
      boundingBox: {
        x: 180 + Math.random() * 40,
        y: 120 + Math.random() * 40,
        width: 240 + Math.random() * 40,
        height: 280 + Math.random() * 40
      },
      landmarks: {
        leftEye: { x: 250, y: 180 },
        rightEye: { x: 390, y: 180 },
        nose: { x: 320, y: 220 },
        mouth: { x: 320, y: 280 }
      },
      quality: {
        brightness: brightness / 255,
        sharpness: Math.min(1, complexity / 50),
        headPose: {
          yaw: (Math.random() - 0.5) * 20,
          pitch: (Math.random() - 0.5) * 15,
          roll: (Math.random() - 0.5) * 10
        }
      }
    };
  }

  async enrollUser(userId: string, onProgress?: (progress: number) => void): Promise<FaceEnrollmentResult> {
    if (!this.isInitialized) {
      return {
        success: false,
        userId,
        template: '',
        confidence: 0,
        error: 'Service not initialized'
      };
    }

    try {
      let bestDetection: FaceDetectionResult | null = null;
      let attempts = 0;
      const maxAttempts = 10;
      const requiredConfidence = this.config.minConfidence;

      onProgress?.(10);

      while (attempts < maxAttempts && (!bestDetection || bestDetection.confidence < requiredConfidence)) {
        await sleep(500);
        const detection = await this.detectFace();
        
        onProgress?.(20 + (attempts / maxAttempts) * 60);

        if (detection.isDetected && detection.confidence > (bestDetection?.confidence || 0)) {
          bestDetection = detection;
        }

        attempts++;

        if (detection.confidence >= requiredConfidence) break;
      }

      if (!bestDetection || bestDetection.confidence < requiredConfidence) {
        return {
          success: false,
          userId,
          template: '',
          confidence: bestDetection?.confidence || 0,
          error: 'Could not capture suitable face template'
        };
      }

      onProgress?.(85);

      // Generate face template (mock implementation)
      const template = await this.generateFaceTemplate(bestDetection);
      
      // Store template locally
      const storedTemplate: StoredFaceTemplate = {
        userId,
        template,
        enrollmentDate: new Date(),
        confidence: bestDetection.confidence,
        metadata: {
          deviceInfo: navigator.platform,
          userAgent: navigator.userAgent,
          enrollmentAttempts: attempts
        }
      };

      this.storeTemplate(storedTemplate);

      onProgress?.(100);

      return {
        success: true,
        userId,
        template,
        confidence: bestDetection.confidence
      };

    } catch (error) {
      return {
        success: false,
        userId,
        template: '',
        confidence: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async verifyUser(userId: string, onProgress?: (progress: number) => void): Promise<FaceVerificationResult> {
    if (!this.isInitialized) {
      return {
        success: false,
        isMatch: false,
        confidence: 0,
        timestamp: new Date(),
        error: 'Service not initialized'
      };
    }

    try {
      // Check if user is enrolled
      const storedTemplate = this.getStoredTemplate(userId);
      if (!storedTemplate) {
        return {
          success: false,
          isMatch: false,
          confidence: 0,
          timestamp: new Date(),
          error: 'User not enrolled'
        };
      }

      onProgress?.(10);

      let bestDetection: FaceDetectionResult | null = null;
      let attempts = 0;
      const maxAttempts = 5;

      while (attempts < maxAttempts && (!bestDetection || bestDetection.confidence < 0.7)) {
        await sleep(400);
        const detection = await this.detectFace();
        
        onProgress?.(20 + (attempts / maxAttempts) * 50);

        if (detection.isDetected && detection.confidence > (bestDetection?.confidence || 0)) {
          bestDetection = detection;
        }

        attempts++;
        if (detection.confidence >= 0.8) break;
      }

      if (!bestDetection || bestDetection.confidence < 0.7) {
        return {
          success: false,
          isMatch: false,
          confidence: bestDetection?.confidence || 0,
          timestamp: new Date(),
          error: 'Could not detect face clearly'
        };
      }

      onProgress?.(75);

      // Generate template for current detection
      const currentTemplate = await this.generateFaceTemplate(bestDetection);
      
      // Compare with stored template
      const similarity = this.compareTemplates(currentTemplate, storedTemplate.template);
      const isMatch = similarity >= this.config.minConfidence;

      onProgress?.(100);

      return {
        success: true,
        isMatch,
        confidence: similarity,
        userId: isMatch ? userId : undefined,
        timestamp: new Date()
      };

    } catch (error) {
      return {
        success: false,
        isMatch: false,
        confidence: 0,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async generateFaceTemplate(detection: FaceDetectionResult): Promise<string> {
    // Simulate template generation processing time
    await sleep(200);
    
    // In a real implementation, this would be a neural network encoding
    // For simulation, create a deterministic template based on landmarks
    const landmarks = detection.landmarks;
    if (!landmarks) {
      return Math.random().toString(36);
    }

    const template = btoa(JSON.stringify({
      leftEye: landmarks.leftEye,
      rightEye: landmarks.rightEye,
      nose: landmarks.nose,
      mouth: landmarks.mouth,
      confidence: detection.confidence,
      timestamp: Date.now()
    }));

    return template;
  }

  private compareTemplates(template1: string, template2: string): number {
    try {
      const data1 = JSON.parse(atob(template1));
      const data2 = JSON.parse(atob(template2));

      // Calculate similarity based on landmark distances
      const euclideanDistance = (p1: {x: number, y: number}, p2: {x: number, y: number}) => {
        return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
      };

      const leftEyeDist = euclideanDistance(data1.leftEye, data2.leftEye);
      const rightEyeDist = euclideanDistance(data1.rightEye, data2.rightEye);
      const noseDist = euclideanDistance(data1.nose, data2.nose);
      const mouthDist = euclideanDistance(data1.mouth, data2.mouth);

      const avgDistance = (leftEyeDist + rightEyeDist + noseDist + mouthDist) / 4;
      
      // Convert distance to similarity (lower distance = higher similarity)
      const maxExpectedDistance = 50; // pixels
      const similarity = Math.max(0, 1 - (avgDistance / maxExpectedDistance));
      
      return Math.min(0.98, similarity); // Cap at 98% to be realistic
    } catch {
      return Math.random() * 0.5; // Low random similarity if template parsing fails
    }
  }

  private storeTemplate(template: StoredFaceTemplate): void {
    try {
      const existingTemplates = this.getAllStoredTemplates();
      const updatedTemplates = {
        ...existingTemplates,
        [template.userId]: template
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedTemplates));
    } catch (error) {
      console.error('Failed to store face template:', error);
    }
  }

  private getStoredTemplate(userId: string): StoredFaceTemplate | null {
    try {
      const templates = this.getAllStoredTemplates();
      return templates[userId] || null;
    } catch {
      return null;
    }
  }

  private getAllStoredTemplates(): Record<string, StoredFaceTemplate> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  isUserEnrolled(userId: string): boolean {
    return this.getStoredTemplate(userId) !== null;
  }

  async deleteUserTemplate(userId: string): Promise<boolean> {
    try {
      const templates = this.getAllStoredTemplates();
      delete templates[userId];
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(templates));
      return true;
    } catch {
      return false;
    }
  }

  getVideoElement(): HTMLVideoElement | null {
    return this.videoElement;
  }

  cleanup(): void {
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }

    this.isInitialized = false;
  }

  static getErrorMessage(error: FaceIDError): string {
    const errorMessages: Record<FaceIDError, string> = {
      CAMERA_ACCESS_DENIED: 'Camera access denied. Please allow camera permissions.',
      NO_FACE_DETECTED: 'No face detected. Please position your face in the camera.',
      MULTIPLE_FACES_DETECTED: 'Multiple faces detected. Please ensure only one person is visible.',
      LOW_CONFIDENCE: 'Face detection confidence too low. Please improve lighting and positioning.',
      POOR_IMAGE_QUALITY: 'Image quality insufficient. Please ensure good lighting and focus.',
      LIVENESS_CHECK_FAILED: 'Liveness check failed. Please look directly at the camera.',
      TIMEOUT: 'Operation timed out. Please try again.',
      USER_NOT_ENROLLED: 'User not enrolled. Please complete enrollment first.',
      TEMPLATE_CORRUPTED: 'Stored face template corrupted. Please re-enroll.',
      NETWORK_ERROR: 'Network error. Please check your connection.',
      UNKNOWN_ERROR: 'An unknown error occurred. Please try again.'
    };

    return errorMessages[error] || errorMessages.UNKNOWN_ERROR;
  }
}

export const RealFaceID = new RealFaceIDService();