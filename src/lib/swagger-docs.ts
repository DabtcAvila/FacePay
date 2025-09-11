/**
 * @swagger
 * /api/health:
 *   get:
 *     tags:
 *       - Health
 *     summary: Health check endpoint
 *     description: Returns the current status and health metrics of the FacePay API
 *     operationId: getHealthStatus
 *     responses:
 *       200:
 *         description: API is healthy and operational
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: 2024-01-01T12:00:00Z
 *                 uptime:
 *                   type: number
 *                   description: Server uptime in seconds
 *                   example: 12345.67
 *                 version:
 *                   type: string
 *                   example: 1.0.0
 *                 environment:
 *                   type: string
 *                   example: production
 *       503:
 *         description: API is unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: User authentication
 *     description: |
 *       Authenticate a user with email and password credentials.
 *       Returns JWT tokens and user information on successful authentication.
 *       
 *       **Security Features:**
 *       - Rate limiting (10 requests per minute per IP)
 *       - Account lockout after 5 failed attempts
 *       - IP-based threat detection
 *       - Session tracking and anomaly detection
 *       
 *       **Response includes:**
 *       - Access token (expires in 1 hour)
 *       - Refresh token (expires in 30 days)
 *       - User profile information
 *       - Session ID for tracking
 *     operationId: authenticateUser
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           examples:
 *             standard_login:
 *               summary: Standard user login
 *               description: Regular user authentication with email and password
 *               value:
 *                 email: john.doe@example.com
 *                 password: securepassword123
 *             demo_login:
 *               summary: Demo account login
 *               description: Demo account for testing purposes
 *               value:
 *                 email: demo@facepay.com
 *                 password: demo123456
 *     responses:
 *       200:
 *         description: Authentication successful
 *         headers:
 *           X-Session-ID:
 *             description: Unique session identifier
 *             schema:
 *               type: string
 *           X-Rate-Limit-Remaining:
 *             description: Number of requests remaining in the current window
 *             schema:
 *               type: integer
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AuthResponse'
 *             examples:
 *               successful_login:
 *                 summary: Successful authentication response
 *                 value:
 *                   success: true
 *                   data:
 *                     user:
 *                       id: clp1abc123def456ghi789
 *                       email: john.doe@example.com
 *                       name: John Doe
 *                       createdAt: "2024-01-01T12:00:00Z"
 *                       updatedAt: "2024-01-15T10:30:00Z"
 *                       lastLogin: "2024-01-15T10:30:00Z"
 *                     tokens:
 *                       accessToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbHAxYWJjMTIzZGVmNDU2Z2hpNzg5IiwiaWF0IjoxNzA1MzE0NjAwLCJleHAiOjE3MDUzMTgyMDB9.signature
 *                       refreshToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbHAxYWJjMTIzZGVmNDU2Z2hpNzg5IiwiaWF0IjoxNzA1MzE0NjAwLCJleHAiOjE3MDc5MDY2MDB9.signature
 *                       expiresIn: 3600
 *                     sessionId: sess_abc123def456ghi789
 *                   message: Login successful
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *             examples:
 *               missing_fields:
 *                 summary: Missing required fields
 *                 value:
 *                   success: false
 *                   error: Validation failed
 *                   code: VALIDATION_ERROR
 *                   details:
 *                     - field: email
 *                       message: Email is required
 *                     - field: password
 *                       message: Password is required
 *               invalid_email:
 *                 summary: Invalid email format
 *                 value:
 *                   success: false
 *                   error: Validation failed
 *                   code: VALIDATION_ERROR
 *                   details:
 *                     - field: email
 *                       message: Invalid email format
 *       401:
 *         description: Authentication failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               invalid_credentials:
 *                 summary: Invalid email or password
 *                 value:
 *                   success: false
 *                   error: Invalid credentials
 *                   code: UNAUTHORIZED
 *               account_locked:
 *                 summary: Account temporarily locked
 *                 value:
 *                   success: false
 *                   error: Account temporarily locked due to multiple failed login attempts
 *                   code: ACCOUNT_LOCKED
 *                   details:
 *                     unlockAt: "2024-01-15T11:00:00Z"
 *       403:
 *         description: Request blocked due to security concerns
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               ip_blocked:
 *                 summary: IP address blocked
 *                 value:
 *                   success: false
 *                   error: Request blocked due to security concerns
 *                   code: IP_BLOCKED
 *       429:
 *         description: Too many login attempts
 *         headers:
 *           X-Rate-Limit-Reset:
 *             description: Time when the rate limit resets
 *             schema:
 *               type: integer
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               error: Too many login attempts. Please try again later.
 *               code: RATE_LIMIT_EXCEEDED
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @swagger
 * /api/payments/stripe/checkout:
 *   post:
 *     tags:
 *       - Payments
 *     summary: Create Stripe checkout session
 *     description: |
 *       Create a new Stripe checkout session for secure payment processing.
 *       This endpoint handles both one-time payments and subscription setups.
 *       
 *       **Payment Flow:**
 *       1. Create checkout session with this endpoint
 *       2. Redirect user to the returned `sessionUrl`
 *       3. User completes payment on Stripe's secure checkout page
 *       4. Stripe redirects back to your `successUrl` or `cancelUrl`
 *       5. Use webhook to handle payment completion
 *       
 *       **Features:**
 *       - Automatic customer creation/retrieval
 *       - Support for multiple payment methods
 *       - Subscription and one-time payment modes
 *       - Custom metadata support
 *       - Automatic transaction record creation
 *       
 *     operationId: createStripeCheckoutSession
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCheckoutSessionRequest'
 *           examples:
 *             one_time_payment:
 *               summary: One-time product payment
 *               description: Standard one-time payment for a product or service
 *               value:
 *                 amount: 29.99
 *                 currency: USD
 *                 description: Premium Feature Access
 *                 successUrl: https://yourapp.com/payment/success?session_id={CHECKOUT_SESSION_ID}
 *                 cancelUrl: https://yourapp.com/payment/cancel
 *                 paymentMethodTypes: [card]
 *                 mode: payment
 *                 metadata:
 *                   product_id: premium_features
 *                   user_tier: premium
 *             subscription_setup:
 *               summary: Subscription setup
 *               description: Setup recurring subscription billing
 *               value:
 *                 amount: 9.99
 *                 currency: USD
 *                 description: Monthly Premium Subscription
 *                 successUrl: https://yourapp.com/subscription/success
 *                 cancelUrl: https://yourapp.com/subscription/cancel
 *                 paymentMethodTypes: [card]
 *                 mode: subscription
 *                 metadata:
 *                   plan: premium_monthly
 *                   billing_cycle: monthly
 *             large_payment:
 *               summary: Large payment with multiple methods
 *               description: High-value transaction with multiple payment options
 *               value:
 *                 amount: 999.99
 *                 currency: USD
 *                 description: Enterprise License
 *                 paymentMethodTypes: [card, us_bank_account]
 *                 mode: payment
 *                 metadata:
 *                   license_type: enterprise
 *                   seats: 50
 *     responses:
 *       200:
 *         description: Checkout session created successfully
 *         headers:
 *           X-Transaction-ID:
 *             description: Internal transaction identifier
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/CheckoutSessionResponse'
 *             examples:
 *               checkout_created:
 *                 summary: Successful checkout session creation
 *                 value:
 *                   success: true
 *                   data:
 *                     sessionId: cs_test_a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8s9T0
 *                     sessionUrl: https://checkout.stripe.com/pay/cs_test_a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8s9T0
 *                     transactionId: txn_facepay_abc123def456
 *                     customerId: cus_stripe_def456ghi789
 *                   message: Checkout session created successfully
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *             examples:
 *               invalid_amount:
 *                 summary: Invalid payment amount
 *                 value:
 *                   success: false
 *                   error: Validation failed
 *                   code: VALIDATION_ERROR
 *                   details:
 *                     - field: amount
 *                       message: Amount must be greater than 0
 *               invalid_currency:
 *                 summary: Unsupported currency
 *                 value:
 *                   success: false
 *                   error: Validation failed
 *                   code: VALIDATION_ERROR
 *                   details:
 *                     - field: currency
 *                       message: Currency must be a valid 3-letter ISO code
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               error: User not found
 *               code: USER_NOT_FOUND
 *       500:
 *         description: Payment processing error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               stripe_error:
 *                 summary: Stripe API error
 *                 value:
 *                   success: false
 *                   error: Failed to create checkout session
 *                   code: PAYMENT_PROVIDER_ERROR
 *                   details:
 *                     provider: stripe
 *                     providerError: Your card was declined.
 */

/**
 * @swagger
 * /api/webauthn/register/start:
 *   post:
 *     tags:
 *       - WebAuthn
 *     summary: Initiate WebAuthn credential registration
 *     description: |
 *       Start the biometric credential registration process for the authenticated user.
 *       This endpoint generates a cryptographic challenge that the client will use
 *       to create new biometric credentials (Face ID, Touch ID, Windows Hello, etc.).
 *       
 *       **WebAuthn Registration Flow:**
 *       1. Call this endpoint to get registration options
 *       2. Use the browser's WebAuthn API with the returned challenge
 *       3. Complete registration with `/webauthn/register/complete`
 *       
 *       **Security Features:**
 *       - Cryptographically secure challenge generation
 *       - Support for multiple authenticator types
 *       - Platform-specific credential requirements
 *       - Anti-phishing protection via origin verification
 *       
 *       **Supported Authenticators:**
 *       - Face ID (iOS/macOS)
 *       - Touch ID (iOS/macOS)
 *       - Windows Hello (Windows)
 *       - Android Biometric (Android)
 *       - Hardware security keys (YubiKey, etc.)
 *       
 *     operationId: startWebAuthnRegistration
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               authenticatorSelection:
 *                 type: object
 *                 description: Preferred authenticator characteristics
 *                 properties:
 *                   authenticatorAttachment:
 *                     type: string
 *                     enum: [platform, cross-platform]
 *                     description: Platform (built-in) or cross-platform (external) authenticator
 *                     example: platform
 *                   userVerification:
 *                     type: string
 *                     enum: [required, preferred, discouraged]
 *                     description: User verification requirement
 *                     example: required
 *                   residentKey:
 *                     type: string
 *                     enum: [required, preferred, discouraged]
 *                     description: Resident key requirement
 *                     example: preferred
 *               attestation:
 *                 type: string
 *                 enum: [none, indirect, direct, enterprise]
 *                 description: Attestation level required
 *                 example: none
 *           examples:
 *             platform_biometric:
 *               summary: Platform biometric (Face/Touch ID)
 *               description: Register platform authenticator like Face ID or Touch ID
 *               value:
 *                 authenticatorSelection:
 *                   authenticatorAttachment: platform
 *                   userVerification: required
 *                   residentKey: preferred
 *                 attestation: none
 *             security_key:
 *               summary: External security key
 *               description: Register external security key like YubiKey
 *               value:
 *                 authenticatorSelection:
 *                   authenticatorAttachment: cross-platform
 *                   userVerification: discouraged
 *                   residentKey: discouraged
 *                 attestation: direct
 *     responses:
 *       200:
 *         description: Registration options generated successfully
 *         headers:
 *           X-Challenge-ID:
 *             description: Unique challenge identifier for tracking
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/PublicKeyCredentialCreationOptions'
 *             examples:
 *               registration_options:
 *                 summary: WebAuthn registration options
 *                 value:
 *                   success: true
 *                   data:
 *                     challenge: dGhpcyBpcyBhIGNoYWxsZW5nZQ
 *                     rp:
 *                       name: FacePay
 *                       id: facepay.com
 *                     user:
 *                       id: dXNlcl9hYmMxMjM
 *                       name: john.doe@example.com
 *                       displayName: John Doe
 *                     pubKeyCredParams:
 *                       - alg: -7
 *                         type: public-key
 *                       - alg: -35
 *                         type: public-key
 *                       - alg: -36
 *                         type: public-key
 *                       - alg: -257
 *                         type: public-key
 *                       - alg: -258
 *                         type: public-key
 *                       - alg: -259
 *                         type: public-key
 *                     timeout: 60000
 *                     attestation: none
 *                     authenticatorSelection:
 *                       authenticatorAttachment: platform
 *                       userVerification: required
 *                       residentKey: preferred
 *                     excludeCredentials: []
 *                   message: Registration challenge created
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Biometric registration not allowed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               max_credentials:
 *                 summary: Maximum credentials reached
 *                 value:
 *                   success: false
 *                   error: Maximum number of biometric credentials reached
 *                   code: MAX_CREDENTIALS_EXCEEDED
 *                   details:
 *                     maxCredentials: 5
 *                     currentCount: 5
 *               account_restricted:
 *                 summary: Account restricted
 *                 value:
 *                   success: false
 *                   error: Account restricted from biometric registration
 *                   code: ACCOUNT_RESTRICTED
 *       500:
 *         description: Challenge generation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               error: Failed to generate registration challenge
 *               code: CHALLENGE_GENERATION_FAILED
 */

/**
 * @swagger
 * /api/transactions:
 *   get:
 *     tags:
 *       - Transactions
 *     summary: Get paginated transaction history
 *     description: |
 *       Retrieve the authenticated user's transaction history with powerful filtering,
 *       sorting, and pagination capabilities.
 *       
 *       **Features:**
 *       - Comprehensive filtering by status, date range, amount
 *       - Multiple sorting options
 *       - Efficient pagination
 *       - Payment method details included
 *       - Real-time data consistency
 *       
 *       **Performance:**
 *       - Results are cached for 30 seconds
 *       - Maximum 100 items per page
 *       - Indexed queries for optimal performance
 *       - Automatic data pagination for large datasets
 *       
 *       **Use Cases:**
 *       - Transaction history dashboard
 *       - Financial reporting
 *       - Audit trails
 *       - User account statements
 *       
 *     operationId: getUserTransactions
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - name: status
 *         in: query
 *         description: Filter transactions by status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [pending, completed, failed, refunded]
 *         examples:
 *           completed:
 *             summary: Completed transactions only
 *             value: completed
 *           pending:
 *             summary: Pending transactions only
 *             value: pending
 *       - $ref: '#/components/parameters/SortParam'
 *       - $ref: '#/components/parameters/SortOrderParam'
 *       - name: dateFrom
 *         in: query
 *         description: Start date for filtering (ISO 8601 format)
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         example: 2024-01-01
 *       - name: dateTo
 *         in: query
 *         description: End date for filtering (ISO 8601 format)
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         example: 2024-01-31
 *       - name: amountMin
 *         in: query
 *         description: Minimum transaction amount
 *         required: false
 *         schema:
 *           type: number
 *           minimum: 0
 *         example: 10.00
 *       - name: amountMax
 *         in: query
 *         description: Maximum transaction amount
 *         required: false
 *         schema:
 *           type: number
 *           minimum: 0
 *         example: 1000.00
 *       - name: currency
 *         in: query
 *         description: Filter by currency code
 *         required: false
 *         schema:
 *           type: string
 *           minLength: 3
 *           maxLength: 3
 *         example: USD
 *       - name: paymentMethod
 *         in: query
 *         description: Filter by payment method type
 *         required: false
 *         schema:
 *           type: string
 *           enum: [card, bank_account, crypto, biometric]
 *         example: card
 *     responses:
 *       200:
 *         description: Transactions retrieved successfully
 *         headers:
 *           X-Total-Count:
 *             description: Total number of transactions matching filters
 *             schema:
 *               type: integer
 *           X-Page-Count:
 *             description: Total number of pages available
 *             schema:
 *               type: integer
 *           Cache-Control:
 *             description: Cache control directives
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/TransactionListResponse'
 *             examples:
 *               transaction_history:
 *                 summary: User transaction history
 *                 description: Paginated list of user transactions with full details
 *                 value:
 *                   success: true
 *                   data:
 *                     transactions:
 *                       - id: txn_abc123def456
 *                         userId: usr_def456ghi789
 *                         amount: 29.99
 *                         currency: USD
 *                         status: completed
 *                         paymentMethodId: pm_stripe_xyz789
 *                         description: Premium Feature Access
 *                         metadata:
 *                           product_id: premium_features
 *                           session_id: sess_abc123
 *                         createdAt: "2024-01-15T14:30:00Z"
 *                         updatedAt: "2024-01-15T14:31:00Z"
 *                         paymentMethod:
 *                           id: pm_stripe_xyz789
 *                           type: card
 *                           provider: stripe
 *                           details:
 *                             last4: "4242"
 *                             brand: visa
 *                             exp_month: 12
 *                             exp_year: 2025
 *                       - id: txn_def456ghi789
 *                         userId: usr_def456ghi789
 *                         amount: 9.99
 *                         currency: USD
 *                         status: completed
 *                         paymentMethodId: pm_biometric_abc123
 *                         description: Monthly Subscription
 *                         metadata:
 *                           plan: premium_monthly
 *                           billing_cycle: monthly
 *                         createdAt: "2024-01-01T12:00:00Z"
 *                         updatedAt: "2024-01-01T12:01:00Z"
 *                         paymentMethod:
 *                           id: pm_biometric_abc123
 *                           type: biometric
 *                           provider: internal
 *                           details:
 *                             method: face_id
 *                             device: iPhone 15 Pro
 *                     pagination:
 *                       page: 1
 *                       limit: 20
 *                       total: 145
 *                       totalPages: 8
 *                       hasNext: true
 *                       hasPrev: false
 *               empty_results:
 *                 summary: No transactions found
 *                 description: No transactions match the specified filters
 *                 value:
 *                   success: true
 *                   data:
 *                     transactions: []
 *                     pagination:
 *                       page: 1
 *                       limit: 20
 *                       total: 0
 *                       totalPages: 0
 *                       hasNext: false
 *                       hasPrev: false
 *       400:
 *         description: Invalid query parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *             examples:
 *               invalid_pagination:
 *                 summary: Invalid pagination parameters
 *                 value:
 *                   success: false
 *                   error: Validation failed
 *                   code: VALIDATION_ERROR
 *                   details:
 *                     - field: page
 *                       message: Page must be a positive integer
 *                     - field: limit
 *                       message: Limit must be between 1 and 100
 *               invalid_date_range:
 *                 summary: Invalid date range
 *                 value:
 *                   success: false
 *                   error: Validation failed
 *                   code: VALIDATION_ERROR
 *                   details:
 *                     - field: dateFrom
 *                       message: Start date cannot be after end date
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

// Export empty object to make this a valid module
export {}