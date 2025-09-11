import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Checkbox,
  Select,
  Button,
  Text,
  BlockStack,
  InlineStack,
  ColorPicker,
  Divider,
  Banner,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useState } from "react";

import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  let settings = await db.shopSettings.findUnique({
    where: { shop: session.shop },
  });
  
  if (!settings) {
    settings = await db.shopSettings.create({
      data: {
        shop: session.shop,
        isActive: true,
      },
    });
  }
  
  return json({ settings });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  const formData = await request.formData();
  const action = formData.get("action");
  
  try {
    if (action === "save") {
      const updatedSettings = await db.shopSettings.upsert({
        where: { shop: session.shop },
        update: {
          isActive: formData.get("isActive") === "true",
          enableFaceID: formData.get("enableFaceID") === "true",
          enableWebAuthn: formData.get("enableWebAuthn") === "true",
          enableExpressCheckout: formData.get("enableExpressCheckout") === "true",
          enableFraudPrevention: formData.get("enableFraudPrevention") === "true",
          brandColor: formData.get("brandColor") as string || "#000000",
          customMessage: formData.get("customMessage") as string || "",
          position: formData.get("position") as string || "checkout",
        },
        create: {
          shop: session.shop,
          isActive: formData.get("isActive") === "true",
          enableFaceID: formData.get("enableFaceID") === "true",
          enableWebAuthn: formData.get("enableWebAuthn") === "true",
          enableExpressCheckout: formData.get("enableExpressCheckout") === "true",
          enableFraudPrevention: formData.get("enableFraudPrevention") === "true",
          brandColor: formData.get("brandColor") as string || "#000000",
          customMessage: formData.get("customMessage") as string || "",
          position: formData.get("position") as string || "checkout",
        },
      });
      
      return json({ 
        success: true, 
        message: "Settings saved successfully!",
        settings: updatedSettings 
      });
    }
    
    return json({ success: false, message: "Invalid action" }, { status: 400 });
    
  } catch (error) {
    console.error("Error saving settings:", error);
    return json(
      { success: false, message: "Failed to save settings" },
      { status: 500 }
    );
  }
};

export default function Settings() {
  const { settings } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  
  const isLoading = navigation.state === "submitting";
  
  // Form state
  const [isActive, setIsActive] = useState(settings.isActive);
  const [enableFaceID, setEnableFaceID] = useState(settings.enableFaceID);
  const [enableWebAuthn, setEnableWebAuthn] = useState(settings.enableWebAuthn);
  const [enableExpressCheckout, setEnableExpressCheckout] = useState(settings.enableExpressCheckout);
  const [enableFraudPrevention, setEnableFraudPrevention] = useState(settings.enableFraudPrevention);
  const [brandColor, setBrandColor] = useState(settings.brandColor || "#000000");
  const [customMessage, setCustomMessage] = useState(settings.customMessage || "");
  const [position, setPosition] = useState(settings.position || "checkout");
  
  const positionOptions = [
    { label: "Checkout page", value: "checkout" },
    { label: "Cart page", value: "cart" },
    { label: "Product page", value: "product" },
  ];

  return (
    <Page>
      <TitleBar title="FacePay Settings" />
      
      <Layout>
        <Layout.Section>
          <Form method="post">
            <input type="hidden" name="action" value="save" />
            <BlockStack gap="500">
              
              {actionData?.success && (
                <Banner status="success" title="Success">
                  {actionData.message}
                </Banner>
              )}
              
              {actionData?.success === false && (
                <Banner status="critical" title="Error">
                  {actionData.message}
                </Banner>
              )}

              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">
                    General Settings
                  </Text>
                  
                  <FormLayout>
                    <Checkbox
                      label="Enable FacePay"
                      helpText="Turn on biometric authentication for your store"
                      checked={isActive}
                      onChange={setIsActive}
                    />
                    <input type="hidden" name="isActive" value={isActive.toString()} />
                  </FormLayout>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">
                    Authentication Methods
                  </Text>
                  
                  <FormLayout>
                    <Checkbox
                      label="Face ID Authentication"
                      helpText="Enable face recognition for customer authentication"
                      checked={enableFaceID}
                      onChange={setEnableFaceID}
                      disabled={!isActive}
                    />
                    <input type="hidden" name="enableFaceID" value={enableFaceID.toString()} />
                    
                    <Checkbox
                      label="WebAuthn / Device Authentication" 
                      helpText="Enable fingerprint, Face ID, and security keys"
                      checked={enableWebAuthn}
                      onChange={setEnableWebAuthn}
                      disabled={!isActive}
                    />
                    <input type="hidden" name="enableWebAuthn" value={enableWebAuthn.toString()} />
                  </FormLayout>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">
                    Features
                  </Text>
                  
                  <FormLayout>
                    <Checkbox
                      label="Express Checkout"
                      helpText="Skip traditional checkout steps for verified users"
                      checked={enableExpressCheckout}
                      onChange={setEnableExpressCheckout}
                      disabled={!isActive}
                    />
                    <input type="hidden" name="enableExpressCheckout" value={enableExpressCheckout.toString()} />
                    
                    <Checkbox
                      label="Fraud Prevention"
                      helpText="Enhanced security checks and risk assessment"
                      checked={enableFraudPrevention}
                      onChange={setEnableFraudPrevention}
                      disabled={!isActive}
                    />
                    <input type="hidden" name="enableFraudPrevention" value={enableFraudPrevention.toString()} />
                  </FormLayout>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">
                    Customization
                  </Text>
                  
                  <FormLayout>
                    <Select
                      label="Display Position"
                      helpText="Where to show the FacePay option"
                      options={positionOptions}
                      value={position}
                      onChange={setPosition}
                      disabled={!isActive}
                    />
                    <input type="hidden" name="position" value={position} />
                    
                    <TextField
                      label="Custom Message"
                      helpText="Optional message to show customers (leave empty for default)"
                      value={customMessage}
                      onChange={setCustomMessage}
                      disabled={!isActive}
                      multiline={2}
                      placeholder="Checkout faster with Face ID..."
                    />
                    <input type="hidden" name="customMessage" value={customMessage} />
                    
                    <div>
                      <Text variant="bodyMd" as="label">
                        Brand Color
                      </Text>
                      <div style={{ marginTop: "8px" }}>
                        <ColorPicker
                          color={{ hue: 0, brightness: 0, saturation: 0 }}
                          onChange={() => {}} // We'll use a simple color input for now
                          disabled={!isActive}
                        />
                        <div style={{ marginTop: "8px" }}>
                          <TextField
                            value={brandColor}
                            onChange={setBrandColor}
                            disabled={!isActive}
                            placeholder="#000000"
                            autoComplete="off"
                          />
                        </div>
                      </div>
                      <input type="hidden" name="brandColor" value={brandColor} />
                    </div>
                  </FormLayout>
                </BlockStack>
              </Card>

              <InlineStack align="end">
                <Button
                  variant="primary"
                  submit
                  loading={isLoading}
                  disabled={!isActive}
                >
                  {isLoading ? "Saving..." : "Save Settings"}
                </Button>
              </InlineStack>
            </BlockStack>
          </Form>
        </Layout.Section>

        <Layout.Section secondary>
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h3">
                  Setup Guide
                </Text>
                <BlockStack gap="200">
                  <Text variant="bodySm">
                    1. Enable FacePay and choose your authentication methods
                  </Text>
                  <Text variant="bodySm">
                    2. Customize the appearance and position
                  </Text>
                  <Text variant="bodySm">
                    3. Test the integration with a sample checkout
                  </Text>
                  <Text variant="bodySm">
                    4. Monitor analytics to track performance
                  </Text>
                </BlockStack>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h3">
                  Current Status
                </Text>
                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <Text>FacePay Status</Text>
                    <Text color={isActive ? "success" : "subdued"}>
                      {isActive ? "Active" : "Inactive"}
                    </Text>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text>Face ID</Text>
                    <Text color={enableFaceID && isActive ? "success" : "subdued"}>
                      {enableFaceID && isActive ? "Enabled" : "Disabled"}
                    </Text>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text>WebAuthn</Text>
                    <Text color={enableWebAuthn && isActive ? "success" : "subdued"}>
                      {enableWebAuthn && isActive ? "Enabled" : "Disabled"}
                    </Text>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text>Express Checkout</Text>
                    <Text color={enableExpressCheckout && isActive ? "success" : "subdued"}>
                      {enableExpressCheckout && isActive ? "Enabled" : "Disabled"}
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