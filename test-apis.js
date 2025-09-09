#!/usr/bin/env node

/**
 * FacePay API Test Script
 * 
 * This script tests all the main API endpoints to ensure they're working correctly.
 * Run with: node test-apis.js
 * 
 * Make sure the server is running on localhost:3000 before running this script.
 */

const axios = require('axios')

const BASE_URL = 'http://localhost:3000/api'
let authToken = null
let userId = null

// Test configuration
const testUser = {
  email: `test-${Date.now()}@example.com`,
  name: 'Test User',
  password: 'testpassword123'
}

async function log(message, data = null) {
  console.log(`✅ ${message}`)
  if (data) console.log('   Response:', JSON.stringify(data, null, 2))
  console.log('')
}

async function logError(message, error) {
  console.log(`❌ ${message}`)
  console.log('   Error:', error.response?.data || error.message)
  console.log('')
}

async function testHealthCheck() {
  try {
    const response = await axios.get(`${BASE_URL}/health`)
    await log('Health check passed', response.data)
    return true
  } catch (error) {
    await logError('Health check failed', error)
    return false
  }
}

async function testUserRegistration() {
  try {
    const response = await axios.post(`${BASE_URL}/auth/register`, testUser)
    authToken = response.data.data.tokens.accessToken
    userId = response.data.data.user.id
    await log('User registration passed', { 
      user: response.data.data.user,
      hasToken: !!authToken 
    })
    return true
  } catch (error) {
    await logError('User registration failed', error)
    return false
  }
}

async function testUserLogin() {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    })
    await log('User login passed', { 
      user: response.data.data.user,
      hasToken: !!response.data.data.tokens.accessToken 
    })
    return true
  } catch (error) {
    await logError('User login failed', error)
    return false
  }
}

async function testGetProfile() {
  try {
    const response = await axios.get(`${BASE_URL}/users/profile`, {
      headers: { Authorization: `Bearer ${authToken}` }
    })
    await log('Get profile passed', response.data.data)
    return true
  } catch (error) {
    await logError('Get profile failed', error)
    return false
  }
}

async function testStoreFaceData() {
  try {
    const faceData = Buffer.from('fake-face-template-data').toString('base64')
    const response = await axios.post(`${BASE_URL}/biometric/face`, {
      faceData,
      replaceExisting: true
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    })
    await log('Store face data passed', response.data.data)
    return true
  } catch (error) {
    await logError('Store face data failed', error)
    return false
  }
}

async function testVerifyFaceData() {
  try {
    const faceData = Buffer.from('fake-face-template-data').toString('base64')
    const response = await axios.put(`${BASE_URL}/biometric/face`, {
      faceData,
      threshold: 0.8
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    })
    await log('Verify face data passed', response.data.data)
    return true
  } catch (error) {
    await logError('Verify face data failed', error)
    return false
  }
}

async function testGetPaymentMethods() {
  try {
    const response = await axios.get(`${BASE_URL}/payments/methods`, {
      headers: { Authorization: `Bearer ${authToken}` }
    })
    await log('Get payment methods passed', response.data.data)
    return true
  } catch (error) {
    await logError('Get payment methods failed', error)
    return false
  }
}

async function testGetTransactions() {
  try {
    const response = await axios.get(`${BASE_URL}/transactions?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${authToken}` }
    })
    await log('Get transactions passed', response.data.data)
    return true
  } catch (error) {
    await logError('Get transactions failed', error)
    return false
  }
}

async function testGetAnalytics() {
  try {
    const response = await axios.get(`${BASE_URL}/analytics/stats`, {
      headers: { Authorization: `Bearer ${authToken}` }
    })
    await log('Get analytics stats passed', response.data.data.overview)
    return true
  } catch (error) {
    await logError('Get analytics stats failed', error)
    return false
  }
}

async function testTokenRefresh() {
  try {
    // First get a refresh token from login
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    })
    
    const refreshToken = loginResponse.data.data.tokens.refreshToken
    
    const response = await axios.post(`${BASE_URL}/auth/refresh`, {
      refreshToken
    })
    
    await log('Token refresh passed', {
      hasNewAccessToken: !!response.data.data.tokens.accessToken,
      hasNewRefreshToken: !!response.data.data.tokens.refreshToken
    })
    return true
  } catch (error) {
    await logError('Token refresh failed', error)
    return false
  }
}

async function runTests() {
  console.log('🚀 Starting FacePay API Tests...\n')
  
  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'User Registration', fn: testUserRegistration },
    { name: 'User Login', fn: testUserLogin },
    { name: 'Get Profile', fn: testGetProfile },
    { name: 'Store Face Data', fn: testStoreFaceData },
    { name: 'Verify Face Data', fn: testVerifyFaceData },
    { name: 'Get Payment Methods', fn: testGetPaymentMethods },
    { name: 'Get Transactions', fn: testGetTransactions },
    { name: 'Get Analytics', fn: testGetAnalytics },
    { name: 'Token Refresh', fn: testTokenRefresh },
  ]
  
  let passed = 0
  let failed = 0
  
  for (const test of tests) {
    console.log(`🧪 Testing: ${test.name}`)
    const result = await test.fn()
    if (result) {
      passed++
    } else {
      failed++
    }
  }
  
  console.log('📊 Test Results:')
  console.log(`   ✅ Passed: ${passed}`)
  console.log(`   ❌ Failed: ${failed}`)
  console.log(`   📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`)
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Your FacePay API is working correctly.')
  } else {
    console.log(`\n⚠️  ${failed} test(s) failed. Check the errors above.`)
    process.exit(1)
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message)
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason)
  process.exit(1)
})

// Run the tests
runTests().catch(error => {
  console.error('❌ Test suite failed:', error.message)
  process.exit(1)
})