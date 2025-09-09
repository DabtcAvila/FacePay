# Face Verification Service

A comprehensive, secure facial verification service for the FacePay application that provides face enrollment, verification, and secure biometric data management.

## Features

### 🔐 Security & Privacy
- **Encrypted Storage**: All face embeddings are encrypted using AES-256-GCM before storage
- **Anti-Spoofing**: Basic anti-spoofing detection to prevent photo/video attacks
- **Rate Limiting**: Configurable attempt limits and time windows
- **Risk Scoring**: Multi-factor risk assessment for each verification attempt
- **Secure Logging**: Comprehensive audit trail of all enrollment and verification attempts

### 🎯 Core Functionality
- **Face Enrollment**: Register new face embeddings with quality validation
- **Face Verification**: 1:1 face matching with configurable confidence thresholds
- **Embedding Management**: Secure storage and retrieval of face embeddings
- **Quality Assessment**: Image quality validation before processing
- **Similarity Calculation**: Cosine similarity-based face comparison

### ⚙️ Configuration
- **Configurable Thresholds**: Adjust confidence and quality requirements
- **Flexible Security**: Enable/disable various security features
- **Performance Tuning**: Configurable processing parameters

## API Usage

### Face Enrollment

```typescript
import { faceVerificationService } from '@/services/faceVerification'

const result = await faceVerificationService.enrollFace(
  userId: string,
  imageData: string | Buffer,
  replaceExisting: boolean = false
)
```

**Response:**
```typescript
{
  success: boolean
  embeddingId: string
  quality: number
  message: string
  metadata?: {
    processingTime: number
    imageQuality: number
  }
}
```

### Face Verification

```typescript
const result = await faceVerificationService.verifyFace(
  imageData: string | Buffer,
  storedEmbeddingId?: string,
  requestMetadata?: {
    ipAddress?: string
    userAgent?: string
  }
)
```

**Response:**
```typescript
{
  success: boolean
  confidence: number
  userId?: string
  attemptId: string
  riskScore: number
  message: string
  metadata?: {
    processingTime: number
    qualityScore: number
    antiSpoofingPassed: boolean
  }
}
```

## Configuration Options

```typescript
interface FaceVerificationConfig {
  confidenceThreshold: number      // Minimum confidence for successful verification (0-1)
  maxAttempts: number             // Maximum attempts per time window
  attemptWindowMinutes: number    // Time window for rate limiting
  enableLogging: boolean          // Enable verification attempt logging
  qualityThreshold: number        // Minimum image quality for enrollment (0-1)
  antiSpoofingEnabled: boolean    // Enable anti-spoofing checks
}
```

**Default Configuration:**
```typescript
{
  confidenceThreshold: 0.85,
  maxAttempts: 5,
  attemptWindowMinutes: 15,
  enableLogging: true,
  qualityThreshold: 0.7,
  antiSpoofingEnabled: true
}
```

## API Endpoints

### POST /api/biometric/face
Enroll a new face embedding

**Request:**
```json
{
  "imageData": "data:image/jpeg;base64,/9j/4AAQSkZJRgABA...",
  "replaceExisting": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "embeddingId": "uuid-string",
    "quality": 0.92,
    "metadata": {
      "processingTime": 234,
      "imageQuality": 0.92
    }
  },
  "message": "Face enrolled successfully"
}
```

### PUT /api/biometric/face
Verify a face against stored embeddings

**Request:**
```json
{
  "imageData": "data:image/jpeg;base64,/9j/4AAQSkZJRgABA...",
  "threshold": 0.85,
  "embeddingId": "optional-specific-embedding-id"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "verified": true,
    "confidence": 0.94,
    "userId": "user-id",
    "attemptId": "attempt-uuid",
    "riskScore": 0.1,
    "metadata": {
      "processingTime": 156,
      "qualityScore": 0.89,
      "antiSpoofingPassed": true
    }
  },
  "message": "Face verified successfully"
}
```

## Security Features

### Encryption
- Face embeddings are encrypted using AES-256-GCM before database storage
- Each embedding has unique initialization vectors and authentication tags
- Encryption keys are managed through environment variables

### Anti-Spoofing
- Basic compression artifact detection
- Color distribution analysis
- Image quality assessment
- Configurable security thresholds

### Rate Limiting
- IP-based attempt tracking
- Configurable attempt windows
- Progressive risk scoring

### Risk Assessment
Multiple factors contribute to risk scoring:
- Verification confidence levels
- Anti-spoofing check results
- Rate limiting violations
- Historical attempt patterns

## Production Considerations

### Required Dependencies
For production use, you should integrate with proper face recognition libraries:

```bash
# Example libraries (choose based on requirements)
npm install @mediapipe/face-detection
npm install face-api.js
npm install @tensorflow/tfjs
```

### Environment Variables
```env
# Required
ENCRYPTION_KEY=your-32-byte-encryption-key-here

# Optional (with defaults)
FACE_CONFIDENCE_THRESHOLD=0.85
FACE_QUALITY_THRESHOLD=0.7
FACE_MAX_ATTEMPTS=5
FACE_ATTEMPT_WINDOW_MINUTES=15
```

### Database Schema
The service uses the existing `biometricData` table:

```sql
CREATE TABLE biometricData (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  type TEXT NOT NULL, -- 'face'
  data TEXT NOT NULL, -- encrypted embedding JSON
  isActive BOOLEAN DEFAULT true,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Performance Optimization
- Consider caching frequently accessed embeddings
- Implement background embedding processing for large images
- Use database indexing on userId and type fields
- Consider horizontal scaling for high-volume deployments

## Testing

Run the included test script:

```bash
# Start the development server
npm run dev

# In another terminal, run the test
node test-face-verification.js
```

The test will verify:
1. Face enrollment functionality
2. Successful verification with matching images
3. Failed verification with different images
4. Error handling and security features

## Error Handling

Common error scenarios and responses:

| Scenario | HTTP Status | Error Message |
|----------|-------------|---------------|
| No face detected | 400 | "No face detected in image or poor quality" |
| Low image quality | 400 | "Image quality too low for enrollment" |
| Rate limit exceeded | 429 | "Too many verification attempts. Please try again later." |
| Spoofing detected | 400 | "Suspected spoofing attempt detected" |
| No enrolled data | 404 | "No enrolled face data found" |
| Verification failed | 200 | "Face verification failed" (with confidence score) |

## Future Enhancements

1. **Advanced Anti-Spoofing**: Integration with liveness detection libraries
2. **Multi-Face Support**: Handle multiple faces per user
3. **Facial Landmarks**: Additional verification using facial landmarks
4. **Performance Metrics**: Advanced analytics and monitoring
5. **Federated Learning**: Privacy-preserving model updates
6. **Hardware Integration**: Specialized hardware acceleration support

## License

This face verification service is part of the FacePay application. All rights reserved.