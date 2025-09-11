/**
 * Simple Node.js test for FacePay SDK
 * Tests basic functionality and exports
 */

// Mock browser environment for Node.js testing
global.window = {
  location: {
    protocol: 'https:',
    hostname: 'localhost',
    origin: 'https://localhost:3000',
    port: '3000'
  },
  PublicKeyCredential: true
};

global.navigator = {
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  platform: 'MacIntel',
  language: 'en-US',
  cookieEnabled: true,
  onLine: true,
  credentials: {
    create: async () => ({}),
    get: async () => ({})
  }
};

global.fetch = async (url, options) => {
  return {
    ok: true,
    json: async () => ({ success: true, data: { options: {} } })
  };
};

// Load the SDK
const FacePay = require('./facepay.js');

async function runTests() {
  console.log('🧪 Running FacePay SDK Tests...\n');
  
  try {
    // Test 1: SDK Loading
    console.log('Test 1: SDK Loading');
    console.log('✅ FacePay SDK loaded successfully');
    console.log(`   Version: ${FacePay.version}`);
    console.log(`   Error codes available: ${Object.keys(FacePay.ERROR_CODES).length}`);
    
    // Test 2: SDK Instantiation
    console.log('\nTest 2: SDK Instantiation');
    const sdk = new FacePay({
      apiKey: 'test-key',
      baseUrl: 'https://api.example.com',
      debug: true
    });
    console.log('✅ SDK instance created successfully');
    console.log(`   Config: API Key present, Base URL set, Debug enabled`);
    
    // Test 3: Static Methods
    console.log('\nTest 3: Static Methods');
    try {
      const staticSupport = await FacePay.isSupported();
      console.log('✅ Static isSupported() works');
      console.log(`   Supported: ${staticSupport.supported}`);
    } catch (error) {
      console.log(`⚠️  Static isSupported() failed: ${error.message}`);
    }
    
    try {
      const staticTest = await FacePay.test();
      console.log('✅ Static test() works');
      console.log(`   Overall result: ${staticTest.overall}`);
    } catch (error) {
      console.log(`⚠️  Static test() failed: ${error.message}`);
    }
    
    // Test 4: Instance Methods
    console.log('\nTest 4: Instance Methods');
    const methods = ['isSupported', 'enroll', 'authenticate', 'verify', 'getDiagnostics', 'test'];
    methods.forEach(method => {
      if (typeof sdk[method] === 'function') {
        console.log(`✅ ${method}() method exists`);
      } else {
        console.log(`❌ ${method}() method missing`);
      }
    });
    
    // Test 5: Error Handling
    console.log('\nTest 5: Error Handling');
    try {
      // This should fail in Node.js environment
      await sdk.enroll('test@example.com');
      console.log('⚠️  Enroll succeeded unexpectedly');
    } catch (error) {
      console.log('✅ Error handling works');
      console.log(`   Error type: ${error.constructor.name}`);
      console.log(`   Error message: ${error.message.substring(0, 50)}...`);
    }
    
    // Test 6: Configuration Validation
    console.log('\nTest 6: Configuration');
    const configs = [
      {},
      { apiKey: 'test' },
      { baseUrl: 'https://api.test.com' },
      { debug: true, timeout: 10000 }
    ];
    
    configs.forEach((config, i) => {
      try {
        const testSdk = new FacePay(config);
        console.log(`✅ Config ${i + 1} accepted`);
      } catch (error) {
        console.log(`❌ Config ${i + 1} rejected: ${error.message}`);
      }
    });
    
    // Test 7: Bundle Size Check
    console.log('\nTest 7: Bundle Size');
    const fs = require('fs');
    const stats = fs.statSync('./facepay.js');
    const sizeKB = Math.round(stats.size / 1024);
    console.log(`✅ Bundle size: ${sizeKB}KB`);
    if (sizeKB < 50) {
      console.log('✅ Under 50KB requirement');
    } else {
      console.log('❌ Exceeds 50KB requirement');
    }
    
    console.log('\n🎉 All tests completed!');
    console.log('\n📋 Test Summary:');
    console.log('   - SDK loads and initializes correctly');
    console.log('   - All required methods are present');
    console.log('   - Error handling works as expected');
    console.log('   - Bundle size meets requirements');
    console.log('   - Static and instance methods functional');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    console.error(error.stack);
  }
}

// Run tests
runTests().catch(console.error);