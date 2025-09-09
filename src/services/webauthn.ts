import { 
  generateRegistrationOptions, 
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type GenerateRegistrationOptionsOpts,
  type VerifyRegistrationResponseOpts,
  type GenerateAuthenticationOptionsOpts,
  type VerifyAuthenticationResponseOpts,
} from '@simplewebauthn/server'
import { prisma } from '@/lib/prisma'

const rpID = process.env.WEBAUTHN_RP_ID || 'localhost'
const rpName = process.env.WEBAUTHN_RP_NAME || 'FacePay'
const expectedOrigin = process.env.WEBAUTHN_ORIGIN || 'http://localhost:3000'

export class WebAuthnService {
  /**
   * Generates registration options for biometric authentication
   * @param userId - The user's unique identifier
   * @param userName - The user's email or username
   * @param excludeCredentials - Existing credentials to exclude
   */
  static async generateRegistrationOptions(
    userId: string, 
    userName: string, 
    excludeCredentials?: Array<{ id: Buffer; type: 'public-key' }>
  ) {
    const options: GenerateRegistrationOptionsOpts = {
      rpName,
      rpID,
      userID: Buffer.from(userId, 'utf8'),
      userName,
      userDisplayName: userName,
      timeout: 60000,
      attestationType: 'none',
      excludeCredentials: excludeCredentials || [],
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // Prefer platform authenticators (biometric)
        userVerification: 'required', // Require biometric verification
        residentKey: 'preferred', // Allow passkeys
      },
      supportedAlgorithmIDs: [-7, -257], // ES256, RS256
    }

    return await generateRegistrationOptions(options)
  }

  static async verifyRegistration(
    registrationResponse: any, 
    expectedChallenge: string,
    userId: string
  ) {
    const verification: VerifyRegistrationResponseOpts = {
      response: registrationResponse,
      expectedChallenge,
      expectedOrigin,
      expectedRPID: rpID,
    }

    return await verifyRegistrationResponse(verification)
  }

  static async generateAuthenticationOptions(allowCredentials?: any[]) {
    const options: GenerateAuthenticationOptionsOpts = {
      timeout: 60000,
      allowCredentials,
      userVerification: 'required',
      rpID,
    }

    return await generateAuthenticationOptions(options)
  }

  static async verifyAuthentication(
    authenticationResponse: any,
    expectedChallenge: string,
    credentialPublicKey: Uint8Array,
    credentialCounter: number
  ) {
    const verification: VerifyAuthenticationResponseOpts = {
      response: authenticationResponse,
      expectedChallenge,
      expectedOrigin,
      expectedRPID: rpID,
      authenticator: {
        credentialPublicKey,
        credentialID: authenticationResponse.rawId,
        counter: credentialCounter,
      },
    }

    return await verifyAuthenticationResponse(verification)
  }

  /**
   * Stores a challenge for a user securely
   * @param userId - The user's unique identifier
   * @param challenge - The WebAuthn challenge to store
   */
  static async storeChallenge(userId: string, challenge: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { currentChallenge: challenge },
    })
  }

  /**
   * Retrieves and clears a challenge for a user
   * @param userId - The user's unique identifier
   * @returns The stored challenge or null if not found
   */
  static async getAndClearChallenge(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { currentChallenge: true },
    })

    if (!user?.currentChallenge) {
      return null
    }

    // Clear the challenge
    await prisma.user.update({
      where: { id: userId },
      data: { currentChallenge: null },
    })

    return user.currentChallenge
  }

  /**
   * Gets user credentials for authentication
   * @param userId - The user's unique identifier
   * @returns Array of user credentials
   */
  static async getUserCredentials(userId: string) {
    const credentials = await prisma.webauthnCredential.findMany({
      where: { userId },
      select: {
        credentialId: true,
        publicKey: true,
        counter: true,
        deviceType: true,
        backedUp: true,
        createdAt: true,
      },
    })

    return credentials.map(cred => ({
      id: Buffer.from(cred.credentialId, 'base64url'),
      publicKey: Buffer.from(cred.publicKey, 'base64url'),
      counter: cred.counter,
      deviceType: cred.deviceType,
      backedUp: cred.backedUp,
      createdAt: cred.createdAt,
    }))
  }

  /**
   * Saves a new WebAuthn credential for a user
   * @param userId - The user's unique identifier
   * @param credentialData - The credential information to save
   */
  static async saveCredential(userId: string, credentialData: {
    credentialID: Uint8Array;
    credentialPublicKey: Uint8Array;
    counter: number;
    credentialBackedUp?: boolean;
    credentialDeviceType?: string;
  }) {
    const credential = await prisma.webauthnCredential.create({
      data: {
        userId,
        credentialId: Buffer.from(credentialData.credentialID).toString('base64url'),
        publicKey: Buffer.from(credentialData.credentialPublicKey).toString('base64url'),
        counter: credentialData.counter,
        backedUp: credentialData.credentialBackedUp || false,
        deviceType: credentialData.credentialDeviceType || 'unknown',
      },
    })

    // Also create a biometric data entry for tracking
    await prisma.biometricData.create({
      data: {
        userId,
        type: 'webauthn_passkey',
        data: 'registered',
        isActive: true,
      },
    })

    return credential
  }
}