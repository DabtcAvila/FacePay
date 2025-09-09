import '@testing-library/jest-dom'

// Mock basic Web APIs that might be needed
global.fetch = jest.fn()

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
process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000'

// Mock Web APIs (skip if already mocked above)

// Mock WebAuthn API
Object.defineProperty(global, 'PublicKeyCredential', {
  value: jest.fn(() => ({
    isUserVerifyingPlatformAuthenticatorAvailable: jest.fn(),
  })),
  writable: true,
})

Object.defineProperty(global.navigator, 'credentials', {
  value: {
    create: jest.fn(),
    get: jest.fn(),
  },
  writable: true,
  configurable: true,
})

// Mock window for client-side components (skip if already defined by JSDOM)
if (typeof global.window !== 'undefined' && global.window.location) {
  // JSDOM window exists, just add missing properties
  if (!global.window.PublicKeyCredential) {
    global.window.PublicKeyCredential = {
      isUserVerifyingPlatformAuthenticatorAvailable: jest.fn(),
    }
  }
}

// Mock media APIs for component tests
Object.defineProperty(global.HTMLMediaElement.prototype, 'play', {
  value: jest.fn(() => Promise.resolve()),
  writable: true,
})

Object.defineProperty(global.HTMLVideoElement.prototype, 'play', {
  value: jest.fn(() => Promise.resolve()),
  writable: true,
})

Object.defineProperty(global.HTMLMediaElement.prototype, 'pause', {
  value: jest.fn(),
  writable: true,
})

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks()
})