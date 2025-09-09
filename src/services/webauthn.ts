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

const rpID = process.env.WEBAUTHN_RELYING_PARTY_ID || 'localhost'
const rpName = process.env.WEBAUTHN_RELYING_PARTY_NAME || 'FacePay'
const expectedOrigin = process.env.WEBAUTHN_EXPECTED_ORIGIN || 'http://localhost:3000'

export class WebAuthnService {
  static async generateRegistrationOptions(userId: string, userName: string) {
    const options: GenerateRegistrationOptionsOpts = {
      rpName,
      rpID,
      userID: Buffer.from(userId, 'utf8'),
      userName,
      timeout: 60000,
      attestationType: 'none',
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'required',
      },
      supportedAlgorithmIDs: [-7, -257],
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
}