/**
 * Example usage of FaceDetectionService
 * This file demonstrates how to properly use the face detection service
 * for real-time face detection and quality verification.
 */

import { faceDetectionService, FaceDetectionService } from './faceDetection'
import type { 
  DetectedFace, 
  FaceQualityMetrics, 
  FaceDetectionError 
} from '../types'

/**
 * Initialize face detection with error handling
 */
export async function initializeFaceDetection(): Promise<boolean> {
  try {
    await faceDetectionService.initializeDetector()
    console.log('Face detection service initialized successfully')
    return true
  } catch (error) {
    console.error('Failed to initialize face detection:', error)
    return false
  }
}

/**
 * Example: Real-time face detection from webcam
 */
export async function setupWebcamDetection(): Promise<{
  video: HTMLVideoElement | null
  stream: MediaStream | null
  error?: string
}> {
  try {
    // Request camera access
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user' // Front camera
      },
      audio: false
    })

    // Create video element
    const video = document.createElement('video')
    video.srcObject = stream
    video.autoplay = true
    video.playsInline = true
    
    // Wait for video to be ready
    await new Promise<void>((resolve) => {
      video.onloadedmetadata = () => {
        video.play()
        resolve()
      }
    })

    return { video, stream }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to access camera'
    console.error('Camera setup failed:', errorMessage)
    return { 
      video: null, 
      stream: null, 
      error: errorMessage 
    }
  }
}

/**
 * Example: Continuous face detection loop
 */
export function startContinuousDetection(
  video: HTMLVideoElement,
  onDetection: (faces: DetectedFace[], quality?: FaceQualityMetrics) => void,
  onError: (error: FaceDetectionError) => void,
  intervalMs: number = 100
): () => void {
  let isRunning = true
  
  const detectLoop = async () => {
    if (!isRunning || video.readyState !== 4) {
      if (isRunning) {
        setTimeout(detectLoop, intervalMs)
      }
      return
    }

    try {
      // Detect faces
      const faces = await faceDetectionService.detectFace(video)
      
      if (faces.length > 0) {
        // Analyze quality for the first face
        const quality = await faceDetectionService.verifyFaceQuality(video, faces[0])
        onDetection(faces, quality)
      } else {
        onDetection([])
      }
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        onError(error as FaceDetectionError)
      } else {
        onError({
          code: 'PROCESSING_ERROR',
          message: 'Unexpected error during detection',
          isRecoverable: true,
          suggestedAction: 'Please try again'
        })
      }
    }

    // Schedule next detection
    if (isRunning) {
      setTimeout(detectLoop, intervalMs)
    }
  }

  // Start the loop
  detectLoop()

  // Return stop function
  return () => {
    isRunning = false
  }
}

/**
 * Example: Face authentication workflow
 */
export async function authenticateWithFace(video: HTMLVideoElement): Promise<{
  success: boolean
  confidence?: number
  quality?: FaceQualityMetrics
  error?: string
}> {
  try {
    // Step 1: Detect face
    const faces = await faceDetectionService.detectFace(video, {
      maxFaces: 1,
      scoreThreshold: 0.7 // Higher threshold for authentication
    })

    if (faces.length === 0) {
      return {
        success: false,
        error: 'No face detected. Please position your face in the camera view.'
      }
    }

    // Step 2: Verify quality
    const quality = await faceDetectionService.verifyFaceQuality(video, faces[0])
    
    // Check if quality meets authentication standards
    const minQualityThreshold = 0.7
    if (quality.score < minQualityThreshold) {
      return {
        success: false,
        quality,
        error: getQualityFeedback(quality)
      }
    }

    // Step 3: Get detailed landmarks for template matching
    const landmarks = await faceDetectionService.getFaceLandmarks(video)

    // In a real implementation, you would:
    // - Compare landmarks against stored biometric template
    // - Calculate similarity score
    // - Verify against user's stored face data

    return {
      success: true,
      confidence: faces[0].score,
      quality
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Authentication failed'
    return {
      success: false,
      error: errorMessage
    }
  }
}

/**
 * Example: Face enrollment workflow
 */
export async function enrollFace(video: HTMLVideoElement): Promise<{
  success: boolean
  template?: string // Base64 encoded biometric template
  quality?: FaceQualityMetrics
  error?: string
}> {
  try {
    // Step 1: Ensure high quality capture
    const faces = await faceDetectionService.detectFace(video, {
      maxFaces: 1,
      scoreThreshold: 0.8 // Very high threshold for enrollment
    })

    if (faces.length === 0) {
      return {
        success: false,
        error: 'No face detected for enrollment'
      }
    }

    // Step 2: Strict quality verification
    const quality = await faceDetectionService.verifyFaceQuality(video, faces[0])
    
    const minEnrollmentQuality = 0.85 // Very high quality required for enrollment
    if (quality.score < minEnrollmentQuality) {
      return {
        success: false,
        quality,
        error: `Face quality too low for enrollment. ${getQualityFeedback(quality)}`
      }
    }

    // Step 3: Extract detailed landmarks
    const landmarks = await faceDetectionService.getFaceLandmarks(video)

    // Step 4: Create biometric template
    // In a real implementation, you would:
    // - Extract face embedding using face recognition model
    // - Create encrypted biometric template
    // - Store securely with user data
    
    const mockTemplate = btoa(JSON.stringify({
      landmarks: landmarks.slice(0, 68), // Key landmarks only
      faceBox: faces[0].box,
      quality: quality.score,
      timestamp: Date.now()
    }))

    return {
      success: true,
      template: mockTemplate,
      quality
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Enrollment failed'
    return {
      success: false,
      error: errorMessage
    }
  }
}

/**
 * Helper: Generate user-friendly quality feedback
 */
function getQualityFeedback(quality: FaceQualityMetrics): string {
  const issues: string[] = []

  if (quality.details.lighting === 'poor') {
    issues.push('Improve lighting - ensure your face is well-lit')
  }

  if (quality.details.position === 'off-center') {
    issues.push('Center your face in the camera view')
  }

  if (quality.details.angle !== 'frontal') {
    issues.push('Look directly at the camera')
  }

  if (quality.details.size === 'too-small') {
    issues.push('Move closer to the camera')
  } else if (quality.details.size === 'too-large') {
    issues.push('Move further from the camera')
  }

  if (!quality.eyesOpen) {
    issues.push('Keep your eyes open')
  }

  if (quality.sharpness < 0.4) {
    issues.push('Hold still to reduce blur')
  }

  return issues.length > 0 
    ? issues.join('. ') + '.'
    : 'Face quality is good'
}

/**
 * Example: Complete face detection component setup
 */
export class FaceDetectionComponent {
  private video: HTMLVideoElement | null = null
  private stream: MediaStream | null = null
  private stopDetection: (() => void) | null = null
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null

  async initialize(videoElement: HTMLVideoElement, canvasElement?: HTMLCanvasElement): Promise<boolean> {
    try {
      // Initialize service
      const serviceReady = await initializeFaceDetection()
      if (!serviceReady) return false

      // Setup camera
      const { video, stream, error } = await setupWebcamDetection()
      if (error || !video || !stream) {
        console.error('Camera setup failed:', error)
        return false
      }

      this.video = video
      this.stream = stream

      // Copy video stream to provided video element
      videoElement.srcObject = stream

      // Setup canvas for visualization
      if (canvasElement) {
        this.canvas = canvasElement
        this.ctx = canvasElement.getContext('2d')
      }

      return true
    } catch (error) {
      console.error('Initialization failed:', error)
      return false
    }
  }

  startDetection(
    onResults: (faces: DetectedFace[], quality?: FaceQualityMetrics) => void,
    onError: (error: FaceDetectionError) => void
  ) {
    if (!this.video) return

    this.stopDetection = startContinuousDetection(
      this.video,
      (faces, quality) => {
        // Draw visualization if canvas available
        this.drawVisualization(faces)
        onResults(faces, quality)
      },
      onError
    )
  }

  stopDetectionLoop() {
    if (this.stopDetection) {
      this.stopDetection()
      this.stopDetection = null
    }
  }

  private drawVisualization(faces: DetectedFace[]) {
    if (!this.canvas || !this.ctx || !this.video) return

    const { videoWidth, videoHeight } = this.video
    this.canvas.width = videoWidth
    this.canvas.height = videoHeight

    // Clear canvas
    this.ctx.clearRect(0, 0, videoWidth, videoHeight)

    // Draw face boxes and keypoints
    faces.forEach(face => {
      const { box, keypoints } = face

      // Draw bounding box
      this.ctx.strokeStyle = '#00ff00'
      this.ctx.lineWidth = 2
      this.ctx.strokeRect(box.xMin, box.yMin, box.width, box.height)

      // Draw keypoints
      this.ctx.fillStyle = '#ff0000'
      keypoints.forEach(point => {
        this.ctx.beginPath()
        this.ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI)
        this.ctx.fill()
      })
    })
  }

  cleanup() {
    this.stopDetectionLoop()

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop())
      this.stream = null
    }

    this.video = null
    this.canvas = null
    this.ctx = null

    faceDetectionService.dispose()
  }
}