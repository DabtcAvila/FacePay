/**
 * Authentication Routes
 * Biometric authentication endpoints for FacePay
 * 
 * Endpoints:
 * - POST /enroll - Register new biometric credential
 * - POST /authenticate/start - Begin authentication process
 * - POST /authenticate/verify - Verify authentication credential
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const { body, validationResult, param } = require('express-validator');
const crypto = require('crypto');

// Import WebAuthn utilities
const {
  generateRegistrationChallenge,
  verifyRegistrationChallenge,
  generateAuthenticationChallenge,
  verifyAuthenticationChallenge,
  sanitizeCredentialForStorage,
  isCredentialValid
} = require('../lib/webauthn');

const router = express.Router();

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  console.error('❌ JWT secrets not configured. Please set JWT_SECRET and JWT_REFRESH_SECRET');
  process.exit(1);
}

// Rate limiting for authentication endpoints
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again in 15 minutes.',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Strict rate limiting for enrollment
const enrollRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 enrollment attempts per hour
  message: {
    success: false,
    error: 'Too many enrollment attempts. Please try again in 1 hour.',
    retryAfter: 3600
  }
});

// Validation middleware
const validateEnrollment = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('deviceInfo')
    .optional()
    .isObject()
    .withMessage('Device info must be an object')
];

const validateAuthStart = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required')
];

const validateAuthVerify = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('credential')
    .isObject()
    .withMessage('WebAuthn credential is required'),
  body('credential.id')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Credential ID is required'),
  body('credential.response')
    .isObject()
    .withMessage('Credential response is required')
];

// Helper function to generate JWT tokens
function generateTokens(user) {
  const payload = {
    userId: user.id,
    email: user.email,
    name: user.name
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });

  return {
    accessToken,
    refreshToken,
    expiresIn: 15 * 60 // 15 minutes
  };
}

// Helper function to handle validation errors
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
}

/**
 * POST /api/enroll
 * Register a new biometric credential for a user
 */
router.post('/enroll', enrollRateLimit, validateEnrollment, handleValidationErrors, async (req, res) => {
  const requestId = req.requestId;
  
  try {
    console.log(`[${requestId}] Enrollment request received:`, {
      email: req.body.email,
      name: req.body.name,
      hasDeviceInfo: !!req.body.deviceInfo,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    const { email, name, deviceInfo } = req.body;
    const prisma = req.prisma;

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email },
      include: {
        webauthnCredentials: {
          where: {
            isActive: true,
            deletedAt: null
          }
        }
      }
    });

    let isNewUser = false;

    // Create new user if doesn't exist
    if (!user) {
      console.log(`[${requestId}] Creating new user for email: ${email}`);
      
      user = await prisma.user.create({
        data: {
          email,
          name,
          creditBalance: BigInt(1000), // Welcome bonus: 10.00 MXN
          isActive: true
        },
        include: {
          webauthnCredentials: {
            where: {
              isActive: true,
              deletedAt: null
            }
          }
        }
      });
      
      isNewUser = true;
      console.log(`[${requestId}] New user created with ID: ${user.id}`);
    } else {
      console.log(`[${requestId}] Existing user found with ID: ${user.id}`);
      
      // Check if user already has active credentials
      if (user.webauthnCredentials.length >= 5) {
        return res.status(400).json({
          success: false,
          error: 'Maximum number of biometric credentials reached. Please remove some before adding new ones.',
          maxCredentials: 5,
          currentCredentials: user.webauthnCredentials.length
        });
      }
    }

    // Generate registration challenge
    const registrationResult = await generateRegistrationChallenge(
      user,
      user.webauthnCredentials
    );

    if (!registrationResult.success) {
      console.error(`[${requestId}] Failed to generate registration challenge:`, registrationResult.error);
      return res.status(500).json({
        success: false,
        error: 'Failed to generate registration challenge'
      });
    }

    // Store challenge in user record for verification
    await prisma.user.update({
      where: { id: user.id },
      data: {
        currentChallenge: registrationResult.challenge,
        lastLoginAt: new Date()
      }
    });

    console.log(`[${requestId}] Registration challenge generated and stored for user ${user.id}`);

    // Log enrollment attempt
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        tableName: 'users',
        recordId: user.id,
        action: 'ENROLLMENT_START',
        newValues: {
          email,
          isNewUser,
          deviceInfo: deviceInfo || {},
          ip: req.ip,
          userAgent: req.get('User-Agent')
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.status(200).json({
      success: true,
      data: {
        options: registrationResult.options,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          isNewUser
        },
        biometricRequired: true
      },
      message: isNewUser 
        ? 'New account created. Please complete biometric enrollment.' 
        : 'Please complete biometric enrollment to add new credential.'
    });

  } catch (error) {
    console.error(`[${requestId}] Enrollment error:`, error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error during enrollment',
      requestId
    });
  }
});

/**
 * POST /api/authenticate/start
 * Start biometric authentication process
 */
router.post('/authenticate/start', authRateLimit, validateAuthStart, handleValidationErrors, async (req, res) => {
  const requestId = req.requestId;
  
  try {
    console.log(`[${requestId}] Authentication start request:`, {
      email: req.body.email,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    const { email } = req.body;
    const prisma = req.prisma;

    // Find user with active credentials
    const user = await prisma.user.findUnique({
      where: { 
        email,
        isActive: true,
        deletedAt: null
      },
      include: {
        webauthnCredentials: {
          where: {
            isActive: true,
            deletedAt: null
          }
        }
      }
    });

    if (!user) {
      console.log(`[${requestId}] User not found for authentication: ${email}`);
      return res.status(404).json({
        success: false,
        error: 'User not found or account inactive'
      });
    }

    if (user.webauthnCredentials.length === 0) {
      console.log(`[${requestId}] No active credentials found for user: ${user.id}`);
      return res.status(400).json({
        success: false,
        error: 'No biometric credentials found. Please enroll first.',
        requiresEnrollment: true
      });
    }

    console.log(`[${requestId}] Found ${user.webauthnCredentials.length} active credentials for user ${user.id}`);

    // Validate credentials before generating challenge
    const validCredentials = user.webauthnCredentials.filter(isCredentialValid);
    
    if (validCredentials.length === 0) {
      console.log(`[${requestId}] No valid credentials found for user: ${user.id}`);
      return res.status(400).json({
        success: false,
        error: 'No valid biometric credentials found. Please enroll again.',
        requiresEnrollment: true
      });
    }

    // Generate authentication challenge
    const authResult = await generateAuthenticationChallenge(validCredentials);

    if (!authResult.success) {
      console.error(`[${requestId}] Failed to generate authentication challenge:`, authResult.error);
      return res.status(500).json({
        success: false,
        error: 'Failed to generate authentication challenge'
      });
    }

    // Store challenge for verification
    await prisma.user.update({
      where: { id: user.id },
      data: {
        currentChallenge: authResult.challenge
      }
    });

    console.log(`[${requestId}] Authentication challenge generated for user ${user.id}`);

    // Log authentication attempt
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        tableName: 'users',
        recordId: user.id,
        action: 'AUTH_START',
        newValues: {
          credentialsCount: validCredentials.length,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.status(200).json({
      success: true,
      data: {
        options: authResult.options,
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        },
        biometricRequired: true,
        credentialsCount: validCredentials.length
      },
      message: 'Authentication challenge generated. Please complete biometric verification.'
    });

  } catch (error) {
    console.error(`[${requestId}] Authentication start error:`, error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error during authentication start',
      requestId
    });
  }
});

/**
 * POST /api/authenticate/verify
 * Verify biometric authentication credential
 */
router.post('/authenticate/verify', authRateLimit, validateAuthVerify, handleValidationErrors, async (req, res) => {
  const requestId = req.requestId;
  
  try {
    console.log(`[${requestId}] Authentication verification request:`, {
      email: req.body.email,
      credentialId: req.body.credential?.id,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    const { email, credential } = req.body;
    const prisma = req.prisma;

    // Find user with stored challenge
    const user = await prisma.user.findUnique({
      where: { 
        email,
        isActive: true,
        deletedAt: null
      },
      include: {
        webauthnCredentials: {
          where: {
            isActive: true,
            deletedAt: null
          }
        }
      }
    });

    if (!user || !user.currentChallenge) {
      console.log(`[${requestId}] User or challenge not found for verification: ${email}`);
      return res.status(400).json({
        success: false,
        error: 'Authentication challenge not found. Please start authentication again.',
        requiresRestart: true
      });
    }

    // Find matching credential
    const storedCredential = user.webauthnCredentials.find(
      cred => cred.credentialId === credential.id
    );

    if (!storedCredential || !isCredentialValid(storedCredential)) {
      console.log(`[${requestId}] Credential not found or invalid: ${credential.id}`);
      return res.status(400).json({
        success: false,
        error: 'Credential not found or inactive'
      });
    }

    console.log(`[${requestId}] Found matching credential for verification: ${storedCredential.id}`);

    // Verify authentication response
    const verificationResult = await verifyAuthenticationChallenge(
      credential,
      user.currentChallenge,
      storedCredential,
      req.get('User-Agent')
    );

    if (!verificationResult.success || !verificationResult.verified) {
      console.error(`[${requestId}] Authentication verification failed:`, verificationResult.error);
      
      // Log failed attempt
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          tableName: 'webauthn_credentials',
          recordId: storedCredential.id,
          action: 'AUTH_FAILED',
          newValues: {
            error: verificationResult.error,
            ip: req.ip,
            userAgent: req.get('User-Agent')
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }
      });

      return res.status(401).json({
        success: false,
        error: 'Biometric authentication failed',
        verified: false
      });
    }

    // Update credential counter and last used timestamp
    await prisma.webauthnCredential.update({
      where: { id: storedCredential.id },
      data: {
        counter: BigInt(verificationResult.authenticationData.newCounter),
        lastUsedAt: new Date()
      }
    });

    // Clear challenge and update user login timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: {
        currentChallenge: null,
        lastLoginAt: new Date()
      }
    });

    // Generate JWT tokens
    const tokens = generateTokens(user);

    // Log successful authentication
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        tableName: 'webauthn_credentials',
        recordId: storedCredential.id,
        action: 'AUTH_SUCCESS',
        newValues: {
          biometricVerified: verificationResult.biometricVerified,
          authenticatorType: verificationResult.authenticatorType,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    console.log(`[${requestId}] Authentication successful for user ${user.id}`);

    res.status(200).json({
      success: true,
      data: {
        verified: true,
        biometricVerified: verificationResult.biometricVerified,
        authenticatorType: verificationResult.authenticatorType,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          creditBalance: user.creditBalance.toString()
        },
        tokens,
        session: {
          loginAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + tokens.expiresIn * 1000).toISOString()
        }
      },
      message: 'Biometric authentication successful'
    });

  } catch (error) {
    console.error(`[${requestId}] Authentication verification error:`, error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error during authentication verification',
      requestId
    });
  }
});

/**
 * POST /api/enroll/complete
 * Complete biometric credential enrollment
 */
router.post('/enroll/complete', enrollRateLimit, async (req, res) => {
  const requestId = req.requestId;
  
  try {
    console.log(`[${requestId}] Enrollment completion request:`, {
      hasCredential: !!req.body.credential,
      credentialId: req.body.credential?.id,
      ip: req.ip
    });

    const { credential, email } = req.body;
    const prisma = req.prisma;

    if (!credential || !email) {
      return res.status(400).json({
        success: false,
        error: 'Credential and email are required'
      });
    }

    // Find user with challenge
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        webauthnCredentials: {
          where: {
            isActive: true,
            deletedAt: null
          }
        }
      }
    });

    if (!user || !user.currentChallenge) {
      return res.status(400).json({
        success: false,
        error: 'Enrollment session not found. Please start enrollment again.',
        requiresRestart: true
      });
    }

    // Verify registration response
    const verificationResult = await verifyRegistrationChallenge(
      credential,
      user.currentChallenge,
      req.get('User-Agent')
    );

    if (!verificationResult.success || !verificationResult.verified) {
      console.error(`[${requestId}] Enrollment verification failed:`, verificationResult.error);
      return res.status(400).json({
        success: false,
        error: 'Biometric enrollment verification failed',
        details: verificationResult.error
      });
    }

    // Store new credential
    const sanitizedCredential = sanitizeCredentialForStorage(verificationResult.credentialData);
    
    const newCredential = await prisma.webauthnCredential.create({
      data: {
        credentialId: sanitizedCredential.credentialId,
        publicKey: sanitizedCredential.publicKey,
        counter: BigInt(sanitizedCredential.counter),
        transports: sanitizedCredential.transports,
        backedUp: sanitizedCredential.backedUp,
        deviceType: sanitizedCredential.deviceType,
        deviceName: `${req.get('User-Agent')?.split(' ')[0] || 'Device'} - ${new Date().toLocaleDateString()}`,
        userId: user.id,
        isActive: true
      }
    });

    // Clear challenge
    await prisma.user.update({
      where: { id: user.id },
      data: {
        currentChallenge: null,
        lastLoginAt: new Date()
      }
    });

    // Generate tokens for immediate login
    const tokens = generateTokens(user);

    // Log successful enrollment
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        tableName: 'webauthn_credentials',
        recordId: newCredential.id,
        action: 'CREDENTIAL_ENROLLED',
        newValues: {
          credentialId: newCredential.credentialId,
          deviceType: newCredential.deviceType,
          biometricVerified: verificationResult.biometricVerified,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    console.log(`[${requestId}] Biometric credential enrolled successfully for user ${user.id}`);

    res.status(201).json({
      success: true,
      data: {
        verified: true,
        biometricVerified: verificationResult.biometricVerified,
        authenticatorType: verificationResult.authenticatorType,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          creditBalance: user.creditBalance.toString()
        },
        credential: {
          id: newCredential.id,
          deviceType: newCredential.deviceType,
          deviceName: newCredential.deviceName,
          createdAt: newCredential.createdAt
        },
        tokens,
        session: {
          loginAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + tokens.expiresIn * 1000).toISOString()
        }
      },
      message: 'Biometric credential enrolled successfully'
    });

  } catch (error) {
    console.error(`[${requestId}] Enrollment completion error:`, error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error during enrollment completion',
      requestId
    });
  }
});

module.exports = router;