/**
 * FacePay Credits System
 * Zero-fee internal payment system
 * Users load money once, transact forever with 0% fees
 */

import { prisma } from '@/lib/prisma'
import { analytics, EVENTS, FUNNELS } from '@/lib/analytics'
import { monitoring } from '@/lib/monitoring'

export interface CreditTransaction {
  userId: string
  amount: number
  type: 'LOAD' | 'TRANSFER' | 'WITHDRAWAL' | 'BONUS'
  description: string
  metadata?: Record<string, any>
}

/**
 * Load credits to user wallet (initial funding)
 * This is the ONLY time we pay fees (3.5% to payment processor)
 */
export async function loadCredits(userId: string, amountMXN: number, paymentMethod: string, referralCode?: string) {
  const startTime = Date.now();
  
  try {
    // In production, this would process payment via MercadoPago/Stripe
    // For MVP, we'll simulate it
    
    const credits = amountMXN * 100 // 1 MXN = 100 credits
    
    // Track credit loading initiation
    analytics.track('Credit Loading Started', {
      user_id: userId,
      amount_mxn: amountMXN,
      credits: credits,
      payment_method: paymentMethod,
      has_referral_code: !!referralCode,
      referral_code: referralCode
    });

    // Get or create a system payment method for credit loading
    let systemPaymentMethod = await prisma.paymentMethod.findFirst({
      where: {
        userId,
        type: 'SYSTEM',
        provider: 'SYSTEM',
        isActive: true
      }
    });

    if (!systemPaymentMethod) {
      // Create a system payment method for this user
      systemPaymentMethod = await prisma.paymentMethod.create({
        data: {
          userId,
          type: 'SYSTEM',
          provider: 'SYSTEM',
          details: { method: 'credit_loading' },
          nickname: 'System Credit Loading',
          isActive: true
        }
      });
    }

    // Create credit transaction
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        amount: credits,
        paymentMethodId: systemPaymentMethod.id,
        status: 'COMPLETED',
        description: `Loaded ${amountMXN} MXN via ${paymentMethod}`,
        metadata: {
          mxnAmount: amountMXN,
          paymentMethod,
          exchangeRate: 100, // 1 MXN = 100 credits
          referralCode: referralCode || null
        }
      }
    })
    
    // Update user balance
    await updateUserBalance(userId, credits)
    
    // Track successful credit loading
    analytics.track('Credits Loaded', {
      user_id: userId,
      transaction_id: transaction.id,
      amount_mxn: amountMXN,
      credits: credits,
      payment_method: paymentMethod,
      loading_time_ms: Date.now() - startTime
    });

    // Add monitoring breadcrumb
    monitoring.addBreadcrumb(
      `Credits loaded: ${credits} credits (${amountMXN} MXN)`,
      'credits',
      'info',
      {
        userId,
        transactionId: transaction.id,
        amountMXN,
        credits,
        paymentMethod
      }
    );
    
    // If referral bonus enabled, add it
    if (process.env.ENABLE_REFERRAL_SYSTEM === 'true') {
      await addReferralBonus(userId, referralCode)
    }
    
    // Track performance metric
    monitoring.trackPerformanceMetric('credits_loading', Date.now() - startTime, {
      success: true,
      amount_mxn: amountMXN,
      payment_method: paymentMethod
    });
    
    return {
      success: true,
      credits,
      balance: await getUserBalance(userId),
      transaction
    }
    
  } catch (error) {
    const duration = Date.now() - startTime;

    // Track credit loading failure
    analytics.track('Credit Loading Failed', {
      user_id: userId,
      amount_mxn: amountMXN,
      payment_method: paymentMethod,
      error_message: (error as Error).message,
      duration_ms: duration
    });

    // Capture exception in monitoring
    monitoring.captureException(error as Error, {
      extra: {
        context: 'credits_loading',
        user_id: userId,
        amount_mxn: amountMXN,
        payment_method: paymentMethod,
        referral_code: referralCode,
        duration
      },
      tags: {
        operation: 'load_credits'
      }
    });

    throw error;
  }
}

/**
 * Transfer credits between users (0% fee!)
 */
export async function transferCredits(
  fromUserId: string, 
  toUserId: string, 
  credits: number,
  description?: string
) {
  // Check balance
  const balance = await getUserBalance(fromUserId)
  if (balance < credits) {
    throw new Error('Insufficient credits')
  }
  
  // Create transfer transactions (atomic)
  const result = await prisma.$transaction(async (tx) => {
    // Get or create system payment methods for both users
    let fromPaymentMethod = await tx.paymentMethod.findFirst({
      where: { userId: fromUserId, type: 'SYSTEM', provider: 'SYSTEM', isActive: true }
    });
    
    if (!fromPaymentMethod) {
      fromPaymentMethod = await tx.paymentMethod.create({
        data: {
          userId: fromUserId,
          type: 'SYSTEM',
          provider: 'SYSTEM',
          details: { method: 'p2p_transfer' },
          nickname: 'System Transfer',
          isActive: true
        }
      });
    }

    let toPaymentMethod = await tx.paymentMethod.findFirst({
      where: { userId: toUserId, type: 'SYSTEM', provider: 'SYSTEM', isActive: true }
    });
    
    if (!toPaymentMethod) {
      toPaymentMethod = await tx.paymentMethod.create({
        data: {
          userId: toUserId,
          type: 'SYSTEM',
          provider: 'SYSTEM',
          details: { method: 'p2p_transfer' },
          nickname: 'System Transfer',
          isActive: true
        }
      });
    }

    // Debit from sender
    const debit = await tx.transaction.create({
      data: {
        userId: fromUserId,
        amount: -credits,
        paymentMethodId: fromPaymentMethod.id,
        status: 'COMPLETED',
        description: description || `Transfer to user`,
        metadata: {
          toUserId,
          transferType: 'P2P'
        }
      }
    })
    
    // Credit to receiver
    const credit = await tx.transaction.create({
      data: {
        userId: toUserId,
        amount: credits,
        paymentMethodId: toPaymentMethod.id,
        status: 'COMPLETED',
        description: description || `Received from user`,
        metadata: {
          fromUserId,
          transferType: 'P2P'
        }
      }
    })
    
    // Update balances using raw SQL to handle BigInt operations
    await tx.$executeRaw`
      UPDATE "users" 
      SET "creditBalance" = "creditBalance" - ${BigInt(credits)}
      WHERE "id" = ${fromUserId}
    `
    
    await tx.$executeRaw`
      UPDATE "users" 
      SET "creditBalance" = "creditBalance" + ${BigInt(credits)}
      WHERE "id" = ${toUserId}
    `
    
    return { debit, credit }
  })
  
  return {
    success: true,
    credits,
    fee: 0, // ZERO FEES!
    fromBalance: await getUserBalance(fromUserId),
    toBalance: await getUserBalance(toUserId)
  }
}

/**
 * Get user credit balance
 */
export async function getUserBalance(userId: string): Promise<number> {
  const result = await prisma.$queryRaw<{ creditBalance: BigInt }[]>`
    SELECT "creditBalance" FROM "users" WHERE "id" = ${userId}
  `
  
  if (result.length === 0) {
    return 0;
  }
  
  return Number(result[0].creditBalance);
}

/**
 * Update user balance (internal)
 */
async function updateUserBalance(userId: string, credits: number) {
  return prisma.$executeRaw`
    UPDATE "users" 
    SET "creditBalance" = "creditBalance" + ${BigInt(credits)}
    WHERE "id" = ${userId}
  `
}

/**
 * Add referral bonus
 */
async function addReferralBonus(userId: string, referralCode?: string) {
  const startTime = Date.now();
  
  try {
    const bonus = parseInt(process.env.REFERRAL_BONUS || '50')
    const bonusCredits = bonus * 100 // Convert to credits
    
    // Find the referrer if referral code is provided
    let referrerId: string | null = null;
    let referrer: any = null;
    
    if (referralCode) {
      // In a real implementation, you would have a referrals table
      // For now, we'll simulate finding the referrer
      try {
        referrer = await prisma.user.findFirst({
          where: {
            // Assuming referral code is stored in user metadata or separate field
            // This is a simplified implementation
            id: referralCode // In real implementation, you'd have proper referral code lookup
          },
          select: {
            id: true,
            email: true,
            name: true
          }
        });
        referrerId = referrer?.id || null;
      } catch (error) {
        console.warn('Could not find referrer for code:', referralCode);
      }
    }

    // Track referral funnel step 1 - Bonus Initiated
    analytics.trackFunnelStep(FUNNELS.REFERRAL, 'bonus_initiated', 1, {
      user_id: userId,
      referral_code: referralCode,
      referrer_id: referrerId,
      bonus_amount_mxn: bonus,
      bonus_credits: bonusCredits,
      has_valid_referrer: !!referrerId
    });

    // Get or create system payment method for bonus
    let systemPaymentMethod = await prisma.paymentMethod.findFirst({
      where: {
        userId,
        type: 'SYSTEM',
        provider: 'SYSTEM',
        isActive: true
      }
    });

    if (!systemPaymentMethod) {
      systemPaymentMethod = await prisma.paymentMethod.create({
        data: {
          userId,
          type: 'SYSTEM',
          provider: 'SYSTEM',
          details: { method: 'referral_bonus' },
          nickname: 'System Referral Bonus',
          isActive: true
        }
      });
    }

    // Create bonus transaction
    const bonusTransaction = await prisma.transaction.create({
      data: {
        userId,
        amount: bonusCredits,
        paymentMethodId: systemPaymentMethod.id,
        status: 'COMPLETED',
        description: 'Welcome bonus!',
        metadata: {
          bonusType: 'REFERRAL',
          mxnValue: bonus,
          referralCode: referralCode || null,
          referrerId: referrerId || null
        }
      }
    })
    
    // Update user balance
    await updateUserBalance(userId, bonusCredits)

    // Track referral funnel step 2 - Bonus Awarded
    analytics.trackFunnelStep(FUNNELS.REFERRAL, 'bonus_awarded', 2, {
      user_id: userId,
      transaction_id: bonusTransaction.id,
      referral_code: referralCode,
      referrer_id: referrerId,
      bonus_amount_mxn: bonus,
      bonus_credits: bonusCredits,
      award_time_ms: Date.now() - startTime
    });

    // Track referral event
    analytics.trackReferral(referralCode, referrerId || undefined, {
      user_id: userId,
      bonus_transaction_id: bonusTransaction.id,
      bonus_amount_mxn: bonus,
      bonus_credits: bonusCredits,
      awarded_at: new Date().toISOString()
    });

    // If referrer found, give them a bonus too
    if (referrerId && referrer) {
      const referrerBonusMXN = parseInt(process.env.REFERRER_BONUS || '25');
      const referrerBonusCredits = referrerBonusMXN * 100;

      // Get or create system payment method for referrer bonus
      let referrerPaymentMethod = await prisma.paymentMethod.findFirst({
        where: {
          userId: referrerId,
          type: 'SYSTEM',
          provider: 'SYSTEM',
          isActive: true
        }
      });

      if (!referrerPaymentMethod) {
        referrerPaymentMethod = await prisma.paymentMethod.create({
          data: {
            userId: referrerId,
            type: 'SYSTEM',
            provider: 'SYSTEM',
            details: { method: 'referrer_bonus' },
            nickname: 'System Referrer Bonus',
            isActive: true
          }
        });
      }

      const referrerTransaction = await prisma.transaction.create({
        data: {
          userId: referrerId,
          amount: referrerBonusCredits,
          paymentMethodId: referrerPaymentMethod.id,
          status: 'COMPLETED',
          description: `Referral bonus for referring user!`,
          metadata: {
            bonusType: 'REFERRER_BONUS',
            mxnValue: referrerBonusMXN,
            referredUserId: userId,
            referralCode: referralCode
          }
        }
      });

      await updateUserBalance(referrerId, referrerBonusCredits);

      // Track referrer bonus
      analytics.track('Referrer Bonus Awarded', {
        referrer_id: referrerId,
        referred_user_id: userId,
        referral_code: referralCode,
        referrer_transaction_id: referrerTransaction.id,
        bonus_amount_mxn: referrerBonusMXN,
        bonus_credits: referrerBonusCredits,
        awarded_at: new Date().toISOString()
      });

      // Track referral funnel step 3 - Referrer Rewarded
      analytics.trackFunnelStep(FUNNELS.REFERRAL, 'referrer_rewarded', 3, {
        referrer_id: referrerId,
        referred_user_id: userId,
        referrer_transaction_id: referrerTransaction.id,
        referrer_bonus_mxn: referrerBonusMXN,
        referrer_bonus_credits: referrerBonusCredits
      });

      // Set referrer context for analytics
      analytics.identify(referrerId, {
        last_referral_bonus_date: new Date().toISOString(),
        last_referral_bonus_amount: referrerBonusMXN,
        referred_user_id: userId
      });

      // Add monitoring breadcrumb for referrer bonus
      monitoring.addBreadcrumb(
        `Referrer bonus awarded: ${referrerBonusCredits} credits (${referrerBonusMXN} MXN)`,
        'referral',
        'info',
        {
          referrerId,
          referredUserId: userId,
          transactionId: referrerTransaction.id,
          bonusCredits: referrerBonusCredits
        }
      );
    }

    // Add monitoring breadcrumb for new user bonus
    monitoring.addBreadcrumb(
      `Welcome bonus awarded: ${bonusCredits} credits (${bonus} MXN)`,
      'referral',
      'info',
      {
        userId,
        transactionId: bonusTransaction.id,
        bonusCredits,
        referralCode,
        referrerId
      }
    );

    // Track performance metric
    monitoring.trackPerformanceMetric('referral_bonus_processing', Date.now() - startTime, {
      success: true,
      has_referrer: !!referrerId,
      bonus_amount: bonus
    });

    console.log(`Referral bonus processed for user ${userId}:`, {
      bonusCredits,
      referralCode,
      referrerId,
      hasReferrerBonus: !!referrerId
    });

  } catch (error) {
    const duration = Date.now() - startTime;

    // Track referral bonus failure
    analytics.track('Referral Bonus Failed', {
      user_id: userId,
      referral_code: referralCode,
      error_message: (error as Error).message,
      duration_ms: duration
    });

    // Capture exception in monitoring
    monitoring.captureException(error as Error, {
      extra: {
        context: 'referral_bonus_processing',
        user_id: userId,
        referral_code: referralCode,
        duration
      },
      tags: {
        operation: 'add_referral_bonus'
      }
    });

    console.error('Error processing referral bonus:', error);
    // Don't throw - referral bonus failure shouldn't block credit loading
  }
}

/**
 * Convert credits to MXN for display
 */
export function creditsToMXN(credits: number): number {
  return credits / 100
}

/**
 * Convert MXN to credits
 */
export function mxnToCredits(mxn: number): number {
  return Math.round(mxn * 100)
}

/**
 * Calculate float earnings (CETES investment)
 */
export async function calculateFloatEarnings(): Promise<{
  totalFloat: number
  monthlyEarnings: number
  yearlyEarnings: number
}> {
  // Get total credits in system
  const result = await prisma.$queryRaw<{ totalCredits: BigInt }[]>`
    SELECT COALESCE(SUM("creditBalance"), 0) as "totalCredits" FROM "users"
  `
  
  const totalCredits = Number(result[0]?.totalCredits || 0)
  const totalMXN = creditsToMXN(totalCredits)
  
  // CETES rate (10.5% annual)
  const annualRate = parseFloat(process.env.CETES_ANNUAL_RATE || '0.105')
  const yearlyEarnings = totalMXN * annualRate
  const monthlyEarnings = yearlyEarnings / 12
  
  return {
    totalFloat: totalMXN,
    monthlyEarnings,
    yearlyEarnings
  }
}

/**
 * Get system statistics
 */
export async function getSystemStats() {
  const [userCount, transactionCount, floatData] = await Promise.all([
    prisma.user.count(),
    prisma.transaction.count(),
    calculateFloatEarnings()
  ])
  
  const avgBalanceResult = await prisma.$queryRaw<{ avgBalance: BigInt }[]>`
    SELECT COALESCE(AVG("creditBalance"), 0) as "avgBalance" FROM "users"
  `
  
  return {
    totalUsers: userCount,
    totalTransactions: transactionCount,
    totalFloat: floatData.totalFloat,
    monthlyEarnings: floatData.monthlyEarnings,
    yearlyEarnings: floatData.yearlyEarnings,
    averageBalance: creditsToMXN(Number(avgBalanceResult[0]?.avgBalance || 0)),
    projectedUsers30Days: Math.round(userCount * 2.5), // Viral growth projection
    projectedFloat30Days: floatData.totalFloat * 2.5
  }
}