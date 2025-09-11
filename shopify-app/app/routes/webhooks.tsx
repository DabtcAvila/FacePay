import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, session, admin, payload } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  try {
    switch (topic) {
      case "APP_UNINSTALLED":
        await handleAppUninstalled(shop, payload);
        break;
        
      case "ORDERS_PAID":
        await handleOrderPaid(shop, payload, admin);
        break;
        
      case "CUSTOMERS_CREATE":
        await handleCustomerCreate(shop, payload);
        break;
        
      case "CHECKOUTS_CREATE":
        await handleCheckoutCreate(shop, payload);
        break;
        
      case "CHECKOUTS_UPDATE":
        await handleCheckoutUpdate(shop, payload);
        break;
        
      default:
        console.log(`Unhandled webhook topic: ${topic}`);
    }
    
    return new Response("OK", { status: 200 });
    
  } catch (error) {
    console.error(`Error processing ${topic} webhook:`, error);
    return new Response("Error", { status: 500 });
  }
};

async function handleAppUninstalled(shop: string, payload: any) {
  // Clean up shop data when app is uninstalled
  try {
    await db.shopSettings.deleteMany({
      where: { shop }
    });
    
    await db.biometricUser.deleteMany({
      where: { shop }
    });
    
    await db.biometricTransaction.deleteMany({
      where: { shop }
    });
    
    await db.analytics.deleteMany({
      where: { shop }
    });
    
    console.log(`Cleaned up data for uninstalled shop: ${shop}`);
  } catch (error) {
    console.error(`Error cleaning up data for ${shop}:`, error);
  }
}

async function handleOrderPaid(shop: string, payload: any, admin: any) {
  try {
    const order = payload;
    
    // Check if this order used biometric authentication
    const facepayVerified = order.attributes?.find(
      (attr: any) => attr.name === "facepay_verified"
    );
    
    if (facepayVerified?.value === "true") {
      const facepayMethod = order.attributes?.find(
        (attr: any) => attr.name === "facepay_method"
      )?.value;
      
      const facepayTimestamp = order.attributes?.find(
        (attr: any) => attr.name === "facepay_timestamp"
      )?.value;
      
      // Record successful biometric transaction
      await db.biometricTransaction.create({
        data: {
          id: `order_${order.id}`,
          userId: order.customer?.id?.toString() || 'guest',
          orderId: order.id.toString(),
          shop,
          amount: parseFloat(order.total_price),
          currency: order.currency,
          status: 'completed',
          biometricType: facepayMethod || 'unknown',
          verifiedAt: facepayTimestamp ? new Date(parseInt(facepayTimestamp)) : new Date(),
          ipAddress: order.browser_ip,
        }
      });
      
      // Update user statistics if registered user
      if (order.customer?.id) {
        await db.biometricUser.updateMany({
          where: {
            customerId: order.customer.id.toString(),
            shop
          },
          data: {
            successfulPurchases: {
              increment: 1
            },
            lastUsedAt: new Date()
          }
        });
      }
      
      // Update shop analytics
      await updateDailyAnalytics(shop, 'successfulCheckouts', 1);
      
      console.log(`Recorded biometric transaction for order ${order.id}`);
    }
    
  } catch (error) {
    console.error('Error handling order paid webhook:', error);
  }
}

async function handleCustomerCreate(shop: string, payload: any) {
  try {
    const customer = payload;
    
    // Check if customer should be enrolled in biometric auth
    // This could be based on shop settings or customer preferences
    console.log(`New customer created: ${customer.id} for shop ${shop}`);
    
  } catch (error) {
    console.error('Error handling customer create webhook:', error);
  }
}

async function handleCheckoutCreate(shop: string, payload: any) {
  try {
    const checkout = payload;
    
    // Track checkout creation for analytics
    await updateDailyAnalytics(shop, 'checkouts', 1);
    
    console.log(`Checkout created: ${checkout.id} for shop ${shop}`);
    
  } catch (error) {
    console.error('Error handling checkout create webhook:', error);
  }
}

async function handleCheckoutUpdate(shop: string, payload: any) {
  try {
    const checkout = payload;
    
    // Check if checkout was abandoned
    if (checkout.abandoned_checkout_url) {
      // Check if this was a biometric checkout
      const facepayVerified = checkout.attributes?.find(
        (attr: any) => attr.name === "facepay_verified"
      );
      
      if (facepayVerified?.value === "true") {
        // Track biometric checkout abandonment
        await updateDailyAnalytics(shop, 'abandonedCheckouts', 1);
      }
    }
    
  } catch (error) {
    console.error('Error handling checkout update webhook:', error);
  }
}

async function updateDailyAnalytics(shop: string, metric: string, increment: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  try {
    await db.analytics.upsert({
      where: {
        shop_date: {
          shop,
          date: today
        }
      },
      update: {
        [metric]: {
          increment
        }
      },
      create: {
        shop,
        date: today,
        [metric]: increment
      }
    });
  } catch (error) {
    console.error(`Error updating daily analytics for ${shop}:`, error);
  }
}