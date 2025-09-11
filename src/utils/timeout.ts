'use client';

/**
 * Custom TimeoutError class for timeout-related errors
 */
export class TimeoutError extends Error {
  readonly name = 'TimeoutError';
  readonly isTimeout = true;
  
  constructor(message: string, public readonly operation: string, public readonly timeout: number) {
    super(message);
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

/**
 * Wraps a promise with a timeout, throwing TimeoutError if the promise doesn't resolve in time
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  errorMessage: string,
  operation: string = 'operation'
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new TimeoutError(errorMessage, operation, ms));
    }, ms);

    promise
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

/**
 * Creates a cancellable timeout that can be cleared before it fires
 */
export class CancellableTimeout {
  private timeoutId: NodeJS.Timeout | null = null;
  private cancelled = false;

  constructor(
    private callback: () => void,
    private delay: number
  ) {}

  start(): void {
    if (this.cancelled) return;
    
    this.timeoutId = setTimeout(() => {
      if (!this.cancelled) {
        this.callback();
      }
    }, this.delay);
  }

  cancel(): void {
    this.cancelled = true;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  get isCancelled(): boolean {
    return this.cancelled;
  }
}

/**
 * Creates a promise that can be cancelled using an AbortSignal
 */
export function withAbortSignal<T>(
  promise: Promise<T>,
  signal?: AbortSignal
): Promise<T> {
  if (!signal) return promise;

  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new Error('Operation was aborted'));
      return;
    }

    const abortListener = () => {
      reject(new Error('Operation was aborted'));
    };

    signal.addEventListener('abort', abortListener);

    promise
      .then(resolve, reject)
      .finally(() => {
        signal.removeEventListener('abort', abortListener);
      });
  });
}

/**
 * Creates a promise with both timeout and abort signal support
 */
export function withTimeoutAndAbort<T>(
  promise: Promise<T>,
  ms: number,
  errorMessage: string,
  signal?: AbortSignal,
  operation: string = 'operation'
): Promise<T> {
  const timeoutPromise = withTimeout(promise, ms, errorMessage, operation);
  return withAbortSignal(timeoutPromise, signal);
}

/**
 * Exponential backoff retry mechanism with timeout
 */
export async function retryWithTimeout<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    timeoutMs: number;
    backoffMultiplier?: number;
    shouldRetry?: (error: any) => boolean;
    onRetry?: (attempt: number, error: any) => void;
  }
): Promise<T> {
  const {
    maxRetries,
    baseDelay,
    maxDelay,
    timeoutMs,
    backoffMultiplier = 2,
    shouldRetry = () => true,
    onRetry
  } = options;

  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await withTimeout(
        fn(),
        timeoutMs,
        `Operation timed out after ${timeoutMs}ms (attempt ${attempt + 1}/${maxRetries + 1})`,
        'retry-operation'
      );
    } catch (error) {
      lastError = error;

      // Don't retry on timeout errors or if shouldRetry returns false
      if (error instanceof TimeoutError || !shouldRetry(error)) {
        throw error;
      }

      // Don't wait after the last attempt
      if (attempt < maxRetries) {
        const delay = Math.min(baseDelay * Math.pow(backoffMultiplier, attempt), maxDelay);
        onRetry?.(attempt + 1, error);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Creates a progress callback that updates based on elapsed time
 */
export function createProgressCallback(
  duration: number,
  onProgress: (progress: number) => void,
  signal?: AbortSignal
): CancellableTimeout {
  const startTime = Date.now();
  let animationFrame: number;

  const updateProgress = () => {
    if (signal?.aborted) return;

    const elapsed = Date.now() - startTime;
    const progress = Math.min((elapsed / duration) * 100, 100);
    onProgress(progress);

    if (progress < 100) {
      animationFrame = requestAnimationFrame(updateProgress);
    }
  };

  // Start the animation
  animationFrame = requestAnimationFrame(updateProgress);

  return new CancellableTimeout(() => {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
    }
  }, duration);
}

/**
 * Common timeout constants for different operations
 */
export const TIMEOUTS = {
  CAMERA_INIT: 5000,           // 5 seconds for camera initialization
  WEBAUTHN_OPERATION: 30000,   // 30 seconds for WebAuthn operations
  FACE_DETECTION: 10000,       // 10 seconds for face detection
  API_CALL: 10000,            // 10 seconds for API calls
  ANIMATION: 2000,            // 2 seconds for animation transitions
  QUICK_OPERATION: 3000,      // 3 seconds for quick operations
  LONG_OPERATION: 60000,      // 1 minute for long operations
  TAKING_LONGER_THRESHOLD: 3000 // Show "taking longer" message after 3 seconds
} as const;

/**
 * Creates a timeout handler with user-friendly UI feedback
 */
export class TimeoutHandler {
  private abortController: AbortController | null = null;
  private takingLongerTimeout: CancellableTimeout | null = null;
  private progressAnimation: CancellableTimeout | null = null;

  constructor(
    private onTakingLonger: () => void,
    private onProgress?: (progress: number) => void,
    private onCancel?: () => void
  ) {}

  async execute<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    errorMessage: string,
    operationName: string = 'operation'
  ): Promise<T> {
    this.abortController = new AbortController();
    
    // Set up "taking longer than expected" message
    this.takingLongerTimeout = new CancellableTimeout(
      this.onTakingLonger,
      TIMEOUTS.TAKING_LONGER_THRESHOLD
    );
    this.takingLongerTimeout.start();

    // Set up progress animation if callback provided
    if (this.onProgress) {
      this.progressAnimation = createProgressCallback(
        timeoutMs,
        this.onProgress,
        this.abortController.signal
      );
    }

    try {
      return await withTimeoutAndAbort(
        operation(),
        timeoutMs,
        errorMessage,
        this.abortController.signal,
        operationName
      );
    } finally {
      this.cleanup();
    }
  }

  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.onCancel?.();
    this.cleanup();
  }

  private cleanup(): void {
    this.takingLongerTimeout?.cancel();
    this.progressAnimation?.cancel();
    this.abortController = null;
    this.takingLongerTimeout = null;
    this.progressAnimation = null;
  }
}

/**
 * Utility function to check if an error is a timeout error
 */
export function isTimeoutError(error: any): error is TimeoutError {
  return error instanceof TimeoutError || error?.name === 'TimeoutError' || error?.isTimeout === true;
}

/**
 * Utility function to get a user-friendly timeout message
 */
export function getTimeoutMessage(operation: string, timeout: number): string {
  const seconds = Math.round(timeout / 1000);
  return `${operation} is taking longer than expected (${seconds}s). You can cancel or wait for it to complete.`;
}