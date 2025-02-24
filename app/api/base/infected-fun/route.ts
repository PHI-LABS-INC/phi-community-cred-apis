import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import axios from "axios";

async function verifyInfectedFunRegistration(
  address: Address
): Promise<boolean> {
  try {
    const response = await axios.get(
      `https://www.infected.fun/user/profile?walletAddress=${address}`,
      {
        timeout: 5000,
      }
    );

    // Return true if response is successful, else return false
    return response.status === 200;
  } catch (error) {
    console.error("Error verifying Infected.fun registration:", {
      error,
      address,
      timestamp: new Date().toISOString(),
    });
    return false; // Return false in case of an error
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
