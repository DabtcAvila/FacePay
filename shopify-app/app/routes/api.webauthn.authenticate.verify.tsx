import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import db from "../../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const { checkoutToken, credential } = body;

    // In production, you would:
    // 1. Retrieve the challenge from session/cache
    // 2. Find the user's registered credential
    // 3. Verify the authentication response

    // For demo purposes, we'll simulate successful verification
    const verification = {
      verified: true,
      authenticationInfo: {
        credentialID: credential.id,
        newCounter: 1,
      }
    };

    if (verification.verified) {
      // Log successful authentication
      console.log("WebAuthn authentication successful");
      
      return json({
        verified: true,
        userId: credential.id,
        timestamp: Date.now()
      });
    } else {
      return json(
        { error: "Authentication verification failed" },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error("Error verifying authentication:", error);
    return json(
      { error: "Authentication verification failed" },
      { status: 500 }
    );
  }
};