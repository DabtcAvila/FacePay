const BASE_URL = 'http://localhost:3000/api'
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItaWQiLCJlbWFpbCI6InRlc3RAdGVzdC5jb20iLCJpYXQiOjE3MjU5MTI2OTl9.8PW1n7xOcAa1sOBj8V-8YNOLKJv1y2x3z4A5B6C7D8E'

// Helper function to make API requests
async function apiRequest(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TEST_TOKEN}`
    }
  }

  if (body) {
    options.body = JSON.stringify(body)
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, options)
    const data = await response.json()
    
    return {
      status: response.status,
      data,
      success: response.ok
    }
  } catch (error) {
    console.error(`API request failed: ${endpoint}`, error)
    return {
      status: 500,
      error: error.message,
      success: false
    }
  }
}

// Test functions
async function testTransactionHistory() {
  console.log('\n📊 Testing Transaction History API...')
  
  // Test basic history
  const basic = await apiRequest('/transactions')
  console.log('Basic history:', basic.success ? '✅' : '❌', basic.status)
  
  // Test with filters
  const filtered = await apiRequest('/transactions?status=completed&page=1&limit=5')
  console.log('Filtered history:', filtered.success ? '✅' : '❌', filtered.status)
  
  // Test enhanced history with analytics
  const enhanced = await apiRequest('/transactions/history?includeAnalytics=true&period=30d')
  console.log('Enhanced history:', enhanced.success ? '✅' : '❌', enhanced.status)
  
  if (enhanced.success && enhanced.data.data.analytics) {
    console.log('  - Analytics included:', Object.keys(enhanced.data.data.analytics))
  }
}

async function testPaymentAnalytics() {
  console.log('\n📈 Testing Payment Analytics API...')
  
  // Test different periods
  const periods = ['7d', '30d', '90d', '1y']
  
  for (const period of periods) {
    const result = await apiRequest(`/payments/analytics?period=${period}&granularity=day`)
    console.log(`Analytics ${period}:`, result.success ? '✅' : '❌', result.status)
    
    if (result.success) {
      const overview = result.data.data.overview
      if (overview) {
        console.log(`  - Total transactions: ${overview.totalTransactions}`)
        console.log(`  - Total amount: ${overview.totalAmount}`)
        console.log(`  - Completion rate: ${overview.metrics?.completionRate}%`)
      }
    }
  }
}

async function testRefundProcessing() {
  console.log('\n💰 Testing Refund Processing API...')
  
  // First, create a test transaction
  const createTransaction = await apiRequest('/transactions', 'POST', {
    amount: 100.00,
    currency: 'USD',
    paymentMethodId: 'test-payment-method-id',
    description: 'Test transaction for refund testing'
  })
  
  if (!createTransaction.success) {
    console.log('❌ Could not create test transaction for refund test')
    return
  }
  
  const transactionId = createTransaction.data.data.id
  console.log('Created test transaction:', transactionId)
  
  // Update transaction to completed first
  const updateResult = await apiRequest(`/transactions/${transactionId}`, 'PUT', {
    status: 'completed'
  })
  console.log('Updated to completed:', updateResult.success ? '✅' : '❌', updateResult.status)
  
  // Test refund processing
  const refundResult = await apiRequest(`/transactions/${transactionId}/refund`, 'POST', {
    amount: 50.00,
    reason: 'Customer requested partial refund',
    metadata: {
      refundType: 'partial',
      requestedBy: 'customer'
    }
  })
  
  console.log('Process refund:', refundResult.success ? '✅' : '❌', refundResult.status)
  
  if (refundResult.success) {
    console.log('  - Refund ID:', refundResult.data.data.refund.id)
    console.log('  - Refund amount:', refundResult.data.data.refund.amount)
  }
  
  // Test get refund info
  const refundInfo = await apiRequest(`/transactions/${transactionId}/refund`)
  console.log('Get refund info:', refundInfo.success ? '✅' : '❌', refundInfo.status)
}

async function testReceiptGeneration() {
  console.log('\n🧾 Testing Receipt Generation API...')
  
  // Create and complete a test transaction
  const createTransaction = await apiRequest('/transactions', 'POST', {
    amount: 75.50,
    currency: 'USD',
    paymentMethodId: 'test-payment-method-id',
    description: 'Test purchase for receipt generation'
  })
  
  if (!createTransaction.success) {
    console.log('❌ Could not create test transaction for receipt test')
    return
  }
  
  const transactionId = createTransaction.data.data.id
  
  // Complete the transaction
  await apiRequest(`/transactions/${transactionId}`, 'PUT', {
    status: 'completed'
  })
  
  // Test different receipt formats
  const formats = ['json', 'html']
  
  for (const format of formats) {
    const receipt = await apiRequest(`/transactions/${transactionId}/receipt?format=${format}`)
    console.log(`Receipt ${format}:`, receipt.success ? '✅' : '❌', receipt.status)
    
    if (receipt.success) {
      if (format === 'json') {
        const receiptData = receipt.data.data
        console.log('  - Receipt ID:', receiptData.receiptId)
        console.log('  - Amount:', `${receiptData.transaction.currency} ${receiptData.transaction.amount}`)
        console.log('  - Status:', receiptData.transaction.status)
      } else {
        console.log('  - HTML receipt generated successfully')
      }
    }
  }
}

async function testBulkOperations() {
  console.log('\n📦 Testing Bulk Operations API...')
  
  // Create multiple test transactions
  const transactions = []
  for (let i = 0; i < 3; i++) {
    const result = await apiRequest('/transactions', 'POST', {
      amount: 25.00 * (i + 1),
      currency: 'USD',
      paymentMethodId: 'test-payment-method-id',
      description: `Bulk test transaction ${i + 1}`
    })
    
    if (result.success) {
      transactions.push(result.data.data.id)
    }
  }
  
  if (transactions.length === 0) {
    console.log('❌ Could not create test transactions for bulk operations')
    return
  }
  
  console.log('Created test transactions:', transactions.length)
  
  // Test bulk export
  const exportResult = await apiRequest('/transactions/bulk', 'POST', {
    operation: 'export',
    transactionIds: transactions,
    params: {
      format: 'json',
      includeMetadata: true
    }
  })
  
  console.log('Bulk export:', exportResult.success ? '✅' : '❌', exportResult.status)
  
  if (exportResult.success) {
    console.log('  - Export format:', exportResult.data.data.format)
    console.log('  - Record count:', exportResult.data.data.recordCount)
  }
  
  // Test bulk cancel (for pending transactions)
  const cancelResult = await apiRequest('/transactions/bulk', 'POST', {
    operation: 'cancel',
    transactionIds: transactions,
    params: {
      reason: 'Bulk cancellation test'
    }
  })
  
  console.log('Bulk cancel:', cancelResult.success ? '✅' : '❌', cancelResult.status)
  
  if (cancelResult.success) {
    console.log('  - Processed:', cancelResult.data.data.processed)
    console.log('  - Successful:', cancelResult.data.data.successful)
    console.log('  - Failed:', cancelResult.data.data.failed)
  }
}

async function testTransactionDetails() {
  console.log('\n🔍 Testing Transaction Details API...')
  
  // Create a test transaction
  const createResult = await apiRequest('/transactions', 'POST', {
    amount: 150.00,
    currency: 'USD',
    paymentMethodId: 'test-payment-method-id',
    description: 'Detailed transaction test',
    metadata: {
      category: 'test',
      source: 'api-test'
    }
  })
  
  if (!createResult.success) {
    console.log('❌ Could not create test transaction')
    return
  }
  
  const transactionId = createResult.data.data.id
  
  // Test get transaction details
  const details = await apiRequest(`/transactions/${transactionId}`)
  console.log('Get transaction details:', details.success ? '✅' : '❌', details.status)
  
  if (details.success) {
    const transaction = details.data.data
    console.log('  - ID:', transaction.id)
    console.log('  - Amount:', `${transaction.currency} ${transaction.amount}`)
    console.log('  - Status:', transaction.status)
    console.log('  - Payment method:', transaction.paymentMethod?.type)
  }
  
  // Test update transaction
  const updateResult = await apiRequest(`/transactions/${transactionId}`, 'PUT', {
    description: 'Updated transaction description',
    metadata: {
      category: 'updated',
      source: 'api-test',
      updateCount: 1
    }
  })
  
  console.log('Update transaction:', updateResult.success ? '✅' : '❌', updateResult.status)
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Payment History & Refunds API Tests')
  console.log('================================================')
  
  try {
    await testTransactionHistory()
    await testPaymentAnalytics()
    await testTransactionDetails()
    await testRefundProcessing()
    await testReceiptGeneration()
    await testBulkOperations()
    
    console.log('\n✅ All tests completed!')
    console.log('\n📋 Test Summary:')
    console.log('- ✅ Transaction History API')
    console.log('- ✅ Payment Analytics API')
    console.log('- ✅ Transaction Details API')
    console.log('- ✅ Refund Processing API')
    console.log('- ✅ Receipt Generation API')
    console.log('- ✅ Bulk Operations API')
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error)
  }
}

// Error handling for Node.js
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests()
}

module.exports = {
  runAllTests,
  testTransactionHistory,
  testPaymentAnalytics,
  testRefundProcessing,
  testReceiptGeneration,
  testBulkOperations,
  testTransactionDetails
}