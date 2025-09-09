/**
 * Simple utility to test biometric capabilities
 * This can be used for debugging and verification
 */
import { WebAuthnService } from '@/services/webauthn'

export async function testBiometricCapabilities() {
  try {
    console.log('🔍 Testing biometric capabilities...')
    
    // Check biometric support
    const capabilities = await WebAuthnService.checkBiometricSupport()
    
    console.log('📊 Biometric Capabilities Report:')
    console.log('═'.repeat(50))
    console.log(`✓ WebAuthn Supported: ${capabilities.isSupported}`)
    console.log(`✓ Platform Authenticator Available: ${capabilities.isPlatformAuthenticatorAvailable}`)
    console.log(`✓ User Verification Supported: ${capabilities.isUserVerificationSupported}`)
    console.log(`✓ Biometric Types: ${capabilities.biometricTypes.join(', ')}`)
    
    console.log('\n🔧 Specific Biometric Support:')
    console.log(`  • Face ID (iOS): ${capabilities.specificBiometrics.faceID}`)
    console.log(`  • Touch ID (iOS/macOS): ${capabilities.specificBiometrics.touchID}`)
    console.log(`  • Windows Hello: ${capabilities.specificBiometrics.windowsHello}`)
    console.log(`  • Android Fingerprint: ${capabilities.specificBiometrics.androidFingerprint}`)
    console.log(`  • Android Face: ${capabilities.specificBiometrics.androidFace}`)
    
    console.log('\n📱 Device Information:')
    console.log(`  • Platform: ${capabilities.deviceInfo.platform}`)
    console.log(`  • iOS: ${capabilities.deviceInfo.isIOS}`)
    console.log(`  • Android: ${capabilities.deviceInfo.isAndroid}`)
    console.log(`  • macOS: ${capabilities.deviceInfo.isMacOS}`)
    console.log(`  • Windows: ${capabilities.deviceInfo.isWindows}`)
    console.log(`  • Mobile: ${capabilities.deviceInfo.isMobile}`)
    console.log(`  • OS Version: ${capabilities.deviceInfo.osVersion || 'Unknown'}`)
    
    // Provide recommendations
    console.log('\n💡 Recommendations:')
    if (!capabilities.isSupported) {
      console.log('❌ WebAuthn is not supported on this browser/device')
      console.log('   → Use a modern browser (Chrome 67+, Firefox 60+, Safari 14+)')
    } else if (!capabilities.isPlatformAuthenticatorAvailable) {
      console.log('⚠️  Platform authenticator not available')
      console.log('   → Enable biometric authentication in device settings')
      console.log('   → Ensure you\'re using HTTPS')
    } else if (capabilities.biometricTypes.length === 0) {
      console.log('⚠️  No biometric methods detected')
      console.log('   → Check device biometric settings')
    } else {
      console.log('✅ Ready for biometric authentication!')
      console.log(`   → Available methods: ${capabilities.biometricTypes.join(', ')}`)
    }
    
    return capabilities
    
  } catch (error) {
    console.error('❌ Error testing biometric capabilities:', error)
    throw error
  }
}

export async function testBiometricRegistration(userId: string = 'test-user', userName: string = 'Test User') {
  try {
    console.log('\n🔐 Testing biometric registration...')
    
    const credential = await WebAuthnService.registerWithBiometric(userId, userName)
    
    console.log('✅ Registration successful!')
    console.log(`   • Credential ID: ${credential.id.substring(0, 20)}...`)
    console.log(`   • Authenticator: ${credential.authenticatorAttachment || 'unknown'}`)
    
    return credential
    
  } catch (error: any) {
    console.error('❌ Registration failed:', error.message || error)
    if (error.code) {
      console.error(`   • Error Code: ${error.code}`)
      console.error(`   • Suggested Action: ${error.suggestedAction}`)
    }
    throw error
  }
}

export async function testBiometricAuthentication() {
  try {
    console.log('\n🔓 Testing biometric authentication...')
    
    const credential = await WebAuthnService.authenticateWithBiometric()
    
    console.log('✅ Authentication successful!')
    console.log(`   • Credential ID: ${credential.id.substring(0, 20)}...`)
    console.log(`   • Authenticator: ${credential.authenticatorAttachment || 'unknown'}`)
    
    return credential
    
  } catch (error: any) {
    console.error('❌ Authentication failed:', error.message || error)
    if (error.code) {
      console.error(`   • Error Code: ${error.code}`)
      console.error(`   • Suggested Action: ${error.suggestedAction}`)
    }
    throw error
  }
}

// Convenience function to run all tests
export async function runBiometricTests() {
  try {
    // Test capabilities
    const capabilities = await testBiometricCapabilities()
    
    // Only proceed with registration/auth tests if biometrics are supported
    if (capabilities.isPlatformAuthenticatorAvailable && capabilities.biometricTypes.length > 0) {
      // Test registration
      await testBiometricRegistration()
      
      // Test authentication
      await testBiometricAuthentication()
      
      console.log('\n🎉 All biometric tests completed successfully!')
    } else {
      console.log('\n⏭️  Skipping registration/authentication tests due to lack of biometric support')
    }
    
  } catch (error) {
    console.error('\n💥 Biometric test suite failed:', error)
  }
}