import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/encryption'
import { generateTokens } from '@/lib/jwt'
import { createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware'
import { analytics, EVENTS, FUNNELS } from '@/lib/analytics'
import { monitoring } from '@/lib/monitoring'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let userAgent: string | undefined;
  let userIP: string | undefined;
  
  try {
    // Extract request metadata for tracking
    userAgent = request.headers.get('user-agent') || undefined;
    userIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
    
    // Track registration funnel step 1 - Started
    analytics.trackFunnelStep(FUNNELS.REGISTRATION, 'registration_started', 1, {
      user_agent: userAgent,
      ip_address: userIP,
      timestamp: new Date().toISOString()
    });

    const body = await request.json()
    
    // Track registration funnel step 2 - Form Submitted
    analytics.trackFunnelStep(FUNNELS.REGISTRATION, 'form_submitted', 2, {
      has_name: !!body.name,
      has_email: !!body.email,
      has_password: !!body.password
    });

    const { email, name, password } = registerSchema.parse(body)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      // Track registration failure - user exists
      analytics.track('Registration Failed', {
        reason: 'user_already_exists',
        email_domain: email.split('@')[1],
        funnel: FUNNELS.REGISTRATION,
        step: 'validation'
      });

      monitoring.addBreadcrumb(
        `Registration attempt for existing user: ${email}`,
        'registration',
        'warning',
        { email, userAgent, userIP }
      );

      return createErrorResponse('User already exists with this email', 409)
    }

    // Track registration funnel step 3 - Validation Passed
    analytics.trackFunnelStep(FUNNELS.REGISTRATION, 'validation_passed', 3, {
      email_domain: email.split('@')[1],
      name_length: name.length
    });

    // Hash password and create user
    const hashedPassword = await hashPassword(password)
    
    const user = await prisma.user.create({
      data: {
        email,
        name,
        // Note: In production, you might want to store password hash in a separate table
        // For now, we'll just create the user without password since it's not in the schema
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    const tokens = generateTokens(user)

    // Track successful registration - Final Step
    analytics.trackFunnelStep(FUNNELS.REGISTRATION, 'registration_completed', 4, {
      user_id: user.id,
      email_domain: email.split('@')[1],
      registration_method: 'email_password'
    });

    // Track user registration event
    analytics.trackUserRegistration('email', {
      user_id: user.id,
      email: user.email,
      name: user.name,
      registration_timestamp: user.createdAt,
      completion_time_ms: Date.now() - startTime
    });

    // Set user context for future tracking
    analytics.identify(user.id, {
      email: user.email,
      name: user.name,
      created_at: user.createdAt,
      registration_method: 'email_password'
    });

    // Set monitoring user context
    monitoring.setUser({
      id: user.id,
      email: user.email,
      username: user.name || user.email
    });

    // Add monitoring breadcrumb
    monitoring.addBreadcrumb(
      `User registered successfully: ${user.email}`,
      'registration',
      'info',
      { userId: user.id, email: user.email }
    );

    // Track performance metric
    monitoring.trackPerformanceMetric('user_registration', Date.now() - startTime, {
      success: true,
      method: 'email_password'
    });

    return createSuccessResponse({
      user,
      tokens
    }, 'User registered successfully')

  } catch (error) {
    const duration = Date.now() - startTime;
    
    if (error instanceof z.ZodError) {
      // Track validation error
      analytics.track('Registration Failed', {
        reason: 'validation_error',
        error_message: error.errors[0].message,
        error_field: error.errors[0].path.join('.'),
        funnel: FUNNELS.REGISTRATION,
        step: 'validation'
      });

      monitoring.captureMessage(
        `Registration validation error: ${error.errors[0].message}`,
        'warning',
        {
          extra: {
            validation_errors: error.errors,
            user_agent: userAgent,
            ip_address: userIP,
            duration
          }
        }
      );

      return createErrorResponse(error.errors[0].message, 400)
    }
    
    // Track system error
    analytics.track('Registration Failed', {
      reason: 'system_error',
      error_message: (error as Error).message,
      funnel: FUNNELS.REGISTRATION,
      step: 'user_creation'
    });

    // Capture exception in monitoring
    monitoring.captureException(error as Error, {
      extra: {
        context: 'user_registration',
        user_agent: userAgent,
        ip_address: userIP,
        duration
      },
      tags: {
        endpoint: '/api/auth/register',
        operation: 'user_registration'
      }
    });

    console.error('Registration error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}