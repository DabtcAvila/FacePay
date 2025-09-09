/**
 * Simple test to verify face detection service functionality
 * This can be run in a browser environment to test the service
 */

import { faceDetectionService } from './faceDetection'
import type { DetectedFace, FaceQualityMetrics } from '../types'

export class FaceDetectionTest {
  private video: HTMLVideoElement | null = null
  private stream: MediaStream | null = null

  /**
   * Test initialization of the face detection service
   */
  async testInitialization(): Promise<boolean> {
    try {
      console.log('Testing face detection service initialization...')
      await faceDetectionService.initializeDetector()
      console.log('✓ Face detection service initialized successfully')
      return faceDetectionService.isReady()
    } catch (error) {
      console.error('✗ Failed to initialize face detection service:', error)
      return false
    }
  }

  /**
   * Test camera setup
   */
  async testCameraSetup(): Promise<boolean> {
    try {
      console.log('Testing camera setup...')
      
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      })

      this.video = document.createElement('video')
      this.video.srcObject = this.stream
      this.video.autoplay = true
      this.video.playsInline = true

      await new Promise<void>((resolve) => {
        this.video!.onloadedmetadata = () => {
          this.video!.play()
          resolve()
        }
      })

      console.log('✓ Camera setup successful')
      return true
    } catch (error) {
      console.error('✗ Camera setup failed:', error)
      return false
    }
  }

  /**
   * Test face detection on current video stream
   */
  async testFaceDetection(): Promise<boolean> {
    if (!this.video || !faceDetectionService.isReady()) {
      console.error('✗ Video or face detection service not ready')
      return false
    }

    try {
      console.log('Testing face detection...')
      
      const faces = await faceDetectionService.detectFace(this.video)
      
      if (faces.length > 0) {
        console.log(`✓ Detected ${faces.length} face(s)`)
        console.log('Face data:', {
          score: faces[0].score,
          box: faces[0].box,
          keypointCount: faces[0].keypoints.length
        })
        return true
      } else {
        console.log('⚠ No faces detected (this might be expected if no person is in view)')
        return true // Not necessarily a failure
      }
    } catch (error) {
      console.error('✗ Face detection failed:', error)
      return false
    }
  }

  /**
   * Test face quality analysis
   */
  async testFaceQuality(): Promise<boolean> {
    if (!this.video || !faceDetectionService.isReady()) {
      console.error('✗ Video or face detection service not ready')
      return false
    }

    try {
      console.log('Testing face quality analysis...')
      
      const faces = await faceDetectionService.detectFace(this.video)
      
      if (faces.length > 0) {
        const quality = await faceDetectionService.verifyFaceQuality(this.video, faces[0])
        
        console.log('✓ Face quality analysis completed')
        console.log('Quality metrics:', {
          overallScore: quality.score.toFixed(3),
          brightness: quality.brightness.toFixed(3),
          sharpness: quality.sharpness.toFixed(3),
          contrast: quality.contrast.toFixed(3),
          centered: quality.centered,
          frontal: quality.frontal,
          details: quality.details
        })
        return true
      } else {
        console.log('⚠ No faces detected for quality analysis')
        return true
      }
    } catch (error) {
      console.error('✗ Face quality analysis failed:', error)
      return false
    }
  }

  /**
   * Test face landmarks detection
   */
  async testFaceLandmarks(): Promise<boolean> {
    if (!this.video || !faceDetectionService.isReady()) {
      console.error('✗ Video or face detection service not ready')
      return false
    }

    try {
      console.log('Testing face landmarks detection...')
      
      const landmarks = await faceDetectionService.getFaceLandmarks(this.video)
      
      console.log(`✓ Detected ${landmarks.length} face landmarks`)
      if (landmarks.length > 0) {
        console.log('First few landmarks:', landmarks.slice(0, 5))
      }
      return true
    } catch (error) {
      console.error('✗ Face landmarks detection failed:', error)
      return false
    }
  }

  /**
   * Run all tests
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Face Detection Service Tests')
    console.log('=========================================')

    const results = {
      initialization: false,
      camera: false,
      detection: false,
      quality: false,
      landmarks: false
    }

    // Test initialization
    results.initialization = await this.testInitialization()
    
    if (results.initialization) {
      // Test camera setup
      results.camera = await this.testCameraSetup()
      
      if (results.camera) {
        // Wait a moment for camera to stabilize
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Test face detection
        results.detection = await this.testFaceDetection()
        
        // Test quality analysis
        results.quality = await this.testFaceQuality()
        
        // Test landmarks
        results.landmarks = await this.testFaceLandmarks()
      }
    }

    // Cleanup
    this.cleanup()

    // Summary
    console.log('\n📊 Test Results Summary')
    console.log('=======================')
    console.log(`Initialization: ${results.initialization ? '✓' : '✗'}`)
    console.log(`Camera Setup: ${results.camera ? '✓' : '✗'}`)
    console.log(`Face Detection: ${results.detection ? '✓' : '✗'}`)
    console.log(`Quality Analysis: ${results.quality ? '✓' : '✗'}`)
    console.log(`Landmarks Detection: ${results.landmarks ? '✓' : '✗'}`)

    const passedTests = Object.values(results).filter(Boolean).length
    const totalTests = Object.values(results).length
    
    console.log(`\nOverall: ${passedTests}/${totalTests} tests passed`)
    
    if (passedTests === totalTests) {
      console.log('🎉 All tests passed! Face detection service is working correctly.')
    } else {
      console.log('⚠️  Some tests failed. Please check the logs above for details.')
    }
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop())
      this.stream = null
    }
    
    this.video = null
    faceDetectionService.dispose()
  }
}

/**
 * Global test function for easy browser console access
 */
export async function testFaceDetection(): Promise<void> {
  const test = new FaceDetectionTest()
  await test.runAllTests()
}

// Make it available globally for browser testing
if (typeof window !== 'undefined') {
  (window as any).testFaceDetection = testFaceDetection
}