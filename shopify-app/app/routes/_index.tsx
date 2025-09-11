import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  InlineStack,
  Banner,
  Icon,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { SecurityMajor, CheckoutMajor, AnalyticsMajor } from "@shopify/polaris-icons";

import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  
  // Get shop settings
  let settings = await prisma.shopSettings.findUnique({
    where: { shop: session.shop },
  });
  
  if (!settings) {
    settings = await prisma.shopSettings.create({
      data: {
        shop: session.shop,
        isActive: true,
      },
    });
  }
  
  // Get analytics for today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const analytics = await prisma.analytics.findFirst({
    where: {
      shop: session.shop,
      date: {
        gte: today,
      },
    },
  });
  
  return json({
    settings,
    analytics,
    shop: session.shop,
  });
};

export default function Index() {
  const { settings, analytics, shop } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  return (
    <Page>
      <TitleBar title="FacePay Dashboard" />
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            <Banner
              title="Welcome to FacePay!"
              status="info"
              action={{ content: "Get Started", onAction: () => navigate("/setup") }}
            >
              <Text as="p">
                Transform your checkout experience with biometric authentication. 
                Reduce cart abandonment and fraud while improving customer satisfaction.
              </Text>
            </Banner>

            <InlineStack gap="400">
              <Card>
                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <Text variant="headingMd" as="h3">
                      Biometric Users
                    </Text>
                    <Icon source={SecurityMajor} color="base" />
                  </InlineStack>
                  <Text variant="headingLg" as="p">
                    {settings.totalUsers}
                  </Text>
                  <Text color="subdued">Total enrolled users</Text>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <Text variant="headingMd" as="h3">
                      Transactions Today
                    </Text>
                    <Icon source={CheckoutMajor} color="base" />
                  </InlineStack>
                  <Text variant="headingLg" as="p">
                    {analytics?.successfulCheckouts || 0}
                  </Text>
                  <Text color="subdued">Biometric checkouts</Text>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <Text variant="headingMd" as="h3">
                      Conversion Rate
                    </Text>
                    <Icon source={AnalyticsMajor} color="base" />
                  </InlineStack>
                  <Text variant="headingLg" as="p">
                    {analytics?.conversionRate || 0}%
                  </Text>
                  <Text color="subdued">vs traditional checkout</Text>
                </BlockStack>
              </Card>
            </InlineStack>
          </BlockStack>
        </Layout.Section>

        <Layout.Section secondary>
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h3">
                  Quick Actions
                </Text>
                <BlockStack gap="200">
                  <Button 
                    variant="primary" 
                    fullWidth 
                    onClick={() => navigate("/settings")}
                  >
                    Configure Settings
                  </Button>
                  <Button 
                    fullWidth 
                    onClick={() => navigate("/analytics")}
                  >
                    View Analytics
                  </Button>
                  <Button 
                    fullWidth 
                    onClick={() => navigate("/customers")}
                  >
                    Manage Customers
                  </Button>
                  <Button 
                    fullWidth 
                    onClick={() => navigate("/help")}
                  >
                    Get Help
                  </Button>
                </BlockStack>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h3">
                  Status
                </Text>
                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <Text>Face ID</Text>
                    <Text color={settings.enableFaceID ? "success" : "subdued"}>
                      {settings.enableFaceID ? "Enabled" : "Disabled"}
                    </Text>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text>WebAuthn</Text>
                    <Text color={settings.enableWebAuthn ? "success" : "subdued"}>
                      {settings.enableWebAuthn ? "Enabled" : "Disabled"}
                    </Text>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text>Express Checkout</Text>
                    <Text color={settings.enableExpressCheckout ? "success" : "subdued"}>
                      {settings.enableExpressCheckout ? "Enabled" : "Disabled"}
                    </Text>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text>Fraud Prevention</Text>
                    <Text color={settings.enableFraudPrevention ? "success" : "subdued"}>
                      {settings.enableFraudPrevention ? "Enabled" : "Disabled"}
                    </Text>
                  </InlineStack>
                </BlockStack>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}