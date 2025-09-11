import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  DataTable,
  Badge,
  Icon,
  Select,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { 
  AnalyticsMajor,
  CircleTickMajor,
  CircleAlertMajor,
  TrendingUpMajor,
  CustomersMajor 
} from "@shopify/polaris-icons";
import { useState } from "react";

import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  const url = new URL(request.url);
  const period = url.searchParams.get("period") || "7";
  const days = parseInt(period);
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);
  
  // Get analytics data
  const analytics = await db.analytics.findMany({
    where: {
      shop: session.shop,
      date: {
        gte: startDate,
      },
    },
    orderBy: {
      date: 'desc',
    },
  });
  
  // Get shop settings for totals
  const shopSettings = await db.shopSettings.findUnique({
    where: { shop: session.shop },
  });
  
  // Get recent transactions
  const recentTransactions = await db.biometricTransaction.findMany({
    where: {
      shop: session.shop,
      createdAt: {
        gte: startDate,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 10,
  });
  
  // Calculate summary metrics
  const totalBiometricLogins = analytics.reduce((sum, a) => sum + a.biometricLogins, 0);
  const totalTraditionalLogins = analytics.reduce((sum, a) => sum + a.traditionalLogins, 0);
  const totalSuccessfulCheckouts = analytics.reduce((sum, a) => sum + a.successfulCheckouts, 0);
  const totalAbandonedCheckouts = analytics.reduce((sum, a) => sum + a.abandonedCheckouts, 0);
  const totalFraudPrevented = analytics.reduce((sum, a) => sum + a.fraudAttempts, 0);
  
  const conversionRate = totalSuccessfulCheckouts / Math.max(totalSuccessfulCheckouts + totalAbandonedCheckouts, 1) * 100;
  const biometricAdoption = totalBiometricLogins / Math.max(totalBiometricLogins + totalTraditionalLogins, 1) * 100;
  
  return json({
    analytics,
    shopSettings,
    recentTransactions,
    summary: {
      totalBiometricLogins,
      totalTraditionalLogins,
      totalSuccessfulCheckouts,
      totalAbandonedCheckouts,
      totalFraudPrevented,
      conversionRate,
      biometricAdoption,
    },
    period: days,
  });
};

export default function Analytics() {
  const { 
    analytics, 
    shopSettings, 
    recentTransactions, 
    summary,
    period 
  } = useLoaderData<typeof loader>();
  
  const [selectedPeriod, setSelectedPeriod] = useState(period.toString());
  
  const periodOptions = [
    { label: "Last 7 days", value: "7" },
    { label: "Last 30 days", value: "30" },
    { label: "Last 90 days", value: "90" },
  ];
  
  const tableRows = recentTransactions.map((transaction) => [
    transaction.id,
    transaction.biometricType.toUpperCase(),
    transaction.status === 'completed' ? (
      <Badge status="success">Completed</Badge>
    ) : transaction.status === 'failed' ? (
      <Badge status="critical">Failed</Badge>
    ) : (
      <Badge>Pending</Badge>
    ),
    transaction.amount ? `${transaction.currency} ${transaction.amount.toFixed(2)}` : '-',
    new Date(transaction.createdAt).toLocaleDateString(),
  ]);

  return (
    <Page>
      <TitleBar title="Analytics Dashboard" />
      
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            <InlineStack align="space-between">
              <Text variant="headingLg" as="h1">
                Performance Analytics
              </Text>
              <Select
                label="Time period"
                labelHidden
                options={periodOptions}
                value={selectedPeriod}
                onChange={(value) => {
                  setSelectedPeriod(value);
                  window.location.href = `/analytics?period=${value}`;
                }}
              />
            </InlineStack>

            {/* KPI Cards */}
            <InlineStack gap="400" wrap={false}>
              <Card>
                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <Text variant="headingMd" as="h3">
                      Biometric Adoption
                    </Text>
                    <Icon source={CustomersMajor} color="base" />
                  </InlineStack>
                  <Text variant="headingLg" as="p">
                    {summary.biometricAdoption.toFixed(1)}%
                  </Text>
                  <Text color="subdued">
                    vs traditional login
                  </Text>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <Text variant="headingMd" as="h3">
                      Conversion Rate
                    </Text>
                    <Icon source={TrendingUpMajor} color="base" />
                  </InlineStack>
                  <Text variant="headingLg" as="p">
                    {summary.conversionRate.toFixed(1)}%
                  </Text>
                  <Text color="subdued">
                    successful checkouts
                  </Text>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <Text variant="headingMd" as="h3">
                      Fraud Prevented
                    </Text>
                    <Icon source={CircleAlertMajor} color="base" />
                  </InlineStack>
                  <Text variant="headingLg" as="p">
                    {summary.totalFraudPrevented}
                  </Text>
                  <Text color="subdued">
                    suspicious attempts
                  </Text>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <Text variant="headingMd" as="h3">
                      Total Users
                    </Text>
                    <Icon source={CircleTickMajor} color="base" />
                  </InlineStack>
                  <Text variant="headingLg" as="p">
                    {shopSettings?.totalUsers || 0}
                  </Text>
                  <Text color="subdued">
                    enrolled customers
                  </Text>
                </BlockStack>
              </Card>
            </InlineStack>

            {/* Daily Analytics Chart */}
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h3">
                  Daily Performance
                </Text>
                
                {analytics.length > 0 ? (
                  <DataTable
                    columnContentTypes={['text', 'numeric', 'numeric', 'numeric', 'numeric']}
                    headings={[
                      'Date',
                      'Biometric Logins',
                      'Traditional Logins',
                      'Successful Checkouts',
                      'Abandoned Checkouts',
                    ]}
                    rows={analytics.map((day) => [
                      new Date(day.date).toLocaleDateString(),
                      day.biometricLogins,
                      day.traditionalLogins,
                      day.successfulCheckouts,
                      day.abandonedCheckouts,
                    ])}
                  />
                ) : (
                  <Text color="subdued" alignment="center">
                    No analytics data available for the selected period.
                  </Text>
                )}
              </BlockStack>
            </Card>

            {/* Recent Transactions */}
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h3">
                  Recent Biometric Transactions
                </Text>
                
                {recentTransactions.length > 0 ? (
                  <DataTable
                    columnContentTypes={['text', 'text', 'text', 'text', 'text']}
                    headings={[
                      'Transaction ID',
                      'Auth Method',
                      'Status',
                      'Amount',
                      'Date',
                    ]}
                    rows={tableRows}
                  />
                ) : (
                  <Text color="subdued" alignment="center">
                    No recent transactions to display.
                  </Text>
                )}
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>

        <Layout.Section secondary>
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h3">
                  Quick Stats
                </Text>
                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <Text>Total Logins</Text>
                    <Text variant="bodySm">
                      {summary.totalBiometricLogins + summary.totalTraditionalLogins}
                    </Text>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text>Biometric Logins</Text>
                    <Text variant="bodySm" color="success">
                      {summary.totalBiometricLogins}
                    </Text>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text>Traditional Logins</Text>
                    <Text variant="bodySm">
                      {summary.totalTraditionalLogins}
                    </Text>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text>Successful Checkouts</Text>
                    <Text variant="bodySm" color="success">
                      {summary.totalSuccessfulCheckouts}
                    </Text>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text>Abandoned Checkouts</Text>
                    <Text variant="bodySm" color="critical">
                      {summary.totalAbandonedCheckouts}
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