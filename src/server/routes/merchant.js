/**
 * Merchant Dashboard Routes
 * API endpoints for merchant verification and dashboard functionality
 * 
 * Endpoints:
 * - GET /verify/:token - Verify token for merchants
 * - GET /merchant/dashboard - Get merchant dashboard data
 * - GET /merchant/transactions - Get merchant transaction history
 * - POST /merchant/refund - Process refund
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const { param, query, body, validationResult } = require('express-validator');
const crypto = require('crypto');

const router = express.Router();

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET;

// Rate limiting for merchant endpoints
const merchantRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests to merchant API. Please try again later.',
    retryAfter: 900
  }
});

const verifyRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Allow frequent token verification
  message: {
    success: false,
    error: 'Too many verification requests. Please try again later.',
    retryAfter: 60
  }
});

// JWT Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('JWT verification failed:', error.message);
    return res.status(403).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
}

// Validation middleware
const validateToken = [
  param('token')
    .isJWT()
    .withMessage('Valid JWT token is required')
];

const validateTransactionQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .toInt()
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .toInt()
    .withMessage('Limit must be between 1 and 100'),
  query('status')
    .optional()
    .isIn(['pending', 'completed', 'failed', 'refunded'])
    .withMessage('Invalid transaction status'),
  query('startDate')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Start date must be a valid ISO date'),
  query('endDate')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('End date must be a valid ISO date')
];

const validateRefund = [
  body('transactionId')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Transaction ID is required'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Refund amount must be greater than 0'),
  body('reason')
    .isString()
    .isLength({ min: 5, max: 500 })
    .withMessage('Refund reason must be between 5 and 500 characters')
];

// Helper function to handle validation errors
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
}

// Helper function to calculate transaction statistics
function calculateTransactionStats(transactions) {
  const stats = {
    total: transactions.length,
    totalAmount: 0,
    avgAmount: 0,
    statusBreakdown: {
      pending: 0,
      completed: 0,
      failed: 0,
      refunded: 0
    },
    recentActivity: transactions.slice(0, 5).map(tx => ({
      id: tx.id,
      amount: tx.amount.toString(),
      status: tx.status,
      createdAt: tx.createdAt,
      description: tx.description
    }))
  };

  transactions.forEach(tx => {
    stats.totalAmount += parseFloat(tx.amount.toString());
    stats.statusBreakdown[tx.status] = (stats.statusBreakdown[tx.status] || 0) + 1;
  });

  stats.avgAmount = stats.total > 0 ? stats.totalAmount / stats.total : 0;
  
  return stats;
}

/**
 * GET /api/verify/:token
 * Verify JWT token for merchants and return user information
 */
router.get('/verify/:token', verifyRateLimit, validateToken, handleValidationErrors, async (req, res) => {
  const requestId = req.requestId;
  
  try {
    const { token } = req.params;
    const prisma = req.prisma;

    console.log(`[${requestId}] Token verification request for token: ${token.substring(0, 20)}...`);

    // Verify and decode token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      console.log(`[${requestId}] Token verification failed:`, error.message);
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
        expired: error.name === 'TokenExpiredError',
        invalid: error.name === 'JsonWebTokenError'
      });
    }

    // Find user in database
    const user = await prisma.user.findUnique({
      where: { 
        id: decoded.userId,
        isActive: true,
        deletedAt: null
      },
      select: {
        id: true,
        email: true,
        name: true,
        creditBalance: true,
        lastLoginAt: true,
        createdAt: true,
        webauthnCredentials: {
          where: {
            isActive: true,
            deletedAt: null
          },
          select: {
            id: true,
            deviceType: true,
            deviceName: true,
            lastUsedAt: true,
            createdAt: true
          }
        }
      }
    });

    if (!user) {
      console.log(`[${requestId}] User not found or inactive: ${decoded.userId}`);
      return res.status(404).json({
        success: false,
        error: 'User not found or account inactive'
      });
    }

    // Log verification
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        tableName: 'users',
        recordId: user.id,
        action: 'TOKEN_VERIFIED',
        newValues: {
          verifiedAt: new Date(),
          ip: req.ip,
          userAgent: req.get('User-Agent')
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    console.log(`[${requestId}] Token verified successfully for user: ${user.id}`);

    res.status(200).json({
      success: true,
      data: {
        valid: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          creditBalance: user.creditBalance.toString(),
          lastLoginAt: user.lastLoginAt,
          memberSince: user.createdAt
        },
        session: {
          issuedAt: new Date(decoded.iat * 1000),
          expiresAt: new Date(decoded.exp * 1000),
          timeRemaining: Math.max(0, decoded.exp - Math.floor(Date.now() / 1000))
        },
        credentials: user.webauthnCredentials.length,
        biometricEnabled: user.webauthnCredentials.length > 0
      },
      message: 'Token verified successfully'
    });

  } catch (error) {
    console.error(`[${requestId}] Token verification error:`, error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error during token verification',
      requestId
    });
  }
});

/**
 * GET /api/merchant/dashboard
 * Get comprehensive dashboard data for authenticated user
 */
router.get('/merchant/dashboard', merchantRateLimit, authenticateToken, async (req, res) => {
  const requestId = req.requestId;
  
  try {
    const prisma = req.prisma;
    const userId = req.user.userId;

    console.log(`[${requestId}] Dashboard request for user: ${userId}`);

    // Get user with related data
    const user = await prisma.user.findUnique({
      where: { 
        id: userId,
        isActive: true 
      },
      include: {
        transactions: {
          where: {
            isActive: true,
            deletedAt: null
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 50, // Latest 50 transactions
          include: {
            paymentMethod: {
              select: {
                type: true,
                provider: true,
                nickname: true
              }
            }
          }
        },
        paymentMethods: {
          where: {
            isActive: true,
            deletedAt: null
          },
          select: {
            id: true,
            type: true,
            provider: true,
            nickname: true,
            isDefault: true,
            lastUsedAt: true,
            expiresAt: true
          }
        },
        webauthnCredentials: {
          where: {
            isActive: true,
            deletedAt: null
          },
          select: {
            id: true,
            deviceType: true,
            deviceName: true,
            lastUsedAt: true,
            createdAt: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Calculate transaction statistics
    const transactionStats = calculateTransactionStats(user.transactions);

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentTransactions = user.transactions.filter(
      tx => tx.createdAt >= thirtyDaysAgo
    );

    const monthlyStats = calculateTransactionStats(recentTransactions);

    // Calculate credit balance in MXN (assuming 100 credits = 1 MXN)
    const creditBalanceMXN = parseFloat(user.creditBalance.toString()) / 100;

    // Build dashboard data
    const dashboardData = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        memberSince: user.createdAt,
        lastLoginAt: user.lastLoginAt
      },
      balance: {
        credits: user.creditBalance.toString(),
        mxn: creditBalanceMXN.toFixed(2),
        formatted: `$${creditBalanceMXN.toFixed(2)} MXN`
      },
      transactions: {
        total: transactionStats.total,
        totalAmount: transactionStats.totalAmount.toFixed(2),
        avgAmount: transactionStats.avgAmount.toFixed(2),
        statusBreakdown: transactionStats.statusBreakdown,
        recentActivity: transactionStats.recentActivity,
        monthly: {
          count: monthlyStats.total,
          amount: monthlyStats.totalAmount.toFixed(2),
          avgAmount: monthlyStats.avgAmount.toFixed(2)
        }
      },
      paymentMethods: {
        total: user.paymentMethods.length,
        active: user.paymentMethods.filter(pm => pm.isDefault || pm.lastUsedAt).length,
        methods: user.paymentMethods.map(pm => ({
          id: pm.id,
          type: pm.type,
          provider: pm.provider,
          nickname: pm.nickname,
          isDefault: pm.isDefault,
          lastUsedAt: pm.lastUsedAt,
          expired: pm.expiresAt && pm.expiresAt < new Date()
        }))
      },
      security: {
        biometricEnabled: user.webauthnCredentials.length > 0,
        credentialsCount: user.webauthnCredentials.length,
        lastBiometricLogin: user.webauthnCredentials.reduce((latest, cred) => {
          return cred.lastUsedAt && (!latest || cred.lastUsedAt > latest) 
            ? cred.lastUsedAt 
            : latest;
        }, null),
        devices: user.webauthnCredentials.map(cred => ({
          id: cred.id,
          name: cred.deviceName,
          type: cred.deviceType,
          lastUsedAt: cred.lastUsedAt,
          enrolledAt: cred.createdAt
        }))
      }
    };

    // Log dashboard access
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        tableName: 'users',
        recordId: user.id,
        action: 'DASHBOARD_ACCESSED',
        newValues: {
          transactionsCount: transactionStats.total,
          creditBalance: user.creditBalance.toString(),
          ip: req.ip,
          userAgent: req.get('User-Agent')
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    console.log(`[${requestId}] Dashboard data retrieved for user: ${userId}`);

    res.status(200).json({
      success: true,
      data: dashboardData,
      message: 'Dashboard data retrieved successfully'
    });

  } catch (error) {
    console.error(`[${requestId}] Dashboard error:`, error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error while loading dashboard',
      requestId
    });
  }
});

/**
 * GET /api/merchant/transactions
 * Get paginated transaction history with filters
 */
router.get('/merchant/transactions', merchantRateLimit, authenticateToken, validateTransactionQuery, handleValidationErrors, async (req, res) => {
  const requestId = req.requestId;
  
  try {
    const prisma = req.prisma;
    const userId = req.user.userId;
    
    // Query parameters with defaults
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    const offset = (page - 1) * limit;

    console.log(`[${requestId}] Transaction query for user ${userId}:`, {
      page, limit, status, startDate, endDate
    });

    // Build where clause
    const whereClause = {
      userId,
      isActive: true,
      deletedAt: null
    };

    if (status) {
      whereClause.status = status;
    }

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = startDate;
      if (endDate) whereClause.createdAt.lte = endDate;
    }

    // Get transactions with pagination
    const [transactions, totalCount] = await Promise.all([
      prisma.transaction.findMany({
        where: whereClause,
        orderBy: {
          createdAt: 'desc'
        },
        skip: offset,
        take: limit,
        include: {
          paymentMethod: {
            select: {
              type: true,
              provider: true,
              nickname: true
            }
          },
          refunds: {
            where: { isActive: true },
            select: {
              id: true,
              amount: true,
              status: true,
              reason: true,
              createdAt: true
            }
          }
        }
      }),
      prisma.transaction.count({ where: whereClause })
    ]);

    // Format transactions
    const formattedTransactions = transactions.map(tx => ({
      id: tx.id,
      amount: tx.amount.toString(),
      currency: tx.currency,
      status: tx.status,
      description: tx.description,
      reference: tx.reference,
      fee: tx.fee?.toString(),
      createdAt: tx.createdAt,
      completedAt: tx.completedAt,
      paymentMethod: tx.paymentMethod,
      refunds: tx.refunds,
      hasRefunds: tx.refunds.length > 0,
      totalRefunded: tx.refunds.reduce((sum, refund) => 
        sum + parseFloat(refund.amount.toString()), 0
      ).toFixed(2)
    }));

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    console.log(`[${requestId}] Retrieved ${transactions.length} transactions (page ${page}/${totalPages})`);

    res.status(200).json({
      success: true,
      data: {
        transactions: formattedTransactions,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNext,
          hasPrev,
          nextPage: hasNext ? page + 1 : null,
          prevPage: hasPrev ? page - 1 : null
        },
        filters: {
          status,
          startDate,
          endDate
        }
      },
      message: `Retrieved ${transactions.length} transactions`
    });

  } catch (error) {
    console.error(`[${requestId}] Transaction query error:`, error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error while retrieving transactions',
      requestId
    });
  }
});

/**
 * POST /api/merchant/refund
 * Process a refund for a transaction
 */
router.post('/merchant/refund', merchantRateLimit, authenticateToken, validateRefund, handleValidationErrors, async (req, res) => {
  const requestId = req.requestId;
  
  try {
    const prisma = req.prisma;
    const userId = req.user.userId;
    const { transactionId, amount, reason } = req.body;

    console.log(`[${requestId}] Refund request for transaction ${transactionId}: ${amount}`);

    // Find the transaction
    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId,
        isActive: true,
        deletedAt: null
      },
      include: {
        refunds: {
          where: { isActive: true }
        }
      }
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found or not accessible'
      });
    }

    if (transaction.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Only completed transactions can be refunded'
      });
    }

    // Calculate total already refunded
    const totalRefunded = transaction.refunds.reduce((sum, refund) => 
      sum + parseFloat(refund.amount.toString()), 0
    );

    const remainingAmount = parseFloat(transaction.amount.toString()) - totalRefunded;

    if (amount > remainingAmount) {
      return res.status(400).json({
        success: false,
        error: `Refund amount exceeds remaining refundable amount of ${remainingAmount.toFixed(2)}`
      });
    }

    // Create refund record
    const refund = await prisma.refund.create({
      data: {
        transactionId: transaction.id,
        amount: amount,
        reason: reason,
        status: 'pending',
        reference: `REF-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`.toUpperCase(),
        metadata: {
          requestedBy: userId,
          originalAmount: transaction.amount.toString(),
          previousRefunds: totalRefunded
        }
      }
    });

    // Log refund creation
    await prisma.auditLog.create({
      data: {
        userId,
        tableName: 'refunds',
        recordId: refund.id,
        action: 'REFUND_REQUESTED',
        newValues: {
          transactionId,
          amount,
          reason,
          reference: refund.reference,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    console.log(`[${requestId}] Refund created: ${refund.id} for ${amount}`);

    res.status(201).json({
      success: true,
      data: {
        refund: {
          id: refund.id,
          amount: refund.amount.toString(),
          status: refund.status,
          reason: refund.reason,
          reference: refund.reference,
          createdAt: refund.createdAt
        },
        transaction: {
          id: transaction.id,
          originalAmount: transaction.amount.toString(),
          totalRefunded: (totalRefunded + amount).toFixed(2),
          remainingRefundable: (remainingAmount - amount).toFixed(2)
        }
      },
      message: 'Refund request submitted successfully'
    });

  } catch (error) {
    console.error(`[${requestId}] Refund processing error:`, error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error while processing refund',
      requestId
    });
  }
});

module.exports = router;