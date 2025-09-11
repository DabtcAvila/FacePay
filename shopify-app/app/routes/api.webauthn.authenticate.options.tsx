import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import db from "../../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const { checkoutToken, customerId } = body;

    // For now, we'll create options without requiring existing credentials
    // In production, you'd fetch user's registered credentials
    const options = await generateAuthenticationOptions({
      rpID: new URL(request.url).hostname,
      userVerification: "preferred",
      // allowCredentials: [] // Would contain user's registered credentials
    });

    // Store challenge temporarily (in production, use Redis or session storage)
    // For demo purposes, we'll return the options directly
    
    return json(options);

  } catch (error) {
    console.error("Error generating authentication options:", error);
    return json(
      { error: "Failed to generate authentication options" },
      { status: 500 }
    );
  }
};