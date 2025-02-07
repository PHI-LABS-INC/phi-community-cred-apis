import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";

async function verifyInfectedFunRegistration(
  address: Address
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://www.infected.fun/api/users/username?wallet_address=${address}`,
      {
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!response.ok) {
      // Log more details about the error
      console.error(`HTTP error details:`, {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
      });
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Infected.fun API response:", data);
    // Return false if name is not present or empty
    if (!data.name) {
      return false;
    }
    return true;
  } catch (error) {
    // Add more detailed error logging
    console.error("Error verifying Infected.fun registration:", {
      error,
      address,
      timestamp: new Date().toISOString(),
    });
    throw new Error(
      `Failed to verify Infected.fun registration: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const address = req.nextUrl.searchParams.get("address");

    if (!address || !isAddress(address)) {
      return new Response(
        JSON.stringify({ error: "Invalid address provided" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Get verification results
    const mint_eligibility = await verifyInfectedFunRegistration(
      address as Address
    );

    // Generate cryptographic signature of the verification results
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility,
    });

    return new Response(
      JSON.stringify({
        mint_eligibility,
        signature,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    // Add more context to error logging
    console.error("Error processing request:", {
      error,
      requestUrl: req.url,
      timestamp: new Date().toISOString(),
    });
    return new Response(
      JSON.stringify({
        error: `Failed to process request: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
