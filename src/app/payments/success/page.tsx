'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface PaymentDetails {
  sessionId: string
  paymentStatus: string
  customerEmail: string
  amountTotal: number
  currency: string
  transactionId: string
}

function PaymentSuccessContent() {
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    const fetchPaymentDetails = async () => {
      if (!sessionId) {
        setError('No session ID provided')
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/payments/stripe/checkout?session_id=${sessionId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          },
        })

        if (!response.ok) {
          throw new Error('Failed to fetch payment details')
        }

        const data = await response.json()
        setPaymentDetails(data.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchPaymentDetails()
  }, [sessionId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Processing your payment...</h2>
          <p className="text-gray-600">Please wait while we verify your transaction.</p>
        </div>
      </div>
    )
  }

  if (error || !paymentDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <XCircle className="w-12 h-12 mx-auto mb-4 text-red-600" />
          <h2 className="text-xl font-semibold text-gray-900">Payment Error</h2>
          <p className="text-gray-600 mb-6">{error || 'Unable to retrieve payment details'}</p>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    )
  }

  const isPaymentSuccessful = paymentDetails.paymentStatus === 'paid'
  const amountFormatted = (paymentDetails.amountTotal / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: paymentDetails.currency.toUpperCase(),
  })

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
        <div className="text-center">
          {isPaymentSuccessful ? (
            <>
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-600" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
              <p className="text-gray-600 mb-6">
                Thank you for your payment. Your transaction has been processed successfully.
              </p>
            </>
          ) : (
            <>
              <XCircle className="w-16 h-16 mx-auto mb-4 text-yellow-600" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Processing</h1>
              <p className="text-gray-600 mb-6">
                Your payment is being processed. You will receive a confirmation email shortly.
              </p>
            </>
          )}

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Amount:</span>
                <span className="font-semibold">{amountFormatted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Transaction ID:</span>
                <span className="font-mono text-xs">{paymentDetails.transactionId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`font-semibold capitalize ${
                  isPaymentSuccessful ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  {paymentDetails.paymentStatus}
                </span>
              </div>
              {paymentDetails.customerEmail && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-semibold">{paymentDetails.customerEmail}</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Loading payment details...</h2>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  )
}