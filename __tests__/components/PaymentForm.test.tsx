import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PaymentForm from '@/components/PaymentForm'

// Mock FaceScanAnimation component
jest.mock('@/components/FaceScanAnimation', () => {
  return function MockFaceScanAnimation({ isScanning, onScanComplete, size }: any) {
    return (
      <div data-testid="face-scan-animation" data-size={size}>
        {isScanning ? 'Scanning...' : 'Ready to scan'}
        {isScanning && (
          <button onClick={onScanComplete} data-testid="complete-scan-button">
            Complete Scan
          </button>
        )}
      </div>
    )
  }
})

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    form: ({ children, ...props }: any) => <form {...props}>{children}</form>,
    svg: ({ children, ...props }: any) => <svg {...props}>{children}</svg>,
    path: ({ children, ...props }: any) => <path {...props}>{children}</path>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// Mock fetch
global.fetch = jest.fn()

describe('PaymentForm', () => {
  const mockOnPaymentComplete = jest.fn()
  const defaultProps = {
    amount: 100.50,
    recipient: 'John Doe',
    onPaymentComplete: mockOnPaymentComplete,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn().mockReturnValue('mock-token'),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
    })
  })

  it('renders payment form with correct amount and recipient', () => {
    render(<PaymentForm {...defaultProps} />)
    
    expect(screen.getByText('Secure Payment')).toBeInTheDocument()
    expect(screen.getByText('100.50')).toBeInTheDocument()
    expect(screen.getByText('To: John Doe')).toBeInTheDocument()
  })

  it('renders without recipient when not provided', () => {
    render(<PaymentForm amount={50.25} onPaymentComplete={mockOnPaymentComplete} />)
    
    expect(screen.getByText('50.25')).toBeInTheDocument()
    expect(screen.queryByText(/To:/)).not.toBeInTheDocument()
  })

  it('allows user to enter payment description', async () => {
    const user = userEvent.setup()
    render(<PaymentForm {...defaultProps} />)
    
    const descriptionInput = screen.getByPlaceholderText("What's this payment for?")
    await user.type(descriptionInput, 'Test payment description')
    
    expect(descriptionInput).toHaveValue('Test payment description')
  })

  it('defaults to biometric payment method', () => {
    render(<PaymentForm {...defaultProps} />)
    
    const biometricOption = screen.getByText('Biometric Verification').closest('div')
    expect(biometricOption).toHaveClass('border-blue-500', 'bg-blue-50')
  })

  it('allows switching to credit card payment method', async () => {
    const user = userEvent.setup()
    render(<PaymentForm {...defaultProps} />)
    
    const cardOption = screen.getByText('Credit Card').closest('div')
    await user.click(cardOption!)
    
    expect(cardOption).toHaveClass('border-blue-500', 'bg-blue-50')
  })

  it('proceeds to verification step with biometric payment', async () => {
    const user = userEvent.setup()
    render(<PaymentForm {...defaultProps} />)
    
    const proceedButton = screen.getByText('Proceed to Payment')
    await user.click(proceedButton)
    
    expect(screen.getByText('Biometric Verification')).toBeInTheDocument()
    expect(screen.getByText('Look at the camera and stay still')).toBeInTheDocument()
    expect(screen.getByTestId('face-scan-animation')).toBeInTheDocument()
  })

  it('handles face scan completion flow', async () => {
    const user = userEvent.setup()
    render(<PaymentForm {...defaultProps} />)
    
    // Start payment process
    await user.click(screen.getByText('Proceed to Payment'))
    
    // Complete face scan
    const completeScanButton = screen.getByTestId('complete-scan-button')
    await user.click(completeScanButton)
    
    // Should show processing step
    expect(screen.getByText('Processing Payment')).toBeInTheDocument()
    expect(screen.getByText('Securing your transaction...')).toBeInTheDocument()
    
    // Wait for completion
    await waitFor(() => {
      expect(screen.getByText('Payment Successful!')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    expect(mockOnPaymentComplete).toHaveBeenCalledWith({
      amount: 100.50,
      method: 'biometric',
      timestamp: expect.any(Date),
      recipient: 'John Doe',
    })
  })

  it('handles Stripe checkout flow', async () => {
    const user = userEvent.setup()
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        data: { sessionUrl: 'https://checkout.stripe.com/session-123' }
      })
    }
    
    ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)
    
    // Mock window.location.href
    delete (window as any).location
    ;(window as any).location = { href: '' }
    
    render(<PaymentForm {...defaultProps} />)
    
    // Switch to credit card
    const cardOption = screen.getByText('Credit Card').closest('div')
    await user.click(cardOption!)
    
    // Proceed to payment
    await user.click(screen.getByText('Proceed to Payment'))
    
    // Should show processing
    expect(screen.getByText('Processing Payment')).toBeInTheDocument()
    
    // Verify API call
    expect(global.fetch).toHaveBeenCalledWith('/api/payments/stripe/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-token',
      },
      body: JSON.stringify({
        amount: 100.50,
        description: 'FacePay Payment',
        metadata: {
          recipient: 'John Doe',
          paymentMethod: 'stripe_checkout',
        },
      }),
    })
  })

  it('handles Stripe checkout failure', async () => {
    const user = userEvent.setup()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
    })
    
    render(<PaymentForm {...defaultProps} />)
    
    // Switch to credit card
    const cardOption = screen.getByText('Credit Card').closest('div')
    await user.click(cardOption!)
    
    // Proceed to payment
    await user.click(screen.getByText('Proceed to Payment'))
    
    // Should return to details step on error
    await waitFor(() => {
      expect(screen.getByText('Proceed to Payment')).toBeInTheDocument()
    })
  })

  it('displays correct payment steps indicator', () => {
    render(<PaymentForm {...defaultProps} />)
    
    const steps = ['Details', 'Verify', 'Process', 'Complete']
    steps.forEach(step => {
      expect(screen.getByText(step)).toBeInTheDocument()
    })
    
    // First step should be active
    const detailsStep = screen.getByText('Details').previousElementSibling
    expect(detailsStep).toHaveStyle('background-color: rgb(59, 130, 246)')
  })

  it('shows security notice during biometric verification', async () => {
    const user = userEvent.setup()
    render(<PaymentForm {...defaultProps} />)
    
    await user.click(screen.getByText('Proceed to Payment'))
    
    expect(screen.getByText('Your biometric data is processed securely and never stored')).toBeInTheDocument()
  })

  it('displays transaction details during processing', async () => {
    const user = userEvent.setup()
    render(<PaymentForm {...defaultProps} />)
    
    // Add description
    const descriptionInput = screen.getByPlaceholderText("What's this payment for?")
    await user.type(descriptionInput, 'Test payment')
    
    // Start payment
    await user.click(screen.getByText('Proceed to Payment'))
    await user.click(screen.getByTestId('complete-scan-button'))
    
    // Check processing details
    expect(screen.getByText('$100.50')).toBeInTheDocument()
    expect(screen.getByText('Biometric')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('shows transaction summary on completion', async () => {
    const user = userEvent.setup()
    render(<PaymentForm {...defaultProps} />)
    
    // Complete payment flow
    await user.click(screen.getByText('Proceed to Payment'))
    await user.click(screen.getByTestId('complete-scan-button'))
    
    await waitFor(() => {
      expect(screen.getByText('Payment Successful!')).toBeInTheDocument()
      expect(screen.getByText('$100.50')).toBeInTheDocument()
      expect(screen.getByText(/TXN/)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('allows starting new payment after completion', async () => {
    const user = userEvent.setup()
    render(<PaymentForm {...defaultProps} />)
    
    // Complete payment flow
    await user.click(screen.getByText('Proceed to Payment'))
    await user.click(screen.getByTestId('complete-scan-button'))
    
    await waitFor(() => {
      expect(screen.getByText('Payment Successful!')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    // Start new payment
    await user.click(screen.getByText('New Payment'))
    
    expect(screen.getByText('Proceed to Payment')).toBeInTheDocument()
  })

  it('includes description in Stripe checkout when provided', async () => {
    const user = userEvent.setup()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { sessionUrl: 'test-url' } })
    })
    
    render(<PaymentForm {...defaultProps} />)
    
    // Add description and switch to credit card
    await user.type(screen.getByPlaceholderText("What's this payment for?"), 'Custom description')
    await user.click(screen.getByText('Credit Card').closest('div')!)
    await user.click(screen.getByText('Proceed to Payment'))
    
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/payments/stripe/checkout',
      expect.objectContaining({
        body: expect.stringContaining('Custom description')
      })
    )
  })
})