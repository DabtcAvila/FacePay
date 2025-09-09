import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(),
    }
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

// Mock environment variables
process.env.NEXTAUTH_SECRET = 'test-secret'
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.STRIPE_SECRET_KEY = 'sk_test_...'
process.env.JWT_SECRET = 'test-jwt-secret'

// Mock Web APIs
global.fetch = jest.fn()

// Mock WebAuthn API
Object.defineProperty(global, 'PublicKeyCredential', {
  value: jest.fn(),
  writable: true,
})

Object.defineProperty(global.navigator, 'credentials', {
  value: {
    create: jest.fn(),
    get: jest.fn(),
  },
  writable: true,
})

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks()
})