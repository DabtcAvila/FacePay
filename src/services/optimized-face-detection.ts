'use client';

// Optimized TensorFlow.js Face Detection Service for Production
import { getPerformanceMonitor } from '@/lib/performance-monitor';
import { getErrorMonitor } from '@/lib/error-monitor';

// Lazy imports for better performance
let tf: any = null;
let faceDetection: any = null;
let blazeFaceModel: any = null;

interface OptimizedFaceDetectionOptions {
  maxFaces: number;
  flipHorizontal: boolean;
  scoreThreshold: number;
  iouThreshold: number;
  modelType: 'short' | 'full';
  inputResolution: number;
  enableCache: boolean;
}

interface CachedModel {
  model: any;
  timestamp: number;
  size: number;
}

export class OptimizedFaceDetectionService {
  private isInitialized = false;
  private modelCache = new Map<string, CachedModel>();
  private performanceMonitor = getPerformanceMonitor();
  private errorMonitor = getErrorMonitor();
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private webGLContext: WebGLRenderingContext | null = null;
  private useWebGL = true;

  private readonly defaultOptions: OptimizedFaceDetectionOptions = {
    maxFaces: 1,
    flipHorizontal: false,
    scoreThreshold: 0.75,
    iouThreshold: 0.3,
    modelType: 'short', // Smaller, faster model
    inputResolution: 256, // Reduced resolution for better performance
    enableCache: true,
  };

  // Model URLs with CDN fallbacks
  private readonly modelUrls = {
    tfjs: [
      'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.17.0/dist/tf.min.js',
      'https://unpkg.com/@tensorflow/tfjs@4.17.0/dist/tf.min.js',
    ],
    faceDetection: [
      'https://cdn.jsdelivr.net/npm/@tensorflow-models/face-detection@1.0.2/dist/face-detection.min.js',
      'https://unpkg.com/@tensorflow-models/face-detection@1.0.2/dist/face-detection.min.js',
    ],
  };

  async initializeDetector(): Promise<void> {
    if (this.isInitialized) return;

    const startTime = performance.now();
    
    try {
      // Initialize canvas for processing
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d');

      // Try to initialize WebGL for GPU acceleration
      try {
        this.webGLContext = this.canvas.getContext('webgl2') || 
                           this.canvas.getContext('webgl') ||
                           this.canvas.getContext('experimental-webgl') as WebGLRenderingContext;
        this.useWebGL = !!this.webGLContext;
      } catch (error) {
        console.warn('[Face Detection] WebGL not available, falling back to CPU');
        this.useWebGL = false;
      }

      // Load TensorFlow.js with retry logic
      await this.loadTensorFlow();
      
      // Load face detection model
      await this.loadFaceDetectionModel();

      // Configure TensorFlow.js for optimal performance
      await this.optimizeTensorFlowSettings();

      this.isInitialized = true;
      
      const initTime = performance.now() - startTime;
      this.performanceMonitor.measureAsyncOperation('face-detection-init', async () => {
        return Promise.resolve();
      });

      console.log(`[Face Detection] Initialized successfully in ${initTime.toFixed(2)}ms`);
      
    } catch (error) {
      const errorMsg = `Failed to initialize face detection: ${error}`;
      this.errorMonitor.logError({
        message: errorMsg,
        stack: (error as Error).stack,
        url: window.location.href,
        timestamp: Date.now(),
        type: 'error',
        component: 'OptimizedFaceDetectionService',
      });
      
      throw new Error(errorMsg);
    }
  }

  private async loadTensorFlow(): Promise<void> {
    if (tf) return; // Already loaded

    // Try to load from global if already available
    if (typeof window !== 'undefined' && (window as any).tf) {
      tf = (window as any).tf;
      return;
    }

    // Load dynamically with fallbacks
    for (const url of this.modelUrls.tfjs) {
      try {
        await this.loadScript(url);
        if ((window as any).tf) {
          tf = (window as any).tf;
          break;
        }
      } catch (error) {
        console.warn(`[Face Detection] Failed to load TensorFlow.js from ${url}:`, error);
      }
    }

    if (!tf) {
      throw new Error('Failed to load TensorFlow.js from all CDN sources');
    }

    // Wait for TensorFlow to be ready
    await tf.ready();
  }

  private async loadFaceDetectionModel(): Promise<void> {
    if (faceDetection) return; // Already loaded

    // Try to load from global if already available
    if (typeof window !== 'undefined' && (window as any).faceDetection) {
      faceDetection = (window as any).faceDetection;
      return;
    }

    // Load dynamically with fallbacks
    for (const url of this.modelUrls.faceDetection) {
      try {
        await this.loadScript(url);
        if ((window as any).faceDetection) {
          faceDetection = (window as any).faceDetection;
          break;
        }
      } catch (error) {
        console.warn(`[Face Detection] Failed to load face detection from ${url}:`, error);
      }
    }

    if (!faceDetection) {
      throw new Error('Failed to load face detection model from all CDN sources');
    }
  }

  private async optimizeTensorFlowSettings(): Promise<void> {
    if (!tf) return;

    try {
      // Enable production optimizations
      tf.env().set('WEBGL_FORCE_F16_TEXTURES', true);
      tf.env().set('WEBGL_PACK_DEPTHWISECONV', true);
      tf.env().set('WEBGL_PACK_BINARY_OPERATIONS', true);
      tf.env().set('WEBGL_PACK_UNARY_OPERATIONS', true);
      tf.env().set('WEBGL_PACK_ARRAY_OPERATIONS', true);
      tf.env().set('WEBGL_PACK_IMAGE_OPERATIONS', true);
      tf.env().set('WEBGL_PACK_REDUCE', true);
      
      // Memory optimizations
      tf.env().set('WEBGL_DELETE_TEXTURE_THRESHOLD', 0.5);
      tf.env().set('WEBGL_FLUSH_THRESHOLD', 1);
      
      // Use appropriate backend
      if (this.useWebGL) {
        await tf.setBackend('webgl');
      } else {
        await tf.setBackend('cpu');
      }

      await tf.ready();
      
      console.log(`[Face Detection] Using backend: ${tf.getBackend()}`);
      
    } catch (error) {
      console.warn('[Face Detection] Failed to optimize TensorFlow settings:', error);
    }
  }

  private async loadScript(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
      
      // Add timeout
      setTimeout(() => {
        reject(new Error(`Script loading timeout: ${url}`));
      }, 10000);
      
      document.head.appendChild(script);
    });
  }

  async detectFaces(
    videoOrImage: HTMLVideoElement | HTMLImageElement,
    options?: Partial<OptimizedFaceDetectionOptions>
  ): Promise<any[]> {
    if (!this.isInitialized) {
      await this.initializeDetector();
    }

    const finalOptions = { ...this.defaultOptions, ...options };
    const cacheKey = this.getCacheKey(finalOptions);
    
    return this.performanceMonitor.measureAsyncOperation(
      'face-detection',
      async () => {
        try {
          // Get or create model
          const model = await this.getOptimizedModel(finalOptions);
          
          // Preprocess input for optimal performance
          const preprocessedInput = await this.preprocessInput(videoOrImage, finalOptions);
          
          // Run detection with optimizations
          const faces = await this.runOptimizedDetection(model, preprocessedInput, finalOptions);
          
          // Cleanup temporary tensors
          if (preprocessedInput && typeof preprocessedInput.dispose === 'function') {
            preprocessedInput.dispose();
          }
          
          return faces;
          
        } catch (error) {
          this.errorMonitor.logError({
            message: `Face detection failed: ${error}`,
            stack: (error as Error).stack,
            url: window.location.href,
            timestamp: Date.now(),
            type: 'error',
            component: 'OptimizedFaceDetectionService',
          });
          
          throw error;
        }
      }
    );
  }

  private async getOptimizedModel(options: OptimizedFaceDetectionOptions): Promise<any> {
    const cacheKey = this.getCacheKey(options);
    
    // Check cache
    if (options.enableCache && this.modelCache.has(cacheKey)) {
      const cached = this.modelCache.get(cacheKey)!;
      
      // Check if cache is still valid (5 minutes)
      if (Date.now() - cached.timestamp < 5 * 60 * 1000) {
        return cached.model;
      } else {
        // Clean up expired cache
        this.modelCache.delete(cacheKey);
      }
    }

    // Create new model
    const model = await faceDetection.createDetector(
      faceDetection.SupportedModels.MediaPipeFaceDetector,
      {
        runtime: this.useWebGL ? 'tfjs' : 'mediapipe',
        modelType: options.modelType,
        maxFaces: options.maxFaces,
        refineLandmarks: false, // Disable for better performance
        solutionPath: `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection@0.4`,
      }
    );

    // Cache the model
    if (options.enableCache) {
      this.modelCache.set(cacheKey, {
        model,
        timestamp: Date.now(),
        size: this.estimateModelSize(model),
      });

      // Clean up old cache entries
      this.cleanupModelCache();
    }

    return model;
  }

  private async preprocessInput(
    videoOrImage: HTMLVideoElement | HTMLImageElement,
    options: OptimizedFaceDetectionOptions
  ): Promise<any> {
    if (!this.canvas || !this.ctx) {
      throw new Error('Canvas not initialized');
    }

    // Determine input dimensions
    const inputWidth = videoOrImage instanceof HTMLVideoElement 
      ? videoOrImage.videoWidth 
      : videoOrImage.naturalWidth || videoOrImage.width;
    const inputHeight = videoOrImage instanceof HTMLVideoElement 
      ? videoOrImage.videoHeight 
      : videoOrImage.naturalHeight || videoOrImage.height;

    // Calculate optimal processing size
    const { processWidth, processHeight } = this.calculateOptimalSize(
      inputWidth, 
      inputHeight, 
      options.inputResolution
    );

    // Resize canvas
    this.canvas.width = processWidth;
    this.canvas.height = processHeight;

    // Draw and resize image
    this.ctx.drawImage(videoOrImage, 0, 0, processWidth, processHeight);

    // Convert to tensor if using TensorFlow.js backend
    if (this.useWebGL && tf) {
      return tf.browser.fromPixels(this.canvas);
    }

    return this.canvas;
  }

  private calculateOptimalSize(
    originalWidth: number, 
    originalHeight: number, 
    targetResolution: number
  ): { processWidth: number; processHeight: number } {
    const aspectRatio = originalWidth / originalHeight;
    
    let processWidth: number;
    let processHeight: number;
    
    if (aspectRatio > 1) {
      // Landscape
      processWidth = targetResolution;
      processHeight = Math.round(targetResolution / aspectRatio);
    } else {
      // Portrait
      processHeight = targetResolution;
      processWidth = Math.round(targetResolution * aspectRatio);
    }

    // Ensure dimensions are even for better GPU performance
    processWidth = Math.ceil(processWidth / 2) * 2;
    processHeight = Math.ceil(processHeight / 2) * 2;

    return { processWidth, processHeight };
  }

  private async runOptimizedDetection(
    model: any,
    input: any,
    options: OptimizedFaceDetectionOptions
  ): Promise<any[]> {
    const predictions = await model.estimateFaces(input, {
      flipHorizontal: options.flipHorizontal,
      staticImageMode: true, // Better performance for single frames
    });

    // Filter by confidence threshold
    const filteredPredictions = predictions
      .filter((prediction: any) => prediction.score >= options.scoreThreshold)
      .slice(0, options.maxFaces);

    // Apply Non-Maximum Suppression if multiple faces
    if (filteredPredictions.length > 1) {
      return this.applyNMS(filteredPredictions, options.iouThreshold);
    }

    return filteredPredictions;
  }

  private applyNMS(predictions: any[], iouThreshold: number): any[] {
    // Simple NMS implementation
    const sortedPredictions = predictions.sort((a, b) => b.score - a.score);
    const kept: any[] = [];

    for (const prediction of sortedPredictions) {
      let shouldKeep = true;
      
      for (const keptPrediction of kept) {
        const iou = this.calculateIoU(prediction.box, keptPrediction.box);
        if (iou > iouThreshold) {
          shouldKeep = false;
          break;
        }
      }
      
      if (shouldKeep) {
        kept.push(prediction);
      }
    }

    return kept;
  }

  private calculateIoU(box1: any, box2: any): number {
    const x1 = Math.max(box1.xMin, box2.xMin);
    const y1 = Math.max(box1.yMin, box2.yMin);
    const x2 = Math.min(box1.xMax, box2.xMax);
    const y2 = Math.min(box1.yMax, box2.yMax);

    if (x2 <= x1 || y2 <= y1) return 0;

    const intersection = (x2 - x1) * (y2 - y1);
    const area1 = (box1.xMax - box1.xMin) * (box1.yMax - box1.yMin);
    const area2 = (box2.xMax - box2.xMin) * (box2.yMax - box2.yMin);
    const union = area1 + area2 - intersection;

    return union > 0 ? intersection / union : 0;
  }

  private getCacheKey(options: OptimizedFaceDetectionOptions): string {
    return `${options.modelType}-${options.maxFaces}-${options.inputResolution}`;
  }

  private estimateModelSize(model: any): number {
    // Rough estimation - replace with actual implementation if available
    return 1024 * 1024; // 1MB estimation
  }

  private cleanupModelCache(): void {
    const maxCacheSize = 50 * 1024 * 1024; // 50MB limit
    const maxCacheAge = 30 * 60 * 1000; // 30 minutes
    const now = Date.now();

    let totalSize = 0;
    const entries = Array.from(this.modelCache.entries())
      .map(([key, value]) => ({ key, ...value }))
      .sort((a, b) => b.timestamp - a.timestamp);

    for (const entry of entries) {
      if (now - entry.timestamp > maxCacheAge || totalSize + entry.size > maxCacheSize) {
        this.modelCache.delete(entry.key);
      } else {
        totalSize += entry.size;
      }
    }
  }

  // Performance monitoring
  getPerformanceMetrics(): any {
    return {
      isInitialized: this.isInitialized,
      backend: tf ? tf.getBackend() : 'not-loaded',
      webGLSupported: this.useWebGL,
      cacheSize: this.modelCache.size,
      memoryInfo: tf ? tf.memory() : null,
    };
  }

  // Memory management
  async cleanupMemory(): Promise<void> {
    if (tf) {
      // Dispose of unused tensors
      tf.disposeVariables();
      
      // Force garbage collection if available
      if (tf.memory().numTensors > 100) {
        await tf.nextFrame();
        tf.disposeVariables();
      }
    }

    // Clear model cache
    this.modelCache.clear();
  }

  dispose(): void {
    this.cleanupMemory();
    
    // Cleanup canvas
    this.canvas = null;
    this.ctx = null;
    this.webGLContext = null;
    
    this.isInitialized = false;
  }

  isReady(): boolean {
    return this.isInitialized;
  }
}

// Singleton instance
let optimizedFaceDetectionService: OptimizedFaceDetectionService | null = null;

export function getOptimizedFaceDetectionService(): OptimizedFaceDetectionService {
  if (!optimizedFaceDetectionService) {
    optimizedFaceDetectionService = new OptimizedFaceDetectionService();
  }
  return optimizedFaceDetectionService;
}

// Preload models for better UX
export function preloadFaceDetectionModels(): void {
  if (typeof window !== 'undefined') {
    // Preload after page load with delay
    window.addEventListener('load', () => {
      setTimeout(() => {
        const service = getOptimizedFaceDetectionService();
        service.initializeDetector().catch(console.warn);
      }, 2000); // Delay to not interfere with initial page load
    });
  }
}

// Performance budgeting
export const FACE_DETECTION_PERFORMANCE_BUDGET = {
  initializationTime: 3000, // 3 seconds max
  detectionTime: 100, // 100ms max per frame
  memoryUsage: 100 * 1024 * 1024, // 100MB max
  cacheSize: 50 * 1024 * 1024, // 50MB max
};

export default OptimizedFaceDetectionService;