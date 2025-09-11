import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { PaymentService } from '@/services/payments';
import { prisma } from '@/lib/prisma';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Webhook event handlers
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log(`💰 PaymentIntent succeeded: ${paymentIntent.id}`);
  
  try {
    // Update transaction in database
    await prisma.transaction.update({
      where: { stripePaymentIntentId: paymentIntent.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        metadata: {
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          paymentMethod: paymentIntent.payment_method as string,
        }
      }
    });

    // Send confirmation email if customer email exists
    if (paymentIntent.receipt_email) {
      // TODO: Implement email service
      console.log(`📧 Sending confirmation to ${paymentIntent.receipt_email}`);
    }

    return { processed: true };
  } catch (error) {
    console.error('Error processing payment success:', error);
    throw error;
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log(`❌ PaymentIntent failed: ${paymentIntent.id}`);
  
  try {
    // Update transaction status
    await prisma.transaction.update({
      where: { stripePaymentIntentId: paymentIntent.id },
      data: {
        status: 'failed',
        failureReason: paymentIntent.last_payment_error?.message,
        failedAt: new Date(),
        retryCount: {
          increment: 1
        }
      }
    });

    // Schedule retry if applicable
    const transaction = await prisma.transaction.findUnique({
      where: { stripePaymentIntentId: paymentIntent.id }
    });

    if (transaction && transaction.retryCount < 3) {
      // TODO: Queue retry job
      console.log(`🔄 Scheduling retry ${transaction.retryCount + 1}/3`);
    }

    return { processed: true };
  } catch (error) {
    console.error('Error processing payment failure:', error);
    throw error;
  }
}

async function handleChargeDisputeCreated(dispute: Stripe.Dispute) {
  console.log(`⚠️ Dispute created: ${dispute.id}`);
  
  try {
    // Create alert for admin
    await prisma.alert.create({
      data: {
        type: 'dispute',
        severity: 'high',
        title: 'Payment Dispute Created',
        description: `Dispute ${dispute.id} for ${dispute.amount / 100} ${dispute.currency}`,
        metadata: {
          disputeId: dispute.id,
          chargeId: dispute.charge as string,
          reason: dispute.reason,
          amount: dispute.amount,
          currency: dispute.currency
        },
        status: 'pending'
      }
    });

    // Update transaction
    await prisma.transaction.update({
      where: { stripeChargeId: dispute.charge as string },
      data: {
        status: 'disputed',
        disputeId: dispute.id,
        disputedAt: new Date()
      }
    });

    return { processed: true };
  } catch (error) {
    console.error('Error processing dispute:', error);
    throw error;
  }
}

async function handleCustomerSubscriptionEvents(subscription: Stripe.Subscription, eventType: string) {
  console.log(`📅 Subscription ${eventType}: ${subscription.id}`);
  
  try {
    const status = eventType === 'deleted' ? 'cancelled' : subscription.status;
    
    await prisma.subscription.upsert({
      where: { stripeSubscriptionId: subscription.id },
      update: {
        status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelledAt: eventType === 'deleted' ? new Date() : undefined
      },
      create: {
        stripeSubscriptionId: subscription.id,
        customerId: subscription.customer as string,
        status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        metadata: subscription.metadata
      }
    });

    return { processed: true };
  } catch (error) {
    console.error('Error processing subscription event:', error);
    throw error;
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log(`✅ Checkout session completed: ${session.id}`);
  
  try {
    // Create or update transaction
    await prisma.transaction.upsert({
      where: { stripeSessionId: session.id },
      update: {
        status: 'completed',
        completedAt: new Date(),
        amount: session.amount_total || 0,
        currency: session.currency || 'usd'
      },
      create: {
        stripeSessionId: session.id,
        stripePaymentIntentId: session.payment_intent as string,
        customerId: session.customer as string,
        amount: session.amount_total || 0,
        currency: session.currency || 'usd',
        status: 'completed',
        type: 'payment',
        metadata: session.metadata
      }
    });

    return { processed: true };
  } catch (error) {
    console.error('Error processing checkout session:', error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headersList = headers();
  const sig = headersList.get('stripe-signature');

  if (!sig) {
    console.error('⚠️ Webhook Error: No stripe signature found');
    return NextResponse.json(
      { error: 'No signature found' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err: any) {
    console.error(`⚠️ Webhook signature verification failed:`, err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  console.log(`🎯 Processing webhook event: ${event.type}`);

  try {
    // Log webhook event
    await prisma.webhookEvent.create({
      data: {
        eventId: event.id,
        type: event.type,
        data: event.data as any,
        processedAt: new Date()
      }
    });

    // Handle the event
    let result;
    switch (event.type) {
      case 'payment_intent.succeeded':
        result = await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      
      case 'payment_intent.payment_failed':
        result = await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      
      case 'charge.dispute.created':
        result = await handleChargeDisputeCreated(event.data.object as Stripe.Dispute);
        break;
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        result = await handleCustomerSubscriptionEvents(
          event.data.object as Stripe.Subscription,
          event.type.split('.').pop()!
        );
        break;
      
      case 'checkout.session.completed':
        result = await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      
      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed':
        console.log(`📄 Invoice event: ${event.type}`);
        // TODO: Handle invoice events
        result = { processed: true };
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
        result = { processed: false, reason: 'Unhandled event type' };
    }

    // Update webhook event status
    await prisma.webhookEvent.update({
      where: { eventId: event.id },
      data: {
        status: result.processed ? 'processed' : 'skipped',
        result: result as any
      }
    });

    return NextResponse.json({ received: true, result });
  } catch (error) {
    console.error(`❌ Error processing webhook:`, error);
    
    // Log failed webhook
    await prisma.webhookEvent.update({
      where: { eventId: event.id },
      data: {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }).catch(console.error);

    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    webhook: 'stripe',
    timestamp: new Date().toISOString()
  });
}