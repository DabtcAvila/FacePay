import { NextRequest, NextResponse } from 'next/server'

// Compression middleware for API routes and static assets
export function compressionMiddleware(request: NextRequest) {
  const response = NextResponse.next()

  // Set compression headers
  const acceptEncoding = request.headers.get('accept-encoding') || ''
  
  // Enable Brotli compression (preferred)
  if (acceptEncoding.includes('br')) {
    response.headers.set('Content-Encoding', 'br')
  }
  // Fallback to gzip
  else if (acceptEncoding.includes('gzip')) {
    response.headers.set('Content-Encoding', 'gzip')
  }

  // Set Vary header for caching
  response.headers.set('Vary', 'Accept-Encoding')

  // Compression hints for different content types
  const pathname = request.nextUrl.pathname
  const contentType = getContentType(pathname)

  if (contentType) {
    response.headers.set('Content-Type', contentType)
    
    // Set compression level based on content type
    if (shouldCompress(pathname, contentType)) {
      response.headers.set('X-Compression-Level', getCompressionLevel(contentType))
    }
  }

  return response
}

function getContentType(pathname: string): string | null {
  const extension = pathname.split('.').pop()?.toLowerCase()
  
  const contentTypeMap: Record<string, string> = {
    'html': 'text/html; charset=utf-8',
    'css': 'text/css; charset=utf-8',
    'js': 'application/javascript; charset=utf-8',
    'mjs': 'application/javascript; charset=utf-8',
    'json': 'application/json; charset=utf-8',
    'xml': 'application/xml; charset=utf-8',
    'svg': 'image/svg+xml',
    'txt': 'text/plain; charset=utf-8',
    'md': 'text/markdown; charset=utf-8',
    'woff': 'font/woff',
    'woff2': 'font/woff2',
    'ttf': 'font/ttf',
    'eot': 'application/vnd.ms-fontobject',
    'webp': 'image/webp',
    'avif': 'image/avif',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'ico': 'image/x-icon',
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'pdf': 'application/pdf',
    'zip': 'application/zip',
  }

  return contentTypeMap[extension || ''] || null
}

function shouldCompress(pathname: string, contentType: string): boolean {
  // Don't compress already compressed files
  const compressedExtensions = [
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif',
    '.mp4', '.webm', '.mp3', '.wav',
    '.zip', '.gz', '.br',
    '.woff', '.woff2'
  ]
  
  if (compressedExtensions.some(ext => pathname.endsWith(ext))) {
    return false
  }

  // Compress text-based content
  const compressibleTypes = [
    'text/',
    'application/javascript',
    'application/json',
    'application/xml',
    'image/svg+xml'
  ]

  return compressibleTypes.some(type => contentType.startsWith(type))
}

function getCompressionLevel(contentType: string): string {
  // High compression for text content
  if (contentType.startsWith('text/') || contentType.includes('json')) {
    return '9' // Maximum compression
  }
  
  // Medium compression for JavaScript and CSS
  if (contentType.includes('javascript') || contentType.includes('css')) {
    return '6' // Balanced compression
  }
  
  // Low compression for other content
  return '3'
}

// Minification helpers
export class AssetOptimizer {
  // Minify CSS on the fly (basic)
  static minifyCSS(css: string): string {
    return css
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
      .replace(/\s{2,}/g, ' ') // Remove extra whitespace
      .replace(/;\s*}/g, '}') // Remove semicolon before closing brace
      .replace(/\s*{\s*/g, '{') // Remove spaces around braces
      .replace(/;\s*/g, ';') // Remove spaces after semicolons
      .trim()
  }

  // Minify JavaScript (basic - in production use a proper minifier)
  static minifyJS(js: string): string {
    return js
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
      .replace(/\/\/.*$/gm, '') // Remove single-line comments
      .replace(/^\s+|\s+$/gm, '') // Trim lines
      .replace(/\n{2,}/g, '\n') // Remove extra newlines
      .replace(/\s*([{}();,])\s*/g, '$1') // Remove spaces around operators
      .trim()
  }

  // Optimize HTML
  static minifyHTML(html: string): string {
    return html
      .replace(/<!--[\s\S]*?-->/g, '') // Remove comments
      .replace(/\s{2,}/g, ' ') // Remove extra whitespace
      .replace(/>\s+</g, '><') // Remove whitespace between tags
      .trim()
  }

  // Generate optimized font loading CSS
  static generateFontCSS(fontFamilies: string[]): string {
    const fontFaceRules = fontFamilies.map(family => `
      @font-face {
        font-family: '${family}';
        font-display: swap;
        font-style: normal;
        font-weight: 400;
        src: local('${family}'), url('/fonts/${family.toLowerCase().replace(/\s+/g, '-')}.woff2') format('woff2');
      }
    `).join('')

    return this.minifyCSS(fontFaceRules)
  }
}

// Resource hints generator
export class ResourceHints {
  static generatePreloadHeaders(resources: Array<{
    href: string,
    as: string,
    type?: string,
    crossorigin?: boolean
  }>): string {
    return resources.map(resource => {
      let link = `<${resource.href}>; rel=preload; as=${resource.as}`
      
      if (resource.type) {
        link += `; type=${resource.type}`
      }
      
      if (resource.crossorigin) {
        link += '; crossorigin=anonymous'
      }
      
      return link
    }).join(', ')
  }

  static generatePrefetchHeaders(urls: string[]): string {
    return urls.map(url => `<${url}>; rel=prefetch`).join(', ')
  }

  static generatePreconnectHeaders(origins: string[]): string {
    return origins.map(origin => `<${origin}>; rel=preconnect`).join(', ')
  }

  // Critical resource preloading for FacePay
  static getFacePayCriticalResources() {
    return [
      { href: '/fonts/inter-var.woff2', as: 'font', type: 'font/woff2', crossorigin: true },
      { href: '/css/critical.css', as: 'style', type: 'text/css' },
      { href: '/_next/static/chunks/main.js', as: 'script', type: 'application/javascript' },
    ]
  }

  static getFacePayPrefetchResources() {
    return [
      '/api/health',
      '/api/users/profile',
      '/dashboard',
    ]
  }

  static getFacePayPreconnectOrigins() {
    return [
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
      'https://api.stripe.com',
    ]
  }
}

// Performance monitoring for compression
export class CompressionMetrics {
  private static metrics = new Map<string, {
    originalSize: number
    compressedSize: number
    compressionRatio: number
    requests: number
  }>()

  static recordCompression(
    path: string, 
    originalSize: number, 
    compressedSize: number
  ) {
    const existing = this.metrics.get(path) || {
      originalSize: 0,
      compressedSize: 0,
      compressionRatio: 0,
      requests: 0
    }

    existing.originalSize += originalSize
    existing.compressedSize += compressedSize
    existing.requests++
    existing.compressionRatio = (existing.originalSize - existing.compressedSize) / existing.originalSize

    this.metrics.set(path, existing)
  }

  static getMetrics() {
    return Array.from(this.metrics.entries()).map(([path, metrics]) => ({
      path,
      ...metrics,
      savings: metrics.originalSize - metrics.compressedSize
    }))
  }

  static getTotalSavings() {
    let totalOriginal = 0
    let totalCompressed = 0

    for (const metrics of this.metrics.values()) {
      totalOriginal += metrics.originalSize
      totalCompressed += metrics.compressedSize
    }

    return {
      originalSize: totalOriginal,
      compressedSize: totalCompressed,
      savings: totalOriginal - totalCompressed,
      ratio: totalOriginal > 0 ? (totalOriginal - totalCompressed) / totalOriginal : 0
    }
  }
}

export default compressionMiddleware