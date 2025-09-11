#!/usr/bin/env node

/**
 * FacePay Backend API Server
 * Production-ready Express server for biometric authentication
 * 
 * Features:
 * - WebAuthn biometric authentication
 * - JWT session management
 * - Rate limiting and security
 * - Merchant dashboard API
 * - PostgreSQL database integration
 * - Comprehensive error handling
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const merchantRoutes = require('./routes/merchant');

// Import middleware
const securityMiddleware = require('./middleware/security');

const app = express();
const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Initialize Prisma client
const prisma = new PrismaClient({
  log: NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  errorFormat: 'pretty',
});

// Test database connection
async function initializeDatabase() {
  try {
    await prisma.$connect();
    console.log(`✅ Database connected successfully`);
    
    // Test query
    const userCount = await prisma.user.count();
    console.log(`📊 Database status: ${userCount} users registered`);
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('   Please ensure PostgreSQL is running and DATABASE_URL is correct');
    process.exit(1);
  }
}

// Security configuration
const securityConfig = {
  rateLimits: {
    default: { windowMs: 15 * 60 * 1000, max: 100 }, // 100 requests per 15 minutes
    auth: { windowMs: 15 * 60 * 1000, max: 10 },     // 10 auth attempts per 15 minutes
    payment: { windowMs: 15 * 60 * 1000, max: 20 },  // 20 payment requests per 15 minutes
    health: { windowMs: 60 * 1000, max: 60 }         // 60 health checks per minute
  },
  cors: {
    origin: NODE_ENV === 'production' 
      ? [
          'https://facepay.app',
          'https://www.facepay.app',
          process.env.NEXT_PUBLIC_APP_URL,
          process.env.FRONTEND_URL
        ].filter(Boolean)
      : [
          'http://localhost:3000',
          'https://localhost:3000',
          'http://127.0.0.1:3000',
          process.env.NEXT_PUBLIC_APP_URL
        ].filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-API-Key']
  }
};

// Logging configuration
const logFormat = NODE_ENV === 'production' 
  ? 'combined' 
  : ':method :url :status :res[content-length] - :response-time ms';

// Global middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.stripe.com"],
      frameSrc: ["https://js.stripe.com", "https://hooks.stripe.com"]
    }
  },
  hsts: NODE_ENV === 'production' ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  } : false
}));

app.use(compression());
app.use(morgan(logFormat));
app.use(cors(securityConfig.cors));

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check rate limiting
const healthRateLimit = rateLimit(securityConfig.rateLimits.health);

// Default rate limiting for API routes
const apiRateLimit = rateLimit({
  ...securityConfig.rateLimits.default,
  message: {
    success: false,
    error: 'Too many requests. Please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to API routes
app.use('/api', apiRateLimit);

// Request logging middleware
app.use((req, res, next) => {
  req.requestId = Math.random().toString(36).substr(2, 9);
  req.startTime = Date.now();
  
  // Log incoming requests in development
  if (NODE_ENV === 'development') {
    console.log(`🌐 [${req.requestId}] ${req.method} ${req.path} - ${req.ip}`);
  }
  
  next();
});

// Add Prisma to request context
app.use((req, res, next) => {
  req.prisma = prisma;
  next();
});

// Health check endpoint
app.get('/api/health', healthRateLimit, async (req, res) => {
  try {
    const healthCheck = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      database: 'disconnected',
      memory: process.memoryUsage(),
      pid: process.pid
    };

    // Check database connectivity
    try {
      await prisma.$queryRaw`SELECT 1 as health`;
      healthCheck.database = 'connected';
    } catch (dbError) {
      healthCheck.database = 'error';
      healthCheck.databaseError = dbError.message;
    }

    // Return appropriate status code
    const statusCode = healthCheck.database === 'connected' ? 200 : 503;
    
    res.status(statusCode).json({
      success: statusCode === 200,
      data: healthCheck
    });
    
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      success: false,
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// API Routes
app.use('/api', authRoutes);
app.use('/api', merchantRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'FacePay API Server',
    version: process.env.npm_package_version || '1.0.0',
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      auth: {
        enroll: 'POST /api/enroll',
        authenticateStart: 'POST /api/authenticate/start',
        authenticateVerify: 'POST /api/authenticate/verify'
      },
      merchant: {
        verify: 'GET /api/verify/:token',
        dashboard: 'GET /api/merchant/dashboard'
      }
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err, req, res, next) => {
  const requestId = req.requestId || 'unknown';
  const statusCode = err.status || err.statusCode || 500;
  
  console.error(`❌ [${requestId}] Error:`, {
    message: err.message,
    stack: NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.method !== 'GET' ? req.body : undefined
  });

  // Don't leak error details in production
  const errorResponse = {
    success: false,
    error: NODE_ENV === 'production' && statusCode === 500 
      ? 'Internal server error' 
      : err.message,
    requestId,
    timestamp: new Date().toISOString()
  };

  if (NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
    errorResponse.details = err;
  }

  res.status(statusCode).json(errorResponse);
});

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('🔄 SIGTERM received, shutting down gracefully...');
  await gracefulShutdown();
});

process.on('SIGINT', async () => {
  console.log('🔄 SIGINT received, shutting down gracefully...');
  await gracefulShutdown();
});

async function gracefulShutdown() {
  console.log('📊 Shutting down HTTP server...');
  
  try {
    // Close database connection
    await prisma.$disconnect();
    console.log('🗄️  Database connection closed');
    
    // Exit process
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

// Start server
async function startServer() {
  try {
    // Initialize database
    await initializeDatabase();
    
    // Start HTTP server
    const server = app.listen(PORT, () => {
      console.log('');
      console.log('🚀 FacePay API Server Started');
      console.log('================================');
      console.log(`📍 Port: ${PORT}`);
      console.log(`🌍 Environment: ${NODE_ENV}`);
      console.log(`🔗 URL: http://localhost:${PORT}`);
      console.log(`💚 Health: http://localhost:${PORT}/api/health`);
      console.log(`📊 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
      console.log('');
      console.log('Available Endpoints:');
      console.log('  POST   /api/enroll');
      console.log('  POST   /api/authenticate/start');
      console.log('  POST   /api/authenticate/verify');
      console.log('  GET    /api/verify/:token');
      console.log('  GET    /api/merchant/dashboard');
      console.log('');
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
        process.exit(1);
      } else {
        console.error('❌ Server error:', error);
        process.exit(1);
      }
    });

    return server;
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  startServer().catch(console.error);
}

module.exports = { app, prisma, startServer };