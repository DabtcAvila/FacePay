# Face Detection Service Documentation

## Overview

The Face Detection Service provides real-time facial detection and analysis capabilities using TensorFlow.js models. It's designed for production use in the FacePay application for biometric authentication and face recognition.

## Features

- **Real-time face detection** from video streams
- **Face quality assessment** for authentication purposes
- **Facial landmark detection** with 68+ key points
- **Production-ready error handling** with recovery mechanisms
- **Configurable quality thresholds** for different use cases
- **Performance monitoring** and optimization
- **Cross-platform compatibility** (Web, Mobile web)

## Architecture

### Core Components

1. **FaceDetectionService** (`src/services/faceDetection.ts`)
   - Main service class with detection capabilities
   - Handles model initialization and management
   - Provides quality analysis and landmark detection

2. **Configuration** (`src/services/faceDetectionConfig.ts`)
   - Centralized configuration for all detection parameters
   - Device capability detection
   - Performance monitoring utilities

3. **Examples** (`src/services/faceDetectionExample.ts`)
   - Complete usage examples and patterns
   - Integration helpers and utilities
   - Best practices implementation

4. **Types** (`src/types/index.ts`)
   - TypeScript interfaces for type safety
   - Comprehensive type definitions

### Technology Stack

- **TensorFlow.js** - Core ML framework
- **@tensorflow-models/face-detection** - Face detection models
- **@tensorflow-models/face-landmarks-detection** - Facial landmarks
- **MediaPipe** - High-performance face detection backend
- **WebGL/CPU** - Hardware acceleration when available

## Quick Start

### Basic Setup

```typescript
import { faceDetectionService } from '@/services/faceDetection'

// Initialize the service
await faceDetectionService.initializeDetector()

// Setup camera
const stream = await navigator.mediaDevices.getUserMedia({
  video: { facingMode: 'user' }
})
const video = document.createElement('video')
video.srcObject = stream
await video.play()

// Detect faces
const faces = await faceDetectionService.detectFace(video)
console.log(`Detected ${faces.length} faces`)
```

### Quality Assessment

```typescript
// Analyze face quality for authentication
const quality = await faceDetectionService.verifyFaceQuality(video)

if (quality.score > 0.7) {
  console.log('Face quality suitable for authentication')
  console.log('Quality details:', quality.details)
} else {
  console.log('Please improve face positioning or lighting')
}
```

### Continuous Detection

```typescript
import { startContinuousDetection } from '@/services/faceDetectionExample'

const stopDetection = startContinuousDetection(
  video,
  (faces, quality) => {
    // Handle detected faces
    if (faces.length > 0) {
      updateUI(faces[0], quality)
    }
  },
  (error) => {
    // Handle errors
    console.error('Detection error:', error.message)
  }
)

// Stop detection when done
stopDetection()
```

## API Reference

### FaceDetectionService

#### Methods

##### `initializeDetector(): Promise<void>`
Initializes TensorFlow.js models and prepares the service for use.

**Throws:** `FaceDetectionError` if initialization fails

##### `detectFace(input, options?): Promise<DetectedFace[]>`
Detects faces in video or image input.

**Parameters:**
- `input`: HTMLVideoElement | HTMLImageElement | ImageData
- `options`: Partial<FaceDetectionOptions> (optional)

**Returns:** Array of detected faces with bounding boxes and keypoints

##### `verifyFaceQuality(input, face?): Promise<FaceQualityMetrics>`
Analyzes face quality for authentication purposes.

**Parameters:**
- `input`: HTMLVideoElement | HTMLImageElement
- `face`: DetectedFace (optional, will detect if not provided)

**Returns:** Quality metrics including score, brightness, sharpness, etc.

##### `getFaceLandmarks(input): Promise<FaceLandmark[]>`
Extracts detailed facial landmarks.

**Parameters:**
- `input`: HTMLVideoElement | HTMLImageElement

**Returns:** Array of facial landmark points

##### `isReady(): boolean`
Checks if service is initialized and ready for use.

##### `dispose(): void`
Cleans up resources and models.

### Configuration

#### Quality Profiles

- **AUTHENTICATION**: Strict quality for login (score > 0.70)
- **ENROLLMENT**: Very strict for face registration (score > 0.85)
- **DEMO**: Relaxed for testing purposes (score > 0.40)

```typescript
import { getQualityProfile } from '@/services/faceDetectionConfig'

const authThresholds = getQualityProfile('AUTHENTICATION')
```

#### Device Capabilities

```typescript
import { getDeviceCapabilities } from '@/services/faceDetectionConfig'

const capabilities = getDeviceCapabilities()
if (capabilities.hasWebGL) {
  // Use optimized settings
}
```

## Error Handling

The service provides comprehensive error handling with recovery suggestions:

```typescript
try {
  const faces = await faceDetectionService.detectFace(video)
} catch (error) {
  if (error.code === 'NO_FACE_DETECTED') {
    showMessage('Please position your face in the camera view')
  } else if (error.code === 'POOR_QUALITY') {
    showMessage('Please improve lighting and face positioning')
  } else if (error.isRecoverable) {
    showMessage(`${error.message}. ${error.suggestedAction}`)
  } else {
    // Fatal error - redirect to fallback
    handleFatalError(error)
  }
}
```

## Performance Optimization

### Best Practices

1. **Initialize once** - Call `initializeDetector()` only once per session
2. **Use appropriate intervals** - Don't run detection too frequently
3. **Leverage WebGL** - Ensure WebGL is available for better performance
4. **Optimize video resolution** - Use 640x480 for real-time detection
5. **Clean up resources** - Always call `dispose()` when done

### Performance Monitoring

```typescript
import { PerformanceMonitor } from '@/services/faceDetectionConfig'

PerformanceMonitor.startTiming('face-detection')
const faces = await faceDetectionService.detectFace(video)
const duration = PerformanceMonitor.endTiming('face-detection')

console.log(`Detection took ${duration.toFixed(2)}ms`)
```

## Integration Examples

### Authentication Flow

```typescript
import { authenticateWithFace } from '@/services/faceDetectionExample'

const result = await authenticateWithFace(video)
if (result.success) {
  // Proceed with authentication
  proceedToLogin(result.confidence)
} else {
  // Show error message
  showError(result.error)
}
```

### Face Enrollment

```typescript
import { enrollFace } from '@/services/faceDetectionExample'

const result = await enrollFace(video)
if (result.success) {
  // Save biometric template
  await saveUserBiometricData(userId, result.template)
} else {
  showError(result.error)
}
```

### React Component Integration

```tsx
import { useEffect, useRef, useState } from 'react'
import { FaceDetectionComponent } from '@/services/faceDetectionExample'

export function FaceDetectionDemo() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [detector] = useState(new FaceDetectionComponent())
  const [faces, setFaces] = useState<DetectedFace[]>([])

  useEffect(() => {
    const initDetection = async () => {
      if (videoRef.current && canvasRef.current) {
        await detector.initialize(videoRef.current, canvasRef.current)
        detector.startDetection(
          (detectedFaces, quality) => {
            setFaces(detectedFaces)
            // Update UI with quality feedback
          },
          (error) => {
            console.error('Detection error:', error)
          }
        )
      }
    }

    initDetection()

    return () => {
      detector.cleanup()
    }
  }, [])

  return (
    <div className="face-detection-demo">
      <video ref={videoRef} autoPlay playsInline />
      <canvas ref={canvasRef} className="overlay-canvas" />
      <div className="face-count">
        Detected faces: {faces.length}
      </div>
    </div>
  )
}
```

## Testing

### Browser Console Testing

```javascript
// Available globally for testing
await testFaceDetection()
```

### Manual Testing

```typescript
import { FaceDetectionTest } from '@/services/faceDetectionTest'

const test = new FaceDetectionTest()
await test.runAllTests()
```

## Troubleshooting

### Common Issues

1. **Models fail to load**
   - Check network connectivity
   - Ensure TensorFlow.js dependencies are installed
   - Verify WebGL support

2. **Camera access denied**
   - Ensure HTTPS is used (required for camera access)
   - Check browser permissions
   - Verify camera is not in use by another application

3. **Poor detection accuracy**
   - Improve lighting conditions
   - Ensure face is properly positioned
   - Check camera resolution and focus

4. **Performance issues**
   - Reduce detection frequency
   - Lower video resolution
   - Ensure WebGL is available
   - Close other resource-intensive applications

### Browser Compatibility

- **Chrome/Edge**: Full support with WebGL acceleration
- **Firefox**: Full support with WebGL acceleration  
- **Safari**: Full support (iOS 11+ required)
- **Mobile browsers**: Supported with reduced performance

## Security Considerations

1. **Biometric data handling**: Templates are encrypted and never store raw images
2. **Camera permissions**: Always request explicit user consent
3. **HTTPS requirement**: Camera access requires secure contexts
4. **Data storage**: Follow GDPR/privacy regulations for biometric data
5. **Model integrity**: Models are loaded from trusted sources only

## Future Enhancements

- **Emotion detection**: Analyze facial expressions
- **Age/gender estimation**: Additional demographic analysis
- **Anti-spoofing**: Liveness detection for security
- **Multi-face tracking**: Simultaneous tracking of multiple faces
- **Custom model training**: Domain-specific model fine-tuning

## Support

For issues, questions, or contributions:

1. Check the troubleshooting section above
2. Review the example implementations
3. Test with the provided test utilities
4. Consult TensorFlow.js documentation for model-specific issues

## License

This face detection service is part of the FacePay project and follows the same MIT license terms.