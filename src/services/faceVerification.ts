import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { encryptData, decryptData } from '@/lib/encryption'

// Face verification configuration
export interface FaceVerificationConfig {
  confidenceThreshold: number
  maxAttempts: number
  attemptWindowMinutes: number
  enableLogging: boolean
  qualityThreshold: number
  antiSpoofingEnabled: boolean
}

// Default configuration
export const DEFAULT_CONFIG: FaceVerificationConfig = {
  confidenceThreshold: 0.85,
  maxAttempts: 5,
  attemptWindowMinutes: 15,
  enableLogging: true,
  qualityThreshold: 0.7,
  antiSpoofingEnabled: true,
}

// Face embedding structure
export interface FaceEmbedding {
  vector: number[]
  quality: number
  confidence: number
  metadata: {
    extractedAt: string
    imageHash: string
    dimensions?: { width: number; height: number }
    processingTime?: number
  }
}

// Verification attempt log
export interface VerificationAttempt {
  id: string
  userId: string
  timestamp: Date
  success: boolean
  confidence: number
  ipAddress?: string
  userAgent?: string
  riskScore?: number
}

// Verification result
export interface VerificationResult {
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

// Face enrollment result
export interface EnrollmentResult {
  success: boolean
  embeddingId: string
  quality: number
  message: string
  metadata?: {
    processingTime: number
    imageQuality: number
  }
}

/**
 * Comprehensive Face Verification Service
 * Handles secure face enrollment, verification, and embedding management
 */
export class FaceVerificationService {
  private config: FaceVerificationConfig

  constructor(config: Partial<FaceVerificationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Enroll a new face for a user
   * @param userId - User identifier
   * @param imageData - Base64 encoded image data or image buffer
   * @param replaceExisting - Whether to replace existing enrollments
   * @returns EnrollmentResult
   */
  async enrollFace(
    userId: string,
    imageData: string | Buffer,
    replaceExisting: boolean = false
  ): Promise<EnrollmentResult> {
    const startTime = Date.now()

    try {
      // Validate image format and quality
      const imageValidation = await this.validateImage(imageData)
      if (!imageValidation.valid) {
        return {
          success: false,
          embeddingId: '',
          quality: 0,
          message: imageValidation.error || 'Invalid image format',
        }
      }

      // Extract face embedding
      const embedding = await this.extractFaceEmbedding(imageData)
      if (!embedding) {
        return {
          success: false,
          embeddingId: '',
          quality: 0,
          message: 'No face detected in image or poor quality',
        }
      }

      // Check quality threshold
      if (embedding.quality < this.config.qualityThreshold) {
        return {
          success: false,
          embeddingId: '',
          quality: embedding.quality,
          message: 'Image quality too low for enrollment',
        }
      }

      // Check for existing enrollments
      if (replaceExisting) {
        await this.deactivateUserEmbeddings(userId)
      } else {
        const existingCount = await this.getActiveEmbeddingCount(userId)
        if (existingCount > 0) {
          return {
            success: false,
            embeddingId: '',
            quality: embedding.quality,
            message: 'User already has enrolled face data',
          }
        }
      }

      // Encrypt and store embedding
      const embeddingId = await this.storeEncryptedEmbedding(userId, embedding)

      const processingTime = Date.now() - startTime

      // Log enrollment if enabled
      if (this.config.enableLogging) {
        await this.logEnrollment(userId, embeddingId, embedding.quality)
      }

      return {
        success: true,
        embeddingId,
        quality: embedding.quality,
        message: 'Face enrolled successfully',
        metadata: {
          processingTime,
          imageQuality: embedding.quality,
        },
      }
    } catch (error) {
      console.error('Face enrollment error:', error)
      return {
        success: false,
        embeddingId: '',
        quality: 0,
        message: 'Internal error during enrollment',
      }
    }
  }

  /**
   * Verify a face against stored embeddings
   * @param imageData - Image data to verify
   * @param storedEmbeddingId - Optional specific embedding to verify against
   * @param requestMetadata - Additional request metadata
   * @returns VerificationResult
   */
  async verifyFace(
    imageData: string | Buffer,
    storedEmbeddingId?: string,
    requestMetadata?: { ipAddress?: string; userAgent?: string }
  ): Promise<VerificationResult> {
    const startTime = Date.now()
    const attemptId = crypto.randomUUID()

    try {
      // Check rate limiting
      const rateLimitCheck = await this.checkRateLimit(requestMetadata?.ipAddress)
      if (!rateLimitCheck.allowed) {
        return {
          success: false,
          confidence: 0,
          attemptId,
          riskScore: 1.0,
          message: 'Too many verification attempts. Please try again later.',
        }
      }

      // Validate image
      const imageValidation = await this.validateImage(imageData)
      if (!imageValidation.valid) {
        return {
          success: false,
          confidence: 0,
          attemptId,
          riskScore: 0.8,
          message: imageValidation.error || 'Invalid image',
        }
      }

      // Extract embedding from input image
      const inputEmbedding = await this.extractFaceEmbedding(imageData)
      if (!inputEmbedding) {
        return {
          success: false,
          confidence: 0,
          attemptId,
          riskScore: 0.7,
          message: 'No face detected or poor image quality',
        }
      }

      // Anti-spoofing check
      const antiSpoofingResult = await this.performAntiSpoofingCheck(imageData)
      if (!antiSpoofingResult.passed) {
        await this.logVerificationAttempt({
          id: attemptId,
          userId: '',
          timestamp: new Date(),
          success: false,
          confidence: 0,
          ipAddress: requestMetadata?.ipAddress,
          userAgent: requestMetadata?.userAgent,
          riskScore: 0.9,
        })

        return {
          success: false,
          confidence: 0,
          attemptId,
          riskScore: 0.9,
          message: 'Suspected spoofing attempt detected',
          metadata: {
            processingTime: Date.now() - startTime,
            qualityScore: inputEmbedding.quality,
            antiSpoofingPassed: false,
          },
        }
      }

      // Get stored embeddings to compare against
      const storedEmbeddings = await this.getStoredEmbeddings(storedEmbeddingId)
      if (storedEmbeddings.length === 0) {
        return {
          success: false,
          confidence: 0,
          attemptId,
          riskScore: 0.3,
          message: 'No enrolled face data found',
        }
      }

      // Find best match
      let bestMatch: { similarity: number; userId: string } | null = null
      
      for (const stored of storedEmbeddings) {
        const similarity = await this.calculateSimilarity(inputEmbedding, stored.embedding)
        
        if (similarity >= this.config.confidenceThreshold) {
          if (!bestMatch || similarity > bestMatch.similarity) {
            bestMatch = { similarity, userId: stored.userId }
          }
        }
      }

      const success = bestMatch !== null
      const confidence = bestMatch?.similarity || 0
      const riskScore = this.calculateRiskScore(confidence, antiSpoofingResult, rateLimitCheck)

      // Log verification attempt
      if (this.config.enableLogging) {
        await this.logVerificationAttempt({
          id: attemptId,
          userId: bestMatch?.userId || '',
          timestamp: new Date(),
          success,
          confidence,
          ipAddress: requestMetadata?.ipAddress,
          userAgent: requestMetadata?.userAgent,
          riskScore,
        })
      }

      return {
        success,
        confidence,
        userId: success ? bestMatch!.userId : undefined,
        attemptId,
        riskScore,
        message: success ? 'Face verified successfully' : 'Face verification failed',
        metadata: {
          processingTime: Date.now() - startTime,
          qualityScore: inputEmbedding.quality,
          antiSpoofingPassed: antiSpoofingResult.passed,
        },
      }
    } catch (error) {
      console.error('Face verification error:', error)
      return {
        success: false,
        confidence: 0,
        attemptId,
        riskScore: 1.0,
        message: 'Internal error during verification',
      }
    }
  }

  /**
   * Extract face embedding from image
   * In production, this would use a proper face recognition library like FaceNet, ArcFace, etc.
   */
  private async extractFaceEmbedding(imageData: string | Buffer): Promise<FaceEmbedding | null> {
    try {
      // Convert image data to buffer if needed
      const buffer = typeof imageData === 'string' 
        ? Buffer.from(imageData.replace(/^data:image\/[a-z]+;base64,/, ''), 'base64')
        : imageData

      // In a real implementation, you would use a face recognition library
      // For demonstration, we'll create a simulated embedding based on image hash
      const imageHash = crypto.createHash('sha256').update(buffer).digest('hex')
      
      // Simulate face detection and quality assessment
      const faceDetected = buffer.length > 1000 // Basic size check
      if (!faceDetected) return null

      // Create simulated 512-dimensional embedding (typical for face recognition)
      const embedding = this.generateSimulatedEmbedding(imageHash)
      
      // Simulate quality score based on image size and hash entropy
      const quality = this.calculateImageQuality(buffer)

      return {
        vector: embedding,
        quality,
        confidence: 0.95,
        metadata: {
          extractedAt: new Date().toISOString(),
          imageHash,
          dimensions: { width: 224, height: 224 }, // Simulated standard face crop size
        },
      }
    } catch (error) {
      console.error('Face embedding extraction error:', error)
      return null
    }
  }

  /**
   * Calculate similarity between two face embeddings using cosine similarity
   */
  async calculateSimilarity(embedding1: FaceEmbedding, embedding2: FaceEmbedding): Promise<number> {
    try {
      const vec1 = embedding1.vector
      const vec2 = embedding2.vector

      if (vec1.length !== vec2.length) {
        throw new Error('Embedding dimensions do not match')
      }

      // Calculate cosine similarity
      let dotProduct = 0
      let magnitude1 = 0
      let magnitude2 = 0

      for (let i = 0; i < vec1.length; i++) {
        dotProduct += vec1[i] * vec2[i]
        magnitude1 += vec1[i] * vec1[i]
        magnitude2 += vec2[i] * vec2[i]
      }

      magnitude1 = Math.sqrt(magnitude1)
      magnitude2 = Math.sqrt(magnitude2)

      if (magnitude1 === 0 || magnitude2 === 0) {
        return 0
      }

      const similarity = dotProduct / (magnitude1 * magnitude2)
      
      // Convert from [-1, 1] to [0, 1] range
      return (similarity + 1) / 2
    } catch (error) {
      console.error('Similarity calculation error:', error)
      return 0
    }
  }

  /**
   * Encrypt face embedding for secure storage
   */
  async encryptEmbedding(embedding: FaceEmbedding): Promise<string> {
    try {
      const embeddingJson = JSON.stringify(embedding)
      const encrypted = encryptData(embeddingJson)
      return JSON.stringify(encrypted)
    } catch (error) {
      console.error('Embedding encryption error:', error)
      throw new Error('Failed to encrypt face embedding')
    }
  }

  /**
   * Decrypt face embedding from storage
   */
  private async decryptEmbedding(encryptedData: string): Promise<FaceEmbedding> {
    try {
      const encryptedObj = JSON.parse(encryptedData)
      const decryptedJson = decryptData(encryptedObj)
      return JSON.parse(decryptedJson)
    } catch (error) {
      console.error('Embedding decryption error:', error)
      throw new Error('Failed to decrypt face embedding')
    }
  }

  /**
   * Store encrypted embedding in database
   */
  private async storeEncryptedEmbedding(userId: string, embedding: FaceEmbedding): Promise<string> {
    const encryptedData = await this.encryptEmbedding(embedding)
    
    const record = await prisma.biometricData.create({
      data: {
        userId,
        type: 'face',
        data: encryptedData,
        isActive: true,
      },
    })

    return record.id
  }

  /**
   * Get stored embeddings for verification
   */
  private async getStoredEmbeddings(embeddingId?: string): Promise<Array<{
    userId: string
    embedding: FaceEmbedding
  }>> {
    const whereClause = embeddingId 
      ? { id: embeddingId, type: 'face', isActive: true }
      : { type: 'face', isActive: true }

    const records = await prisma.biometricData.findMany({
      where: whereClause,
      select: {
        userId: true,
        data: true,
      },
    })

    const embeddings: Array<{ userId: string; embedding: FaceEmbedding }> = []
    
    for (const record of records) {
      try {
        const embedding = await this.decryptEmbedding(record.data)
        embeddings.push({
          userId: record.userId,
          embedding,
        })
      } catch (error) {
        console.error('Failed to decrypt embedding for user:', record.userId, error)
      }
    }

    return embeddings
  }

  /**
   * Validate image format and basic quality
   */
  private async validateImage(imageData: string | Buffer): Promise<{ valid: boolean; error?: string }> {
    try {
      const buffer = typeof imageData === 'string'
        ? Buffer.from(imageData.replace(/^data:image\/[a-z]+;base64,/, ''), 'base64')
        : imageData

      // Check minimum size
      if (buffer.length < 1000) {
        return { valid: false, error: 'Image too small' }
      }

      // Check maximum size (10MB)
      if (buffer.length > 10 * 1024 * 1024) {
        return { valid: false, error: 'Image too large' }
      }

      // Basic image format validation
      const header = buffer.subarray(0, 4)
      const isJPEG = header[0] === 0xFF && header[1] === 0xD8
      const isPNG = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47

      if (!isJPEG && !isPNG) {
        return { valid: false, error: 'Unsupported image format. Use JPEG or PNG.' }
      }

      return { valid: true }
    } catch (error) {
      return { valid: false, error: 'Invalid image data' }
    }
  }

  /**
   * Anti-spoofing check (basic implementation)
   */
  private async performAntiSpoofingCheck(imageData: string | Buffer): Promise<{ passed: boolean; confidence: number }> {
    if (!this.config.antiSpoofingEnabled) {
      return { passed: true, confidence: 1.0 }
    }

    try {
      const buffer = typeof imageData === 'string'
        ? Buffer.from(imageData.replace(/^data:image\/[a-z]+;base64,/, ''), 'base64')
        : imageData

      // Basic spoofing detection based on image characteristics
      // In production, use specialized anti-spoofing libraries
      
      // Check for compression artifacts (real photos typically have them)
      const hasCompressionArtifacts = this.detectCompressionArtifacts(buffer)
      
      // Check color distribution (printed photos often have different color profiles)
      const colorDistributionNormal = this.analyzeColorDistribution(buffer)
      
      // Simple scoring system
      let score = 0.5
      if (hasCompressionArtifacts) score += 0.3
      if (colorDistributionNormal) score += 0.2
      
      const passed = score >= 0.7
      
      return { passed, confidence: score }
    } catch (error) {
      console.error('Anti-spoofing check error:', error)
      return { passed: true, confidence: 0.5 } // Fail open to avoid blocking legitimate users
    }
  }

  /**
   * Check rate limiting for verification attempts
   */
  private async checkRateLimit(ipAddress?: string): Promise<{ allowed: boolean; remainingAttempts: number }> {
    if (!ipAddress) {
      return { allowed: true, remainingAttempts: this.config.maxAttempts }
    }

    const windowStart = new Date(Date.now() - this.config.attemptWindowMinutes * 60 * 1000)
    
    // This would typically use Redis or similar for production rate limiting
    // For now, we'll simulate with a simple check
    const recentAttempts = await this.getRecentAttempts(ipAddress, windowStart)
    const remainingAttempts = Math.max(0, this.config.maxAttempts - recentAttempts)
    
    return {
      allowed: remainingAttempts > 0,
      remainingAttempts,
    }
  }

  /**
   * Calculate risk score based on multiple factors
   */
  private calculateRiskScore(
    confidence: number,
    antiSpoofingResult: { passed: boolean; confidence: number },
    rateLimitCheck: { allowed: boolean; remainingAttempts: number }
  ): number {
    let risk = 0

    // Confidence-based risk
    if (confidence < this.config.confidenceThreshold) {
      risk += 0.4
    }

    // Anti-spoofing risk
    if (!antiSpoofingResult.passed) {
      risk += 0.4
    } else if (antiSpoofingResult.confidence < 0.8) {
      risk += 0.2
    }

    // Rate limiting risk
    if (!rateLimitCheck.allowed) {
      risk += 0.3
    } else if (rateLimitCheck.remainingAttempts < 2) {
      risk += 0.1
    }

    return Math.min(1.0, risk)
  }

  // Helper methods for simulation (replace with real implementations)

  private generateSimulatedEmbedding(imageHash: string): number[] {
    const embedding: number[] = []
    const seed = parseInt(imageHash.substring(0, 8), 16)
    
    // Generate deterministic but pseudo-random embedding
    let random = seed
    for (let i = 0; i < 512; i++) {
      random = (random * 9301 + 49297) % 233280
      embedding.push((random / 233280 - 0.5) * 2) // Normalize to [-1, 1]
    }
    
    return embedding
  }

  private calculateImageQuality(buffer: Buffer): number {
    // Simulate quality calculation based on image size and entropy
    const size = buffer.length
    const entropy = this.calculateEntropy(buffer.subarray(0, Math.min(1024, buffer.length)))
    
    let quality = 0.5
    
    // Size factor
    if (size > 50000) quality += 0.2
    if (size > 100000) quality += 0.1
    
    // Entropy factor (higher entropy usually means better quality)
    quality += Math.min(0.3, entropy / 8 * 0.3)
    
    return Math.min(1.0, quality)
  }

  private calculateEntropy(buffer: Buffer): number {
    const frequencies = new Array(256).fill(0)
    for (let i = 0; i < buffer.length; i++) {
      frequencies[buffer[i]]++
    }
    
    let entropy = 0
    for (const freq of frequencies) {
      if (freq > 0) {
        const p = freq / buffer.length
        entropy -= p * Math.log2(p)
      }
    }
    
    return entropy
  }

  private detectCompressionArtifacts(buffer: Buffer): boolean {
    // Simple check for JPEG compression markers
    for (let i = 0; i < buffer.length - 1; i++) {
      if (buffer[i] === 0xFF && (buffer[i + 1] === 0xC0 || buffer[i + 1] === 0xC2)) {
        return true
      }
    }
    return false
  }

  private analyzeColorDistribution(buffer: Buffer): boolean {
    // Simple color distribution analysis
    // In production, this would be much more sophisticated
    const sample = buffer.subarray(100, Math.min(1100, buffer.length))
    const uniqueBytes = new Set(sample).size
    
    // If there's good color variety, it's likely a real photo
    return uniqueBytes > sample.length * 0.3
  }

  private async deactivateUserEmbeddings(userId: string): Promise<void> {
    await prisma.biometricData.updateMany({
      where: {
        userId,
        type: 'face',
        isActive: true,
      },
      data: {
        isActive: false,
      },
    })
  }

  private async getActiveEmbeddingCount(userId: string): Promise<number> {
    return prisma.biometricData.count({
      where: {
        userId,
        type: 'face',
        isActive: true,
      },
    })
  }

  private async logEnrollment(userId: string, embeddingId: string, quality: number): Promise<void> {
    // In production, log to a dedicated audit table
    console.log('Face enrollment:', { userId, embeddingId, quality, timestamp: new Date() })
  }

  private async logVerificationAttempt(attempt: VerificationAttempt): Promise<void> {
    // In production, store in dedicated verification_attempts table
    console.log('Face verification attempt:', attempt)
  }

  private async getRecentAttempts(ipAddress: string, since: Date): Promise<number> {
    // In production, query from verification_attempts table or Redis
    // For simulation, return a random number
    return Math.floor(Math.random() * 3)
  }
}

// Export singleton instance with default configuration
export const faceVerificationService = new FaceVerificationService()

// Export factory function for custom configurations
export function createFaceVerificationService(config?: Partial<FaceVerificationConfig>): FaceVerificationService {
  return new FaceVerificationService(config)
}