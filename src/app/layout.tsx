import type { Metadata, Viewport } from 'next'
import { Inter, Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'

// Configure fonts for modern appearance
const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-plus-jakarta',
})

// Enhanced metadata configuration
export const metadata: Metadata = {
  title: {
    default: 'FacePay - Biometric Payment Platform',
    template: '%s | FacePay'
  },
  description: 'Secure payments with facial recognition and biometric authentication. Experience the future of contactless transactions with advanced WebAuthn technology.',
  keywords: [
    'facepay',
    'biometric payments',
    'facial recognition',
    'webauthn',
    'contactless payments',
    'secure authentication',
    'mobile payments',
    'fintech',
    'digital wallet'
  ],
  authors: [{ name: 'FacePay Team' }],
  creator: 'FacePay',
  publisher: 'FacePay',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://facepay.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'FacePay - Biometric Payment Platform',
    description: 'Secure payments with facial recognition and biometric authentication',
    siteName: 'FacePay',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'FacePay - Biometric Payment Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FacePay - Biometric Payment Platform',
    description: 'Secure payments with facial recognition and biometric authentication',
    images: ['/og-image.png'],
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FacePay',
    startupImage: [
      '/apple-touch-startup-image-768x1004.png',
      {
        url: '/apple-touch-startup-image-1536x2008.png',
        media: '(device-width: 768px) and (device-height: 1024px)',
      },
    ],
  },
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      {
        rel: 'mask-icon',
        url: '/safari-pinned-tab.svg',
      },
    ],
  },
}

// Separate viewport configuration for better control
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#2563eb' },
    { media: '(prefers-color-scheme: dark)', color: '#1e40af' }
  ],
  colorScheme: 'light dark',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* PWA Meta Tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="FacePay" />
        <meta name="application-name" content="FacePay" />
        <meta name="msapplication-TileColor" content="#2563eb" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        
        {/* Prevent automatic detection and formatting of possible phone numbers */}
        <meta name="format-detection" content="telephone=no, date=no, email=no, address=no" />
        
        {/* Optimize for mobile web apps */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-status-bar-style" content="black-translucent" />
        
        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* DNS Prefetch for common external resources */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />
      </head>
      <body 
        className={`${inter.variable} ${plusJakartaSans.variable} font-inter antialiased`}
        suppressHydrationWarning
      >
        {/* Main app container with responsive design and safe areas */}
        <div className="relative min-h-screen bg-background text-foreground">
          {/* Mobile safe area support */}
          <div className="mobile-safe-area">
            {/* App content with proper mobile optimizations */}
            <main className="relative min-h-screen mobile-scroll">
              {children}
            </main>
          </div>
          
          {/* Viewport height fix for mobile browsers */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                // Fix for mobile viewport height issues
                function setViewportHeight() {
                  const vh = window.innerHeight * 0.01;
                  document.documentElement.style.setProperty('--vh', vh + 'px');
                }
                setViewportHeight();
                window.addEventListener('resize', setViewportHeight);
                window.addEventListener('orientationchange', setViewportHeight);
              `,
            }}
          />
        </div>
      </body>
    </html>
  )
}